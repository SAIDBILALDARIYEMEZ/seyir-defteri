// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Cutscene overlay (F5c): letterbox bars, subtitle, PUSULA's speech bubble, red alarm glow, white
// flash, black fade, eyelids for the wake-up blink, canvas blur and the always-visible Skip.

import { t } from '../i18n/i18n.ts';
import { button, el } from './dom.ts';

export interface CinemaUi {
  show(onSkip: () => void): void;
  /** Clears every effect and hides the overlay. */
  hide(): void;
  bars(on: boolean): void;
  subtitle(text: string | null): void;
  bubble(text: string | null): void;
  alarm(on: boolean): void;
  flash(): void;
  /** Black cover: 0 = clear, 1 = black, over `ms`. */
  fade(to: number, ms: number): void;
  /** Eyes closed + blurred, then a blink and a slow focus (wake-up). */
  wake(calm: boolean): void;
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
  const sub = el('p', 'cine-sub');
  const bubble = el('div', 'cine-bubble');
  const who = el('strong', 'cine-who');
  const said = el('span');
  bubble.append(who, said);
  const skip = button('btn cine-skip', '', () => onSkip());
  root.append(alarm, lidTop, lidBottom, top, bottom, flash, black, sub, bubble, skip);
  root.hidden = true;
  parent.append(root);
  let onSkip = (): void => undefined;

  const setFade = (to: number, ms: number): void => {
    black.style.transition = `opacity ${ms}ms ease`;
    black.style.opacity = String(to);
  };
  const setBlur = (px: number, ms: number): void => {
    canvas.style.transition = `filter ${ms}ms ease-out`;
    canvas.style.filter = px > 0 ? `blur(${px}px)` : '';
  };

  return {
    show(handler) {
      onSkip = handler;
      skip.textContent = t('cine.skip');
      who.textContent = t('watch.title');
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
      root.classList.remove('bars', 'alarm', 'lids', 'blink', 'calm');
      sub.classList.remove('on');
      bubble.classList.remove('on');
      setFade(0, 0);
      setBlur(0, 0);
    },
    bars: (on) => void root.classList.toggle('bars', on),
    subtitle(text) {
      if (text) sub.textContent = text;
      sub.classList.toggle('on', text !== null);
    },
    bubble(text) {
      if (text) said.textContent = text;
      bubble.classList.toggle('on', text !== null);
    },
    alarm: (on) => void root.classList.toggle('alarm', on),
    flash() {
      flash.classList.remove('go');
      void flash.offsetWidth; // restart the animation
      flash.classList.add('go');
    },
    fade: setFade,
    wake(calm) {
      root.classList.toggle('calm', calm);
      root.classList.remove('blink');
      root.classList.add('lids');
      setBlur(10, 0);
      setFade(0, 250);
      void root.offsetWidth;
      root.classList.add('blink');
      window.setTimeout(() => setBlur(0, 2200), 400);
    },
  };
}
