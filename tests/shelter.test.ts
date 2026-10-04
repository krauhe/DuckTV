import assert from 'node:assert/strict';
import test from 'node:test';
import { Simulation } from '../src/simulation.ts';
import { SHELTER, ShelterDoor, shelterBeds } from '../src/shelter.ts';

test('ducks walk into the open shelter at night and wake at dawn',()=>{
 const sim=new Simulation(()=>.5);sim.setNight(true);
 for(let i=0;i<3600;i++)sim.update(.025);
 for(const d of sim.ducks){
  assert.equal(d.state,'sleep',`${d.id}: ${d.x},${d.z}`);
  assert.ok(d.x>SHELTER.minX&&d.x<SHELTER.maxX&&d.z<SHELTER.front);
 }
 assert.equal(sim.shelterDoor.closed,1,'door rolls down once all four sleep inside');
 sim.setNight(false);sim.update(.025);
 assert.ok(sim.ducks.every(d=>d.state!=='sleep'));
 for(let i=0;i<800;i++)sim.update(.025);
 assert.equal(sim.shelterDoor.closed,0,'door opens at dawn');
 assert.ok(sim.ducks.some(d=>d.z>SHELTER.front));
});

test('door waits for every duck and reverses when a duck wakes or blocks the opening',()=>{
 const door=new ShelterDoor();
 const ducks=shelterBeds.map(p=>({...p,state:'sleep'}));
 ducks[3].state='preen';
 for(let i=0;i<400;i++)door.update(.025,true,ducks);
 assert.equal(door.closed,0);
 ducks[3].state='sleep';
 for(let i=0;i<160;i++)door.update(.025,true,ducks);
 assert.ok(door.closed>0&&door.closed<1,'closing takes time');
 const halfway=door.closed;ducks[0].state='wander';door.update(.025,true,ducks);
 assert.ok(door.closed<halfway,'waking reverses immediately');
 ducks[0].state='sleep';ducks[3].z=SHELTER.front-.1;
 for(let i=0;i<200;i++)door.update(.025,true,ducks);
 assert.equal(door.closed,0,'threshold stays clear');
});

test('darkness never cancels an ongoing bath jump',()=>{
 const sim=new Simulation(()=>.5);
 for(let i=0;i<6000&&!sim.ducks.some(d=>d.jumpProgress>=0);i++)sim.update(.025);
 const duck=sim.ducks.find(d=>d.jumpProgress>=0);assert.ok(duck);
 sim.setNight(true);
 for(let i=0;i<4800;i++)sim.update(.025);
 assert.ok(sim.ducks.every(d=>d.state==='sleep'));
});
