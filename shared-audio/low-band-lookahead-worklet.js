// Shared 50 ms lookahead processor for the protected 0–120 Hz low branch.
// EN: A 400 ms pre-gain detector drives upward compression; a post-gain detector drives limiting.
const SOFT_KNEE_DB = 3;
const LOW_LEVEL_RATIO = 2;
const MAX_LOW_LEVEL_BOOST_DB = 12;
const COMPRESSOR_ATTACK_SECONDS = 0.025;
const COMPRESSOR_RELEASE_SECONDS = 0.25;

// EN: Return only the low-level upward-compression gain; the limiter remains a separate stage.
function lowLevelCompressorGainDb(levelDb, ceilingDb, maxBoostDb = MAX_LOW_LEVEL_BOOST_DB) {
  const overDb = levelDb - ceilingDb;
  const halfKneeDb = SOFT_KNEE_DB / 2;
  const lowLevelSlope = 1 - 1 / LOW_LEVEL_RATIO;

  if (overDb <= -halfKneeDb) {
    return Math.min(maxBoostDb, -overDb * lowLevelSlope);
  }
  if (overDb >= halfKneeDb) return 0;

  // EN: Smoothly join the 2:1 low-level curve to unity gain across the 3 dB knee.
  const t = (overDb + halfKneeDb) / SOFT_KNEE_DB;
  const lowEndpointDb = halfKneeDb * lowLevelSlope;
  const lowSlope = -lowLevelSlope * SOFT_KNEE_DB;
  return (2 * t ** 3 - 3 * t ** 2 + 1) * lowEndpointDb
    + (t ** 3 - 2 * t ** 2 + t) * lowSlope;
}

function softLimiterReductionDb(levelDb, ceilingDb) {
  const overDb = levelDb - ceilingDb;
  const halfKneeDb = SOFT_KNEE_DB / 2;
  if (overDb <= -halfKneeDb) return 0;
  if (overDb >= halfKneeDb) return overDb;
  // EN: Infinity:1 limiter law with a quadratic 3 dB soft-knee transition.
  return ((overDb + halfKneeDb) ** 2) / (2 * SOFT_KNEE_DB);
}

class LowBandLookaheadProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.delaySamples = Math.max(1, Math.round(sampleRate * 0.05));
    this.ringLength = this.delaySamples;
    this.windowSamples = Math.max(1, Math.round(sampleRate * 0.4));
    this.delay = [new Float32Array(this.ringLength), new Float32Array(this.ringLength)];
    this.preGainEnergy = new Float64Array(this.windowSamples);
    this.postGainEnergy = new Float64Array(this.windowSamples);
    this.delayIndex = 0;
    this.energyIndex = 0;
    this.preGainEnergySum = 0;
    this.postGainEnergySum = 0;
    this.enabled = false;
    this.compressorEnabled = false;
    this.ceilingDb = -20;
    this.maxLowLevelBoostDb = MAX_LOW_LEVEL_BOOST_DB;
    this.compressorGain = 1;
    this.limiterGain = 1;
    this.previewGainDb = 0;
    this.sampleCount = 0;
    this.inputFaults = { detector: false, low: false };

    this.port.onmessage = ({ data }) => {
      if (data.type === "config") {
        this.enabled = Boolean(data.enabled);
        if (typeof data.compressorEnabled === "boolean") {
          this.compressorEnabled = data.compressorEnabled;
        }
        this.ceilingDb = Number.isFinite(data.ceilingDb) ? data.ceilingDb : -20;
        this.maxLowLevelBoostDb = Number.isFinite(data.maxBoostDb)
          ? Math.max(0, Math.min(MAX_LOW_LEVEL_BOOST_DB, data.maxBoostDb))
          : MAX_LOW_LEVEL_BOOST_DB;
      }
      if (data.type === "reset") this.reset();
    };
  }

  reset() {
    this.delay.forEach(channel => channel.fill(0));
    this.preGainEnergy.fill(0);
    this.postGainEnergy.fill(0);
    this.delayIndex = 0;
    this.energyIndex = 0;
    this.preGainEnergySum = 0;
    this.postGainEnergySum = 0;
    this.compressorGain = 1;
    this.limiterGain = 1;
    this.previewGainDb = 0;
    this.sampleCount = 0;
    this.inputFaults = { detector: false, low: false };
  }

  reportInputFault(branch) {
    if (this.inputFaults[branch]) return;
    this.inputFaults[branch] = true;
    this.port.postMessage({
      type: "fault",
      fault: `${branch} input invalid; holding the last valid protection state`,
      recoverable: true
    });
  }

  process(inputs, outputs) {
    const low = inputs[0];
    const detector = inputs[1];
    const output = outputs[0];
    if (!low?.length || !output?.length) return true;

    const lowChannels = Math.min(low.length, output.length, 2);
    const detectorChannels = detector?.length || 0;
    const frames = output[0].length;

    for (let frame = 0; frame < frames; frame++) {
      let sidechain = 0;
      let detectorValid = true;
      for (let channel = 0; channel < detectorChannels; channel++) {
        const sample = detector[channel][frame];
        if (!Number.isFinite(sample)) {
          detectorValid = false;
          break;
        }
        sidechain += sample;
      }
      sidechain /= Math.max(1, detectorChannels);

      // EN: Keep the compressor detector before gain and the limiter detector after gain.
      if (detectorValid) {
        const index = this.energyIndex;
        const inputEnergy = sidechain * sidechain;
        this.preGainEnergySum += inputEnergy - this.preGainEnergy[index];
        this.preGainEnergy[index] = inputEnergy;
      } else {
        this.reportInputFault("detector");
      }

      // EN: Recover cleanly if a non-finite detector sample corrupts the rolling sums.
      if (!Number.isFinite(this.preGainEnergySum)) {
        this.preGainEnergy.fill(0);
        this.postGainEnergy.fill(0);
        this.preGainEnergySum = 0;
        this.postGainEnergySum = 0;
        this.energyIndex = 0;
        this.reportInputFault("detector");
      }

      const preGainDb = 20 * Math.log10(Math.max(
        Math.sqrt(this.preGainEnergySum / this.windowSamples),
        1e-12
      ));
      const candidateGainDb = lowLevelCompressorGainDb(preGainDb, this.ceilingDb, this.maxLowLevelBoostDb);
      const compressorTargetDb = this.enabled && this.compressorEnabled ? candidateGainDb : 0;
      const compressorTargetGain = Math.pow(10, compressorTargetDb / 20);
      if (!Number.isFinite(compressorTargetGain)) {
        this.compressorGain = 1;
        this.reportInputFault("detector");
      } else {
        const compressorTime = compressorTargetGain > this.compressorGain
          ? COMPRESSOR_ATTACK_SECONDS
          : COMPRESSOR_RELEASE_SECONDS;
        const compressorAlpha = 1 - Math.exp(-1 / (sampleRate * compressorTime));
        this.compressorGain += (compressorTargetGain - this.compressorGain) * compressorAlpha;
      }

      // EN: Measure the limiter sidechain after the actual compressor gain.
      if (detectorValid) {
        const index = this.energyIndex;
        const postGainSample = sidechain * this.compressorGain;
        const postGainSampleEnergy = postGainSample * postGainSample;
        this.postGainEnergySum += postGainSampleEnergy - this.postGainEnergy[index];
        this.postGainEnergy[index] = postGainSampleEnergy;
        this.energyIndex = (this.energyIndex + 1) % this.windowSamples;
      }
      if (!Number.isFinite(this.postGainEnergySum)) {
        this.postGainEnergy.fill(0);
        this.postGainEnergySum = 0;
        this.reportInputFault("detector");
      }

      const postGainDb = 20 * Math.log10(Math.max(
        Math.sqrt(this.postGainEnergySum / this.windowSamples),
        1e-12
      ));
      const limiterReduction = this.enabled
        ? softLimiterReductionDb(postGainDb, this.ceilingDb)
        : 0;
      const limiterTargetGain = Math.pow(10, -limiterReduction / 20);
      if (!Number.isFinite(limiterTargetGain)) {
        this.limiterGain = 1;
        this.reportInputFault("detector");
      } else {
        const limiterTime = limiterTargetGain < this.limiterGain ? 0.025 : 0.25;
        const limiterAlpha = 1 - Math.exp(-1 / (sampleRate * limiterTime));
        this.limiterGain += (limiterTargetGain - this.limiterGain) * limiterAlpha;
      }

      // EN: Keep the candidate visible during bypass, but do not apply it to the signal.
      const previewTime = candidateGainDb < this.previewGainDb ? 0.025 : 0.25;
      const previewAlpha = 1 - Math.exp(-1 / (sampleRate * previewTime));
      this.previewGainDb += (candidateGainDb - this.previewGainDb) * previewAlpha;

      for (let channel = 0; channel < lowChannels; channel++) {
        const delayed = this.delay[channel][this.delayIndex];
        const incoming = low[channel][frame];
        const safeIncoming = Number.isFinite(incoming) ? incoming : 0;
        if (!Number.isFinite(incoming)) this.reportInputFault("low");
        this.delay[channel][this.delayIndex] = safeIncoming;
        output[channel][frame] = (Number.isFinite(delayed) ? delayed : 0)
          * this.compressorGain
          * this.limiterGain;
      }

      this.delayIndex = (this.delayIndex + 1) % this.ringLength;
      this.sampleCount++;
      if (this.sampleCount % 2048 === 0) {
        this.port.postMessage({
          type: "meter",
          preDbfs: preGainDb,
          postDbfs: postGainDb,
          compressorGainDb: 20 * Math.log10(Math.max(this.compressorGain, 1e-12)),
          reductionDb: -20 * Math.log10(Math.max(this.limiterGain, 1e-12)),
          previewGainDb: this.previewGainDb,
          delayMs: this.delaySamples / sampleRate * 1000,
          ready: this.sampleCount >= this.delaySamples
        });
      }
    }
    return true;
  }
}

registerProcessor("low-band-lookahead", LowBandLookaheadProcessor);
