// Content descriptor analysis prototype for Spill Lab.
// EN: Analysis is observation-only. It must never change Program A gain or remix the source.

import { createCharacterMeter } from './character-meter.js?v=8.6';
import { createPresentationOutputHistory } from './presentation-output-indicator.js?rev=v9.8';

const UPDATE_MS = 200;
const DISPLAY_MS = 1000;
const LOW_MIN_HZ = 20;
const LOW_MAX_HZ = 120;
const BAR_MIN_DB = -60;
const BAR_MAX_DB = 0;
const FAST_PEAK_MS = 50;

let characterMeter = null;
let activeAnalyzer = null;
let presentationOutputHistories = { reference: null, surface: null, fog: null, ribbonFog: null, peakHalo: null, setupFog: null, setupPeakHalo: null };
let presentationMiniState = { volumeDb: -12, outputRms: -Infinity, outputPeak: -Infinity, bassReductionDb: 0, guardReductionDb: 0, particles: [] };

function dbFromLinear(value) {
  return value > 1e-12 ? 20 * Math.log10(value) : -Infinity;
}

function formatDb(value) {
  if (!Number.isFinite(value) || value < -120) return '—';
  return `${value.toFixed(1)} dBFS`;
}

function percentile(values, q) {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return -Infinity;
  const pos = (finite.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return finite[lo];
  const mix = pos - lo;
  return finite[lo] * (1 - mix) + finite[hi] * mix;
}

function rmsOfTail(buffer, sampleCount) {
  const start = Math.max(0, buffer.length - sampleCount);
  let sum = 0;
  let count = 0;
  for (let i = start; i < buffer.length; i++) {
    const sample = buffer[i];
    sum += sample * sample;
    count++;
  }
  return count ? Math.sqrt(sum / count) : 0;
}

function peakOfTail(buffer, sampleCount) {
  const start = Math.max(0, buffer.length - sampleCount);
  let peak = 0;
  for (let i = start; i < buffer.length; i++) peak = Math.max(peak, Math.abs(buffer[i]));
  return peak;
}

function classifyProfile({ p50, p95, p99, eventDensity }) {
  if (!Number.isFinite(p95)) return 'waiting for program';
  const spread = Number.isFinite(p50) ? p95 - p50 : 0;
  const extreme = Number.isFinite(p99) ? p99 - p95 : 0;
  if (eventDensity < 0.12 && (spread > 7 || extreme > 4)) return 'sparse / event-driven bass';
  if (eventDensity > 0.4 && spread < 6) return 'sustained bass';
  if (spread > 8 || extreme > 5) return 'highly dynamic bass';
  return 'moderate / mixed bass';
}

function ensurePanel() {
  if (typeof document === 'undefined') return null;
  const existing = document.getElementById('contentFeelnessPanel');
  if (existing) return existing;

  const panel = document.createElement('section');
  panel.id = 'contentFeelnessPanel';
  panel.className = 'controlBox wide labOnly';
  panel.innerHTML = `
    <style>
      #contentFeelnessPanel .cfHeader { margin-bottom:12px; }
      #contentFeelnessPanel .cfMeterLayout { display:grid; grid-template-columns:300px minmax(340px,420px) minmax(300px,460px); gap:12px; margin-top:12px; align-items:stretch; justify-content:start; }
      #contentFeelnessPanel .cfMeterColumn { width:100%; max-width:300px; }
      #contentFeelnessPanel #cfCharacterMeter { width:100%; height:214px; background:rgba(0,0,0,.20); border:1px solid #303030; }
      #contentFeelnessPanel .cfProtectionLanes { margin-top:8px; padding:7px; border:1px solid rgba(169,194,205,.20); border-radius:6px; background:rgba(13,21,25,.52); }
      #contentFeelnessPanel .cfProtectionLane + .cfProtectionLane { margin-top:8px; }
      #contentFeelnessPanel .cfProtectionLabel { color:#aebdc4; font:9px ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.08em; }
      #contentFeelnessPanel .cfProtectionTrack { position:relative; height:5px; margin-top:4px; overflow:hidden; border-radius:3px; background:rgba(170,200,210,.16); }
      #contentFeelnessPanel .cfProtectionTrack::after { content:''; position:absolute; right:0; top:0; bottom:0; width:1px; background:rgba(255,190,130,.72); }
      #contentFeelnessPanel .cfProtectionFill { position:absolute; right:0; top:0; bottom:0; width:0; background:linear-gradient(270deg,#ff6d61,#a94039); transition:width .05s linear, opacity .12s ease; opacity:0; }
      #contentFeelnessPanel .cfProtectionLane.reducing .cfProtectionFill { opacity:1; }
      #contentFeelnessPanel .cfProtectionLane.reducing .cfProtectionLabel { color:#ff988b; }
      #contentFeelnessPanel .cfPresentationMini { width:min(100%,620px); justify-self:start; align-self:start; min-height:0; padding:7px 8px 8px; border:1px solid #303030; border-radius:7px; background:rgba(15,20,23,.78); }
      #contentFeelnessPanel .cfMiniTitle { color:#aebdc4; font:8px ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.10em; }
      #contentFeelnessPanel .cfMiniLabel,#contentFeelnessPanel .cfMiniHint { display:none; }
      #contentFeelnessPanel .cfDemoComparator { margin-top:12px; padding-top:9px; border-top:1px solid rgba(174,190,195,.24); }
      #contentFeelnessPanel .cfDemoControl { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:10px; margin-top:6px; }
      #contentFeelnessPanel .cfDemoControl button { padding:2px 0; border:0; background:transparent; color:#aebcbc; font:700 9px/1 Arial,sans-serif; white-space:nowrap; }
      #contentFeelnessPanel .cfDemoSegments { position:relative; display:flex; gap:2px; min-width:0; }
      #contentFeelnessPanel .cfDemoSegments span { position:relative; z-index:1; flex:1; height:4px; border-radius:1px; background:#383d3d; }
      #contentFeelnessPanel .cfDemoSegments span.on { background:#f0f6f6; }
      /* EN: Muted green distinguishes low-band protection from the red final output guard. */
      #contentFeelnessPanel .cfDemoSegments span.limiterStep { background:#5e875b; }
      /* EN: Long RMS history is deliberately taller than the four-pixel VOL ribbon. */
      #contentFeelnessPanel .cfDemoRibbonFog { position:absolute; z-index:0; inset:-10px 0 -10px; overflow:hidden; pointer-events:none; }
      #contentFeelnessPanel .cfRibbonFogTrace { position:absolute; height:16px; border-radius:8px; background:linear-gradient(90deg,rgba(116,193,188,.22),rgba(235,255,252,.98),rgba(116,193,188,.22)); box-shadow:0 0 11px rgba(126,230,215,.42); transform:translateY(-50%); }
      /* EN: Fast peak sits above the static VOL tiles; it is a short halo, not a second history. */
      #contentFeelnessPanel .cfDemoPeakHalo { position:absolute; z-index:2; inset:-12px 0 auto; height:10px; overflow:visible; pointer-events:none; }
      #contentFeelnessPanel .cfPeakHaloTrace { position:absolute; height:2px; border-radius:2px; background:linear-gradient(90deg,rgba(194,255,244,.08),rgba(244,255,253,1),rgba(194,255,244,.08)); box-shadow:0 0 6px rgba(187,255,244,.82); transform:translateY(-50%); }
      #contentFeelnessPanel .cfMiniSegments { position:relative; display:flex; gap:2px; height:22px; margin-top:6px; overflow:visible; }
      #contentFeelnessPanel .cfMiniSegment { height:4px; flex:1; border-radius:1px; background:#1b2529; transition:background .42s ease; }
      #contentFeelnessPanel .cfMiniSegment.active { background:#62797c; }
      /* EN: The limiter shade is a translucent overlay over the active VOL grey, never a replacement that can turn black. */
      #contentFeelnessPanel .cfMiniSegment.active.reducing { background:linear-gradient(90deg,rgba(16,27,31,calc(.18 + var(--dim,0) * .17)) 0%,rgba(16,27,31,calc(.09 + var(--dim,0) * .08)) 52%,rgba(16,27,31,0) 100%),#62797c; }
      #contentFeelnessPanel .cfMiniSegment.gain { background:linear-gradient(90deg,#62797c 0%,#91a9aa 100%); }
      #contentFeelnessPanel .cfMiniParticles { position:absolute; z-index:2; inset:0; pointer-events:none; overflow:visible; }
      #contentFeelnessPanel .cfMiniTrace { position:absolute; height:1px; border-radius:1px; background:#baf6ed; box-shadow:0 0 3px rgba(126,230,215,.42); transform:translateY(-50%); }
      #contentFeelnessPanel .cfOutputHistoryAlign { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:10px; align-items:center; margin-top:5px; }
      #contentFeelnessPanel .cfOutputHistorySpacer { visibility:hidden; padding:2px 0; font:700 9px/1 Arial,sans-serif; white-space:nowrap; }
      #contentFeelnessPanel .cfOutputSurface { position:relative; height:40px; overflow:hidden; border-radius:3px; }
      #contentFeelnessPanel .cfOutputSurfaceTrace { position:absolute; height:5px; border-radius:2px; background:linear-gradient(90deg,rgba(116,193,188,.34),rgba(209,252,245,.90),rgba(116,193,188,.34)); box-shadow:0 0 4px rgba(126,230,215,.28); transform:translateY(-50%); }
      #contentFeelnessPanel .cfOutputFogTrace { position:absolute; height:9px; border-radius:5px; background:linear-gradient(90deg,rgba(116,193,188,.20),rgba(235,255,252,.96),rgba(116,193,188,.20)); box-shadow:0 0 8px rgba(126,230,215,.34); transform:translateY(-50%); }
      #contentFeelnessPanel .cfOutputSurfaceExperiment { margin-top:11px; padding-top:8px; border-top:1px solid rgba(174,190,195,.18); }
      #contentFeelnessPanel .cfMiniGuard { position:absolute; z-index:4; right:-5px; top:3px; width:9px; height:8px; border-radius:1px; background:#ff6257; opacity:0; transform:scaleX(.38); transform-origin:left center; transition:opacity .10s ease,transform .12s ease; pointer-events:none; }
      #contentFeelnessPanel .cfMiniSegments.guarding .cfMiniGuard { opacity:1; transform:scaleX(1); }
      #contentFeelnessPanel .cfSummaryCard { background:#141414; border:1px solid #303030; border-radius:9px; padding:12px; }
      #contentFeelnessPanel .cfSummaryLabel { color:var(--muted); font-size:11px; letter-spacing:.04em; text-transform:uppercase; }
      #contentFeelnessPanel .cfProfile { color:#f2c36b; font-size:15px; font-weight:700; margin:5px 0 12px; }
      #contentFeelnessPanel .cfHint { color:var(--muted); font-size:11px; line-height:1.35; margin:7px 0 0; }
      @media (max-width:1120px) { #contentFeelnessPanel .cfMeterLayout { grid-template-columns:300px minmax(340px,1fr); } #contentFeelnessPanel .cfSummaryCard { grid-column:1 / -1; } }
      @media (max-width:640px) { #contentFeelnessPanel .cfMeterLayout { grid-template-columns:1fr; } #contentFeelnessPanel .cfMeterColumn { max-width:none; } #contentFeelnessPanel #cfCharacterMeter { max-width:none; } }
    </style>
    <div class="cfHeader">
      <h2 style="margin-bottom:4px;">Content analysis · experimental</h2>
      <div class="smallNote" style="margin:0;">Content diagnostics: Program A after reference trim · limiter detector: post-limiter · observation only.</div>
    </div>
    <div class="cfMeterLayout">
      <div class="cfMeterColumn">
        <canvas id="cfCharacterMeter" aria-label="Program content level meters"></canvas>
        <div class="cfProtectionLanes" aria-label="Protection activity">
          <div id="cfLimiterLane" class="cfProtectionLane" aria-label="Bass protection activity">
            <div class="cfProtectionLabel">BASS PROTECTION</div>
            <div class="cfProtectionTrack"><i id="cfLimiterReductionFill" class="cfProtectionFill"></i></div>
          </div>
          <div id="cfGuardLane" class="cfProtectionLane" aria-label="Final output guard activity">
            <div class="cfProtectionLabel">OUTPUT GUARD</div>
            <div class="cfProtectionTrack"><i id="cfGuardReductionFill" class="cfProtectionFill"></i></div>
          </div>
        </div>
      </div>
      <div id="cfPresentationMini" class="cfPresentationMini" aria-label="Presentation volume and output miniature">
        <div class="cfMiniTitle">PRESENTATION</div><div class="cfMiniLabel">VOL</div>
        <div id="cfMiniSegments" class="cfMiniSegments"><i class="cfMiniSegment"></i><i class="cfMiniSegment"></i><i class="cfMiniSegment"></i><i class="cfMiniSegment"></i><i class="cfMiniSegment"></i><i class="cfMiniSegment"></i><i class="cfMiniSegment"></i><span id="cfMiniParticles" class="cfMiniParticles"></span><i class="cfMiniGuard"></i></div>
        <div class="cfMiniHint">set · output · protection</div>
        <div class="cfDemoComparator" aria-label="Demo presentation comparison"><div class="cfMiniTitle">DEMO − / + · CANDIDATE</div><div class="cfDemoControl"><button id="cfDemoVolDown" type="button">DEMO −</button><div id="cfDemoSegments" class="cfDemoSegments"><div id="cfDemoRibbonFog" class="cfDemoRibbonFog"></div><div id="cfDemoPeakHalo" class="cfDemoPeakHalo"></div><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><button id="cfDemoVolUp" type="button">DEMO +</button></div></div>
        <div class="cfOutputSurfaceExperiment" aria-label="Output history surface experiment"><div class="cfMiniTitle">OUTPUT SURFACE · A</div><div class="cfOutputHistoryAlign"><span class="cfOutputHistorySpacer">DEMO −</span><div id="cfOutputSurfaceA" class="cfOutputSurface"></div><span class="cfOutputHistorySpacer">DEMO +</span></div></div>
        <div class="cfOutputSurfaceExperiment" aria-label="Output history fog experiment"><div class="cfMiniTitle">OUTPUT FOG · B</div><div class="cfOutputHistoryAlign"><span class="cfOutputHistorySpacer">DEMO −</span><div id="cfOutputFogB" class="cfOutputSurface"></div><span class="cfOutputHistorySpacer">DEMO +</span></div></div>
      </div>
      <div class="cfSummaryCard">
        <div class="cfSummaryLabel">Content summary</div>
        <div id="cfProfile" class="cfProfile">waiting for program</div>
        <div id="cfEventDensity" class="cfHint">Collecting program history</div>
        <div id="cfLimiterSummary" class="cfHint">Limiter: monitoring protected output</div>
        <div style="border-top:1px solid #303030;margin:12px 0 9px;"></div>
        <div id="contentFeelnessState" class="cfHint">waiting for playback</div>
        <div id="cfSessionSummary" class="cfHint">Session integrated K estimate: waiting for playback</div>
        <div id="cfOfflineSummary" class="cfHint">Offline Program A analysis appears here after a track is analysed.</div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;">
          <button id="cfPauseAnalysis" type="button">Pause analysis</button>
          <button id="cfResetAnalysis" type="button">Reset analysis</button>
        </div>
      </div>
    </div>
    <details>
      <summary>Numerical details</summary>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px;">
        <div class="metric"><div class="label">Full-band RMS · 400 ms</div><div id="cfFullRms" class="number">—</div></div>
        <div class="metric"><div class="label">Full-band peak · 400 ms</div><div id="cfFullPeak" class="number">—</div></div>
        <div class="metric"><div class="label">Low band · 20–120 Hz · 400 ms</div><div id="cfLowRms" class="number">—</div></div>
        <div class="metric"><div class="label">Low-band p50</div><div id="cfP50" class="number">—</div></div>
        <div class="metric"><div class="label">Low-band p95</div><div id="cfP95" class="number">—</div></div>
        <div class="metric"><div class="label">Low-band p99</div><div id="cfP99" class="number">—</div></div>
        <div class="metric"><div class="label">Low-band max</div><div id="cfMax" class="number">—</div></div>
        <div class="metric"><div class="label">Full-band crest · 400 ms</div><div id="cfCrest" class="number">—</div></div>
      </div>
    </details>
  `;

  characterMeter?.destroy();
  characterMeter = createCharacterMeter(panel.querySelector('#cfCharacterMeter'));
  // EN: Both Lab views receive the same post-gain samples; only their visual language differs.
  presentationOutputHistories.reference?.destroy();
  presentationOutputHistories.surface?.destroy();
  presentationOutputHistories.fog?.destroy();
  presentationOutputHistories.ribbonFog?.destroy();
  presentationOutputHistories.peakHalo?.destroy();
  presentationOutputHistories.setupFog?.destroy();
  presentationOutputHistories.setupPeakHalo?.destroy();
  presentationOutputHistories = {
    reference: createPresentationOutputHistory(panel.querySelector('#cfMiniParticles'), { mode: 'reference', maxSamples: 10, lifetimeMs: 2000 }),
    surface: createPresentationOutputHistory(panel.querySelector('#cfOutputSurfaceA'), { mode: 'surface', maxSamples: 10, lifetimeMs: 2000 }),
    fog: createPresentationOutputHistory(panel.querySelector('#cfOutputFogB'), { mode: 'fog', maxSamples: 10, lifetimeMs: 2000 }),
    ribbonFog: createPresentationOutputHistory(panel.querySelector('#cfDemoRibbonFog'), { mode: 'ribbonFog', maxSamples: 10, lifetimeMs: 2000 }),
    peakHalo: createPresentationOutputHistory(panel.querySelector('#cfDemoPeakHalo'), { mode: 'peakHalo', maxSamples: 3, lifetimeMs: 260 }),
    // EN: Demo setup reuses the same observer samples; it is not a second audio-analysis branch.
    setupFog: createPresentationOutputHistory(document.getElementById('labDemoVolumeRibbonFog'), { mode: 'setupFog', maxSamples: 10, lifetimeMs: 2000 }),
    setupPeakHalo: createPresentationOutputHistory(document.getElementById('labDemoVolumePeakHalo'), { mode: 'setupPeakHalo', maxSamples: 3, lifetimeMs: 260 }),
  };
  // EN: Analysis controls only change observer state; the audible graph is untouched.
  panel.querySelector('#cfPauseAnalysis')?.addEventListener('click', () => activeAnalyzer?.togglePause());
  panel.querySelector('#cfResetAnalysis')?.addEventListener('click', () => activeAnalyzer?.reset());

  // EN: Keep the active content observer next to the Room profile controls used for listening tests.
  const placement = document.getElementById('contentAnalysisPlacement');
  if (placement?.parentNode) placement.parentNode.insertBefore(panel, placement.nextSibling);
  else {
    const titles = Array.from(document.querySelectorAll('.labSectionTitle'));
    const diagnosticsTitle = titles.find(node => /Lab diagnostics/i.test(node.textContent || ''));
    if (diagnosticsTitle?.parentNode) diagnosticsTitle.parentNode.insertBefore(panel, diagnosticsTitle);
    else document.body.appendChild(panel);
  }
  return panel;
}

function panelRefs() {
  const panel = ensurePanel();
  if (!panel) return null;
  const id = name => panel.querySelector(`#${name}`);
  return {
    state: id('contentFeelnessState'), session: id('cfSessionSummary'), offline: id('cfOfflineSummary'),
    headroomRms: id('cfHeadroomRms'), headroomPeak: id('cfHeadroomPeak'),
    lowP50Bar: id('cfLowP50'), lowP95Bar: id('cfLowP95'), lowP99Bar: id('cfLowP99'), lowMaxBar: id('cfLowMax'),
    eventFill: id('cfEventFill'), fullRms: id('cfFullRms'), fullPeak: id('cfFullPeak'), lowRms: id('cfLowRms'),
    p50: id('cfP50'), p95: id('cfP95'), p99: id('cfP99'), max: id('cfMax'), crest: id('cfCrest'),
    profile: id('cfProfile'), eventDensity: id('cfEventDensity'), limiterSummary: id('cfLimiterSummary'),
    limiterLane: id('cfLimiterLane'), limiterReductionFill: id('cfLimiterReductionFill'),
    guardLane: id('cfGuardLane'), guardReductionFill: id('cfGuardReductionFill'),
    mini: id('cfPresentationMini'), miniSegments: id('cfMiniSegments'),
    miniParticles: id('cfMiniParticles')
  };
  activeAnalyzer = api;
  return api;
}

function renderPresentationMini(partial = {}) {
  presentationMiniState = { ...presentationMiniState, ...partial };
  const refs = panelRefs();
  if (!refs?.miniSegments) return;
  const volumeRatio = Math.max(0, Math.min(1, (presentationMiniState.volumeDb + 36) / 36));
  const filledCount = Math.round(volumeRatio * 6) + 1;
  const gainCount = presentationMiniState.bassGainDb > .05 ? Math.min(7 - filledCount, Math.ceil(presentationMiniState.bassGainDb / 6)) : 0;
  Array.from(refs.miniSegments.children).filter(node => node.classList.contains('cfMiniSegment')).forEach((segment, index) => {
    const active = index < filledCount;
    const localReductionDb = active ? Math.max(0, presentationMiniState.bassReductionDb - (filledCount - 1 - index) * 6) : 0;
    const reducing = localReductionDb > .05;
    const gain = !active && index < filledCount + gainCount;
    // EN: The right edge stays grey; limiter action darkens only the tile interior.
    segment.classList.toggle('active', active);
    segment.classList.toggle('reducing', reducing);
    segment.classList.toggle('gain', gain);
    segment.style.setProperty('--dim', Math.min(1, localReductionDb / 6).toFixed(3));
  });
  const hasOutputSample = Number.isFinite(partial.outputRms) && Number.isFinite(partial.outputPeak);
  if (hasOutputSample) {
    // EN: Measurement supplies samples only; the shared module keeps existing history alive through pause/load transitions.
    const referenceSample = { rmsDb: partial.outputRms, peakDb: partial.outputPeak };
    const surfaceSample = { rmsDb: partial.outputRms, peakDb: Number.isFinite(partial.outputSurfacePeak) ? partial.outputSurfacePeak : partial.outputPeak };
    presentationOutputHistories.reference?.pushSample(referenceSample);
    presentationOutputHistories.surface?.pushSample(surfaceSample);
    presentationOutputHistories.fog?.pushSample(surfaceSample);
    presentationOutputHistories.ribbonFog?.pushSample(surfaceSample);
    presentationOutputHistories.peakHalo?.pushSample(referenceSample);
    presentationOutputHistories.setupFog?.pushSample(surfaceSample);
    presentationOutputHistories.setupPeakHalo?.pushSample(referenceSample);
  }
  refs.miniSegments.classList.toggle('guarding', presentationMiniState.guardReductionDb > .05);
}

function renderProtectionLane(lane, fill, reductionDb) {
  const reduction = Number.isFinite(reductionDb) ? Math.max(0, reductionDb) : 0;
  const active = reduction > .05;
  if (fill) fill.style.width = `${Math.min(100, reduction / 6 * 100)}%`;
  if (lane) lane.classList.toggle('reducing', active);
}

function renderLimiterReduction(reductionDb) {
  const refs = panelRefs();
  if (refs) renderProtectionLane(refs.limiterLane, refs.limiterReductionFill, reductionDb);
}

function renderOutputGuardReduction(reductionDb) {
  const refs = panelRefs();
  if (refs) renderProtectionLane(refs.guardLane, refs.guardReductionFill, reductionDb);
}

function dbPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, (value - BAR_MIN_DB) / (BAR_MAX_DB - BAR_MIN_DB) * 100));
}

function setWidth(node, percent) {
  if (node) node.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function setMarker(node, value) {
  if (node) node.style.left = `${dbPercent(value)}%`;
}

function gatedSessionEstimate(energies) {
  const valid = energies.filter(energy => Number.isFinite(energy) && energy > 0);
  if (!valid.length) return null;
  const absolute = valid.filter(energy => dbFromLinear(Math.sqrt(energy)) >= -70);
  if (!absolute.length) return null;
  const mean = absolute.reduce((sum, value) => sum + value, 0) / absolute.length;
  const relativeThreshold = mean / 10; // −10 LU relative gate in energy.
  const relative = absolute.filter(energy => energy >= relativeThreshold);
  if (!relative.length) return null;
  return dbFromLinear(Math.sqrt(relative.reduce((sum, value) => sum + value, 0) / relative.length));
}

export function setContentAnalysisOfflineSummary(text) {
  const refs = panelRefs();
  if (refs?.offline) refs.offline.textContent = text;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensurePanel, { once: true });
  else ensurePanel();
}

export function createContentFeelnessAnalyzer(ctx, sourceNode, { detectorSourceNode = sourceNode, outputPreGuardNode = null } = {}) {
  const fullAnalyser = ctx.createAnalyser();
  fullAnalyser.fftSize = 32768;
  fullAnalyser.smoothingTimeConstant = 0;

  const hp1 = ctx.createBiquadFilter();
  const hp2 = ctx.createBiquadFilter();
  const lp1 = ctx.createBiquadFilter();
  const lp2 = ctx.createBiquadFilter();
  for (const hp of [hp1, hp2]) { hp.type = 'highpass'; hp.frequency.value = LOW_MIN_HZ; hp.Q.value = 0.707; }
  for (const lp of [lp1, lp2]) { lp.type = 'lowpass'; lp.frequency.value = LOW_MAX_HZ; lp.Q.value = 0.707; }

  const lowAnalyser = ctx.createAnalyser();
  lowAnalyser.fftSize = 32768;
  lowAnalyser.smoothingTimeConstant = 0;
  const detectorHp1=ctx.createBiquadFilter(),detectorHp2=ctx.createBiquadFilter(),detectorLp1=ctx.createBiquadFilter(),detectorLp2=ctx.createBiquadFilter();
  for(const hp of[detectorHp1,detectorHp2]){hp.type='highpass';hp.frequency.value=20;hp.Q.value=.707;}
  for(const lp of[detectorLp1,detectorLp2]){lp.type='lowpass';lp.frequency.value=90;lp.Q.value=.707;}
  const detectorAnalyser=ctx.createAnalyser();detectorAnalyser.fftSize=32768;detectorAnalyser.smoothingTimeConstant=0;
  const outputAnalyser=outputPreGuardNode?ctx.createAnalyser():null;
  if(outputAnalyser){outputAnalyser.fftSize=32768;outputAnalyser.smoothingTimeConstant=0;}

  // EN: The session branch mirrors the lab's live K-style observer and remains fully silent.
  const sessionHp = ctx.createBiquadFilter();
  sessionHp.type = 'highpass';
  sessionHp.frequency.value = 38;
  sessionHp.Q.value = 0.5;
  const sessionShelf = ctx.createBiquadFilter();
  sessionShelf.type = 'highshelf';
  sessionShelf.frequency.value = 1500;
  sessionShelf.gain.value = 4;
  const sessionAnalyser = ctx.createAnalyser();
  sessionAnalyser.fftSize = 32768;
  sessionAnalyser.smoothingTimeConstant = 0;

  const silentSink = ctx.createGain();
  silentSink.gain.value = 0;
  // EN: Side-chain taps are silent and do not alter the audible Program A path.
  sourceNode.connect(fullAnalyser); fullAnalyser.connect(silentSink);
  sourceNode.connect(hp1); hp1.connect(hp2); hp2.connect(lp1); lp1.connect(lp2); lp2.connect(lowAnalyser); lowAnalyser.connect(silentSink);
  // EN: The limiter detector may observe post-limiter output while the content diagnostics retain their pre-protection reference.
  detectorSourceNode.connect(detectorHp1);detectorHp1.connect(detectorHp2);detectorHp2.connect(detectorLp1);detectorLp1.connect(detectorLp2);detectorLp2.connect(detectorAnalyser);detectorAnalyser.connect(silentSink);
  // EN: Final selected-listener mix is observed immediately before the full-band output guard.
  if(outputAnalyser){outputPreGuardNode.connect(outputAnalyser);outputAnalyser.connect(silentSink);}
  sourceNode.connect(sessionHp); sessionHp.connect(sessionShelf); sessionShelf.connect(sessionAnalyser); sessionAnalyser.connect(silentSink);
  silentSink.connect(ctx.destination);

  const fullBuffer = new Float32Array(fullAnalyser.fftSize);
  const lowBuffer = new Float32Array(lowAnalyser.fftSize);
  const detectorBuffer = new Float32Array(detectorAnalyser.fftSize);
  const outputBuffer = outputAnalyser?new Float32Array(outputAnalyser.fftSize):null;
  const sessionBuffer = new Float32Array(sessionAnalyser.fftSize);
  const windowSamples = Math.max(1, Math.round(ctx.sampleRate * 0.4));
  const fastPeakSamples = Math.max(1, Math.round(ctx.sampleRate * FAST_PEAK_MS / 1000));
  const lowHistory = [];
  const sessionEnergyHistory = [];
  let timer = null, running = false, latest = null, lastDisplay = 0, detectorLimitDb = null, limiterReductionDb = 0, outputGuardReductionDb = 0;
  // EN: Surface A holds peak width on a separate visual envelope; it does not alter audio measurement.
  let surfacePeakEnvelopeDb = -Infinity, surfacePeakEnvelopeAtMs = 0;
  function snapshot() { return latest ? { ...latest } : null; }

  function reset() {
    lowHistory.length = 0; sessionEnergyHistory.length = 0; latest = null; lastDisplay = 0;
    surfacePeakEnvelopeDb = -Infinity; surfacePeakEnvelopeAtMs = 0;
    presentationOutputHistories.reference?.clear(); presentationOutputHistories.surface?.clear(); presentationOutputHistories.fog?.clear(); presentationOutputHistories.ribbonFog?.clear(); presentationOutputHistories.peakHalo?.clear(); presentationOutputHistories.setupFog?.clear(); presentationOutputHistories.setupPeakHalo?.clear();
    const refs = panelRefs();
    if (refs) {
      refs.state.textContent = 'measuring…';
      refs.session.textContent = 'Session integrated K estimate: collecting…';
      for (const key of ['fullRms','fullPeak','lowRms','p50','p95','p99','max','crest']) refs[key].textContent = '—';
      characterMeter?.reset();
      const pauseButton = document.getElementById('cfPauseAnalysis');
      if (pauseButton) pauseButton.textContent = 'Pause analysis';
      setWidth(refs.headroomRms, 0); setMarker(refs.headroomPeak, -Infinity);
      setWidth(refs.lowP50Bar, 0); setMarker(refs.lowP95Bar, -Infinity); setMarker(refs.lowP99Bar, -Infinity); setMarker(refs.lowMaxBar, -Infinity);
      setWidth(refs.eventFill, 0); refs.profile.textContent = 'collecting program history'; refs.eventDensity.textContent = 'Collecting program history'; refs.limiterSummary.textContent = 'Limiter: monitoring protected output';
      renderLimiterReduction(0); renderOutputGuardReduction(0); renderPresentationMini({ outputRms: -Infinity, outputPeak: -Infinity });
    }
  }

  function measure() {
    if (!running) return;
    fullAnalyser.getFloatTimeDomainData(fullBuffer); lowAnalyser.getFloatTimeDomainData(lowBuffer); detectorAnalyser.getFloatTimeDomainData(detectorBuffer); sessionAnalyser.getFloatTimeDomainData(sessionBuffer); if(outputAnalyser&&outputBuffer)outputAnalyser.getFloatTimeDomainData(outputBuffer);
    const fullRms = dbFromLinear(rmsOfTail(fullBuffer, windowSamples));
    const fullPeak = dbFromLinear(peakOfTail(fullBuffer, windowSamples));
    const lowRms = dbFromLinear(rmsOfTail(lowBuffer, windowSamples));
    const lowPeak = dbFromLinear(peakOfTail(lowBuffer, windowSamples));
    const fullFastPeak = dbFromLinear(peakOfTail(fullBuffer, fastPeakSamples));
    const lowFastPeak = dbFromLinear(peakOfTail(lowBuffer, fastPeakSamples));
    const detectorRms=dbFromLinear(rmsOfTail(detectorBuffer,windowSamples)),detectorFastPeak=dbFromLinear(peakOfTail(detectorBuffer,fastPeakSamples));
    const outputRms=outputBuffer?dbFromLinear(rmsOfTail(outputBuffer,windowSamples)):null,outputFastPeak=outputBuffer?dbFromLinear(peakOfTail(outputBuffer,fastPeakSamples)):null;
    // EN: Surface A receives each 200 ms peak with instant attack and a 400 ms visual release.
    const outputSurfaceRawPeak=outputBuffer?dbFromLinear(peakOfTail(outputBuffer,Math.max(1,Math.round(ctx.sampleRate*UPDATE_MS/1000)))):null;
    const surfacePeakNow=performance.now();
    if (Number.isFinite(outputSurfaceRawPeak)) {
      const elapsed=Math.max(0,surfacePeakNow-surfacePeakEnvelopeAtMs);
      if (!Number.isFinite(surfacePeakEnvelopeDb) || outputSurfaceRawPeak >= surfacePeakEnvelopeDb) surfacePeakEnvelopeDb=outputSurfaceRawPeak;
      else surfacePeakEnvelopeDb=outputSurfaceRawPeak+(surfacePeakEnvelopeDb-outputSurfaceRawPeak)*Math.exp(-elapsed/400);
      surfacePeakEnvelopeAtMs=surfacePeakNow;
    }
    const outputSurfacePeak=Number.isFinite(surfacePeakEnvelopeDb)?surfacePeakEnvelopeDb:outputSurfaceRawPeak;
    const sessionEnergy = rmsOfTail(sessionBuffer, windowSamples) ** 2;
    if (Number.isFinite(sessionEnergy) && sessionEnergy > 1e-12) {
      sessionEnergyHistory.push({ t: performance.now(), energy: sessionEnergy });
    }
    if (Number.isFinite(lowRms) && lowRms > -120) lowHistory.push(lowRms);

    const sessionIntegrated = gatedSessionEstimate(sessionEnergyHistory.map(item => item.energy));
    characterMeter?.push({
      full: { rms: fullRms, livePeak: fullFastPeak, sessionK: sessionIntegrated, sessionSeconds: sessionEnergyHistory.length * UPDATE_MS / 1000 },
      low: { rms: lowRms, livePeak: lowFastPeak },
      detector: { rms: detectorRms, livePeak: detectorFastPeak, limit: detectorLimitDb },
      output: { rms: outputRms, livePeak: outputFastPeak, limit: -2, bassReductionDb: limiterReductionDb, guardReductionDb: outputGuardReductionDb }
    });
    // EN: Keep the 50 ms reference trace intact while Surface A receives the 200 ms frame peak.
    renderPresentationMini({ outputRms, outputPeak: outputFastPeak, outputSurfacePeak });
    const p50 = percentile(lowHistory, .50), p95 = percentile(lowHistory, .95), p99 = percentile(lowHistory, .99);
    const max = lowHistory.length ? Math.max(...lowHistory) : -Infinity;
    const crest = Number.isFinite(fullPeak) && Number.isFinite(fullRms) ? fullPeak - fullRms : -Infinity;
    const eventThreshold = Number.isFinite(p50) ? p50 + 6 : Infinity;
    const eventCount = lowHistory.filter(value => value >= eventThreshold).length;
    const eventDensity = lowHistory.length ? eventCount / lowHistory.length : 0;
    const profile = classifyProfile({ p50, p95, p99, eventDensity });
    latest = { fullRms, fullPeak, lowRms, detectorRms, outputRms, lowP50:p50, lowP95:p95, lowP99:p99, lowMax:max, crest, eventDensity, profile, sessionIntegrated, sessionSeconds: sessionEnergyHistory.length * UPDATE_MS / 1000, sampleCount:lowHistory.length };

    const now = performance.now();
    if (now - lastDisplay < DISPLAY_MS) return;
    lastDisplay = now;
    const refs = panelRefs();
    if (!refs) return;
    refs.state.textContent = `live · ${lowHistory.length} windows`;
    refs.session.textContent = Number.isFinite(sessionIntegrated)
      ? `Session integrated K estimate: ${sessionIntegrated.toFixed(1)} dB · ${latest.sessionSeconds.toFixed(0)} s`
      : 'Session integrated K estimate: collecting…';
    setWidth(refs.headroomRms, dbPercent(fullRms)); setMarker(refs.headroomPeak, fullPeak);
    setWidth(refs.lowP50Bar, dbPercent(p50)); setMarker(refs.lowP95Bar, p95); setMarker(refs.lowP99Bar, p99); setMarker(refs.lowMaxBar, max);
    setWidth(refs.eventFill, eventDensity * 100);
    refs.profile.textContent = profile; refs.eventDensity.textContent = `Bass activity ${(eventDensity * 100).toFixed(0)}%`; refs.limiterSummary.textContent = limiterReductionDb > 0.05 ? 'Limiter: reducing low band' : 'Limiter: armed';
    refs.fullRms.textContent = formatDb(fullRms); refs.fullPeak.textContent = formatDb(fullPeak); refs.lowRms.textContent = formatDb(lowRms);
    refs.p50.textContent = formatDb(p50); refs.p95.textContent = formatDb(p95); refs.p99.textContent = formatDb(p99); refs.max.textContent = formatDb(max);
    refs.crest.textContent = Number.isFinite(crest) ? `${crest.toFixed(1)} dB` : '—';
  }

  function pause() {
    if (!running) return;
    running = false;
    if (timer) clearInterval(timer);
    timer = null;
    const refs = panelRefs();
    if (refs) {
      refs.state.textContent = latest ? `analysis paused · ${latest.sampleCount} windows` : 'analysis paused';
      const button = document.getElementById('cfPauseAnalysis');
      if (button) button.textContent = 'Resume analysis';
    }
  }

  function resume() {
    if (running) return;
    running = true;
    measure();
    timer = setInterval(measure, UPDATE_MS);
    const button = document.getElementById('cfPauseAnalysis');
    if (button) button.textContent = 'Pause analysis';
  }

  const api = {
    start() { if (running) return; running = true; reset(); measure(); timer = setInterval(measure, UPDATE_MS); },
    pause, resume,
    togglePause() { if (running) pause(); else resume(); },
    setDetectorLimitDb(value) { detectorLimitDb=Number.isFinite(value)?value:null; },
    setLimiterReductionDb(value) {
      limiterReductionDb = Number.isFinite(value) ? Math.max(0, value) : 0;
      renderLimiterReduction(limiterReductionDb); renderPresentationMini({ bassReductionDb: limiterReductionDb });
    },
    setOutputGuardReductionDb(value) {
      outputGuardReductionDb = Number.isFinite(value) ? Math.max(0, value) : 0;
      renderOutputGuardReduction(outputGuardReductionDb); renderPresentationMini({ guardReductionDb: outputGuardReductionDb });
    },
    setPresentationVolumeDb(value) {
      renderPresentationMini({ volumeDb: Number.isFinite(value) ? value : -12 });
    },
    stop() { running = false; if (timer) clearInterval(timer); timer = null; const refs = panelRefs(); if (refs) refs.state.textContent = latest ? `frozen · ${latest.sampleCount} windows` : 'stopped'; },
    reset, snapshot,
    disconnect() { this.stop(); try { sourceNode.disconnect(fullAnalyser); } catch {} try { sourceNode.disconnect(hp1); } catch {} try { sourceNode.disconnect(sessionHp); } catch {} try { outputPreGuardNode?.disconnect(outputAnalyser); } catch {} try { silentSink.disconnect(); } catch {} }
  };
  activeAnalyzer = api;
  return api;
}
