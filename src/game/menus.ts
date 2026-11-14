// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Main-menu cards (F5b): saved games (load / delete, asks first), Info & Sources, Settings.

import { setSoundEnabled, soundEnabled } from '../audio/sound.ts';
import { t } from '../i18n/i18n.ts';
import { reduceMotion, setReduceMotion } from '../lib/motion.ts';
import { deleteSave, listSaves } from '../save/save.ts';
import { infoSpec, savesSpec, settingsSpec } from '../ui/menuCards.ts';
import type { Ctx } from './context.ts';

interface MenuHooks {
  continueMission(id?: string): void;
  confirmReset(): void;
}

export function createMenuCards(ctx: Ctx, { continueMission, confirmReset }: MenuHooks) {
  function showSaves(): void {
    let close = (): void => undefined;
    const reopen = (): void => { close(); showSaves(); };
    close = ctx.modal(() =>
      savesSpec({
        saves: listSaves(),
        codeOf: (save) => ctx.missions.codeOf(save.seed, save.windowId),
        onLoad: (id) => { close(); continueMission(id); },
        onDelete: (id) => {
          const sol = listSaves().find((x) => x.id === id)?.sol ?? 1;
          const closeAsk = ctx.modal(() => ({
            title: t('saves.confirm.title'),
            lines: [t('saves.confirm.body', { n: sol })],
            buttons: [
              { label: t('saves.confirm.yes'), onClick: () => { closeAsk(); deleteSave(id); reopen(); }, danger: true },
              { label: t('pause.confirm.no'), onClick: () => closeAsk(), primary: true },
            ],
          }));
        },
        close: () => close(),
      }),
    );
  }

  function showInfoScreen(): void {
    const close = ctx.modal(() => infoSpec(() => close()));
  }

  function showSettings(): void {
    let close = (): void => undefined;
    close = ctx.modal(() =>
      settingsSpec({
        sound: soundEnabled(),
        onSound: () => { setSoundEnabled(!soundEnabled()); close(); showSettings(); },
        motion: reduceMotion(),
        onMotion: () => { setReduceMotion(!reduceMotion()); close(); showSettings(); },
        onReset: confirmReset,
        close: () => close(),
      }),
    );
  }

  return { showSaves, showInfoScreen, showSettings };
}
