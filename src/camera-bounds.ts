import { MathUtils, type PerspectiveCamera, type Vector3 } from 'three';
import { GARDEN } from './types';

export const CAMERA_HEIGHT = { min: .65, max: 1.65 };

/** Apply after OrbitControls, including its damping: never render outside the hedge. */
export function constrainGardenCamera(camera: PerspectiveCamera, target: Vector3): void {
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
 camera.lookAt(target);
}
