import assert from 'node:assert/strict';
import test from 'node:test';
import {Simulation} from '../src/simulation';
import {createDuck} from '../src/duck-model';

test('nearby flies trigger a gape and successful snaps remove the prey',()=>{
 let seed=18;const sim=new Simulation(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;});
 let opens=0,caught=0;
 for(let i=0;i<16000;i++){
  const before=sim.ducks.map(d=>d.insectsCaught);sim.update(.025);
  sim.ducks.forEach((d,j)=>{
   if(d.mouthOpen>.2){opens++;assert.equal(d.state,'chase');assert.ok(d.insect);assert.ok(Math.hypot(d.x-d.insect.x,d.z-d.insect.z)<1.2);}
   if(d.insectsCaught>before[j]){caught++;assert.equal(d.insect,undefined);}
  });
 }
 assert.ok(opens>0&&caught>0);
});
test('jaw opens for a snap and closes after chase',()=>{
 const model=createDuck('buff'),jaw=model.group.getObjectByName('duck-lower-jaw')!;
 const pose={state:'chase' as const,time:0,speed:1,upright:0,look:0,peck:0,headTilt:0,displayDip:0,mouthOpen:1};
 for(let i=1;i<=20;i++)model.animate({...pose,time:i/60});
 assert.ok(jaw.rotation.x>.4);
 for(let i=21;i<=60;i++)model.animate({...pose,state:'rest',time:i/60,speed:0,mouthOpen:0});
 assert.ok(jaw.rotation.x<.001);
});