// Reusable procedural music source for Web Audio labs.
// The host application owns the AudioContext and UI.

import { BAR, STEP, TOTAL_BARS, MAIN_BARS, createScorePlan, createSeededRandom } from './bach-program.js?v=3.0';
import { applyPhrasing, getPerformedLoopDuration, getPerformedBarStarts } from './phrasing.js?v=3.0';
import { createInstruments, COMMITTED_MIX } from './instruments.js?v=3.0';

export { COMMITTED_MIX };
export const COMMITTED_NOMINAL_OUTPUT_DB=26;

const LOOKAHEAD_MS=100, AHEAD=.35, LATE_EVENT_GRACE=.2;
const LOOP=getPerformedLoopDuration({bar:BAR,totalBars:TOTAL_BARS});
const BAR_STARTS=getPerformedBarStarts({bar:BAR,totalBars:TOTAL_BARS});
const db=value=>Math.pow(10,value/20);
const TRANSPOSE_SEQUENCE=Object.freeze([0,4,-4]);
const NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_SEMITONES={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function transposeNoteName(note,semitones){if(!note||!semitones)return note;const m=/^([A-G])(#|b)?(\d)$/.exec(note);if(!m)return note;let pitch=NOTE_SEMITONES[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);let midi=(+m[3]+1)*12+pitch+semitones;return NOTE_NAMES[((midi%12)+12)%12]+(Math.floor(midi/12)-1);}
function transposeEvent(event,semitones){if(!semitones)return event;const next={...event};if(next.note)next.note=transposeNoteName(next.note,semitones);if(next.sourceNote)next.sourceNote=transposeNoteName(next.sourceNote,semitones);return next;}

const OFFLINE_SEEDS=[846,1729,2718,3141,5772,6283,7919,9265];
const dbEnergy=value=>10*Math.log10(Math.max(value,1e-12));
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};
function applyBiquad(samples,c){const {b0,b1,b2,a1,a2}=c,o=new Float32Array(samples.length);let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<samples.length;i++){const x=samples[i],y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;o[i]=y;x2=x1;x1=x;y2=y1;y1=y;}return o;}
function rbjFilter(type,frequency,q,sampleRate){const omega=2*Math.PI*frequency/sampleRate,cos=Math.cos(omega),alpha=Math.sin(omega)/(2*q);let b0,b1,b2,a0=1+alpha,a1=-2*cos,a2=1-alpha;if(type==='highpass'){b0=(1+cos)/2;b1=-(1+cos);b2=(1+cos)/2;}else{b0=(1-cos)/2;b1=1-cos;b2=(1-cos)/2;}return{b0:b0/a0,b1:b1/a0,b2:b2/a0,a1:a1/a0,a2:a2/a0};}
const K_SHELF={b0:1.53512485958697,b1:-2.69169618940638,b2:1.19839281085285,a1:-1.69065929318241,a2:.73248077421585},K_HIGHPASS={b0:1,b1:-2,b2:1,a1:-1.99004745483398,a2:.99007225036621};
function integratedLufs(channels,sampleRate){const weighted=channels.map(c=>applyBiquad(applyBiquad(c,K_SHELF),K_HIGHPASS)),block=Math.round(sampleRate*.4),hop=Math.round(sampleRate*.1),energies=[];for(let start=0;start+block<=weighted[0].length;start+=hop){let sum=0;for(const c of weighted)for(let i=start;i<start+block;i++)sum+=c[i]*c[i];energies.push(sum/(block*weighted.length));}const absolute=energies.filter(e=>dbEnergy(e)-.691>=-70);if(!absolute.length)return-Infinity;const ungated=-.691+dbEnergy(absolute.reduce((s,v)=>s+v,0)/absolute.length),relative=absolute.filter(e=>-.691+dbEnergy(e)>=ungated-10);return relative.length?-.691+dbEnergy(relative.reduce((s,v)=>s+v,0)/relative.length):-Infinity;}
function analyseBuffer(buffer){const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));let total=0,peak=0,peakFrame=0;for(const c of channels)for(let f=0;f<c.length;f++){const s=c[f];total+=s*s;if(Math.abs(s)>peak){peak=Math.abs(s);peakFrame=f;}}const low=channels.map(c=>applyBiquad(applyBiquad(c,rbjFilter('highpass',20,.7,buffer.sampleRate)),rbjFilter('lowpass',120,.7,buffer.sampleRate)));let lowTotal=0;for(const c of low)for(const s of c)lowTotal+=s*s;return{lufs:integratedLufs(channels,buffer.sampleRate),peakDbfs:20*Math.log10(Math.max(peak,1e-12)),peakTimeSec:peakFrame/buffer.sampleRate,rmsDbfs:dbEnergy(total/(buffer.length*channels.length)),lowBandRmsDbfs:dbEnergy(lowTotal/(buffer.length*low.length))};}
// EN: Render one procedural variation offline for host-side content analysis; it never starts live playback.
export async function renderProgramMixOffline({mix=COMMITTED_MIX,seed=Math.floor(Math.random()*2147483647),sampleRate=48000}={}){
 const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
 if(!Offline)throw new Error('OfflineAudioContext is not available in this browser.');
 const context=new Offline(2,Math.ceil(LOOP*sampleRate),sampleRate);
 const nominalOutput=context.createGain();
 nominalOutput.gain.value=db(COMMITTED_NOMINAL_OUTPUT_DB);
 nominalOutput.connect(context.destination);
 const rng=createSeededRandom(seed),instruments=createInstruments(context,nominalOutput,{random:rng});
 instruments.setParams(mix);
 const events=applyPhrasing(createScorePlan(rng),{bar:BAR,totalBars:TOTAL_BARS,rng});
 events.forEach(event=>instruments.playEvent(event,event.start));
 return {buffer:await context.startRendering(),seed,loopDurationSec:LOOP};
}

export async function measureCommittedMix({seeds=OFFLINE_SEEDS,sampleRate=48000}={}){const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;if(!Offline)throw new Error('OfflineAudioContext is not available in this browser.');const measurements=[];for(const seed of seeds){const context=new Offline(2,Math.ceil(LOOP*sampleRate),sampleRate),rng=createSeededRandom(seed),instruments=createInstruments(context,context.destination,{random:rng});instruments.setParams(COMMITTED_MIX);const events=applyPhrasing(createScorePlan(rng),{bar:BAR,totalBars:TOTAL_BARS,rng});events.forEach(e=>instruments.playEvent(e,e.start));measurements.push(analyseBuffer(await context.startRendering()));}const summary={};for(const key of ['lufs','peakDbfs','rmsDbfs','lowBandRmsDbfs']){const values=measurements.map(i=>i[key]);summary[key]={median:median(values),min:Math.min(...values),max:Math.max(...values)};}const worstPeak=measurements.reduce((w,m,i)=>m.peakDbfs>w.peakDbfs?{...m,variation:i+1,seed:seeds[i]}:w,{peakDbfs:-Infinity});return{seeds:[...seeds],measurements,summary,worstPeak};}

export function createProgramSource(ctx){
 const nominalOutput=ctx.createGain(),output=ctx.createGain();nominalOutput.connect(output);nominalOutput.gain.value=db(COMMITTED_NOMINAL_OUTPUT_DB);
 const meterHp=ctx.createBiquadFilter(),meterShelf=ctx.createBiquadFilter(),meterAnalyser=ctx.createAnalyser(),outputAnalyser=ctx.createAnalyser(),lowHp=ctx.createBiquadFilter(),lowLp=ctx.createBiquadFilter(),lowAnalyser=ctx.createAnalyser();meterHp.type='highpass';meterHp.frequency.value=38;meterHp.Q.value=.5;meterShelf.type='highshelf';meterShelf.frequency.value=1500;meterShelf.gain.value=4;meterAnalyser.fftSize=outputAnalyser.fftSize=lowAnalyser.fftSize=2048;lowHp.type='highpass';lowHp.frequency.value=20;lowHp.Q.value=.7;lowLp.type='lowpass';lowLp.frequency.value=120;lowLp.Q.value=.7;output.connect(meterHp);meterHp.connect(meterShelf);meterShelf.connect(meterAnalyser);output.connect(outputAnalyser);output.connect(lowHp);lowHp.connect(lowLp);lowLp.connect(lowAnalyser);
 const instruments=createInstruments(ctx,nominalOutput);let running=false,loopStart=0,timer=null,paramRevision=0,stoppedEvents=null;const plans=new Map();
 function makeBasePlan(){const score=createScorePlan(),events=applyPhrasing(score,{bar:BAR,totalBars:TOTAL_BARS});if(events.barStarts)BAR_STARTS.splice(0,BAR_STARTS.length,...events.barStarts);return events;}
 function ensurePlan(loopIndex){if(!plans.has(loopIndex)){const transpose=TRANSPOSE_SEQUENCE[loopIndex%TRANSPOSE_SEQUENCE.length],baseEvents=(loopIndex===0&&stoppedEvents)?stoppedEvents:makeBasePlan(),events=transpose?baseEvents.map(e=>transposeEvent(e,transpose)):baseEvents;plans.set(loopIndex,{events,cursor:0,transpose,baseEvents});}return plans.get(loopIndex);}
 function scheduleWindow(){if(!running)return;const now=ctx.currentTime,horizon=now+AHEAD,lastLoop=Math.max(0,Math.floor((horizon-loopStart)/LOOP));for(let i=Math.max(0,lastLoop-1);i<=lastLoop;i++){const plan=ensurePlan(i),base=loopStart+i*LOOP;while(plan.cursor<plan.events.length){const event=plan.events[plan.cursor],when=base+event.start;if(when>horizon)break;// EN: Preserve a briefly late loop-boundary event instead of dropping the audible phrase.
      // EN: Events older than this grace window are discarded after a long browser stall.
      if(when>=now-LATE_EVENT_GRACE)instruments.playEvent(event,Math.max(when,now+.005));plan.cursor++;}}const current=Math.max(0,Math.floor((now-loopStart)/LOOP));for(const key of plans.keys())if(key<current-1)plans.delete(key);}
 function currentLoopIndex(){return Math.max(0,Math.floor((ctx.currentTime-loopStart)/LOOP));}
 return{output,connect(node){output.connect(node);return this;},disconnect(){output.disconnect();},start(when=ctx.currentTime+.12,position=0){if(running)return;running=true;loopStart=when-Math.max(0,Math.min(LOOP-.001,position));plans.clear();ensurePlan(0);scheduleWindow();timer=setInterval(scheduleWindow,LOOKAHEAD_MS);},stop(){if(running){const p=ensurePlan(currentLoopIndex());stoppedEvents=p.baseEvents;}running=false;if(timer)clearInterval(timer);timer=null;plans.clear();},queueNewVariation(){if(running)return false;stoppedEvents=null;plans.clear();return true;},setParam(name,value){const ok=instruments.setParam(name,value);if(ok)paramRevision++;return ok;},setParams(next){instruments.setParams(next);paramRevision++;},setLevels(next){instruments.setParams(next);paramRevision++;},setNominalOutputDb(value){if(!Number.isFinite(value))return false;nominalOutput.gain.setTargetAtTime(db(value),ctx.currentTime,.02);return true;},getNominalOutputDb(){return 20*Math.log10(Math.max(nominalOutput.gain.value,1e-9));},getKWeightedRmsDbfs(){const data=new Float32Array(meterAnalyser.fftSize);meterAnalyser.getFloatTimeDomainData(data);let sum=0;for(const s of data)sum+=s*s;return 10*Math.log10(Math.max(sum/data.length,1e-12));},getLowBandRmsDbfs(){const data=new Float32Array(lowAnalyser.fftSize);lowAnalyser.getFloatTimeDomainData(data);let sum=0;for(const s of data)sum+=s*s;return 10*Math.log10(Math.max(sum/data.length,1e-12));},getProgramPeakDbfs(){const data=new Float32Array(outputAnalyser.fftSize);outputAnalyser.getFloatTimeDomainData(data);let peak=0;for(const s of data)peak=Math.max(peak,Math.abs(s));return 20*Math.log10(Math.max(peak,1e-12));},getLoopPosition(){if(!running)return 0;return((ctx.currentTime-loopStart)%LOOP+LOOP)%LOOP;},getLoopIndex(){return running?currentLoopIndex():0;},getSequenceTranspose(){return TRANSPOSE_SEQUENCE[(running?currentLoopIndex():0)%TRANSPOSE_SEQUENCE.length];},seek(position){if(!running||!Number.isFinite(position))return false;const target=Math.max(0,Math.min(LOOP-.001,position)),loopIndex=currentLoopIndex(),plan=ensurePlan(loopIndex);plan.cursor=0;loopStart=ctx.currentTime-loopIndex*LOOP-target;scheduleWindow();return true;},getLiveEvents(){const plan=ensurePlan(currentLoopIndex());return plan.events.map(e=>instruments.resolveEvent(e));},getEventRevision(){return currentLoopIndex()*100000+paramRevision;},constants:{LOOP,BAR,STEP,TOTAL_BARS,MAIN_BARS,AHEAD,BAR_STARTS,TRANSPOSE_SEQUENCE}};
}
