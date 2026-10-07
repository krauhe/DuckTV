import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { CameraFollow, FOLLOW_CAMERA } from '../src/camera-follow';
import { constrainGardenCamera } from '../src/camera-bounds';
import { GARDEN } from '../src/types';

test('a new offscreen fly widens the view before the duck reaches it, holds and gently restores zoom',()=>{
 for(const aspect of [16/9,9/16]){
  const follow=new CameraFollow(),camera=new PerspectiveCamera(aspect<1?100:55,aspect),target=new Vector3(0,.65,0);
  camera.position.set(0,1.65,3.8);camera.lookAt(target);camera.updateMatrixWorld(true);
  const ducks:{x:number;z:number;insect?:{x:number;z:number}}[]=[{x:0,z:0,insect:{x:4,z:0}},{x:-.4,z:0}];
  const fly=new Vector3(4,.5,0);
  assert.ok(fly.clone().project(camera).x>1,'fly begins outside the frame');
  let previous=1;
  for(let i=0;i<120;i++){
   follow.update(1/60,i/60,camera,target,ducks);
   assert.ok(camera.zoom<=previous+1e-9,'no zoom pumping during the hunt');
   assert.ok(previous-camera.zoom<.025,'zoom does not jump');previous=camera.zoom;
  }
  camera.updateMatrixWorld(true);
  for(const point of [fly,new Vector3(0,.65,0)]){
   const screen=point.clone().project(camera);
   assert.ok(Math.abs(screen.x)<.9&&Math.abs(screen.y)<.9,'fly and stationary hunter both fit with margin');
  }
  assert.ok(camera.zoom<.95,'widens before the hunter has moved');
  ducks[0].insect=undefined;const wide=camera.zoom;
  for(let i=120;i<210;i++)follow.update(1/60,i/60,camera,target,ducks);
  assert.ok(camera.zoom<=wide+1e-8,'keeps the wide view after the catch');
  for(let i=210;i<1200;i++)follow.update(1/60,i/60,camera,target,ducks);
  assert.ok(camera.zoom>.99,'gradually returns to ordinary framing');
  follow.manual(21,true);const zoom=camera.zoom,aim=target.clone();ducks[0].insect={x:-4,z:0};
  assert.equal(follow.update(.05,22,camera,target,ducks),false);
  assert.equal(camera.zoom,zoom);assert.deepEqual(target,aim);
 }
});

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


test('small flock jitter leaves a settled camera and its aim completely still',()=>{
 const follow=new CameraFollow(),camera=new PerspectiveCamera(),target=new Vector3(0,.65,0);
 camera.position.set(0,1.65,3);const before=camera.position.clone(),aim=target.clone();
 for(let i=0;i<1200;i++){
  const noise=.035*Math.sin(i*1.7);
  follow.update(1/60,i/60,camera,target,[{x:noise,z:-noise}]);
 }
 assert.ok(camera.position.distanceTo(before)<1e-10,'position has a dead zone');
 assert.ok(target.distanceTo(aim)<1e-10,'aim has a separate dead zone');
});

test('sustained flock movement is followed with bounded acceleration and settles without hunting',()=>{
 const follow=new CameraFollow(),camera=new PerspectiveCamera(),target=new Vector3(0,.65,0);
 camera.position.set(0,1.65,3.8);
 let previousVelocity=new Vector3();
 for(let i=0;i<1800;i++){
  const before=camera.position.clone();
  follow.update(1/60,i/60,camera,target,[{x:i<60?0:1.8,z:0}]);
  const velocity=camera.position.clone().sub(before).multiplyScalar(60);
  assert.ok(velocity.distanceTo(previousVelocity)*60<.61,'no abrupt steering impulses');
  previousVelocity=velocity;
 }
 assert.ok(target.distanceTo(new Vector3(1.8,.65,0))<.05,'tracks a real change');
 const before=camera.position.clone(),aim=target.clone();
 for(let i=1800;i<2400;i++)follow.update(1/60,i/60,camera,target,[{x:1.8+.025*Math.sin(i*2),z:0}]);
 assert.ok(camera.position.distanceTo(before)<.001,'settled camera does not hunt');
 assert.ok(target.distanceTo(aim)<1e-10,'aim ignores renewed small jitter');
});

test('filter response remains consistent at different frame rates',()=>{
 const run=(fps:number)=>{
  const follow=new CameraFollow(),camera=new PerspectiveCamera(),target=new Vector3(0,.65,0);
  camera.position.set(0,1.65,3.8);
  for(let i=0;i<fps*12;i++)follow.update(1/fps,i/fps,camera,target,[{x:Math.min(1.5,i/fps*.25),z:0}]);
  return {position:camera.position,target};
 };
 const reference=run(60);
 for(const fps of [30,120]){
  const result=run(fps);
  assert.ok(result.position.distanceTo(reference.position)<.025);
  assert.ok(result.target.distanceTo(reference.target)<.015);
 }
});
