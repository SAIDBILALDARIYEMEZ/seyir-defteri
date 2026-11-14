// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Guidance marks (PRD §11): the tutorial steps of sols 1-3 and the build chain, the bouncing arrow above the
// target station and the speech bubble above the PUSULA robot.

import tutorial from '../content/tutorial.json';
import type { TextKey } from '../i18n/i18n.ts';
import { BALANCE } from '../config/balance.ts';
import type { Action, BuildableId, SimpleActionType, StationId } from '../sim/actions.ts';
import { buildStatus } from '../sim/systems/build.ts';
import { check, costOf } from '../sim/rules.ts';
import type { GameState } from '../sim/state.ts';
import type { WindowData } from '../sim/window.ts';
import type { ScreenPoint } from '../scene/world.ts';
import { button, el } from './dom.ts';

export interface TutorialStep {
  action: Action;
  station: StationId;
  /** Build steps point at this store card instead of a station. */
  card: BuildableId | null;
  text: TextKey;
}

interface StepData {
  action: string;
  station?: string;
  text: string;
}
const STEPS: Record<string, StepData[] | undefined> = tutorial;

function stepOf(step: StepData, state: GameState, win: WindowData): TutorialStep | null {
  const text = step.text as TextKey;
  if (step.action === 'build') {
    const id = step.station as BuildableId;
    // The spot is the player's choice, so only the chain and the parts decide here.
    const ready = buildStatus(state, id) === 'available' && state.parts >= BALANCE.build.stations[id].parts;
    if (!ready) return null;
    const action: Action = { type: 'build', crewId: 0, station: id, cell: BALANCE.grid.slots[id] };
    return { action, station: 'habitat', card: id, text };
  }
  const action: Action = { type: step.action as SimpleActionType, crewId: 0 };
  const done = action.type !== 'endSol' && state.today.actions.includes(action.type);
  // A step that cannot be done right now (for example clean panels) is skipped, never a dead end.
  if (done || check(state, action, win) !== null) return null;
  return { action, station: costOf(state, action).station, card: null, text };
}

/**
 * Tutorial steps still to do today, in order: the sol's own steps on sols 1-3, then the
 * build chain (shelter, antenna) on any sol where the next station can be placed.
 */
export function tutorialSteps(state: GameState, win: WindowData): TutorialStep[] {
  const own = (STEPS[String(state.sol)] ?? []).map((s) => stepOf(s, state, win));
  const steps = own.filter((s): s is TutorialStep => s !== null);
  if (steps.length > 0) return steps;
  const chain = (STEPS.chain ?? []).map((s) => stepOf(s, state, win)).find((s) => s !== null);
  return chain ? [chain] : [];
}

export interface GuideMarks {
  /** `arrowAt`: station under the bouncing arrow or null. `bubble`: text above PUSULA or null. */
  set(arrowAt: StationId | null, bubble: string | null, danger: boolean, pusulaName: string): void;
  /** Call every frame: follows the camera. */
  place(screenOf: (id: StationId | 'pusula') => ScreenPoint): void;
}

const ARROW_LIFT_PX = 30;

export function mountGuide(parent: HTMLElement, onPusula: () => void): GuideMarks {
  const arrow = el('div', 'guide-arrow');
  arrow.append(el('span', '', '▼'));
  arrow.setAttribute('aria-hidden', 'true');
  const bubble = button('guide-bubble', '', onPusula);
  arrow.hidden = bubble.hidden = true;
  parent.append(arrow, bubble);
  let target: StationId | null = null;
  const move = (node: HTMLElement, p: ScreenPoint, lift: number): void => {
    node.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y - lift)}px) translate(-50%, -100%)`;
    node.style.visibility = p.visible ? 'visible' : 'hidden';
  };
  return {
    set(arrowAt, text, danger, pusulaName) {
      target = arrowAt;
      arrow.hidden = arrowAt === null;
      bubble.hidden = text === null;
      bubble.textContent = text ?? '';
      bubble.classList.toggle('danger', danger);
      bubble.setAttribute('aria-label', pusulaName);
    },
    place(screenOf) {
      if (target) move(arrow, screenOf(target), ARROW_LIFT_PX);
      if (!bubble.hidden) move(bubble, screenOf('pusula'), 0);
    },
  };
}
