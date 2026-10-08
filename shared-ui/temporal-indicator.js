// Reusable temporal scalar state for history-backed indicators.
// EN: This module knows values, time and optional markers only; renderers own scale labels, colour and domain meaning.

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createTemporalIndicator({
  min = 0,
  max = 1,
  binCount = 10,
  historyMs = 15000,
  timeConstantMs = 5000,
  valueAttackMs = 60,
  valueReleaseMs = 400,
  markerHoldMs = 600,
  markerFallPerSecond = 14
} = {}) {
  const samples = [];
  const state = { value: NaN, marker: NaN, targetValue: NaN, targetMarker: NaN, lastMs: 0, markerHoldUntil: 0 };

  function push({ value, marker = value, timeMs }) {
    if (!Number.isFinite(value) || !Number.isFinite(timeMs)) return;
    state.targetValue = value;
    state.targetMarker = Number.isFinite(marker) ? marker : value;
    if (!Number.isFinite(state.value)) state.value = value;
    if (!Number.isFinite(state.marker) || state.targetMarker >= state.marker) {
      state.marker = state.targetMarker;
      state.markerHoldUntil = timeMs + markerHoldMs;
    }
    samples.push({ value, timeMs });
    while (samples.length && samples[0].timeMs < timeMs - historyMs) samples.shift();
  }

  function update(nowMs) {
    if (!Number.isFinite(state.targetValue)) return;
    const elapsed = state.lastMs ? Math.max(0, nowMs - state.lastMs) : 0;
    state.lastMs = nowMs;
    const timeConstant = state.targetValue > state.value ? valueAttackMs : valueReleaseMs;
    if (timeConstant <= 0) state.value = state.targetValue;
    else state.value += (state.targetValue - state.value) * (1 - Math.exp(-elapsed / timeConstant));
    if (nowMs > state.markerHoldUntil) state.marker = Math.max(state.targetMarker, state.marker - elapsed / 1000 * markerFallPerSecond);
  }

  function weightedBins(nowMs) {
    const bins = new Array(binCount).fill(0);
    let totalWeight = 0;
    for (const sample of samples) {
      const normalized = clamp((sample.value - min) / (max - min), 0, 0.999999);
      const weight = Math.exp(-Math.max(0, nowMs - sample.timeMs) / timeConstantMs);
      bins[Math.floor(normalized * binCount)] += weight;
      totalWeight += weight;
    }
    return bins.map(value => Math.sqrt(value / Math.max(1, totalWeight)));
  }

  function snapshot(nowMs) {
    update(nowMs);
    return { value: state.value, marker: state.marker, bins: weightedBins(nowMs), hasValue: Number.isFinite(state.value) };
  }

  function reset() {
    samples.length = 0;
    state.value = NaN; state.marker = NaN; state.targetValue = NaN; state.targetMarker = NaN;
    state.lastMs = 0; state.markerHoldUntil = 0;
  }

  return { push, snapshot, reset };
}
