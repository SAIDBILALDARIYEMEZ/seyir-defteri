// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Screen flow: pause, main menu missions (new / continue / code), night card, morning cards,
// replay, result, logbook and the info cards.

import { setSoundEnabled, soundEnabled } from '../audio/sound.ts';
import { BALANCE } from '../config/balance.ts';
import { t } from '../i18n/i18n.ts';
import type { Action, StationId } from '../sim/actions.ts';
import { reduce } from '../sim/reducer.ts';
import { createRng } from '../sim/rng.ts';
import { check } from '../sim/rules.ts';
import { createInitialState } from '../sim/state.ts';
import type { GameState } from '../sim/state.ts';
import { clockOf } from '../sim/systems/time.ts';
import { clearSave, loadGame, saveGame, saveIdOf } from '../save/save.ts';
import { dataSpec, infoSpec, pusulaSpec } from '../ui/cards.ts';
import { morningCards, nightSpec } from '../ui/dayCards.ts';
import type { GaugeId } from '../ui/hud.ts';
import { logbookSpec } from '../ui/logbook.ts';
import { resultSpec, resultTitle } from '../ui/result.ts';
import { hazardTable, pickStormSpec } from '../ui/learn.ts';
import { stormSpec } from '../ui/storm.ts';
import { createMenuCards } from './menus.ts';
import { languagePicker } from '../ui/overlays.ts';
import { showToast } from '../ui/toast.ts';
import { CREW_ID } from './context.ts';
import type { Ctx, Mission } from './context.ts';
import type { Guide } from './guide.ts';
import type { Learn } from './learn.ts';

const REPLAY: Action = { type: 'replayYesterday', crewId: CREW_ID };

export function createFlow(ctx: Ctx, guide: () => Guide, goStation: (id: StationId) => void, learn: Learn) {
  const { s, world, menu, missions } = ctx;
  const code = (): string => missions.codeOf(s.seed, s.win.id);

  const resume = (): void => {
    s.closePause?.();
    s.closePause = null;
  };
  const leave = (): void => {
    resume();
    showMenu();
  };
  /** Today's work is dropped: the save goes back to this morning (the autosave kept it). */
  const saveMorning = (): void => {
    const morning = s.state.mornings.at(-1);
    if (morning) saveGame({ ...structuredClone(morning), mornings: s.state.mornings });
  };
  /** Main menu from the pause menu: asks whether to keep today's work (F5b). */
  const askSave = (): void => {
    const close = ctx.modal(() => ({
      title: t('pause.ask.title'),
      lines: [t('pause.ask.body')],
      buttons: [
        { label: `💾 ${t('pause.ask.yes')}`, onClick: () => { close(); ctx.save(); leave(); }, primary: true },
        { label: t('pause.ask.no'), onClick: () => { close(); saveMorning(); leave(); } },
        { label: t('pause.confirm.no'), onClick: () => close() },
      ],
    }));
  };

  /** Settings: wipe XP, rank, concept counters and the storm picker (asks first). */
  const confirmReset = (): void => {
    const close = ctx.modal(() => ({
      title: t('reset.title'),
      lines: [t('reset.body')],
      buttons: [
        { label: t('reset.yes'), onClick: () => { close(); learn.reset(); } },
        { label: t('pause.confirm.no'), onClick: () => close(), primary: true },
      ],
    }));
  };

  const soundButton = (redraw: () => void) => ({
    label: `${soundEnabled() ? '🔊' : '🔇'} ${t(soundEnabled() ? 'pause.soundOn' : 'pause.soundOff')}`,
    onClick: () => {
      setSoundEnabled(!soundEnabled());
      redraw();
    },
  });

  /** F5b: one tidy list. Continue on top, Reset progress apart at the bottom. */
  function pause(): void {
    if (s.mode !== 'play') return;
    if (s.closePause) return resume();
    const playing = s.state.phase === 'playing';
    s.closePause = ctx.modal(() => ({
      kind: 'menu-list pause',
      title: t('pause.title'),
      lines: [[t('code.label'), code()]],
      buttons: [
        { label: `▶️ ${t('pause.resume')}`, onClick: resume, primary: true },
        ...(playing ? [{ label: `💾 ${t('pause.save')}`, onClick: () => { if (ctx.save()) showToast(ctx.ui, t('save.done')); } }] : []),
        { label: `📖 ${t('logbook.open')}`, onClick: showLogbook },
        soundButton(() => { resume(); pause(); }),
        { node: languagePicker },
        { label: `🏠 ${t('pause.mainMenu')}`, onClick: () => (playing ? askSave() : leave()) },
        { label: `♻️ ${t('pause.reset')}`, onClick: confirmReset, danger: true },
      ],
    }));
  }

  function showData(sol: number, upto: number, gained: number | null): void {
    const close = ctx.modal(() => dataSpec(s.win, { sol, upto, gained, close: () => close() }));
  }

  function showInfo(id: GaugeId): void {
    if (s.mode !== 'play') return;
    const close = ctx.modal(() => {
      const spec = { ...infoSpec(id, s.win, () => close()), extra: hazardTable };
      const measured = Math.floor(clockOf(s.state) - BALANCE.dayStartHour);
      if (id === 'dose') spec.buttons.unshift({ label: t('data.button'), onClick: () => showData(s.state.sol, measured, null) });
      return spec;
    });
  }

  function showPusula(): void {
    if (!ctx.free()) return;
    const close = ctx.modal(() => {
      const g = guide();
      const task = g.stepType || !g.tasks[0] ? g.text : `${t('pusula.next')} ${g.tasks[0].label}. ${g.text}`;
      const onGo = (): void => (g.card ? ctx.placement.select(g.card) : goStation(g.station));
      return pusulaSpec(s.state, s.win, { task, onGo, close: () => close() });
    });
  }

  function showNight(before: GameState): void {
    const log = s.state.log[s.state.log.length - 1];
    if (log) s.frozen = { ...before, ...log.dusk, hoursLeft: 0, science: log.science };
    world.setNight(true);
    const close = ctx.modal(() =>
      nightSpec(before, s.state, s.win, {
        onMorning: () => {
          s.frozen = null;
          close();
          morning(before);
        },
        onData: (sol, gained) => showData(sol, BALANCE.hoursPerSol, gained),
        replay: replayButton(() => close()),
      }),
    );
  }

  /** "Replay yesterday" (PRD §12): same seed, same events, back to the previous morning. */
  function replayButton(closeCard: () => void): { label: string; onClick: () => void } | null {
    if (check(s.state, REPLAY, s.win)) return null;
    return {
      label: `⏪ ${t('replay.button', { n: s.state.replaysLeft })}`,
      onClick: () => {
        closeCard();
        s.state = reduce(s.state, REPLAY, s.rng, s.win);
        saveGame(s.state);
        enterPlay();
        const close = ctx.modal(() => ({
          kind: 'event',
          title: `⏪ ${t('replay.title', { n: s.state.sol })}`,
          lines: [t('replay.body'), t('replay.left', { n: s.state.replaysLeft })],
          buttons: [{ label: t('event.ok'), onClick: () => close(), primary: true }],
        }));
      },
    };
  }

  function showLogbook(): void {
    const result = s.state.phase === 'playing' ? '' : resultTitle(s.state);
    const close = ctx.modal(() => logbookSpec(s.state, s.win, { result, code: code() }, () => close()));
  }

  function morning(before: GameState): void {
    world.setNight(false);
    if (s.state.phase !== 'playing') return showResult();
    saveGame(s.state);
    world.placeAda('habitat');
    ctx.render(true);
    const cards = morningCards(before, s.state, s.win, (sol, gained) => showData(sol, BALANCE.hoursPerSol, gained));
    const capsule = learn.nightCard();
    if (capsule) cards.push(capsule);
    const next = (): void => {
      const build = cards.shift();
      if (!build) return;
      const close = ctx.modal(() => build(() => { close(); next(); }));
    };
    next();
  }

  function showResult(): void {
    clearSave(s.state);
    world.setNight(false);
    const progress = learn.finish(s.state);
    const close = ctx.modal(() =>
      resultSpec(s.state, s.win, {
        code: code(),
        progress,
        replay: replayButton(() => close()),
        onLogbook: showLogbook,
        onNewMission: () => { close(); newMission(); },
        onMenu: () => { close(); showMenu(); },
      }),
    );
    // On top of the result: the window's biggest real storm.
    const closeStorm = ctx.modal(() => stormSpec(s.state, s.win, () => closeStorm()));
  }

  /** After the first win the player picks the real month (window); before that, as always. */
  function newMission(): void {
    if (!learn.canPickStorm()) return confirmReplace(() => missions.next());
    const close = ctx.modal(() =>
      pickStormSpec(missions.windows(), (win) => confirmReplace(() => missions.pick(win)), () => close()),
    );
  }

  /** Puts the scene and the UI at the current state (new mission, Continue, replay). */
  function enterPlay(): void {
    s.frozen = null;
    s.mode = 'play';
    s.walking = false;
    s.openStation = null;
    menu.close();
    ctx.placement.cancel();
    world.setNight(false);
    world.sync(s.state, 'none');
    world.placeAda(s.state.crew[CREW_ID]?.location ?? 'habitat');
    ctx.render(true);
  }

  function continueMission(id?: string): void {
    const saved = loadGame(id);
    if (!saved) return ctx.render();
    ({ seed: s.seed, win: s.win } = missions.ofSave(saved.seed, saved.windowId));
    s.rng = createRng(s.seed);
    s.state = saved;
    learn.start(s.seed);
    enterPlay();
  }

  /** Asks first when starting `mission` would replace the save of that same mission. */
  function confirmReplace(pick: () => Mission): void {
    const mission = pick();
    if (!loadGame(saveIdOf({ seed: mission.seed, windowId: mission.win.id }))) return startMission(mission);
    const close = ctx.modal(() => ({
      title: t('menu.replace.title'),
      lines: [t('menu.replace.body')],
      buttons: [
        { label: t('menu.replace.yes'), onClick: () => { close(); startMission(mission); } },
        { label: t('pause.confirm.no'), onClick: () => close(), primary: true },
      ],
    }));
  }

  /** Mission code from the main menu: false when the code is not valid. */
  function codeMission(text: string): boolean {
    const mission = missions.fromCode(text);
    if (mission) confirmReplace(() => mission);
    return mission !== null;
  }

  function startMission(mission: Mission): void {
    ({ seed: s.seed, win: s.win } = mission);
    s.rng = createRng(s.seed);
    s.state = createInitialState(s.seed, s.win);
    saveGame(s.state);
    learn.start(s.seed);
    enterPlay();
    const close = ctx.modal(() => ({
      kind: 'event',
      title: `🧭 ${t('tutorial.welcome.title')}`,
      lines: [t('tutorial.welcome1'), t('tutorial.welcome2')],
      buttons: [{ label: t('event.ok'), onClick: () => close(), primary: true }],
    }));
  }

  function showMenu(): void {
    s.mode = 'menu';
    menu.close();
    ctx.placement.cancel();
    ctx.render();
  }

  return {
    pause,
    showInfo,
    showPusula,
    showNight,
    showResult,
    continueMission,
    newMission,
    ...createMenuCards(ctx, { continueMission, confirmReset }),
    codeMission,
  };
}
