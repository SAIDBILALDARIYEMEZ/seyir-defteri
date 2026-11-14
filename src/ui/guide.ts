// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Guidance marks (PRD §11): the tutorial steps of sols 1-3 and the build chain, the bouncing arrow above the
// target station and the speech bubble above the PUSULA robot.

import tutorial from '../content/tutorial.json';
import type { TextKey } from '../i18n/i18n.ts';
import { BALANCE } from '../config/balance.ts';
import type { Action, BuildableId, PlacedId, SimpleActionType, StarterId, StationId } from '../sim/actions.ts';
import { buildStatus, setupDone, suggestCell } from '../sim/systems/build.ts';
import { check, costOf } from '../sim/rules.ts';
import type { GameState } from '../sim/state.ts';
import type { WindowData } from '../sim/window.ts';
import type { ScreenPoint } from '../scene/world.ts';
import { button } from './dom.ts';

export interface TutorialStep {
  action: Action;
  station: StationId;
  /** Build steps point at this store card instead of a station. */
  card: PlacedId | null;
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
  if (step.action === 'place') {
    const id = step.station as StarterId;
    if (state.buildings[id]) return null;
    const action: Action = { type: 'place', crewId: 0, station: id, cell: suggestCell(state, id) };
    return { action, station: 'habitat', card: id, text };
  }
  if (step.action === 'build') {
    const id = step.station as BuildableId;
    // The spot is the player's choice, so only the chain and the parts decide here.
    const ready = setupDone(state) && buildStatus(state, id) === 'available' && state.parts >= BALANCE.build.stations[id].parts;
    if (!ready) return null;
    const action: Action = { type: 'build', crewId: 0, station: id, cell: suggestCell(state, id) };
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
  /**
   * `bubble`: icon above PUSULA or null. `speech`: PUSULA's sentence; a new one shows in full
   * for a few seconds (F5a speech bubble), then the bubble shrinks back to the icon.
   * The guide arrow is a 3D mark in the scene (world.setMarker), not part of the DOM any more.
   */
  set(bubble: string | null, danger: boolean, pusulaName: string, speech?: string): void;
  /** Call every frame: follows the camera. */
  place(screenOf: (id: StationId | 'pusula') => ScreenPoint): void;
}

/** How long a new PUSULA sentence stays in the bubble. */
const SPEECH_MS = 6000;

export function mountGuide(parent: HTMLElement, onPusula: () => void): GuideMarks {
  const bubble = button('guide-bubble', '', onPusula);
  bubble.hidden = true;
  parent.append(bubble);
  let icon = '';
  let said = '';
  let timer = 0;
  const show = (text: string, long: boolean): void => {
    bubble.textContent = text;
    bubble.classList.toggle('speech', long);
  };
  return {
    set(text, danger, pusulaName, speech) {
      bubble.hidden = text === null;
      icon = text ?? '';
      bubble.classList.toggle('danger', danger);
      bubble.setAttribute('aria-label', pusulaName);
      if (text !== null && speech && speech !== said) {
        said = speech;
        show(`${icon} ${speech}`, true);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => show(icon, false), SPEECH_MS);
      } else if (!bubble.classList.contains('speech')) show(icon, false);
    },
    place(screenOf) {
      if (bubble.hidden) return;
      const p = screenOf('pusula');
      bubble.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
      bubble.style.visibility = p.visible ? 'visible' : 'hidden';
    },
  };
}
