// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Game controller: owns the state and wires input -> action -> reducer -> scene + UI.

import { BALANCE } from './config/balance.ts';
import stationContent from './content/stations.json';
import { onLangChange, t } from './i18n/i18n.ts';
import { attachPointer } from './input/pointer.ts';
import { debug } from './lib/debug.ts';
import { WALK_SECONDS_PER_HOUR } from './scene/layout.ts';
import type { World } from './scene/world.ts';
import type { Action, ActionType, StationId } from './sim/actions.ts';
import { reduce } from './sim/reducer.ts';
import { createRng } from './sim/rng.ts';
import { check, costOf } from './sim/rules.ts';
import { createInitialState } from './sim/state.ts';
import type { GameState } from './sim/state.ts';
import { advise } from './sim/systems/advisor.ts';
import { isDustSol } from './sim/systems/schedule.ts';
import { isEventNow } from './sim/systems/time.ts';
import { sepWarnedToday, visibleWarnings } from './sim/systems/warnings.ts';
import type { WindowData } from './sim/window.ts';
import { fmt } from './ui/dom.ts';
import { mountHud } from './ui/hud.ts';
import { mountActionMenu, openModal, spawnFloater } from './ui/overlays.ts';
import type { ModalSpec } from './ui/overlays.ts';
import { mountLabels, mountMainMenu, mountWatch } from './ui/panels.ts';

export interface Game {
  getState(): GameState;
  /** Replaces the state (debug tools) and redraws. */
  setState(next: GameState): void;
  /** `quiet` skips floating numbers and the night summary (debug tools). */
  dispatch(action: Action, quiet?: boolean): void;
  frame(dt: number): void;
}

const crewId = 0;
const FLOATER_GAP_MS = 220;

function walkSeconds(from: StationId, to: StationId): number {
  if (from === to) return 0;
  const far: readonly string[] = BALANCE.walk.farStations;
  return (far.includes(from) || far.includes(to) ? BALANCE.walk.far : BALANCE.walk.near) * WALK_SECONDS_PER_HOUR;
}

function actionsAt(station: StationId, state: GameState): Action[] {
  const list: Action[] = state.broken.includes(station) ? [{ type: 'repair', crewId, station }] : [];
  for (const type of stationContent[station].actions as ActionType[]) {
    if (type === 'repair') continue;
    if (type === 'shelterWait') list.push({ type, crewId, hours: BALANCE.actions.shelterWait.stepHours });
    else list.push({ type, crewId });
  }
  return list;
}

export function createGame(canvas: HTMLCanvasElement, ui: HTMLElement, world: World, win: WindowData, seed: number): Game {
  const rng = createRng(seed);
  let state = createInitialState(seed, win);
  let mode: 'menu' | 'play' = 'menu';
  let walking = false;
  let openStation: StationId | null = null;
  let closePause: (() => void) | null = null;
  let modals = 0;

  const pause = (): void => {
    if (mode !== 'play') return;
    if (closePause) return resume();
    closePause = modal(() => ({
      title: t('pause.title'),
      lines: [],
      languagePicker: true,
      buttons: [
        { label: t('pause.resume'), onClick: resume, primary: true },
        { label: t('pause.quit'), onClick: () => { resume(); showMenu(); } },
      ],
    }));
  };
  const resume = (): void => {
    closePause?.();
    closePause = null;
  };

  const hud = mountHud(ui, win, pause);
  const labels = mountLabels(ui, (id) => selectStation(id));
  const watch = mountWatch(ui);
  const menu = mountActionMenu(ui);
  const mainMenu = mountMainMenu(ui, () => startMission());

  function modal(build: () => ModalSpec): () => void {
    modals++;
    const close = openModal(ui, build);
    return () => {
      modals--;
      close();
    };
  }

  function render(): void {
    const playing = mode === 'play';
    hud.root.hidden = labels.root.hidden = watch.root.hidden = !playing;
    mainMenu.root.hidden = playing;
    mainMenu.refresh();
    document.title = t('app.title');
    hud.update(state);
    labels.refresh(state);
    watch.update(t('watch.hint'), advise(state, win).map((task) => t(`action.${task.action.type}`)));
    const storm = isDustSol(state.schedule, state.sol) ? 'dust' : isEventNow(state, win) ? 'rad' : 'none';
    world.sync(state, playing ? storm : 'none');
    if (openStation && menu.isOpen()) showStationMenu(openStation);
  }

  function showStationMenu(station: StationId): void {
    openStation = station;
    const items = actionsAt(station, state).map((action) => {
      const cost = costOf(state, action);
      const reason = check(state, action, win);
      const hours = cost.walk + cost.hours;
      const parts = [hours > 0 ? `⏱ ${t('menu.hours', { n: fmt(hours) })}` : '', cost.power > 0 ? `−${cost.power}⚡` : ''];
      return {
        label: t(`action.${action.type}`),
        cost: parts.filter(Boolean).join('  '),
        reason: reason ? t(`reason.${reason}`) : null,
        onPick: () => perform(action),
      };
    });
    menu.open(`${stationContent[station].icon} ${t(`station.${station}`)}`, items, t('menu.close'));
  }

  function selectStation(station: StationId): void {
    if (mode !== 'play' || walking || modals > 0 || state.phase !== 'playing') return;
    menu.close();
    walking = true;
    world.walkTo(station, walkSeconds(world.adaStation(), station), () => {
      walking = false;
      showStationMenu(station);
    });
  }

  function floatNumbers(before: GameState, action: Action, sameSol: boolean): void {
    const cost = costOf(before, action);
    const texts: string[] = [];
    const delta = (value: number, icon: string): void => {
      if (Math.abs(value) > 0.05) texts.push(`${value > 0 ? '+' : '−'}${fmt(Math.abs(value))}${icon}`);
    };
    delta(-(cost.walk + cost.hours), '⏱');
    delta(-cost.power, '⚡');
    if (sameSol) {
      delta(state.air - before.air, '💨');
      delta(state.food - before.food, '🥫');
    }
    delta(state.science - before.science, '⭐');
    delta(state.shelterLevel - before.shelterLevel, '🛡️');
    const at = world.screenOf('ada');
    texts.forEach((text, i) => spawnFloater(ui, at.x, at.y, text, i * FLOATER_GAP_MS));
  }

  function perform(action: Action, quiet = false): void {
    const before = state;
    state = reduce(state, action, rng, win);
    debug('action', action, state);
    if (state.rejection || quiet) return render();
    const sameSol = state.sol === before.sol && state.phase === before.phase;
    if (action.type !== 'endSol') floatNumbers(before, action, sameSol);
    if (!sameSol) {
      menu.close();
      showNight(before);
    }
    render();
  }

  function showNight(before: GameState): void {
    const log = state.log[state.log.length - 1];
    const flags = log?.flags ?? [];
    const { power, air, food, dose } = BALANCE;
    world.setNight(true);
    const pct = (points: number): string => `${fmt((points / dose.budget) * 100)}%`;
    const close = modal(() => {
      const lines: [string, string][] = [
        [t('night.heating'), `−${power.nightHeating}⚡`],
        [t('night.air'), `−${air.perSol}💨`],
      ];
      if (flags.includes('cold')) lines.push([t('night.cold'), `−${air.coldPenalty}💨`]);
      if (before.sol >= food.unlockSol) lines.push([t('night.food'), `−${food.perSol}🥫`]);
      lines.push([t('night.panels'), `${Math.round((1 - state.panelEff) * 100)}%`]);
      lines.push([t('night.dose'), `+${pct(log?.doseGained ?? 0)} ☢️`]);
      return {
        kind: 'night',
        title: `🌙 ${t('night.title', { n: before.sol })}`,
        lines,
        buttons: [{ label: t('night.morning'), onClick: () => { close(); morning(before); }, primary: true }],
      };
    });
  }

  function morning(before: GameState): void {
    world.setNight(false);
    if (state.phase !== 'playing') return showResult();
    world.placeAda('habitat');
    const cards: (() => string)[] = [];
    if (state.sol === BALANCE.unlockSol.greenhouse) cards.push(() => `🌱 ${t('event.unlockGreenhouse')}`);
    if (state.sol === BALANCE.unlockSol.shelterBuild) cards.push(() => `🗺️ ${t('event.unlockAll')}`);
    for (const station of state.broken.filter((s) => !before.broken.includes(s))) {
      cards.push(() => `🔧 ${t('event.broken', { station: t(`station.${station}`) })}`);
    }
    if (isDustSol(state.schedule, state.sol) && !isDustSol(state.schedule, before.sol)) {
      cards.push(() => `🌪️ ${t('event.dust')}`);
    }
    const ahead = visibleWarnings(state, win).find((w) => w.kind === 'sep' && w.sol > state.sol);
    if (sepWarnedToday(state, win)) cards.push(() => `☢️ ${t('event.radToday')}`);
    else if (ahead) cards.push(() => `☢️ ${t('event.radAhead', { n: ahead.sol - state.sol })}`);
    const reply = state.lastReply;
    if (reply) cards.push(() => `📡 ${t(`event.reply.${reply}`)}`);
    const next = (): void => {
      const text = cards.shift();
      if (!text) return;
      const close = modal(() => ({
        kind: 'event',
        title: `🧭 ${t('watch.title')}`,
        lines: [text()],
        buttons: [{ label: t('event.ok'), onClick: () => { close(); next(); }, primary: true }],
      }));
    };
    next();
  }

  function showResult(): void {
    const key = state.phase === 'won' ? 'won' : 'lost';
    const close = modal(() => ({
      kind: 'event',
      title: t(`end.${key}.title`),
      lines: [t(`end.${key}.body`)],
      buttons: [{ label: t('menu.newMission'), onClick: () => { close(); startMission(); }, primary: true }],
    }));
  }

  function startMission(): void {
    state = createInitialState(seed, win);
    mode = 'play';
    walking = false;
    openStation = null;
    menu.close();
    world.setNight(false);
    world.placeAda('habitat');
    render();
  }

  function showMenu(): void {
    mode = 'menu';
    menu.close();
    render();
  }

  attachPointer(canvas, world, selectStation);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') pause();
  });
  onLangChange(render);

  return {
    getState: () => state,
    setState(next) {
      state = next;
      render();
    },
    dispatch: perform,
    frame(dt) {
      world.update(closePause ? 0 : dt);
      if (mode === 'play') labels.place((id) => world.screenOf(id));
    },
  };
}
