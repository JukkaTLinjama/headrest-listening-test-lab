// Reusable procedural music source for Web Audio labs.
// The host application owns the AudioContext and UI.

import { BAR, STEP, TOTAL_BARS, MAIN_BARS, createScorePlan } from './bach-program.js';
import { applyPhrasing, getPerformedLoopDuration, getPerformedBarStarts } from './phrasing.js';
import { createInstruments } from './instruments.js';
import { createContentFeelnessAnalyzer } from './content-feelness-analysis.js';

const LOOKAHEAD_MS = 100;
const AHEAD = 0.35;
const LOOP = getPerformedLoopDuration({ bar: BAR, totalBars: TOTAL_BARS });
const BAR_STARTS = getPerformedBarStarts({ bar: BAR, totalBars: TOTAL_BARS });

export function createProgramSource(ctx) {
  const output = ctx.createGain();
  const instruments = createInstruments(ctx, output);
  // EN: Content Feelness is a silent side-chain descriptor path. It never alters Program A audio.
  const contentAnalysis = createContentFeelnessAnalyzer(ctx, output);
  let running = false;
  let loopStart = 0;
  let timer = null;
  let paramRevision = 0;
  const plans = new Map();

  function makePlan() {
    const score = createScorePlan();
    const events = applyPhrasing(score, { bar: BAR, totalBars: TOTAL_BARS });
    return { events, cursor: 0 };
  }

  function ensurePlan(loopIndex) {
    if (!plans.has(loopIndex)) plans.set(loopIndex, makePlan());
    return plans.get(loopIndex);
  }

  function scheduleWindow() {
    if (!running) return;
    const now = ctx.currentTime;
    const horizon = now + AHEAD;
    const lastLoop = Math.max(0, Math.floor((horizon - loopStart) / LOOP));

    for (let loopIndex = Math.max(0, lastLoop - 1); loopIndex <= lastLoop; loopIndex++) {
      const plan = ensurePlan(loopIndex);
      const base = loopStart + loopIndex * LOOP;
      while (plan.cursor < plan.events.length) {
        const event = plan.events[plan.cursor];
        const when = base + event.start;
        if (when > horizon) break;
        if (when >= now - 0.03) instruments.playEvent(event, when);
        plan.cursor++;
      }
    }

    const current = Math.max(0, Math.floor((now - loopStart) / LOOP));
    for (const key of plans.keys()) if (key < current - 1) plans.delete(key);
  }

  function currentLoopIndex() {
    return Math.max(0, Math.floor((ctx.currentTime - loopStart) / LOOP));
  }

  return {
    output,
    contentAnalysis,
    connect(node) { output.connect(node); return this; },
    disconnect() { output.disconnect(); },
    start(when = ctx.currentTime + 0.12) {
      if (running) return;
      running = true;
      loopStart = when;
      plans.clear();
      ensurePlan(0);
      contentAnalysis.start();
      scheduleWindow();
      timer = setInterval(scheduleWindow, LOOKAHEAD_MS);
    },
    stop() {
      running = false;
      if (timer) clearInterval(timer);
      timer = null;
      plans.clear();
      contentAnalysis.stop();
    },
    setParam(name, value) {
      const ok = instruments.setParam(name, value);
      if (ok) paramRevision++;
      return ok;
    },
    setParams(next) { instruments.setParams(next); paramRevision++; },
    setLevels(next) { instruments.setParams(next); paramRevision++; },
    getLoopPosition() {
      if (!running) return 0;
      return ((ctx.currentTime - loopStart) % LOOP + LOOP) % LOOP;
    },
    getLiveEvents() {
      const plan = ensurePlan(currentLoopIndex());
      return plan.events.map(event => instruments.resolveEvent(event));
    },
    getEventRevision() { return currentLoopIndex() * 100000 + paramRevision; },
    constants: { LOOP, BAR, STEP, TOTAL_BARS, MAIN_BARS, AHEAD, BAR_STARTS: BAR_STARTS.slice() }
  };
}
