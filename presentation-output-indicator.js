// EN: Shared observer-only output-history renderer for Lab visual experiments.
// It owns sample ageing and animation, never audio measurement or routing.
export function createPresentationOutputHistory(container, {
  mode = 'reference',
  maxSamples = 10,
  lifetimeMs = 2000,
} = {}) {
  if (!container) return { pushSample() {}, clear() {}, destroy() {} };

  const samples = [];
  let frameId = null;
  let destroyed = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function dbToPercent(value) {
    if (!Number.isFinite(value)) return 0;
    return clamp((value + 60) / 60 * 100, 0, 100);
  }

  function render(now = performance.now()) {
    if (destroyed) return;
    const live = samples.filter(sample => now - sample.born < lifetimeMs);
    samples.splice(0, samples.length, ...live);
    const items = live.map(sample => {
      const age = clamp((now - sample.born) / lifetimeMs, 0, 1);
      const item = document.createElement('i');
      const rms = dbToPercent(sample.rmsDb);
      const peak = Math.max(rms, dbToPercent(sample.peakDb));
      const halfWidth = Math.min(14, Math.max(1.5, (peak - rms) * .42));
      const left = clamp(rms - halfWidth, 0, 100);

      item.className = mode === 'surface' ? 'cfOutputSurfaceTrace' : mode === 'fog' ? 'cfOutputFogTrace' : mode === 'ribbonFog' ? 'cfRibbonFogTrace' : mode === 'peakHalo' ? 'cfPeakHaloTrace' : mode === 'setupFog' ? 'demoVolumeRibbonFogTrace' : mode === 'setupPeakHalo' ? 'demoVolumePeakHaloTrace' : 'cfMiniTrace';
      item.style.left = `${left}%`;
      item.style.width = `${Math.min(100 - left, halfWidth * 2)}%`;
      if (mode === 'surface') {
        // EN: The newest energy starts at the ribbon centre; age falls into an overlapping surface.
        item.style.top = `${age * 32}px`;
        item.style.opacity = String(.82 * (1 - age) ** 1.2);
      } else if (mode === 'fog') {
        // EN: Fog B keeps every layer on one centre line; density comes only from transparent overlap.
        item.style.top = '18px';
        item.style.opacity = String(.34 * (1 - age) ** 1.1);
      } else if (mode === 'ribbonFog' || mode === 'setupFog') {
        // EN: The same long history is placed behind the static VOL markers rather than above them.
        item.style.top = '50%';
        item.style.opacity = String(.30 * (1 - age) ** 1.1);
      } else if (mode === 'peakHalo' || mode === 'setupPeakHalo') {
        // EN: Peak halo is deliberately short-lived: it shows the 50 ms peak above the VOL ribbon.
        item.style.top = '5px';
        item.style.opacity = String(.92 * (1 - age) ** 1.7);
      } else {
        item.style.top = `${7 + age * 21.5}px`;
        item.style.opacity = String(.86 * (1 - age) ** 1.35);
      }
      return item;
    });
    container.replaceChildren(...items);

    if (live.length) frameId = requestAnimationFrame(render);
    else frameId = null;
  }

  function pushSample({ rmsDb, peakDb } = {}) {
    if (destroyed || !Number.isFinite(rmsDb) || !Number.isFinite(peakDb)) return;
    samples.push({ rmsDb, peakDb, born: performance.now() });
    while (samples.length > maxSamples) samples.shift();
    if (frameId === null) frameId = requestAnimationFrame(render);
  }

  function clear() {
    samples.length = 0;
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    container.replaceChildren();
  }

  function destroy() {
    destroyed = true;
    clear();
  }

  return { pushSample, clear, destroy };
}
