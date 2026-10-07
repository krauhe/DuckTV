import type {Duck} from './simulation';
type Event='call'|'chat'|'entry'|'exit';
const files={call:['duck-1.wav','duck-2.wav','duck-3.wav'],chat:['chat.wav'],entry:['entry.wav'],exit:['exit.wav']};
/** Owner-prepared clips respond to visible actions, never a background quack timer. */
export class DuckAudio {
 private enabled=false;
 private channels=new Map<string,HTMLAudioElement>();
 private next=new Map<string,number>();
 private previous=new Map<string,{entries:number;state:string;jumping:boolean;display:boolean}>();
 private clip=-1;
 constructor(private readonly onError:()=>void){}
 get active(){return this.enabled;}
 toggle(now:number){this.enabled=!this.enabled;if(this.enabled)this.event('call',now,2);else this.stop();}
 stop(){for(const audio of this.channels.values()){audio.pause();audio.currentTime=0;}this.channels.clear();}
 event(kind:Event,now:number,distance:number){
  if(!this.enabled||document.hidden)return;
  const channel=kind==='entry'||kind==='exit'?'water':'voice';
  if(now<(this.next.get(channel)??0))return;
  const previous=this.channels.get(channel);if(previous&&!previous.paused)return;
  const choices=files[kind];
  if(kind==='call')this.clip=(this.clip+1+Math.floor(Math.random()*2))%choices.length;
  const file=choices[kind==='call'?this.clip:0];
  const audio=new Audio(new URL(`audio/events/${file}`,document.baseURI).href);
  audio.volume=Math.max(.04,Math.min(channel==='water'?.45:.35,.65/Math.max(1,distance)));
  this.channels.set(channel,audio);this.next.set(channel,now+(channel==='water'?.6:7));
  void audio.play().then(()=>{if(!this.enabled||document.hidden)audio.pause();}).catch(()=>{
   if(this.channels.get(channel)!==audio)return;
   this.enabled=false;this.stop();this.onError();
  });
 }
 update(now:number,ducks:ReadonlyArray<Duck>,viewer:{x:number;z:number}){
  if(document.hidden||ducks.every(d=>d.state==='sleep'))this.stop();
  for(const d of ducks){
   const before=this.previous.get(d.id),jumping=d.jumpProgress>=0,display=d.displayDip>.15;
   const distance=Math.hypot(d.x-viewer.x,d.z-viewer.z);
   if(before){
    if(d.waterEntries>before.entries)this.event('entry',now,distance);
    else if(d.state==='exit'&&jumping&&!before.jumping)this.event('exit',now,distance);
    else if(display&&!before.display)this.event('chat',now,distance);
    else if(d.state==='notice'&&before.state!=='notice')this.event('call',now,distance);
   }
   this.previous.set(d.id,{entries:d.waterEntries,state:d.state,jumping,display});
  }
 }
}
