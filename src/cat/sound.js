// Mimi's voice: short recorded clips (meow, purr) played through Web Audio so taps feel instant.
// Clips are fetched early and decoded on the first tap, when browsers allow audio.

const CLIPS = {
  meow: new URL("../../assets/sounds/meow.m4a", import.meta.url),
  purr: new URL("../../assets/sounds/purr.m4a", import.meta.url),
};
const FADE_S = 0.04;

let ctx;
const bytes = {};
const buffers = {};
let current;

function context() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function preloadSound() {
  for (const [name, url] of Object.entries(CLIPS)) {
    bytes[name] ??= fetch(url).then((r) => r.arrayBuffer()).catch(() => (bytes[name] = null));
  }
}

async function decoded(name) {
  if (buffers[name]) return buffers[name];
  preloadSound();
  const data = await bytes[name];
  if (!data) return null;
  buffers[name] = await context().decodeAudioData(data.slice(0));
  return buffers[name];
}

// A new sound cuts the previous one with a short fade so taps never pile up.
function stopCurrent(ac) {
  if (!current) return;
  current.gain.gain.setTargetAtTime(0, ac.currentTime, FADE_S / 3);
  current.source.stop(ac.currentTime + FADE_S);
  current = null;
}

// rate < 1 sounds lower and sleepier; > 1 sounds smaller and brighter.
async function play(name, { rate = 0.94 + Math.random() * 0.14, volume = 0.9 } = {}) {
  try {
    const ac = context();
    const clip = await decoded(name);
    if (!clip) return;
    stopCurrent(ac);
    const source = ac.createBufferSource();
    source.buffer = clip;
    source.playbackRate.value = rate;
    const gain = ac.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(ac.destination);
    source.start();
    current = { source, gain };
    source.onended = () => {
      if (current?.source === source) current = null;
    };
  } catch {}
}

export const meow = (options) => play("meow", options);
export const purr = (options) => play("purr", options);
