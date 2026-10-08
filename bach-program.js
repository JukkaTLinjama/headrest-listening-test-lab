// Bach BWV 846 composition data and musical variation rules.
// Keep note choices separate from phrasing, synthesis and Web Audio scheduling.

export const BAR=3.0;
export const STEP=BAR/16;
export const MAIN_BARS=19;
export const TOTAL_BARS=20;
export const SCORE_LOOP=BAR*TOTAL_BARS;

const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export function midi(note){const m=/^([A-G])(#|b)?(\d)$/.exec(note);let s=SEMI[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);return(+m[3]+1)*12+s}
export function noteFromMidi(value){return NAMES[(value%12+12)%12]+(Math.floor(value/12)-1)}
export const transposeSemis=(note,semis)=>noteFromMidi(midi(note)+semis);
export const transposeOct=(note,octaves)=>transposeSemis(note,octaves*12);
const randomChoice=values=>values[Math.floor(Math.random()*values.length)];

const CHORDS=[
['C4','E4','G4','C5','E5'],['C4','D4','A4','D5','F5'],['B3','D4','G4','D5','F5'],['C4','E4','G4','C5','E5'],
['C4','E4','A4','E5','A5'],['C4','D4','F#4','A4','D5'],['B3','D4','G4','D5','G5'],['B3','C4','E4','G4','C5'],
['A3','C4','E4','G4','C5'],['D3','A3','D4','F#4','C5'],['G3','B3','D4','G4','B4'],['G3','A#3','E4','G4','C#5'],
['F3','A3','D4','A4','D5'],['F3','G#3','D4','F4','B4'],['E3','G3','C4','G4','C5'],['E3','F3','A3','C4','F4'],
['D3','F3','A3','C4','F4'],['G2','D3','G3','B3','F4'],['C3','E3','G3','C4','E4']
];
const expandChord=([a,b,c,d,e])=>[a,b,c,d,e,c,d,e,a,b,c,d,e,c,d,e];
export const BARS=CHORDS.map(expandChord);
export const CADENCE={sourceBar:18,dropFirst:3,finalNote:'C3',finalDuration:BAR*.58};

export function createBarPlan(bar,barIndex){
  const barStart=barIndex*BAR,events=[];
  bar.forEach((note,i)=>{const dur=i===0?4*STEP:STEP*.9,start=barStart+i*STEP;events.push({inst:'bell',note,start,dur},{inst:'treble',sourceNote:note,start,dur:dur*.78});});
  if(Math.random()<.30){const idx=2+Math.floor(Math.random()*11),dir=Math.random()<.5?-1:1,start=barStart+idx*STEP-.035,dt=.06,dur=.10;events.push({inst:'ornTreble',sourceNote:bar[idx],ornamentOffset:0,start,dur,optional:'ornament'},{inst:'ornTreble',sourceNote:bar[idx],ornamentOffset:dir,start:start+dt,dur,optional:'ornament'},{inst:'ornTreble',sourceNote:bar[idx],ornamentOffset:0,start:start+2*dt,dur,optional:'ornament'});}
  const primary={inst:'bass',note:transposeOct(bar[0],-1),start:barStart,dur:BAR*.34};events.push(primary);
  const candidates=[...new Set(bar.slice(1,6))];
  const secondary={inst:'bass2',note:transposeOct(randomChoice(candidates),-1),start:barStart+randomChoice([6,8,10])*STEP,dur:BAR*.28,optional:'pedalSecondary'};events.push(secondary);
  if(Math.random()<.18){const dir=Math.random()<.5?-1:1,dt=.17,dur=.22;events.push({inst:'ornBass',note:primary.note,start:primary.start,dur,optional:'pedalOrnament'},{inst:'ornBass',note:transposeSemis(primary.note,dir),start:primary.start+dt,dur,optional:'pedalOrnament'},{inst:'ornBass',note:primary.note,start:primary.start+2*dt,dur,optional:'pedalOrnament'});}
  return events;
}

export function createSubPlan(){const events=[];BARS.forEach((bar,index)=>{const musicalBar=index+1;if(musicalBar%2===0&&Math.random()<.82)events.push({inst:'sub',note:transposeOct(bar[0],-2),start:index*BAR,dur:BAR*.62});});return events;}

export function createCadencePlan(){
  const events=[],barStart=MAIN_BARS*BAR;
  const source=BARS[CADENCE.sourceBar].slice(0,8).reverse().slice(CADENCE.dropFirst).slice(0,-1);
  source.forEach((note,i)=>events.push({inst:'outro',note,start:barStart+i*STEP,dur:STEP*.82},{inst:'treble',sourceNote:note,start:barStart+i*STEP,dur:STEP*.64}));
  const finalStart=barStart+source.length*STEP,finalNote=CADENCE.finalNote,finalDur=CADENCE.finalDuration;
  events.push({inst:'outroFinal',note:finalNote,start:finalStart,dur:finalDur},{inst:'treble',sourceNote:finalNote,start:finalStart,dur:finalDur*.85});
  const pedal=transposeOct(finalNote,-1),dir=Math.random()<.5?-1:1,dt=.18,shortDur=.24;
  events.push({inst:'ornBass',note:pedal,start:finalStart,dur:shortDur},{inst:'ornBass',note:transposeSemis(pedal,dir),start:finalStart+dt,dur:shortDur},{inst:'outroBass',note:pedal,start:finalStart+2*dt,dur:Math.max(.35,finalDur-2*dt)});
  return events;
}

export function createScorePlan(){return [...BARS.flatMap((bar,index)=>createBarPlan(bar,index)),...createSubPlan(),...createCadencePlan()].sort((a,b)=>a.start-b.start);}
