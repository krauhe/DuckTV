import test from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3} from 'three';
import {createDuck} from '../src/duck-model';
import {DuckAlert} from '../src/duck-alert';
import type {DuckPose} from '../src/types';
const pose:DuckPose={state:'wander',time:0,speed:0,upright:1,look:0,peck:0,headTilt:0,displayDip:0};
test('gaze resists body rotation and crosses the yaw seam without snapping',()=>{
 for(const initial of [0,Math.PI-.01]){
  const duck=createDuck('buff'),head=duck.group.getObjectByName('duck-head')!;
  duck.group.rotation.y=initial;
  for(let i=1;i<=120;i++)duck.animate({...pose,time:i/60});
  const before=head.getWorldQuaternion(new Quaternion());
  duck.group.rotation.y=Math.atan2(Math.sin(initial+.03),Math.cos(initial+.03));
  duck.animate({...pose,time:121/60});
  const change=before.angleTo(head.getWorldQuaternion(new Quaternion()));
  assert.ok(change<.015,`head inherits only a small part of pelvis turn: ${change}`);
 }
});
test('turning in place shifts weight while the support foot stays anchored',()=>{
 const duck=createDuck('buff'),body=duck.group.getObjectByName('duck-torso')!;
 const head=duck.group.getObjectByName('duck-head')!;
 let maxRoll=0,maxHeadStep=0,previous=head.getWorldPosition(new Vector3());
 for(let i=1;i<=240;i++){
  duck.group.rotation.y=i/60*.6;duck.animate({...pose,time:i/60});
  maxRoll=Math.max(maxRoll,Math.abs(body.rotation.z));
  const current=head.getWorldPosition(new Vector3());if(i>60)maxHeadStep=Math.max(maxHeadStep,current.distanceTo(previous));previous=current;
 }
 assert.ok(maxRoll>.005,'weight transfer accompanies turning steps without translation');
 assert.ok(maxHeadStep<.035,'head position remains continuous');
});
test('rest-to-walk transition does not jump body scale or pitch',()=>{
 const duck=createDuck('pied'),shape=duck.group.getObjectByName('duck-body-shape')!,body=duck.group.getObjectByName('duck-torso')!;
 for(let i=1;i<=180;i++)duck.animate({...pose,state:'rest',time:i/60});
 const scale=shape.scale.clone(),pitch=body.rotation.x;
 duck.animate({...pose,time:181/60,speed:.1});
 assert.ok(shape.scale.distanceTo(scale)<.01);
 assert.ok(Math.abs(body.rotation.x-pitch)<.01);
});
test('individual helicopter reactions are staggered and smoothly released',()=>{
 const birds=[new DuckAlert(),new DuckAlert(),new DuckAlert(),new DuckAlert()];let values:number[]=[];
 for(let i=0;i<20;i++)values=birds.map((bird,j)=>bird.update(true,i/60,1/60,j));
 assert.ok(values[0]>0&&values[3]===0);
 for(let i=20;i<180;i++)values=birds.map((bird,j)=>bird.update(true,i/60,1/60,j));
 assert.ok(values.every(v=>v>.9));
 const release=birds[0].update(false,3,1/60,0);assert.ok(release>0&&release<values[0]);
});
