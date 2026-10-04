import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {createDuck} from '../src/duck-model';
import type {DuckPose} from '../src/types';

test('a glance turns the head before the neck without rotating the body',()=>{
 const model=createDuck('buff'),head=model.group.getObjectByName('duck-head')!;
 const neck=model.group.getObjectByName('duck-neck')!,torso=model.group.getObjectByName('duck-torso')!;
 const pose:DuckPose={state:'rest',time:0,speed:0,upright:1,look:0,peck:0,headTilt:0,displayDip:0};
 for(let i=1;i<=120;i++)model.animate({...pose,time:i/60});
 const body=torso.quaternion.clone();
 model.animate({...pose,time:121/60,look:1});
 assert.ok(head.rotation.y>neck.rotation.y*3,'skull leads the slower neck');
 assert.ok(head.rotation.y<.2,'look change is eased rather than snapping');
 for(let i=122;i<=240;i++)model.animate({...pose,time:i/60,look:1});
 assert.ok(head.rotation.y>.7,'head can turn substantially relative to the neck');
 assert.ok(torso.quaternion.angleTo(body)<1e-6,'looking does not rotate the torso');
 assert.ok(Math.abs(model.group.rotation.y)<1e-6);
});

test('chase joins the neck to the back of a forward-facing skull and eases back to standing',()=>{
 const model=createDuck('buff'),head=model.group.getObjectByName('duck-head')!;
 const torso=model.group.getObjectByName('duck-torso')!;
 const skin=model.group.getObjectByName('duck-recorded-neck') as THREE.Mesh;
 for(let i=1;i<=240;i++)model.animate({state:'chase',time:i/60,speed:1.2,upright:0,look:0,peck:0,headTilt:0,displayDip:0});
 model.group.updateMatrixWorld(true);
 const p=skin.geometry.getAttribute('position');
 const end=new THREE.Vector3().fromBufferAttribute(p,32*17).add(new THREE.Vector3().fromBufferAttribute(p,32*17+8)).multiplyScalar(.5);
 const back=torso.worldToLocal(head.localToWorld(new THREE.Vector3(0,.073,-.030)));
 assert.ok(end.distanceTo(back)<1e-5,'neck meets the rear of the skull');
 const direction=new THREE.Vector3(0,0,1).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));
 assert.ok(direction.z>.98&&Math.abs(direction.y)<.1,'bill points forward rather than up');
 const before=head.getWorldPosition(new THREE.Vector3());
 model.animate({state:'rest',time:241/60,speed:0,upright:1,look:0,peck:0,headTilt:0,displayDip:0});
 model.group.updateMatrixWorld(true);
 assert.ok(head.getWorldPosition(new THREE.Vector3()).distanceTo(before)<.1,'leaving chase does not snap upright');
});

test('continuous neck keeps its root inside the breast and carries the pied throat pigment through bows',()=>{
 const model=createDuck('pied');
 const skin=model.group.getObjectByName('duck-recorded-neck') as THREE.Mesh;
 const torso=model.group.getObjectByName('duck-torso')!;
 const head=model.group.getObjectByName('duck-head')!;
 const patch=new THREE.Color('#c48668');
 const colors=skin.geometry.getAttribute('color');
 let hasPatch=false;
 for(let i=0;i<colors.count;i++)if(Math.abs(colors.getX(i)-patch.r)+Math.abs(colors.getY(i)-patch.g)+Math.abs(colors.getZ(i)-patch.b)<.001)hasPatch=true;
 assert.ok(hasPatch,'pigment is painted into the deforming skin');
 let time=0;
 for(const state of ['rest','eat','swim','preen','sleep'] as const){
  for(let i=0;i<180;i++){
   time+=1/60;
   model.animate({state,time,speed:0,upright:state==='rest'?1:0,look:.4,headTilt:.2,displayDip:0,peck:state==='eat'?1:0} satisfies DuckPose);
  }
  model.group.updateMatrixWorld(true);
  assert.ok(skin.visible);
  const p=skin.geometry.getAttribute('position');
  const center=(ring:number)=>new THREE.Vector3().fromBufferAttribute(p,ring*17).add(new THREE.Vector3().fromBufferAttribute(p,ring*17+8)).multiplyScalar(.5);
  assert.ok(center(0).distanceTo(new THREE.Vector3(0,.08,.065))<1e-6,'root does not rotate out of the back');
  const target=torso.worldToLocal(head.localToWorld(new THREE.Vector3(0,.065,.005)));
  assert.ok(center(32).distanceTo(target)<1e-6,'skin reaches the stabilized head');
  for(const v of p.array)assert.ok(Number.isFinite(v));
 }
});


test('neck terminal ring stays enclosed by the actual skull through turns and activity transitions',()=>{
 for(const kind of ['drake','buff','brown','pied'] as const){
  const model=createDuck(kind);
  const skin=model.group.getObjectByName('duck-recorded-neck') as THREE.Mesh;
  const skull=model.group.getObjectByName('duck-skull') as THREE.Mesh;
  const original=skull.material;
  skull.material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const ray=new THREE.Raycaster();let time=0;
  for(const state of ['rest','eat','chase','swim','preen','sleep','rest'] as const){
   for(let frame=0;frame<90;frame++){
    time+=1/60;
    model.animate({state,time,speed:state==='chase'?1.2:state==='swim'?.3:0,
     upright:state==='rest'?1:0,look:Math.sin(time*3)*1.15,peck:state==='eat'?1:0,
     headTilt:Math.sin(time*4)*.48,displayDip:state==='rest'?.7:0});
    model.group.updateMatrixWorld(true);
    const center=skull.localToWorld(new THREE.Vector3());
    const positions=skin.geometry.getAttribute('position');
    for(let j=0;j<16;j++){
     const point=skin.localToWorld(new THREE.Vector3().fromBufferAttribute(positions,32*17+j));
     const distance=center.distanceTo(point);
     ray.set(center,point.clone().sub(center).normalize());
     const hits=ray.intersectObject(skull,false);
     assert.ok(hits.length && hits[0].distance>distance+0.002,`${kind} ${state}: skin rim must overlap inside skull`);
    }
   }
  }
  (skull.material as THREE.Material).dispose();skull.material=original;
 }
});


test('feeding holds the bill at the grass with an independently downward-facing head',()=>{
 for(const kind of ['drake','buff','brown','pied'] as const){
  const model=createDuck(kind);model.group.position.set(1,.12,2);model.group.rotation.y=.7;
  const head=model.group.getObjectByName('duck-head')!;
  for(let i=1;i<=240;i++){
   model.animate({state:'forage',time:i/60,speed:0,upright:0,look:0,peck:.7+.15*Math.sin(i/20),headTilt:0,displayDip:0,groundHeight:()=>.12});
   if(i<180)continue;
   model.group.updateMatrixWorld(true);
   const tip=head.localToWorld(new THREE.Vector3(0,.036,.30));
   assert.ok(tip.y>=.095 && tip.y<.135,`bill must reach grass: ${tip.y}`);
   const forward=new THREE.Vector3(0,0,1).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));
   assert.ok(forward.y<-.7 && forward.y>-.9,'bill aims down without tumbling over with the neck');
  }
 }
});
