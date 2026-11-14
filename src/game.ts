// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Game controller: owns the session and wires input -> action -> reducer -> scene + UI.
// Screen flow lives in game/flow.ts, station interaction in game/stationUi.ts, PUSULA's
// pointer in game/guide.ts, placing buildings in input/placement.ts + ui/buildMenu.ts.

import { createFlow } from './game/flow.ts';
import { bubbleOf, computeGuide } from './game/guide.ts';
import type { Guide } from './game/guide.ts';
import { createLearn } from './game/learn.ts';
import { createStationUi, placeAction } from './game/stationUi.ts';
import type { Ctx, Mission, Missions, Session } from './game/context.ts';
import { onLangChange, t } from './i18n/i18n.ts';
import { createPlacement } from './input/placement.ts';
import { attachPointer } from './input/pointer.ts';
import { debug } from './lib/debug.ts';
import { loadGame, saveGame } from './save/save.ts';
import type { World } from './scene/world.ts';
import type { Action } from './sim/actions.ts';
import { reduce } from './sim/reducer.ts';
import { createRng } from './sim/rng.ts';
import { check } from './sim/rules.ts';
import { createInitialState } from './sim/state.ts';
import { advise } from './sim/systems/advisor.ts';
import type { GameState } from './sim/state.ts';
import { isDustSol } from './sim/systems/schedule.ts';
import { isEventNow } from './sim/systems/time.ts';
import type { WindowData } from './sim/window.ts';
import { mountBuildMenu } from './ui/buildMenu.ts';
import { mountGuide } from './ui/guide.ts';
import { mountHud } from './ui/hud.ts';
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
}

/** Store layout (px): matches the 900 px breakpoint in styles.css. */
const NARROW_PX = 900;
const DEPOT_MIN_PX = 120;
const DEPOT_GAP_PX = 10;

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
    onPlace: (id, cell) => stations.placeBuilding(id, cell),
    moving: (id) => s.state.buildings[id] !== undefined,
    onChange: () => {
      if (placement.selected()) menu.close();
      render();
    },
  });
  const ctx: Ctx = { s, ui, world, missions, menu, placement, render, modal, perform, free };
  const guide = (): Guide =>
    computeGuide(s.state, s.win, { goStation: (id) => stations.selectStation(id), goBuild: (id) => placement.select(id) });
  const learn = createLearn(ctx);
  const stations = createStationUi(ctx, guide, (id) => learn.onStation(id));
  const flow = createFlow(ctx, guide, (id) => stations.selectStation(id), learn);

  const hud = mountHud(ui, flow.pause, (id) => flow.showInfo(id));
  const labels = mountLabels(ui, (id) => stations.selectStation(id));
  const depot = mountBuildMenu(ui, { onPress: (id, e) => placement.press(id, e), onSelect: (id) => placement.select(id) });
  const watch = mountWatch(ui, () => flow.showPusula());
  const marks = mountGuide(ui, () => flow.showPusula());
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
    hud.root.hidden = labels.root.hidden = !playing;
    learn.render(playing);
    watch.root.hidden = depot.root.hidden = !playing || s.state.phase !== 'playing';
    mainMenu.root.hidden = playing;
    mainMenu.refresh();
    document.title = t('app.title');
    hud.update(view, s.win);
    labels.refresh(s.state);
    const g = guide();
    depot.update(s.state, placement.selected(), g.card);
    if (!s.frozen) watch.update(g.text, g.tasks, rescueProgress(s.state));
    fitDepot();
    const show = playing && s.modals === 0 && s.state.phase === 'playing';
    const menuHere = menu.isOpen() && s.openStation === g.station;
    const arrowAt = show && g.stepType && !g.card && !menuHere ? g.station : null;
    marks.set(arrowAt, show ? bubbleOf(g) : null, g.danger, t('watch.title'));
    world.setGuide(g.station, g.danger, snapGuide);
    const storm = isDustSol(view.schedule, view.sol) ? 'dust' : isEventNow(view, s.win) ? 'rad' : 'none';
    world.sync(s.state, playing ? storm : 'none');
    if (s.openStation && menu.isOpen()) stations.showStationMenu(s.openStation);
  }

  /** The store sits above the wrist watch on the right: it scrolls when both do not fit. */
  function fitDepot(): void {
    const top = depot.root.getBoundingClientRect().top;
    const watchTop = watch.root.hidden ? window.innerHeight : watch.root.getBoundingClientRect().top;
    const narrow = window.innerWidth <= NARROW_PX;
    depot.root.style.maxHeight = narrow ? '' : `${Math.max(DEPOT_MIN_PX, watchTop - top - DEPOT_GAP_PX)}px`;
  }

  function perform(action: Action, quiet = false): void {
    const before = s.state;
    const station = 'station' in action ? action.station : null;
    const wasTask = !quiet && advise(before, s.win).some((x) => x.action.type === action.type && ('station' in x.action ? x.action.station : null) === station);
    s.state = reduce(s.state, action, s.rng, s.win);
    debug('action', action, s.state);
    if (s.state.rejection) return render();
    if (!quiet) learn.onAction(before, s.state, action, s.win, wasTask);
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

  attachPointer(canvas, world, placement, {
    onPick: (id) => (id === 'pusula' ? flow.showPusula() : stations.selectStation(id)),
    onGround: (x, z) => stations.walkGround(x, z),
  });
  window.addEventListener('keydown', (e) => {
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
    frame(dt) {
      world.update(s.closePause ? 0 : dt);
      if (s.mode !== 'play') return;
      labels.place((id) => world.screenOf(id));
      marks.place((id) => world.screenOf(id));
    },
  };
}
