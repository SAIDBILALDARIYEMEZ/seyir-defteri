// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Game controller: owns the session and wires input -> action -> reducer -> scene + UI.
// Screen flow lives in game/flow.ts, station interaction in game/stationUi.ts, PUSULA's
// pointer in game/guide.ts, placing buildings in input/placement.ts + ui/buildMenu.ts.

import { setStormSound, sfx } from './audio/sound.ts';
import { createFlow } from './game/flow.ts';
import { bubbleOf, computeGuide, labelOf } from './game/guide.ts';
import type { Guide } from './game/guide.ts';
import { createLearn } from './game/learn.ts';
import { createStationUi, placeAction } from './game/stationUi.ts';
import type { Ctx, Mission, Missions, Session } from './game/context.ts';
import { onLangChange, t } from './i18n/i18n.ts';
import { createPlacement } from './input/placement.ts';
import { attachPointer } from './input/pointer.ts';
import { mountCamControls } from './ui/camControls.ts';
import { debug } from './lib/debug.ts';
import { loadGame, saveGame } from './save/save.ts';
import type { World } from './scene/world.ts';
import type { Action } from './sim/actions.ts';
import { reduce } from './sim/reducer.ts';
import { createRng } from './sim/rng.ts';
import { check, isStationLocked } from './sim/rules.ts';
import { createInitialState } from './sim/state.ts';
import { advise } from './sim/systems/advisor.ts';
import type { GameState } from './sim/state.ts';
import { isDustSol } from './sim/systems/schedule.ts';
import { isEventNow } from './sim/systems/time.ts';
import type { WindowData } from './sim/window.ts';
import { mountBuildMenu } from './ui/buildMenu.ts';
import { mountGuide } from './ui/guide.ts';
import { mountInfoCard } from './ui/infoCard.ts';
import { mountHud } from './ui/hud.ts';
import { endDayWarning } from './ui/overdue.ts';
import { feedOf } from './ui/watchFeed.ts';
import { mountActionMenu, openModal } from './ui/overlays.ts';
import type { ModalSpec } from './ui/overlays.ts';
import { mountLabels, mountMainMenu, mountWatch } from './ui/panels.ts';
import { beaconSetSpec, messageSentSpec, rescueProgress } from './ui/rescue.ts';

export type { Mission, Missions } from './game/context.ts';

export interface Game {
  getState(): GameState;
  getWindow(): WindowData;
  /** Replaces the state (debug tools) and redraws. */
  setState(next: GameState): void;
  /** `quiet` skips floating numbers and the night summary (debug tools). */
  dispatch(action: Action, quiet?: boolean): void;
  frame(dt: number): void;
  /** Redraws from the current state (e.g. after the models were swapped in). */
  refresh(): void;
}

/** Store layout (px): matches the 900 px breakpoint in styles.css. */
const NARROW_PX = 900;
const DEPOT_MIN_PX = 120;
const DEPOT_GAP_PX = 10;
/** The morning alarm waits until the night swoosh has faded. */
const ALARM_DELAY_MS = 1600;

/** `first` is the mission shown behind the main menu. */
export function createGame(canvas: HTMLCanvasElement, ui: HTMLElement, world: World, first: Mission, missions: Missions): Game {
  const s: Session = {
    seed: first.seed,
    win: first.win,
    rng: createRng(first.seed),
    state: createInitialState(first.seed, first.win),
    frozen: null,
    mode: 'menu',
    walking: false,
    openStation: null,
    modals: 0,
    closePause: null,
  };
  const free = (): boolean => s.mode === 'play' && !s.walking && s.modals === 0 && s.state.phase === 'playing';
  const menu = mountActionMenu(ui);
  const placement = createPlacement({
    ui,
    canvas,
    world,
    canAct: free,
    reasonFor: (station, cell) => check(s.state, placeAction(s.state, station, cell), s.win),
    onPlace: (id, cell, rot) => stations.placeBuilding(id, cell, rot),
    moving: (id) => s.state.buildings[id] !== undefined,
    facing: (id) => s.state.buildings[id]?.rot ?? 0,
    onChange: () => {
      if (placement.selected()) menu.close();
      render();
    },
  });
  const ctx: Ctx = { s, ui, world, missions, menu, placement, render, modal, perform, free };
  const guide = (): Guide =>
    computeGuide(s.state, s.win, { goStation: (id) => stations.selectStation(id), goBuild: (id) => placement.select(id) });
  const learn = createLearn(ctx);
  const stations = createStationUi(ctx, guide, (id) => {
    learn.onStation(id);
    info.show(id, s.state, true);
  });
  const flow = createFlow(ctx, guide, (id) => stations.selectStation(id), learn);

  const hud = mountHud(ui, flow.pause, (id) => flow.showInfo(id));
  const labels = mountLabels(ui, (id) => stations.selectStation(id));
  const depot = mountBuildMenu(ui, { onPress: (id, e) => placement.press(id, e), onSelect: (id) => placement.select(id) });
  const watch = mountWatch(ui, () => flow.showPusula());
  const cam = mountCamControls(ui, { step: (dir) => world.view.step(dir), reset: () => world.view.reset(), azimuth: () => world.view.azimuth() });
  const marks = mountGuide(ui, () => flow.showPusula());
  // Mounted after the labels and the action menu, so it sits above them (no z-index: modals
  // opened later must stay on top).
  const info = mountInfoCard(ui);
  const mainMenu = mountMainMenu(ui, {
    onNewMission: flow.newMission,
    onContinue: flow.continueMission,
    savedSol: () => loadGame()?.sol ?? null,
    onCode: flow.codeMission,
  });

  function modal(build: () => ModalSpec): () => void {
    s.modals++;
    placement.cancel();
    const close = openModal(ui, build);
    render();
    return () => {
      s.modals--;
      close();
      render();
    };
  }

  function render(snapGuide = false): void {
    const playing = s.mode === 'play';
    const view = s.frozen ?? s.state;
    hud.root.hidden = labels.root.hidden = cam.root.hidden = !playing;
    if (!playing || s.state.phase !== 'playing') info.hide();
    cam.refresh();
    learn.render(playing);
    watch.root.hidden = depot.root.hidden = !playing || s.state.phase !== 'playing';
    mainMenu.root.hidden = playing;
    mainMenu.refresh();
    document.title = t('app.title');
    hud.update(view, s.win);
    labels.refresh(s.state);
    const g = guide();
    depot.update(s.state, placement.selected(), g.card);
    if (!s.frozen) watch.update(g.text, g.tasks, rescueProgress(s.state), feedOf(s.state, s.win));
    fitDepot();
    const show = playing && s.modals === 0 && s.state.phase === 'playing';
    const menuHere = menu.isOpen() && s.openStation === g.station;
    const arrowAt = show && g.stepType && !g.card && !menuHere ? g.station : null;
    world.setMarker(arrowAt);
    marks.set(show ? bubbleOf(g) : null, g.danger, t('watch.title'), g.text);
    world.setGuide(g.station, g.danger, snapGuide);
    const storm = isDustSol(view.schedule, view.sol) ? 'dust' : isEventNow(view, s.win) ? 'rad' : 'none';
    world.sync(s.state, playing ? storm : 'none');
    setStormSound(playing && storm === 'dust');
    if (s.openStation && menu.isOpen()) stations.showStationMenu(s.openStation);
  }

  /** The store sits above the wrist watch on the right: it scrolls when both do not fit. */
  function fitDepot(): void {
    const top = depot.root.getBoundingClientRect().top;
    const watchTop = watch.root.hidden ? window.innerHeight : watch.root.getBoundingClientRect().top;
    const narrow = window.innerWidth <= NARROW_PX;
    depot.root.style.maxHeight = narrow ? '' : `${Math.max(DEPOT_MIN_PX, watchTop - top - DEPOT_GAP_PX)}px`;
  }

  /** PUSULA warns before the day ends with tasks left undone (F5a). */
  function perform(action: Action, quiet = false): void {
    if (action.type === 'endSol' && !quiet && s.state.phase === 'playing' && check(s.state, action, s.win) === null) {
      let close = (): void => undefined;
      const spec = endDayWarning(s.state, (a) => labelOf(s.state, a), () => { close(); apply(action); }, () => close());
      if (spec) {
        sfx.warn();
        close = modal(() => spec);
        return;
      }
    }
    apply(action, quiet);
  }

  function apply(action: Action, quiet = false): void {
    const before = s.state;
    const station = 'station' in action ? action.station : null;
    const wasTask = !quiet && advise(before, s.win).some((x) => x.action.type === action.type && ('station' in x.action ? x.action.station : null) === station);
    s.state = reduce(s.state, action, s.rng, s.win);
    debug('action', action, s.state);
    if (s.state.rejection) {
      if (!quiet) sfx.warn();
      return render();
    }
    if (!quiet) {
      learn.onAction(before, s.state, action, s.win, wasTask);
      actionSound(before, action, wasTask);
    }
    // The setup is part of the sol-1 morning: keep it in the autosave.
    if (action.type === 'place') saveGame(s.state);
    if (quiet) {
      // Debug jumps skip the night card, but a finished mission still shows its result.
      if (before.phase === 'playing' && s.state.phase !== 'playing') flow.showResult();
      else if (s.state.sol !== before.sol) saveGame(s.state);
      return render();
    }
    const sameSol = s.state.sol === before.sol && s.state.phase === before.phase;
    if (action.type !== 'endSol') stations.floatNumbers(before, action, sameSol);
    if (!sameSol) {
      menu.close();
      info.hide();
      flow.showNight(before);
    }
    if (action.type === 'message') {
      const close = modal(() => messageSentSpec(before, s.win, () => close()));
    }
    if (action.type === 'beacon') {
      const close = modal(() => beaconSetSpec(() => close()));
    }
    render();
  }

  /** F5a sounds: build tune, task chime, night swoosh, alarm on a stormy morning, win / evacuation. */
  function actionSound(before: GameState, action: Action, wasTask: boolean): void {
    if (s.state.phase === 'won') return sfx.win();
    if (s.state.phase === 'lost') return sfx.lose();
    if (s.state.sol !== before.sol) {
      sfx.night();
      const stormy = s.state.today.urgent.some((need) => need === 'radiation' || need === 'dust');
      if (stormy) window.setTimeout(() => sfx.alarm(), ALARM_DELAY_MS);
      return;
    }
    if (action.type === 'build' || action.type === 'place' || action.type === 'relocate') return sfx.build();
    if (wasTask) sfx.done();
  }

  attachPointer(canvas, world, placement, {
    onPick: (id) => {
      if (id === 'pusula') return flow.showPusula();
      // A station under construction, a locked one or the rocket: only the info card (F5a).
      if (id === 'lander' || !world.isUsable(id) || isStationLocked(s.state, id)) return info.show(id, s.state);
      stations.selectStation(id);
    },
    onGround: (x, z) => {
      if (ctx.free()) info.hide();
      stations.walkGround(x, z);
    },
  });
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) return placement.turn();
    if (e.key !== 'Escape') return;
    if (placement.selected()) placement.cancel();
    else flow.pause();
  });
  onLangChange(() => render());
  window.addEventListener('resize', fitDepot);

  return {
    getState: () => s.state,
    getWindow: () => s.win,
    setState(next) {
      s.state = next;
      s.frozen = null;
      render();
    },
    dispatch: perform,
    refresh: () => render(),
    frame(dt) {
      world.update(s.closePause ? 0 : dt);
      if (s.mode !== 'play') return;
      labels.place((id) => world.screenOf(id));
      cam.frame();
      marks.place((id) => world.screenOf(id));
    },
  };
}
