// Meows synthesized with Web Audio: a buzzy voice shaped by two moving formants ("m-e-ow").

let ctx;

function audio() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

const rand = (min, max) => min + Math.random() * (max - min);

// Schedules one meow on any AudioContext (live or offline) and returns its duration.
export function scheduleMeow(ac, { pitch = 1, length = 1, trill = false, sleepy = false } = {}, when = ac.currentTime) {
  const t = when;
  const dur = 0.42 * length * (sleepy ? 1.35 : 1);
  const base = 560 * pitch * (sleepy ? 0.78 : 1);
  const peak = sleepy ? 0.25 : 0.35;

  const voice = ac.createOscillator();
  voice.type = "sawtooth";
  voice.frequency.setValueAtTime(base * 0.8, t);
  voice.frequency.linearRampToValueAtTime(base * 1.3, t + dur * 0.35);
  voice.frequency.linearRampToValueAtTime(base * 0.85, t + dur);

  const vibrato = ac.createOscillator();
  vibrato.frequency.value = 6;
  const vibratoDepth = ac.createGain();
  vibratoDepth.gain.value = base * 0.02;
  vibrato.connect(vibratoDepth).connect(voice.frequency);

  // Formants open from a nasal "m" to a bright "e" then round into "ow".
  const formant = (q, gain, from, mid, to) => {
    const f = ac.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.linearRampToValueAtTime(mid, t + dur * 0.35);
    f.frequency.linearRampToValueAtTime(to, t + dur);
    const g = ac.createGain();
    g.gain.value = gain;
    voice.connect(f).connect(g);
    return g;
  };
  const low = formant(5, 1, 450, 1000, 650);
  const high = formant(8, 0.5, 1400, 2600, 1100);

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + 0.05);
  env.gain.setValueAtTime(peak, t + dur * 0.55);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  low.connect(env);
  high.connect(env);

  let out = env;
  if (trill) {
    // A rolled "mrrp": fast tremolo over the first part of the sound.
    const roll = ac.createGain();
    const lfo = ac.createOscillator();
    lfo.frequency.value = 28;
    const depth = ac.createGain();
    depth.gain.setValueAtTime(0.5, t);
    depth.gain.linearRampToValueAtTime(0, t + dur * 0.5);
    roll.gain.value = 0.5;
    lfo.connect(depth).connect(roll.gain);
    env.connect(roll);
    out = roll;
    lfo.start(t);
    lfo.stop(t + dur);
  }

  const soften = ac.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 4200;
  // The formant filters eat most of the energy; bring the result back to a comfortable level.
  const level = ac.createGain();
  level.gain.value = 3;
  out.connect(soften).connect(level).connect(ac.destination);

  voice.start(t);
  vibrato.start(t);
  voice.stop(t + dur + 0.02);
  vibrato.stop(t + dur + 0.02);
  return dur;
}

export function meow(options = {}) {
  try {
    scheduleMeow(audio(), { pitch: rand(0.9, 1.25), length: rand(0.8, 1.2), ...options });
  } catch {}
}
