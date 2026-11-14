// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Station interaction: walk to a station and open its action menu, free walking on the
// ground, placing a building (walk to the site, then the sim's `build` action), and the
// floating numbers after an action.

import { BALANCE } from '../config/balance.ts';
import stationContent from '../content/stations.json';
import { t } from '../i18n/i18n.ts';
import type { Action, ActionType, Cell, PlacedId, ReasonCode, StationId, Turn } from '../sim/actions.ts';
import { check, costOf, isStationLocked } from '../sim/rules.ts';
import type { GameState } from '../sim/state.ts';
import { isPlaceable, isStarter } from '../sim/systems/build.ts';
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
    else if (type !== 'build' && type !== 'bonus' && type !== 'place' && type !== 'relocate' && type !== 'rotate') list.push({ type, crewId });
  }
  return list;
}

/** The sim action for dropping `id` on `cell`: set up a starter, move a placed one, or build. */
export function placeAction(state: GameState, id: PlacedId, cell: Cell, rot?: Turn): Action {
  if (state.buildings[id]) return { type: 'relocate', crewId: CREW_ID, station: id, cell, rot };
  if (isStarter(id)) return { type: 'place', crewId: CREW_ID, station: id, cell, rot };
  return { type: 'build', crewId: CREW_ID, station: id, cell, rot };
}

/** F5b: every action shows its time (walking included) and its power, even when 0. */
function costLine(hours: number, power: number): string {
  return `⏱ ${t('menu.hours', { n: fmt(hours) })} · ⚡ ${power > 0 ? `−${power}` : '0'}`;
}

export function createStationUi(ctx: Ctx, guide: () => Guide, onStationOpen: (id: StationId) => void = () => undefined) {
  const { s, world, menu } = ctx;

  /** Why an action is greyed out; "no time" and "store full" say the numbers (F5b). */
  function reasonText(reason: ReasonCode, hours: number): string {
    if (reason === 'noTime') return t('reason.noTimeFor', { need: fmt(hours), have: fmt(s.state.hoursLeft) });
    if (reason === 'foodFull') return t('reason.foodFullStore', { n: fmt(s.state.food), max: BALANCE.food.max });
    return t(`reason.${reason}`);
  }

  function showStationMenu(station: StationId): void {
    s.openStation = station;
    const g = guide();
    const items = actionsAt(station, s.state).map((action) => {
      const cost = costOf(s.state, action);
      const reason = check(s.state, action, s.win);
      const hours = cost.walk + cost.hours;
      const store = action.type === 'greenhouse' ? ` · 🥫 ${t('menu.store', { n: fmt(s.state.food), max: BALANCE.food.max })}` : '';
      return {
        label: `${labelOf(s.state, action)}${store}`,
        cost: costLine(hours, cost.power),
        reason: reason ? reasonText(reason, hours) : null,
        hint: g.station === station && g.stepType === action.type,
        onPick: () => (action.type === 'shelterWait' ? ctx.enterShelter() : ctx.perform(action)),
      };
    });
    const placed = isPlaceable(station) ? s.state.buildings[station] : undefined;
    if (isPlaceable(station) && placed && placed.solsLeft === 0) {
      // Move: pick a new cell with the same ghost rules, then walk there and relocate (1 h).
      const move = placeAction(s.state, station, placed.cell);
      const cost = costOf(s.state, move);
      items.push({
        label: `↔️ ${t('action.relocate')}`,
        cost: costLine(cost.walk + cost.hours, 0),
        reason: s.state.hoursLeft < cost.walk + cost.hours ? reasonText('noTime', cost.walk + cost.hours) : null,
        hint: false,
        onPick: () => {
          menu.close();
          ctx.placement.select(station);
        },
      });
      // Turn: free and instant, cosmetic only (B4). The menu stays open for more turns.
      items.push({
        label: `↻ ${t('action.rotate')}`,
        cost: '',
        reason: null,
        hint: false,
        onPick: () => ctx.perform({ type: 'rotate', crewId: CREW_ID, station }, true),
      });
    }
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
    if (!ctx.canWalk() || isStationLocked(s.state, station)) return;
    walkThen((done) => world.walkTo(station, done), () => {
      showStationMenu(station);
      onStationOpen(station);
    });
  }

  /** Click-to-walk: purely visual; the sim charges walking with the next action (D-010). */
  function walkGround(x: number, z: number): void {
    if (!ctx.canWalk()) return;
    walkThen((done) => world.walkToPoint(x, z, done), () => undefined);
  }

  function placeBuilding(id: PlacedId, cell: Cell, rot: Turn = 0): void {
    if (!ctx.free()) return;
    const action = placeAction(s.state, id, cell, rot);
    if (check(s.state, action, s.win)) return;
    // Setting up a starter is instant: the crew unpacks it where it lands, no walk.
    if (action.type === 'place') return ctx.perform(action);
    walkThen((done) => world.walkToCell(cell, done), () => {
      ctx.perform(action);
      // A moved station lands where Ada stood: step her out in front of it.
      if (action.type === 'relocate') world.placeAda(id);
    });
  }

  /** Numbers float up from Ada and, like the trial build, under each gauge they change (F5a). */
  function floatNumbers(before: GameState, action: Action, sameSol: boolean): void {
    const cost = costOf(before, action);
    const texts: string[] = [];
    let gaugeIndex = 0;
    const delta = (value: number, icon: string, res: string): void => {
      if (Math.abs(value) <= 0.05) return;
      const text = `${value > 0 ? '+' : '−'}${fmt(Math.abs(value))}${icon}`;
      texts.push(text);
      const anchor = document.querySelector(`[data-res="${res}"]`)?.getBoundingClientRect();
      if (anchor && anchor.width > 0) {
        spawnFloater(ctx.ui, anchor.left + anchor.width / 2, anchor.bottom + 26, text, gaugeIndex++ * FLOATER_GAP_MS, value > 0 ? 'gauge up' : 'gauge down');
      }
    };
    delta(-(cost.walk + cost.hours), '⏱', 'hours');
    delta(-cost.power, '⚡', 'power');
    if (sameSol) {
      delta(s.state.air - before.air, '💨', 'air');
      delta(s.state.food - before.food, '🥫', 'food');
    }
    delta(s.state.parts - before.parts, '🔩', 'parts');
    delta(s.state.science - before.science, '⭐', 'science');
    delta(s.state.shelterLevel - before.shelterLevel, '🛡️', 'none');
    const at = world.screenOf('ada');
    texts.forEach((text, i) => spawnFloater(ctx.ui, at.x, at.y, text, i * FLOATER_GAP_MS));
  }

  return { showStationMenu, selectStation, walkGround, placeBuilding, floatNumbers };
}

export type StationUi = ReturnType<typeof createStationUi>;
