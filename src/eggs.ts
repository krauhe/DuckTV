import * as THREE from 'three';
import type {Duck} from './simulation';
import {gardenGroundHeight} from './shelter';

export interface DuckEgg {id:number;x:number;y:number;z:number;born:number;opacity:number;hiddenFor:number;}
export class EggLife {
 readonly eggs:DuckEgg[]=[];
 private hens=new Map<string,{due:number;settled:number}>();
 private nextId=0;
 constructor(private random= Math.random){}
 update(time:number,dt:number,ducks:ReadonlyArray<Pick<Duck,'id'|'kind'|'state'|'speed'|'upright'|'x'|'z'|'heading'>>,visible:(egg:DuckEgg)=>boolean){
  for(const duck of ducks){
   if(duck.kind==='drake')continue;
   let hen=this.hens.get(duck.id);
   if(!hen){hen={due:time+300+this.random()*300,settled:0};this.hens.set(duck.id,hen);}
   const resting=(duck.state==='preen'||duck.state==='rest')&&duck.speed<.02&&duck.upright<.35;
   hen.settled=resting?hen.settled+dt:0;
   if(time>=hen.due&&hen.settled>=2.5&&this.eggs.length<24){
    // Appear beneath the settled hen, not falling from a walking or sleeping bird.
    const x=duck.x-Math.sin(duck.heading)*.09,z=duck.z-Math.cos(duck.heading)*.09;
    this.eggs.push({id:this.nextId++,x,y:gardenGroundHeight(x,z)+.052,z,born:time,opacity:1,hiddenFor:0});
    hen.due=time+900+this.random()*600;hen.settled=0;
   }
  }
  for(let i=this.eggs.length-1;i>=0;i--){
   const egg=this.eggs[i];
   if(time-egg.born<120||visible(egg)){egg.hiddenFor=0;egg.opacity=1;continue;}
   egg.hiddenFor+=dt;
   egg.opacity=Math.max(0,1-Math.max(0,egg.hiddenFor-1.5)/3);
   if(egg.opacity===0)this.eggs.splice(i,1);
  }
 }
}

export function createEggs(scene:THREE.Scene){
 const life=new EggLife(),meshes=new Map<number,THREE.Mesh<THREE.SphereGeometry,THREE.MeshStandardMaterial>>();
 const geometry=new THREE.SphereGeometry(1,20,16);
 const positions=geometry.getAttribute('position');
 for(let i=0;i<positions.count;i++){
  const y=positions.getY(i),taper=1-.16*y;
  positions.setXYZ(i,positions.getX(i)*.040*taper,y*.052,positions.getZ(i)*.040*taper);
 }
 geometry.computeVertexNormals();
 const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),bound=new THREE.Sphere(new THREE.Vector3(),.075);
 return {
  update(time:number,dt:number,ducks:ReadonlyArray<Duck>,camera:THREE.Camera){
   camera.updateMatrixWorld();matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);
   life.update(time,dt,ducks,egg=>{bound.center.set(egg.x,egg.y,egg.z);return frustum.intersectsSphere(bound);});
   const ids=new Set(life.eggs.map(egg=>egg.id));
   for(const [id,mesh] of meshes)if(!ids.has(id)){scene.remove(mesh);mesh.material.dispose();meshes.delete(id);}
   for(const egg of life.eggs){
    let mesh=meshes.get(egg.id);
    if(!mesh){
     mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xe9e4d2,roughness:.84,transparent:true}));
     mesh.name='duck-egg';mesh.castShadow=mesh.receiveShadow=true;
     mesh.rotation.y=egg.id*2.4;scene.add(mesh);meshes.set(egg.id,mesh);
    }
    mesh.position.set(egg.x,egg.y,egg.z);mesh.material.opacity=egg.opacity;
   }
  },
 };
}
