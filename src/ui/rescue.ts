// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Rescue chain UI (PRD §11.6): the 3-step progress on the wrist watch, the "message sent"
// card with the computed Earth-Mars radio delay, and the "landing marker set" card.

import { BALANCE } from '../config/balance.ts';
import { commsDelaySeconds, splitDelay } from '../lib/commsDelay.ts';
import { t } from '../i18n/i18n.ts';
import type { Action } from '../sim/actions.ts';
import { RESCUE_DONE } from '../sim/state.ts';
import type { GameState } from '../sim/state.ts';
import { dateOfSol } from '../sim/window.ts';
import type { WindowData } from '../sim/window.ts';
import { formatDate } from './dom.ts';
import type { ModalSpec } from './overlays.ts';

const LIGHT_KM_PER_SECOND = 299_792.458;

export interface RescueStep {
  label: string;
  done: boolean;
  /** The step to do next. */
  current: boolean;
}

export interface RescueProgress {
  title: string;
  steps: RescueStep[];
  /** Extra line, for example "the answer comes tomorrow". */
  note: string;
}

/** Null until the antenna unlocks. */
export function rescueProgress(state: GameState): RescueProgress | null {
  if (state.sol < BALANCE.unlockSol.message) return null;
  const stage = state.rescueStage;
  const done = [stage >= 1, stage >= 2, stage >= RESCUE_DONE];
  const first = done.indexOf(false);
  const waiting = stage === 2;
  const early = stage === 3 && state.sol <= BALANCE.actions.beacon.afterSol;
  let note = '';
  if (waiting) note = t('rescue.waiting');
  else if (early) note = t('rescue.early', { n: BALANCE.actions.beacon.afterSol + 1 });
  else if (stage >= RESCUE_DONE) note = t('rescue.done');
  return {
    title: t('rescue.title'),
    steps: ([1, 2, 3] as const).map((n, i) => ({
      label: t(`rescue.step${n}`),
      done: done[i] ?? false,
      current: i === first && !waiting && !early,
    })),
    note,
  };
}

/** The first message of the chain is "send our location"; later ones are plain messages. */
export function actionLabel(state: GameState, action: Action): string {
  if (action.type === 'upgrade') return t(`action.upgrade.${action.upgrade}`);
  return action.type === 'message' && state.rescueStage === 1 ? t('action.sendLocation') : t(`action.${action.type}`);
}

/** Radio delay on the real date of a game sol, as text parameters. */
export function delayParams(win: WindowData, sol: number): { min: number; s: number; km: number; date: string } {
  const iso = dateOfSol(win, sol);
  const seconds = commsDelaySeconds(iso);
  return { ...splitDelay(seconds), km: Math.round((seconds * LIGHT_KM_PER_SECOND) / 1e6), date: formatDate(iso) };
}

/** Shown right after "Message Earth". `before` is the state before the action. */
export function messageSentSpec(before: GameState, win: WindowData, close: () => void): ModalSpec {
  const delay = delayParams(win, before.sol);
  return {
    kind: 'event',
    title: `📡 ${t('message.title')}`,
    date: delay.date,
    lines: [
      t(before.rescueStage === 1 ? 'message.location' : 'message.plain'),
      `⏱ ${t('message.delay', delay)}`,
      t('message.tomorrow'),
    ],
    fact: t('message.fact', delay),
    source: t('source.computed'),
    buttons: [{ label: t('event.ok'), onClick: close, primary: true }],
  };
}

export function beaconSetSpec(close: () => void): ModalSpec {
  return {
    kind: 'event',
    title: `🛬 ${t('beacon.title')}`,
    lines: [t('beacon.body')],
    buttons: [{ label: t('event.ok'), onClick: close, primary: true }],
  };
}
