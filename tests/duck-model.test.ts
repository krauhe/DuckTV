import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createDuck } from '../src/duck-model.ts';
import type { DuckKind, DuckPose } from '../src/types.ts';

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
 assert.ok(head.getWorldPosition(new THREE.Vector3()).y>.9);
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

test('head stabilization preserves deliberate feeding and courtship bows', () => {
  const model = createDuck('drake');
  const head = model.group.getObjectByName('duck-head')!;
  const pose: DuckPose = { speed: 0, time: 0, state: 'guard', look: 0, peck: 0, upright: 1, headTilt: 0, displayDip: 0 };
  const point = new THREE.Vector3();
  const height = () => { model.group.updateMatrixWorld(true); return head.getWorldPosition(point).y; };
  model.animate(pose); const standing = height();
  model.animate({ ...pose, time: .016, state: 'eat', peck: 1 });
  assert.ok(standing - height() > .5, 'feeding still reaches downward');
  for (let i = 1; i < 120; i++) model.animate({ ...pose, time: i / 60, displayDip: 1 });
  assert.ok(standing - height() > .1, 'courtship bow remains visible');
});
