import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {Simulation} from '../src/simulation';
import {POND} from '../src/types';
import {BATH_DUET_SECONDS} from '../src/bath-duet';

function bathingPair(){
 const sim=new Simulation(()=>.5);sim.time=20;sim.setViewer(-4,3);
 for(const [i,d] of sim.ducks.entries()){
  const intent=(sim as any).intents.get(d.id);
  if(i<2){
   const angle=i*1.7;
   Object.assign(d,{state:'swim',x:POND.x+.86*Math.cos(angle),z:POND.z+.86*Math.sin(angle),y:POND.waterY,heading:-angle,speed:0});
   d.needs.bath=.8;Object.assign(intent,{landedAt:18,swimUntil:26,target:{x:d.x,z:d.z}});
  }else{d.state='preen';intent.comfortUntil=100;}
 }
 return sim;
}

test('paired swimming lasts exactly one recording and keeps moving with safe spacing',()=>{
 const sim=bathingPair();sim.update(.025);assert.ok(sim.bathDuet);
 const duet=sim.bathDuet;
 assert.equal(duet.duration,BATH_DUET_SECONDS);
 const pair=sim.ducks.filter(d=>[duet.leaderId,duet.followerId].includes(d.id));
 const angles=pair.map(d=>Math.atan2(d.z-POND.z,d.x-POND.x)),travel=[0,0];let minGap=Infinity;
 while(sim.time+.025<duet.startedAt+duet.duration){
  const before=pair.map(d=>({x:d.x,z:d.z}));sim.update(.025);
  assert.equal(sim.bathDuet,duet);
  pair.forEach((d,i)=>{
   assert.equal(d.state,'swim');assert.ok(Number.isFinite(d.x+d.z+d.heading));
   assert.ok(Math.hypot(d.x-before[i].x,d.z-before[i].z)<.03,'continuous movement, including turns');
   assert.ok(Math.hypot(d.x-POND.x,d.z-POND.z)<=POND.radius-.51+1e-6);
   assert.ok(d.speed<=.44);
   const angle=Math.atan2(d.z-POND.z,d.x-POND.x);
   travel[i]+=Math.atan2(Math.sin(angle-angles[i]),Math.cos(angle-angles[i]))*duet.direction;angles[i]=angle;
  });
  minGap=Math.min(minGap,Math.hypot(pair[0].x-pair[1].x,pair[0].z-pair[1].z));
 }
 assert.ok(minGap>.65,`safe following distance: ${minGap}`);
 assert.ok(travel.every(angle=>angle>5),`both actually circle the pool: ${travel}`);
 sim.update(.025);assert.equal(sim.bathDuet,null);
 assert.ok(pair.every(d=>d.state==='swim'),'gentle ending before separate departures');
 for(let i=0;i<40;i++){sim.update(.025);assert.equal(sim.bathDuet,null);}
});

test('food, night, a close viewer or a missing swimming partner cancel the bout',()=>{
 for(const interrupt of [
  (s:Simulation)=>s.castFood(-2,1),
  (s:Simulation)=>s.setNight(true),
  (s:Simulation)=>s.setViewer(s.ducks[0].x+.3,s.ducks[0].z),
  (s:Simulation)=>{s.ducks[0].state='exit';},
 ]){
  const sim=bathingPair();sim.update(.025);assert.ok(sim.bathDuet);
  interrupt(sim);sim.update(.025);assert.equal(sim.bathDuet,null);
 }
 const sim=bathingPair();sim.ducks[1].state='preen';sim.update(.1);assert.equal(sim.bathDuet,null);
});

test('ordinary self-directed bathing can discover the paired activity',()=>{
 let seed=99;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const sim=new Simulation(random);sim.setViewer(-4,3);
 for(let i=0;i<6000&&!sim.bathDuet;i++)sim.update(.1);
 assert.ok(sim.bathDuet,'no forced pool placement is needed in normal operation');
});

test('activity duration matches the published playback WAV',()=>{
 const path=new URL('../public/audio/effects/water.wav',import.meta.url);
 assert.ok(existsSync(path),'the published build needs the selected playback clip');
 const bytes=readFileSync(path);let frames=0,rate=0,align=0;
 for(let i=12;i+8<bytes.length;){
  const tag=bytes.toString('ascii',i,i+4),size=bytes.readUInt32LE(i+4);
  if(tag==='fmt '){rate=bytes.readUInt32LE(i+12);align=bytes.readUInt16LE(i+20);}
  if(tag==='data')frames=size/align;
  i+=8+size+(size%2);
 }
 assert.equal(frames/rate,BATH_DUET_SECONDS);
});
