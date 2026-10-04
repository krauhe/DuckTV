import assert from 'node:assert/strict';
import test from 'node:test';
import { perceive, replyChance, type Neighbor } from '../src/social-behavior.ts';
import { Simulation } from '../src/simulation.ts';

test('nearby resting neighbors encourage calm; distant ones do not broadcast it',()=>{
  const self:Neighbor={id:'a',x:0,z:0,state:'wander',speed:0};
  const friend:Neighbor={id:'b',x:1,z:0,state:'sleep',speed:0};
  assert.ok(perceive(self,[self,friend]).calm>.5);
  assert.equal(perceive(self,[self,{...friend,x:8}]).calm,0);
  assert.ok(perceive(self,[self,{...friend,state:'chase',speed:1.6}]).activity>.5);
  assert.ok(perceive(self,[self,{...friend,state:'swim'}]).bathing>.5);
});

test('a rested, safe female is more receptive than a tired or threatened one',()=>{
  const needs={bath:.2,rest:.2,sociability:.8};
  const safe=replyChance(needs,4,1);
  assert.ok(safe>replyChance(needs,1.2,1));
  assert.ok(safe>replyChance({...needs,rest:1},4,1));
  assert.ok(safe>replyChance(needs,4,2.7));
});

test('bathing relieves the individual need while land ducks accumulate it',()=>{
  const sim=new Simulation(()=>.5);
  const duck=sim.ducks[1];
  const before=duck.needs.bath;
  sim.update(.1);
  assert.ok(duck.needs.bath>before);
  for(let i=0;i<6000&&duck.state!=='swim';i++)sim.update(.025);
  assert.equal(duck.state,'swim');
  const inWater=duck.needs.bath;
  sim.update(.1);
  assert.ok(duck.needs.bath<inWater);
});
