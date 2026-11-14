// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Game controller: owns the state and wires input -> action -> reducer -> scene + UI.

import { BALANCE } from './config/balance.ts';
import stationContent from './content/stations.json';
import { onLangChange, t } from './i18n/i18n.ts';
import type { TextKey } from './i18n/i18n.ts';
import { attachPointer } from './input/pointer.ts';
import { debug } from './lib/debug.ts';
import { WALK_SECONDS_PER_HOUR } from './scene/layout.ts';
import type { PickId, World } from './scene/world.ts';
import type { Action, ActionType, StationId } from './sim/actions.ts';
import { reduce } from './sim/reducer.ts';
import { createRng } from './sim/rng.ts';
import { check, costOf, isStationLocked } from './sim/rules.ts';
import { createInitialState } from './sim/state.ts';
import type { GameState } from './sim/state.ts';
import { advise, urgentNeeds } from './sim/systems/advisor.ts';
import { isDustSol } from './sim/systems/schedule.ts';
import { clockOf, isEventNow } from './sim/systems/time.ts';
import type { WindowData } from './sim/window.ts';
import { dataSpec, infoSpec, pusulaSpec } from './ui/cards.ts';
import { morningCards, nightSpec } from './ui/dayCards.ts';
import { fmt } from './ui/dom.ts';
import { mountGuide, tutorialSteps } from './ui/guide.ts';
import { mountHud } from './ui/hud.ts';
import { logbookSpec } from './ui/logbook.ts';
import { resultSpec, resultTitle } from './ui/result.ts';
import { clearSave, loadGame, saveGame } from './save/save.ts';
import type { GaugeId } from './ui/hud.ts';
import { mountActionMenu, openModal, spawnFloater } from './ui/overlays.ts';
import type { ModalSpec } from './ui/overlays.ts';
import { mountLabels, mountMainMenu, mountWatch } from './ui/panels.ts';
import { actionLabel, beaconSetSpec, messageSentSpec, rescueProgress } from './ui/rescue.ts';
import type { WatchTask } from './ui/panels.ts';

export interface Mission {
  seed: number;
  win: WindowData;
}

/** Seed + window choices live outside the game (main.ts owns Math.random and storage flags). */
export interface Missions {
  /** Seed + window for a "New Mission" (first game: window 1, later: random seed, D-011). */
  next(): Mission;
  ofSave(seed: number, windowId: string): Mission;
  fromCode(code: string): Mission | null;
  codeOf(seed: number, windowId: string): string;
}

export interface Game {
  getState(): GameState;
  getWindow(): WindowData;
  /** Replaces the state (debug tools) and redraws. */
  setState(next: GameState): void;
  /** `quiet` skips floating numbers and the night summary (debug tools). */
  dispatch(action: Action, quiet?: boolean): void;
  frame(dt: number): void;
}

const crewId = 0;
const FLOATER_GAP_MS = 220;
/** Urgent needs that turn PUSULA's light red. */
const DANGER_NEEDS = ['air', 'power', 'food', 'radiation', 'broken'];

interface Guide {
  station: StationId;
  /** PUSULA's sentence for the wrist watch. */
  text: string;
  tasks: WatchTask[];
  /** Tutorial step action, when the tutorial is leading. */
  stepType: ActionType | null;
  danger: boolean;
}

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
    else if (type !== 'build' && type !== 'bonus') list.push({ type, crewId });
  }
  return list;
}

const REPLAY: Action = { type: 'replayYesterday', crewId };

/** `first` is the mission shown behind the main menu. */
export function createGame(canvas: HTMLCanvasElement, ui: HTMLElement, world: World, first: Mission, missions: Missions): Game {
  let { seed, win } = first;
  let rng = createRng(seed);
  let state = createInitialState(seed, win);
  /** While the night card is open the HUD keeps the end-of-day values (D-011). */
  let frozen: GameState | null = null;
  let mode: 'menu' | 'play' = 'menu';
  let walking = false;
  let openStation: StationId | null = null;
  let closePause: (() => void) | null = null;
  let modals = 0;

  const pause = (): void => {
    if (mode !== 'play') return;
    if (closePause) return resume();
    const playing = state.phase === 'playing';
    closePause = modal(() => ({
      title: t('pause.title'),
      lines: [[t('code.label'), code()]],
      languagePicker: true,
      buttons: [
        { label: `📖 ${t('logbook.open')}`, onClick: showLogbook },
        { label: t('pause.exitNoSave'), onClick: () => (playing ? confirmExit() : leave()) },
        ...(playing ? [{ label: t('pause.saveExit'), onClick: () => { saveGame(state); leave(); } }] : []),
        { label: t('pause.resume'), onClick: resume, primary: true },
      ],
    }));
  };
  const leave = (): void => {
    resume();
    showMenu();
  };
  /** "Exit without saving": today's progress is dropped, the morning autosave stays. */
  const confirmExit = (): void => {
    const close = modal(() => ({
      title: t('pause.confirm.title'),
      lines: [t('pause.confirm.body')],
      buttons: [
        { label: t('pause.confirm.yes'), onClick: () => { close(); leave(); } },
        { label: t('pause.confirm.no'), onClick: () => close(), primary: true },
      ],
    }));
  };
  const code = (): string => missions.codeOf(seed, win.id);
  const resume = (): void => {
    closePause?.();
    closePause = null;
  };
  const free = (): boolean => mode === 'play' && !walking && modals === 0 && state.phase === 'playing';

  const hud = mountHud(ui, pause, (id) => showInfo(id));
  const labels = mountLabels(ui, (id) => selectStation(id));
  const watch = mountWatch(ui, () => showPusula());
  const marks = mountGuide(ui, () => showPusula());
  const menu = mountActionMenu(ui);
  const mainMenu = mountMainMenu(ui, {
    onNewMission: () => newMission(),
    onContinue: () => continueMission(),
    savedSol: () => loadGame()?.sol ?? null,
    onCode: (text) => {
      const mission = missions.fromCode(text);
      if (mission) startMission(mission);
      return mission !== null;
    },
  });

  function modal(build: () => ModalSpec): () => void {
    modals++;
    const close = openModal(ui, build);
    render();
    return () => {
      modals--;
      close();
      render();
    };
  }

  /** What PUSULA points at now: the tutorial step on sols 1-3, else the first daily task. */
  function guide(): Guide {
    const danger = urgentNeeds(state, win).some((need) => DANGER_NEEDS.includes(need));
    const toTask = (action: Action): WatchTask => {
      const station = costOf(state, action).station;
      const name = actionLabel(state, action);
      const label = action.type === 'repair' ? `${name}: ${t(`station.${station}`)}` : name;
      return { label, onPick: () => selectStation(station) };
    };
    const steps = tutorialSteps(state, win);
    const step = steps[0];
    if (step) {
      return { station: step.station, text: t(step.text), tasks: steps.map((s) => toTask(s.action)), stepType: step.action.type, danger };
    }
    const tasks = advise(state, win);
    const firstTask = tasks[0];
    if (!firstTask) return { station: 'habitat', text: t('watch.allDone'), tasks: [], stepType: null, danger };
    return {
      station: costOf(state, firstTask.action).station,
      text: t(`task.${firstTask.why}` as TextKey),
      tasks: tasks.map((task) => toTask(task.action)),
      stepType: null,
      danger,
    };
  }

  function render(snapGuide = false): void {
    const playing = mode === 'play';
    hud.root.hidden = labels.root.hidden = !playing;
    watch.root.hidden = !playing || state.phase !== 'playing';
    mainMenu.root.hidden = playing;
    mainMenu.refresh();
    document.title = t('app.title');
    hud.update(frozen ?? state, win);
    labels.refresh(state);
    const g = guide();
    if (!frozen) watch.update(g.text, g.tasks, rescueProgress(state));
    const show = playing && modals === 0 && state.phase === 'playing';
    const arrowAt = show && g.stepType && !(menu.isOpen() && openStation === g.station) ? g.station : null;
    const bubble = show ? `${stationContent[g.station].icon}${g.danger ? ' ❗' : ''}` : null;
    marks.set(arrowAt, bubble, g.danger, t('watch.title'));
    world.setGuide(g.station, g.danger, snapGuide);
    const view = frozen ?? state;
    const storm = isDustSol(view.schedule, view.sol) ? 'dust' : isEventNow(view, win) ? 'rad' : 'none';
    world.sync(state, playing ? storm : 'none');
    if (openStation && menu.isOpen()) showStationMenu(openStation);
  }

  function showStationMenu(station: StationId): void {
    openStation = station;
    const g = guide();
    const items = actionsAt(station, state).map((action) => {
      const cost = costOf(state, action);
      const reason = check(state, action, win);
      const hours = cost.walk + cost.hours;
      const parts = [hours > 0 ? `⏱ ${t('menu.hours', { n: fmt(hours) })}` : '', cost.power > 0 ? `−${cost.power}⚡` : ''];
      return {
        label: actionLabel(state, action),
        cost: parts.filter(Boolean).join('  '),
        reason: reason ? t(`reason.${reason}`) : null,
        hint: g.station === station && g.stepType === action.type,
        onPick: () => perform(action),
      };
    });
    menu.open(`${stationContent[station].icon} ${t(`station.${station}`)}`, items, t('menu.close'));
  }

  function selectStation(station: StationId): void {
    if (!free() || isStationLocked(state, station)) return;
    menu.close();
    walking = true;
    render();
    world.walkTo(station, walkSeconds(world.adaStation(), station), () => {
      walking = false;
      showStationMenu(station);
      render();
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
    if (state.rejection) return render();
    if (quiet) {
      // Debug jumps skip the night card, but a finished mission still shows its result.
      if (before.phase === 'playing' && state.phase !== 'playing') showResult();
      else if (state.sol !== before.sol) saveGame(state);
      return render();
    }
    const sameSol = state.sol === before.sol && state.phase === before.phase;
    if (action.type !== 'endSol') floatNumbers(before, action, sameSol);
    if (!sameSol) {
      menu.close();
      showNight(before);
    }
    if (action.type === 'message') {
      const close = modal(() => messageSentSpec(before, win, () => close()));
    }
    if (action.type === 'beacon') {
      const close = modal(() => beaconSetSpec(() => close()));
    }
    render();
  }

  function showData(sol: number, upto: number, gained: number | null): void {
    const close = modal(() => dataSpec(win, { sol, upto, gained, close: () => close() }));
  }

  function showInfo(id: GaugeId): void {
    if (mode !== 'play') return;
    const close = modal(() => {
      const spec = infoSpec(id, win, () => close());
      const measured = Math.floor(clockOf(state) - BALANCE.dayStartHour);
      if (id === 'dose') spec.buttons.unshift({ label: t('data.button'), onClick: () => showData(state.sol, measured, null) });
      return spec;
    });
  }

  function showPusula(): void {
    if (!free()) return;
    const close = modal(() => {
      const g = guide();
      const task = g.stepType || !g.tasks[0] ? g.text : `${t('pusula.next')} ${g.tasks[0].label}. ${g.text}`;
      return pusulaSpec(state, win, { task, onGo: () => selectStation(g.station), close: () => close() });
    });
  }

  function showNight(before: GameState): void {
    const log = state.log[state.log.length - 1];
    if (log) frozen = { ...before, ...log.dusk, hoursLeft: 0, science: log.science };
    world.setNight(true);
    const allSol = BALANCE.hoursPerSol;
    const close = modal(() =>
      nightSpec(before, state, win, {
        onMorning: () => {
          frozen = null;
          close();
          morning(before);
        },
        onData: (sol, gained) => showData(sol, allSol, gained),
        replay: replayButton(() => close()),
      }),
    );
  }

  /** "Replay yesterday" (PRD §12): same seed, same events, back to the previous morning. */
  function replayButton(closeCard: () => void): { label: string; onClick: () => void } | null {
    if (check(state, REPLAY, win)) return null;
    return {
      label: `⏪ ${t('replay.button', { n: state.replaysLeft })}`,
      onClick: () => {
        closeCard();
        state = reduce(state, REPLAY, rng, win);
        saveGame(state);
        enterPlay();
        const close = modal(() => ({
          kind: 'event',
          title: `⏪ ${t('replay.title', { n: state.sol })}`,
          lines: [t('replay.body'), t('replay.left', { n: state.replaysLeft })],
          buttons: [{ label: t('event.ok'), onClick: () => close(), primary: true }],
        }));
      },
    };
  }

  function showLogbook(): void {
    const result = state.phase === 'playing' ? '' : resultTitle(state);
    const close = modal(() => logbookSpec(state, win, { result, code: code() }, () => close()));
  }

  function morning(before: GameState): void {
    world.setNight(false);
    if (state.phase !== 'playing') return showResult();
    saveGame(state);
    world.placeAda('habitat');
    render(true);
    const cards = morningCards(before, state, win, (sol, gained) => showData(sol, BALANCE.hoursPerSol, gained));
    const next = (): void => {
      const build = cards.shift();
      if (!build) return;
      const close = modal(() => build(() => { close(); next(); }));
    };
    next();
  }

  function showResult(): void {
    clearSave();
    world.setNight(false);
    const close = modal(() =>
      resultSpec(state, win, {
        code: code(),
        replay: replayButton(() => close()),
        onLogbook: showLogbook,
        onNewMission: () => { close(); startMission(missions.next()); },
        onMenu: () => { close(); showMenu(); },
      }),
    );
  }

  /** Puts the scene and the UI at the current state (new mission, Continue, replay). */
  function enterPlay(): void {
    frozen = null;
    mode = 'play';
    walking = false;
    openStation = null;
    menu.close();
    world.setNight(false);
    world.placeAda(state.crew[crewId]?.location ?? 'habitat');
    render(true);
  }

  function continueMission(): void {
    const saved = loadGame();
    if (!saved) return render();
    ({ seed, win } = missions.ofSave(saved.seed, saved.windowId));
    rng = createRng(seed);
    state = saved;
    enterPlay();
  }

  /** "New Mission" from the menu: asks first when it would replace a saved mission. */
  function newMission(): void {
    if (!loadGame()) return startMission(missions.next());
    const close = modal(() => ({
      title: t('menu.replace.title'),
      lines: [t('menu.replace.body')],
      buttons: [
        { label: t('menu.replace.yes'), onClick: () => { close(); startMission(missions.next()); } },
        { label: t('pause.confirm.no'), onClick: () => close(), primary: true },
      ],
    }));
  }

  function startMission(mission: Mission): void {
    ({ seed, win } = mission);
    rng = createRng(seed);
    state = createInitialState(seed, win);
    saveGame(state);
    enterPlay();
    const close = modal(() => ({
      kind: 'event',
      title: `🧭 ${t('tutorial.welcome.title')}`,
      lines: [t('tutorial.welcome1'), t('tutorial.welcome2')],
      buttons: [{ label: t('event.ok'), onClick: () => close(), primary: true }],
    }));
  }

  function showMenu(): void {
    mode = 'menu';
    menu.close();
    render();
  }

  attachPointer(canvas, world, (id: PickId) => (id === 'pusula' ? showPusula() : selectStation(id)));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') pause();
  });
  onLangChange(render);

  return {
    getState: () => state,
    getWindow: () => win,
    setState(next) {
      state = next;
      frozen = null;
      render();
    },
    dispatch: perform,
    frame(dt) {
      world.update(closePause ? 0 : dt);
      if (mode !== 'play') return;
      labels.place((id) => world.screenOf(id));
      marks.place((id) => world.screenOf(id));
    },
  };
}
