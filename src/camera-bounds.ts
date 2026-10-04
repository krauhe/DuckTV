import { MathUtils, type PerspectiveCamera, type Vector3 } from 'three';
import { GARDEN } from './types';
import { SHELTER } from './shelter';

export const CAMERA_HEIGHT = { min: .65, max: 1.65 };
// Include the roof overhang and space for the camera's near clipping plane.
export const CAMERA_SHELTER={minX:SHELTER.minX-.30,maxX:SHELTER.maxX+.30,minZ:SHELTER.back-.30,maxZ:SHELTER.front+.30};
const inside=(p:{x:number;z:number})=>p.x>CAMERA_SHELTER.minX&&p.x<CAMERA_SHELTER.maxX&&p.z>CAMERA_SHELTER.minZ&&p.z<CAMERA_SHELTER.maxZ;

function avoidShelter(position:Vector3,previous?:Vector3){
 const b=CAMERA_SHELTER;
 if(previous&&!inside(previous)){
  // Sweep the whole pan/orbit displacement, so a large drag cannot tunnel
  // through the shelter even when its endpoint is outside the far wall.
  let enter=0,leave=1,axis:'x'|'z'='x';
  for(const [key,min,max] of [['x',b.minX,b.maxX],['z',b.minZ,b.maxZ]] as const){
   const delta=position[key]-previous[key];
   if(Math.abs(delta)<1e-10){if(previous[key]<=min||previous[key]>=max){leave=-1;break;}continue;}
   const a=(min-previous[key])/delta,c=(max-previous[key])/delta,near=Math.min(a,c),far=Math.max(a,c);
   if(near>enter){enter=near;axis=key;}leave=Math.min(leave,far);
  }
  if(enter<=leave&&enter>=0&&enter<=1&&leave>0){
   const delta=position[axis]-previous[axis];
   // Keep tangential movement, but stop before the contacted side.
   position[axis]=previous[axis]+delta*enter-Math.sign(delta)*.001;
  }
 }
 if(inside(position)){
  // Recover an already invalid position without pushing behind the hedge.
  const choices=[{x:b.maxX+.001,z:position.z},{x:position.x,z:b.maxZ+.001},
   {x:b.minX-.001,z:position.z},{x:position.x,z:b.minZ-.001}]
   .filter(p=>p.x>=GARDEN.minX+.15&&p.x<=GARDEN.maxX-.15&&p.z>=GARDEN.minZ+.15&&p.z<=GARDEN.maxZ-.15)
   .sort((a,c)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(c.x-position.x,c.z-position.z));
  if(choices[0]){position.x=choices[0].x;position.z=choices[0].z;}
 }
}

/** Apply after OrbitControls, including its damping: never render outside the hedge. */
export function constrainGardenCamera(camera: PerspectiveCamera, target: Vector3, previous?:Vector3): void {
 const x=MathUtils.clamp(target.x,GARDEN.minX+.7,GARDEN.maxX-.7);
 const z=MathUtils.clamp(target.z,GARDEN.minZ+.7,GARDEN.maxZ-.7);
 camera.position.x+=x-target.x;
 camera.position.z+=z-target.z;
 target.set(x,.65,z);
 camera.position.set(
  MathUtils.clamp(camera.position.x,GARDEN.minX+.15,GARDEN.maxX-.15),
  MathUtils.clamp(camera.position.y,CAMERA_HEIGHT.min,CAMERA_HEIGHT.max),
  MathUtils.clamp(camera.position.z,GARDEN.minZ+.15,GARDEN.maxZ-.15),
 );
 avoidShelter(camera.position,previous);
 camera.lookAt(target);
}
