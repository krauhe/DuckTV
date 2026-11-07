export interface SoundCue {id:number;elapsed:number;duration:number}

/** One recording follows the simulation clock, also across mute/pause/slow frames. */
export class TimedActivitySound {
  private level: GainNode;
  private active?: {id:number;source:AudioBufferSourceNode;gain:GainNode;at:number;offset:number};
  constructor(private context:AudioContext,destination:AudioNode){
    this.level=context.createGain();this.level.gain.value=0;this.level.connect(destination);
  }
  stop(){
    const voice=this.active;if(!voice)return;
    this.active=undefined;
    const now=this.context.currentTime;
    voice.gain.gain.cancelAndHoldAtTime(now);
    voice.gain.gain.linearRampToValueAtTime(0,now+.16);
    voice.source.stop(now+.16);
  }
  update(buffer:AudioBuffer|undefined,cue:SoundCue|null,volume:number){
    const now=this.context.currentTime;
    if(!buffer||!cue||volume<=0||cue.elapsed<0||cue.elapsed>=Math.min(cue.duration,buffer.duration)-.025){this.stop();return;}
    this.level.gain.setTargetAtTime(volume,now,.35);
    const previous=this.active;
    // Late loading/enabling starts at the current activity position, not at zero.
    if(previous?.id===cue.id&&Math.abs(previous.offset+now-previous.at-cue.elapsed)<.35)return;
    this.stop();
    const source=this.context.createBufferSource(),gain=this.context.createGain();
    source.buffer=buffer;source.connect(gain);gain.connect(this.level);
    const remaining=Math.min(cue.duration,buffer.duration)-cue.elapsed;
    const fade=Math.min(.55,remaining/2);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+fade);
    gain.gain.setValueAtTime(1,now+remaining-fade);gain.gain.linearRampToValueAtTime(0,now+remaining);
    source.onended=()=>{source.disconnect();gain.disconnect();};
    source.start(now,cue.elapsed,remaining);
    this.active={id:cue.id,source,gain,at:now,offset:cue.elapsed};
  }
}
