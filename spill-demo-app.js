
  // Headrest Listening Test Lab v14.11
  // Headrest Spill / Background Scene Lab v8.16
  // EN: v8.16 softens volume gradients and flashes output grains; the demo layout remains unchanged.
  import {
    createProgramSource,renderProgramMixOffline
  }
  from '../../procedural-music-lab/program-source.js?rev=v14.11';
  import {
    createContentFeelnessAnalyzer, setContentAnalysisOfflineSummary
  }
  from './content-feelness-analysis.js?rev=v14.11';
  import {
    analyseProgramLoudness,applyProgramReferenceTrim
  }
  from './program-loudness-analysis.js?rev=v14.11';
  import {
    createLowBandProtectionChain
  }
  from '../../shared-audio/low-band-protection-chain.js?rev=v14.11';
  import {
    createFullBandOutputGuard
  }
  from '../../shared-audio/full-band-output-guard.js?rev=v14.11';
  import {
    createRealtimeAudioAnalyzer
  }
  from '../../shared-audio/realtime-audio-analyzer.js?rev=v14.11';
  import {
    createAudioAnalysisWindow
  }
  from './audio-analysis-window.js?rev=v14.11';
  import {
    createRoomMeter
  }
  from './room-meter.js?rev=v14.11';
  import { createEMajorTriadOctaveBuffer, createEMajorTriadOctaveCue } from './e-major-triad-octave-cue.js?rev=v14.11';
  import {
    createDemoExperienceController
  }
  from './demo-experience-controller.js?rev=v14.11';
  import {
    createCabinRenderer
  }
  from './cabin-renderer.js?rev=v14.11';
  // ============================================================================
  // Headrest Spill / Background Scene Lab v7.42
  // Derived conceptually from Tactile Loudness Meter v6.0.
  // EN: Three audible layers are intentionally separate: Spill, Scene, and Ambient.
  // EN: Ambient represents the environment; Scene represents intentionally added background content.
  // ============================================================================
  const els={
    programAFile:document.getElementById('programAFile'),programAFileRow:document.getElementById('programAFileRow'),programABuiltinRow:document.getElementById('programABuiltinRow'),programASourceBuiltin:document.getElementById('programASourceBuiltin'),programASourceFile:document.getElementById('programASourceFile'),programReferenceTrim:document.getElementById('programReferenceTrim'),programReferenceTrimValue:document.getElementById('programReferenceTrimValue'),aContentVolume:document.getElementById('aContentVolume'),aContentVolumeValue:document.getElementById('aContentVolumeValue'),sceneFile:document.getElementById('sceneFile'),sceneFileRow:document.getElementById('sceneFileRow'),sceneSourceFile:document.getElementById('sceneSourceFile'),sceneSourcePink:document.getElementById('sceneSourcePink'),sceneSourceBrown:document.getElementById('sceneSourceBrown'),ambientFile:document.getElementById('ambientFile'),ambientFileRow:document.getElementById('ambientFileRow'),ambientFileName:document.getElementById('ambientFileName'),ambientSourceBrown:document.getElementById('ambientSourceBrown'),ambientSourceFile:document.getElementById('ambientSourceFile'),ambientState:document.getElementById('ambientState'),ambientGain:document.getElementById('ambientGain'),ambientGainValue:document.getElementById('ambientGainValue'),ambientMute:document.getElementById('ambientMute'),ambientSolo:document.getElementById('ambientSolo'),ambientAnalysis:document.getElementById('ambientAnalysis'),programAFileName:document.getElementById('programAFileName'),sceneFileName:document.getElementById('sceneFileName'),programAState:document.getElementById('programAState'),sceneState:document.getElementById('sceneState'),sceneGain:document.getElementById('sceneGain'),sceneGainValue:document.getElementById('sceneGainValue'),monitorGain:document.getElementById('monitorGain'),monitorGainValue:document.getElementById('monitorGainValue'),presentationSafetyState:document.getElementById('presentationSafetyState'),demoMuteForInfo:document.getElementById('demoMuteForInfo'),demoPresentationLevel:document.getElementById('demoPresentationLevel'),demoVolUp:document.getElementById('demoVolUp'),demoVolDown:document.getElementById('demoVolDown'),demoVolumeSegments:document.getElementById('demoVolumeSegments'),demoVolumeTrace:document.getElementById('demoVolumeTrace'),systemBoost:document.getElementById('systemBoost'),demoFeelnessHint:document.getElementById('demoFeelnessHint'),outputGuardStatus:document.getElementById('outputGuardStatus'),outputAnalysisWindow:document.getElementById('outputAnalysisWindow'),outputChainDiagnostics:document.getElementById('outputChainDiagnostics'),demoOutputSpectrum:document.getElementById('demoOutputSpectrum'),programAMute:document.getElementById('programAMute'),sceneMute:document.getElementById('sceneMute'),programASolo:document.getElementById('programASolo'),sceneSolo:document.getElementById('sceneSolo'),loadLocalDefault:document.getElementById('loadLocalDefault'),cabinProgramSource:document.getElementById('cabinProgramSource'),viewModeToggle:document.getElementById('viewModeToggle'),startBoth:document.getElementById('startBoth'),stopBoth:document.getElementById('stopBoth'),restartBoth:document.getElementById('restartBoth'),listenerACard:document.getElementById('listenerACard'),listenerAContent:document.getElementById('listenerAContent'),listenerAScene:document.getElementById('listenerAScene'),listenerAAmbient:document.getElementById('listenerAAmbient'),listenerATotal:document.getElementById('listenerATotal'),programAAnalysis:document.getElementById('programAAnalysis'),sceneAnalysis:document.getElementById('sceneAnalysis'),programALufs:document.getElementById('programALufs'),sceneLufs:document.getElementById('sceneLufs'),ambientLufs:document.getElementById('ambientLufs'),deltaLu:document.getElementById('deltaLu'),sumLufs:document.getElementById('sumLufs'),status:document.getElementById('status'),scope:document.getElementById('scope'),cabinTest:document.getElementById('cabinTest'),cabinTestReadout:document.getElementById('cabinTestReadout'),labDemoVolumeControl:document.getElementById('labDemoVolumeControl'),labDemoVolUp:document.getElementById('labDemoVolUp'),labDemoVolDown:document.getElementById('labDemoVolDown'),labDemoVolumeSegments:document.getElementById('labDemoVolumeSegments'),labDemoVolumeTrace:document.getElementById('labDemoVolumeTrace'),labDemoVolumePeak:document.getElementById('labDemoVolumePeak'),demoHwCueStop:document.getElementById('demoHwCueStop'),hwSetupStart:document.getElementById('hwSetupStart'),hwSetupDialog:document.getElementById('hwSetupDialog'),hwSetupCard:document.getElementById('hwSetupCard'),hwSetupSequence:document.getElementById('hwSetupSequence'),hwOrientationPanel:document.getElementById('hwOrientationPanel'),hwLoudPanel:document.getElementById('hwLoudPanel'),hwSetupLoudStart:document.getElementById('hwSetupLoudStart'),hwSetupContinue:document.getElementById('hwSetupContinue'),hwSetupCancel:document.getElementById('hwSetupCancel'),hwSetupFeedback:document.getElementById('hwSetupFeedback'),demoHwSetupNotice:document.getElementById('demoHwSetupNotice'),demoSetupReady:document.getElementById('demoSetupReady'),demoSetupProgram:document.getElementById('demoSetupProgram'),demoSetupTrim:document.getElementById('demoSetupTrim'),demoSetupCabin:document.getElementById('demoSetupCabin'),demoSetupScene:document.getElementById('demoSetupScene'),demoSetupPresentation:document.getElementById('demoSetupPresentation'),demoSetupProtection:document.getElementById('demoSetupProtection'),protectionDemoState:document.getElementById('protectionDemoState'),protectionCeiling:document.getElementById('protectionCeiling'),protectionCeilingValue:document.getElementById('protectionCeilingValue'),demoPlaylistFiles:document.getElementById('demoPlaylistFiles'),demoPlaylistSummary:document.getElementById('demoPlaylistSummary'),demoPlaylistList:document.getElementById('demoPlaylistList'),cabinProgramSelect:document.getElementById('cabinProgramSelect'),cabinProgramPrevious:document.getElementById('cabinProgramPrevious'),cabinProgramNext:document.getElementById('cabinProgramNext'),protectionStatus:document.getElementById('protectionStatus'),programPreMonitor:document.getElementById('programPreMonitor'),monitorPostMonitor:document.getElementById('monitorPostMonitor'),demoTransportPlay:document.getElementById('demoTransportPlay'),demoSetupProtectionReduction:document.getElementById('demoSetupProtectionReduction'),demoSetupProtectionFill:document.getElementById('demoSetupProtectionFill'),demoSetupProtectionNote:document.getElementById('demoSetupProtectionNote'),demoSetupDetectorLevel:document.getElementById('demoSetupDetectorLevel'),demoSetupLimiterDetectorLevel:document.getElementById('demoSetupLimiterDetectorLevel'),demoSetupProtectionThreshold:document.getElementById('demoSetupProtectionThreshold'),demoSetupProtectionThresholdLabel:document.getElementById('demoSetupProtectionThresholdLabel'),demoSetupCompressorGain:document.getElementById('demoSetupCompressorGain'),demoSetupLimiterReduction:document.getElementById('demoSetupLimiterReduction'),demoSetupProgramLevel:document.getElementById('demoSetupProgramLevel')
  };
  const scopeCtx=els.scope.getContext('2d'),cabinTestCtx=els.cabinTest.getContext('2d');
  const state={
    audioContext:null,transportGeneration:0,transportStartPromise:null,transportPreparing:false,programABuffer:null,triadsBuffer:null,programASourceMode:'builtin',demoPlaylist:[],demoPlaylistNextId:1,demoPlaylistDetailsId:null,bachOfflineAnalysis:null,bachAnalysisStatus:'idle',programSynth:null,programReferenceGainNode:null,aContentVolumeGain:null,contentAnalysis:null,programPreAnalyser:null,programPreTimeData:null,programPreEnergyHistory:[],programPrePeakHistory:[],programPreLastUpdateMs:0,programProtection:null,protectionStats:null,outputGuard:null,outputGuardStats:null,outputAnalyzer:null,outputAnalysisWindow:null,outputChainDiagnosticMeters:null,outputChainDiagnosticTimer:null,demoOutputSpectrumWindow:null,backgroundSpectrumAnalyzer:null,backgroundSpectrumMix:null,backgroundSpectrumBands:[],programSpectrumPreAnalyzer:null,programSpectrumPostAnalyzer:null,programSpectrumPreBands:[],programSpectrumPostBands:[],demoProtectionTextLastMs:0,demoGuardHoldUntil:0,demoGuardHeldReduction:0,protectionFeelness:'normal',protectionVolumeCurve:'locked',protectionBypassed:false,systemBoostHeld:false,systemBoostAutoTimer:null,systemBoostCountdownTimer:null,systemBoostPressTimer:null,systemBoostLongPress:false,systemBoostPointerActive:false,systemBoostTimedUntil:0,programAKPre:null,programAKHp:null,programAAnalyser:null,programATimeData:null,programAEnergyHistory:[],programAK3s:null,programReferenceTrimBySource:{
      builtin:10,triads:0,file:4
    },sceneBuffer:null,scenePinkBuffer:null,scenePinkLufs:null,sceneBrownBuffer:null,sceneBrownLufs:null,sceneSourceMode:'brown',ambientBuffer:null,ambientPresetBuffers:{
    },ambientPresetLufs:{
    },ambientPreset:'warm',ambientFileBuffer:null,ambientFileLufs:null,ambientSourceMode:'brown',ambientSourceLufs:null,programASource:null,sceneSource:null,ambientSource:null,programAGainNode:null,sceneGainNode:null,ambientGainNode:null,mixBus:null,aMonitorMixBus:null,aContentMonitorGain:null,aProgramBoostGain:null,monitorGainNode:null,monitorPostAnalyser:null,monitorPostTimeData:null,monitorPostEnergyHistory:[],monitorPostPeakHistory:[],monitorPostLastUpdateMs:0,demoDuckGainNode:null,transportFadeGainNode:null,transportFading:false,demoDucked:false,setupCue:null,setupCueGeneration:0,setupCueStarting:false,setupCueProtection:null,setupCueReferenceGain:null,setupCuePresentationGain:null,setupCuePlaying:false,setupCueMode:null,setupCueLastMode:null,setupCueLastLimiterTargetDb:null,setupCueFinishTimer:null,setupCueFinishPending:false,setupCueStopRequested:false,setupCueStopResolver:null,setupCueCompleted:false,demoHwCueLocked:false,demoHwCuePresentationDb:null,setupCueOutputPeakDbfs:-100,setupCueMaxGuardReductionDb:0,hwSetupPhase:'idle',hwSetupOriginalDemoVolDb:-12,hwSetupError:'',hwSetupWasPlaying:false,hwSetupPreviousLock:false,hwSetupPreviousPresentationDb:null,hwSetupNoticeTimer:null,sumKPre:null,sumKHp:null,sumAnalyser:null,sumTimeData:null,sumVisualMeter:{
      smoothedDb:-100,hasSignal:false
    },meterSink:null,branchMeters:{
      programA:null,scene:null,ambient:null
    },programASourceLufs:null,programAOfflineLoudness:null,sceneSourceLufs:null,programAMuted:false,sceneMuted:true,ambientMuted:false,programASolo:false,sceneSolo:false,ambientSolo:false,demoExperience:null,cabinNoiseSpeed:0,playing:false,animationId:null,lastHistorySampleMs:0,lastVisualMeterUpdateMs:0,lastSumVisualMeterUpdateMs:0,sumEnergyHistory:[],scopeHistory:[]
  };
  // EN: Canvas draws observer state only; audio routing remains in this host.
  const cabinRenderer=createCabinRenderer(()=>({
    state,els,cabinTestCtx,getAllVisualBranchStates,energyToDb,dbToEnergy
  }));
  const CABIN_NOISE_GAIN_BY_SPEED_DB={
    0:-50,50:-18,100:-8
  };
  state.outputAnalysisWindow=createAudioAnalysisWindow(els.outputAnalysisWindow,{spectrumMinDb:-80});
  state.demoOutputSpectrumWindow=createAudioAnalysisWindow(els.demoOutputSpectrum,{spectrumMinDb:-80,getBackgroundBands:()=>state.backgroundSpectrumBands,getPreProtectionBands:()=>state.programSpectrumPreBands});
  function ensureAudioContext(){
    if(!state.audioContext)state.audioContext=new(window.AudioContext||window.webkitAudioContext)();
    return state.audioContext;
  }
  async function resumeAudio(){
    const ac=ensureAudioContext();
    if(ac.state!=='running')await ac.resume();
  }
  const dbToGain=db=>Math.pow(10,db/20),dbToEnergy=db=>Math.pow(10,db/10);
  function energyToDb(e){
    return!Number.isFinite(e)||e<=0?-100:10*Math.log10(e);
  }
  function average(v){
    if(!v.length)return null;
    let s=0;
    for(const x of v)s+=x;
    return s/v.length;
  }
  function formatDb(v,s=' LUFS'){
    return Number.isFinite(v)?`${v.toFixed(1)}${s}`:'--';
  }
  function formatSigned(v,s=' LU'){
    if(!Number.isFinite(v))return'--';
    return`${v>0?'+':''}${v.toFixed(1)}${s}`;
  }
  function formatGain(v){
    const n=Number(v);
    return`${n<0?'−':n>0?'+':''}${Math.abs(n).toFixed(1)} dB`;
  }
  function getBufferSamplePeakDb(buffer){
    let peak=0;
    for(let ch=0;ch<buffer.numberOfChannels;ch++){
      const d=buffer.getChannelData(ch);
      for(let i=0;i<d.length;i++)peak=Math.max(peak,Math.abs(d[i]));
    }
    return 20*Math.log10(Math.max(1e-12,peak));
  }
  function formatOfflineProgramLoudness(r){
    return!r?.hasSignal||!Number.isFinite(r.integratedLufs)?'Offline file analysis: no measurable programme loudness.':`Offline file · ${r.integratedLufs.toFixed(1)} LUFS · peak ${r.samplePeakDbfs.toFixed(1)} dBFS · ${r.durationSec.toFixed(1)} s`;
  }
  function formatAnalysisDb(value){return Number.isFinite(value)?`${value.toFixed(1)} dBFS`:'—';}
  function formatAnalysisLufs(value){return Number.isFinite(value)?`${value.toFixed(1)} LUFS`:'—';}
  function formatBachOfflineSummary(analysis){
    return `Offline Bach · Program A pre-protection after reference trim · ${formatAnalysisLufs(analysis?.integratedLufs)} · peak ${formatAnalysisDb(analysis?.samplePeakDbfs)}.`;
  }
  function getActiveSceneBuffer(){
    if(state.sceneSourceMode==='pink')return state.scenePinkBuffer;
    if(state.sceneSourceMode==='brown')return state.sceneBrownBuffer;
    return state.sceneBuffer;
  }
  // EN: Offline Bach analysis is session-only and observes the same reference-trim and detector conditions as playback.
  const PROCEDURAL_BACH_PARAMS={
    master:-14,bell:-10,treble:0,transpose:24,contentTranspose:0,bass:-13,sub:-16,reverb:0
  };
  const percentileValue=(values,q)=>{
    const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
    if(!sorted.length)return-Infinity;
    const index=(sorted.length-1)*q,low=Math.floor(index),high=Math.ceil(index);
    return low===high?sorted[low]:sorted[low]+(sorted[high]-sorted[low])*(index-low);
  };
  const lowBandReductionDb=(levelDb,ceilingDb)=>{
    const overDb=levelDb-ceilingDb,halfKneeDb=1.5;
    if(overDb<=-halfKneeDb)return 0;
    if(overDb>=halfKneeDb)return overDb;
    return((overDb+halfKneeDb)**2)/6;
  };
  async function renderDetectorBand(buffer){
    const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    const offline=new Offline(buffer.numberOfChannels,buffer.length,buffer.sampleRate),source=offline.createBufferSource();
    source.buffer=buffer;
    let node=source;
    for(const type of['highpass','highpass','lowpass','lowpass']){
      const filter=offline.createBiquadFilter();
      filter.type=type;
      filter.frequency.value=type==='highpass'?20:90;
      filter.Q.value=Math.SQRT1_2;
      node.connect(filter);
      node=filter;
    }
    node.connect(offline.destination);
    source.start(0);
    return offline.startRendering();
  }
  function detectorWindowsDb(buffer){
    const windowSamples=Math.round(buffer.sampleRate*.4),hopSamples=Math.round(buffer.sampleRate*.1),windows=[];
    for(let start=0;start+windowSamples<=buffer.length;start+=hopSamples){
      let energy=0;
      for(let channel=0;channel<buffer.numberOfChannels;channel++){
        const samples=buffer.getChannelData(channel);
        for(let index=start;index<start+windowSamples;index++)energy+=samples[index]*samples[index];
      }
      windows.push(10*Math.log10(Math.max(energy/(windowSamples*buffer.numberOfChannels),1e-12)));
    }
    return windows;
  }
  async function analyseBachOfflineRender(){
    if(state.bachAnalysisStatus==='running')return;
    state.bachAnalysisStatus='running';
    state.demoPlaylistDetailsId='builtin';
    renderDemoPlaylist();
    try{
      const rendered=await renderProgramMixOffline({mix:PROCEDURAL_BACH_PARAMS});
      const engineLoudness=await analyseProgramLoudness(rendered.buffer);
      const referenceTrimDb=state.programReferenceTrimBySource.builtin;
      const preProtectionLoudness=applyProgramReferenceTrim(engineLoudness,referenceTrimDb);
      const detectorBuffer=await renderDetectorBand(rendered.buffer);
      const detectorWindows=detectorWindowsDb(detectorBuffer).map(value=>value+referenceTrimDb);
      const currentCeilingDbfs=effectiveProtectionCeilingDb();
      const reductions=detectorWindows.map(value=>lowBandReductionDb(value,currentCeilingDbfs));
      state.bachOfflineAnalysis={
        seed:rendered.seed,durationSec:rendered.loopDurationSec,referenceTrimDb,
        engineLoudness,preProtectionLoudness,
        detectorP95Dbfs:percentileValue(detectorWindows,.95),detectorMaxDbfs:Math.max(...detectorWindows),
        currentCeilingDbfs,reductionP95Db:percentileValue(reductions,.95),reductionMaxDb:Math.max(...reductions)
      };
      setContentAnalysisOfflineSummary(formatBachOfflineSummary(preProtectionLoudness));
      state.bachAnalysisStatus='ready';
    }catch(error){
      state.bachAnalysisStatus='error';
      els.status.textContent='Procedural Bach offline analysis failed: '+error.message;
    }
    renderDemoPlaylist();
  }

  const localDemoContent={
    defaultTracks:[
      {id:'default-speech-male-1',path:'../../private/AudiDemo Speak Male 1.wav'},
      {id:'default-boz-scaggs-miss-riddle',path:'../../private/03 Boz Scaggs - Miss Riddle.flac'},
      {id:'default-marcus-miller-cousin-john',path:'../../private/09 Marcus Miller - Cousin John.flac'}
    ],
    ambient:{
      quiet:'../private/ambient-quiet.mp3',driving:'../private/ambient-driving.mp3',motorway:'../private/ambient-motorway.mp3'
    }
  };
  function getActiveSceneSourceLufs(){
    if(state.sceneSourceMode==='pink')return state.scenePinkLufs;
    if(state.sceneSourceMode==='brown')return state.sceneBrownLufs;
    return state.sceneSourceLufs;
  }
  function getActiveAmbientBuffer(){
    return state.ambientSourceMode==='file'?state.ambientFileBuffer:state.ambientBuffer;
  }
  function getActiveAmbientSourceLufs(){
    return state.ambientSourceMode==='file'?state.ambientFileLufs:state.ambientSourceLufs;
  }
  function getBranchSourceEstimate(branch){
    if(branch==='programA'){
      if(Number.isFinite(state.programAK3s))return state.programAK3s;
      if(state.programASourceMode==='file'&&Number.isFinite(state.programASourceLufs))return state.programASourceLufs+Number(els.programReferenceTrim.value);
      return null;
    }
    if(branch==='scene')return getActiveSceneSourceLufs();
    if(branch==='ambient')return getActiveAmbientSourceLufs();
    return null;
  }
  function getBranchGainDb(branch){
    if(branch==='programA')return 0;
    if(branch==='scene')return Number(els.sceneGain.value);
    if(branch==='ambient')return Number(els.ambientGain.value);
    return 0;
  }
  function getBranchAudible(branch){
    const anySolo=state.programASolo||state.sceneSolo||state.ambientSolo;
    if(branch==='programA')return!state.programAMuted&&(!anySolo||state.programASolo);
    if(branch==='scene')return!state.sceneMuted&&(!anySolo||state.sceneSolo);
    if(branch==='ambient')return!state.ambientMuted&&(!anySolo||state.ambientSolo);
    return false;
  }
  function getVisualBranchState(branch){
    const sourceEstimateDb=getBranchSourceEstimate(branch),gainDb=getBranchGainDb(branch),audible=getBranchAudible(branch),configuredRenderedDb=Number.isFinite(sourceEstimateDb)?sourceEstimateDb+gainDb:null,meter=state.branchMeters[branch];
    return{
      branch,sourceEstimateDb,gainDb,audible,configuredRenderedDb,audibleRenderedDb:audible?configuredRenderedDb:null,liveRmsDb:meter&&meter.hasSignal?meter.smoothedDb:null
    };
  }
  function getAllVisualBranchStates(){
    return{
      programA:getVisualBranchState('programA'),scene:getVisualBranchState('scene'),ambient:getVisualBranchState('ambient')
    }
  }

  function buildPinkNoiseBuffer(context,durationSec=30){
    const length=Math.max(1,Math.floor(context.sampleRate*durationSec)),buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for(let i=0;i<length;i++){
      const white=Math.random()*2-1;
      b0=.99886*b0+white*.0555179;
      b1=.99332*b1+white*.0750759;
      b2=.969*b2+white*.153852;
      b3=.8665*b3+white*.3104856;
      b4=.55*b4+white*.5329522;
      b5=-.7616*b5-white*.016898;
      const pink=b0+b1+b2+b3+b4+b5+b6+white*.5362;
      b6=white*.115926;
      data[i]=pink*.11;
    }
    return buffer;
  }
  async function buildBrownNoise50HzBuffer(context,durationSec=30){
    const length=Math.max(1,Math.floor(context.sampleRate*durationSec)),raw=context.createBuffer(1,length,context.sampleRate),data=raw.getChannelData(0);
    let brown=0;
    for(let i=0;i<length;i++){
      const white=Math.random()*2-1;
      brown=(brown+.02*white)/1.02;
      data[i]=brown*3.5;
    }
    const offline=new OfflineAudioContext(1,length,context.sampleRate),src=offline.createBufferSource();
    src.buffer=raw;
    const hp=offline.createBiquadFilter();
    hp.type='highpass';
    hp.frequency.value=50;
    hp.Q.value=.707;
    src.connect(hp);
    hp.connect(offline.destination);
    src.start(0);
    return offline.startRendering();
  }
  async function buildAmbientBrown20HzBuffer(context,durationSec=30,preset='full'){
    const length=Math.max(1,Math.floor(context.sampleRate*durationSec)),raw=context.createBuffer(1,length,context.sampleRate),data=raw.getChannelData(0);
    let brown=0;
    for(let i=0;i<length;i++){
      const white=Math.random()*2-1;
      brown=(brown+.02*white)/1.02;
      data[i]=brown*3.5;
    }
    const offline=new OfflineAudioContext(1,length,context.sampleRate),src=offline.createBufferSource();
    src.buffer=raw;
    const hp=offline.createBiquadFilter();
    hp.type='highpass';
    hp.frequency.value=20;
    hp.Q.value=.707;
    src.connect(hp);
    let output=hp;
    const settings={
      soft:[2000,0],warm:[800,0],hvac:[4000,150]
    }
    [preset];
    if(settings){
      if(settings[1]){
        const hp2=offline.createBiquadFilter();
        hp2.type='highpass';
        hp2.frequency.value=settings[1];
        output.connect(hp2);
        output=hp2;
      }
      const lp=offline.createBiquadFilter();
      lp.type='lowpass';
      lp.frequency.value=settings[0];
      output.connect(lp);
      output=lp;
    }
    output.connect(offline.destination);
    src.start(0);
    return offline.startRendering();
  }
  async function ensureAmbientReady(){
    await resumeAudio();
    const preset=state.ambientPreset;
    if(!state.ambientPresetBuffers[preset]){
      els.ambientState.textContent='generating…';
      const buffer=await buildAmbientBrown20HzBuffer(state.audioContext,30,preset),measured=await analyseIntegratedKStyle(buffer),trimDb=-13.8-measured;
      for(let c=0;c<buffer.numberOfChannels;c++){
        const data=buffer.getChannelData(c),gain=dbToGain(trimDb);
        for(let i=0;i<data.length;i++)data[i]*=gain;
      }
      state.ambientPresetBuffers[preset]=buffer;
      state.ambientPresetLufs[preset]=await analyseIntegratedKStyle(buffer);
      state.ambientBuffer=buffer;
      state.ambientSourceLufs=state.ambientPresetLufs[preset];
      els.ambientAnalysis.textContent=`Generated ambient K/LUFS-style estimate: ${formatDb(state.ambientSourceLufs)} · ${preset} brown · normalized to −13.8 LUFS · 30 s loop`;
      els.ambientState.textContent='ready';
    }
    state.ambientBuffer=state.ambientPresetBuffers[preset];
    state.ambientSourceLufs=state.ambientPresetLufs[preset];
  }
  async function setAmbientPreset(preset){
    const wasPlaying=state.playing;
    if(wasPlaying)stopBoth(false);
    state.ambientPreset=preset;
    await ensureAmbientReady();
    document.querySelectorAll('[data-ambient-preset]').forEach(b=>b.classList.toggle('active',b.dataset.ambientPreset===preset));
    updateReadouts();
    updateStatus();
    if(wasPlaying)await startBoth();
  }
  async function setAmbientSourceMode(mode){
    if(mode!=='brown'&&mode!=='file')return;
    const wasPlaying=state.playing;
    if(wasPlaying)stopBoth(false);
    state.ambientSourceMode=mode;
    if(mode==='brown')await ensureAmbientReady();
    els.ambientSourceBrown.classList.toggle('active',mode==='brown');
    els.ambientSourceFile.classList.toggle('active',mode==='file');
    els.ambientFileRow.style.display=mode==='file'?'':'none';
    els.ambientAnalysis.textContent=mode==='file'&&state.ambientFileBuffer?`Ambient file K/LUFS-style estimate: ${formatDb(state.ambientFileLufs)} · duration ${state.ambientFileBuffer.duration.toFixed(1)} s`:mode==='file'?'Ambient file K/LUFS-style estimate: --':`Generated ambient K/LUFS-style estimate: ${formatDb(state.ambientSourceLufs)} · Brown · 20 Hz high-pass · 30 s loop`;
    updateReadouts();
    refreshTransportState();
    updateStatus();
    if(wasPlaying&&isProgramReady()&&getActiveSceneBuffer()&&getActiveAmbientBuffer())await startBoth();
  }
  async function ensureBrownSceneReady(){
    await resumeAudio();
    if(!state.sceneBrownBuffer){
      els.sceneState.textContent='generating…';
      state.sceneBrownBuffer=await buildBrownNoise50HzBuffer(state.audioContext,30);
      state.sceneBrownLufs=await analyseIntegratedKStyle(state.sceneBrownBuffer);
    }
  }
  async function ensurePinkSceneReady(){
    await resumeAudio();
    if(!state.scenePinkBuffer){
      els.sceneState.textContent='generating…';
      state.scenePinkBuffer=buildPinkNoiseBuffer(state.audioContext,30);
      state.scenePinkLufs=await analyseIntegratedKStyle(state.scenePinkBuffer);
    }
  }
  async function setSceneSourceMode(mode){
    if(!['file','pink','brown'].includes(mode))return;
    const wasPlaying=state.playing;
    if(wasPlaying)stopBoth(false);
    state.sceneSourceMode=mode;
    if(mode==='pink')await ensurePinkSceneReady();
    if(mode==='brown')await ensureBrownSceneReady();
    els.sceneSourceFile.classList.toggle('active',mode==='file');
    els.sceneSourcePink.classList.toggle('active',mode==='pink');
    els.sceneSourceBrown.classList.toggle('active',mode==='brown');
    els.sceneFileRow.style.display=mode==='file'?'':'none';
    els.sceneAnalysis.textContent=mode==='pink'?`Generated pink-noise K/LUFS-style estimate: ${formatDb(state.scenePinkLufs)} · 30 s loop`:mode==='brown'?`Generated brown-noise K/LUFS-style estimate: ${formatDb(state.sceneBrownLufs)} · 50 Hz high-pass · 30 s loop`:state.sceneBuffer?`Source K/LUFS-style estimate: ${formatDb(state.sceneSourceLufs)} · duration ${state.sceneBuffer.duration.toFixed(1)} s`:'Source K/LUFS-style estimate: --';
    updateReadouts();
    refreshTransportState();
    updateStatus();
    if(wasPlaying&&isProgramReady()&&getActiveSceneBuffer())await startBoth();
  }
  // EN: NO VIBRATION tightens the true limiter ceiling; it never uses post-limiter EQ.
  const PROTECTION_VOLUME_REFERENCE_DB=-12,QUIET_PROTECTION_RELIEF_MAX_DB=6,SETUP_CUE_DIGITAL_REFERENCE_DB=0,DEMO_AFTER_CHECK_DELAY_MS=3000,DEMO_REVEAL_DELAY_MS=2000,NO_VIBRATION_CEILING_OFFSET_DB=-9,FEELNESS_OFFSETS_DB={
    light:NO_VIBRATION_CEILING_OFFSET_DB,normal:0
  };
  // EN: Tighten protection above the reference level and restore bounded low-band headroom below it.
  const PROTECTION_VOLUME_CURVES={
    off:{
      label:'Off',slope:0
    },gentle:{
      label:'Gentle',slope:.5
    },locked:{
      label:'Locked',slope:1,ceilingOffsetDb:12
    }
  };
  function effectiveProtectionCeilingDb(){
    const curve=PROTECTION_VOLUME_CURVES[state.protectionVolumeCurve]||PROTECTION_VOLUME_CURVES.locked,presentationVolDb=Number(els.monitorGain.value);
    const lockedReferenceDb=state.demoHwCueLocked&&Number.isFinite(state.demoHwCuePresentationDb)?state.demoHwCuePresentationDb:null;
    if(curve===PROTECTION_VOLUME_CURVES.locked&&lockedReferenceDb!==null){
      const deltaDb=presentationVolDb-lockedReferenceDb,quietHeadroomDb=QUIET_PROTECTION_RELIEF_MAX_DB+curve.ceilingOffsetDb;
      // EN: Anchor the Locked detector curve to the calibrated digital HW-master reference.
      return Number(els.protectionCeiling.value)+FEELNESS_OFFSETS_DB[state.protectionFeelness]+Math.min(quietHeadroomDb,Math.max(0,-deltaDb))-Math.max(0,deltaDb)*curve.slope;
    }
    const hwIncreaseDb=Math.max(0,presentationVolDb-PROTECTION_VOLUME_REFERENCE_DB),quietReliefDb=Math.min(QUIET_PROTECTION_RELIEF_MAX_DB,Math.max(0,PROTECTION_VOLUME_REFERENCE_DB-presentationVolDb));
    // EN: Raise only the Locked detector threshold to reduce over-limiting at ordinary Demo VOL levels.
    return Number(els.protectionCeiling.value)+FEELNESS_OFFSETS_DB[state.protectionFeelness]+quietReliefDb-hwIncreaseDb*curve.slope+(curve.ceilingOffsetDb||0);
  }
  // EN: The explicit Lab bypass and the temporary +6 dB test both bypass low-band content protection.
  function isProtectionTestBypassed(){
    return state.protectionBypassed||state.systemBoostHeld;
  }
  function updateProtectionUi(){
    const bypassed=isProtectionTestBypassed(),reduction=bypassed?0:(state.protectionStats?.reductionDb||0),active=reduction>.15;
    els.listenerACard.classList.toggle('protectionActive',active);
    renderDemoExperience();
    document.querySelectorAll('[data-protection-curve]').forEach(b=>b.classList.toggle('active',b.dataset.protectionCurve===state.protectionVolumeCurve));
    document.querySelectorAll('[data-protection-mode]').forEach(b=>b.classList.toggle('active',(b.dataset.protectionMode==='bypass')===state.protectionBypassed));
    const curve=PROTECTION_VOLUME_CURVES[state.protectionVolumeCurve]||PROTECTION_VOLUME_CURVES.locked;
    els.protectionDemoState.textContent=state.systemBoostHeld?'Tactile feelness control: '+state.protectionFeelness+' · +6 dB test · content protection bypass':state.protectionBypassed?'Tactile feelness control: '+state.protectionFeelness+' · protection bypass · test':active?'Tactile feelness control: '+state.protectionFeelness+' · '+curve.label+' curve · active −'+reduction.toFixed(1)+' dB':'Tactile feelness control: '+state.protectionFeelness+' · '+curve.label+' curve';
    updatePresentationProfileUi();
    renderDemoSetup();
  }
  function configureProtection(){
    const ceilingDb=effectiveProtectionCeilingDb();
    const bypassed=isProtectionTestBypassed();
    state.programProtection?.configure({
      enabled:!bypassed,compressorEnabled:!bypassed,ceilingDb
    });
    state.contentAnalysis?.setDetectorLimitDb(ceilingDb);
    return ceilingDb;
  }
  const PRESENTATION_PROFILE_DB={
    quiet:-18,office:-12,noisy:-6,fair:0
  };
  function updatePresentationProfileUi(){
    const value=Number(els.monitorGain.value);
    document.querySelectorAll('[data-presentation-profile]').forEach(b=>b.classList.toggle('active',PRESENTATION_PROFILE_DB[b.dataset.presentationProfile]===value));
    const ceiling=effectiveProtectionCeilingDb();
    if(els.presentationSafetyState)els.presentationSafetyState.textContent=`HW master simulation ${value.toFixed(1)} dB · effective bass ceiling ${ceiling.toFixed(1)} dBFS · ${state.protectionFeelness}`;
  }
  function setPresentationProfile(profile){
    const target=PRESENTATION_PROFILE_DB[profile];
    if(!Number.isFinite(target))return;
    els.monitorGain.value=String(target);
    updateControls();
    if(state.monitorGainNode&&state.audioContext){
      const now=state.audioContext.currentTime,gain=state.monitorGainNode.gain;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value,now);
      gain.linearRampToValueAtTime(dbToGain(target),now+1);
    }
    updateStatus();
  }
  function renderDemoSetup(){
    if(!els.demoSetupReady)return;
    const selected=els.cabinProgramSelect.selectedOptions?.[0],program=selected?.textContent||'Program A',cabin=Number.isFinite(state.cabinNoiseSpeed)?state.cabinNoiseSpeed+' km/h':'Custom',sceneOn=getBranchAudible('scene')&&Number(els.sceneGain.value)>-79,sceneName=state.sceneSourceMode==='file'?'File':state.sceneSourceMode==='pink'?'Pink noise':'Brown noise',bypassed=isProtectionTestBypassed(),guardReduction=state.outputGuardStats?.reductionDb||0,reduction=bypassed?0:(state.protectionStats?.reductionDb||0),compressorGainDb=bypassed?0:(Number.isFinite(state.protectionStats?.compressorGainDb)?state.protectionStats.compressorGainDb:0),previewGainDb=Number.isFinite(state.protectionStats?.previewGainDb)?state.protectionStats.previewGainDb:0,ready=isProgramReady()&&isSceneConfigured()&&isAmbientConfigured(),now=performance.now();
    els.demoSetupProgram.textContent=program;
    els.demoSetupTrim.textContent='Reference trim '+formatGain(els.programReferenceTrim.value);
    els.demoSetupCabin.textContent=cabin;
    els.demoSetupScene.textContent=sceneOn?'Scene '+sceneName:'Scene off';
    els.demoSetupPresentation.textContent='DEMO '+formatGain(els.monitorGain.value);
    if(guardReduction>.05){
      state.demoGuardHeldReduction=guardReduction;
      state.demoGuardHoldUntil=now+1000;
    }
    const guardHeld=now<state.demoGuardHoldUntil;
    els.demoSetupProtection.textContent=guardHeld?'−'+state.demoGuardHeldReduction.toFixed(1)+' dB':'';
    els.demoSetupProtection.classList.toggle('active',guardHeld);
    if(now-state.demoProtectionTextLastMs>=500||!state.demoProtectionTextLastMs){
      state.demoProtectionTextLastMs=now;
      const netGainDb=bypassed?previewGainDb:compressorGainDb-reduction;
      els.demoSetupProtectionReduction.textContent=bypassed?'PROTECTION OFF':`NET ${formatGain(netGainDb)}`;
      els.demoSetupProtectionReduction.classList.toggle('bypassed',bypassed);
      els.demoSetupDetectorLevel.textContent=formatAnalysisDb(state.protectionStats?.preDbfs);
      els.demoSetupLimiterDetectorLevel.textContent=formatAnalysisDb(state.protectionStats?.postDbfs);
      els.demoSetupProtectionThreshold.textContent=formatAnalysisDb(effectiveProtectionCeilingDb());
      els.demoSetupProtectionThresholdLabel.textContent=bypassed?'Configured threshold':'Active threshold';
      els.demoSetupCompressorGain.textContent=formatGain(compressorGainDb);
      els.demoSetupLimiterReduction.textContent=formatGain(-reduction);
      const programEnergy=state.playing&&state.programPreEnergyHistory.length?average(state.programPreEnergyHistory.map(sample=>sample.energy)):null;
      els.demoSetupProgramLevel.textContent=formatAnalysisDb(Number.isFinite(programEnergy)?energyToDb(programEnergy):null);
    }
    const gaugeGainDb=Math.max(-18,Math.min(12,bypassed?previewGainDb:compressorGainDb-reduction)),zeroPosition=18/30*100,gaugeWidth=Math.abs(gaugeGainDb)/30*100;
    els.demoSetupProtectionFill.style.width=gaugeWidth.toFixed(1)+'%';
    els.demoSetupProtectionFill.style.left=(gaugeGainDb>=0?zeroPosition:zeroPosition-gaugeWidth).toFixed(1)+'%';
    els.demoSetupProtectionFill.classList.toggle('boost',gaugeGainDb>0&&!bypassed);
    els.demoSetupProtectionFill.classList.toggle('reduction',gaugeGainDb<0&&!bypassed);
    els.demoSetupProtectionFill.classList.toggle('bypassed',bypassed);
    els.demoSetupProtectionNote.textContent=bypassed?'Grey bar · '+formatGain(previewGainDb)+' candidate · hypothetical only, not applied':'Net low-band gain · compressor boost minus limiter reduction · compressor maximum +9 dB';
    const feelnessState=document.getElementById('demoFeelnessSetupState');
    if(feelnessState)feelnessState.textContent=state.protectionFeelness==='light'?'NO VIBRATION':'DEFAULT';
    els.demoSetupReady.textContent=ready?'DEMO READY':'SETUP INCOMPLETE';
    els.demoSetupReady.classList.toggle('warning',!ready||bypassed);
  }
  function renderHwCueSetup(){
    const starting=state.setupCueStarting,active=state.setupCuePlaying||starting,phase=state.hwSetupPhase,finishing=phase==='finishing';
    els.hwOrientationPanel.hidden=phase!=='orientation-playing';
    els.hwLoudPanel.hidden=phase!=='loud-playing'&&!finishing;
    els.demoHwCueStop.textContent=active||finishing?'STOP TEST':'PLAY TEST';
    els.demoHwCueStop.setAttribute('aria-pressed',active||finishing?'true':'false');
    els.demoHwCueStop.disabled=finishing;
    els.hwSetupLoudStart.disabled=starting||phase!=='orientation-playing';
    els.hwSetupContinue.disabled=phase!=='loud-playing';
    els.hwSetupFeedback.textContent=state.hwSetupError;
    els.monitorGain.disabled=active;
  }
  function clearHwCueLock(){state.demoHwCueLocked=false;state.demoHwCuePresentationDb=null;state.setupCueCompleted=false;state.setupCueMaxGuardReductionDb=0;configureProtection();renderHwCueSetup();}
  function disposeSetupCue(){
    if(state.setupCueFinishTimer!==null){window.clearTimeout(state.setupCueFinishTimer);state.setupCueFinishTimer=null;}
    try{state.setupCue?.dispose();}catch{}try{state.setupCueProtection?.dispose();}catch{}
    for(const node of [state.setupCueReferenceGain,state.setupCuePresentationGain]){try{node?.disconnect();}catch{}}
    state.setupCue=null;state.setupCueProtection=null;state.setupCueReferenceGain=null;state.setupCuePresentationGain=null;
  }
  function finalizeSetupCue(completed){
    if(!state.setupCuePlaying)return;
    state.setupCueFinishTimer=null;state.setupCueFinishPending=false;
    const mode=state.setupCueMode;
    disposeSetupCue();state.setupCuePlaying=false;state.setupCueMode=null;
    state.setupCueCompleted=false;state.setupCueStopRequested=false;
    if(mode==='bass')els.status.textContent=completed?'Bass-feel replay complete.':'Bass-feel replay stopped.';
    else els.status.textContent=completed?'HW setup test ended.':'HW setup test stopped.';
    renderHwCueSetup();
    const resolve=state.setupCueStopResolver;state.setupCueStopResolver=null;resolve?.();
  }
  function finishSetupCue(completed){
    if(!state.setupCuePlaying||state.setupCueFinishPending)return;
    state.setupCueFinishPending=true;
    const drainMs=state.setupCueMode==='bass'?80:15;
    state.setupCueFinishTimer=window.setTimeout(()=>finalizeSetupCue(completed),drainMs);
  }
  function stopSetupCue(){
    if(state.setupCueStarting){state.setupCueGeneration++;state.setupCueStarting=false;renderHwCueSetup();return;}
    if(!state.setupCuePlaying||!state.audioContext)return;
    state.setupCueStopRequested=true;state.setupCue?.stop(state.audioContext.currentTime);
  }
  function stopSetupCueAndWait(){
    if(state.setupCueStarting){stopSetupCue();return Promise.resolve();}
    if(!state.setupCuePlaying)return Promise.resolve();
    return new Promise(resolve=>{
      let settled=false;
      const finish=()=>{if(settled)return;settled=true;window.clearTimeout(fallback);resolve();};
      state.setupCueStopResolver=finish;
      const fallback=window.setTimeout(()=>{if(state.setupCuePlaying)finalizeSetupCue(false);finish();},700);
      stopSetupCue();
    });
  }
  async function startSetupCue(mode,{digitalGainDb=0,loop=mode==='setup'}={}){
    if(state.setupCuePlaying||state.setupCueStarting)return;
    const generation=++state.setupCueGeneration;
    const isCurrent=()=>state.setupCueGeneration===generation;
    state.setupCueStarting=true;
    renderHwCueSetup();
    let pendingProtection=null;
    try{
      if(state.playing||state.transportPreparing)stopBoth(false);
      if(mode==='setup'){
        els.monitorGain.value=String(SETUP_CUE_DIGITAL_REFERENCE_DB);
        updateControls();
        state.setupCueOutputPeakDbfs=-100;state.setupCueMaxGuardReductionDb=0;state.setupCueLimiterStats=null;
      }
      await resumeAudio();
      if(!isCurrent())return;
      await ensureOutputGuard();
      if(!isCurrent())return;
      ensureMixGraph();
      ensureOutputAnalysisObserver();
      const ac=state.audioContext;
      state.outputAnalyzer?.reset();state.outputAnalysisWindow?.reset();
      state.setupCueOutputPeakDbfs=-100;state.setupCueMaxGuardReductionDb=0;state.setupCueLimiterStats=null;
      state.outputGuard.reset();state.outputGuardStats={...(state.outputGuardStats||{}),reductionDb:0};
      if(mode==='bass'){
        pendingProtection=await createLowBandProtectionChain(ac,{onMeter:stats=>{state.setupCueLimiterStats=stats;},onFault:stats=>{state.setupCueLimiterFault=stats.fault;}});
        if(!isCurrent()){pendingProtection.dispose?.();return;}
        state.setupCueProtection=pendingProtection;pendingProtection=null;
        state.setupCueLastLimiterTargetDb=effectiveProtectionCeilingDb();
        state.setupCueProtection.configure({enabled:true,ceilingDb:state.setupCueLastLimiterTargetDb});
      }else state.setupCueLastLimiterTargetDb=null;
      state.setupCueReferenceGain=ac.createGain();state.setupCueReferenceGain.gain.value=1;
      state.setupCuePresentationGain=ac.createGain();state.setupCuePresentationGain.gain.setValueAtTime(mode==='setup'?dbToGain(digitalGainDb):dbToGain(Number(els.monitorGain.value)),ac.currentTime);
      state.setupCue=createEMajorTriadOctaveCue(ac,{loop,onEnded:()=>finishSetupCue(!state.setupCueStopRequested)});
      state.setupCue.output.connect(state.setupCueReferenceGain);
      if(mode==='setup')state.setupCueReferenceGain.connect(state.setupCuePresentationGain);
      else {state.setupCueReferenceGain.connect(state.setupCueProtection.input);state.setupCueProtection.output.connect(state.setupCuePresentationGain);}
      state.setupCuePresentationGain.connect(state.outputGuard.input);
      state.setupCuePlaying=true;state.setupCueStarting=false;state.setupCueMode=mode;state.setupCueLastMode=mode;state.setupCueFinishPending=false;state.setupCueStopRequested=false;state.setupCueCompleted=false;state.setupCue.start(ac.currentTime+.05);
      els.status.textContent=mode==='bass'?'Bass-feel replay running. Do not change physical HW volume.':state.hwSetupPhase==='orientation-playing'?'Quiet HW setup orientation running.':'Loud HW setup reference running; adjust physical device volume gradually.';renderHwCueSetup();
    }catch(error){
      if(!isCurrent()){pendingProtection?.dispose?.();return;}
      disposeSetupCue();pendingProtection?.dispose?.();state.setupCuePlaying=false;state.setupCueStarting=false;state.setupCueMode=null;state.hwSetupError='Could not start test sound: '+error.message;if(mode==='setup')state.hwSetupPhase='prepare';els.status.textContent=state.hwSetupError;renderHwCueSetup();
    }finally{
      if(isCurrent()&&state.setupCueStarting){state.setupCueStarting=false;renderHwCueSetup();}
    }
  }
  function updateControls(ambientFadeSeconds=.02,{
    suppressDemoUi=false
  }
  ={
  }){
    els.programReferenceTrimValue.textContent=formatGain(els.programReferenceTrim.value);
    els.aContentVolumeValue.textContent=formatGain(els.aContentVolume.value);
    els.sceneGainValue.textContent=formatGain(els.sceneGain.value);
    els.ambientGainValue.textContent=formatGain(els.ambientGain.value);
    els.monitorGainValue.textContent=formatGain(els.monitorGain.value);
    state.contentAnalysis?.setPresentationVolumeDb(Number(els.monitorGain.value));
    if(state.monitorGainNode&&state.audioContext)state.monitorGainNode.gain.setTargetAtTime(dbToGain(Number(els.monitorGain.value)),state.audioContext.currentTime,.03);
    if(state.setupCuePresentationGain&&state.audioContext&&state.setupCueMode!=='setup')state.setupCuePresentationGain.gain.setTargetAtTime(dbToGain(Number(els.monitorGain.value)),state.audioContext.currentTime,.03);
    renderHwCueSetup();
    if(state.programReferenceGainNode&&state.audioContext)state.programReferenceGainNode.gain.setTargetAtTime(dbToGain(Number(els.programReferenceTrim.value)),state.audioContext.currentTime,.03);
    if(state.aContentVolumeGain&&state.audioContext)state.aContentVolumeGain.gain.setTargetAtTime(dbToGain(Number(els.aContentVolume.value)),state.audioContext.currentTime,.03);
    updateBranchGains({
      ambientFadeSeconds
    });
    configureProtection();
    updateReadouts();
    updateDemoVolumeUi();
    updateAContentVolumeUi();
    updateCabinNoiseUi({
      suppressDemoUi
    });
    updateProtectionUi();
    updatePresentationProfileUi();
  }
  function updateCabinNoiseUi({
    suppressDemoUi=false
  }
  ={
  }){
    const gainDb=Number(els.ambientGain.value),matchedSpeed=Object.entries(CABIN_NOISE_GAIN_BY_SPEED_DB).find(([,value])=>value===gainDb)?.[0];
    state.cabinNoiseSpeed=matchedSpeed===undefined?null:Number(matchedSpeed);
    if(!suppressDemoUi)state.demoExperience?.render({
      cabinNoiseSpeed:state.cabinNoiseSpeed
    });
  }
  function setCabinNoiseCondition(speed,{
    suppressDemoUi=false
  }
  ={
  }){
    const gainDb=CABIN_NOISE_GAIN_BY_SPEED_DB[speed];
    if(!Number.isFinite(gainDb))return;
    els.ambientGain.value=String(gainDb);
    updateControls(1,{
      suppressDemoUi
    });
    updateStatus();
  }
  function renderDemoExperience(){
    const reduction=isProtectionTestBypassed()?0:(state.protectionStats?.reductionDb||0);
    state.demoExperience?.render({
      cabinNoiseSpeed:state.cabinNoiseSpeed,monitorGainDb:Number(els.monitorGain.value),aContentVolumeDb:Number(els.aContentVolume.value),demoDucked:state.demoDucked,demoPlaying:state.playing,systemBoostHeld:state.systemBoostHeld,systemBoostTimedUntil:state.systemBoostTimedUntil,protectionFeelness:state.protectionFeelness,listenerA:true,boostAvailable:state.playing&&getBranchAudible('programA'),protectionReductionDb:reduction
    });
  }
  function updateDemoVolumeUi(){
    updateProtectionUi();
    renderDemoExperience();
  }
  function stepDemoVolume(deltaDb){
    const current=Number(els.monitorGain.value),next=Math.max(-36,Math.min(0,Math.round((current+deltaDb)/6)*6));
    els.monitorGain.value=String(next);
    updateControls();
    updateStatus();
  }
  // EN: The existing Candidate control now owns six-decibel Program A content steps.
  function stepAContentVolume(deltaDb){
    const current=Number(els.aContentVolume.value),next=Math.max(-30,Math.min(6,Math.round((current+deltaDb)/6)*6));
    els.aContentVolume.value=String(next);
    updateControls();
    updateStatus();
  }
  function updateAContentVolumeUi(){
    const db=Number(els.aContentVolume.value),segments=document.querySelectorAll('#demoAContentVolumeSegments span');
    // EN: One visible marker corresponds to each selectable 6 dB A VOL step.
    const activeCount=Math.max(1,Math.min(segments.length,Math.round((db+30)/6)+1));
    segments.forEach((segment,index)=>segment.classList.toggle('on',index<activeCount));
    document.getElementById('demoAContentVolumeValue').textContent=formatGain(db);
    document.getElementById('demoAContentVolUp').disabled=db>=6;
    document.getElementById('demoAContentVolDown').disabled=db<=-30;
  }
  function toggleDemoDuck(){
    if(!state.playing)return;
    state.demoDucked=!state.demoDucked;
    if(state.demoDuckGainNode&&state.audioContext){
      const now=state.audioContext.currentTime,target=state.demoDucked?dbToGain(-20):1;
      state.demoDuckGainNode.gain.cancelScheduledValues(now);
      state.demoDuckGainNode.gain.setValueAtTime(state.demoDuckGainNode.gain.value,now);
      state.demoDuckGainNode.gain.linearRampToValueAtTime(target,now+1);
    }
    updateDemoVolumeUi();
  }
  // EN: Play starts at the configured presentation level; mute is a separate narration control.
  async function startDemo({
    showDemo=false
  }
  ={
  }){
    if(state.playing||state.transportPreparing)return;
    state.demoDucked=false;
    await startBoth();
    if(showDemo){
      document.body.classList.add('demoMode');
      updateViewModeButton();
      els.cabinTest.closest('.cabinTestBox')?.scrollIntoView({
        behavior:'smooth',block:'start'
      });
    }
    renderDemoExperience();
  }
  function updateBranchGains({
    ambientFadeSeconds=.02
  }
  ={
  }){
    if(!state.audioContext)return;
    const now=state.audioContext.currentTime;
    if(state.sceneGainNode)state.sceneGainNode.gain.setTargetAtTime(getBranchAudible('scene')?dbToGain(Number(els.sceneGain.value)):0,now,.02);
    if(state.ambientGainNode){
      const target=getBranchAudible('ambient')?dbToGain(Number(els.ambientGain.value)):0;
      if(ambientFadeSeconds>=.1){
        state.ambientGainNode.gain.cancelScheduledValues(now);
        state.ambientGainNode.gain.setValueAtTime(state.ambientGainNode.gain.value,now);
        state.ambientGainNode.gain.linearRampToValueAtTime(target,now+ambientFadeSeconds);
      }
      else state.ambientGainNode.gain.setTargetAtTime(target,now,ambientFadeSeconds);
    }
    updateAContentMonitorRoutes();
    els.programAMute.classList.toggle('active',state.programAMuted);
    els.sceneMute.classList.toggle('active',state.sceneMuted);
    els.ambientMute.classList.toggle('active',state.ambientMuted);
    els.programASolo.classList.toggle('active',state.programASolo);
    els.sceneSolo.classList.toggle('active',state.sceneSolo);
    els.ambientSolo.classList.toggle('active',state.ambientSolo);
  }
  // EN: Boost changes only Program A upstream of low-band protection; Scene and Ambient are unaffected.
  function updateAContentMonitorRoutes(){
    if(!state.audioContext)return;
    const now=state.audioContext.currentTime,audible=getBranchAudible('programA'),boosted=audible&&state.systemBoostHeld;
    if(state.aContentMonitorGain)state.aContentMonitorGain.gain.setTargetAtTime(audible?1:0,now,.025);
    if(state.aProgramBoostGain)state.aProgramBoostGain.gain.setTargetAtTime(boosted?dbToGain(6):1,now,.025);
  }
  function clearSystemBoostTimers(){
    if(state.systemBoostAutoTimer!==null){
      window.clearTimeout(state.systemBoostAutoTimer);
      state.systemBoostAutoTimer=null;
    }
    if(state.systemBoostCountdownTimer!==null){
      window.clearInterval(state.systemBoostCountdownTimer);
      state.systemBoostCountdownTimer=null;
    }
    if(state.systemBoostPressTimer!==null){
      window.clearTimeout(state.systemBoostPressTimer);
      state.systemBoostPressTimer=null;
    }
    state.systemBoostTimedUntil=0;
    state.systemBoostLongPress=false;
    state.systemBoostPointerActive=false;
  }
  function updateSystemBoostUi(){
    renderDemoExperience();
  }
  function setSystemBoost(held){
    if(!held)clearSystemBoostTimers();
    const next=Boolean(held)&&state.playing&&getBranchAudible('programA');
    if(next===state.systemBoostHeld){
      updateSystemBoostUi();
      return;
    }
    state.systemBoostHeld=next;
    configureProtection();
    updateAContentMonitorRoutes();
    updateSystemBoostUi();
    updateDemoVolumeUi();
  }
  function startTimedSystemBoost(){
    clearSystemBoostTimers();
    state.systemBoostTimedUntil=performance.now()+3000;
    setSystemBoost(true);
    if(!state.systemBoostHeld)return;
    state.systemBoostCountdownTimer=window.setInterval(updateSystemBoostUi,100);
    state.systemBoostAutoTimer=window.setTimeout(()=>setSystemBoost(false),3000);
    updateSystemBoostUi();
  }
  function beginSystemBoostGesture(event){
    if(els.systemBoost.disabled)return;
    setSystemBoost(false);
    state.systemBoostPointerActive=true;
    els.systemBoost.setPointerCapture?.(event.pointerId);
    state.systemBoostPressTimer=window.setTimeout(()=>{
      if(!state.systemBoostPointerActive)return;state.systemBoostPressTimer=null;state.systemBoostLongPress=true;setSystemBoost(true);
    },350);
  }
  function endSystemBoostGesture(){
    if(!state.systemBoostPointerActive)return;
    const wasLongPress=state.systemBoostLongPress;
    if(state.systemBoostPressTimer!==null){
      window.clearTimeout(state.systemBoostPressTimer);
      state.systemBoostPressTimer=null;
    }
    state.systemBoostPointerActive=false;
    state.systemBoostLongPress=false;
    if(wasLongPress)setSystemBoost(false);
    return wasLongPress;
  }
  function cancelSystemBoostGesture(){
    setSystemBoost(false);
  }
  function updateReadouts(){
    const branches=getAllVisualBranchStates(),programARendered=branches.programA.configuredRenderedDb,sceneRendered=branches.scene.configuredRenderedDb,ambientRendered=branches.ambient.configuredRenderedDb,delta=Number.isFinite(programARendered)&&Number.isFinite(sceneRendered)?sceneRendered-programARendered:null;
    els.programALufs.textContent=formatDb(programARendered);
    els.sceneLufs.textContent=formatDb(sceneRendered);
    els.ambientLufs.textContent=formatDb(ambientRendered);
    els.deltaLu.textContent=formatSigned(delta);
    updateListenerCards(branches);
  }
  function updateListenerCards(branches){
    const aContent=branches.programA.configuredRenderedDb,scene=branches.scene.configuredRenderedDb,ambient=branches.ambient.configuredRenderedDb;
    const total=(...levels)=>levels.every(Number.isFinite)?energyToDb(levels.reduce((sum,l)=>sum+dbToEnergy(l),0)):null;
    els.listenerAContent.textContent=formatDb(aContent);
    els.listenerAScene.textContent=formatDb(scene);
    els.listenerAAmbient.textContent=formatDb(ambient);
    els.listenerATotal.textContent=formatDb(total(aContent,scene,ambient));
  }
  function isProgramReady(){
    return state.programASourceMode==='builtin'||state.programASourceMode==='triads'||!!state.programABuffer;
  }
  function isSceneConfigured(){
    return state.sceneSourceMode==='pink'||state.sceneSourceMode==='brown'||!!state.sceneBuffer;
  }
  function isAmbientConfigured(){
    return state.ambientSourceMode==='brown'||!!state.ambientFileBuffer;
  }
  function refreshTransportState(){
    const ready=isProgramReady()&&isSceneConfigured()&&isAmbientConfigured();
    els.startBoth.disabled=state.transportPreparing||(!ready&&!state.playing);
    els.startBoth.textContent=state.transportPreparing?'Starting…':state.playing?'❚❚ Pause':'▶ Play';
    els.stopBoth.disabled=!state.playing&&!state.transportPreparing;
    els.restartBoth.disabled=!ready||state.transportPreparing;
    els.programAState.textContent=state.programASourceMode==='builtin'?'built-in ready':state.programASourceMode==='triads'?'triads ready':state.programABuffer?'file ready':'select file';
    els.sceneState.textContent=state.sceneSourceMode==='pink'?(state.scenePinkBuffer?'pink ready':'pink · generated on start'):state.sceneSourceMode==='brown'?(state.sceneBrownBuffer?'brown ready':'brown · generated on start'):(state.sceneBuffer?'file ready':'select file');
    els.ambientState.textContent=state.ambientSourceMode==='file'?(state.ambientFileBuffer?'file ready':'select file'):(state.ambientBuffer?'brown ready':'brown · generated on start');
  }
  async function decodeSelectedFile(file,branch){
    await resumeAudio();
    const arrayBuffer=await file.arrayBuffer(),buffer=await state.audioContext.decodeAudioData(arrayBuffer.slice(0));
    if(branch==='programA'){
      if(state.programASourceMode!=='file'){
        rememberProgramGain();
        state.programASourceMode='file';
        applyProgramGainForMode('file');
      }
      state.programABuffer=buffer;
      els.programASourceBuiltin.classList.remove('active');
      els.programASourceFile.classList.add('active');
      els.programAFileRow.style.display='';
      els.programAFileName.textContent=file.name;
      updateProgramSourcePresentation();
      els.programAState.textContent='analysing…';
      state.programASourceLufs=await analyseIntegratedKStyle(buffer);
      state.programAOfflineLoudness=await analyseProgramLoudness(buffer);
      els.programAAnalysis.textContent=`Source K/LUFS-style estimate: ${formatDb(state.programASourceLufs)} · duration ${buffer.duration.toFixed(1)} s`;
      setContentAnalysisOfflineSummary(formatOfflineProgramLoudness(state.programAOfflineLoudness));
      els.programAState.textContent='ready';
    }
    else if(branch==='scene'){
      state.sceneBuffer=buffer;
      els.sceneFileName.textContent=file.name;
      els.sceneState.textContent='analysing…';
      state.sceneSourceLufs=await analyseIntegratedKStyle(buffer);
      els.sceneAnalysis.textContent=`Source K/LUFS-style estimate: ${formatDb(state.sceneSourceLufs)} · duration ${buffer.duration.toFixed(1)} s`;
      els.sceneState.textContent='ready';
    }
    else{
      state.ambientFileBuffer=buffer;
      els.ambientFileName.textContent=file.name;
      els.ambientState.textContent='analysing…';
      state.ambientFileLufs=await analyseIntegratedKStyle(buffer);
      els.ambientAnalysis.textContent=`Ambient file K/LUFS-style estimate: ${formatDb(state.ambientFileLufs)} · duration ${buffer.duration.toFixed(1)} s`;
      els.ambientState.textContent='ready';
    }
    updateReadouts();
    refreshTransportState();
    updateStatus();
  }
  async function loadDefaultTracks(){
    const tracks=localDemoContent.defaultTracks;
    els.loadLocalDefault.disabled=true;
    let added=0;
    try{
      await resumeAudio();
      // EN: Default tracks are loaded into the playlist without changing the listener's current Program A selection.
      for(let index=0;index<tracks.length;index++){
        const track=tracks[index];
        if(state.demoPlaylist.some(item=>item.id===track.id))continue;
        els.loadLocalDefault.textContent=`Loading default tracks ${index+1} / ${tracks.length}…`;
        const response=await fetch(new URL(track.path,window.location.href));
        if(!response.ok)throw new Error(`${track.path} (HTTP ${response.status})`);
        const arrayBuffer=await response.arrayBuffer();
        const buffer=await state.audioContext.decodeAudioData(arrayBuffer.slice(0));
        const fileName=track.path.split('/').pop()||track.id;
        const lufs=await analyseIntegratedKStyle(buffer);
        const offlineLoudness=await analyseProgramLoudness(buffer);
        const sourcePeakDb=getBufferSamplePeakDb(buffer);
        const referenceTrimDb=Math.max(-24,Math.min(24,-3-sourcePeakDb));
        state.demoPlaylist.push({
          id:track.id,
          file:new File([arrayBuffer],fileName,{type:response.headers.get('content-type')||'audio/*'}),
          buffer,lufs,offlineLoudness,sourcePeakDb,referenceTrimDb,
          defaultContent:true
        });
        added++;
        renderDemoPlaylist();
      }
      updateReadouts();
      refreshTransportState();
      els.status.textContent=added
        ? `Loaded ${added} default track${added===1?'':'s'} into Program A playlist.`
        : 'Default tracks are already in the Program A playlist.';
    }
    catch(err){
      renderDemoPlaylist();
      updateReadouts();
      refreshTransportState();
      els.status.textContent=`Default track loading stopped: ${err.message}. Serve the private files through Live Preview.`;
    }
    finally{
      els.loadLocalDefault.disabled=false;
      els.loadLocalDefault.textContent='Load default tracks';
    }
  }
  async function analyseIntegratedKStyle(buffer){
    const offline=new OfflineAudioContext(buffer.numberOfChannels,buffer.length,buffer.sampleRate),src=offline.createBufferSource();
    src.buffer=buffer;
    const shelf=offline.createBiquadFilter();
    shelf.type='highshelf';
    shelf.frequency.value=1500;
    shelf.gain.value=4;
    const hp=offline.createBiquadFilter();
    hp.type='highpass';
    hp.frequency.value=60;
    hp.Q.value=.5;
    src.connect(shelf);
    shelf.connect(hp);
    hp.connect(offline.destination);
    src.start();
    const rendered=await offline.startRendering(),mono=mixToMono(rendered),blockSamples=Math.max(1,Math.round(rendered.sampleRate*.4)),stepSamples=Math.max(1,Math.round(rendered.sampleRate*.1)),energies=[];
    for(let start=0;start+blockSamples<=mono.length;start+=stepSamples){
      let sum=0;
      for(let i=start;i<start+blockSamples;i++){
        const x=mono[i];
        sum+=x*x;
      }
      energies.push(sum/blockSamples);
    }
    return gatedIntegratedEstimate(energies);
  }
  function mixToMono(buffer){
    const mono=new Float32Array(buffer.length);
    for(let ch=0;ch<buffer.numberOfChannels;ch++){
      const data=buffer.getChannelData(ch);
      for(let i=0;i<buffer.length;i++)mono[i]+=data[i]/buffer.numberOfChannels;
    }
    return mono;
  }
  function gatedIntegratedEstimate(energies){
    const valid=energies.filter(v=>Number.isFinite(v)&&v>0);
    if(!valid.length)return null;
    const absThreshold=Math.pow(10,-70/10),absAccepted=valid.filter(v=>v>=absThreshold);
    if(!absAccepted.length)return null;
    const absMean=average(absAccepted),relativeThreshold=Math.pow(10,(energyToDb(absMean)-10)/10),relAccepted=absAccepted.filter(v=>v>=relativeThreshold);
    return relAccepted.length?energyToDb(average(relAccepted)):null;
  }
  async function ensureOutputGuard(){
    const ac=state.audioContext;
    if(state.outputGuard)return;
    state.outputGuard=await createFullBandOutputGuard(ac,{
      onMeter:(stats)=>{
        state.outputGuardStats=stats;
        if(state.setupCuePlaying)state.setupCueMaxGuardReductionDb=Math.max(state.setupCueMaxGuardReductionDb,Number(stats.reductionDb)||0);
        state.contentAnalysis?.setOutputGuardReductionDb(stats.reductionDb);els.outputGuardStatus.textContent=stats.reductionDb>.05?`Output guard: active · −${stats.reductionDb.toFixed(1)} dB reduction · −2.0 dBFS ceiling`:`Output guard: ready · −2.0 dBFS ceiling`;
      },onFault:(stats)=>{
        state.outputGuardStats=stats;els.outputGuardStatus.textContent='Output guard fault — restart playback.';els.status.textContent='Final output guard stopped; restart playback.';
      }
    });
    state.outputGuard.output.connect(ac.destination);
  }
  // EN: A silent parallel observer receives final guarded output and cannot affect the mix.
  function ensureOutputAnalysisObserver(){
    if(!state.outputAnalysisWindow)state.outputAnalysisWindow=createAudioAnalysisWindow(els.outputAnalysisWindow,{spectrumMinDb:-80});
    if(state.outputAnalyzer||!state.outputGuard?.output)return;
    ensureOutputChainDiagnostics();
    state.outputAnalyzer=createRealtimeAudioAnalyzer(state.audioContext,state.outputGuard.output,{spectrumMode:'multi-resolution',
      getReductionDb:()=>state.outputGuardStats?.reductionDb,updateMs:25,peakHoldMs:450,peakReleaseDbPerSec:12,guardReductionHoldReleaseDbPerSec:0,spectrumAttackSec:.02,spectrumReleaseSec:.07,onFrame:frame=>{
        state.outputAnalysisWindow?.render(frame);
        if(state.setupCuePlaying){
          state.setupCueOutputPeakDbfs=frame.peakDb;
          state.setupCueMaxGuardReductionDb=Math.max(state.setupCueMaxGuardReductionDb,Number(frame.guardReductionDb)||0);
          renderHwCueSetup();
        }
      }
    });
  }
  // EN: These silent taps compare the Web Audio mix before and after presentation gain and the final guard.
  function ensureOutputChainDiagnostics(){
    if(state.outputChainDiagnosticMeters||!state.meterSink||!state.outputGuard?.output)return;
    const ac=state.audioContext;
    const sources=[
      ['MIX BEFORE PRESENTATION VOL',state.aMonitorMixBus],
      ['AFTER PRESENTATION VOL',state.monitorGainNode],
      ['FINAL GUARD INPUT · after duck/fade',state.transportFadeGainNode],
    ];
    state.outputChainDiagnosticMeters=sources.map(([label,source])=>{
      const analyser=ac.createAnalyser();
      analyser.fftSize=2048;
      analyser.smoothingTimeConstant=0;
      const timeData=new Float32Array(analyser.fftSize);
      source.connect(analyser);
      analyser.connect(state.meterSink);
      return {label,analyser,timeData,history:[]};
    });
    // EN: The browser exposes Web Audio PCM here; OS and Bluetooth volume remain downstream and unmeasured.
    state.outputChainDiagnosticTimer=window.setInterval(renderOutputChainDiagnostics,500);
  }
  function renderOutputChainDiagnostics(){
    if(!state.outputChainDiagnosticMeters||!els.outputChainDiagnostics)return;
    const now=performance.now();
    const rows=[];
    for(const meter of state.outputChainDiagnosticMeters){
      meter.analyser.getFloatTimeDomainData(meter.timeData);
      let energy=0,peak=0;
      for(const sample of meter.timeData){
        const safe=Number.isFinite(sample)?sample:0;
        energy+=safe*safe;
        peak=Math.max(peak,Math.abs(safe));
      }
      meter.history.push({time:now,energy:energy/meter.timeData.length,peak});
      while(meter.history.length&&now-meter.history[0].time>1000)meter.history.shift();
      let energySum=0,energyCount=0,peakHold=0;
      for(const frame of meter.history){
        if(now-frame.time<=400){energySum+=frame.energy;energyCount++;}
        peakHold=Math.max(peakHold,frame.peak);
      }
      const rmsDb=energyCount?10*Math.log10(Math.max(energySum/energyCount,1e-12)):null;
      const peakDb=peakHold?20*Math.log10(peakHold):null;
      const fmt=value=>Number.isFinite(value)?value.toFixed(1)+' dBFS':'—';
      rows.push({label:meter.label,rms:fmt(rmsDb),peak:fmt(peakDb)});
    }
    els.outputChainDiagnostics.replaceChildren();
    const meta=document.createElement('div');
    meta.className='outputChainDiagnosticsMeta';
    meta.textContent='400 ms full-band RMS · 1 s observed sample peak';
    els.outputChainDiagnostics.append(meta);
    rows.forEach(row=>{
      const step=document.createElement('div');
      step.className='outputChainStep';
      const label=document.createElement('strong');
      label.textContent=row.label;
      const value=document.createElement('span');
      value.textContent='RMS '+row.rms+' · peak '+row.peak;
      step.append(label,value);
      els.outputChainDiagnostics.append(step);
    });
    const note=document.createElement('p');
    note.className='outputChainDiagnosticsNote';
    note.textContent='Bluetooth / OS volume is downstream of this PCM measurement.';
    els.outputChainDiagnostics.append(note);
  }
  function ensureMixGraph(){
    const ac=state.audioContext;
    if(state.aMonitorMixBus)return;
    state.monitorGainNode=ac.createGain();
    state.monitorGainNode.gain.value=dbToGain(Number(els.monitorGain.value));
    state.aMonitorMixBus=ac.createGain();
    state.aMonitorMixBus.gain.value=1;
    state.backgroundSpectrumMix=ac.createGain();
    state.backgroundSpectrumMix.gain.value=1;
    state.backgroundSpectrumAnalyzer=createRealtimeAudioAnalyzer(ac,state.backgroundSpectrumMix,{updateMs:25,onFrame:frame=>{state.backgroundSpectrumBands=frame.thirdOctaveBands||[];}});

    state.sumKPre=ac.createBiquadFilter();
    state.sumKPre.type='highshelf';
    state.sumKPre.frequency.value=1500;
    state.sumKPre.gain.value=4;
    state.sumKHp=ac.createBiquadFilter();
    state.sumKHp.type='highpass';
    state.sumKHp.frequency.value=60;
    state.sumKHp.Q.value=.5;
    state.sumAnalyser=ac.createAnalyser();
    state.sumAnalyser.fftSize=4096;
    state.sumAnalyser.smoothingTimeConstant=0;
    state.sumTimeData=new Float32Array(state.sumAnalyser.fftSize);
    state.meterSink=ac.createGain();
    state.meterSink.gain.value=0;
    state.meterSink.connect(ac.destination);
    state.aMonitorMixBus.connect(state.monitorGainNode);
    state.demoDuckGainNode=ac.createGain();
    state.demoDuckGainNode.gain.value=state.demoDucked?dbToGain(-20):1;
    state.monitorPostAnalyser=ac.createAnalyser();
    state.monitorPostAnalyser.fftSize=4096;
    state.monitorPostAnalyser.smoothingTimeConstant=0;
    state.monitorPostTimeData=new Float32Array(state.monitorPostAnalyser.fftSize);
    state.monitorGainNode.connect(state.monitorPostAnalyser);
    state.monitorPostAnalyser.connect(state.meterSink);
    state.monitorGainNode.connect(state.demoDuckGainNode);
    state.transportFadeGainNode=ac.createGain();
    state.transportFadeGainNode.gain.value=0;
    state.demoDuckGainNode.connect(state.transportFadeGainNode);
    state.transportFadeGainNode.connect(state.outputGuard.input);
    state.aMonitorMixBus.connect(state.sumKPre);
    state.sumKPre.connect(state.sumKHp);
    state.sumKHp.connect(state.sumAnalyser);
  }
  function createBranchVisualMeter(branch,gainNode){
    const ac=state.audioContext,analyser=ac.createAnalyser();
    analyser.fftSize=2048;
    analyser.smoothingTimeConstant=0;
    const timeData=new Float32Array(analyser.fftSize);
    gainNode.connect(analyser);
    analyser.connect(state.meterSink);
    state.branchMeters[branch]={
      analyser,timeData,smoothedDb:-100,hasSignal:false
    };
  }
  function rememberProgramGain(){
    state.programReferenceTrimBySource[state.programASourceMode]=Number(els.programReferenceTrim.value);
  }
  function applyProgramGainForMode(mode){
    els.programReferenceTrim.value=String(state.programReferenceTrimBySource[mode]);
    updateControls();
  }
  function updateProgramSourcePresentation(){
    const builtIn=state.programASourceMode!=='file';
    els.programASourceBuiltin.classList.toggle('active',builtIn);
    els.programASourceFile.classList.toggle('active',!builtIn);
    els.programABuiltinRow.style.display=builtIn?'':'none';
    els.programAFileRow.style.display=builtIn?'none':'';
    els.programABuiltinRow.textContent=state.programASourceMode==='triads'
      ?'Built-in test: E-major triads · source peak −3 dBFS · reference trim 0 dB'
      :'Built-in: Procedural Music Lab v3.2 · Bach BWV 846 · ready';
    els.cabinProgramSource.textContent=state.programASourceMode==='builtin'
      ?'Procedural Bach BWV 846'
      :state.programASourceMode==='triads'
        ?'E-major triads octave test'
        :state.programABuffer?els.programAFileName.textContent:'Audio file · not selected';
  }
  async function setProgramASourceMode(mode){
    if(!['builtin','triads','file'].includes(mode))return;
    const wasPlaying=state.playing;
    if(wasPlaying)stopBoth(false);
    rememberProgramGain();
    state.programASourceMode=mode;
    applyProgramGainForMode(mode);
    state.programAK3s=null;
    state.programAEnergyHistory=[];
    updateProgramSourcePresentation();
    if(mode==='builtin'){
      state.programAOfflineLoudness=null;
      const bachAnalysis=state.bachOfflineAnalysis;
      setContentAnalysisOfflineSummary(bachAnalysis?.preProtectionLoudness
        ? formatBachOfflineSummary(bachAnalysis.preProtectionLoudness)
        :'Run Bach Details analysis to show the shared offline Program A reference.');
      els.programAAnalysis.textContent='Program A K, 3 s: -- · measured live after start';
    }else if(mode==='triads'){
      state.programAOfflineLoudness=null;
      setContentAnalysisOfflineSummary('E-major triads test · source peak −3.0 dBFS · reference trim 0.0 dB.');
      els.programAAnalysis.textContent='E-major triads · source peak −3.0 dBFS · live Program A K starts with playback';
    }else if(state.programABuffer)els.programAAnalysis.textContent=`File integrated K-style: ${formatDb(state.programASourceLufs)} · live Program A K starts with playback`;
    else els.programAAnalysis.textContent='Select an Audio file for Program A.';
    updateReadouts();
    refreshTransportState();
    updateStatus();
    if(wasPlaying&&isProgramReady()&&isSceneConfigured()&&isAmbientConfigured())await startBoth();
  }
  function getEnabledDemoContentOptions(){
    return Array.from(els.cabinProgramSelect.options).filter(option=>!option.disabled);
  }
  // EN: The select value remains the only selected-content state; the playlist only supplies its options.
  function updateDemoContentNavigation(){
    const disabled=getEnabledDemoContentOptions().length<2;
    els.cabinProgramPrevious.disabled=disabled;
    els.cabinProgramNext.disabled=disabled;
  }
  function stepDemoContent(direction){
    const options=getEnabledDemoContentOptions();
    if(options.length<2)return;
    const currentIndex=Math.max(0,options.findIndex(option=>option.value===els.cabinProgramSelect.value)),nextIndex=(currentIndex+direction+options.length)%options.length;
    els.cabinProgramSelect.value=options[nextIndex].value;
    els.cabinProgramSelect.dispatchEvent(new Event('change',{
      bubbles:true
    }));
  }
  function getDemoPlaylistEntry(id){
    return state.demoPlaylist.find(entry=>entry.id===id)||null;
  }
  function renderDemoPlaylist(){
    const selectedId=state.programASourceMode==='builtin'?'builtin':els.cabinProgramSelect.value;
    Array.from(els.cabinProgramSelect.options).filter(option=>option.value!=='builtin').forEach(option=>option.remove());
    els.demoPlaylistList.replaceChildren();

    const bachRow=document.createElement('div');
    bachRow.className='demoPlaylistItem';
    bachRow.classList.toggle('active',selectedId==='builtin');
    bachRow.dataset.playlistSelect='builtin';
    const bachNumber=document.createElement('span');
    bachNumber.className='demoPlaylistIndex';
    bachNumber.textContent='1';
    const bachName=document.createElement('span');
    bachName.className='demoPlaylistName';
    bachName.textContent='Procedural Bach BWV 846';
    const bachMeta=document.createElement('span');
    bachMeta.className='demoPlaylistMeta';
    bachMeta.textContent='Built-in · '+formatGain(state.programReferenceTrimBySource.builtin);
    const bachDetailsButton=document.createElement('button');
    bachDetailsButton.className='demoPlaylistDetailsButton';
    bachDetailsButton.type='button';
    bachDetailsButton.dataset.playlistDetails='builtin';
    bachDetailsButton.textContent=state.demoPlaylistDetailsId==='builtin'?'Hide':'Details';
    bachDetailsButton.setAttribute('aria-expanded',state.demoPlaylistDetailsId==='builtin'?'true':'false');
    bachDetailsButton.setAttribute('aria-label','Show procedural Bach analysis');
    bachRow.append(bachNumber,bachName,bachMeta,bachDetailsButton);
    els.demoPlaylistList.append(bachRow);
    if(state.demoPlaylistDetailsId==='builtin'){
      const panel=document.createElement('div');
      panel.className='demoPlaylistDetails';
      if(state.bachAnalysisStatus==='running'){
        panel.textContent='Rendering one procedural Bach variation for offline analysis…';
      }else if(state.bachOfflineAnalysis){
        const analysis=state.bachOfflineAnalysis,metrics=document.createElement('div');
        metrics.className='demoPlaylistAnalysisMetrics';
        const items=[
          `Render seed ${analysis.seed} · ${analysis.durationSec.toFixed(1)} s`,
          `Engine output (same offline analysis as files): peak ${formatAnalysisDb(analysis.engineLoudness.samplePeakDbfs)} · integrated ${formatAnalysisLufs(analysis.engineLoudness.integratedLufs)}`,
          `Reference trim ${formatGain(analysis.referenceTrimDb)} → Program A pre-protection: peak ${formatAnalysisDb(analysis.preProtectionLoudness.samplePeakDbfs)} · integrated ${formatAnalysisLufs(analysis.preProtectionLoudness.integratedLufs)}`,
          `20–90 Hz, 400 ms after trim: P95 ${analysis.detectorP95Dbfs.toFixed(1)} dBFS · max ${analysis.detectorMaxDbfs.toFixed(1)} dBFS`,
          `Current ceiling ${analysis.currentCeilingDbfs.toFixed(1)} dBFS · estimated reduction P95 ${analysis.reductionP95Db.toFixed(1)} dB · max ${analysis.reductionMaxDb.toFixed(1)} dB`
        ];
        items.forEach(text=>{const item=document.createElement('span');item.textContent=text;metrics.append(item);});
        const rerun=document.createElement('button');
        rerun.className='demoPlaylistDetailsButton';
        rerun.type='button';
        rerun.dataset.bachAnalysis='run';
        rerun.textContent='Analyse new render';
        panel.append(metrics,rerun);
      }else{
        const note=document.createElement('span'),run=document.createElement('button');
        note.textContent='Run one randomized procedural Bach render. Result is session-only and indicative.';
        run.className='demoPlaylistDetailsButton';
        run.type='button';
        run.dataset.bachAnalysis='run';
        run.textContent='Analyse this render';
        panel.append(note,run);
      }
      els.demoPlaylistList.append(panel);
    }

    const triadOption=document.createElement('option');
    triadOption.value='triads';
    triadOption.textContent='2. E-major triads octave test';
    els.cabinProgramSelect.append(triadOption);
    const triadRow=document.createElement('div');
    triadRow.className='demoPlaylistItem';
    triadRow.classList.toggle('active',selectedId==='triads');
    triadRow.dataset.playlistSelect='triads';
    const triadNumber=document.createElement('span');
    triadNumber.className='demoPlaylistIndex';
    triadNumber.textContent='2';
    const triadName=document.createElement('span');
    triadName.className='demoPlaylistName';
    triadName.textContent='E-major triads octave test';
    const triadMeta=document.createElement('span');
    triadMeta.className='demoPlaylistMeta';
    triadMeta.textContent='Built-in test · 0.0 dB → −3.0 dBFS peak';
    triadRow.append(triadNumber,triadName,triadMeta);
    els.demoPlaylistList.append(triadRow);

    state.demoPlaylist.forEach((entry,index)=>{
      const option=document.createElement('option');
      option.value=entry.id;
      option.textContent=`${index+3}. ${entry.file.name}`;
      els.cabinProgramSelect.append(option);
      const row=document.createElement('div');
      row.className='demoPlaylistItem';
      row.classList.toggle('active',entry.id===selectedId);
      row.dataset.playlistSelect=entry.id;
      const number=document.createElement('span');
      number.className='demoPlaylistIndex';
      number.textContent=String(index+3);
      const name=document.createElement('span');
      name.className='demoPlaylistName';
      name.textContent=entry.file.name;
      const meta=document.createElement('span');
      meta.className='demoPlaylistMeta';
      meta.textContent=`${formatGain(entry.referenceTrimDb)} → −3.0 dBFS`;
      const detailsButton=document.createElement('button');
      detailsButton.className='demoPlaylistDetailsButton';
      detailsButton.type='button';
      detailsButton.dataset.playlistDetails=entry.id;
      detailsButton.textContent=state.demoPlaylistDetailsId===entry.id?'Hide':'Details';
      detailsButton.setAttribute('aria-expanded',state.demoPlaylistDetailsId===entry.id?'true':'false');
      detailsButton.setAttribute('aria-label',`Show analysis for ${entry.file.name}`);
      row.append(number,name,meta,detailsButton);
      els.demoPlaylistList.append(row);
      if(state.demoPlaylistDetailsId===entry.id){
        const analysis=entry.offlineLoudness||{},panel=document.createElement('div'),metrics=document.createElement('div'),trim=document.createElement('span'),peak=document.createElement('span'),loudness=document.createElement('span'),duration=document.createElement('span'),remove=document.createElement('button');
        panel.className='demoPlaylistDetails';
        metrics.className='demoPlaylistAnalysisMetrics';
        trim.textContent=`Reference trim ${formatGain(entry.referenceTrimDb)} → peak target −3.0 dBFS`;
        peak.textContent=Number.isFinite(analysis.samplePeakDbfs)?`Sample peak ${analysis.samplePeakDbfs.toFixed(1)} dBFS`:'Sample peak —';
        loudness.textContent=Number.isFinite(analysis.integratedLufs)?`Integrated loudness ${analysis.integratedLufs.toFixed(1)} LUFS`:'Integrated loudness —';
        duration.textContent=Number.isFinite(analysis.durationSec)?`Duration ${analysis.durationSec.toFixed(1)} s`:'Duration —';
        remove.className='demoPlaylistRemove';
        remove.type='button';
        remove.dataset.playlistRemove=entry.id;
        remove.textContent='Remove track';
        remove.setAttribute('aria-label',`Remove ${entry.file.name} from Program A playlist`);
        metrics.append(trim,peak,loudness,duration);
        panel.append(metrics,remove);
        els.demoPlaylistList.append(panel);
      }
    });
    els.demoPlaylistSummary.textContent=`${2+state.demoPlaylist.length} track${state.demoPlaylist.length?'s':''} · Bach + Triads${state.demoPlaylist.length?' + loaded':''}`;
    els.cabinProgramSelect.value=(selectedId==='builtin'||selectedId==='triads'||getDemoPlaylistEntry(selectedId))?selectedId:'builtin';
    updateDemoContentNavigation();
  }
  async function selectDemoContent(slotKey){
    if(slotKey==='builtin'||slotKey==='triads'){
      await setProgramASourceMode(slotKey);
      els.cabinProgramSelect.value=slotKey;
      renderDemoPlaylist();
      return;
    }
    const slot=getDemoPlaylistEntry(slotKey);
    if(!slot)return;
    const wasPlaying=state.playing;
    if(wasPlaying)stopBoth(false);
    rememberProgramGain();
    state.programASourceMode='file';
    state.programReferenceTrimBySource.file=slot.referenceTrimDb;
    applyProgramGainForMode('file');
    state.programABuffer=slot.buffer;
    state.programASourceLufs=slot.lufs;
    state.programAOfflineLoudness=slot.offlineLoudness;
    els.programAFileName.textContent=slot.file.name;
    updateProgramSourcePresentation();
    els.programAAnalysis.textContent=`Source K/LUFS-style estimate: ${formatDb(slot.lufs)} · duration ${slot.buffer.duration.toFixed(1)} s`;
    setContentAnalysisOfflineSummary(formatOfflineProgramLoudness(slot.offlineLoudness));
    els.programAState.textContent='ready';
    els.cabinProgramSelect.value=slotKey;
    renderDemoPlaylist();
    updateReadouts();
    refreshTransportState();
    updateStatus();
    if(wasPlaying&&isProgramReady()&&isSceneConfigured()&&isAmbientConfigured())await startBoth();
  }
  async function addDemoPlaylistFiles(fileList){
    const files=Array.from(fileList||[]);
    if(!files.length)return;
    await resumeAudio();
    for(const file of files){
      els.demoPlaylistSummary.textContent=`Analysing ${file.name}…`;
      const arrayBuffer=await file.arrayBuffer(),buffer=await state.audioContext.decodeAudioData(arrayBuffer.slice(0)),lufs=await analyseIntegratedKStyle(buffer),offlineLoudness=await analyseProgramLoudness(buffer),sourcePeakDb=getBufferSamplePeakDb(buffer),referenceTrimDb=Math.max(-24,Math.min(24,-3-sourcePeakDb));
      state.demoPlaylist.push({
        id:`track-${state.demoPlaylistNextId++}`,file,buffer,lufs,offlineLoudness,sourcePeakDb,referenceTrimDb
      });
    }
    renderDemoPlaylist();
    updateStatus();
  }
  function removeDemoPlaylistEntry(id){
    const wasSelected=els.cabinProgramSelect.value===id;
    if(state.demoPlaylistDetailsId===id)state.demoPlaylistDetailsId=null;
    state.demoPlaylist=state.demoPlaylist.filter(entry=>entry.id!==id);
    renderDemoPlaylist();
    if(wasSelected){
      els.cabinProgramSelect.value='builtin';
      els.cabinProgramSelect.dispatchEvent(new Event('change',{
        bubbles:true
      }));
    }
  }
  function createProgramPreProtectionMonitor(inputNode){
    const ac=state.audioContext;
    state.programPreAnalyser=ac.createAnalyser();
    state.programPreAnalyser.fftSize=4096;
    state.programPreAnalyser.smoothingTimeConstant=0;
    state.programPreTimeData=new Float32Array(state.programPreAnalyser.fftSize);
    inputNode.connect(state.programPreAnalyser);
    state.programPreAnalyser.connect(state.meterSink);
  }
  function createProgramAKMeter(inputNode){
    const ac=state.audioContext;
    state.programAKPre=ac.createBiquadFilter();
    state.programAKPre.type='highshelf';
    state.programAKPre.frequency.value=1500;
    state.programAKPre.gain.value=4;
    state.programAKHp=ac.createBiquadFilter();
    state.programAKHp.type='highpass';
    state.programAKHp.frequency.value=60;
    state.programAKHp.Q.value=.5;
    state.programAAnalyser=ac.createAnalyser();
    state.programAAnalyser.fftSize=4096;
    state.programAAnalyser.smoothingTimeConstant=0;
    state.programATimeData=new Float32Array(state.programAAnalyser.fftSize);
    inputNode.connect(state.programAKPre);
    state.programAKPre.connect(state.programAKHp);
    state.programAKHp.connect(state.programAAnalyser);
    state.programAAnalyser.connect(state.meterSink);
  }
  function createProgramABranch(sourceNode){
    const ac=state.audioContext;
    state.programReferenceGainNode=ac.createGain();
    state.programReferenceGainNode.gain.value=dbToGain(Number(els.programReferenceTrim.value));
    state.aContentMonitorGain=ac.createGain();
    state.aContentVolumeGain=ac.createGain();
    state.aContentVolumeGain.gain.value=dbToGain(Number(els.aContentVolume.value));
    state.aProgramBoostGain=ac.createGain();
    state.aProgramBoostGain.gain.value=1;
    sourceNode.connect(state.programReferenceGainNode);
    // EN: A CONTENT VOL models the listener's music control before Feelness and low-band protection.
    state.programReferenceGainNode.connect(state.aContentVolumeGain);
    state.aContentVolumeGain.connect(state.aProgramBoostGain);
    // EN: PRE observers use the exact limiter input, including A CONTENT VOL and temporary TEST EFFECT drive.
    createProgramPreProtectionMonitor(state.aProgramBoostGain);
    state.programSpectrumPreAnalyzer=createRealtimeAudioAnalyzer(ac,state.aProgramBoostGain,{spectrumMode:'multi-resolution',updateMs:50,onFrame:frame=>{state.programSpectrumPreBands=frame.thirdOctaveBands||[];}});
    state.aProgramBoostGain.connect(state.programProtection.input);
    // EN: Protected output is the limiter output itself, so spectrum and gain-reduction telemetry agree.
    state.programSpectrumPostAnalyzer=createRealtimeAudioAnalyzer(ac,state.programProtection.output,{spectrumMode:'multi-resolution',updateMs:50,onFrame:frame=>{const bands=frame.thirdOctaveBands||[];if(!bands.some(b=>Number.isFinite(b?.dbfs)&&b.dbfs>-59.5))return;state.programSpectrumPostBands=bands;state.demoOutputSpectrumWindow?.render(frame);}});
    state.programProtection.output.connect(state.aContentMonitorGain);
    state.aContentMonitorGain.connect(state.aMonitorMixBus);
    state.contentAnalysis=createContentFeelnessAnalyzer(ac,state.aProgramBoostGain,{
      detectorSourceNode:state.programProtection.limitedLowOutput,
      outputPreGuardNode:state.transportFadeGainNode
    });
    state.contentAnalysis.setDetectorLimitDb(effectiveProtectionCeilingDb());
    state.contentAnalysis.setPresentationVolumeDb(Number(els.monitorGain.value));
    state.contentAnalysis.setLimiterReductionDb(state.protectionStats?.reductionDb);
    state.contentAnalysis.setOutputGuardReductionDb(state.outputGuardStats?.reductionDb);
    updateAContentMonitorRoutes();
    createProgramAKMeter(state.programProtection.output);
    createBranchVisualMeter('programA',state.aContentMonitorGain);
  }
  function createProceduralProgramASource(startAt){
    const program=createProgramSource(state.audioContext);
    program.setParams(PROCEDURAL_BACH_PARAMS);
    createProgramABranch(program.output);
    program.start(startAt);
    state.programSynth=program;
    return program;
  }
  function ensureTriadsProgramBuffer(){
    if(!state.triadsBuffer)state.triadsBuffer=createEMajorTriadOctaveBuffer(state.audioContext);
    return state.triadsBuffer;
  }
  function createLoopingSource(buffer,branch,startAt){
    const ac=state.audioContext,src=ac.createBufferSource();
    src.buffer=buffer;
    src.loop=true;
    const gain=ac.createGain();
    if(branch==='programA')state.programAGainNode=gain;
    else if(branch==='scene')state.sceneGainNode=gain;
    else state.ambientGainNode=gain;
    if(branch==='programA')createProgramABranch(src);
    else{
      src.connect(gain);
      gain.connect(state.aMonitorMixBus);
      if(state.backgroundSpectrumMix)gain.connect(state.backgroundSpectrumMix);
      createBranchVisualMeter(branch,gain);
    }
    src.start(startAt,0);
    return src;
  }
  function startBoth(){
    if(state.transportStartPromise)return state.transportStartPromise;
    const generation=++state.transportGeneration;
    state.transportPreparing=true;
    const task=(async()=>{
      try{return await startBothOperation(generation);}
      catch(error){
        if(state.transportGeneration===generation){
          els.status.textContent='Could not start playback: '+error.message;
          refreshTransportState();
        }
        return false;
      }finally{
        if(state.transportStartPromise===task)state.transportStartPromise=null;
        if(state.transportGeneration===generation){
          state.transportPreparing=false;
          refreshTransportState();
        }
      }
    })();
    state.transportStartPromise=task;
    refreshTransportState();
    return task;
  }
  // EN: A generation token cancels asynchronous preparation superseded by Stop.
  async function startBothOperation(generation){
    const isCurrent=()=>state.transportGeneration===generation;
    await resumeAudio();
    if(!isCurrent())return false;
    stopSetupCue();
    if(state.sceneSourceMode==='pink')await ensurePinkSceneReady();
    if(!isCurrent())return false;
    if(state.sceneSourceMode==='brown')await ensureBrownSceneReady();
    if(!isCurrent())return false;
    if(state.ambientSourceMode==='brown')await ensureAmbientReady();
    if(!isCurrent())return false;
    if(state.programASourceMode==='triads')ensureTriadsProgramBuffer();
    const activeSceneBuffer=getActiveSceneBuffer(),activeAmbientBuffer=getActiveAmbientBuffer();
    if(!isProgramReady()||!activeSceneBuffer||!activeAmbientBuffer){
      refreshTransportState();
      return false;
    }
    stopBoth(false,{invalidateStartup:false});
    await ensureOutputGuard();
    if(!isCurrent())return false;
    ensureMixGraph();
    ensureOutputAnalysisObserver();
    state.outputAnalyzer?.reset();
    state.outputAnalysisWindow?.reset();
    state.outputChainDiagnosticMeters?.forEach(meter=>{meter.history.length=0;});
    state.transportFading=false;
    const transportGain=state.transportFadeGainNode?.gain;
    if(transportGain){
      const now=state.audioContext.currentTime;
      transportGain.cancelScheduledValues(now);
      transportGain.setValueAtTime(0,now);
    }
    let protection;
    try{
      protection=await createLowBandProtectionChain(state.audioContext,{
        maxBoostDb:9,
        onMeter:(stats)=>{
          state.protectionStats=stats;state.contentAnalysis?.setLimiterReductionDb(stats.reductionDb);updateProtectionUi();els.protectionStatus.textContent=isProtectionTestBypassed()?'Protection: bypassed · test mode · effective ceiling '+effectiveProtectionCeilingDb().toFixed(1)+' dBFS':'Protection: '+(stats.ready?'active':'buffering')+' · effective ceiling '+effectiveProtectionCeilingDb().toFixed(1)+' dBFS · reduction −'+stats.reductionDb.toFixed(1)+' dB';
        },onFault:(stats)=>{
          state.protectionStats=stats;updateProtectionUi();if(stats.recoverable){
            els.protectionStatus.textContent='Protection warning — '+stats.fault+'. Audio continues; note whether this coincides with a Bach loop boundary.';els.status.textContent='Low-band protection warning: '+stats.fault;
          }
          else{
            els.protectionStatus.textContent='Protection fault — Worklet processor stopped. Restart playback.';els.status.textContent='Low-band protection worklet stopped; restart playback and report whether the fault returns at the Bach loop boundary.';
          }
        }
      });
      if(!isCurrent()){protection.dispose?.();return false;}
      state.programProtection=protection;
      configureProtection();
      els.protectionStatus.textContent='Protection: starting Worklet…';
    }
    catch(error){
      if(!isCurrent()){protection?.dispose?.();return false;}
      state.programProtection?.dispose?.();state.programProtection=null;
      els.protectionStatus.textContent='Protection unavailable — Program A not started.';
      els.status.textContent='Program A protection failed: '+error.message;
      refreshTransportState();
      return false;
    }
    const startAt=state.audioContext.currentTime+.08;
    state.programASource=state.programASourceMode==='builtin'?createProceduralProgramASource(startAt):createLoopingSource(state.programASourceMode==='triads'?state.triadsBuffer:state.programABuffer,'programA',startAt);
    state.sceneSource=createLoopingSource(activeSceneBuffer,'scene',startAt);
    state.ambientSource=createLoopingSource(activeAmbientBuffer,'ambient',startAt);
    state.contentAnalysis?.start();
    state.playing=true;
    state.transportPreparing=false;
    renderDemoExperience();
    updateSystemBoostUi();
    state.sumEnergyHistory=[];
    state.programAEnergyHistory=[];
    state.programAK3s=null;
    state.scopeHistory=[];
    state.lastHistorySampleMs=0;
    state.lastVisualMeterUpdateMs=performance.now();
    state.lastSumVisualMeterUpdateMs=state.lastVisualMeterUpdateMs;
    updateBranchGains();
    if(transportGain){
      const now=state.audioContext.currentTime;
      transportGain.linearRampToValueAtTime(1,now+1);
    }
    refreshTransportState();
    startAnimation();
    updateStatus();
    return true;
  }
  function stopBothFaded(){
    if(state.transportPreparing&&!state.playing){stopBoth(true);return;}
    if(!state.playing||state.transportFading||!state.transportFadeGainNode||!state.audioContext){
      if(state.playing)stopBoth(true);
      return;
    }
    setSystemBoost(false);
    state.transportFading=true;
    els.startBoth.disabled=true;
    const now=state.audioContext.currentTime,gain=state.transportFadeGainNode.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value,now);
    gain.linearRampToValueAtTime(0,now+1);
    window.setTimeout(()=>{
      if(state.transportFading)stopBoth(true);
    },1050);
  }
  function stopBoth(updateUi=true,{invalidateStartup=true}={}){
    if(invalidateStartup){state.transportGeneration++;state.transportStartPromise=null;state.transportPreparing=false;}
    stopSetupCue();
    setSystemBoost(false);
        for(const key of['programASource','sceneSource','ambientSource']){
      const src=state[key];
      if(src){
        try{
          src.stop();
        }
        catch{
        }
        try{
          src.disconnect();
        }
        catch{
        }
        state[key]=null;
      }
    }
    state.programSynth=null;
    // EN: Detach spectrum observers before disposing the protection graph they observe.
    state.programSpectrumPreAnalyzer?.dispose?.();
    state.programSpectrumPostAnalyzer?.dispose?.();
    state.programSpectrumPreAnalyzer=null;
    state.programSpectrumPostAnalyzer=null;
    state.programSpectrumPreBands=[];
    state.programSpectrumPostBands=[];
    state.contentAnalysis?.stop();
    state.contentAnalysis?.disconnect();
    state.contentAnalysis=null;
    state.programProtection?.dispose();
    state.programProtection=null;
    state.protectionStats=null;
    for(const key of['programReferenceGainNode','programAGainNode','sceneGainNode','ambientGainNode','aContentMonitorGain','aProgramBoostGain','programPreAnalyser','programAKPre','programAKHp','programAAnalyser','monitorPostAnalyser']){
      const node=state[key];
      if(node){
        try{
          node.disconnect();
        }
        catch{
        }
        state[key]=null;
      }
    }
    for(const branch of['programA','scene','ambient']){
      const meter=state.branchMeters[branch];
      if(meter){
        try{
          meter.analyser.disconnect();
        }
        catch{
        }
        state.branchMeters[branch]=null;
      }
    }
    state.programATimeData=null;
    state.programPreTimeData=null;
    state.programPreEnergyHistory=[];
    state.programPrePeakHistory=[];
    state.programPreLastUpdateMs=0;
    state.demoSetupContentHistory=[];
    state.demoSetupContentLastSampleMs=0;
    state.monitorPostTimeData=null;
    state.monitorPostEnergyHistory=[];
    state.monitorPostPeakHistory=[];
    state.monitorPostLastUpdateMs=0;
    state.programAEnergyHistory=[];
    state.programAK3s=null;
    state.demoDucked=false;
    state.playing=false;
    state.transportFading=false;
    updateSystemBoostUi();
    if(updateUi){
      refreshTransportState();
      updateStatus();
    }
  }
  function startAnimation(){
    if(state.animationId!==null)return;
    const loop=()=>{
      state.animationId=requestAnimationFrame(loop);
      updateProgramPreProtectionMonitor();
      updateMonitorPostGainMonitor();
      updateProgramAK();
      updateLiveSum();
      updateBranchVisualMeters();
      renderDemoSetup();
      cabinRenderer.draw();
      drawScope();
    };
    loop();
  }
  function updateProgramPreProtectionMonitor(){
    if(!state.playing||!state.programPreAnalyser||!state.programPreTimeData)return;
    state.programPreAnalyser.getFloatTimeDomainData(state.programPreTimeData);
    let energy=0,peak=0;
    for(const sample of state.programPreTimeData){
      energy+=sample*sample;
      peak=Math.max(peak,Math.abs(sample));
    }
    energy/=state.programPreTimeData.length;
    const now=performance.now();
    state.programPreEnergyHistory.push({
      t:now,energy
    });
    state.programPrePeakHistory.push({
      t:now,peak
    });
    while(state.programPreEnergyHistory.length&&state.programPreEnergyHistory[0].t<now-400)state.programPreEnergyHistory.shift();
    while(state.programPrePeakHistory.length&&state.programPrePeakHistory[0].t<now-1000)state.programPrePeakHistory.shift();
    if(now-state.programPreLastUpdateMs<100)return;
    state.programPreLastUpdateMs=now;
    const rmsDb=energyToDb(average(state.programPreEnergyHistory.map(i=>i.energy))),peakDb=20*Math.log10(Math.max(1e-12,...state.programPrePeakHistory.map(i=>i.peak)));
    els.programPreMonitor.textContent=`Content pre-protection: RMS ${rmsDb.toFixed(1)} dBFS · 1 s peak ${peakDb.toFixed(1)} dBFS`;
    els.programPreMonitor.classList.toggle('warning',peakDb>-3);
    // EN: The compact Candidate fog follows the exact A PRE limiter input.
    renderDemoVolumeTrace(rmsDb,peakDb);
  }
  // EN: Observer-only RMS-centred trace for the compact A Content control.
  // EN: A PRE peak is a separate, smoothed upper marker; its thin halo history is drawn below the volume bars.
  function renderDemoVolumeTrace(rmsDb,peakDb){
    if(!Number.isFinite(rmsDb)||!Number.isFinite(peakDb))return;
    const now=performance.now(),x=Math.max(0,Math.min(100,(rmsDb+60)/60*100)),rawPeakX=Math.max(0,Math.min(100,(peakDb+60)/60*100)),half=Math.min(14,Math.max(1.5,(peakDb-rmsDb)*.42));
    const previousPeakX=state.demoPeakHaloX;
    state.demoPeakHaloX=Number.isFinite(previousPeakX)?previousPeakX+(rawPeakX-previousPeakX)*.35:rawPeakX;
    // EN: Restore the established two-second A PRE halo history; only its anchor is below the bars.
    state.demoVolumeTraceHistory=[...(state.demoVolumeTraceHistory||[]),{
      x,half,born:now
    }].filter(s=>now-s.born<2000).slice(-20);
    if(els.labDemoVolumeTrace){
      els.labDemoVolumeTrace.replaceChildren(...state.demoVolumeTraceHistory.map(s=>{
        const age=(now-s.born)/2000,line=document.createElement('i'),left=Math.max(0,s.x-s.half);
        line.className='demoVolumeRibbonFogTrace';
        line.style.left=left+'%';
        line.style.width=Math.min(100-left,s.half*2)+'%';
        line.style.top='50%';
        line.style.opacity=String(.42*(1-age)**1.2);
        return line;
      }));
    }
    if(els.labDemoVolumePeak){
      const halfWidth=2.1,left=Math.max(0,state.demoPeakHaloX-halfWidth),line=document.createElement('i');
      line.className='demoVolumePeakMarkerTrace';
      line.style.left=left+'%';
      line.style.width=Math.min(100-left,halfWidth*2)+'%';
      line.style.top='50%';
      els.labDemoVolumePeak.replaceChildren(line);
    }
  }
  function updateMonitorPostGainMonitor(){
    if(!state.playing||!state.monitorPostAnalyser||!state.monitorPostTimeData)return;
    state.monitorPostAnalyser.getFloatTimeDomainData(state.monitorPostTimeData);
    let energy=0,peak=0;
    for(const sample of state.monitorPostTimeData){
      energy+=sample*sample;
      peak=Math.max(peak,Math.abs(sample));
    }
    energy/=state.monitorPostTimeData.length;
    const now=performance.now();
    state.monitorPostEnergyHistory.push({
      t:now,energy
    });
    state.monitorPostPeakHistory.push({
      t:now,peak
    });
    while(state.monitorPostEnergyHistory.length&&state.monitorPostEnergyHistory[0].t<now-400)state.monitorPostEnergyHistory.shift();
    while(state.monitorPostPeakHistory.length&&state.monitorPostPeakHistory[0].t<now-1000)state.monitorPostPeakHistory.shift();
    if(now-state.monitorPostLastUpdateMs<100)return;
    state.monitorPostLastUpdateMs=now;
    const rmsDb=energyToDb(average(state.monitorPostEnergyHistory.map(i=>i.energy))),peakDb=20*Math.log10(Math.max(1e-12,...state.monitorPostPeakHistory.map(i=>i.peak)));
    els.monitorPostMonitor.textContent=`Presentation VOL post-gain: RMS ${rmsDb.toFixed(1)} dBFS · 1 s peak ${peakDb.toFixed(1)} dBFS`;
    els.monitorPostMonitor.classList.toggle('warning',peakDb>-3);
  }
  function updateProgramAK(){
    if(!state.playing||!state.programAAnalyser||!state.programATimeData)return;
    state.programAAnalyser.getFloatTimeDomainData(state.programATimeData);
    let energy=0;
    for(const sample of state.programATimeData)energy+=sample*sample;
    energy/=state.programATimeData.length;
    const now=performance.now();
    state.programAEnergyHistory.push({
      t:now,energy
    });
    while(state.programAEnergyHistory.length&&state.programAEnergyHistory[0].t<now-3000)state.programAEnergyHistory.shift();
    const mean3s=average(state.programAEnergyHistory.map(i=>i.energy));
    state.programAK3s=Number.isFinite(mean3s)?energyToDb(mean3s):null;
    els.programAAnalysis.textContent=Number.isFinite(state.programAK3s)?`Program A K, 3 s: ${state.programAK3s.toFixed(1)} dB · reference trim ${formatGain(els.programReferenceTrim.value)}`:'Program A K, 3 s: --';
    updateReadouts();
  }
  function updateLiveSum(){
    if(!state.playing||!state.sumAnalyser||!state.sumTimeData){
      els.sumLufs.textContent='--';
      return;
    }
    state.sumAnalyser.getFloatTimeDomainData(state.sumTimeData);
    let energy=0;
    for(const x of state.sumTimeData)energy+=x*x;
    energy/=state.sumTimeData.length;
    const now=performance.now();
    state.sumEnergyHistory.push({t:now,energy});
    while(state.sumEnergyHistory.length&&state.sumEnergyHistory[0].t<now-3000)state.sumEnergyHistory.shift();
    const mean3s=average(state.sumEnergyHistory.map(x=>x.energy)),sumDb=Number.isFinite(mean3s)?energyToDb(mean3s):null;
    els.sumLufs.textContent=formatDb(sumDb);
    const instantDb=energyToDb(energy),visualMeter=state.sumVisualMeter,elapsedMs=Math.max(1,now-state.lastSumVisualMeterUpdateMs);
    state.lastSumVisualMeterUpdateMs=now;
    const alpha=1-Math.exp(-elapsedMs/(instantDb>visualMeter.smoothedDb?110:350));
    visualMeter.smoothedDb+=alpha*(instantDb-visualMeter.smoothedDb);
    visualMeter.hasSignal=Number.isFinite(instantDb);
    if(now-state.lastHistorySampleMs>=100){
      state.lastHistorySampleMs=now;
      const branches=getAllVisualBranchStates(),aContent=branches.programA.liveRmsDb,scene=branches.scene.liveRmsDb,ambient=branches.ambient.liveRmsDb;
      const total=(...levels)=>levels.every(Number.isFinite)?energyToDb(levels.reduce((s,l)=>s+dbToEnergy(l),0)):null;
      state.scopeHistory.push({t:now,aTotal:total(aContent,scene,ambient),scene,ambient});
      while(state.scopeHistory.length&&state.scopeHistory[0].t<now-3000)state.scopeHistory.shift();
    }
  }
  function updateBranchVisualMeters(){
    if(!state.playing)return;
    const now=performance.now(),elapsedMs=Math.max(1,now-state.lastVisualMeterUpdateMs);
    state.lastVisualMeterUpdateMs=now;
    for(const branch of['programA','scene','ambient']){
      const meter=state.branchMeters[branch];
      if(!meter)continue;
      meter.analyser.getFloatTimeDomainData(meter.timeData);
      let energy=0;
      for(const sample of meter.timeData)energy+=sample*sample;
      const instantDb=energyToDb(energy/meter.timeData.length),alpha=1-Math.exp(-elapsedMs/(instantDb>meter.smoothedDb?110:350));
      meter.smoothedDb+=alpha*(instantDb-meter.smoothedDb);
      meter.hasSignal=Number.isFinite(instantDb);
    }
  }
  function drawScope(){
    const ctx=scopeCtx,canvas=els.scope,w=canvas.width,h=canvas.height,now=performance.now(),minDb=-42,maxDb=0;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(0,0,w,h);
    const padT=8,padB=30,plotH=h-padT-padB,toY=v=>padT+(maxDb-Math.max(minDb,Math.min(maxDb,v)))/(maxDb-minDb)*plotH;
    const series=[
      {key:'aTotal',color:'#f2c36b',label:'A',x:w*.50,barW:52,tailW:150},
      {key:'scene',color:'#9fd0ff',label:'S',x:w*.86,barW:14,tailW:110},
      {key:'ambient',color:'#c7b5ff',label:'C',x:w*.94,barW:14,tailW:110}
    ];
    for(const spec of series){
      let previous=null;
      for(const item of state.scopeHistory){
        const value=item[spec.key];if(!Number.isFinite(value))continue;
        const age=Math.max(0,Math.min(3,(now-item.t)/1000)),x=spec.x-4-age/3*spec.tailW,y=toY(value);
        if(previous){ctx.strokeStyle=spec.color;ctx.globalAlpha=Math.max(.05,1-age/3)*.9;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(x,y);ctx.stroke();}
        previous={x,y};
      }
    }
    ctx.globalAlpha=1;
    const latest=state.scopeHistory[state.scopeHistory.length-1];if(!latest)return;
    for(const spec of series){
      const value=latest[spec.key];if(!Number.isFinite(value))continue;
      const stepped=Math.round(value/3)*3,x=spec.x-spec.barW/2,bottom=padT+plotH,segmentStep=plotH/20;
      ctx.fillStyle=spec.color;
      for(let db=minDb;db<=stepped;db+=3){const y=toY(db);ctx.globalAlpha=.82;ctx.fillRect(x,y-segmentStep+1,spec.barW,Math.max(2,segmentStep-2));}
      ctx.globalAlpha=1;ctx.fillStyle=spec.color;ctx.font=spec.label==='A'?'30px Arial':'16px Arial';ctx.textAlign='center';ctx.fillText(spec.label,spec.x,bottom+25);
    }
  }
  function updateStatus(){
    const branches=getAllVisualBranchStates(),programARendered=branches.programA.configuredRenderedDb,sceneRendered=branches.scene.configuredRenderedDb,ambientRendered=branches.ambient.configuredRenderedDb,delta=Number.isFinite(programARendered)&&Number.isFinite(sceneRendered)?sceneRendered-programARendered:null;
    els.status.textContent=[`STATE: ${state.playing?'PLAYING / LOOPING':'STOPPED'}`,`A source (${state.programASourceMode==='builtin'?'Built-in procedural music':'Audio file'}) | Content reference trim ${formatGain(els.programReferenceTrim.value)} | Program A K ${formatDb(getBranchSourceEstimate('programA'),' dB')}`,`Scene source (${state.sceneSourceMode==='pink'?'Pink noise':state.sceneSourceMode==='brown'?'Brown noise 50 Hz HP':'File'}): ${formatDb(getActiveSceneSourceLufs())} | gain ${Number(els.sceneGain.value).toFixed(1)} dB | rendered ${formatDb(sceneRendered)}`,`Ambient source (${state.ambientSourceMode==='file'?'File':'Brown 20 Hz HP'}): ${formatDb(getActiveAmbientSourceLufs())} | gain ${Number(els.ambientGain.value).toFixed(1)} dB | rendered ${formatDb(ambientRendered)}`,`Scene − Program A: ${formatSigned(delta)}`,`Listener A output gain ${Number(els.monitorGain.value).toFixed(1)} dB (post measurement)`,'','Suggested experiment: set Cabin Ambient first, then compare Program A feelness and presentation level.'].join('\n');
  }
  els.programASourceBuiltin.addEventListener('click',()=>setProgramASourceMode('builtin'));
  els.programASourceFile.addEventListener('click',()=>setProgramASourceMode('file'));
  els.demoPlaylistFiles.addEventListener('change',async()=>{
    try{
      await addDemoPlaylistFiles(els.demoPlaylistFiles.files);
    }
    catch(err){
      els.status.textContent=`Program A playlist error: ${err.message}`;
    }
    finally{
      els.demoPlaylistFiles.value='';
    }
  });
  els.demoPlaylistList.addEventListener('click',event=>{
    const bachAnalysis=event.target.closest('[data-bach-analysis]')?.dataset.bachAnalysis;
    if(bachAnalysis==='run'){
      analyseBachOfflineRender();
      return;
    }
    const detailsId=event.target.closest('[data-playlist-details]')?.dataset.playlistDetails;
    if(detailsId){
      state.demoPlaylistDetailsId=state.demoPlaylistDetailsId===detailsId?null:detailsId;
      renderDemoPlaylist();
      return;
    }
    const removeId=event.target.closest('[data-playlist-remove]')?.dataset.playlistRemove;
    if(removeId){ removeDemoPlaylistEntry(removeId); return; }
    const selectId=event.target.closest('[data-playlist-select]')?.dataset.playlistSelect;
    if(selectId)selectDemoContent(selectId);
  });
  els.cabinProgramSelect.addEventListener('change',async()=>selectDemoContent(els.cabinProgramSelect.value));
  els.cabinProgramPrevious.addEventListener('click',()=>stepDemoContent(-1));
  els.cabinProgramNext.addEventListener('click',()=>stepDemoContent(1));
  renderDemoPlaylist();
  els.programAFile.addEventListener('change',async()=>{
    const file=els.programAFile.files?.[0];if(!file)return;try{
      await decodeSelectedFile(file,'programA');
    }
    catch(err){
      els.programAState.textContent='error';els.status.textContent=`Spill file error: ${err.message}`;
    }
  });
  els.sceneSourceFile.addEventListener('click',()=>setSceneSourceMode('file'));
  els.sceneSourcePink.addEventListener('click',()=>setSceneSourceMode('pink'));
  els.sceneSourceBrown.addEventListener('click',()=>setSceneSourceMode('brown'));
  els.ambientSourceBrown.addEventListener('click',()=>setAmbientSourceMode('brown'));
  els.ambientSourceFile.addEventListener('click',()=>setAmbientSourceMode('file'));
  document.querySelectorAll('[data-ambient-preset]').forEach(b=>b.addEventListener('click',()=>setAmbientPreset(b.dataset.ambientPreset)));
  els.sceneFile.addEventListener('change',async()=>{
    const file=els.sceneFile.files?.[0];if(!file)return;try{
      await decodeSelectedFile(file,'scene');
    }
    catch(err){
      els.sceneState.textContent='error';els.status.textContent=`Scene file error: ${err.message}`;
    }
  });
  els.ambientFile.addEventListener('change',async()=>{
    const file=els.ambientFile.files?.[0];if(!file)return;try{
      await decodeSelectedFile(file,'ambient');
    }
    catch(err){
      els.ambientState.textContent='error';els.status.textContent=`Ambient file error: ${err.message}`;
    }
  });
  els.protectionCeiling.addEventListener('input',()=>{
    const ceilingDb=Number(els.protectionCeiling.value);els.protectionCeilingValue.textContent=`${ceilingDb.toFixed(1)} dBFS`;configureProtection();
  });
  function setDemoFeelness(feelness){
    if(!feelness)return;
    state.protectionFeelness=feelness;
    configureProtection();
    updateAContentMonitorRoutes();
    updateProtectionUi();
    updateStatus();
  }
  document.querySelectorAll('[data-protection-curve]').forEach(b=>b.addEventListener('click',()=>{
    state.protectionVolumeCurve=b.dataset.protectionCurve;configureProtection();updateProtectionUi();updateStatus();
  }));
  document.querySelectorAll('[data-protection-mode]').forEach(b=>b.addEventListener('click',()=>{
    state.protectionBypassed=b.dataset.protectionMode==='bypass';configureProtection();updateProtectionUi();updateStatus();
  }));
  els.programReferenceTrim.addEventListener('input',()=>{
    state.programReferenceTrimBySource[state.programASourceMode]=Number(els.programReferenceTrim.value);updateControls();updateStatus();
  });
  els.aContentVolume.addEventListener('input',()=>{
    updateControls();updateStatus();
  });
  document.getElementById('demoAContentVolUp').addEventListener('click',()=>stepAContentVolume(6));
  document.getElementById('demoAContentVolDown').addEventListener('click',()=>stepAContentVolume(-6));
  els.sceneGain.addEventListener('input',()=>{
    updateControls();updateStatus();
  });
  els.ambientGain.addEventListener('input',()=>{
    updateControls();updateStatus();
  });
  els.monitorGain.addEventListener('input',()=>{
    updateControls();updateStatus();
  });
  document.querySelectorAll('[data-presentation-profile]').forEach(b=>b.addEventListener('click',()=>setPresentationProfile(b.dataset.presentationProfile)));
  els.programAMute.addEventListener('click',()=>{
    state.programAMuted=!state.programAMuted;updateBranchGains();
  });
  els.sceneMute.addEventListener('click',()=>{
    state.sceneMuted=!state.sceneMuted;updateBranchGains();
  });
  els.ambientMute.addEventListener('click',()=>{
    state.ambientMuted=!state.ambientMuted;updateBranchGains();
  });
  els.programASolo.addEventListener('click',()=>{
    state.programASolo=!state.programASolo;updateBranchGains();
  });
  els.sceneSolo.addEventListener('click',()=>{
    state.sceneSolo=!state.sceneSolo;updateBranchGains();
  });
  els.ambientSolo.addEventListener('click',()=>{
    state.ambientSolo=!state.ambientSolo;updateBranchGains();
  });
  els.loadLocalDefault.addEventListener('click',loadDefaultTracks);
  const releaseInfoDialog=document.getElementById('releaseInfoDialog');
  const advancedDetails=document.getElementById('demoMoreDetails');
  const labSettingsTitle=document.getElementById('labSettingsTitle');
  const labSettingsPanel=document.getElementById('labSettingsPanel');
  const setAdvancedDetailsOpen=open=>{
    advancedDetails.hidden=!open;
    labSettingsTitle.setAttribute('aria-expanded',String(open));
    if(open)requestAnimationFrame(()=>advancedDetails.scrollIntoView({behavior:'smooth',block:'start'}));
  };
  const toggleAdvancedDetails=()=>setAdvancedDetailsOpen(advancedDetails.hidden);
  let labTitlePressTimer=0,labTitleLongPressActivated=false;
  const clearLabTitlePress=()=>{if(labTitlePressTimer){clearTimeout(labTitlePressTimer);labTitlePressTimer=0;}};
  labSettingsTitle.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    clearLabTitlePress();labTitleLongPressActivated=false;
    labTitlePressTimer=window.setTimeout(()=>{labTitlePressTimer=0;labTitleLongPressActivated=true;toggleAdvancedDetails();},650);
  });
  labSettingsTitle.addEventListener('pointerup',clearLabTitlePress);
  labSettingsTitle.addEventListener('pointerleave',clearLabTitlePress);
  labSettingsTitle.addEventListener('lostpointercapture',clearLabTitlePress);
  labSettingsTitle.addEventListener('pointercancel',()=>{clearLabTitlePress();labTitleLongPressActivated=false;});
  labSettingsTitle.addEventListener('contextmenu',event=>event.preventDefault());
  labSettingsTitle.addEventListener('click',event=>{
    if(labTitleLongPressActivated){event.preventDefault();labTitleLongPressActivated=false;return;}
    if(event.detail===0)toggleAdvancedDetails();
  });

  document.getElementById('hideAdvancedDetails').addEventListener('click',()=>{
    setAdvancedDetailsOpen(false);labSettingsTitle.focus({preventScroll:true});
  });
  document.getElementById('versionInfoOpen').addEventListener('click',()=>releaseInfoDialog.showModal());
  document.getElementById('releaseInfoClose').addEventListener('click',()=>releaseInfoDialog.close());
  releaseInfoDialog.addEventListener('click',event=>{if(event.target===releaseInfoDialog)releaseInfoDialog.close();});
  document.getElementById('labSettingsOpen').addEventListener('click',()=>{
    releaseInfoDialog.close();document.body.classList.remove('demoMode');setAdvancedDetailsOpen(false);updateViewModeButton();
    requestAnimationFrame(()=>labSettingsPanel.scrollIntoView({behavior:'smooth',block:'start'}));
  });
  function updateViewModeButton(){
    const demoMode=document.body.classList.contains('demoMode');
    els.viewModeToggle.textContent=demoMode?'Settings':'Back to demo';
    els.viewModeToggle.setAttribute('aria-pressed',demoMode?'true':'false');
  }
  els.viewModeToggle.addEventListener('click',()=>{
    const returningToDemo=!document.body.classList.contains('demoMode');
    document.body.classList.toggle('demoMode');
    if(returningToDemo)setAdvancedDetailsOpen(false);
    updateViewModeButton();
  });
  updateViewModeButton();
  renderHwCueSetup();
  const toggleMix=()=>{
    if(state.playing||state.transportPreparing)stopBothFaded();
    else if(!state.transportFading)startDemo();
  };
  els.stopBoth.addEventListener('click',()=>stopBoth(true));
  async function beginHwSetup(){
    if(els.hwSetupDialog.open)return;
    window.clearTimeout(state.hwSetupNoticeTimer);els.demoHwSetupNotice.classList.remove('visible');els.demoHwSetupNotice.hidden=true;
    state.hwSetupWasPlaying=state.playing||state.transportPreparing;
    state.hwSetupOriginalDemoVolDb=Number(els.monitorGain.value);
    state.hwSetupPreviousLock=state.demoHwCueLocked;state.hwSetupPreviousPresentationDb=state.demoHwCuePresentationDb;
    state.hwSetupPhase='orientation-playing';state.hwSetupError='';
    if(state.playing||state.transportPreparing)stopBoth(false);
    state.demoHwCueLocked=false;state.demoHwCuePresentationDb=null;configureProtection();
    els.monitorGain.value=String(SETUP_CUE_DIGITAL_REFERENCE_DB);updateControls();
    els.hwSetupDialog.showModal();renderHwCueSetup();
    await startSetupCue('setup',{digitalGainDb:-24,loop:true});
  }
  async function beginLoudHwTest(){
    if(state.hwSetupPhase!=='orientation-playing'||state.setupCueStarting)return;
    state.hwSetupPhase='loud-playing';state.hwSetupError='';renderHwCueSetup();
    await stopSetupCueAndWait();
    if(!els.hwSetupDialog.open||state.hwSetupPhase!=='loud-playing')return;
    await startSetupCue('setup',{digitalGainDb:0,loop:true});
  }
  async function continueToDemo(){
    if(!els.hwSetupDialog.open||state.hwSetupPhase!=='loud-playing')return;
    state.hwSetupPhase='finishing';renderHwCueSetup();await stopSetupCueAndWait();
    state.demoHwCueLocked=true;state.demoHwCuePresentationDb=SETUP_CUE_DIGITAL_REFERENCE_DB;
    els.monitorGain.value=String(state.hwSetupOriginalDemoVolDb);updateControls();configureProtection();
    state.hwSetupPhase='idle';els.hwSetupDialog.close();renderHwCueSetup();
    document.body.classList.add('demoViewTransition','demoMode');
    updateViewModeButton();
    els.cabinTest.closest('.cabinTestBox')?.scrollIntoView({behavior:'smooth',block:'start'});
    window.clearTimeout(state.hwSetupNoticeTimer);els.demoHwSetupNotice.hidden=false;
    requestAnimationFrame(()=>els.demoHwSetupNotice.classList.add('visible'));
    window.setTimeout(()=>document.body.classList.remove('demoViewTransition'),DEMO_REVEAL_DELAY_MS);
    state.hwSetupNoticeTimer=window.setTimeout(()=>{
      els.demoHwSetupNotice.classList.remove('visible');
      state.hwSetupNoticeTimer=window.setTimeout(()=>{els.demoHwSetupNotice.hidden=true;},3000);
    },5000);
    await new Promise(resolve=>window.setTimeout(resolve,DEMO_AFTER_CHECK_DELAY_MS));
    await startDemo();
  }
  async function cancelHwSetup(){
    if(!els.hwSetupDialog.open)return;
    state.hwSetupPhase='idle';await stopSetupCueAndWait();
    state.demoHwCueLocked=state.hwSetupPreviousLock;state.demoHwCuePresentationDb=state.hwSetupPreviousPresentationDb;
    els.monitorGain.value=String(state.hwSetupOriginalDemoVolDb);updateControls();configureProtection();
    els.hwSetupDialog.close();renderHwCueSetup();
    if(state.hwSetupWasPlaying)await startDemo({showDemo:true});
  }
  els.hwSetupStart.addEventListener('click',beginHwSetup);
  els.hwSetupLoudStart.addEventListener('click',beginLoudHwTest);
  els.hwSetupContinue.addEventListener('click',continueToDemo);
  els.hwSetupCancel.addEventListener('click',cancelHwSetup);
  els.hwSetupDialog.addEventListener('cancel',event=>{event.preventDefault();cancelHwSetup();});
  els.demoHwCueStop.addEventListener('click',async()=>{
    if(state.setupCuePlaying||state.setupCueStarting)await stopSetupCueAndWait();
    else if(state.hwSetupPhase==='orientation-playing')await startSetupCue('setup',{digitalGainDb:-24,loop:true});
    else if(state.hwSetupPhase==='loud-playing')await startSetupCue('setup',{digitalGainDb:0,loop:true});
  });
  els.restartBoth.addEventListener('click',startBoth);
  document.addEventListener('keydown',event=>{
    if(event.repeat)return;const tag=document.activeElement?.tagName;if(['INPUT','BUTTON','SELECT'].includes(tag))return;if(event.code==='Space'){
      event.preventDefault();toggleMix();
    }
    else if(event.key.toLowerCase()==='m'){
      event.preventDefault();toggleDemoDuck();
    }
  });
  createRoomMeter({
    getAudioContext:ensureAudioContext,isDemoPlaying:()=>state.playing
  });
  // EN: The controller owns manual demo button state and delegates all audio changes back to this host.
  state.demoExperience=createDemoExperienceController({
    cabinNoiseButtons:document.querySelectorAll('[data-cabin-speed]'),playButton:els.demoTransportPlay,muteButton:els.demoMuteForInfo,demoVolUpButton:els.demoVolUp,demoVolDownButton:els.demoVolDown,demoVolumeControl:els.demoPresentationLevel,demoVolumeSegments:els.demoVolumeSegments,labDemoVolUpButton:els.labDemoVolUp,labDemoVolDownButton:els.labDemoVolDown,labDemoVolumeControl:els.labDemoVolumeControl,labDemoVolumeSegments:els.labDemoVolumeSegments,contentDemoVolUpButton:document.getElementById('cfDemoVolUp'),contentDemoVolDownButton:document.getElementById('cfDemoVolDown'),contentDemoVolumeSegments:document.getElementById('cfDemoSegments'),feelnessControl:els.systemBoost.closest('.demoFeelnessControl'),feelnessHint:els.demoFeelnessHint,feelnessButtons:document.querySelectorAll('[data-feelness]'),feelnessLoopEntry:document.getElementById('feelnessLoopEntry'),systemBoostButton:els.systemBoost,isPlaybackActive:()=>state.playing,onEnsurePlayback:()=>startDemo(),onTogglePlayback:()=>{
      if(state.playing||state.transportPreparing)stopBothFaded();else if(!state.transportFading)startDemo();
    },onStepDemoVolume:stepDemoVolume,onStepAContentVolume:stepAContentVolume,onToggleDemoMute:toggleDemoDuck,onSetFeelness:setDemoFeelness,onBoostPointerDown:beginSystemBoostGesture,onBoostPointerUp:endSystemBoostGesture,onBoostPointerCancel:cancelSystemBoostGesture,onBoostClick:startTimedSystemBoost,onEnsureBoostReleased:cancelSystemBoostGesture,onCabinNoiseChange:setCabinNoiseCondition
  });
  els.programAFileName.textContent='No file selected';
  els.programAAnalysis.textContent='Program A K, 3 s: -- · measured live after start';
  setContentAnalysisOfflineSummary('Offline Bach analysis: open Bach Details and choose Analyse this render.');
  updateProgramSourcePresentation();
  setCabinNoiseCondition(50);
  refreshTransportState();
  updateSystemBoostUi();
  updateStatus();
  cabinRenderer.draw();
  drawScope();
