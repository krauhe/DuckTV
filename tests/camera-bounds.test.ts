import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { constrainGardenCamera, CAMERA_HEIGHT } from '../src/camera-bounds';
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

test('ordinary camera movement inside the garden is preserved',()=>{
 const camera=new PerspectiveCamera();camera.position.set(1,1.4,3);
 const target=new Vector3(.1,.65,-.3),before=camera.position.clone();
 constrainGardenCamera(camera,target);
 assert.deepEqual(camera.position,before);
 assert.deepEqual(target,new Vector3(.1,.65,-.3));
});
