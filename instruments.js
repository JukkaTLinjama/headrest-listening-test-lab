// Web Audio instrument factory for the procedural program source.
// Musical timing and note selection live outside this module.

const db=value=>Math.pow(10,value/20);
const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function midi(note){const m=/^([A-G])(#|b)?(\d)$/.exec(note);let s=SEMI[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);return(+m[3]+1)*12+s}
function noteFromMidi(value){return NAMES[(value%12+12)%12]+(Math.floor(value/12)-1)}
function hz(note){return 440*Math.pow(2,(midi(note)-69)/12)}
function createImpulse(ctx,seconds=2.2,decay=2.8){const len=Math.floor(ctx.sampleRate*seconds),buffer=ctx.createBuffer(2,len,ctx.sampleRate);for(let ch=0;ch<2;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay)}return buffer}

export function createInstruments(ctx,output){
  const masterGain=ctx.createGain(),bellGain=ctx.createGain(),trebleGain=ctx.createGain(),bassGain=ctx.createGain(),ornBassGain=ctx.createGain(),subGain=ctx.createGain(),dryGain=ctx.createGain(),wetGain=ctx.createGain(),convolver=ctx.createConvolver();
  convolver.buffer=createImpulse(ctx);
  [bellGain,trebleGain,bassGain,ornBassGain].forEach(g=>{g.connect(dryGain);g.connect(convolver)});
  dryGain.connect(masterGain);convolver.connect(wetGain);wetGain.connect(masterGain);subGain.connect(masterGain);masterGain.connect(output);

  const params={master:-14,bell:-10,treble:0,bass:-13,sub:-16,reverb:0,transpose:24};
  let phrase={trebleDb:-20,reverbMix:.30};

  function applyLevels(){
    const t=ctx.currentTime;
    const mix=clamp(phrase.reverbMix+params.reverb,0,.9);
    const trebleDb=phrase.trebleDb+params.treble;
    masterGain.gain.setTargetAtTime(db(params.master),t,.02);
    bellGain.gain.setTargetAtTime(db(params.bell),t,.02);
    trebleGain.gain.setTargetAtTime(db(trebleDb),t,.04);
    bassGain.gain.setTargetAtTime(db(params.bass),t,.02);
    ornBassGain.gain.setTargetAtTime(db(params.bass-3),t,.02);
    subGain.gain.setTargetAtTime(db(params.sub),t,.04);
    dryGain.gain.setTargetAtTime(1-mix*.55,t,.06);
    wetGain.gain.setTargetAtTime(mix,t,.08);
  }

  function resolveNote(event){if(event.sourceNote){const offset=Math.round(params.transpose)+(event.ornamentOffset||0);return noteFromMidi(midi(event.sourceNote)+offset)}return event.note}

  function playBell(note,when,dur,target=bellGain,bright=false){const c=ctx.createOscillator(),m=ctx.createOscillator(),mg=ctx.createGain(),g=ctx.createGain(),f=hz(note),release=Math.max(.055,dur);c.type=m.type='sine';c.frequency.setValueAtTime(f,when);m.frequency.setValueAtTime(f*(bright?3.08:2.72),when);mg.gain.setValueAtTime(f*(bright?.82:.62),when);mg.gain.exponentialRampToValueAtTime(1,when+Math.min(.18,release*.7));g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(bright?.095:.14,when+.005);g.gain.exponentialRampToValueAtTime(.0001,when+release);m.connect(mg);mg.connect(c.frequency);c.connect(g);g.connect(target);m.start(when);c.start(when);m.stop(when+release+.04);c.stop(when+release+.04)}

  function playBass(note,when,dur,target=bassGain,peak=.12){
    const o1=ctx.createOscillator(),o2=ctx.createOscillator(),lp=ctx.createBiquadFilter(),hp=ctx.createBiquadFilter(),g=ctx.createGain(),f=hz(note);
    o1.type='triangle';o2.type='sine';o1.frequency.setValueAtTime(f,when);o2.frequency.setValueAtTime(f*2,when);
    hp.type='highpass';hp.frequency.setValueAtTime(58,when);hp.Q.value=.55;
    lp.type='lowpass';lp.frequency.setValueAtTime(260,when);lp.Q.value=.65;
    g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(peak,when+Math.min(.045,dur*.20));g.gain.setValueAtTime(peak,when+dur*.46);g.gain.exponentialRampToValueAtTime(.0001,when+dur);
    o1.connect(hp);o2.connect(hp);hp.connect(lp);lp.connect(g);g.connect(target);o1.start(when);o2.start(when);o1.stop(when+dur+.05);o2.stop(when+dur+.05);
  }

  function playSub(note,when,dur){const o=ctx.createOscillator(),h=ctx.createOscillator(),hg=ctx.createGain(),g=ctx.createGain(),lp=ctx.createBiquadFilter(),f=hz(note)*.5,attack=.42,release=2.5,end=when+dur;o.type=h.type='sine';o.frequency.setValueAtTime(f,when);h.frequency.setValueAtTime(f*2,when);hg.gain.value=.16;lp.type='lowpass';lp.frequency.value=95;g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(.16,when+attack);g.gain.setValueAtTime(.16,end);g.gain.exponentialRampToValueAtTime(.0001,end+release);o.connect(lp);h.connect(hg);hg.connect(lp);lp.connect(g);g.connect(subGain);o.start(when);h.start(when);o.stop(end+release+.08);h.stop(end+release+.08)}

  function playEvent(event,absoluteWhen){
    if(event.phrase){phrase=event.phrase;applyLevels()}
    const note=resolveNote(event);
    if(['bell','outro','outroFinal'].includes(event.inst))playBell(note,absoluteWhen,event.dur,bellGain,false);
    else if(['treble','ornTreble'].includes(event.inst))playBell(note,absoluteWhen,event.dur,trebleGain,true);
    else if(['bass','bass2','outroBass'].includes(event.inst))playBass(note,absoluteWhen,event.dur,bassGain,.11);
    else if(event.inst==='ornBass')playBass(note,absoluteWhen,event.dur,ornBassGain,.06);
    else if(event.inst==='sub')playSub(note,absoluteWhen,event.dur);
  }

  applyLevels();
  return{
    playEvent,
    setPhraseState(next){phrase={...phrase,...next};applyLevels()},
    setParam(name,value){if(!(name in params)||!Number.isFinite(value))return false;params[name]=value;applyLevels();return true},
    setParams(next){Object.entries(next).forEach(([name,value])=>{if(name in params&&Number.isFinite(value))params[name]=value});applyLevels()},
    getParam(name){return params[name]},
    resolveEvent(event){return{...event,note:resolveNote(event)}}
  };
}
