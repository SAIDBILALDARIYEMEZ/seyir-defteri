// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Cutscene controller (F5c): starts a cutscene in the world, turns its beats into overlay
// effects and sounds, and hands control back when it ends or is skipped (Skip / Esc).

import { setStormSound, sfx } from '../audio/sound.ts';
import { t } from '../i18n/i18n.ts';
import { reduceMotion } from '../lib/motion.ts';
import type { Beat, Playing } from '../scene/cutscenes/cutscene.ts';
import { playIntro } from '../scene/cutscenes/intro.ts';
import { playLose, playWin } from '../scene/cutscenes/outro.ts';
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

const PLAYERS = { intro: playIntro, win: playWin, lose: playLose };

export function createCinema(ui: HTMLElement, canvas: HTMLCanvasElement, world: World): Cinema {
  const overlay = mountCinema(ui, canvas);
  let current: { cut: Playing; done: () => void } | null = null;

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
    cut.dispose();
    world.play(null);
    overlay.hide();
    setStormSound(false);
    window.removeEventListener('keydown', onKey, true);
    done();
  }

  function onBeat(kind: CineKind, win: WindowData, beat: Beat): void {
    const calm = reduceMotion();
    switch (beat) {
      case 'bars': return overlay.bars(true);
      case 'title': return overlay.subtitle(t('cine.date', { date: formatMonth(win.startDate) }));
      case 'whoosh': return sfx.whoosh();
      case 'fadeOut': return overlay.fade(1, kind === 'intro' ? 400 : 600);
      case 'fadeIn':
        overlay.subtitle(null);
        return overlay.fade(0, 500);
      case 'storm':
        setStormSound(true);
        return sfx.rumble();
      case 'warn':
        sfx.alarm();
        overlay.alarm(true);
        return overlay.bubble(t('cine.warn'));
      case 'impact':
        overlay.bubble(null);
        return sfx.impact();
      case 'flash': return calm ? overlay.fade(1, 300) : overlay.flash();
      case 'black':
        overlay.alarm(false);
        setStormSound(false);
        return overlay.fade(1, 300);
      case 'wake':
        sfx.wake();
        return overlay.wake(calm);
      case 'pusula': return overlay.bubble(t('cine.wake'));
      case 'clear':
        overlay.bubble(null);
        return overlay.bars(false);
      case 'land': return sfx.win();
      case 'tagline':
        if (kind === 'lose') sfx.calm();
        return overlay.subtitle(t(kind === 'win' ? 'cine.win' : 'cine.lose'));
      case 'lightsOut': return sfx.night();
      case 'liftoff': return sfx.rumble();
      case 'end': return;
    }
  }

  return {
    play(kind, state, win, onDone) {
      if (current) finish();
      world.setNight(false);
      world.setMarker(null);
      world.sync(state, 'none');
      world.view.reset();
      const cut = PLAYERS[kind](world.stage(), {
        calm: reduceMotion(),
        onBeat: (beat) => onBeat(kind, win, beat),
        onEnd: () => finish(),
      });
      current = { cut, done: onDone };
      overlay.show(finish);
      window.addEventListener('keydown', onKey, true);
      world.play(cut);
    },
    active: () => current !== null,
  };
}
