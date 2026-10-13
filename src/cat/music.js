// Mimi's music for the games: single notes and little jingles played with Web Audio (no files).

import { context } from "./sound.js";

const INSTRUMENTS = {
  // bright square wave, like an old handheld
  chip: { wave: "square", gain: 0.09, attack: 0.005, decay: 0.08, sustain: 0.55, release: 0.06 },
  // a music box: a triangle with a quiet ping an octave up, always ringing out
  box: { wave: "triangle", gain: 0.22, attack: 0.003, ring: 1.1, ping: 0.35 },
  // soft and round
  soft: { wave: "triangle", gain: 0.2, attack: 0.03, decay: 0.2, sustain: 0.7, release: 0.18 },
};

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function frequency(note) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!m) return null;
  const midi = (Number(m[3]) + 1) * 12 + SEMITONES[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

// Plays one note into `out` at time `t`; returns the oscillators so they can be stopped early.
function voice(ac, out, freq, t, dur, inst, volume = 1) {
  const oscs = [];
  const make = (f, wave, level, end) => {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = wave;
    osc.frequency.value = f;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(level, t + inst.attack);
    if (inst.ring) env.gain.exponentialRampToValueAtTime(0.0001, end);
    else {
      env.gain.setTargetAtTime(level * inst.sustain, t + inst.attack, inst.decay / 3);
      env.gain.setValueAtTime(level * inst.sustain, Math.max(t + inst.attack, t + dur - 0.01));
      env.gain.linearRampToValueAtTime(0, end);
    }
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(end + 0.02);
    oscs.push(osc);
  };
  const level = inst.gain * volume;
  const end = inst.ring ? t + Math.max(dur, inst.ring) : t + dur + inst.release;
  make(freq, inst.wave, level, end);
  if (inst.ping) make(freq * 2, "sine", level * inst.ping, t + inst.ring * 0.6);
  return oscs;
}

function running(ac) {
  if (ac.state !== "running") ac.resume().catch(() => {});
}

// One note (the games' paw buttons). note: "C5"…
export function playNote(note, { dur = 0.3, instrument = "chip", volume = 1 } = {}) {
  const ac = context();
  const freq = frequency(note);
  if (!ac || !freq) return;
  running(ac);
  voice(ac, ac.destination, freq, ac.currentTime + 0.01, dur, INSTRUMENTS[instrument], volume);
}

// A tiny jingle for game wins and misses.
export function jingle(kind = "win") {
  const notes = kind === "win" ? ["C5", "E5", "G5", "C6"] : ["E5", "C5"];
  const ac = context();
  if (!ac) return;
  running(ac);
  notes.forEach((n, i) => voice(ac, ac.destination, frequency(n), ac.currentTime + 0.02 + i * 0.1, 0.12, INSTRUMENTS.chip, 0.8));
}

// Sound effects for the catch game: "boing" (spooked), "splash" (rain), "blep" (a sock),
// "sparkle" (zoomies).
export function sfx(kind) {
  const ac = context();
  if (!ac) return;
  running(ac);
  const t = ac.currentTime + 0.01;
  if (kind === "boing") {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.4);
    env.gain.setValueAtTime(0.25, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(env).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  }
  else if (kind === "splash") {
    const len = Math.floor(ac.sampleRate * 0.35);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const noise = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const env = ac.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    env.gain.value = 0.35;
    noise.connect(filter).connect(env).connect(ac.destination);
    noise.start(t);
  }
  else if (kind === "blep") {
    ["A3", "E3"].forEach((n, i) => voice(ac, ac.destination, frequency(n), t + i * 0.09, 0.08, INSTRUMENTS.chip, 1));
  }
  else if (kind === "sparkle") {
    ["C6", "E6", "G6", "C7"].forEach((n, i) => voice(ac, ac.destination, frequency(n), t + i * 0.05, 0.06, INSTRUMENTS.box, 0.6));
  }
}
