/**
 * All sound is synthesized with the Web Audio API — no audio assets shipped.
 * Nothing here may auto-start: ensureAudio() must be called from a user
 * gesture the first time (browser autoplay policy), and every caller treats
 * a missing/suspended context as "stay silent".
 */

type Ambience = 'off' | 'birds' | 'stream' | 'rain';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let volume = 0.6;

/** Master volume, 0–1. Applies now if audio is live, or at first unlock. */
export function setMasterVolume(v: number): void {
  volume = Math.min(1, Math.max(0, v));
  master?.gain.setTargetAtTime(volume, ctx!.currentTime, 0.05);
}

export function ensureAudio(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** True once a user gesture has unlocked audio. */
export const audioRunning = () => ctx?.state === 'running';

function noise(loop = false): AudioBufferSourceNode {
  const s = ctx!.createBufferSource();
  s.buffer = noiseBuf!;
  s.loop = loop;
  return s;
}

/** One soft typewriter key press. */
export function typeClick(): void {
  if (!audioRunning()) return;
  const t = ctx!.currentTime;
  const src = noise();
  src.playbackRate.value = 0.85 + Math.random() * 0.3;
  const hp = ctx!.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2200;
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.09, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  src.connect(hp).connect(g).connect(master!);
  src.start(t);
  src.stop(t + 0.04);
}

/** A soft page-turn: a band-swept breath of noise. */
export function pageTurn(): void {
  if (!audioRunning()) return;
  const t = ctx!.currentTime;
  const src = noise();
  const bp = ctx!.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(350, t);
  bp.frequency.exponentialRampToValueAtTime(1900, t + 0.28);
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  src.connect(bp).connect(g).connect(master!);
  src.start(t);
  src.stop(t + 0.45);
}

interface AmbienceHandle {
  gain: GainNode;
  sources: AudioBufferSourceNode[];
  timers: ReturnType<typeof setTimeout>[];
}

let current: AmbienceHandle | null = null;

function fadeOut(h: AmbienceHandle): void {
  const t = ctx!.currentTime;
  h.timers.forEach(clearTimeout);
  h.gain.gain.cancelScheduledValues(t);
  h.gain.gain.setValueAtTime(h.gain.gain.value, t);
  h.gain.gain.linearRampToValueAtTime(0.0001, t + 1);
  const { sources, gain } = h;
  setTimeout(() => {
    sources.forEach((s) => s.stop());
    gain.disconnect();
  }, 1200);
}

function newHandle(): AmbienceHandle {
  const gain = ctx!.createGain();
  gain.gain.value = 0.0001;
  gain.gain.linearRampToValueAtTime(1, ctx!.currentTime + 1.5);
  gain.connect(master!);
  return { gain, sources: [], timers: [] };
}

/** Rolling water: two layers of slowly-modulated filtered noise. */
function startStream(h: AmbienceHandle): void {
  const bed = noise(true);
  const lp = ctx!.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 450;
  const lfo = ctx!.createOscillator();
  lfo.frequency.value = 0.11;
  const lfoGain = ctx!.createGain();
  lfoGain.gain.value = 160;
  lfo.connect(lfoGain).connect(lp.frequency);
  const bedGain = ctx!.createGain();
  bedGain.gain.value = 0.14;
  bed.connect(lp).connect(bedGain).connect(h.gain);

  const sparkle = noise(true);
  const bp = ctx!.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 950;
  bp.Q.value = 1.2;
  const lfo2 = ctx!.createOscillator();
  lfo2.frequency.value = 0.43;
  const lfo2Gain = ctx!.createGain();
  lfo2Gain.gain.value = 350;
  lfo2.connect(lfo2Gain).connect(bp.frequency);
  const sparkleGain = ctx!.createGain();
  sparkleGain.gain.value = 0.035;
  sparkle.connect(bp).connect(sparkleGain).connect(h.gain);

  bed.start();
  sparkle.start();
  lfo.start();
  lfo2.start();
  h.sources.push(bed, sparkle);
}

/** Steady rain hiss with occasional soft droplets. */
function startRain(h: AmbienceHandle): void {
  const hiss = noise(true);
  const lp = ctx!.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 4200;
  const hp = ctx!.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 400;
  const g = ctx!.createGain();
  g.gain.value = 0.05;
  hiss.connect(hp).connect(lp).connect(g).connect(h.gain);
  hiss.start();
  h.sources.push(hiss);

  const droplet = () => {
    if (current !== h || !audioRunning()) return;
    const t = ctx!.currentTime;
    const o = ctx!.createOscillator();
    o.frequency.setValueAtTime(900 + Math.random() * 600, t);
    o.frequency.exponentialRampToValueAtTime(350, t + 0.05);
    const og = ctx!.createGain();
    og.gain.setValueAtTime(0.02, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(og).connect(h.gain);
    o.start(t);
    o.stop(t + 0.07);
    h.timers.push(setTimeout(droplet, 250 + Math.random() * 1200));
  };
  h.timers.push(setTimeout(droplet, 600));
}

/** Sparse songbirds: FM chirps drifting across the stereo field. */
function startBirds(h: AmbienceHandle): void {
  const sing = () => {
    if (current !== h || !audioRunning()) return;
    const pan = ctx!.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(h.gain);
    const syllables = 2 + Math.floor(Math.random() * 3);
    let t = ctx!.currentTime + 0.05;
    for (let i = 0; i < syllables; i++) {
      const f0 = 2400 + Math.random() * 1800;
      const dur = 0.06 + Math.random() * 0.09;
      const o = ctx!.createOscillator();
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(
        f0 * (0.7 + Math.random() * 0.7),
        t + dur
      );
      const og = ctx!.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.028, t + 0.015);
      og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(og).connect(pan);
      o.start(t);
      o.stop(t + dur + 0.02);
      t += dur + 0.03 + Math.random() * 0.07;
    }
    h.timers.push(setTimeout(sing, 1800 + Math.random() * 6500));
  };
  h.timers.push(setTimeout(sing, 400));
}

export function setAmbience(kind: Ambience): void {
  if (current) {
    fadeOut(current);
    current = null;
  }
  if (kind === 'off') return;
  ensureAudio();
  const h = newHandle();
  current = h;
  if (kind === 'stream') startStream(h);
  else if (kind === 'rain') startRain(h);
  else startBirds(h);
}
