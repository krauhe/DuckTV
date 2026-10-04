import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { CameraFollow, FOLLOW_CAMERA } from '../src/camera-follow';
import { constrainGardenCamera } from '../src/camera-bounds';
import { GARDEN } from '../src/types';

test('follow starts after idle time and immediately yields to manual input, including a held drag',()=>{
 const follow=new CameraFollow(),camera=new PerspectiveCamera(),target=new Vector3(0,.65,0);
 camera.position.set(0,1.65,3.8);const ducks=[{x:2,z:0}];
 follow.manual(0);
 assert.equal(follow.update(.05,19,camera,target,ducks),false);
 assert.equal(follow.update(.05,21,camera,target,ducks),true);
 follow.manual(22,true);const before=camera.position.clone(),look=target.clone();
 assert.equal(follow.update(.05,80,camera,target,ducks),false);
 assert.deepEqual(camera.position,before);assert.deepEqual(target,look);
 follow.manual(81);
 assert.equal(follow.update(.05,100,camera,target,ducks),false);
 assert.equal(follow.update(.05,102,camera,target,ducks),true);
});

test('automatic following stays slow, inside the hedge and clear of every duck',()=>{
 const follow=new CameraFollow(),camera=new PerspectiveCamera(),target=new Vector3(0,.65,0);
 camera.position.set(0,1.65,3.8);const start=camera.position.clone();
 for(let i=0;i<2400;i++){
  const x=Math.sin(i/500)*2;
  const ducks=[{x,z:0},{x:x-.5,z:.35},{x:x+.5,z:-.4},{x:x-.8,z:-.6}];
  const before=camera.position.clone();
  const distances=ducks.map(d=>Math.hypot(before.x-d.x,before.z-d.z));
  follow.update(.025,21+i*.025,camera,target,ducks);constrainGardenCamera(camera,target);
  assert.ok(camera.position.distanceTo(before)<=FOLLOW_CAMERA.speed*.025+1e-8);
  ducks.forEach((d,j)=>assert.ok(Math.hypot(camera.position.x-d.x,camera.position.z-d.z)>=Math.min(distances[j],FOLLOW_CAMERA.clearance)-1e-8));
  assert.ok(camera.position.x>GARDEN.minX&&camera.position.x<GARDEN.maxX);
  assert.ok(camera.position.z>GARDEN.minZ&&camera.position.z<GARDEN.maxZ);
 }
 assert.ok(camera.position.distanceTo(start)>.3,'camera actually follows the moving flock');
});


test('untouched screens start following immediately, including after losing focus',()=>{
 const follow=new CameraFollow(),camera=new PerspectiveCamera(),target=new Vector3(0,.65,0);
 camera.position.set(0,1.65,3.8);const ducks=[{x:2,z:0}];
 follow.release(0);
 assert.equal(follow.update(.025,.025,camera,target,ducks),true);
 follow.manual(1,true);follow.release(2);
 assert.equal(follow.update(.025,3,camera,target,ducks),false);
 assert.equal(follow.update(.025,23,camera,target,ducks),true);
});
