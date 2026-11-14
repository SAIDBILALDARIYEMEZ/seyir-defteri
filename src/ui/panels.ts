// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Wrist watch (PUSULA text + task list skeleton), station name labels and the main menu.

import stations from '../content/stations.json';
import { t } from '../i18n/i18n.ts';
import type { StationId } from '../sim/actions.ts';
import type { GameState } from '../sim/state.ts';
import type { ScreenPoint } from '../scene/world.ts';
import { button, el } from './dom.ts';
import { languagePicker } from './overlays.ts';

export interface Watch {
  root: HTMLElement;
  /** `tasks` are already translated lines. */
  update(pusulaText: string, tasks: string[]): void;
}

export function mountWatch(parent: HTMLElement): Watch {
  const root = el('aside', 'watch');
  const title = el('strong', 'watch-title');
  const text = el('p', 'watch-text');
  const tasksTitle = el('span', 'watch-sub');
  const list = el('ul', 'watch-tasks');
  root.append(title, text, tasksTitle, list);
  parent.append(root);
  return {
    root,
    update(pusulaText, tasks) {
      title.textContent = `🧭 ${t('watch.title')}`;
      text.textContent = pusulaText;
      tasksTitle.textContent = t('watch.tasks');
      list.replaceChildren(...(tasks.length ? tasks : [t('watch.noTasks')]).map((line) => el('li', '', line)));
    },
  };
}

export interface Labels {
  root: HTMLElement;
  refresh(state: GameState): void;
  /** Call every frame: follows the camera. */
  place(screenOf: (id: StationId) => ScreenPoint): void;
}

export function mountLabels(parent: HTMLElement, onPick: (id: StationId) => void): Labels {
  const root = el('nav', 'labels');
  const ids = Object.keys(stations) as StationId[];
  const nodes = ids.map((id) => {
    const b = button('label', '', () => onPick(id));
    root.append(b);
    return b;
  });
  parent.append(root);
  return {
    root,
    refresh(state) {
      nodes.forEach((node, i) => {
        const id = ids[i] ?? 'habitat';
        const broken = state.broken.includes(id);
        node.textContent = `${stations[id].icon} ${t(`station.${id}`)}${broken ? ` 🔧 ${t('station.needsRepair')}` : ''}`;
        node.classList.toggle('broken', broken);
      });
    },
    place(screenOf) {
      nodes.forEach((node, i) => {
        const p = screenOf(ids[i] ?? 'habitat');
        node.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
        node.style.visibility = p.visible ? 'visible' : 'hidden';
      });
    },
  };
}

export interface MainMenu {
  root: HTMLElement;
  refresh(): void;
}

export function mountMainMenu(parent: HTMLElement, onNewMission: () => void): MainMenu {
  const root = el('main', 'main-menu');
  const card = el('div', 'menu-card');
  const title = el('h1');
  const tagline = el('p', 'tagline');
  const start = button('btn primary big', '', onNewMission);
  card.append(title, tagline, start, languagePicker());
  root.append(card);
  parent.append(root);
  return {
    root,
    refresh() {
      title.textContent = t('app.title');
      tagline.textContent = t('app.tagline');
      start.textContent = t('menu.newMission');
    },
  };
}
