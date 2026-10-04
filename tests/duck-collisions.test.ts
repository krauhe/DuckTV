import assert from 'node:assert/strict';
import test from 'node:test';
import {Simulation} from '../src/simulation.ts';
import {duckVolumes,resolveDuckContacts} from '../src/duck-collisions.ts';
import {SHELTER} from '../src/shelter.ts';

test('crowded ducks, including two sleeping birds, resolve body and head overlap',()=>{
 const sim=new Simulation(()=>.5);
 sim.ducks.forEach((d,i)=>Object.assign(d,{x:0,z:0,y:0,heading:i*Math.PI/2,state:i<2?'sleep':'chase',peck:0}));
 resolveDuckContacts(sim.ducks);
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)for(const a of duckVolumes(sim.ducks[i]))for(const b of duckVolumes(sim.ducks[j]))
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>=a.r+b.r-.003,'collision envelopes remain separate');
});
test('a reaching head stays inside wire sides while the open front remains passable',()=>{
 const sim=new Simulation(()=>.5),d=sim.ducks[0];
 for(const heading of [-Math.PI/2,Math.PI/2,Math.PI]){
  Object.assign(d,{x:heading<0?SHELTER.minX+.40:heading<2?SHELTER.maxX-.40:-3.7,z:heading>2?SHELTER.back+.40:-2.8,y:0,heading,state:'chase',peck:0,vx:0,vz:0});
  resolveDuckContacts([d]);
  for(const v of duckVolumes(d)){
   assert.ok(v.x-v.r>=SHELTER.minX+.039);
   assert.ok(v.x+v.r<=SHELTER.maxX-.039);
   assert.ok(v.z-v.r>=SHELTER.back+.039);
  }
 }
 Object.assign(d,{x:-3.7,z:SHELTER.front,heading:0,state:'wander'});
 resolveDuckContacts([d]);assert.equal(d.z,SHELTER.front);
});

test('closed shutter blocks a waking duck until raised above its head',()=>{
 const duck=new Simulation(()=>.5).ducks[0];
 Object.assign(duck,{x:-3.7,z:SHELTER.front-.2,y:.023,heading:0,state:'wander',peck:0,vz:.3});
 resolveDuckContacts([duck],1);
 for(const volume of duckVolumes(duck))assert.ok(volume.z+volume.r<SHELTER.front+.001);
 const blocked=duck.z;duck.z=SHELTER.front-.2;
 resolveDuckContacts([duck],0);
 assert.ok(duck.z>blocked+.1,'raised door leaves the doorway open');
});
