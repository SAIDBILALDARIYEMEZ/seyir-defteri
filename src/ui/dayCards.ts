// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Cards around the night: the night summary (costs, "why", "What if?") and the morning event
// cards (unlocks, malfunction, dust, particle-storm warning with its honesty label, replies).

import { BALANCE } from '../config/balance.ts';
import events from '../content/events.json';
import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import type { GameState } from '../sim/state.ts';
import { isDustSol } from '../sim/systems/schedule.ts';
import { whatIfSolDose } from '../sim/systems/time.ts';
import { sepWarnedToday, visibleWarnings } from '../sim/systems/warnings.ts';
import { dateOfSol, rateAt } from '../sim/window.ts';
import type { WindowData } from '../sim/window.ts';
import { sourceTag } from './cards.ts';
import { fmt, formatDate } from './dom.ts';
import type { ModalSpec } from './overlays.ts';
import { delayParams } from './rescue.ts';

const key = (text: string): TextKey => text as TextKey;
const share = (points: number): string => fmt((points / BALANCE.dose.budget) * 100);
const WHY_FLAGS = ['cold', 'foodEmpty', 'dust', 'broken', 'radEvent'] as const;
/** Below this many dose points a sol has nothing worth tracing or comparing. */
const DOSE_NOTE_MIN = 0.5;

export interface NightHandlers {
  onMorning(): void;
  /** Opens the "Where does this number come from?" card for the finished sol. */
  onData(sol: number, gained: number): void;
  /** "Replay yesterday" button, or null when no replay is possible. */
  replay: { label: string; onClick: () => void } | null;
}

/** `before` is the state before the last action of the sol; `state` is the next morning. */
export function nightSpec(before: GameState, state: GameState, win: WindowData, on: NightHandlers): ModalSpec {
  const { power, air, food, advisor, actions } = BALANCE;
  const log = state.log[state.log.length - 1];
  const flags = log?.flags ?? [];
  const gained = log?.doseGained ?? 0;
  const lines: (string | [string, string])[] = [
    [t('night.heating'), `−${power.nightHeating}⚡`],
    [t('night.air'), `−${air.perSol}💨`],
  ];
  if (flags.includes('cold')) lines.push([t('night.cold'), `−${air.coldPenalty}💨`]);
  if (before.sol >= food.unlockSol) lines.push([t('night.food'), `−${food.perSol}🥫`]);
  lines.push([t('night.panels'), `${Math.round((1 - state.panelEff) * 100)}%`]);
  const doseOpen = before.sol >= BALANCE.unlockSol.shelterBuild;
  if (doseOpen) lines.push([t('night.dose'), `+${share(gained)}% ☢️`]);

  const why = WHY_FLAGS.filter((flag) => flags.includes(flag));
  if (why.length === 0) lines.push(`🧭 ${t('night.why.calm')}`);
  for (const flag of why) lines.push(`🧭 ${t(`night.why.${flag}`)}`);

  // "What if?" box (PRD §12): only on the night of a radiation event.
  let fact: string | undefined;
  if (flags.includes('radEvent') && doseOpen) {
    const waited = (log?.actions ?? []).filter((a) => a === 'shelterWait').length * actions.shelterWait.stepHours;
    const level = state.shelterLevel;
    const target = advisor.shelterHoursOnEvent;
    if (waited >= target) {
      const alt = whatIfSolDose(win, before.sol, level, 0);
      fact = `${t('whatif.title')} ${t('whatif.sheltered', { got: share(gained), alt: share(alt) })}`;
    } else {
      const alt = whatIfSolDose(win, before.sol, level, target);
      if (gained - alt > DOSE_NOTE_MIN) {
        fact = `${t('whatif.title')} ${t('whatif.missed', { h: target, got: share(gained), alt: share(alt) })}`;
      }
    }
  }
  const buttons: ModalSpec['buttons'] = [{ label: t('night.morning'), onClick: on.onMorning, primary: true }];
  if (doseOpen && (flags.includes('radEvent') || gained > DOSE_NOTE_MIN)) {
    buttons.unshift({ label: t('data.button'), onClick: () => on.onData(before.sol, gained) });
  }
  if (on.replay) buttons.unshift(on.replay);
  return { kind: 'night', title: `🌙 ${t('night.title', { n: before.sol })}`, lines, fact, buttons };
}

export type CardBuild = (close: () => void) => ModalSpec;

interface EventContent {
  icon?: string;
  lines?: string[];
  fact?: string;
  source?: string;
  params?: Record<string, string>;
}
const EVENTS: Record<string, EventContent> = events;

/** Morning cards of `state.sol`, in the order they are shown. */
export function morningCards(
  before: GameState,
  state: GameState,
  win: WindowData,
  onData: (sol: number, gained: number) => void,
): CardBuild[] {
  const cards: CardBuild[] = [];
  const dateOf = (sol: number): string => formatDate(dateOfSol(win, sol));
  const card = (id: string, params: Record<string, string | number> = {}, extra: Partial<ModalSpec> = {}): void => {
    const content = EVENTS[id] ?? {};
    cards.push((close) => ({
      kind: 'event',
      title: `${content.icon ?? '🧭'} ${t('watch.title')}`,
      lines: (content.lines ?? []).map((line) => t(key(line), params)),
      fact: content.fact ? t(key(content.fact), params) : undefined,
      source: content.source ? sourceTag(content.source, win) : undefined,
      buttons: [{ label: t('event.ok'), onClick: close, primary: true }],
      ...extra,
    }));
  };

  const yesterday = state.log[state.log.length - 1];
  if (yesterday?.flags.includes('radEvent') && before.sol >= BALANCE.unlockSol.shelterBuild) {
    const rates = Array.from({ length: BALANCE.hoursPerSol }, (_, h) => rateAt(win, before.sol, h));
    const alerts = win.solarEvents.filter((e) => e.sol === before.sol && e.kind === 'sep').length;
    const date = dateOf(before.sol);
    cards.push((close) => ({
      kind: 'event',
      title: `☢️ ${t('event.report.title')}`,
      date,
      lines: [
        t('event.report.mars', { n: fmt(Math.max(...rates)), quiet: fmt(win.quietRate) }),
        alerts > 0 ? t('event.report.earth', { n: alerts }) : t('event.report.earthNone'),
      ],
      source: `${sourceTag('source.rad', win)} · ${sourceTag('source.donki', win)}`,
      buttons: [
        { label: t('data.button'), onClick: () => onData(before.sol, yesterday.doseGained) },
        { label: t('event.ok'), onClick: close, primary: true },
      ],
    }));
  }
  if (state.sol === BALANCE.unlockSol.greenhouse) card('unlockGreenhouse', {}, { title: `🌱 ${t('unlock.title')}` });
  if (state.sol === BALANCE.unlockSol.shelterBuild) card('unlockAll', {}, { title: `🗺️ ${t('unlock.title')}` });
  for (const station of state.broken.filter((s) => !before.broken.includes(s))) {
    card('broken', { station: t(`station.${station}`) });
  }
  if (isDustSol(state.schedule, state.sol) && !isDustSol(state.schedule, before.sol)) card('dust');

  if (state.sol >= BALANCE.unlockSol.shelterBuild) {
    const ahead = visibleWarnings(state, win).find((w) => w.kind === 'sep' && w.sol > state.sol);
    const today = sepWarnedToday(state, win);
    const sol = today ? state.sol : ahead?.sol;
    if (sol !== undefined) {
      // Honesty label: RAD-measured days are real Mars data, DONKI-only days are near-Earth reports.
      const label = EVENTS[win.radEventSols.includes(sol) ? 'sepMars' : 'sepEarth'] ?? {};
      card(today ? 'radToday' : 'radAhead', { n: sol - state.sol }, {
        date: dateOf(sol),
        fact: t(key(label.fact ?? ''), { date: dateOf(sol) }),
        source: sourceTag(label.source ?? 'source.game', win),
      });
    }
  }
  const reply = state.lastReply;
  if (reply) {
    const lines = [t(`event.reply.${reply}`, { n: BALANCE.actions.beacon.afterSol + 1 })];
    if (reply === 'coords') lines.push(`📍 ${t('event.coords.place', EVENTS.coords?.params ?? {})}`);
    lines.push(`⏱ ${t('event.reply.travel', delayParams(win, state.sol))}`);
    const coords = reply === 'coords' ? { title: `🛬 ${t('event.coords.title')}`, fact: t('event.coords.fact') } : {};
    card('reply', {}, { lines, date: dateOf(state.sol), ...coords });
  }
  return cards;
}
