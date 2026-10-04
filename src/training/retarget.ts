import type { RecordedFootTarget } from '../types';

/** Preview planar recordings on the garden rig. Neck curvature remains procedural.
 * Keep recorded world positions; camera tracking must also move relative to the floor.
 * The garden rig is 0.8 scale, faces +Z locally and is turned to face +X here.
 */
export function retargetFeet(frame:number[][]){
 const scale=.8,rootX=frame[0][0],originX=0;
 const feet=[6,9].map((ankle,i):RecordedFootTarget=>({
  position:{x:(frame[ankle][0]-originX)*scale,y:(frame[ankle][1]-.04)*scale,z:i===0?.0896:-.0896},
  yaw:Math.PI/2,
  pitch:-Math.atan2(frame[i===0?10:12][1]-frame[i===0?11:13][1],frame[i===0?10:12][0]-frame[i===0?11:13][0]),
  lift:Math.max(0,Math.min(1,(frame[ankle][1]-.065)/.12)),
 })) as [RecordedFootTarget,RecordedFootTarget];
 return {feet,rootY:0,body:{
  pelvis:{x:rootX*scale,y:frame[0][1]*scale,z:0},
  neckMiddle:{x:(frame[2][0]-originX)*scale,y:frame[2][1]*scale,z:0},
  // The training head point is the skull centre; the garden head pivot is below it.
  head:{x:(frame[3][0]-originX-.025)*scale,y:(frame[3][1]-.073)*scale,z:0},
  pitch:Math.atan2(frame[1][0]-rootX,frame[1][1]-frame[0][1]),
 }};
}

