import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createDuck } from '../src/duck-model.ts';
import type { DuckKind, DuckPose } from '../src/types.ts';

test('knee and hock articulate while leg segment lengths stay fixed through walking and turns',()=>{
 for(const speed of [.23,.82,1.65]){
  const model=createDuck('buff');let kneeMin=Infinity,kneeMax=-Infinity;
  for(let i=1;i<=600;i++){
   const heading=Math.sin(i/100)*.8;
   model.group.rotation.y=heading;
   model.group.position.x+=Math.sin(heading)*speed/60;
   model.group.position.z+=Math.cos(heading)*speed/60;
   model.animate({state:speed>1?'chase':'wander',speed,time:i/60,upright:1,look:0,peck:0,headTilt:0,displayDip:0});
   for(const side of ['left','right']){
    const knee=model.group.getObjectByName(`duck-${side}-knee`)!;
    const hock=model.group.getObjectByName(`duck-${side}-hock`)!;
    const foot=model.group.getObjectByName(`duck-${side}-foot`)!;
    model.group.updateMatrixWorld(true);
    if(foot.getWorldPosition(new THREE.Vector3()).y<.0033){
     const thighDirection=knee.position.clone().normalize();
     const shinDirection=hock.position.clone().sub(knee.position).normalize();
     assert.ok(thighDirection.dot(shinDirection)>.99,'support knee stays nearly extended');
    }
    kneeMin=Math.min(kneeMin,knee.position.z);kneeMax=Math.max(kneeMax,knee.position.z);
    for(const [bone,length] of [['thigh',.11],['shin',.25],['tarsus',.17]] as const){
     assert.ok(Math.abs(model.group.getObjectByName(`duck-${side}-${bone}`)!.scale.y-length)<1e-6,'bones bend without stretching');
    }
   }
  }
  assert.ok(kneeMax-kneeMin>.01,'knee flexes during the swing');
 }
});

test('legs stay attached inside the body through posture changes while resting feet stay grounded', () => {
 const model=createDuck('buff');
 const body=model.group.getObjectByName('duck-body-shape')!;
 const legs=['duck-left-leg','duck-right-leg'].map(name=>model.group.getObjectByName(name)!);
 const feet=['duck-left-foot','duck-right-foot'].map(name=>model.group.getObjectByName(name)!);
 const pose:DuckPose={state:'rest',speed:0,time:0,look:0,peck:0,upright:1,headTilt:0,displayDip:0};
 const anchor=new THREE.Vector3(), foot=new THREE.Vector3();
 for(let i=1;i<=480;i++){
  const moving=i>360;
  model.animate({...pose,time:i/60,upright:i<120||i>240?1:0,state:moving?'wander':'rest',speed:moving?1.2:0,accelerationSide:moving?1:0});
  model.group.updateMatrixWorld(true);
  legs.forEach((leg,index)=>{
   body.worldToLocal(leg.getWorldPosition(anchor));
   assert.ok(anchor.distanceTo(new THREE.Vector3(index===0?-.112:.112,-.015,-.055))<.08,'leg root remains inside the feathers while accommodating a straight support leg');
   feet[index].getWorldPosition(foot);
   assert.ok(foot.y>=.0031,'feet do not penetrate the ground');
   if(!moving)assert.ok(Math.abs(foot.y-.0032)<1e-6,'resting feet stay on the ground as the body changes height');
  });
 }
});

test('acceleration bends the body and neck gradually and settles after the force ends',()=>{
 const model=createDuck('buff'),body=model.group.getObjectByName('duck-torso')!;
 const head=model.group.getObjectByName('duck-head')!;
 const pose:DuckPose={state:'guard',speed:0,time:0,look:0,peck:0,upright:1,headTilt:0,displayDip:0};
 model.animate(pose);const baseline=body.rotation.x;
 model.animate({...pose,time:1/60,accelerationForward:1.5});
 const first=body.rotation.x-baseline;
 assert.ok(first>0&&first<.03,'elastic response starts gradually');
 for(let i=2;i<=60;i++)model.animate({...pose,time:i/60,accelerationForward:1.5});
 assert.ok(body.rotation.x-baseline>.06);
 for(let i=61;i<=300;i++)model.animate({...pose,time:i/60});
 assert.ok(Math.abs(body.rotation.x-baseline)<.0001);
 model.group.updateMatrixWorld(true);
 const scale=head.getWorldScale(new THREE.Vector3());
 assert.ok(Math.abs(scale.x-.8)<.0001&&Math.abs(scale.y-.8)<.0001);
});

test('head stays upright throughout falling asleep and waking, not only at the final pose',()=>{
 for(const kind of ['drake','buff','brown','pied'] as DuckKind[]){
  const model=createDuck(kind);
  model.group.rotation.y=1.2;
  const head=model.group.getObjectByName('duck-head')!;
  for(let i=1;i<=360;i++){
   model.animate({state:i<=180?'sleep':'rest',speed:0,time:i/60,look:0,peck:0,upright:i<=180?0:1,headTilt:0,displayDip:0});
   model.group.updateMatrixWorld(true);
   const rotation=head.getWorldQuaternion(new THREE.Quaternion());
   const up=new THREE.Vector3(0,1,0).applyQuaternion(rotation);
   const bill=new THREE.Vector3(0,0,1).applyQuaternion(rotation);
   assert.ok(up.y>.96,`${kind}: crown tips over at frame ${i}`);
   assert.ok(Math.abs(bill.y)<.25,`${kind}: bill tilts vertically at frame ${i}`);
  }
 }
});

test('preening before sleep keeps head height steady instead of rhythmically nodding',()=>{
 for(const kind of ['drake','buff','brown','pied'] as DuckKind[]){
  const model=createDuck(kind),head=model.group.getObjectByName('duck-head')!;
  let minY=Infinity,maxY=-Infinity,minPitch=Infinity,maxPitch=-Infinity;
  for(let i=1;i<=600;i++){
   model.animate({state:'preen',time:i/60,speed:0,upright:0,look:0,peck:0,headTilt:0,displayDip:0});
   model.group.updateMatrixWorld(true);if(i<300)continue;
   const y=head.getWorldPosition(new THREE.Vector3()).y;
   const billY=new THREE.Vector3(0,0,1).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion())).y;
   minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   minPitch=Math.min(minPitch,billY);maxPitch=Math.max(maxPitch,billY);
  }
  assert.ok(maxY-minY<.0001,`${kind}: pre-sleep grooming bobs vertically`);
  assert.ok(maxPitch-minPitch<.0001,`${kind}: bill repeatedly nods before sleep`);
 }
});

test('preening before sleep never tips the crown backwards during the transition',()=>{
 for(const kind of ['drake','buff','brown','pied'] as DuckKind[]){
  const model=createDuck(kind),head=model.group.getObjectByName('duck-head')!;
  const pose:DuckPose={state:'preen',speed:0,time:0,look:0,peck:0,upright:0,headTilt:0,displayDip:0};
  for(let i=1;i<=480;i++){
   model.animate({...pose,time:i/60,state:i<240?'preen':'sleep'});
   model.group.updateMatrixWorld(true);
   const up=new THREE.Vector3(0,1,0).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));
   assert.ok(up.y>.9,`${kind}: head tips over from grooming at ${i}`);
   if(i>270)assert.ok(up.y>.99,'sleep settles with crown upright');
  }
 }
});

test('sleep folds the feet and tucks the head back, then releases the pose when walking',()=>{
 for(const kind of ['drake','buff','brown','pied'] as DuckKind[]){
 const model=createDuck(kind);
 const head=model.group.getObjectByName('duck-head')!;
 const leg=model.group.getObjectByName('duck-left-leg')!;
 const pose:DuckPose={state:'sleep',speed:0,time:0,look:0,peck:0,upright:0,headTilt:0,displayDip:0};
 for(let i=1;i<=180;i++)model.animate({...pose,time:i/60});
 model.group.updateMatrixWorld(true);
 const point=head.getWorldPosition(new THREE.Vector3());
 assert.ok(point.z<-.15,'head rests towards the back of the body');
 assert.ok(point.y<.55,'sleeping head stays low');
 const rotation=head.getWorldQuaternion(new THREE.Quaternion());
 const billDirection=new THREE.Vector3(0,0,1).applyQuaternion(rotation);
 const headUp=new THREE.Vector3(0,1,0).applyQuaternion(rotation);
 assert.ok(Math.abs(billDirection.y)<.02 && billDirection.z<-.9,'sleeping bill points level towards the wing');
 assert.ok(headUp.y>.98,'head stays upright despite the folded neck');
 assert.equal(leg.visible,false);
 for(let i=181;i<=360;i++)model.animate({...pose,time:i/60,state:'wander',speed:.5,upright:1});
 model.group.updateMatrixWorld(true);
 assert.equal(leg.visible,true);
 assert.ok(head.getWorldPosition(new THREE.Vector3()).y>.85);
 }
});

test('sleep settles with a motionless head supported on the back',()=>{
 for(const kind of ['drake','buff','brown','pied'] as DuckKind[]){
  const model=createDuck(kind),head=model.group.getObjectByName('duck-head')!,torso=model.group.getObjectByName('duck-torso')!;
  let reference:THREE.Vector3|undefined;
  for(let i=1;i<=600;i++){
   model.animate({state:i<120?'preen':'sleep',time:i/60,speed:0,upright:0,look:0,peck:0,headTilt:0,displayDip:0});
   model.group.updateMatrixWorld(true);
   if(i<420)continue;
   const point=head.getWorldPosition(new THREE.Vector3());reference??=point.clone();
   assert.ok(point.distanceTo(reference)<1e-6,'sleep has no periodic head bob');
   const local=torso.worldToLocal(point.clone());
   assert.ok(Math.abs(local.y-.16)<1e-6&&Math.abs(local.z+.25)<1e-6,'head is placed down on the back');
  }
 }
});

test('walking keeps the head steady while the body sways and the attached neck flexes', () => {
  for (const kind of ['drake', 'buff', 'brown', 'pied'] as DuckKind[]) {
    for (const upright of [0, 1]) {
      const model = createDuck(kind);
      const head = model.group.getObjectByName('duck-head')!;
      const body = model.group.getObjectByName('duck-torso')!;
      const neck = model.group.getObjectByName('duck-neck')!;
      const pose: DuckPose = { speed: .65, time: 0, state: 'wander', look: .15, peck: 0, upright, headTilt: .2, displayDip: 0 };
      const position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
      const firstPosition = new THREE.Vector3(), firstRotation = new THREE.Quaternion();
      let bodyMin = Infinity, bodyMax = -Infinity, neckMin = Infinity, neckMax = -Infinity;
      for (let i = 0; i < 720; i++) {
        pose.time = i / 60;
        model.group.position.z = pose.time * pose.speed;
        model.animate(pose);
        model.group.updateMatrixWorld(true);
        if (i < 480) continue; // Let the chosen posture settle before measuring steps.
        head.getWorldPosition(position).sub(model.group.position);
        head.getWorldQuaternion(rotation);
        head.getWorldScale(scale);
        if (i === 480) { firstPosition.copy(position); firstRotation.copy(rotation); }
        assert.ok(position.distanceTo(firstPosition) < 0.00001, `${kind}: head bobs in ${upright} posture`);
        assert.ok(rotation.angleTo(firstRotation) < 0.00001, `${kind}: head rotates with footfalls`);
        assert.ok(Math.abs(scale.x - .8) < 0.00001, 'neck spring must not resize the head');
        bodyMin = Math.min(bodyMin, body.position.y); bodyMax = Math.max(bodyMax, body.position.y);
        neckMin = Math.min(neckMin, neck.scale.y); neckMax = Math.max(neckMax, neck.scale.y);
      }
      assert.ok(bodyMax - bodyMin > .025, 'body still moves with the feet');
      assert.ok(neckMax - neckMin > .02, 'neck absorbs the body movement');
      model.animate({ ...pose, time: pose.time + .016, speed: 0, state: 'rest' });
      assert.equal(neck.scale.y, 1, 'stopping clears the walking compensation');
      assert.equal(head.scale.y, 1);
    }
  }
});

test('swimming neck absorbs world-space bobbing while the head keeps its size and gaze',()=>{
 for(const kind of ['drake','buff','brown','pied'] as DuckKind[]){
  const floating=createDuck(kind),still=createDuck(kind);
  const point=new THREE.Vector3(),reference=new THREE.Vector3(),scale=new THREE.Vector3();
  for(let i=0;i<480;i++){
   const bob=.018*Math.sin(i/60*5);
   const pose:DuckPose={state:'swim',speed:.3,time:i/60,upright:0,look:.2,peck:0,headTilt:0,displayDip:0};
   floating.group.position.y=.27+bob;still.group.position.y=.27;
   floating.animate({...pose,waterBob:bob});still.animate(pose);
   floating.group.updateMatrixWorld(true);still.group.updateMatrixWorld(true);
   if(i<180)continue;
   const head=floating.group.getObjectByName('duck-head')!;
   const other=still.group.getObjectByName('duck-head')!;
   head.getWorldPosition(point);other.getWorldPosition(reference);
   assert.ok(Math.abs(point.y-reference.y)<.0012,'head absorbs at least 93% of water bob');
   assert.ok(head.getWorldQuaternion(new THREE.Quaternion()).angleTo(other.getWorldQuaternion(new THREE.Quaternion()))<1e-5);
   assert.ok(Math.abs(head.getWorldScale(scale).y-.8)<1e-5);
   const torso=floating.group.getObjectByName('duck-torso')!;
   const flatTorso=still.group.getObjectByName('duck-torso')!;
   assert.ok(Math.abs(torso.getWorldPosition(point).y-flatTorso.getWorldPosition(reference).y-bob)<1e-6,'body still follows water');
  }
  floating.animate({state:'exit',time:8.1,speed:0,upright:1,look:0,peck:0,headTilt:0,displayDip:0,waterBob:.018});
  assert.equal(floating.group.getObjectByName('duck-neck')!.scale.y,1,'no water compensation during exit jump');
 }
});

test('floating body visibly rocks while the head stays steady and neck skin bends',()=>{
 const model=createDuck('buff');const head=model.group.getObjectByName('duck-head')!;
 const torso=model.group.getObjectByName('duck-torso')!;
 const skin=model.group.getObjectByName('duck-recorded-neck') as THREE.Mesh;
 let first:THREE.Vector3|undefined,minPitch=Infinity,maxPitch=-Infinity,minY=Infinity,maxY=-Infinity;
 for(let i=0;i<600;i++){
  const time=i/60,bob=.026*Math.sin(time*2.8);model.group.position.y=.27+bob;
  model.animate({state:'swim',time,speed:0,upright:0,look:0,peck:0,headTilt:0,displayDip:0,waterBob:bob});
  model.group.updateMatrixWorld(true);if(i<300)continue;
  const p=head.getWorldPosition(new THREE.Vector3());first??=p.clone();
  assert.ok(p.distanceTo(first)<.0033,'head does not ride the rocking body');
  assert.ok(skin.visible,'curved skin is used while floating');
  minPitch=Math.min(minPitch,torso.rotation.x);maxPitch=Math.max(maxPitch,torso.rotation.x);
  const y=torso.getWorldPosition(new THREE.Vector3()).y;minY=Math.min(minY,y);maxY=Math.max(maxY,y);
 }
 assert.ok(maxPitch-minPitch>.08,'body pitches visibly');
 assert.ok(maxY-minY>.05,'body follows the vertical water displacement');
});

test('swimming keeps alternating paddles visible below water and the body partly submerged',()=>{
 const model=createDuck('buff');model.group.position.y=.27;
 const feet=['left','right'].map(side=>model.group.getObjectByName(`duck-${side}-foot`)!);
 let min=Infinity,max=-Infinity;
 for(let i=1;i<=480;i++){
  model.animate({state:'swim',time:i/60,speed:.3,upright:0,look:0,peck:0,headTilt:0,displayDip:0});
  if(i<240)continue;model.group.updateMatrixWorld(true);
  for(const foot of feet){
   assert.ok(foot.parent!.visible,'paddling legs must not be hidden');
   const p=foot.getWorldPosition(new THREE.Vector3());
   assert.ok(p.y<.27&&p.y>.064,'ankle remains in the water above the pool floor');
  }
  min=Math.min(min,feet[0].position.z);max=Math.max(max,feet[0].position.z);
  assert.ok(Math.abs(feet[0].position.z+feet[1].position.z+.05)<1e-5,'paddles alternate');
 }
 assert.ok(max-min>.19,'feet make a real backwards and forwards stroke');
 const torso=model.group.getObjectByName('duck-torso')!;
 assert.ok(torso.getWorldPosition(new THREE.Vector3()).y<.42,'body sits lower in water');
});

test('head stabilization preserves deliberate feeding and courtship bows', () => {
  const model = createDuck('drake');
  const head = model.group.getObjectByName('duck-head')!;
  const pose: DuckPose = { speed: 0, time: 0, state: 'guard', look: 0, peck: 0, upright: 1, headTilt: 0, displayDip: 0 };
  const point = new THREE.Vector3();
  const height = () => { model.group.updateMatrixWorld(true); return head.getWorldPosition(point).y; };
  model.animate(pose); const standing = height();
  model.animate({ ...pose, time: .016, state: 'eat', peck: 1 });
  assert.ok(standing-height()<.04,'a new feeding dip must not snap down in one frame');
  for(let i=2;i<=60;i++)model.animate({...pose,time:i/60,state:'eat',peck:1});
  assert.ok(standing - height() > .5, 'feeding still reaches downward');
  const feeding=height();
  model.animate({...pose,time:61/60});
  assert.ok(Math.abs(height()-feeding)<.04,'ending a dip must not snap upright');
  for (let i = 62; i < 240; i++) model.animate({ ...pose, time: i / 60, displayDip: 1 });
  assert.ok(standing - height() > .1, 'courtship bow remains visible');
});
