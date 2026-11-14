// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// All game sounds, synthesized with the Web Audio API: no audio files, so no asset licenses
// (F5a, adapted from the trial build). The AudioContext starts on the first user gesture
// (browser autoplay rule). Kid-safe: soft tones, the early-evacuation tune ends hopeful.

/** Sound design constants (volumes 0..1, frequencies in Hz, times in seconds). */
const SND = {
  master: 0.6,
  ambience: { gain: 0.05, cutoff: 380, lfoHz: 0.07, lfoDepth: 0.025 },
  storm: { gain: 0.22, center: 700, q: 0.6, lfoHz: 0.25, sweep: 350, fade: 1.5 },
  click: { freq: 880, len: 0.05, gain: 0.1 },
  done: { notes: [660, 880, 1320], step: 0.09, len: 0.18, gain: 0.18 },
  warn: { freq: 330, len: 0.16, gap: 0.22, gain: 0.18 },
  night: { from: 520, to: 130, len: 1.4, gain: 0.16 },
  alarm: { hi: 740, lo: 520, cycles: 3, step: 0.22, gain: 0.1 },
  build: { notes: [392, 523, 659, 784], step: 0.08, len: 0.14, gain: 0.14 },
  win: { notes: [523, 659, 784, 1047, 1319], step: 0.13, len: 0.4, gain: 0.2 },
  lose: { notes: [392, 330, 392, 523], step: 0.22, len: 0.45, gain: 0.16 },
} as const;

const STORAGE_KEY = 'seyir-defteri.sound';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let stormGain: GainNode | null = null;
let enabled = readEnabled();

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function noiseLoop(c: AudioContext): AudioBufferSourceNode {
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.start();
  return src;
}

function lfo(c: AudioContext, hz: number, depth: number, target: AudioParam): void {
  const osc = c.createOscillator();
  const amount = c.createGain();
  osc.frequency.value = hz;
  amount.gain.value = depth;
  osc.connect(amount).connect(target);
  osc.start();
}

/** A very quiet Mars wind, plus the storm wind loop (silent until a dust storm). */
function startLoops(c: AudioContext, out: GainNode): void {
  const a = SND.ambience;
  const amb = c.createBiquadFilter();
  amb.type = 'lowpass';
  amb.frequency.value = a.cutoff;
  const ambGain = c.createGain();
  ambGain.gain.value = a.gain;
  lfo(c, a.lfoHz, a.lfoDepth, ambGain.gain);
  noiseLoop(c).connect(amb).connect(ambGain).connect(out);
  const s = SND.storm;
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = s.center;
  band.Q.value = s.q;
  lfo(c, s.lfoHz, s.sweep, band.frequency);
  stormGain = c.createGain();
  stormGain.gain.value = 0;
  noiseLoop(c).connect(band).connect(stormGain).connect(out);
}

/** Call from a user gesture; safe to call many times. */
export function unlockAudio(): void {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = enabled ? SND.master : 0;
  master.connect(ctx.destination);
  startLoops(ctx, master);
}

export const soundEnabled = (): boolean => enabled;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
  if (ctx && master) master.gain.setTargetAtTime(on ? SND.master : 0, ctx.currentTime, 0.05);
}

/** The storm wind fades in while a dust storm is on. */
export function setStormSound(on: boolean): void {
  if (!ctx || !stormGain) return;
  stormGain.gain.setTargetAtTime(on ? SND.storm.gain : 0, ctx.currentTime, SND.storm.fade / 3);
}

function tone(freq: number, start: number, len: number, gain: number, type: OscillatorType = 'sine', toFreq?: number): void {
  if (!ctx || !master || !enabled) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (toFreq) osc.frequency.exponentialRampToValueAtTime(toFreq, t0 + len);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + len + 0.05);
}

const melody = (m: { notes: readonly number[]; step: number; len: number; gain: number }, type: OscillatorType = 'sine'): void =>
  m.notes.forEach((f, i) => tone(f, i * m.step, m.len, m.gain, type));

export const sfx = {
  click: (): void => tone(SND.click.freq, 0, SND.click.len, SND.click.gain, 'triangle'),
  done: (): void => melody(SND.done, 'triangle'),
  build: (): void => melody(SND.build, 'triangle'),
  warn: (): void => {
    const w = SND.warn;
    tone(w.freq, 0, w.len, w.gain, 'square');
    tone(w.freq, w.gap, w.len, w.gain, 'square');
  },
  night: (): void => tone(SND.night.from, 0, SND.night.len, SND.night.gain, 'sine', SND.night.to),
  alarm: (): void => {
    const a = SND.alarm;
    for (let i = 0; i < a.cycles * 2; i++) tone(i % 2 ? a.lo : a.hi, i * a.step, a.step * 0.9, a.gain, 'sawtooth');
  },
  win: (): void => melody(SND.win, 'triangle'),
  lose: (): void => melody(SND.lose),
};
