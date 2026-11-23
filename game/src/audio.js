// audio.js — tiny WebAudio synth: no audio files, every sound is an oscillator
// with an envelope, so the game stays a handful of static files.

let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', gain = 0.12, when = 0, slide = 0) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function sfx(name) {
  try {
    if (name === 'draw') tone(660, 0.07, 'triangle', 0.06);
    else if (name === 'play') tone(300, 0.16, 'triangle', 0.10, 0, 260);
    else if (name === 'hit') { tone(120, 0.18, 'square', 0.14, 0, -60); tone(70, 0.22, 'sine', 0.16); }
    else if (name === 'block') tone(880, 0.10, 'square', 0.05);
    else if (name === 'heal') { tone(520, 0.14, 'sine', 0.09); tone(780, 0.18, 'sine', 0.09, 0.09); }
    else if (name === 'burn') { tone(180, 0.08, 'sawtooth', 0.07); tone(150, 0.08, 'sawtooth', 0.06, 0.07); }
    else if (name === 'turn') tone(440, 0.06, 'triangle', 0.07);
    else if (name === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, i * 0.11));
    else if (name === 'lose') [392, 330, 262, 196].forEach((f, i) => tone(f, 0.26, 'triangle', 0.10, i * 0.13));
  } catch { /* sound is a garnish, never a blocker */ }
}
