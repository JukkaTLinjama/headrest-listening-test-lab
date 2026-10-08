// Reusable horizontal Character Meter UI.
// EN: This view renders supplied level frames only. It has no AudioContext dependency.

import { createTemporalIndicator } from '../../shared-ui/temporal-indicator.js?v=1.0';

const MIN_DB = -60;
const MAX_DB = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function xForDb(db, width, left, right) {
  const t = clamp((db - MIN_DB) / (MAX_DB - MIN_DB), 0, 1);
  return left + t * (width - left - right);
}

export function createCharacterMeter(canvas) {
  if (!canvas) return { push() {}, reset() {}, destroy() {} };
  const context = canvas.getContext('2d');
  const temporal = Object.fromEntries(['full', 'low', 'detector', 'output'].map(key => [key, createTemporalIndicator({ min: MIN_DB, max: MAX_DB, binCount: 10, historyMs: 15000, timeConstantMs: 5000, valueAttackMs: 60, valueReleaseMs: 400, markerHoldMs: 600, markerFallPerSecond: 14 })]));
  let lastFrame = null;
  let guardFlashDb = 0, guardFlashUntil = 0;
  const sessionPeak = { full: -Infinity, low: -Infinity, detector: -Infinity, output: -Infinity };
  let sessionKReference = null;
  let resizeObserver = null, animationFrame = null;

  function fit() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.round(rect.width || 720));
    const height = Math.max(206, Math.round(rect.height || 214));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function push(frame) {
    if (!frame || !Number.isFinite(frame.full?.rms) || !Number.isFinite(frame.low?.rms)) return;
    const now = performance.now();
    temporal.full.push({ value: frame.full.rms, marker: frame.full.livePeak, timeMs: now });
    temporal.low.push({ value: frame.low.rms, marker: frame.low.livePeak, timeMs: now });
    if (Number.isFinite(frame.detector?.rms)) temporal.detector.push({ value: frame.detector.rms, marker: frame.detector.livePeak, timeMs: now });
    if (Number.isFinite(frame.output?.rms)) temporal.output.push({ value: frame.output.rms, marker: frame.output.livePeak, timeMs: now });
    // EN: Session peak remains separate and unbounded while reusable temporal state owns rolling display history.
    sessionPeak.full = Math.max(sessionPeak.full, frame.full.livePeak);
    sessionPeak.low = Math.max(sessionPeak.low, frame.low.livePeak);
    if (Number.isFinite(frame.detector?.livePeak)) sessionPeak.detector = Math.max(sessionPeak.detector, frame.detector.livePeak);
    if (Number.isFinite(frame.output?.livePeak)) sessionPeak.output = Math.max(sessionPeak.output, frame.output.livePeak);
    const bassReductionDb = Math.max(0, Number(frame.output?.bassReductionDb) || 0);
    const guardReductionDb = Math.max(0, Number(frame.output?.guardReductionDb) || 0);
    // EN: Bass protection is rendered in the static Presentation mini strip; only the final guard moves here.
    // EN: The final guard is intentionally more emphatic because it is the last output safety event.
    if (guardReductionDb > .05) { guardFlashDb = Math.max(guardReductionDb, guardFlashDb * .72); guardFlashUntil = now + 760; }
    if (Number.isFinite(frame.full.sessionK) && frame.full.sessionSeconds >= 10) sessionKReference = frame.full.sessionK;
    lastFrame = frame;
  }

  function reset() {
    for (const indicator of Object.values(temporal)) indicator.reset();
    sessionPeak.full = -Infinity; sessionPeak.low = -Infinity; sessionPeak.detector = -Infinity; sessionPeak.output = -Infinity;
    sessionKReference = null; lastFrame = null; guardFlashDb = 0; guardFlashUntil = 0; draw();
  }

  function drawRow({ y, label, key, session, limit, bassReductionDb = 0, guardReductionDb = 0 }) {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const left = 44, right = 18, railTop = y + 16, railHeight = 22, railBottom = railTop + railHeight;
    context.font = '12px Arial';
    context.fillStyle = '#b9c7c7';
    context.fillText(label, left, y + 11);

    // EN: Compact meter combines session distribution and live ballistics in one visual.
    context.fillStyle = '#151b1f';
    context.fillRect(left, railTop, width - left - right, railHeight);
    context.strokeStyle = 'rgba(255,255,255,.09)';
    context.lineWidth = 1;
    for (let db = MIN_DB; db <= MAX_DB; db += 6) {
      const x = xForDb(db, width, left, right);
      context.beginPath(); context.moveTo(x, railTop); context.lineTo(x, railBottom); context.stroke();
    }

    const meter = temporal[key].snapshot(performance.now());
    const bins = meter.bins;
    const binWidth = (width - left - right) / bins.length;
    const colours = {
      full: { history: [122, 201, 189], rms: '#7ac9bd', peak: '#dceaff' },
      low: { history: [242, 195, 107], rms: '#f2c36b', peak: '#fff0c8' },
      detector: { history: [159, 208, 255], rms: '#9fd0ff', peak: '#e5f3ff' },
      output: { history: [126, 230, 215], rms: '#7ee6d7', peak: '#e8fffb' }
    }[key];
    // EN: Each history distribution shares its live rail hue, but remains subdued behind it.
    bins.forEach((value, index) => {
      const alpha = .070 + value * .420;
      context.fillStyle = `rgba(${colours.history.join(',')},${alpha.toFixed(3)})`;
      context.fillRect(left + index * binWidth + 1, railTop + 1, Math.max(1, binWidth - 2), railHeight - 2);
    });

    if (meter.hasValue) {
      const rmsX = xForDb(meter.value, width, left, right);
      const livePeakX = xForDb(meter.marker, width, left, right);
      const sessionPeakX = xForDb(session, width, left, right);
      // EN: Horizontal live rails make the RMS-to-peak relationship visible against the broad history.
      context.fillStyle = colours.rms;
      context.fillRect(left, railBottom - 6, Math.max(0, rmsX - left), 4);
      // EN: A centered peak square marks the instantaneous crest without turning it into a second horizontal rail.
      context.fillStyle = colours.peak;
      context.fillRect(livePeakX - 2, railBottom - 6, 4, 4);
      // EN: Neutral session history leaves warm colour reserved for protection thresholds and action.
      context.fillStyle = 'rgba(210,225,230,.48)';
      context.fillRect(sessionPeakX - 1, railTop - 2, 2, railHeight + 4);
      if (Number.isFinite(limit)) {
        const limitX = xForDb(limit, width, left, right);
        context.strokeStyle = '#ff8d75'; context.lineWidth = 2;
        context.beginPath(); context.moveTo(limitX, railTop - 2); context.lineTo(limitX, railBottom + 2); context.stroke();
        if (key === 'output') {
          const now = performance.now();
          const guardHold = Math.max(0, Math.min(1, (guardFlashUntil - now) / 520));
          const guardDb = guardReductionDb > .05 ? guardReductionDb : guardFlashDb * guardHold;
          if (guardDb > .05) {
            const blink = .60 + .40 * Math.sin(now / 85);
            const alpha = (.34 + .62 * blink * Math.max(.3, guardHold)).toFixed(3);
            context.strokeStyle = `rgba(255,78,66,${alpha})`; context.lineWidth = 6;
            context.beginPath(); context.moveTo(limitX, railTop - 4); context.lineTo(limitX, railBottom + 4); context.stroke();
            // EN: A deliberate rightward burst makes final-output intervention unmistakable.
            const burst = Math.min(30, 10 + guardDb / 6 * 20);
            context.strokeStyle = `rgba(255,78,66,${alpha})`; context.lineWidth = 2;
            for (const offset of [4, 11, 18]) {
              context.beginPath(); context.moveTo(limitX + 4, railTop + offset); context.lineTo(Math.min(width - 3, limitX + burst), railTop + offset); context.stroke();
            }
          }
        }
      }
    }
  }

  function drawScale(y) {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const left = 44, right = 18;
    const ticks = [-60, -48, -36, -24, -12, 0];
    context.font = '10px Arial';
    context.fillStyle = '#879797';
    context.textAlign = 'center';
    for (const tick of ticks) {
      const x = xForDb(tick, width, left, right);
      context.fillText(tick === 0 ? '0 dBFS' : String(tick), x, y);
    }
    context.textAlign = 'start';
  }

  function draw() {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(0,0,0,.20)';
    context.fillRect(0, 0, width, height);
    drawRow({ y: 5, label: 'CONTENT PRE · full', key: 'full', session: sessionPeak.full });
    drawRow({ y: 53, label: 'LOW PRE · 20–120 Hz', key: 'low', session: sessionPeak.low });
    drawRow({ y: 101, label: 'LIMITER OUTPUT · 20–90 Hz', key: 'detector', session: sessionPeak.detector, limit: lastFrame?.detector?.limit });
    // EN: This final-mix observer reuses the same RMS and peak language before the output guard.
    drawRow({ y: 149, label: 'OUTPUT PRE-GUARD · selected mix', key: 'output', session: sessionPeak.output, limit: lastFrame?.output?.limit, bassReductionDb: lastFrame?.output?.bassReductionDb, guardReductionDb: lastFrame?.output?.guardReductionDb });
    drawScale(199);
  }

  resizeObserver = new ResizeObserver(fit);
  resizeObserver.observe(canvas);
  fit();
  animationFrame = requestAnimationFrame(function frame() { draw(); animationFrame = requestAnimationFrame(frame); });
  return { push, reset, destroy() { resizeObserver?.disconnect(); if (animationFrame) cancelAnimationFrame(animationFrame); } };
}
