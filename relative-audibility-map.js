// Relative Audibility Map for Spill Lab.
// EN: This module visualizes observer frames only; it has no Web Audio, gain, or routing ownership.

import { createTemporalIndicator } from '../../shared-ui/temporal-indicator.js?v=1.0';
const OCTAVE_LABELS = [[31.5, '31'], [125, '125'], [500, '500'], [2000, '2k'], [8000, '8k']];
const OCTAVE_DIVIDERS = [31.5, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const RELATIVE_REQUIREMENT_DB = [
  [20, 55], [31.5, 43], [50, 31], [80, 18], [100, 14], [125, 10],
  [200, 4], [315, 1.5], [500, .5], [1000, 0], [2000, -2],
  [4000, -4], [8000, -1], [12500, 3], [16000, 10]
];

const dbToEnergy = db => Math.pow(10, db / 10);
const energyToDb = energy => 10 * Math.log10(Math.max(energy, 1e-12));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function interpolateRequirementDb(frequency) {
  const logFrequency = Math.log(frequency);
  for (let index = 1; index < RELATIVE_REQUIREMENT_DB.length; index++) {
    const [upperFrequency, upperDb] = RELATIVE_REQUIREMENT_DB[index];
    const [lowerFrequency, lowerDb] = RELATIVE_REQUIREMENT_DB[index - 1];
    if (frequency <= upperFrequency) {
      const ratio = (logFrequency - Math.log(lowerFrequency)) /
        (Math.log(upperFrequency) - Math.log(lowerFrequency));
      return lowerDb + (upperDb - lowerDb) * ratio;
    }
  }
  return RELATIVE_REQUIREMENT_DB[RELATIVE_REQUIREMENT_DB.length - 1][1];
}

function xForFrequency(frequency, left, width) {
  return left + Math.log(frequency / 20) / Math.log(16000 / 20) * width;
}

function bandMap(frame) {
  return new Map((frame?.thirdOctaveBands || []).map(band => [band.centerHz, band.dbfs]));
}

function formatMargin(value) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  return `${rounded >= 0 ? '+' : ''}${rounded} dB`;
}

function historyGradient(bins, colour) {
  return `linear-gradient(90deg, ${bins.map((value, index) => {
    const start = index / bins.length * 100;
    const end = (index + 1) / bins.length * 100;
    const alpha = .055 + value * .38;
    return `rgba(${colour},${alpha.toFixed(3)}) ${start}% ${end}%`;
  }).join(',')})`;
}

export function createRelativeAudibilityMap(container) {
  if (!container) return { setFrame() {}, reset() {} };

  container.innerHTML = `
    <style>
      .relativeAudibilityMap { width:min(100%,760px); margin:12px 0 4px; padding:9px; border:1px solid rgba(126,230,215,.28); border-radius:8px; background:rgba(7,23,20,.70); }
      .relativeAudibilityHeader { display:flex; justify-content:space-between; gap:8px; color:#8fe8db; font-size:9px; font-weight:700; letter-spacing:.07em; }
      .relativeAudibilityState,.relativeAudibilityNote { color:#8ca9a2; font-size:9px; }
      .relativeAudibilityCards { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; margin-top:7px; }
      .relativeAudibilityCard { min-width:0; padding:6px; border:1px solid rgba(143,232,219,.16); border-radius:5px; background:rgba(1,10,8,.38); }
      .relativeAudibilityCard h3 { display:flex; justify-content:space-between; gap:6px; margin:0 0 3px; font-size:10px; letter-spacing:.06em; }
      .relativeAudibilityCard.a h3 { color:#f2c36b; } .relativeAudibilityCard.b h3 { color:#ffb45a; }
      .relativeAudibilityScore { color:#dceee9; font:10px ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:0; white-space:nowrap; }
      .relativeMarginRail { position:relative; height:13px; margin:4px 0 15px; overflow:visible; border:1px solid rgba(143,232,219,.20); border-radius:2px; background:repeating-linear-gradient(90deg,rgba(170,205,220,.09) 0 1px,transparent 1px 10%); }
      .relativeMarginHistory { position:absolute; inset:1px; pointer-events:none; }
      .relativeMarginFill { position:absolute; top:4px; height:4px; background:#f2c36b; }
      .relativeAudibilityCard.b .relativeMarginFill { background:#ff9f2a; }
      .relativeMarginZero { position:absolute; left:44.444%; top:-2px; bottom:-2px; width:1px; background:rgba(220,238,233,.82); }
      .relativeMarginScale { position:absolute; top:16px; left:0; right:0; color:#8ca9a2; font:8px ui-monospace,SFMono-Regular,Menlo,monospace; }
      .relativeMarginScale span { position:absolute; white-space:nowrap; } .relativeMarginScale span:first-child { left:0; } .relativeMarginScale span:nth-child(2) { left:44.444%; transform:translateX(-50%); } .relativeMarginScale span:last-child { right:0; }
      .relativeAudibilityCanvas { display:block; width:100%; height:128px; border-radius:3px; background:rgba(0,0,0,.26); }
      .relativeAudibilityLegend { display:flex; justify-content:space-between; gap:8px; margin-top:4px; color:#8ca9a2; font:8px ui-monospace,SFMono-Regular,Menlo,monospace; }
      .relativeAudibilityNote { margin-top:6px; line-height:1.35; }
      @media (max-width:620px) { .relativeAudibilityCards { grid-template-columns:1fr; } }
    </style>
    <div class="relativeAudibilityHeader"><span>RELATIVE MASKING MARGIN</span><span class="relativeAudibilityState">WAITING FOR PLAYBACK</span></div>
    <div class="relativeAudibilityCards">
      <article class="relativeAudibilityCard a"><h3><span>LISTENER A · CONTENT MARGIN</span><span class="relativeAudibilityScore">—</span></h3><div class="relativeMarginRail" aria-label="Listener A weighted content margin history"><i class="relativeMarginHistory"></i><i class="relativeMarginFill"></i><b class="relativeMarginZero"></b><div class="relativeMarginScale"><span>−24</span><span>0</span><span>+30 dB</span></div></div><canvas class="relativeAudibilityCanvas" aria-label="Listener A program and background energy"></canvas><div class="relativeAudibilityLegend"><span>Program A</span><span>Scene + Ambient</span></div></article>
      <article class="relativeAudibilityCard b"><h3><span>LISTENER B · SPILL MARGIN</span><span class="relativeAudibilityScore">—</span></h3><div class="relativeMarginRail" aria-label="Listener B weighted spill margin history"><i class="relativeMarginHistory"></i><i class="relativeMarginFill"></i><b class="relativeMarginZero"></b><div class="relativeMarginScale"><span>−24</span><span>0</span><span>+30 dB</span></div></div><canvas class="relativeAudibilityCanvas" aria-label="Listener B spill and background energy"></canvas><div class="relativeAudibilityLegend"><span>Program A spill</span><span>Scene + Ambient</span></div></article>
    </div>
    <div class="relativeAudibilityNote">Paired bars are raw 1/3-octave energy: gold/orange is Program A, blue-violet is combined Scene + Ambient. The margin score weights active Program A bands with a fixed 1 kHz-relative hearing emphasis. Illustrative; not SPL, phon, SII or a validated masking model.</div>
  `;

  const canvases = Array.from(container.querySelectorAll('canvas'));
  const scores = Array.from(container.querySelectorAll('.relativeAudibilityScore'));
  const stateLabel = container.querySelector('.relativeAudibilityState');
  const marginRails = Array.from(container.querySelectorAll('.relativeMarginRail'));
  const marginHistory = Array.from(container.querySelectorAll('.relativeMarginHistory'));
  const marginFills = Array.from(container.querySelectorAll('.relativeMarginFill'));
  const marginState = [createTemporalIndicator({ min: -24, max: 30, binCount: 10, historyMs: 15000, timeConstantMs: 5000, valueAttackMs: 60, valueReleaseMs: 400 }), createTemporalIndicator({ min: -24, max: 30, binCount: 10, historyMs: 15000, timeConstantMs: 5000, valueAttackMs: 60, valueReleaseMs: 400 })];
  const state = { aContent: null, bContent: null, scene: null, ambient: null };
  let lastHistoryPushMs = 0;
  let lastTextRenderMs = 0;

  function draw(canvas, contentFrame, programColour) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const scale = window.devicePixelRatio || 1;
    if (canvas.width !== width * scale || canvas.height !== height * scale) {
      canvas.width = width * scale;
      canvas.height = height * scale;
    }

    const context = canvas.getContext('2d');
    const left = 20, right = 5, top = 13, bottom = 20;
    const plotWidth = Math.max(1, width - left - right);
    const plotHeight = Math.max(1, height - top - bottom);
    const yForDb = value => top + (0 - clamp(value, -60, 0)) / 60 * plotHeight;
    const content = bandMap(contentFrame);
    const scene = bandMap(state.scene);
    const ambient = bandMap(state.ambient);
    let weightSum = 0, weightedMargin = 0;

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);
    context.font = '8px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.textBaseline = 'middle';

    [-60, -30, 0].forEach(value => {
      const y = yForDb(value);
      context.strokeStyle = 'rgba(170,205,220,.13)';
      context.beginPath(); context.moveTo(left, y); context.lineTo(width - right, y); context.stroke();
      context.fillStyle = 'rgba(170,205,220,.58)';
      context.fillText(String(value), 1, y);
    });

    OCTAVE_DIVIDERS.forEach(frequency => {
      const x = xForFrequency(frequency, left, plotWidth);
      context.strokeStyle = 'rgba(126,230,215,.20)';
      context.beginPath(); context.moveTo(x, top); context.lineTo(x, top + plotHeight); context.stroke();
    });

    for (const [frequency, programDb] of content) {
      const x = xForFrequency(frequency, left, plotWidth);
      const sceneDb = scene.get(frequency) ?? -100;
      const ambientDb = ambient.get(frequency) ?? -100;
      const backgroundDb = energyToDb(dbToEnergy(sceneDb) + dbToEnergy(ambientDb));
      const marginDb = programDb - backgroundDb;
      const importance = dbToEnergy(programDb - interpolateRequirementDb(frequency));
      const pairWidth = Math.max(4, plotWidth / 90);
      const backgroundX = x - pairWidth * .72;
      const programX = x + pairWidth * .30;

      // EN: Bars remain raw dBFS; paired geometry makes the current spectral winner obvious.
      context.fillStyle = 'rgba(132,157,194,.72)';
      context.fillRect(backgroundX, yForDb(backgroundDb), pairWidth * .52, top + plotHeight - yForDb(backgroundDb));
      context.fillStyle = programColour;
      context.fillRect(programX, yForDb(programDb), pairWidth * .52, top + plotHeight - yForDb(programDb));

      weightSum += importance;
      weightedMargin += importance * clamp(marginDb, -24, 30);
    }

    OCTAVE_LABELS.forEach(([frequency, label]) => {
      const x = xForFrequency(frequency, left, plotWidth);
      context.fillStyle = 'rgba(170,205,220,.68)';
      context.textAlign = 'center';
      context.textBaseline = 'alphabetic';
      context.fillText(label, x, height - 3);
    });
    context.textAlign = 'start';
    return weightSum > 1e-12 ? weightedMargin / weightSum : null;
  }

  function renderMargin(index, nowMs, margin) {
    const snapshot = marginState[index].snapshot(nowMs);
    const percent = clamp((snapshot.value + 24) / 54 * 100, 0, 100);
    const zeroPercent = 24 / 54 * 100;
    marginHistory[index].style.backgroundImage = historyGradient(snapshot.bins, index === 0 ? '242,195,107' : '255,159,42');
    marginFills[index].style.left = String(Math.min(percent, zeroPercent)) + '%';
    marginFills[index].style.width = String(Math.abs(percent - zeroPercent)) + '%';
    marginRails[index].classList.toggle('belowMask', margin < 0);
  }

  function render() {
    if (!state.aContent || !state.bContent || !state.scene || !state.ambient) return;
    const now = performance.now();
    stateLabel.textContent = 'LIVE · OBSERVER ONLY';
    const margins = [draw(canvases[0], state.aContent, '#f2c36b'), draw(canvases[1], state.bContent, '#ff9f2a')];
    if (now - lastHistoryPushMs >= 50) {
      margins.forEach((margin, index) => { if (Number.isFinite(margin)) marginState[index].push({ value: margin, timeMs: now }); });
      lastHistoryPushMs = now;
    }
    margins.forEach((margin, index) => renderMargin(index, now, margin));
    if (now - lastTextRenderMs >= 250) {
      margins.forEach((margin, index) => { scores[index].textContent = formatMargin(margin); });
      lastTextRenderMs = now;
    }
  }

  return {
    setFrame(key, frame) {
      if (!(key in state)) return;
      state[key] = frame;
      render();
    },
    reset() {
      state.aContent = state.bContent = state.scene = state.ambient = null;
      stateLabel.textContent = 'WAITING FOR PLAYBACK';
      scores.forEach(score => { score.textContent = '—'; });
      marginState.forEach(indicator => indicator.reset());
      marginHistory.forEach(history => { history.style.backgroundImage = 'none'; });
      marginFills.forEach(fill => { fill.style.width = '0'; });
      lastHistoryPushMs = 0; lastTextRenderMs = 0;
      canvases.forEach(canvas => canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height));
    }
  };
}
