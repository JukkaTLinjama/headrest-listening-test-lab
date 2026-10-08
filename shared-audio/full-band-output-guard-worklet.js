// Full-band final-output guard for Spill Lab.
// EN: This is a digital clip guard after the selected listener mix, not Program A bass protection.
const CEILING_DB=-2;
const SOFT_KNEE_DB=2;

function reductionDbForPeak(peakDb){
  const over=peakDb-CEILING_DB,half=SOFT_KNEE_DB/2;
  if(over<=-half)return 0;
  if(over>=half)return over;
  return ((over+half)**2)/(2*SOFT_KNEE_DB);
}

class FullBandOutputGuardProcessor extends AudioWorkletProcessor{
  constructor(){
    super();
    this.delaySamples=Math.max(1,Math.round(sampleRate*.005));
    this.delay=[new Float32Array(this.delaySamples),new Float32Array(this.delaySamples)];
    this.delayIndex=0;this.gain=this.targetGain=1;this.sampleCount=0;
    this.port.onmessage=({data})=>{if(data.type==='reset')this.reset();};
  }
  reset(){this.delay.forEach(channel=>channel.fill(0));this.delayIndex=0;this.gain=this.targetGain=1;}
  process(inputs,outputs){
    const input=inputs[0],output=outputs[0];
    if(!input?.length||!output?.length)return true;
    const channels=Math.min(input.length,output.length,2),frames=output[0].length;
    for(let frame=0;frame<frames;frame++){
      let peak=0;
      for(let ch=0;ch<channels;ch++){const sample=input[ch][frame];if(Number.isFinite(sample))peak=Math.max(peak,Math.abs(sample));}
      const peakDb=20*Math.log10(Math.max(peak,1e-12));
      const reduction=reductionDbForPeak(peakDb);
      this.targetGain=Math.pow(10,-reduction/20);
      const timeConstant=this.targetGain<this.gain?.001:.12;
      const alpha=1-Math.exp(-1/(sampleRate*timeConstant));
      this.gain+=(this.targetGain-this.gain)*alpha;
      for(let ch=0;ch<channels;ch++){
        const delayed=this.delay[ch][this.delayIndex];
        const incoming=input[ch][frame];
        this.delay[ch][this.delayIndex]=Number.isFinite(incoming)?incoming:0;
        output[ch][frame]=(Number.isFinite(delayed)?delayed:0)*this.gain;
      }
      this.delayIndex=(this.delayIndex+1)%this.delaySamples;
      this.sampleCount++;
      if(this.sampleCount%2048===0)this.port.postMessage({type:'meter',reductionDb:-20*Math.log10(Math.max(this.gain,1e-12)),ready:this.sampleCount>=this.delaySamples,delayMs:this.delaySamples/sampleRate*1000});
    }
    return true;
  }
}
registerProcessor('full-band-output-guard',FullBandOutputGuardProcessor);
