/** Lav baggrundsmusik med gemt tilvalg og pause, når haven ikke er synlig. */
export class BackgroundMusic {
 private visible=true;
 private pending=false;
 private activated=false;
 private ready=false;
 private context?:AudioContext;
 private musicGain?:GainNode;
 private noise?:AudioBufferSourceNode;
 private noiseGain?:GainNode;
 constructor(private audio:HTMLAudioElement,private enabled:boolean,private status:(message:string)=>void){
  audio.loop=true;audio.volume=.18;audio.preload='auto';
  (audio as HTMLAudioElement & {playsInline?:boolean}).playsInline=true;
  audio.setAttribute('playsinline','');
  this.report();
 }
 private report(){this.status('');}
 private stopNoise(){
  if(this.noise){try{this.noise.stop();}catch{/* already stopped */}this.noise.disconnect();this.noise=undefined;}
  this.noiseGain?.disconnect();this.noiseGain=undefined;
 }
 private ensureContext():AudioContext|undefined{
  if(this.context)return this.context;
  const Ctor=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!Ctor)return undefined;
  try{
   const context=new Ctor(),gain=context.createGain();
   context.createMediaElementSource(this.audio).connect(gain).connect(context.destination);
   this.context=context;this.musicGain=gain;this.audio.volume=1;
   gain.gain.setValueAtTime(.18,context.currentTime);
   return context;
  }catch{
   return undefined;
  }
 }
 /** Samme brugertryk starter lyd og billede; gain-noder virker også på iPhone. */
 beginBoot(duration:number){
  this.ready=true;
  if(!this.enabled)return;
  const context=this.ensureContext();
  if(context&&this.musicGain){
   const now=context.currentTime;
   this.musicGain.gain.setValueAtTime(0,now);
   this.musicGain.gain.setValueAtTime(0,now+duration*.35);
   this.musicGain.gain.linearRampToValueAtTime(.18,now+duration);
   // Reduceret bevægelse får kun en kort indtoning, ingen lang TV-susen.
   if(duration>1){
    const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    const noise=context.createBufferSource(),noiseGain=context.createGain();
    noise.buffer=buffer;noise.loop=true;noise.connect(noiseGain).connect(context.destination);
    noiseGain.gain.setValueAtTime(0,now);
    noiseGain.gain.linearRampToValueAtTime(.055,now+duration*.25);
    noiseGain.gain.linearRampToValueAtTime(.015,now+duration*.35);
    noiseGain.gain.linearRampToValueAtTime(0,now+duration*.5);
    this.noise=noise;this.noiseGain=noiseGain;noise.start(now);noise.stop(now+duration*.5);
   }
  }
  this.start();
 }
 finishBoot(){
  this.stopNoise();
  if(this.context&&this.musicGain){const now=this.context.currentTime;this.musicGain.gain.cancelScheduledValues(now);this.musicGain.gain.setTargetAtTime(.18,now,.08);}
 }
 setEnabled(enabled:boolean){this.enabled=enabled;if(enabled)this.start();else{this.audio.pause();this.stopNoise();this.report();}}
 setVisible(visible:boolean){this.visible=visible;if(!visible){this.audio.pause();this.finishBoot();void this.context?.suspend().catch(()=>{});}else if(this.activated)this.start();}
 start(){
  if(!this.ready)return;
  this.activated=true;
  if(!this.enabled||!this.visible||this.pending)return;
  const context=this.ensureContext();
  const state=context?.state as string|undefined;
  if(context&&(state==='suspended'||state==='interrupted'))void context.resume().catch(()=>{});
  if(!this.audio.paused)return;
  this.pending=true;
  void this.audio.play().then(()=>{
   if(!this.enabled||!this.visible)this.audio.pause();
   this.report();
  }).catch((error:unknown)=>{
   if(!this.enabled)return;
   this.status(error instanceof DOMException&&error.name==='NotAllowedError'?'Tryk for at starte musikken':'Musikken kunne ikke starte · slå fra og til for at prøve igen');
  }).finally(()=>{this.pending=false;});
 }
}
