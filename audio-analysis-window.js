// Compact canvas renderer for final-output Signal Character frames.
// EN: Rendering receives numeric frames only; it has no Web Audio or control ownership.

import { createTemporalIndicator } from './shared-ui/temporal-indicator.js?v=1.0';
const OCTAVE_LABELS = [
  { frequency: 31.5, label: '31' },
  { frequency: 125, label: '125' },
  { frequency: 500, label: '500' },
  { frequency: 2000, label: '2k' },
  { frequency: 8000, label: '8k' }
];
const OCTAVE_DIVIDERS = [31.5, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

// EN: Approximate 60-phon relative requirements, normalized to 1 kHz.
// EN: This colours perception emphasis only; it is not an ISO 226 or SPL measurement.
const RELATIVE_60_PHON_REQUIREMENT = [
  [20, 55], [31.5, 43], [50, 31], [80, 18], [100, 14], [125, 10],
  [200, 4], [315, 1.5], [500, .5], [1000, 0], [2000, -2],
  [4000, -4], [8000, -1], [12500, 3], [16000, 10]
];

export function createAudioAnalysisWindow(container, options = {}) {
  if (!container) return { render() {}, reset() {} };
  const spectrumMinDb = Number.isFinite(options.spectrumMinDb) ? Math.min(-20, options.spectrumMinDb) : -60;
  const spectrumTicks = spectrumMinDb <= -80 ? [-80, -60, -40, -20, 0] : [-60, -30, 0];
  container.innerHTML = `<div class=\"outputAnalysisHeader\"><span>FINAL OUTPUT · SIGNAL CHARACTER</span><span id=\"outputAnalysisState\">WAITING FOR PLAYBACK</span></div><div class=\"outputLevelHeader\"><span>OUTPUT LEVEL · 400 ms RMS</span><span id=\"outputAnalysisGuard\">GUARD --</span></div><div class=\"outputLevelRail\" aria-label=\"Final output level history, current RMS and peak\"><i class=\"outputLevelHistory\"></i><i class=\"outputLevelFill\"></i><i class=\"outputLevelPeak\"></i><span class=\"outputLevelScale\">−60</span><span class=\"outputLevelZero\">0 dBFS</span></div><div class=\"outputGuardRow\"><span>GUARD REDUCTION</span><div class=\"outputGuardRail\" aria-label=\"Final output guard reduction\"><i class=\"outputGuardFill\"></i><span class=\"outputGuardLeft\">−6 dB</span><span class=\"outputGuardRight\">0</span></div></div><div class=\"outputAnalysisValues\"><span id=\"outputAnalysisPeak\">Peak hold --</span><span id=\"outputAnalysisRms\">400 ms --</span><span id=\"outputAnalysisShort\">3 s --</span><span id=\"outputAnalysisSession\">Session K --</span></div><div class=\"outputAnalysisPlot\"><canvas class=\"outputSpectrum\" aria-label=\"Post-guard third-octave signal character\"></canvas><div class=\"outputAnalysisLegend\">1/3 OCTAVE<br>20 Hz–16 kHz<br>−${Math.abs(spectrumMinDb)}…0 dBFS</div></div><div class=\"outputAnalysisNote\">Band energy · post guard observer · Session K is not certified LUFS</div>`;

  const peak = container.querySelector('#outputAnalysisPeak');
  const rms = container.querySelector('#outputAnalysisRms');
  const short = container.querySelector('#outputAnalysisShort');
  const session = container.querySelector('#outputAnalysisSession');
  const state = container.querySelector('#outputAnalysisState');
  const guard = container.querySelector('#outputAnalysisGuard');
  const rail = container.querySelector('.outputLevelRail');
  const history = container.querySelector('.outputLevelHistory');
  const fill = container.querySelector('.outputLevelFill');
  const peakMarker = container.querySelector('.outputLevelPeak');
  const levelIndicator = createTemporalIndicator({ min: -60, max: 0, binCount: 10, historyMs: 15000, timeConstantMs: 5000, valueAttackMs: 0, valueReleaseMs: 0, markerHoldMs: 0, markerFallPerSecond: 100000 });
  const guardFill = container.querySelector('.outputGuardFill');
  const canvas = container.querySelector('canvas');
  const getBackgroundBands = typeof options.getBackgroundBands === 'function' ? options.getBackgroundBands : () => [];
  const getPreProtectionBands = typeof options.getPreProtectionBands === 'function' ? options.getPreProtectionBands : () => [];
  const format = value => Number.isFinite(value) ? value.toFixed(1) + ' dBFS' : '--';
  const xForFrequency = (frequency, left, width) => left + Math.log(frequency / 20) / Math.log(16000 / 20) * width;
  // EN: These are renderer-local display states; they never affect audio or observer sampling.
  const railPercent = value => Math.max(0, Math.min(100, (value + 60) / 60 * 100));
  const guardPercent = value => Math.max(0, Math.min(100, value / 6 * 100));
  let lastTextRenderMs = 0;
  const historyGradient = bins => `linear-gradient(90deg, ${bins.map((value, index) => { const start = index * 10; const end = start + 10; const alpha = .055 + value * .36; return `rgba(126,230,215,${alpha.toFixed(3)}) ${start}% ${end}%`; }).join(',')})`;

  function interpolateRequirementDb(frequency) {
    const logFrequency = Math.log(frequency);
    for (let index = 1; index < RELATIVE_60_PHON_REQUIREMENT.length; index++) {
      const [upperFrequency, upperDb] = RELATIVE_60_PHON_REQUIREMENT[index];
      const [lowerFrequency, lowerDb] = RELATIVE_60_PHON_REQUIREMENT[index - 1];
      if (frequency <= upperFrequency) {
        const ratio = (logFrequency - Math.log(lowerFrequency)) / (Math.log(upperFrequency) - Math.log(lowerFrequency));
        return lowerDb + (upperDb - lowerDb) * ratio;
      }
    }
    return RELATIVE_60_PHON_REQUIREMENT[RELATIVE_60_PHON_REQUIREMENT.length - 1][1];
  }

  function perceptualBandColour(band) {
    const perceptualDb = band.dbfs - interpolateRequirementDb(band.centerHz);
    if (perceptualDb < -48) return 'rgba(126,230,215,.25)';
    if (perceptualDb < -18) {
      const alpha = .42 + (perceptualDb + 48) / 30 * .58;
      return 'rgba(126,230,215,' + alpha.toFixed(3) + ')';
    }
    if (perceptualDb < -6) return '#f2c36b';
    return '#ff796b';
  }

  function draw(bands = []) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const scale = window.devicePixelRatio || 1;
    if (canvas.width !== width * scale || canvas.height !== height * scale) {
      canvas.width = width * scale;
      canvas.height = height * scale;
    }

    const context = canvas.getContext('2d');
    const left = 24;
    const right = 5;
    const top = 5;
    const bottom = 18;
    const plotWidth = Math.max(1, width - left - right);
    const plotHeight = Math.max(1, height - top - bottom);
    const yForDb = value => top + (0 - Math.max(spectrumMinDb, Math.min(0, value))) / Math.abs(spectrumMinDb) * plotHeight;

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);
    context.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.textBaseline = 'middle';
    spectrumTicks.forEach(value => {
      const y = yForDb(value);
      context.strokeStyle = 'rgba(170,205,220,.15)';
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(width - right, y);
      context.stroke();
      context.fillStyle = 'rgba(170,205,220,.65)';
      context.fillText(String(value), 1, y);
    });

    // EN: Draw each octave boundary; labels remain sparse for the compact canvas.
    OCTAVE_DIVIDERS.forEach(frequency => {
      const x = xForFrequency(frequency, left, plotWidth);
      context.strokeStyle = 'rgba(126,230,215,.30)';
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, top + plotHeight);
      context.stroke();
    });

    OCTAVE_LABELS.forEach(item => {
      const x = xForFrequency(item.frequency, left, plotWidth);
      context.fillStyle = 'rgba(170,205,220,.72)';
      context.textAlign = 'center';
      context.textBaseline = 'alphabetic';
      context.fillText(item.label, x, height - 3);
    });

    const preProtectionBands = getPreProtectionBands() || [];
    if (preProtectionBands.length) {
      context.save();
      context.strokeStyle = 'rgba(190,196,199,.48)';
      context.lineWidth = 3.4;
      for (const band of preProtectionBands) {
        if (!Number.isFinite(band?.centerHz) || !Number.isFinite(band?.dbfs)) continue;
        // EN: Grey PRE is a protection-delta cue, not a second full-range spectrum.
        if (band.centerHz < 20 || band.centerHz > 90) continue;
        const x = xForFrequency(band.centerHz, left, plotWidth);
        context.beginPath();
        context.moveTo(x, top + plotHeight);
        context.lineTo(x, yForDb(band.dbfs));
        context.stroke();
      }
      context.restore();
    }

    context.save();
    context.shadowColor = 'rgba(126,230,215,.48)';
    context.shadowBlur = 4;
    context.strokeStyle = '#7ee6d7';
    context.lineWidth = 1.6;
    for (const band of bands) {
      const x = xForFrequency(band.centerHz, left, plotWidth);
      context.beginPath();
      context.moveTo(x, top + plotHeight);
      context.lineTo(x, yForDb(band.dbfs));
      context.stroke();
    }
    context.restore();

    const backgroundBands = getBackgroundBands() || [];
    if (backgroundBands.length) {
      context.save();
      context.strokeStyle = 'rgba(183,165,238,.55)';
      context.lineWidth = 1;
      context.setLineDash([3, 3]);
      context.beginPath();
      let started = false;
      for (const band of backgroundBands) {
        if (!Number.isFinite(band?.centerHz) || !Number.isFinite(band?.dbfs)) continue;
        const x = xForFrequency(band.centerHz, left, plotWidth);
        const y = yForDb(band.dbfs);
        if (!started) { context.moveTo(x, y); started = true; }
        else context.lineTo(x, y);
      }
      if (started) context.stroke();
      context.restore();
    }
  }

  function renderLevel(frame, now) {
    const reduction = frame.guardReductionDb || 0;
    levelIndicator.push({ value: frame.rms400Db, marker: frame.peakDb, timeMs: now });
    const level = levelIndicator.snapshot(now);
    history.style.backgroundImage = historyGradient(level.bins);
    fill.style.width = railPercent(level.value) + '%';
    peakMarker.style.left = railPercent(level.marker) + '%';
    guardFill.style.width = guardPercent(reduction) + '%';
    rail.classList.toggle('guardActive', reduction > .05);
  }

  return {
    render(frame) {
      state.textContent = 'LIVE · POST GUARD';
      const now = performance.now();
      renderLevel(frame, now);
      if (now - lastTextRenderMs >= 500) {
        peak.textContent = 'Peak hold ' + format(frame.peakDb);
        rms.textContent = '400 ms ' + format(frame.rms400Db);
        short.textContent = '3 s ' + format(frame.rms3sDb);
        session.textContent = 'Session K ' + format(frame.sessionKDb);
        const reduction = frame.guardReductionDb || 0;
        guard.textContent = reduction > .05 ? 'GUARD −' + reduction.toFixed(1) + ' dB' : 'GUARD CLEAR';
        lastTextRenderMs = now;
      }
      draw(frame.thirdOctaveBands);
    },
    reset() {
      state.textContent = 'WAITING FOR PLAYBACK';
      peak.textContent = 'Peak hold --';
      rms.textContent = '400 ms --';
      short.textContent = '3 s --';
      session.textContent = 'Session K --';
      guard.textContent = 'GUARD --';
      levelIndicator.reset();
      history.style.backgroundImage = 'none';
      fill.style.width = '0%';
      peakMarker.style.left = '0%';
      guardFill.style.width = '0%';
      rail.classList.remove('guardActive');
      lastTextRenderMs = 0;
      draw();
    }
  };
}
