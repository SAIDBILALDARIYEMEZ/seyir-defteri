// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Learning layer wiring (B3): XP from what happened in the sim, concept capsules at natural
// moments (station tap, build wait, night), the recall question on every 4th showing, and
// the profile bits of the result screen. Reads the sim, never changes it.

import { PROGRESSION } from '../config/progression.ts';
import type { XpSource } from '../config/progression.ts';
import { t } from '../i18n/i18n.ts';
import { addXp, canPickStorm, pickConcept, rankOf, recordWin, showConcept, startMission } from '../profile/profile.ts';
import type { Profile } from '../profile/profile.ts';
import { loadProfile, resetProfile, saveProfile } from '../profile/store.ts';
import type { Action, StationId } from '../sim/actions.ts';
import type { GameState } from '../sim/state.ts';
import { PLACEABLES } from '../sim/systems/build.ts';
import { isEventNow } from '../sim/systems/time.ts';
import type { WindowData } from '../sim/window.ts';
import { capsuleSpec, conceptsFor, quizSpec } from '../ui/learn.ts';
import type { ModalSpec } from '../ui/overlays.ts';
import { mountRank, rankLabel } from '../ui/rank.ts';
import type { Ctx } from './context.ts';

export type Moment = 'station' | 'build' | 'night';
export type CardBuilder = (close: () => void) => ModalSpec;

export interface MissionProgress {
  gained: number;
  rank: string;
  rankUp: string | null;
}

export function createLearn(ctx: Ctx) {
  let profile: Profile = loadProfile();
  const badge = mountRank(ctx.ui);
  badge.update(profile.xp);
  /** Sol on which each moment last showed a capsule (one per moment per sol). */
  const lastShown = new Map<Moment, number>();
  let shelterSol = 0;

  const set = (next: Profile): void => {
    profile = next;
    saveProfile(profile);
    badge.update(profile.xp);
  };

  function gain(source: XpSource, times = 1): void {
    const r = addXp(profile, source, times);
    if (r.gained <= 0) return;
    set(r.profile);
    badge.toast(t('xp.toast', { n: r.gained }));
    if (r.rankUp) badge.toast(`🎉 ${t('xp.rankUp', { rank: t(`rank.${r.rankUp}`) })}`, true);
  }

  /** The capsule (or question) for a moment, or null when this moment already had one today. */
  function card(moment: Moment, station: StationId | null): CardBuilder | null {
    const sol = ctx.s.state.sol;
    if (lastShown.get(moment) === sol) return null;
    const id = pickConcept(profile, conceptsFor(station));
    if (!id) return null;
    lastShown.set(moment, sol);
    const r = showConcept(profile, id);
    set(r.profile);
    if (r.mode === 'capsule') return (close) => capsuleSpec(id, close);
    return (close) => quizSpec(id, PROGRESSION.xp.quizCorrect, (ok) => ok && gain('quizCorrect'), close);
  }

  function open(moment: Moment, station: StationId | null): void {
    const build = card(moment, station);
    if (!build) return;
    const close = ctx.modal(() => build(() => close()));
  }

  /** XP for what the last action did. `wasTask`: it was on PUSULA's list. */
  function onAction(before: GameState, after: GameState, action: Action, win: WindowData, wasTask: boolean): void {
    if (wasTask) gain('taskDone');
    const finished = PLACEABLES.filter((id) => (before.buildings[id]?.solsLeft ?? 0) > 0 && after.buildings[id]?.solsLeft === 0);
    if (finished.length) gain('buildDone', finished.length);
    if (after.parts > before.parts) gain('partFound');
    if (action.type === 'upgrade') gain('upgradeDone');
    if (action.type === 'shelterWait' && isEventNow(before, win) && shelterSol !== before.sol) {
      shelterSol = before.sol;
      gain('shelterInStorm');
    }
    // Waiting for a new building is a natural moment for a capsule about it.
    if (action.type === 'build' && after.sol === before.sol && after.phase === 'playing') open('build', action.station);
  }

  return {
    onAction,
    /** After the station menu opens (once per sol). */
    onStation: (station: StationId) => open('station', station),
    /** Card for the morning queue after the night summary. */
    nightCard: (): CardBuilder | null => card('night', null),
    start(seed: number): void {
      set(startMission(profile, seed));
    },
    /** End of a mission: records a win, returns the XP summary for the result screen. */
    finish(state: GameState): MissionProgress {
      const startXp = profile.mission?.seed === state.seed ? profile.mission.startXp : profile.xp;
      if (state.phase === 'won') set(recordWin(profile));
      const before = rankOf(startXp);
      const now = rankOf(profile.xp);
      set({ ...profile, mission: null });
      return {
        gained: profile.xp - startXp,
        rank: rankLabel(profile.xp),
        rankUp: now.index > before.index ? rankLabel(profile.xp) : null,
      };
    },
    canPickStorm: (): boolean => canPickStorm(profile),
    /** The rank badge; game.ts puts it under the HUD's left chips (F5b: no overlap). */
    badge: badge.root,
    reset(): void {
      profile = resetProfile();
      badge.update(profile.xp);
    },
    render(playing: boolean): void {
      badge.root.hidden = !playing;
      badge.update(profile.xp);
    },
  };
}

export type Learn = ReturnType<typeof createLearn>;
