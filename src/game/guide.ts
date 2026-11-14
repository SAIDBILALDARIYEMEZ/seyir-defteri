// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// What PUSULA points at now: the tutorial / build-chain step, else the first daily task.

import stationContent from '../content/stations.json';
import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import type { Action, ActionType, PlacedId, StationId } from '../sim/actions.ts';
import { check, costOf } from '../sim/rules.ts';
import type { GameState } from '../sim/state.ts';
import { liveDay, nextTask, urgentNeeds } from '../sim/systems/advisor.ts';
import type { Task } from '../sim/systems/advisor.ts';
import { setupDone } from '../sim/systems/build.ts';
import { taskKey } from '../sim/systems/overdue.ts';
import type { WindowData } from '../sim/window.ts';
import { tutorialSteps } from '../ui/guide.ts';
import type { WatchTask } from '../ui/panels.ts';
import { actionLabel } from '../ui/rescue.ts';

/** Urgent needs that turn PUSULA's light red. */
const DANGER_NEEDS = ['air', 'power', 'food', 'radiation', 'broken'];

export interface Guide {
  station: StationId;
  /** Store card to highlight (build steps and build tasks). */
  card: PlacedId | null;
  /** PUSULA's sentence for the wrist watch. */
  text: string;
  tasks: WatchTask[];
  /** Tasks that do not fit the daylight left: they move to tomorrow without a cost (F5b). */
  deferred: string[];
  /** Nothing meaningful is left today: PUSULA offers a big "End the day" (F5b). */
  endDay: boolean;
  /** Tutorial step action, when the tutorial is leading. */
  stepType: ActionType | null;
  danger: boolean;
}

export interface GuideActions {
  goStation(station: StationId): void;
  goBuild(id: PlacedId): void;
}

export function labelOf(state: GameState, action: Action): string {
  if (action.type === 'build' || action.type === 'place') {
    return `${t(`action.${action.type}`)}: ${t(`station.${action.station}`)}`;
  }
  const name = actionLabel(state, action);
  return action.type === 'repair' ? `${name}: ${t(`station.${action.station}`)}` : name;
}

export function computeGuide(state: GameState, win: WindowData, go: GuideActions): Guide {
  const danger = urgentNeeds(state, win).some((need) => DANGER_NEEDS.includes(need));
  const toTask = (task: Task): WatchTask => ({
    label: labelOf(state, task.action),
    overdue: task.overdue === true,
    waiting: check(state, task.action, win) === 'noPower',
    onPick: () =>
      task.action.type === 'build' || task.action.type === 'place'
        ? go.goBuild(task.action.station)
        : go.goStation(costOf(state, task.action).station),
  });
  const day = liveDay(state, win);
  const next = nextTask(state, win);
  const deferred = day.deferred.filter((task) => !task.spare).map((task) => labelOf(state, task.action));
  const playing = state.phase === 'playing' && setupDone(state);
  // A tutorial / build-chain step that no longer fits today's daylight waits for tomorrow too.
  const step = tutorialSteps(state, win).find((x) => x.action.type === 'endSol' || check(state, x.action, win) !== 'noTime');
  const tasks = day.tasks.map(toTask);
  if (step && step.action.type !== 'endSol') {
    // The tutorial (or build-chain) step leads; the watch shows the same list the sim checks
    // at night, with the step on top when it is not on the list already.
    const listed = day.tasks.some((task) => taskKey(task.action) === taskKey(step.action));
    return {
      station: step.station,
      card: step.card,
      text: t(step.text),
      tasks: listed ? tasks : [toTask({ action: step.action, why: 'step' }), ...tasks],
      deferred,
      endDay: false,
      stepType: step.action.type,
      danger,
    };
  }
  if (!next) {
    const text = step ? t(step.text) : t('watch.allDone');
    return { station: 'habitat', card: null, text, tasks, deferred, endDay: playing, stepType: null, danger };
  }
  const card = next.action.type === 'build' || next.action.type === 'place' ? next.action.station : null;
  return {
    station: card ? 'habitat' : costOf(state, next.action).station,
    card,
    text: t(`task.${next.why}` as TextKey),
    tasks,
    deferred,
    endDay: false,
    stepType: null,
    danger,
  };
}

/** Bubble text above PUSULA: the icon of where it points. */
export function bubbleOf(g: Guide): string {
  const icon = g.card ? stationContent[g.card].icon : stationContent[g.station].icon;
  return `${icon}${g.danger ? ' ❗' : ''}`;
}
