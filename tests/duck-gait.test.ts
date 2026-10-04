import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from 'three';
import { DuckGait } from '../src/duck-gait';

test('support feet stay planted, swing alternates, and stopping finishes the last step', () => {
 for(const speed of [.15,.82,1.65]){
  const gait=new DuckGait(),position=new Vector3();
  gait.update(0,position,0,true);
  let lastLift=-1,steps=0,planted=0;
  for(let i=1;i<=900;i++){
   const moving=i<600;
   const heading=moving?Math.sin(i/180)*.5:Math.sin(599/180)*.5;
   if(moving){position.x+=Math.sin(heading)*speed/60;position.z+=Math.cos(heading)*speed/60;}
   const before=gait.feet.map(f=>({position:f.position.clone(),progress:f.progress}));
   gait.update(1/60,position,heading,true);
   assert.ok(gait.feet.filter(f=>f.progress<1).length<=1,'one foot always supports the body');
   gait.feet.forEach((foot,index)=>{
    assert.ok(foot.position.y>=.0032-1e-8);
    assert.ok(foot.position.distanceTo(before[index].position)<.14,'foot travel stays bounded during a fast swing');
    if(before[index].progress===1&&foot.progress===1){
     assert.ok(foot.position.distanceTo(before[index].position)<1e-9,'support foot does not slide');planted++;
    }
    if(before[index].progress===1&&foot.progress===0){
     assert.ok(foot.position.distanceTo(before[index].position)<1e-9,'lift-off starts at the planted position');
     if(moving && steps>0)assert.notEqual(index,lastLift,'alternate feet while walking');
     lastLift=index;steps++;
    }
   });
  }
  assert.ok(steps>5&&planted>500);
  assert.ok(gait.feet.every(f=>f.progress===1&&f.lift<1e-8));
 }
});

test('walking spends most of each foot cycle planted with a brief recovery',()=>{
 for(const speed of [.15,.4,.82]){
  const gait=new DuckGait(),position=new Vector3();gait.update(0,position,0,true);
  let planted=0,lifted=0;
  for(let i=1;i<=1200;i++){
   position.z+=speed/120;gait.update(1/120,position,0,true);
   for(const foot of gait.feet){if(foot.lift<.05)planted++;else lifted++;}
  }
  assert.ok(planted/(planted+lifted)>.65,'each foot spends over 65% of the cycle supporting or near the ground');
  assert.ok(lifted>50,'feet still lift rather than sliding');
 }
});

test('turning in place takes steps and a reset replants feet at the new location',()=>{
 const gait=new DuckGait(),position=new Vector3();gait.update(0,position,0,true);
 let lifted=false;
 for(let i=1;i<200;i++){gait.update(1/60,position,Math.min(Math.PI,i*.02),true);lifted ||=gait.feet.some(f=>f.lift>.5);}
 assert.ok(lifted);
 position.set(4,0,3);gait.update(1/60,position,0,true);
 assert.ok(gait.feet.every(f=>f.position.distanceTo(position)<.2&&f.progress===1));
});
