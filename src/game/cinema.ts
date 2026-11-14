// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Cutscene controller (F5c): prepares a cutscene (props + shader warm-up behind a "Preparing…"
// cover), plays it in the world, turns its beats into overlay effects and sounds, shows the
// dialogue as timed subtitles, and hands control back when it ends or is skipped (Skip / Esc).
// Everything runs on the cutscene clock (render-loop delta time): no timers. After a stall the
// clock goes on from where it was (dt is capped), so no shot or line is skipped.

import { setStormSound, sfx } from '../audio/sound.ts';
import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import { isDebug } from '../lib/debug.ts';
import { reduceMotion } from '../lib/motion.ts';
import type { Beat, Playing } from '../scene/cutscenes/cutscene.ts';
import { playIntro } from '../scene/cutscenes/intro.ts';
import { playLose } from '../scene/cutscenes/outroLose.ts';
import { playWin } from '../scene/cutscenes/outroWin.ts';
import type { World } from '../scene/world.ts';
import type { GameState } from '../sim/state.ts';
import type { WindowData } from '../sim/window.ts';
import { mountCinema } from '../ui/cinema.ts';
import { formatMonth } from '../ui/dom.ts';

export type CineKind = 'intro' | 'win' | 'lose';

export interface Cinema {
  /** Shows `state` in the world, plays the cutscene, then calls `onDone` (also after Skip). */
  play(kind: CineKind, state: GameState, win: WindowData, onDone: () => void): void;
  active(): boolean;
}

type Speaker = 'pusula' | 'ada' | null;
interface Line {
  who: Speaker;
  key: TextKey;
}
interface Shown {
  who: Speaker;
  text: string;
  from: number;
  to: number;
}

const PLAYERS = { intro: playIntro, win: playWin, lose: playLose };
/** The dialogue started by each cutscene's 'talk' beat (the storm line comes with 'warn'). */
const TALK: Record<CineKind, Line[]> = {
  intro: [
    { who: 'pusula', key: 'cine.wake1' },
    { who: 'ada', key: 'cine.wake2' },
    { who: 'pusula', key: 'cine.wake3' },
    { who: 'pusula', key: 'cine.wake4' },
    { who: 'ada', key: 'cine.wake5' },
    { who: 'pusula', key: 'cine.wake6' },
  ],
  win: [{ who: 'pusula', key: 'cine.win' }],
  lose: [{ who: 'pusula', key: 'cine.lose' }],
};
/** Reading time: a base plus a share per word, within limits (seconds). */
const READ = { base: 1.2, perWord: 0.34, min: 1.8, max: 7.5 };
/** Wake-up: eyelid keyframes [time after the beat, open 0..1] and the blur (px, fades out). */
const BLINK: [number, number][] = [[0, 0], [0.55, 0.42], [0.85, 0.05], [1.65, 0.77], [2.2, 1]];
const BLUR = { px: 10, from: 0.4, to: 2.6 };

const words = (text: string): number => text.split(/\s+/).filter(Boolean).length;
const readTime = (text: string): number => Math.min(READ.max, Math.max(READ.min, READ.base + words(text) * READ.perWord));
const total = (lines: Line[]): number => lines.reduce((sum, l) => sum + readTime(t(l.key)), 0);

function blinkAt(k: number, calm: boolean): number {
  if (calm) return Math.min(1, Math.max(0, k / 2.2));
  for (let i = 1; i < BLINK.length; i++) {
    const [t1, o1] = BLINK[i] ?? [0, 1];
    const [t0, o0] = BLINK[i - 1] ?? [0, 0];
    if (k <= t1) return o0 + (o1 - o0) * ((k - t0) / (t1 - t0));
  }
  return 1;
}

export function createCinema(ui: HTMLElement, canvas: HTMLCanvasElement, world: World): Cinema {
  const overlay = mountCinema(ui, canvas);
  let current: { cut: Playing | null; done: () => void } | null = null;
  let lines: Shown[] = [];
  let wakeAt: number | null = null;

  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    finish();
  };

  function finish(): void {
    if (!current) return;
    const { cut, done } = current;
    current = null;
    cut?.dispose();
    world.play(null);
    overlay.hide();
    setStormSound(false);
    window.removeEventListener('keydown', onKey, true);
    done();
  }

  /** Queues lines back to back from `at` (no gaps, each one once). */
  function say(list: Line[], at: number): void {
    let from = Math.max(at, lines.at(-1)?.to ?? 0);
    for (const line of list) {
      const text = t(line.key);
      const to = from + readTime(text);
      lines.push({ who: line.who, text, from, to });
      from = to;
    }
  }

  function tick(t: number): void {
    // Debug only: the cutscene clock, so frame-time traces can be matched to story times.
    if (isDebug) (window as { cineT?: number }).cineT = t;
    const line = lines.find((l) => l.from <= t && t < l.to);
    const who = line?.who === 'pusula' ? tr('watch.title') : line?.who === 'ada' ? tr('cine.ada') : null;
    overlay.line(who, line ? line.text : null);
    if (wakeAt === null) return;
    const k = t - wakeAt;
    const blur = BLUR.px * (1 - Math.min(1, Math.max(0, (k - BLUR.from) / (BLUR.to - BLUR.from))));
    const open = blinkAt(k, reduceMotion());
    overlay.eyes(open >= 1 && blur <= 0 ? null : open, blur);
    if (open >= 1 && blur <= 0) wakeAt = null;
  }
  const tr = (key: TextKey): string => t(key);

  function onBeat(kind: CineKind, win: WindowData, state: GameState, beat: Beat, at: number): void {
    const calm = reduceMotion();
    switch (beat) {
      case 'bars': return overlay.bars(true);
      case 'title':
        // The date line has no speaker: it is shown until the fade to the storm.
        lines.push({ who: null, text: t('cine.date', { date: formatMonth(win.startDate) }), from: at, to: 4.5 });
        return;
      case 'whoosh': return sfx.whoosh();
      case 'fadeOut': return overlay.fade(1, kind === 'intro' ? 400 : 600);
      case 'fadeIn': return overlay.fade(0, 500);
      case 'storm':
        setStormSound(true);
        return sfx.rumble();
      case 'warn':
        sfx.alarm();
        overlay.alarm(true);
        return say([{ who: 'pusula', key: 'cine.storm' }], at);
      case 'impact': return sfx.impact();
      case 'flash': return calm ? overlay.fade(1, 300) : overlay.flash();
      case 'black':
        overlay.alarm(false);
        setStormSound(false);
        return overlay.fade(1, 300);
      case 'wake':
        sfx.wake();
        wakeAt = at;
        overlay.eyes(0, BLUR.px);
        return overlay.fade(0, 250);
      case 'talk':
        if (kind === 'lose') sfx.calm();
        return say(TALK[kind], at);
      case 'clear': return overlay.bars(false);
      case 'land': return sfx.win();
      case 'lightsOut': return sfx.night();
      // Evacuation stays soft: a whoosh, never the engine rumble.
      case 'liftoff': return kind === 'lose' ? sfx.whoosh() : sfx.rumble();
      case 'board': return sfx.wake();
      case 'final':
        lines = lines.filter((l) => l.to <= at);
        return overlay.card(kind === 'win' ? t('cine.winCard', { n: state.science }) : t('cine.loseCard'));
      case 'end': return;
    }
  }

  return {
    play(kind, state, win, onDone) {
      if (current) finish();
      lines = [];
      wakeAt = null;
      current = { cut: null, done: onDone };
      const mine = current;
      overlay.show(finish);
      overlay.preparing(true);
      window.addEventListener('keydown', onKey, true);
      world.setNight(false);
      world.setMarker(null);
      world.sync(state, 'none');
      world.view.reset();
      const cut = PLAYERS[kind](world.stage(), {
        calm: reduceMotion(),
        talk: total(TALK[kind]),
        onBeat: (beat, at) => onBeat(kind, win, state, beat, at),
        onTick: tick,
        onEnd: () => finish(),
      });
      mine.cut = cut;
      // Let the cover paint, then compile every shader before the first shot.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          void world.warm(cut).then(() => {
            if (current !== mine) return;
            overlay.preparing(false);
            world.play(cut);
          });
        }),
      );
    },
    active: () => current !== null,
  };
}
