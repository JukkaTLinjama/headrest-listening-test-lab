// Deterministic E-major octave source for Spill Demo Program A and hardware-volume setup.
// EN: This module owns only waveform scheduling and click-safe fades; the host owns playlist, trims, routing and protection.

export const E_MAJOR_TRIAD_OCTAVE_PEAK_DBFS = -3;

const SLOT_SECONDS = .24;
const SLOT_GAP_SECONDS = .04;
const OCTAVE_TAIL_SECONDS = .12;
const LOWEST_SLOT_MULTIPLIER = 2;
const FADE_SECONDS = .03;
const STOP_FADE_SECONDS = .15;
const STEPS = [
  329.63,246.94,207.65,164.81,
  164.81,123.47,103.83,82.41,
  82.41,61.74,51.91,41.20,
  41.20,30.87,25.96,20.60
];

const dbToGain = db => Math.pow(10, db / 20);
const raisedCosine = (time, seconds) => time <= 0 ? 0 : time >= seconds ? 1 : .5 - .5 * Math.cos(Math.PI * time / seconds);
const envelopeAt = (time, duration) => Math.min(raisedCosine(time, FADE_SECONDS), raisedCosine(duration - time, FADE_SECONDS));
// EN: Pink-like reference is 40 Hz; the 20.60 Hz E1 endpoint is approximately +3 dB.
const pinkLikeGain = frequency => Math.sqrt(40 / frequency);

function makeLayout() {
  const events = [];
  let cursor = 0;
  STEPS.forEach((frequency, index) => {
    const lowOctave = index >= STEPS.length - 4;
    const multiplier = lowOctave ? LOWEST_SLOT_MULTIPLIER : 1;
    const duration = SLOT_SECONDS * multiplier;
    events.push({ frequency, start: cursor, duration });
    const octaveEnd = index % 4 === 3;
    cursor += duration;
    if (index < STEPS.length - 1) cursor += octaveEnd ? OCTAVE_TAIL_SECONDS * multiplier + .2 : SLOT_GAP_SECONDS * multiplier;
  });
  return { events, durationSeconds: cursor + FADE_SECONDS };
}

export function createEMajorTriadOctaveBuffer(context, { peakDbfs = E_MAJOR_TRIAD_OCTAVE_PEAK_DBFS } = {}) {
  const layout = makeLayout();
  const frames = Math.ceil(layout.durationSeconds * context.sampleRate);
  const buffer = context.createBuffer(2, frames, context.sampleRate);
  const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
  // EN: The lowest E1 is the source-wide peak. 40 Hz remains the pink-like reference, 3 dB lower.
  const reference = dbToGain(peakDbfs) / pinkLikeGain(Math.min(...STEPS));
  for (const event of layout.events) {
    const startFrame = Math.round(event.start * context.sampleRate);
    const count = Math.round(event.duration * context.sampleRate);
    const amplitude = reference * pinkLikeGain(event.frequency);
    for (let index = 0; index < count; index++) {
      const time = index / context.sampleRate;
      const sample = amplitude * envelopeAt(time, event.duration) * Math.sin(2 * Math.PI * event.frequency * time);
      channels[0][startFrame + index] = sample;
      channels[1][startFrame + index] = sample;
    }
  }
  return buffer;
}

export function createEMajorTriadOctaveCue(context, { onEnded, peakDbfs = E_MAJOR_TRIAD_OCTAVE_PEAK_DBFS, loop = false } = {}) {
  const output = context.createGain();
  output.gain.value = 1;
  let source = null;
  let ended = false;

  function finish() {
    if (ended) return;
    ended = true;
    onEnded?.();
  }

  return {
    output,
    start(when = context.currentTime + .03) {
      if (source) throw new Error('E-major cue is already running');
      source = context.createBufferSource();
      source.buffer = createEMajorTriadOctaveBuffer(context, { peakDbfs });
      source.loop = loop;
      source.connect(output);
      source.onended = finish;
      source.start(when);
      return when + source.buffer.duration;
    },
    stop(when = context.currentTime) {
      if (!source || ended) return;
      output.gain.cancelScheduledValues(when);
      output.gain.setValueAtTime(output.gain.value, when);
      output.gain.linearRampToValueAtTime(0, when + STOP_FADE_SECONDS);
      source.stop(when + STOP_FADE_SECONDS + .01);
    },
    dispose() {
      try { source?.disconnect(); } catch {}
      try { output.disconnect(); } catch {}
    }
  };
}
