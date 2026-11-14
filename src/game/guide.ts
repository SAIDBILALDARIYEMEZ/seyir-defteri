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
  const toTask = (action: Action): WatchTask => ({
    label: labelOf(state, action),
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
    const extra = state.sol > 3 ? tasks.filter((x) => x.action.type !== 'build').map((x) => x.action) : [];
    return {
      station: step.station,
      card: step.card,
      text: t(step.text),
      tasks: [...steps.map((s) => s.action), ...extra].slice(0, BALANCE.advisor.maxTasks).map(toTask),
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
    tasks: tasks.map((task) => toTask(task.action)),
    stepType: null,
    danger,
  };
}

/** Bubble text above PUSULA: the icon of where it points. */
export function bubbleOf(g: Guide): string {
  const icon = g.card ? stationContent[g.card].icon : stationContent[g.station].icon;
  return `${icon}${g.danger ? ' ❗' : ''}`;
}
