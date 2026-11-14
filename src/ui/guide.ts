// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Guidance marks (PRD §11): the tutorial steps of sols 1-3, the bouncing arrow above the
// target station and the speech bubble above the PUSULA robot.

import tutorial from '../content/tutorial.json';
import type { TextKey } from '../i18n/i18n.ts';
import type { Action, SimpleActionType, StationId } from '../sim/actions.ts';
import { check, costOf } from '../sim/rules.ts';
import type { GameState } from '../sim/state.ts';
import type { WindowData } from '../sim/window.ts';
import type { ScreenPoint } from '../scene/world.ts';
import { button, el } from './dom.ts';

export interface TutorialStep {
  action: Action;
  station: StationId;
  text: TextKey;
}

const STEPS: Record<string, { action: string; text: string }[] | undefined> = tutorial;

/** Tutorial steps still to do today, in order. Empty outside the tutorial sols. */
export function tutorialSteps(state: GameState, win: WindowData): TutorialStep[] {
  const out: TutorialStep[] = [];
  for (const step of STEPS[String(state.sol)] ?? []) {
    const action: Action = { type: step.action as SimpleActionType, crewId: 0 };
    const done = action.type !== 'endSol' && state.today.actions.includes(action.type);
    // A step that cannot be done right now (for example clean panels) is skipped, never a dead end.
    if (done || check(state, action, win) !== null) continue;
    out.push({ action, station: costOf(state, action).station, text: step.text as TextKey });
  }
  return out;
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
