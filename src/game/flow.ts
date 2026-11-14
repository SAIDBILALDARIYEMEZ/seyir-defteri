// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Screen flow: pause, main menu missions (new / continue / code), night card, morning cards,
// replay, result, logbook and the info cards.

import { BALANCE } from '../config/balance.ts';
import { t } from '../i18n/i18n.ts';
import type { Action, StationId } from '../sim/actions.ts';
import { reduce } from '../sim/reducer.ts';
import { createRng } from '../sim/rng.ts';
import { check } from '../sim/rules.ts';
import { createInitialState } from '../sim/state.ts';
import type { GameState } from '../sim/state.ts';
import { clockOf } from '../sim/systems/time.ts';
import { clearSave, loadGame, saveGame } from '../save/save.ts';
import { dataSpec, infoSpec, pusulaSpec } from '../ui/cards.ts';
import { morningCards, nightSpec } from '../ui/dayCards.ts';
import type { GaugeId } from '../ui/hud.ts';
import { logbookSpec } from '../ui/logbook.ts';
import { resultSpec, resultTitle } from '../ui/result.ts';
import { CREW_ID } from './context.ts';
import type { Ctx, Mission } from './context.ts';
import type { Guide } from './guide.ts';

const REPLAY: Action = { type: 'replayYesterday', crewId: CREW_ID };

export function createFlow(ctx: Ctx, guide: () => Guide, goStation: (id: StationId) => void) {
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
  /** "Exit without saving": today's progress is dropped, the morning autosave stays. */
  const confirmExit = (): void => {
    const close = ctx.modal(() => ({
      title: t('pause.confirm.title'),
      lines: [t('pause.confirm.body')],
      buttons: [
        { label: t('pause.confirm.yes'), onClick: () => { close(); leave(); } },
        { label: t('pause.confirm.no'), onClick: () => close(), primary: true },
      ],
    }));
  };

  function pause(): void {
    if (s.mode !== 'play') return;
    if (s.closePause) return resume();
    const playing = s.state.phase === 'playing';
    s.closePause = ctx.modal(() => ({
      title: t('pause.title'),
      lines: [[t('code.label'), code()]],
      languagePicker: true,
      buttons: [
        { label: `📖 ${t('logbook.open')}`, onClick: showLogbook },
        { label: t('pause.exitNoSave'), onClick: () => (playing ? confirmExit() : leave()) },
        ...(playing ? [{ label: t('pause.saveExit'), onClick: () => { saveGame(s.state); leave(); } }] : []),
        { label: t('pause.resume'), onClick: resume, primary: true },
      ],
    }));
  }

  function showData(sol: number, upto: number, gained: number | null): void {
    const close = ctx.modal(() => dataSpec(s.win, { sol, upto, gained, close: () => close() }));
  }

  function showInfo(id: GaugeId): void {
    if (s.mode !== 'play') return;
    const close = ctx.modal(() => {
      const spec = infoSpec(id, s.win, () => close());
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
    const next = (): void => {
      const build = cards.shift();
      if (!build) return;
      const close = ctx.modal(() => build(() => { close(); next(); }));
    };
    next();
  }

  function showResult(): void {
    clearSave();
    world.setNight(false);
    const close = ctx.modal(() =>
      resultSpec(s.state, s.win, {
        code: code(),
        replay: replayButton(() => close()),
        onLogbook: showLogbook,
        onNewMission: () => { close(); startMission(missions.next()); },
        onMenu: () => { close(); showMenu(); },
      }),
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

  function continueMission(): void {
    const saved = loadGame();
    if (!saved) return ctx.render();
    ({ seed: s.seed, win: s.win } = missions.ofSave(saved.seed, saved.windowId));
    s.rng = createRng(s.seed);
    s.state = saved;
    enterPlay();
  }

  /** Asks first when starting `mission` would replace a saved mission. */
  function confirmReplace(mission: () => Mission): void {
    if (!loadGame()) return startMission(mission());
    const close = ctx.modal(() => ({
      title: t('menu.replace.title'),
      lines: [t('menu.replace.body')],
      buttons: [
        { label: t('menu.replace.yes'), onClick: () => { close(); startMission(mission()); } },
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
    newMission: () => confirmReplace(() => missions.next()),
    codeMission,
  };
}
