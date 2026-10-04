import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { constrainGardenCamera, CAMERA_HEIGHT, CAMERA_SHELTER } from '../src/camera-bounds';
import { GARDEN } from '../src/types';

test('camera stays inside the hedge and below its top after extreme orbit, pan and zoom',()=>{
 const camera=new PerspectiveCamera();
 for(const x of [-100,0,100])for(const z of [-100,0,100])for(const y of [-20,1.5,40]){
  camera.position.set(x,y,z);
  const target=new Vector3(x*.5,y*.5,z*.5);
  constrainGardenCamera(camera,target);
  assert.ok(camera.position.x>GARDEN.minX&&camera.position.x<GARDEN.maxX);
  assert.ok(camera.position.z>GARDEN.minZ&&camera.position.z<GARDEN.maxZ);
  assert.ok(camera.position.y>=CAMERA_HEIGHT.min&&camera.position.y<=CAMERA_HEIGHT.max);
  assert.ok(camera.quaternion.toArray().every(Number.isFinite));
  const position=camera.position.clone();
  constrainGardenCamera(camera,target);
  assert.ok(position.distanceTo(camera.position)<1e-10);
 }
});

test('camera cannot pan through the shelter and slides along its front',()=>{
 const camera=new PerspectiveCamera(),target=new Vector3(-3,.65,-2.5),b=CAMERA_SHELTER;
 for(const height of [.65,1.2,1.65]){
  const previous=new Vector3(-3.8,height,-1.2);
  camera.position.set(-3.2,height,-3.5);
  constrainGardenCamera(camera,target,previous);
  assert.ok(camera.position.z>b.maxZ,'swept movement stops before the front/roof');
  assert.ok(Math.abs(camera.position.x+3.2)<1e-9,'tangential pan remains possible');
 }
 const previous=new Vector3(-1.5,1.2,-2.6);
 camera.position.set(-4.8,1.2,-2.6);constrainGardenCamera(camera,target,previous);
 assert.ok(camera.position.x>b.maxX,'large lateral drag stops before the side');
});

test('invalid camera inside the shelter recovers without crossing the hedge',()=>{
 const camera=new PerspectiveCamera(),target=new Vector3(-3.7,.65,-2.7);
 camera.position.set(-4.8,1.5,-3.5);constrainGardenCamera(camera,target);
 const b=CAMERA_SHELTER;
 assert.ok(camera.position.x>=b.maxX||camera.position.z>=b.maxZ);
 const before=camera.position.clone();constrainGardenCamera(camera,target);
 assert.ok(before.distanceTo(camera.position)<1e-9,'recovery is stable');
});

test('ordinary camera movement inside the garden is preserved',()=>{
 const camera=new PerspectiveCamera();camera.position.set(1,1.4,3);
 const target=new Vector3(.1,.65,-.3),before=camera.position.clone();
 constrainGardenCamera(camera,target);
 assert.deepEqual(camera.position,before);
 assert.deepEqual(target,new Vector3(.1,.65,-.3));
});
