// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Debug panel, shown only with `?debug`: FPS, state, set gauges, skip sols, trigger events,
// and one button per sim action (shows the "why disabled" reason).

import { onLangChange, t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import type { Action, StationId } from '../sim/actions.ts';
import { DEBUG_GAUGES } from '../sim/debugTools.ts';
import type { DebugGauge } from '../sim/debugTools.ts';
import type { GameState } from '../sim/state.ts';
import type { WindowData } from '../sim/window.ts';
import { dateOfSol } from '../sim/window.ts';

export interface DebugPanel {
  update(dt: number, state: GameState): void;
}

export interface DebugHandlers {
  dispatch(action: Action): void;
  skipSols(count: number): void;
  jumpToEvent(): void;
  setGauge(gauge: DebugGauge, value: number): void;
  triggerDust(): void;
  triggerMalfunction(station: StationId): void;
}

const SKIP_MANY = 5;
const BREAK_STATION: StationId = 'moxie';
const crewId = 0;
const ACTIONS: Action[] = [
  { type: 'clean', crewId },
  { type: 'moxie', crewId },
  { type: 'greenhouse', crewId },
  { type: 'shelterBuild', crewId },
  { type: 'shelterWait', crewId, hours: 1 },
  { type: 'antennaRepair', crewId },
  { type: 'message', crewId },
  { type: 'beacon', crewId },
  { type: 'readCuriosity', crewId },
  { type: 'scanRock', crewId },
  { type: 'repair', crewId, station: BREAK_STATION },
  { type: 'replayYesterday', crewId },
];

const fmt = (n: number): string => (Math.round(n * 10) / 10).toString();

export function mountDebugPanel(root: HTMLElement, getWin: () => WindowData, on: DebugHandlers): DebugPanel {
  const panel = document.createElement('aside');
  panel.className = 'debug-panel';
  const title = document.createElement('strong');
  const lines = document.createElement('pre');
  const rows = document.createElement('div');
  panel.append(title, lines, rows);
  root.append(panel);

  const labels: [HTMLElement, TextKey][] = [[title, 'debug.title']];
  const button = (key: TextKey, onClick: () => void, parent: HTMLElement = rows): void => {
    const b = document.createElement('button');
    b.type = 'button';
    b.addEventListener('click', onClick);
    labels.push([b, key]);
    parent.append(b);
  };

  button('debug.nextSol', () => on.skipSols(1));
  button('debug.skipSols', () => on.skipSols(SKIP_MANY));
  button('debug.jumpEvent', () => on.jumpToEvent());
  button('debug.dust', () => on.triggerDust());
  button('debug.malfunction', () => on.triggerMalfunction(BREAK_STATION));

  const setRow = document.createElement('div');
  const select = document.createElement('select');
  for (const g of DEBUG_GAUGES) select.append(new Option(g, g));
  const input = document.createElement('input');
  input.type = 'number';
  input.value = '50';
  setRow.append(select, input);
  button('debug.set', () => on.setGauge(select.value as DebugGauge, Number(input.value)), setRow);
  rows.append(setRow);

  const actionRow = document.createElement('div');
  for (const action of ACTIONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action.type; // action ids are code names, debug only
    b.addEventListener('click', () => on.dispatch(action));
    actionRow.append(b);
  }
  rows.append(actionRow);

  onLangChange(() => {
    for (const [node, key] of labels) node.textContent = t(key);
  });

  let frames = 0;
  let elapsed = 0;
  let fps = 0;

  return {
    update(dt, s) {
      frames += 1;
      elapsed += dt;
      if (elapsed >= 0.5) {
        fps = Math.round(frames / elapsed);
        frames = 0;
        elapsed = 0;
      }
      const reason = s.rejection ? t(`reason.${s.rejection}` as TextKey) : '-';
      lines.textContent = [
        `${t('debug.fps')} ${fps} · ${getWin().id} ${dateOfSol(getWin(), s.sol)} · ${s.phase} ${s.result ?? ''}`,
        `${t('debug.sol')} ${s.sol} · ${t('debug.hoursLeft')} ${fmt(s.hoursLeft)}`,
        `power ${fmt(s.power)} · air ${fmt(s.air)} · food ${fmt(s.food)} · dose ${fmt(s.dose)}`,
        `science ${s.science} · panels ${fmt(s.panelEff * 100)}% · shelter ${s.shelterLevel}`,
        `rescue ${s.rescueStage}/4 · replays ${s.replaysLeft} · broken ${s.broken.join(',') || '-'}`,
        `urgent ${s.today.urgent.join(',') || '-'}`,
        `${t('debug.lastReason')}: ${reason}`,
      ].join('\n');
    },
  };
}
