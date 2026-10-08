// Offline Program A loudness analysis for Spill Lab.
// EN: This module measures decoded file content only; it never touches the live audio graph.

const TARGET_SAMPLE_RATE = 48000;
const BLOCK_SECONDS = 0.400;
const HOP_SECONDS = 0.100;
const ABSOLUTE_GATE_LUFS = -70;
const LUFS_OFFSET = -0.691;

// ITU-R BS.1770 K-weighting coefficients at 48 kHz.
// EN: Input audio is rendered to 48 kHz first so these fixed coefficients remain applicable.
const K_SHELF = {
  b0: 1.53512485958697, b1: -2.69169618940638, b2: 1.19839281085285,
  a1: -1.69065929318241, a2: 0.73248077421585
};
const K_HIGH_PASS = {
  b0: 1, b1: -2, b2: 1,
  a1: -1.99004745483398, a2: 0.99007225036621
};

function dbFromEnergy(value) {
  return 10 * Math.log10(Math.max(value, 1e-12));
}

function applyBiquad(samples, coefficients) {
  const { b0, b1, b2, a1, a2 } = coefficients;
  const output = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    output[i] = y;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
  }
  return output;
}

async function renderAt48k(buffer) {
  if (buffer.sampleRate === TARGET_SAMPLE_RATE) return buffer;
  const length = Math.max(1, Math.ceil(buffer.duration * TARGET_SAMPLE_RATE));
  const offline = new OfflineAudioContext(buffer.numberOfChannels, length, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(0);
  return offline.startRendering();
}

function calculateIntegratedLufs(buffer) {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const weighted = channels.map(channel => applyBiquad(applyBiquad(channel, K_SHELF), K_HIGH_PASS));
  const blockSamples = Math.max(1, Math.round(TARGET_SAMPLE_RATE * BLOCK_SECONDS));
  const hopSamples = Math.max(1, Math.round(TARGET_SAMPLE_RATE * HOP_SECONDS));
  const blockEnergies = [];

  for (let start = 0; start + blockSamples <= weighted[0].length; start += hopSamples) {
    let sum = 0;
    for (const channel of weighted) {
      for (let i = start; i < start + blockSamples; i++) sum += channel[i] * channel[i];
    }
    blockEnergies.push(sum / (blockSamples * weighted.length));
  }

  const absolute = blockEnergies.filter(energy => LUFS_OFFSET + dbFromEnergy(energy) >= ABSOLUTE_GATE_LUFS);
  if (!absolute.length) return null;
  const ungatedLufs = LUFS_OFFSET + dbFromEnergy(absolute.reduce((sum, value) => sum + value, 0) / absolute.length);
  const relative = absolute.filter(energy => LUFS_OFFSET + dbFromEnergy(energy) >= ungatedLufs - 10);
  if (!relative.length) return null;
  return LUFS_OFFSET + dbFromEnergy(relative.reduce((sum, value) => sum + value, 0) / relative.length);
}

function calculateSamplePeakDbfs(buffer) {
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel);
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  }
  return 20 * Math.log10(Math.max(peak, 1e-12));
}

// EN: Apply a static Program A reference trim to an offline result without modelling clipping, protection or output guard.
// EN: Files, procedural renders and future calibration signals use this same source-analysis plane.
export function applyProgramReferenceTrim(analysis, referenceTrimDb = 0) {
  const trimDb = Number.isFinite(referenceTrimDb) ? referenceTrimDb : 0;
  if (!analysis?.hasSignal) return { ...analysis, referenceTrimDb: trimDb };
  return {
    ...analysis,
    referenceTrimDb: trimDb,
    integratedLufs: Number.isFinite(analysis.integratedLufs) ? analysis.integratedLufs + trimDb : null,
    samplePeakDbfs: Number.isFinite(analysis.samplePeakDbfs) ? analysis.samplePeakDbfs + trimDb : null
  };
}

export async function analyseProgramLoudness(buffer) {
  if (!buffer?.length || !buffer.sampleRate) {
    return { hasSignal: false, integratedLufs: null, samplePeakDbfs: null, durationSec: 0 };
  }
  const rendered = await renderAt48k(buffer);
  return {
    hasSignal: true,
    integratedLufs: calculateIntegratedLufs(rendered),
    // EN: This is sample peak, deliberately not labelled True Peak until oversampled TP metering is added.
    samplePeakDbfs: calculateSamplePeakDbfs(rendered),
    durationSec: buffer.duration
  };
}
