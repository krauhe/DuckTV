import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DuckAudio} from '../src/duck-audio';
import {Simulation} from '../src/simulation';
test('sound is opt-in and water clips follow bath events only once',async()=>{
 const clips:FakeAudio[]=[];
 class FakeAudio{paused=true;currentTime=0;volume=0;constructor(public src:string){clips.push(this);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
 const doc={baseURI:'https://example.test/DuckTV/',hidden:false};Object.assign(globalThis,{Audio:FakeAudio,document:doc});
 try{
  const sound=new DuckAudio(()=>assert.fail('playback error')),sim=new Simulation(()=>.5),d=sim.ducks[0];
  const viewer={x:0,z:3};sound.update(0,sim.ducks,viewer);assert.equal(clips.length,0);
  sound.toggle(1);await Promise.resolve();assert.match(clips[0].src,/audio\/events\/duck-[123]\.wav$/);
  clips[0].paused=true;sound.update(100,sim.ducks,viewer);assert.equal(clips.length,1,'no timer-driven quacks');
  d.waterEntries++;d.state='swim';sound.update(101,sim.ducks,viewer);assert.match(clips[1].src,/entry.wav$/);
  sound.update(102,sim.ducks,viewer);assert.equal(clips.length,2,'entry is not repeated every frame');
  clips[1].paused=true;d.state='exit';d.jumpProgress=0;sound.update(105,sim.ducks,viewer);assert.match(clips[2].src,/exit.wav$/);
  sound.update(106,sim.ducks,viewer);assert.equal(clips.length,3);
  sim.ducks.forEach(d=>d.state='sleep');sound.update(107,sim.ducks,viewer);assert.ok(clips.every(c=>c.paused));
  sound.toggle(108);d.waterEntries++;sound.update(109,sim.ducks,viewer);assert.equal(clips.length,3);
  sound.toggle(120);await Promise.resolve();doc.hidden=true;sound.update(121,sim.ducks,viewer);assert.ok(clips.every(c=>c.paused));
 }finally{delete (globalThis as any).Audio;delete (globalThis as any).document;}
});
