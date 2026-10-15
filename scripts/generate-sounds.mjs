// Synthesises Daybloom's reminder sounds (our own, so there are no licences to track) into
// assets/sounds/*.wav: 16-bit mono 44.1 kHz, short and gentle. expo-notifications bundles them
// (app.json "sounds"), and Settings plays them as a preview.
// Usage: npm run generate:sounds
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets', 'sounds');
const RATE = 44100;
const TAU = Math.PI * 2;

function buffer(seconds) {
  return new Float64Array(Math.round(seconds * RATE));
}

/** A struck note: partials (frequency ratio, level, decay seconds) with a soft attack. */
function strike(buf, start, freq, partials, attack = 0.006) {
  const from = Math.round(start * RATE);
  for (let i = from; i < buf.length; i++) {
    const t = (i - from) / RATE;
    const env = Math.min(1, t / attack);
    let v = 0;
    for (const [ratio, level, decay] of partials) v += level * Math.exp(-t / decay) * Math.sin(TAU * freq * ratio * t);
    buf[i] += env * v;
  }
}

function chime() {
  // a soft rising triad, like wind chimes: C6, E6, G6
  const buf = buffer(1.8);
  const partials = [
    [1, 1, 0.55],
    [2, 0.25, 0.3],
    [3, 0.08, 0.2],
  ];
  [1046.5, 1318.5, 1568].forEach((f, n) => strike(buf, n * 0.16, f, partials));
  return buf;
}

function bell() {
  // one clear bell (A5), with a bell's uneven overtones
  const buf = buffer(2.4);
  strike(buf, 0, 880, [
    [1, 1, 1.4],
    [2, 0.45, 1.0],
    [2.76, 0.32, 0.75],
    [5.4, 0.16, 0.4],
    [8.93, 0.08, 0.25],
  ]);
  return buf;
}

function birdsong() {
  // three quick rising chirps and a little trill
  const buf = buffer(1.3);
  const chirp = (start, from, to, length) => {
    let phase = 0;
    const a = Math.round(start * RATE);
    const n = Math.round(length * RATE);
    for (let i = 0; i < n && a + i < buf.length; i++) {
      const x = i / n;
      const f = from + (to - from) * x * x + 120 * Math.sin(TAU * 38 * (i / RATE));
      phase += (TAU * f) / RATE;
      buf[a + i] += Math.sin(Math.PI * x) ** 2 * Math.sin(phase) * 0.8;
    }
  };
  chirp(0, 2400, 4100, 0.09);
  chirp(0.14, 2500, 4300, 0.09);
  chirp(0.28, 2600, 4500, 0.11);
  for (let k = 0; k < 6; k++) chirp(0.55 + k * 0.07, 3600, 3000, 0.05);
  return buf;
}

function marimba() {
  // wooden mallet notes: G5, B5, D6
  const buf = buffer(1.2);
  const partials = [
    [1, 1, 0.3],
    [4, 0.22, 0.06],
    [10, 0.05, 0.02],
  ];
  [784, 987.8, 1174.7].forEach((f, n) => strike(buf, n * 0.12, f, partials, 0.002));
  return buf;
}

function ring() {
  // a gentle "ring-ring": two soft warbling bursts, twice
  const buf = buffer(1.7);
  const burst = (start, length) => {
    const a = Math.round(start * RATE);
    const n = Math.round(length * RATE);
    for (let i = 0; i < n && a + i < buf.length; i++) {
      const t = i / RATE;
      const edge = Math.min(1, t / 0.02, (length - t) / 0.04);
      const warble = 0.5 + 0.5 * Math.sin(TAU * 16 * t);
      const f = warble > 0.5 ? 1320 : 1100;
      buf[a + i] += edge * (0.55 + 0.45 * warble) * (Math.sin(TAU * f * t) + 0.2 * Math.sin(TAU * 2 * f * t));
    }
  };
  burst(0, 0.32);
  burst(0.42, 0.32);
  burst(0.96, 0.32);
  burst(1.38, 0.3);
  return buf;
}

/** Peak at -4 dBFS, fade the last 30 ms, write a 16-bit PCM WAV. */
function writeWav(name, samples) {
  const peak = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const gain = 10 ** (-4 / 20) / peak;
  const fade = Math.round(0.03 * RATE);
  const pcm = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => {
    const tail = Math.min(1, (samples.length - i) / fade);
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * gain * tail)) * 32767), i * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  writeFileSync(path.join(out, `${name}.wav`), Buffer.concat([header, pcm]));
  console.log(`wrote assets/sounds/${name}.wav (${Math.round((44 + pcm.length) / 1024)} KB)`);
}

mkdirSync(out, { recursive: true });
writeWav('chime', chime());
writeWav('bell', bell());
writeWav('birdsong', birdsong());
writeWav('marimba', marimba());
writeWav('ring', ring());
