// Mimi's voice: short recorded clips (meow, purr) played through Web Audio so taps feel instant.
// Browsers only allow audio after a user gesture, so the audio context is created and
// "unlocked" on the very first touch, click or key press anywhere. If Web Audio still isn't
// running (some phones), clips fall back to a plain <audio> element.
// Note: on iPhone, the ring/silent switch mutes web sounds.

const CLIPS = {
  meow: new URL("../../assets/sounds/meow.m4a", import.meta.url),
  purr: new URL("../../assets/sounds/purr.m4a", import.meta.url),
};
const FADE_S = 0.04;

let ctx = null;
const bytes = {};
const buffers = {};
let current = null;

function context() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  return ctx;
}

// Runs inside the first user gesture: starts the context and plays one silent frame,
// which is what older iOS versions need to allow sound later.
function unlock() {
  const ac = context();
  if (!ac) return;
  try {
    const source = ac.createBufferSource();
    source.buffer = ac.createBuffer(1, 1, 22050);
    source.connect(ac.destination);
    source.start(0);
  } catch {}
  for (const type of ["pointerdown", "touchend", "keydown"]) removeEventListener(type, unlock, true);
}

export function preloadSound() {
  for (const [name, url] of Object.entries(CLIPS)) {
    bytes[name] ??= fetch(url).then((r) => r.arrayBuffer()).catch(() => (bytes[name] = null));
  }
  for (const type of ["pointerdown", "touchend", "keydown"]) addEventListener(type, unlock, { capture: true, passive: true });
}

async function decoded(ac, name) {
  if (buffers[name]) return buffers[name];
  preloadSound();
  const data = await bytes[name];
  if (!data) return null;
  buffers[name] = await ac.decodeAudioData(data.slice(0));
  return buffers[name];
}

// A new sound cuts the previous one with a short fade so taps never pile up.
function stopCurrent() {
  if (!current) return;
  current.stop();
  current = null;
}

function playWithElement(name, rate, volume) {
  const audio = new Audio(CLIPS[name]);
  audio.volume = Math.min(1, volume);
  audio.playbackRate = rate;
  audio.preservesPitch = false;
  audio.play().catch(() => {});
  return { stop: () => audio.pause() };
}

// rate < 1 sounds lower and sleepier; > 1 sounds smaller and brighter.
async function play(name, { rate = 0.94 + Math.random() * 0.14, volume = 0.9 } = {}) {
  stopCurrent();
  const ac = context();
  if (!ac) {
    current = playWithElement(name, rate, volume);
    return;
  }
  try {
    const clip = await decoded(ac, name);
    if (ac.state !== "running") await Promise.race([ac.resume(), new Promise((r) => setTimeout(r, 300))]);
    if (!clip || ac.state !== "running") throw new Error("web audio unavailable");
    const source = ac.createBufferSource();
    source.buffer = clip;
    source.playbackRate.value = rate;
    const gain = ac.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(ac.destination);
    source.start();
    const playing = {
      stop() {
        gain.gain.setTargetAtTime(0, ac.currentTime, FADE_S / 3);
        source.stop(ac.currentTime + FADE_S);
      },
    };
    current = playing;
    source.onended = () => {
      if (current === playing) current = null;
    };
  } catch {
    current = playWithElement(name, rate, volume);
  }
}

export const meow = (options) => play("meow", options);
export const purr = (options) => play("purr", options);
