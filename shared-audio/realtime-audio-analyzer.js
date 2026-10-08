// Reusable real-time observer for browser audio labs.
// EN: This module reports measurements only; it never feeds gain, protection, or routing decisions back into audio.
const THIRD_OCTAVE_CENTERS = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
  200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
  2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000
];

// EN: Halve only the lowest bank window to reduce temporal smearing around 20–80 Hz.
const MULTI_RESOLUTION_FFT_SIZES = [16384, 16384, 8192, 4096, 2048];

const dbToEnergy = db => Math.pow(10, db / 10);
const energyToDb = energy => 10 * Math.log10(Math.max(energy, 1e-12));
const amplitudeToDb = amplitude => 20 * Math.log10(Math.max(amplitude, 1e-12));

function smoothEnergy(previous, instant, elapsedSec, attackSec, releaseSec = attackSec) {
  if (!Number.isFinite(previous)) return instant;
  // EN: Spectral energy rises promptly but releases slowly enough to show signal character.
  const timeConstantSec = instant > previous ? attackSec : releaseSec;
  const alpha = 1 - Math.exp(-elapsedSec / Math.max(.001, timeConstantSec));
  return previous + (instant - previous) * alpha;
}

function spectrumBankIndexForFrequency(frequencyHz) {
  if (frequencyHz <= 80) return 0;
  if (frequencyHz <= 315) return 1;
  if (frequencyHz <= 1250) return 2;
  if (frequencyHz <= 5000) return 3;
  return 4;
}

function buildThirdOctaveKernels(ctx, analysers, mode) {
  const sampleRate = ctx.sampleRate;
  const sigmaOctaves = (1 / 6) / Math.sqrt(2 * Math.log(2));
  const maxOctaves = .6;

  return THIRD_OCTAVE_CENTERS
    .filter(centerHz => centerHz / Math.pow(2, 1 / 6) < sampleRate / 2)
    .map(centerHz => {
      const analyserIndex = mode === 'multi-resolution'
        ? spectrumBankIndexForFrequency(centerHz)
        : 0;
      const analyser = analysers[analyserIndex];
      const binHz = sampleRate / analyser.fftSize;
      const bins = [];
      const weights = [];

      for (let index = 1; index < analyser.frequencyBinCount; index++) {
        const frequencyHz = index * binHz;
        if (frequencyHz < 20 || frequencyHz > 20000) continue;
        const octaveDistance = Math.log2(frequencyHz / centerHz);
        if (Math.abs(octaveDistance) > maxOctaves) continue;
        const weight = Math.exp(-(octaveDistance ** 2) / (2 * sigmaOctaves ** 2));
        if (weight < 1e-4) continue;
        bins.push(index);
        weights.push(weight);
      }

      return { centerHz, analyserIndex, bins, weights };
    });
}

export function createRealtimeAudioAnalyzer(ctx, source, {
  onFrame,
  getReductionDb,
  fftSize = 4096,
  spectrumMode = 'single',
  updateMs = 100,
  guardReductionHoldReleaseDbPerSec = .65,
  peakHoldMs = 2200,
  peakReleaseDbPerSec = .8,
  spectrumAttackSec = .05,
  spectrumReleaseSec = .35
} = {}) {
  const normalizedSpectrumMode = spectrumMode === 'multi-resolution'
    ? 'multi-resolution'
    : 'single';
  const spectrumSizes = normalizedSpectrumMode === 'multi-resolution'
    ? MULTI_RESOLUTION_FFT_SIZES
    : [fftSize];
  const spectrumAnalysers = spectrumSizes.map(size => {
    const analyser = ctx.createAnalyser();
    analyser.fftSize = size;
    analyser.minDecibels = -120;
    analyser.maxDecibels = 0;
    analyser.smoothingTimeConstant = 0;
    return analyser;
  });
  const spectrumData = spectrumAnalysers.map(analyser => new Float32Array(analyser.frequencyBinCount));
  // EN: Use frequency-dependent FFT resolution so low third-octave bands remain separable.
  const thirdOctaveKernels = buildThirdOctaveKernels(ctx, spectrumAnalysers, normalizedSpectrumMode);

  const outputTime = ctx.createAnalyser();
  outputTime.fftSize = 2048;
  outputTime.smoothingTimeConstant = 0;
  const kShelf = ctx.createBiquadFilter();
  kShelf.type = 'highshelf';
  kShelf.frequency.value = 1500;
  kShelf.gain.value = 4;
  const kHighpass = ctx.createBiquadFilter();
  kHighpass.type = 'highpass';
  kHighpass.frequency.value = 60;
  kHighpass.Q.value = .5;
  const level = ctx.createAnalyser();
  level.fftSize = 2048;
  level.smoothingTimeConstant = 0;
  const silentSink = ctx.createGain();
  silentSink.gain.value = 0;

  // EN: Observer branches end in a zero-gain sink; audible routing is unchanged.
  source.connect(outputTime);
  outputTime.connect(silentSink);
  spectrumAnalysers.forEach(analyser => {
    source.connect(analyser);
    analyser.connect(silentSink);
  });
  source.connect(kShelf);
  kShelf.connect(kHighpass);
  kHighpass.connect(level);
  level.connect(silentSink);
  silentSink.connect(ctx.destination);

  const kTimeData = new Float32Array(level.fftSize);
  const outputTimeData = new Float32Array(outputTime.fftSize);
  const energyHistory = [];
  const smoothedBands = new Map();
  let timer = null;
  let sessionEnergy = 0;
  let sessionFrames = 0;
  let heldPeakDb = -100;
  let peakHoldUntilMs = 0;
  let heldReductionDb = 0;
  let lastFrameMs = performance.now();

  function rmsEnergy(data) {
    let sum = 0;
    for (const sample of data) {
      const safe = Number.isFinite(sample) ? sample : 0;
      sum += safe * safe;
    }
    return sum / data.length;
  }

  function recentRmsDb(windowMs, now) {
    const values = energyHistory.filter(frame => now - frame.time <= windowMs);
    if (!values.length) return -100;
    return energyToDb(values.reduce((sum, frame) => sum + frame.energy, 0) / values.length);
  }

  function readThirdOctaves(elapsedSec) {
    spectrumAnalysers.forEach((analyser, index) => analyser.getFloatFrequencyData(spectrumData[index]));

    return thirdOctaveKernels.map(kernel => {
      const data = spectrumData[kernel.analyserIndex];
      let instantEnergy = 0;
      for (let index = 0; index < kernel.bins.length; index++) {
        const db = data[kernel.bins[index]];
        if (!Number.isFinite(db)) continue;
        instantEnergy += kernel.weights[index] * dbToEnergy(db);
      }
      const smooth = smoothEnergy(smoothedBands.get(kernel.centerHz), instantEnergy, elapsedSec, spectrumAttackSec, spectrumReleaseSec);
      smoothedBands.set(kernel.centerHz, smooth);
      return { centerHz: kernel.centerHz, dbfs: energyToDb(smooth) };
    });
  }

  function emit() {
    const now = performance.now();
    const elapsedMs = Math.max(1, now - lastFrameMs);
    const elapsedSec = elapsedMs / 1000;
    lastFrameMs = now;

    level.getFloatTimeDomainData(kTimeData);
    outputTime.getFloatTimeDomainData(outputTimeData);
    const kEnergy = rmsEnergy(kTimeData);
    let peak = 0;
    // EN: Peak is full-band final output, while K values remain loudness-style observations.
    for (const sample of outputTimeData) peak = Math.max(peak, Math.abs(Number.isFinite(sample) ? sample : 0));

    energyHistory.push({ time: now, energy: kEnergy });
    while (energyHistory.length && now - energyHistory[0].time > 3100) energyHistory.shift();
    sessionEnergy += kEnergy;
    sessionFrames += 1;
    const peakDb = amplitudeToDb(peak);
    if (peakDb >= heldPeakDb) {
      heldPeakDb = peakDb;
      peakHoldUntilMs = now + peakHoldMs;
    } else if (now > peakHoldUntilMs) {
      // EN: Caller-configurable hold and release affect only the observer, never audio.
      heldPeakDb = Math.max(peakDb, heldPeakDb - elapsedSec * peakReleaseDbPerSec);
    }
    const instantReductionDb = Math.max(0, Number(getReductionDb?.()) || 0);
    // EN: A zero release value requests direct telemetry rather than a visual hold.
    heldReductionDb = guardReductionHoldReleaseDbPerSec > 0
      ? Math.max(instantReductionDb, Math.max(0, heldReductionDb - elapsedSec * guardReductionHoldReleaseDbPerSec))
      : instantReductionDb;

    onFrame?.({
      rms400Db: recentRmsDb(400, now),
      rms3sDb: recentRmsDb(3000, now),
      peakDb: heldPeakDb,
      guardReductionDb: heldReductionDb,
      sessionKDb: energyToDb(sessionEnergy / sessionFrames),
      thirdOctaveBands: readThirdOctaves(elapsedSec)
    });
  }

  timer = window.setInterval(emit, updateMs);
  return {
    reset() {
      energyHistory.length = 0;
      smoothedBands.clear();
      sessionEnergy = 0;
      sessionFrames = 0;
      heldPeakDb = -100;
      peakHoldUntilMs = 0;
      heldReductionDb = 0;
      lastFrameMs = performance.now();
    },
    dispose() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      [...spectrumAnalysers, outputTime, kShelf, kHighpass, level, silentSink].forEach(node => {
        try { node.disconnect(); } catch {}
      });
    }
  };
}
