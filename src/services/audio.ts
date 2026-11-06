/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play countdown tick sound (3, 2, 1).
 */
export function playCountdownBeep(num: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Different pleasant pitches for 3, 2, 1
  const freq = num === 1 ? 1046.5 : num === 2 ? 880 : 783.99; // C6, A5, G5
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.2);
}

/**
 * Synthesizes an authentic mechanical dual-shutter click.
 */
export function playShutterSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Click 1: Mirror flip up / mechanical shutter opening
  triggerClick(ctx, now, 0.4);

  // Click 2: Shutter close after 90ms
  triggerClick(ctx, now + 0.09, 0.6);
}

function triggerClick(ctx: AudioContext, time: number, intensity: number): void {
  // Noise burst for mechanical snap
  const bufferSize = Math.floor(ctx.sampleRate * 0.05); // 50ms noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // Bandpass filter for camera casing resonance
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1800, time);
  filter.Q.setValueAtTime(3, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(intensity, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(time);
  noise.stop(time + 0.05);
}
