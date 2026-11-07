import {GESTURE_SECONDS} from './duck-gestures';
import {callEnvelope,sampleCall} from './call-envelope';
import type {Duck} from './simulation';
import type {BathDuet} from './bath-duet';
import {TimedActivitySound} from './timed-activity-sound';
export function effectLevels(weather:{rain:number;wind:number},night:boolean,swimmers:number,distance:number){
 const near=Math.min(1,2/Math.max(2,distance));
 return {rain:Math.min(.65,Math.max(0,weather.rain)*.24),wind:Math.min(.5,Math.max(0,weather.wind-1)*.065),birds:night?.015:.18/(1+Math.max(0,weather.rain)),swim:swimmers?near*.22:0};
}
export function helicopterLevel(distance:number,rotorActivity:number){
 return .13*Math.max(0,Math.min(1,rotorActivity))/(1+(Math.max(0,distance)/35)**2);
}
type Loop='rain'|'wind'|'birds'|'swim'|'helicopter';
const names=['rain','wind','birds','swim','water','splash','call1','call2','call3','call4','chat','wings','helicopter'] as const;
export class ActivityAudio{
 private context?:AudioContext;private master?:GainNode;private loading?:Promise<void>;
 private buffers=new Map<string,AudioBuffer>();private layers=new Map<Loop,{gain:GainNode;next:number;level:number}>();
 private envelopes=new Map<string,number[]>();
 private voices=new Map<string,{name:string;start:number;duration:number}>();
 mouthOpen(id:string){
  const ctx=this.context,voice=this.voices.get(id);
  if(!ctx||ctx.state!=='running'||!voice||!this.enabled||!this.visible||this.volume===0)return 0;
  const elapsed=ctx.currentTime-voice.start;
  if(elapsed>=voice.duration){this.voices.delete(id);return 0;}
  return sampleCall(this.envelopes.get(voice.name)??[],elapsed,voice.duration);
 }
 private sources=new Set<AudioBufferSourceNode>();private previous=new Map<string,{entries:number;jump:boolean;display:boolean;state:string;flapping:boolean}>();
 private wingSources=new Map<string,AudioBufferSourceNode>();private nextChatter=5;private splashVariant=0;
 private weather={rain:0,wind:1.5};private visible=true;private nextCall=0;private nextSplash=0;private lastCall=0;
 private helicopter=0;
 private bathSound?:TimedActivitySound;
 setHelicopter(distance:number,rotorActivity:number){this.helicopter=helicopterLevel(distance,rotorActivity);}
 constructor(private enabled:boolean,private volume:number,private notice:(message:string)=>void){}
 setWeather(w:{rain?:number;wind?:number}){this.weather={rain:w.rain??0,wind:w.wind??1.5};}
 setEnabled(value:boolean){this.enabled=value;this.adjustMaster();if(value)void this.start();else this.bathSound?.stop();}
 setVolume(value:number){this.volume=Math.max(0,Math.min(1,value));this.adjustMaster();if(!this.volume)this.bathSound?.stop();}
 private adjustMaster(){if(this.context&&this.master)this.master.gain.setTargetAtTime(this.enabled&&this.visible?this.volume:0,this.context.currentTime,.12);}
 setVisible(value:boolean){this.visible=value;if(!value){this.bathSound?.stop();if(this.context)void this.context.suspend();}else if(this.enabled)void this.start();}
 async start(){
  if(!this.enabled||!this.visible)return;
  try{
   if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);}
   await this.context.resume();this.adjustMaster();
   if(!this.loading){
    this.notice('Henter lyde …');
    this.loading=Promise.all(names.map(async name=>{
     const response=await fetch(new URL(`audio/effects/${name}.wav?v=2`,document.baseURI));if(!response.ok)throw Error(name);
     const buffer=await this.context!.decodeAudioData(await response.arrayBuffer());this.buffers.set(name,buffer);
     if(name.startsWith('call')||name==='chat')this.envelopes.set(name,callEnvelope(buffer.getChannelData(0),buffer.sampleRate));
    })).then(()=>{this.notice('');}).catch(()=>{this.notice('Nogle lyde kunne ikke hentes. Skru ned til nul og op igen for at prøve igen.');this.loading=undefined;});
   }
   await this.loading;
  }catch{this.notice('Flyt lydslideren for at starte lydene.');}
 }
 private play(name:string,destination:AudioNode,at:number,fade=0,options:{offset?:number;duration?:number;rate?:number;source?:(s:AudioBufferSourceNode)=>void}={}){
  const ctx=this.context!,buffer=this.buffers.get(name);if(!buffer)return 0;
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.connect(gain);gain.connect(destination);
  const offset=options.offset??0,rate=options.rate??1,duration=Math.min(options.duration??buffer.duration,buffer.duration-offset)/rate;
  source.playbackRate.value=rate;options.source?.(source);fade=Math.min(fade,duration/2);
  if(fade){gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(1,at+fade);gain.gain.setValueAtTime(1,at+duration-fade);gain.gain.linearRampToValueAtTime(0,at+duration);}
  source.start(at,offset,duration*rate);this.sources.add(source);source.onended=()=>{source.disconnect();gain.disconnect();this.sources.delete(source);};return duration;
 }
 update(ducks:ReadonlyArray<Duck>,viewer:{x:number;z:number},night:boolean,bathDuet:BathDuet|null=null,simulationTime=0){
  const ctx=this.context,now=ctx?.currentTime??0,ready=!!ctx&&ctx.state==='running'&&this.enabled&&this.visible&&this.volume>0;
  const swimming=ducks.filter(d=>d.state==='swim');
  const isPartner=(d:Duck)=>!!bathDuet&&(d.id===bathDuet.leaderId||d.id===bathDuet.followerId);
  if(ctx&&this.master){
   this.bathSound??=new TimedActivitySound(ctx,this.master);
   const pair=swimming.filter(isPartner);
   const distance=Math.min(...pair.map(d=>Math.hypot(d.x-viewer.x,d.z-viewer.z)));
   const cue=bathDuet&&pair.length===2?{id:bathDuet.id,elapsed:simulationTime-bathDuet.startedAt,duration:bathDuet.duration}:null;
   this.bathSound.update(this.buffers.get('water'),ready?cue:null,Math.min(.55,1.4/Math.max(2,distance)));
  }
  if(ready){
   const levels={...effectLevels(this.weather,night,swimming.length,Math.min(...swimming.map(d=>Math.hypot(d.x-viewer.x,d.z-viewer.z)))),helicopter:this.helicopter};
   if(bathDuet)levels.swim*=.18; // Let the full water/chat recording carry this bout.
   for(const name of Object.keys(levels) as Loop[]){
    let layer=this.layers.get(name);if(!layer){const gain=ctx!.createGain();gain.gain.value=0;gain.connect(this.master!);layer={gain,next:0,level:0};this.layers.set(name,layer);}
    const level=levels[name];if(Math.abs(layer.level-level)>.001){layer.gain.gain.setTargetAtTime(level,now,1.4);layer.level=level;}
    if(level>.001&&this.buffers.has(name)&&layer.next<=now+.15){const at=Math.max(now,layer.next);const length=this.play(name,layer.gain,at,.8);layer.next=at+length-.8;}
   }
  }
  for(const d of ducks){
   const old=this.previous.get(d.id),jump=d.jumpProgress>=0,display=d.displayDip>.15,flapping=d.gesture?.kind==='wingFlap';
   if((!flapping||!ready)&&this.wingSources.has(d.id)){this.wingSources.get(d.id)!.stop();this.wingSources.delete(d.id);}
   if(ready&&old&&flapping&&!old.flapping){
    const gain=ctx!.createGain();gain.gain.value=Math.min(.65,2/Math.max(2,Math.hypot(d.x-viewer.x,d.z-viewer.z)));gain.connect(this.master!);
    const duration=this.play('wings',gain,now,.025,{offset:(d.gesture?.progress??0)*GESTURE_SECONDS.wingFlap,source:s=>this.wingSources.set(d.id,s)});setTimeout(()=>gain.disconnect(),(duration+1)*1000);
   }
   if(ready&&old){
    const splash=d.waterEntries>old.entries||(d.state==='exit'&&jump&&!old.jump);
    const casual=!night&&!isPartner(d)&&now>=this.nextChatter&&['wander','forage','swim','preen','guard'].includes(d.state)&&Math.random()<.025;
    const call=casual||(d.state==='notice'&&old.state!=='notice')||(display&&!old.display)||(d.state==='preen'&&old.state!=='preen'&&!night);
    const distance=Math.hypot(d.x-viewer.x,d.z-viewer.z);
    if((splash&&now>=this.nextSplash)||(call&&now>=this.nextCall)){
     const gain=ctx!.createGain();gain.gain.value=Math.min(splash?.7:.6,2/Math.max(2,distance));gain.connect(this.master!);
     this.lastCall=(this.lastCall+1+Math.floor(Math.random()*3))%4;
     // Rotate through distinct portions of the user's water recordings.
     const variants=[{name:'splash',offset:0,duration:1.02},{name:'swim',offset:3.2,duration:1.4},{name:'swim',offset:8.6,duration:1.2},{name:'swim',offset:15.5,duration:1.6}];
     const variant=variants[this.splashVariant%variants.length];
     const name=splash?variant.name:display?'chat':`call${this.lastCall+1}`;
     const duration=this.play(name,gain,now,splash?.06:0,splash?{offset:variant.offset,duration:variant.duration,rate:.95+Math.random()*.1}:{});setTimeout(()=>gain.disconnect(),(duration+1)*1000);
     if(!splash&&duration>0)this.voices.set(d.id,{name,start:now,duration});
     if(splash){this.nextSplash=now+.7;this.splashVariant++;}else {this.nextCall=now+5+Math.random()*5;this.nextChatter=now+9+Math.random()*15;}
    }
   }
   // Observe while muted too: enabling must not replay old events.
   this.previous.set(d.id,{entries:d.waterEntries,jump,display,state:d.state,flapping});
  }
 }
}
