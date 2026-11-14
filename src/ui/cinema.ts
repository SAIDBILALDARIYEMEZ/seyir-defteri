// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Cutscene overlay (F5c): letterbox bars, subtitles with the speaker's name, red alarm glow, white
// flash, black fade, eyelids + canvas blur for the wake-up, a "Preparing…" cover and the
// always-visible Skip. Fix pass: no timers; the eyelids and the blur are set every frame from the
// cutscene clock, and the DOM is only written when a value really changes.

import { t } from '../i18n/i18n.ts';
import { button, el } from './dom.ts';

export interface CinemaUi {
  show(onSkip: () => void): void;
  /** Clears every effect and hides the overlay. */
  hide(): void;
  /** Black cover with "Preparing…" while the shaders compile. */
  preparing(on: boolean): void;
  bars(on: boolean): void;
  /** One subtitle line; `who` = speaker name or null; text null hides it. */
  line(who: string | null, text: string | null): void;
  alarm(on: boolean): void;
  flash(): void;
  /** Black cover: 0 = clear, 1 = black, over `ms`. */
  fade(to: number, ms: number): void;
  /** Closing card in the middle of the screen (stays over the fade to black); null hides it. */
  card(text: string | null): void;
  /** Wake-up: eyes open 0..1 and canvas blur in px; null removes both. */
  eyes(open: number | null, blurPx?: number): void;
}

export function mountCinema(parent: HTMLElement, canvas: HTMLCanvasElement): CinemaUi {
  const root = el('div', 'cine');
  const top = el('div', 'cine-bar top');
  const bottom = el('div', 'cine-bar bottom');
  const alarm = el('div', 'cine-alarm');
  const lidTop = el('div', 'cine-lid top');
  const lidBottom = el('div', 'cine-lid bottom');
  const flash = el('div', 'cine-flash');
  const black = el('div', 'cine-black');
  const prep = el('p', 'cine-prep');
  const card = el('p', 'cine-card');
  const sub = el('p', 'cine-sub');
  const who = el('strong', 'cine-who');
  const said = el('span');
  sub.append(who, said);
  const skip = button('btn cine-skip', '', () => onSkip());
  root.append(alarm, lidTop, lidBottom, top, bottom, flash, black, card, prep, sub, skip);
  root.hidden = true;
  parent.append(root);
  let onSkip = (): void => undefined;
  let shownText: string | null = null;
  let shownWho: string | null = null;
  let lidScale = -1;
  let blur = -1;

  const setFade = (to: number, ms: number): void => {
    black.style.transition = `opacity ${ms}ms ease`;
    black.style.opacity = String(to);
  };
  const setBlur = (px: number): void => {
    const rounded = Math.round(px * 2) / 2;
    if (rounded === blur) return;
    blur = rounded;
    canvas.style.filter = rounded > 0 ? `blur(${rounded}px)` : '';
  };

  return {
    show(handler) {
      onSkip = handler;
      skip.textContent = t('cine.skip');
      prep.textContent = t('cine.preparing');
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
      root.classList.remove('bars', 'alarm', 'lids', 'prep');
      card.classList.remove('on');
      sub.classList.remove('on');
      shownText = shownWho = null;
      setFade(0, 0);
      lidScale = -1;
      setBlur(0);
    },
    preparing: (on) => void root.classList.toggle('prep', on),
    bars: (on) => void root.classList.toggle('bars', on),
    line(speaker, text) {
      if (text === shownText && speaker === shownWho) return;
      shownText = text;
      shownWho = speaker;
      if (text !== null) {
        who.textContent = speaker ?? '';
        who.hidden = speaker === null;
        said.textContent = text;
      }
      sub.classList.toggle('on', text !== null);
    },
    alarm: (on) => void root.classList.toggle('alarm', on),
    flash() {
      flash.classList.remove('go');
      void flash.offsetWidth; // restart the animation (once, at the flash beat)
      flash.classList.add('go');
    },
    fade: setFade,
    card(text) {
      if (text) card.textContent = text;
      card.classList.toggle('on', text !== null);
    },
    eyes(open, blurPx = 0) {
      root.classList.toggle('lids', open !== null);
      setBlur(open === null ? 0 : blurPx);
      if (open === null) return;
      const scale = Math.round((1 - open) * 100) / 100;
      if (scale === lidScale) return;
      lidScale = scale;
      lidTop.style.transform = lidBottom.style.transform = `scaleY(${scale})`;
    },
  };
}
