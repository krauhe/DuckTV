import * as THREE from 'three';

export const SHELTER={minX:-4.9,maxX:-2.5,back:-3.65,front:-1.9};
export const SHELTER_FLOOR={minX:-4.86,maxX:-2.54,minZ:-3.625,maxZ:-1.925,top:.023};
export function gardenGroundHeight(x:number,z:number){
 const f=SHELTER_FLOOR;return x>=f.minX&&x<=f.maxX&&z>=f.minZ&&z<=f.maxZ?f.top:0;
}
export const shelterBeds=[{x:-4.45,z:-3.15},{x:-3.7,z:-3.15},{x:-2.95,z:-3.15},{x:-3.7,z:-2.45}];

export class ShelterDoor {
 closed=0;
 private quiet=0;
 update(dt:number,night:boolean,ducks:ReadonlyArray<{x:number;z:number;state:string}>){
  const safe=night&&ducks.length===4&&ducks.every(d=>d.state==='sleep'&&
   d.x>SHELTER.minX+.25&&d.x<SHELTER.maxX-.25&&d.z>SHELTER.back+.2&&d.z<SHELTER.front-.4);
  this.quiet=safe?this.quiet+dt:0;
  // Require a settled flock, but reverse immediately if somebody wakes.
  this.closed=THREE.MathUtils.clamp(this.closed+dt*(safe&&this.quiet>2?.28:-.65),0,1);
 }
 reset(){this.closed=0;this.quiet=0;}
}

export function createShelter(scene:THREE.Scene){
 const group=new THREE.Group();group.name='evening-duck-shelter';scene.add(group);
 const wood=new THREE.MeshStandardMaterial({color:0x9c794e,roughness:.95});
 const roof=new THREE.MeshStandardMaterial({color:0x435747,roughness:.85});
 const straw=new THREE.MeshStandardMaterial({color:0xbda36a,roughness:1});
 const beam=(x:number,y:number,z:number,w:number,h:number,d:number,material=wood)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);
 };
 const {minX,maxX,back,front}=SHELTER;
 for(const x of [minX,maxX])for(const z of [back,front])beam(x,.74,z,.07,1.48,.07);
 beam((minX+maxX)/2,1.48,(back+front)/2,2.58,.09,1.92,roof);
 beam((minX+maxX)/2,.65,back,2.4,1.3,.055);
 beam((minX+maxX)/2,SHELTER_FLOOR.top-.011,(back+front)/2,2.32,.022,1.7,straw);
 // Fine wire on the sides; the entire front stays open and at lawn level.
 const wire=new THREE.LineBasicMaterial({color:0xa1aca0,transparent:true,opacity:.48});
 const points:THREE.Vector3[]=[];
 for(const x of [minX,maxX]){
  for(let z=back;z<=front;z+=.15)points.push(new THREE.Vector3(x,.02,z),new THREE.Vector3(x,1.4,z));
  for(let y=.1;y<=1.4;y+=.15)points.push(new THREE.Vector3(x,y,back),new THREE.Vector3(x,y,front));
 }
 group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),wire));
 const shutter=new THREE.MeshStandardMaterial({color:0x637565,roughness:.7,metalness:.15});
 const slats=Array.from({length:24},()=>{
  const slat=new THREE.Mesh(new THREE.BoxGeometry(2.3,1,.045),shutter);
  slat.castShadow=slat.receiveShadow=true;slat.visible=false;group.add(slat);return slat;
 });
 for(const x of [minX+.035,maxX-.035])beam(x,.735,front+.015,.055,1.43,.075,roof);
 const roller=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,2.35,20),shutter);
 roller.rotation.z=Math.PI/2;roller.position.set((minX+maxX)/2,1.44,front+.035);group.add(roller);
 const setDoor=(closed:number)=>{
  const c=THREE.MathUtils.clamp(closed,0,1),drop=c*1.42;
  slats.forEach((slat,i)=>{
   const height=THREE.MathUtils.clamp(drop-i*1.42/24,0,1.42/24);
   slat.visible=height>.0001;slat.scale.y=Math.max(.0001,height-.001);
   slat.position.set((minX+maxX)/2,1.445-i*1.42/24-height/2,front+.015);
  });
  roller.scale.set(1+.6*(1-c),1,1+.6*(1-c));
  roller.rotation.x=c*Math.PI*4;
 };
 setDoor(0);
 return {group,setDoor};
}
