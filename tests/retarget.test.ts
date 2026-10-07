import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createDuck} from '../src/duck-model.ts';
import {retargetFeet} from '../src/training/retarget.ts';

test('recorded feet drive garden IK independently of the procedural gait',()=>{
 const model=createDuck('buff');model.group.rotation.y=Math.PI/2;
 for(let i=0;i<120;i++){
  const frame=Array.from({length:14},()=>[0,0]);
  frame[0]=[i*.004,.53];
  frame[6]=[frame[0][0]+.07*Math.sin(i*.1),.065+Math.max(0,Math.sin(i*.1))*.06];
  frame[9]=[frame[0][0]-.07*Math.sin(i*.1),.065+Math.max(0,-Math.sin(i*.1))*.06];
  const mapped=retargetFeet(frame);model.group.position.set(mapped.body.pelvis.x,mapped.rootY,0);
  model.animate({state:'wander',speed:0,time:i/60,look:0,peck:0,upright:1,headTilt:0,displayDip:0,recordedFeet:mapped.feet});
  model.group.updateMatrixWorld(true);
  ['left','right'].forEach((side,index)=>{
   const actual=model.group.getObjectByName(`duck-${side}-foot`)!.getWorldPosition(new THREE.Vector3());
   assert.ok(actual.distanceTo(new THREE.Vector3().copy(mapped.feet[index].position))<1e-6);
   for(const [bone,length] of [['thigh',.11],['shin',.25],['tarsus',.17]] as const)
    assert.ok(Math.abs(model.group.getObjectByName(`duck-${side}-${bone}`)!.scale.y-length)<1e-6);
  });
 }
});

test('a planted foot does not follow a swaying pelvis in replay coordinates',()=>{
 const frame=Array.from({length:14},()=>[0,.025]);
 frame[0]=[0,.53];frame[1]=[.05,.87];frame[3]=[.08,1.4];
 frame[6]=frame[9]=[.08,.065];
 const before=retargetFeet(frame);frame[0]=[.03,.53];const after=retargetFeet(frame);
 assert.deepEqual(after.feet,before.feet,'world-space support feet stay planted despite pelvis sway');
 assert.ok(Math.abs(after.body.pelvis.x-before.body.pelvis.x-.024)<1e-9);
});

test('bow skin bends without squeezing its cross-section and releases after replay',()=>{
 const data=JSON.parse(readFileSync(new URL('../public/training/result.json',import.meta.url),'utf8'));
 const clip=data.skills.find((s:{name:string})=>s.name==='Rytmiske duk');assert.ok(clip);
 const model=createDuck('buff');model.group.rotation.y=Math.PI/2;
 const skin=model.group.getObjectByName('duck-recorded-neck') as THREE.Mesh;
 const pose={state:'wander' as const,speed:0,time:0,look:0,peck:0,upright:1,headTilt:0,displayDip:0};
 const neutral=skin.geometry.getAttribute('position');
 const diameters=Array.from({length:33},(_,ring)=>new THREE.Vector3().fromBufferAttribute(neutral,ring*17)
  .distanceTo(new THREE.Vector3().fromBufferAttribute(neutral,ring*17+8)));
 let greatestBend=0;
 for(let i=0;i<clip.frames.length;i+=3){
  const mapped=retargetFeet(clip.frames[i]);
  model.animate({...pose,time:i/30,recordedBody:mapped.body,recordedFeet:mapped.feet});
  assert.ok(skin.visible);
  const vertices=skin.geometry.getAttribute('position');let previous:THREE.Vector3|undefined,path=0;
  const centres:THREE.Vector3[]=[];
  for(let ring=0;ring<=32;ring++){
   const a=new THREE.Vector3().fromBufferAttribute(vertices,ring*17),b=new THREE.Vector3().fromBufferAttribute(vertices,ring*17+8);
   assert.ok([...a,...b].every(Number.isFinite));
   assert.ok(Math.abs(a.distanceTo(b)-diameters[ring])<1e-6,'feather thickness survives the bow');
   const centre=a.add(b).multiplyScalar(.5);centres.push(centre);
   if(previous)path+=previous.distanceTo(centre);previous=centre;
  }
  greatestBend=Math.max(greatestBend,path-centres[0].distanceTo(centres[32]));
  model.group.updateMatrixWorld(true);
  const end=skin.localToWorld(centres[32]);
  const attachment=model.group.getObjectByName('duck-head')!.localToWorld(new THREE.Vector3(0,.065,.005));
  assert.ok(end.distanceTo(attachment)<1e-6,'skin overlaps inside the head rather than ending at its pivot');
 }
 assert.ok(greatestBend>.08,'deep bows retain a curved neck rather than a shortened straight tube');
 model.animate({...pose,time:31});assert.equal(skin.visible,true,'land gait uses the same flexible skin after replay');
});

test('saved walking clip transfers pelvis, lean and head without hiding their motion',()=>{
 const data=JSON.parse(readFileSync(new URL('../public/training/result.json',import.meta.url),'utf8'));
 const clip=data.skills.find((s:{name:string})=>s.name==='Gangforsøg');assert.ok(clip);
 const model=createDuck('buff');model.group.rotation.y=Math.PI/2;
 for(let i=0;i<clip.frames.length;i+=3){
  const mapped=retargetFeet(clip.frames[i]);
  model.animate({state:'wander',speed:0,time:i/clip.fps,look:0,peck:0,upright:1,headTilt:0,displayDip:0,recordedFeet:mapped.feet,recordedBody:mapped.body});
  model.group.updateMatrixWorld(true);
  const left=model.group.getObjectByName('duck-left-leg')!.getWorldPosition(new THREE.Vector3());
  const right=model.group.getObjectByName('duck-right-leg')!.getWorldPosition(new THREE.Vector3());
  assert.ok(left.add(right).multiplyScalar(.5).distanceTo(new THREE.Vector3().copy(mapped.body.pelvis))<1e-6,'hip centre follows recorded pelvis');
  const head=model.group.getObjectByName('duck-head')!;
  assert.ok(head.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3().copy(mapped.body.head))<1e-6,'head target survives body lean');
  const up=new THREE.Vector3(0,1,0).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(up.y>.99999,'head stays upright');
  assert.ok(Math.abs(model.group.getObjectByName('duck-torso')!.rotation.x-mapped.body.pitch)<1e-6);
  for(const side of ['left','right'])for(const [bone,length] of [['thigh',.11],['shin',.25],['tarsus',.17]] as const)
   assert.ok(Math.abs(model.group.getObjectByName(`duck-${side}-${bone}`)!.scale.y-length)<1e-6,`recorded frame ${i}: ${side} ${bone} must not stretch`);
 }
});
