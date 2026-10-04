import assert from 'node:assert/strict';
import test from 'node:test';
import {Simulation,BEHAVIOR} from '../src/simulation';
import {createDuck} from '../src/duck-model';
import {Vector3} from 'three';

test('courtship chooses a facing hen and ends if she turns away',()=>{
 const sim=new Simulation(()=>.2);sim.time=BEHAVIOR.displayFirstAt;
 sim.ducks.forEach((d,i)=>{Object.assign(d,{x:i<2?-2:2,z:i===0?0:i===1?1.2:3,heading:0,state:i===0?'guard':'rest',speed:0,vx:0,vz:0});d.needs.rest=0;d.needs.bath=0;});
 sim.update(.025);assert.equal(sim.courtship,null,'no invitation to a hen with her back turned');
 const hen=sim.ducks[1];hen.heading=Math.PI;sim.time+=4.1;
 sim.ducks[0].state='guard';hen.state='rest';sim.update(.025);
 assert.equal(sim.courtship?.partnerId,hen.id);
 assert.ok(sim.ducks.slice(2).every(d=>d.displayDip===0));
 hen.heading=0;sim.update(.025);assert.equal(sim.courtship,null);
});
test('foraging takes substantial time and leads to drinking at the edge',()=>{
 let n=18;const sim=new Simulation(()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;});
 const foraged=new Set<string>();let forageFrames=0,drinkFrames=0,sips=0;
 for(let i=0;i<12000;i++){
  sim.update(.025);
  for(const d of sim.ducks){
   if(d.state==='forage'){forageFrames++;foraged.add(d.id);}
   if(d.state==='drink'){drinkFrames++;assert.ok(foraged.has(d.id));if(d.peck>.45){sips++;assert.ok(d.speed<.04);}}
  }
 }
 assert.ok(forageFrames>12000*.4,'foraging is a substantial share of the four ducks activity');
 assert.ok(drinkFrames>0&&sips>0,'ducks both travel to water and dip their bills');
});
test('drinking dips reach the water rather than the lawn',()=>{
 for(const peck of [.46,.5]){
  const model=createDuck('buff');for(let i=1;i<=180;i++)model.animate({state:'drink',time:i/60,speed:0,upright:0,look:0,peck,headTilt:0,displayDip:0});
  model.group.updateMatrixWorld(true);
  const tip=model.group.getObjectByName('duck-head')!.localToWorld(new Vector3(0,.036,.30));
  assert.ok(tip.y>.22&&tip.y<.34);assert.ok(tip.z>.55);
 }
});