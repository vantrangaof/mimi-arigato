// Mimi's music: little chiptune songs played with Web Audio (no files), used by the alarm
// and the games. A song is a grid of eighth notes: "C5" plays a note, "." holds the one
// before, "-" is a rest. Also plays Mimi's real meows on repeat, or a song file you picked.

import { context, meow } from "./sound.js";

const INSTRUMENTS = {
  // bright square wave, like an old handheld
  chip: { wave: "square", gain: 0.09, attack: 0.005, decay: 0.08, sustain: 0.55, release: 0.06 },
  // a music box: a triangle with a quiet ping an octave up, always ringing out
  box: { wave: "triangle", gain: 0.22, attack: 0.003, ring: 1.1, ping: 0.35 },
  // soft and round
  soft: { wave: "triangle", gain: 0.2, attack: 0.03, decay: 0.2, sustain: 0.7, release: 0.18 },
  bass: { wave: "triangle", gain: 0.16, attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.08 },
};

export const SONGS = [
  {
    id: "morning",
    label: "Morning meow",
    about: "bright and bouncy",
    bpm: 132,
    lead: "chip",
    notes: "C5 E5 G5 E5 C6 . G5 . A5 G5 E5 C5 D5 . . - C5 E5 G5 E5 C6 . B5 A5 G5 E5 D5 E5 C5 . . -",
    bass: "C3 . . . C3 . . . F3 . . . G3 . . . C3 . . . A2 . . . G2 . . . C3 . . .",
  },
  {
    id: "musicbox",
    label: "Music box",
    about: "gentle, for slow mornings",
    bpm: 92,
    lead: "box",
    notes: "E5 G5 C6 B5 A5 G5 E5 . F5 A5 G5 E5 D5 . . . E5 G5 C6 B5 A5 G5 A5 B5 C6 G5 E5 D5 C5 . . .",
  },
  {
    id: "sunbeam",
    label: "Sunbeam waltz",
    about: "a sleepy cat dance",
    bpm: 150,
    lead: "soft",
    notes: "G4 C5 E5 G5 . E5 F5 E5 D5 C5 . . A4 D5 F5 A5 . G5 F5 E5 D5 E5 . . G4 C5 E5 G5 . C6 B5 A5 G5 C6 . . - - -",
    bass: "C3 . . C3 . . G2 . . C3 . . F3 . . D3 . . G2 . . C3 . . C3 . . A2 . . G2 . . C3 . . . . .",
  },
  { id: "meows", label: "Mimi's meows", about: "the real recording, again and again", clip: true },
];

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function frequency(note) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!m) return null;
  const midi = (Number(m[3]) + 1) * 12 + SEMITONES[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

// "C5 . E5 -" → [{ note, at (steps), len (steps) }]
function parse(grid) {
  const tokens = grid.trim().split(/\s+/);
  const out = [];
  tokens.forEach((t, i) => {
    if (t === ".") {
      if (out.length && out[out.length - 1].at + out[out.length - 1].len === i) out[out.length - 1].len += 1;
    }
    else if (t !== "-") out.push({ note: t, at: i, len: 1 });
  });
  return { notes: out, steps: tokens.length };
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

function playSynth(song, { loop, volume }) {
  const ac = context();
  if (!ac) return null;
  running(ac);
  const master = ac.createGain();
  master.gain.value = volume;
  master.connect(ac.destination);
  const step = 60 / song.bpm / 2;
  const tracks = [[parse(song.notes), INSTRUMENTS[song.lead]], ...(song.bass ? [[parse(song.bass), INSTRUMENTS.bass]] : [])];
  const length = Math.max(...tracks.map(([t]) => t.steps)) * step;
  let oscs = [];
  let timer;
  let stopped = false;

  const schedule = (start) => {
    oscs = oscs.filter((o) => o.stopAt > ac.currentTime);
    for (const [track, inst] of tracks) {
      for (const n of track.notes) {
        const made = voice(ac, master, frequency(n.note), start + n.at * step, n.len * step * 0.92, inst);
        for (const o of made) o.stopAt = start + length + 2;
        oscs.push(...made);
      }
    }
    // Queue the next round a little before this one ends so there's no gap.
    if (loop) timer = setTimeout(() => !stopped && schedule(start + length), Math.max(0, (start + length - ac.currentTime - 0.4) * 1000));
  };
  schedule(ac.currentTime + 0.05);

  return {
    setVolume(v) {
      master.gain.setTargetAtTime(v, ac.currentTime, 0.3);
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      master.gain.setTargetAtTime(0, ac.currentTime, 0.03);
      const now = ac.currentTime + 0.15;
      for (const o of oscs) try { o.stop(now); } catch {}
      setTimeout(() => master.disconnect(), 300);
    },
  };
}

function playMeows({ loop, volume }) {
  let v = volume;
  let timer;
  const once = () => {
    meow({ volume: Math.min(1, v + 0.1), rate: 0.95 + Math.random() * 0.15 });
    if (loop) timer = setTimeout(once, 1600 + Math.random() * 900);
  };
  once();
  return {
    setVolume: (next) => { v = next; },
    stop: () => clearTimeout(timer),
  };
}

// A song file you picked (an object URL), looped.
function playFile(url, { loop, volume }) {
  const audio = new Audio(url);
  audio.loop = loop;
  audio.volume = Math.min(1, volume);
  audio.play().catch(() => {});
  return {
    setVolume: (v) => { audio.volume = Math.min(1, Math.max(0, v)); },
    stop: () => audio.pause(),
  };
}

// Starts a song; returns { setVolume(0..1), stop() }. id: a SONGS id, or "own" with fileURL.
// Only one song plays at a time.
let current = null;
export function playSong(id, { loop = false, volume = 0.8, fileURL = null } = {}) {
  stopSong();
  const song = SONGS.find((s) => s.id === id) ?? SONGS[0];
  const player = id === "own" && fileURL ? playFile(fileURL, { loop, volume })
    : song.clip ? playMeows({ loop, volume })
    : playSynth(song, { loop, volume });
  if (!player) return { setVolume() {}, stop() {} };
  const handle = {
    ...player,
    stop() {
      player.stop();
      if (current === handle) current = null;
    },
  };
  current = handle;
  return handle;
}

export function stopSong() {
  current?.stop();
}
