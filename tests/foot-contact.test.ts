import test from 'node:test';
import assert from 'node:assert/strict';
import { FootContact } from '../src/training/foot-contact.ts';
test('contact chatter and stationary lifts cannot earn steps; alternating forward swings can',()=>{
 const c=new FootContact();let time=0;
 const sample=(side:number,x:number,y:number)=>{time+=.01;c.sample(side,time,.01,{x:x+.14,y},{x:x-.14,y});};
 for(let i=0;i<100;i++)for(let side=0;side<2;side++)sample(side,0,i%2?.025:.065);
 assert.equal(c.steps,0);
 for(let side=0;side<2;side++){
  sample(side,0,.025);
  for(let i=0;i<20;i++)sample(side,0,.065);
  sample(side,0,.025);
 }
 assert.equal(c.steps,0);
 for(let side=0;side<2;side++){
  sample(side,0,.025);
  for(let i=0;i<20;i++)sample(side,(i+1)*.006,.065);
  sample(side,.12,.025);
 }
 assert.equal(c.steps,2);
});
