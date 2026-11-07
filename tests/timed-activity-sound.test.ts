import test from 'node:test';
import assert from 'node:assert/strict';
import {TimedActivitySound} from '../src/timed-activity-sound';
import {ActivityAudio} from '../src/activity-audio';
import {BATH_DUET_SECONDS} from '../src/bath-duet';
import {Simulation} from '../src/simulation';

function audio(){
 const sources:any[]=[],gains:any[]=[];
 const context={currentTime:0,state:'running',
  createGain(){const ramps:number[][]=[];const gain={gain:{value:0,setTargetAtTime(){},setValueAtTime(){},cancelAndHoldAtTime(){},linearRampToValueAtTime(...args:number[]){ramps.push(args);}},ramps,connect(){},disconnect(){}};gains.push(gain);return gain;},
  createBufferSource(){const source={buffer:null,starts:[] as number[][],stops:[] as number[],connect(){},disconnect(){},start(...args:number[]){this.starts.push(args);},stop(at:number){this.stops.push(at);},onended:null};sources.push(source);return source;}
 };
 const buffer={duration:BATH_DUET_SECONDS} as AudioBuffer;
 return {context,sources,gains,buffer,sound:new TimedActivitySound(context as unknown as AudioContext,{} as AudioNode)};
}

test('one full recording, natural fade and no restart on each frame',()=>{
 const {sound,context,sources,gains,buffer}=audio();
 sound.update(buffer,{id:1,elapsed:0,duration:buffer.duration},.5);
 assert.deepEqual(sources[0].starts,[[0,0,buffer.duration]]);
 for(let i=1;i<240;i++){context.currentTime=i/10;sound.update(buffer,{id:1,elapsed:i/10,duration:buffer.duration},.4);}
 assert.equal(sources.length,1);
 assert.deepEqual(gains[1].ramps.at(-1),[0,buffer.duration]);
 context.currentTime=buffer.duration;sound.update(buffer,null,.5);
 assert.equal(sources[0].stops.length,1);
});

test('late loading, mute/resume and slow frames seek to the current activity time',()=>{
 const {sound,context,sources,buffer}=audio();
 sound.update(undefined,{id:1,elapsed:0,duration:buffer.duration},.5);assert.equal(sources.length,0);
 context.currentTime=6;sound.update(buffer,{id:1,elapsed:6,duration:buffer.duration},.5);
 assert.equal(sources[0].starts[0][1],6);
 sound.update(buffer,null,.5);assert.equal(sources[0].stops.length,1);
 context.currentTime=8;sound.update(buffer,{id:1,elapsed:8,duration:buffer.duration},.5);
 assert.equal(sources[1].starts[0][1],8);
 context.currentTime=12;sound.update(buffer,{id:1,elapsed:10,duration:buffer.duration},.5);
 assert.equal(sources[1].stops.length,1);assert.equal(sources[2].starts[0][1],10);
 sound.update(buffer,{id:1,elapsed:buffer.duration,duration:buffer.duration},.5);
 assert.equal(sources.length,3,'never loop the clip at its end');
});

test('mixer reserves water chatter for the paired episode and obeys mute',()=>{
 const {context,sources,buffer}=audio();
 const mixer=new ActivityAudio(true,.5,()=>{});
 Object.assign(mixer,{context,master:context.createGain(),buffers:new Map([['water',buffer]])});
 const ducks=new Simulation(()=>.5).ducks;
 ducks[0].state='swim';ducks[1].state='swim';
 mixer.update(ducks,{x:0,z:0},false);assert.equal(sources.length,0);
 const duet={id:1,leaderId:ducks[0].id,followerId:ducks[1].id,startedAt:10,duration:buffer.duration,direction:1 as const};
 mixer.update(ducks,{x:0,z:0},false,duet,10);assert.equal(sources.length,1);
 context.currentTime=1;mixer.update(ducks,{x:0,z:0},false,duet,11);assert.equal(sources.length,1);
 mixer.setVolume(0);assert.equal(sources[0].stops.length,1);
 context.currentTime=3;mixer.setVolume(.5);mixer.update(ducks,{x:0,z:0},false,duet,13);
 assert.equal(sources[1].starts[0][1],3);
});
