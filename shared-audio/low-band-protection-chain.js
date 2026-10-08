const CROSSOVER_HZ=120;
const WORKLET_VERSION='5.0.10';
const Q=Math.SQRT1_2;
const configure=(nodes,type)=>nodes.forEach(node=>{node.type=type;node.frequency.value=CROSSOVER_HZ;node.Q.value=Q;});
const configureDetector=nodes=>nodes.forEach((node,index)=>{node.type=index%2===0?"highpass":"lowpass";node.frequency.value=index%2===0?20:90;node.Q.value=Q;});

// Shared Program A low-band protection chain.
// EN: No fallback is created here: AudioWorklet load failure rejects construction.
export async function createLowBandProtectionChain(ctx,{onMeter,onFault,maxBoostDb=12}={}){
  const configuredMaxBoostDb=Math.max(0,Math.min(12,Number(maxBoostDb)||0));
  // EN: Version the worklet URL independently so its DSP revision cannot remain stale in cache.
  await ctx.audioWorklet.addModule(new URL(`./low-band-lookahead-worklet.js?v=${WORKLET_VERSION}`,import.meta.url));
  const input=ctx.createGain(),output=ctx.createGain();
  // EN: Native filters feed the worklet sidechain directly; no deprecated ScriptProcessor is needed here.
  const detectorFilters=[ctx.createBiquadFilter(),ctx.createBiquadFilter(),ctx.createBiquadFilter(),ctx.createBiquadFilter()];
  configureDetector(detectorFilters);
  const detector={input:detectorFilters[0],bandOutput:detectorFilters[3],reset(){},dispose(){detectorFilters.forEach(node=>{try{node.disconnect();}catch{}});}};
  const low=[ctx.createBiquadFilter(),ctx.createBiquadFilter()];
  const high=[ctx.createBiquadFilter(),ctx.createBiquadFilter()];
  configure(low,"lowpass");configure(high,"highpass");
  const highDelay=ctx.createDelay(.1);highDelay.delayTime.value=.05;
  const worklet=new AudioWorkletNode(ctx,"low-band-lookahead",{numberOfInputs:2,numberOfOutputs:1,outputChannelCount:[2]});
  const stats={available:true,ready:false,preDbfs:-Infinity,postDbfs:-Infinity,compressorGainDb:0,reductionDb:0,previewGainDb:0,delayMs:50,fault:null};
  // EN: Report a processor fault instead of leaving a silent protected branch unexplained.
  worklet.onprocessorerror=()=>{stats.available=false;stats.ready=false;stats.fault='AudioWorklet processor stopped';onFault?.({...stats});};
  worklet.port.onmessage=({data})=>{if(data.type==="meter"){Object.assign(stats,data);onMeter?.({...stats});}else if(data.type==="fault"){stats.fault=data.fault||'Protection input invalid';onFault?.({...stats,recoverable:Boolean(data.recoverable)});}};
  input.connect(detector.input);detectorFilters[0].connect(detectorFilters[1]);detectorFilters[1].connect(detectorFilters[2]);detectorFilters[2].connect(detectorFilters[3]);
  input.connect(low[0]);low[0].connect(low[1]);low[1].connect(worklet,0,0);
  detector.bandOutput.connect(worklet,0,1);worklet.connect(output);
  input.connect(high[0]);high[0].connect(high[1]);high[1].connect(highDelay);highDelay.connect(output);
  return {
    input,output,detector,limitedLowOutput:worklet,stats,
    setEnabled(enabled){
      this.enabled=Boolean(enabled);
      worklet.port.postMessage({type:"config",enabled:this.enabled,compressorEnabled:this.compressorEnabled??false,ceilingDb:this.ceilingDb??-20,maxBoostDb:configuredMaxBoostDb});
    },
    setCeilingDb(ceilingDb){
      this.ceilingDb=ceilingDb;
      worklet.port.postMessage({type:"config",enabled:this.enabled??false,compressorEnabled:this.compressorEnabled??false,ceilingDb,maxBoostDb:configuredMaxBoostDb});
    },
    configure({enabled,ceilingDb,compressorEnabled=this.compressorEnabled??false}){
      this.enabled=Boolean(enabled);
      this.compressorEnabled=Boolean(compressorEnabled);
      this.ceilingDb=ceilingDb;
      worklet.port.postMessage({type:"config",enabled:this.enabled,compressorEnabled:this.compressorEnabled,ceilingDb,maxBoostDb:configuredMaxBoostDb});
    },
    reset(){worklet.port.postMessage({type:"reset"});detector.reset();},
    dispose(){detector.dispose();[input,output,...low,...high,highDelay,worklet].forEach(node=>{try{node.disconnect();}catch{}});}
  };
}
