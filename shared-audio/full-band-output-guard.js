// Full-band final-output guard for the selected listener mix.
const WORKLET_VERSION='5.0.8';

// EN: The guard lives after Presentation VOL so it catches Program A, Scene and Ambient summing.
export async function createFullBandOutputGuard(ctx,{onMeter,onFault}={}){
  await ctx.audioWorklet.addModule(new URL(`./full-band-output-guard-worklet.js?v=${WORKLET_VERSION}`,import.meta.url));
  const input=ctx.createGain(),output=ctx.createGain();
  const worklet=new AudioWorkletNode(ctx,'full-band-output-guard',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});
  const stats={available:true,ready:false,reductionDb:0,delayMs:5,fault:null};
  worklet.onprocessorerror=()=>{stats.available=false;stats.ready=false;stats.fault='Final output guard processor stopped';onFault?.({...stats});};
  worklet.port.onmessage=({data})=>{if(data.type==='meter'){Object.assign(stats,data);onMeter?.({...stats});}};
  input.connect(worklet);worklet.connect(output);
  return{input,output,stats,reset(){worklet.port.postMessage({type:'reset'});},dispose(){[input,output,worklet].forEach(node=>{try{node.disconnect();}catch{}});}};
}
