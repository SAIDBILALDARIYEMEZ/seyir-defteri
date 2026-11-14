// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Station interaction: walk to a station and open its action menu, free walking on the
// ground, placing a building (walk to the site, then the sim's `build` action), and the
// floating numbers after an action.

import { BALANCE } from '../config/balance.ts';
import stationContent from '../content/stations.json';
import { t } from '../i18n/i18n.ts';
import type { Action, ActionType, BuildableId, Cell, StationId } from '../sim/actions.ts';
import { check, costOf, isStationLocked } from '../sim/rules.ts';
import type { GameState } from '../sim/state.ts';
import { fmt } from '../ui/dom.ts';
import { spawnFloater } from '../ui/overlays.ts';
import { CREW_ID } from './context.ts';
import type { Ctx } from './context.ts';
import type { Guide } from './guide.ts';
import { labelOf } from './guide.ts';

const FLOATER_GAP_MS = 220;

function actionsAt(station: StationId, state: GameState): Action[] {
  const crewId = CREW_ID;
  const list: Action[] = state.broken.includes(station) ? [{ type: 'repair', crewId, station }] : [];
  for (const type of stationContent[station].actions as ActionType[]) {
    if (type === 'repair') continue;
    if (type === 'shelterWait') list.push({ type, crewId, hours: BALANCE.actions.shelterWait.stepHours });
    else if (type !== 'build' && type !== 'bonus') list.push({ type, crewId });
  }
  return list;
}

export function createStationUi(ctx: Ctx, guide: () => Guide) {
  const { s, world, menu } = ctx;

  function showStationMenu(station: StationId): void {
    s.openStation = station;
    const g = guide();
    const items = actionsAt(station, s.state).map((action) => {
      const cost = costOf(s.state, action);
      const reason = check(s.state, action, s.win);
      const hours = cost.walk + cost.hours;
      const parts = [hours > 0 ? `⏱ ${t('menu.hours', { n: fmt(hours) })}` : '', cost.power > 0 ? `−${cost.power}⚡` : ''];
      return {
        label: labelOf(s.state, action),
        cost: parts.filter(Boolean).join('  '),
        reason: reason ? t(`reason.${reason}`) : null,
        hint: g.station === station && g.stepType === action.type,
        onPick: () => ctx.perform(action),
      };
    });
    menu.open(`${stationContent[station].icon} ${t(`station.${station}`)}`, items, t('menu.close'));
  }

  /** Walk animation, then `then`. Blocks other input while Ada walks. */
  function walkThen(start: (done: () => void) => void, then: () => void): void {
    menu.close();
    ctx.placement.cancel();
    s.walking = true;
    ctx.render();
    start(() => {
      s.walking = false;
      then();
      ctx.render();
    });
  }

  function selectStation(station: StationId): void {
    if (!ctx.free() || isStationLocked(s.state, station)) return;
    walkThen((done) => world.walkTo(station, done), () => showStationMenu(station));
  }

  /** Click-to-walk: purely visual; the sim charges walking with the next action (D-010). */
  function walkGround(x: number, z: number): void {
    if (!ctx.free()) return;
    walkThen((done) => world.walkToPoint(x, z, done), () => undefined);
  }

  function placeBuilding(id: BuildableId, cell: Cell): void {
    if (!ctx.free()) return;
    const action: Action = { type: 'build', crewId: CREW_ID, station: id, cell };
    if (check(s.state, action, s.win)) return;
    walkThen((done) => world.walkToCell(cell, done), () => ctx.perform(action));
  }

  function floatNumbers(before: GameState, action: Action, sameSol: boolean): void {
    const cost = costOf(before, action);
    const texts: string[] = [];
    const delta = (value: number, icon: string): void => {
      if (Math.abs(value) > 0.05) texts.push(`${value > 0 ? '+' : '−'}${fmt(Math.abs(value))}${icon}`);
    };
    delta(-(cost.walk + cost.hours), '⏱');
    delta(-cost.power, '⚡');
    if (sameSol) {
      delta(s.state.air - before.air, '💨');
      delta(s.state.food - before.food, '🥫');
    }
    delta(s.state.parts - before.parts, '🔩');
    delta(s.state.science - before.science, '⭐');
    delta(s.state.shelterLevel - before.shelterLevel, '🛡️');
    const at = world.screenOf('ada');
    texts.forEach((text, i) => spawnFloater(ctx.ui, at.x, at.y, text, i * FLOATER_GAP_MS));
  }

  return { showStationMenu, selectStation, walkGround, placeBuilding, floatNumbers };
}

export type StationUi = ReturnType<typeof createStationUi>;
