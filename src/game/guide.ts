// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// What PUSULA points at now: the tutorial / build-chain step, else the first daily task.

import { BALANCE } from '../config/balance.ts';
import stationContent from '../content/stations.json';
import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import type { Action, ActionType, PlacedId, StationId } from '../sim/actions.ts';
import { costOf } from '../sim/rules.ts';
import type { GameState } from '../sim/state.ts';
import { advise, urgentNeeds } from '../sim/systems/advisor.ts';
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
  const toTask = (action: Action, overdue = false): WatchTask => ({
    label: labelOf(state, action),
    overdue,
    onPick: () =>
      action.type === 'build' || action.type === 'place'
        ? go.goBuild(action.station)
        : go.goStation(costOf(state, action).station),
  });
  const tasks = advise(state, win);
  const steps = tutorialSteps(state, win);
  const step = steps[0];
  if (step) {
    // Build-chain steps (after the tutorial sols) lead, the daily tasks follow.
    // The overdue list starts after the tutorial sols: show the same tasks the sim will check
    // at night (build tasks too), without repeating the chain step itself.
    const stepKeys = new Set(steps.map((x) => taskKey(x.action)));
    const extra = state.sol > 3 ? tasks.filter((x) => !stepKeys.has(taskKey(x.action))) : [];
    const late = new Set(state.overdue.map((x) => taskKey(x.action)));
    const own = steps.map((s) => toTask(s.action, late.has(taskKey(s.action))));
    const fresh = extra.filter((x) => !x.overdue).map((x) => toTask(x.action));
    const carried = extra.filter((x) => x.overdue).map((x) => toTask(x.action, true));
    return {
      station: step.station,
      card: step.card,
      text: t(step.text),
      tasks: [...[...own, ...fresh].slice(0, BALANCE.advisor.maxTasks), ...carried],
      stepType: step.action.type,
      danger,
    };
  }
  const first = tasks[0];
  if (!first) return { station: 'habitat', card: null, text: t('watch.allDone'), tasks: [], stepType: null, danger };
  const card = first.action.type === 'build' || first.action.type === 'place' ? first.action.station : null;
  return {
    station: card ? 'habitat' : costOf(state, first.action).station,
    card,
    text: t(`task.${first.why}` as TextKey),
    tasks: tasks.map((task) => toTask(task.action, task.overdue)),
    stepType: null,
    danger,
  };
}

/** Bubble text above PUSULA: the icon of where it points. */
export function bubbleOf(g: Guide): string {
  const icon = g.card ? stationContent[g.card].icon : stationContent[g.station].icon;
  return `${icon}${g.danger ? ' ❗' : ''}`;
}
