import * as THREE from 'three';

/** Small soil marks pooled to keep long-running screensavers bounded. */
export function createForageHoles(scene:THREE.Scene){
 const holes:{mesh:THREE.Group;last:number;work:number;materials:THREE.MeshStandardMaterial[]}[]=[];
 const earth=new THREE.MeshStandardMaterial({color:0x3c2a18,roughness:1});
 const dark=new THREE.MeshStandardMaterial({color:0x17140d,roughness:1});
 const disk=new THREE.CircleGeometry(1,24),rim=new THREE.TorusGeometry(1,.15,6,24);
 function make(){
  const mesh=new THREE.Group();mesh.name='forage-hole';
  const materials=[dark.clone(),earth.clone()];
  materials.forEach(m=>{m.transparent=true;m.depthWrite=false;});
  const opening=new THREE.Mesh(disk,materials[0]);opening.rotation.x=-Math.PI/2;opening.position.y=.007;mesh.add(opening);
  const edge=new THREE.Mesh(rim,materials[1]);edge.rotation.x=-Math.PI/2;edge.position.y=.009;mesh.add(edge);
  mesh.scale.set(.015, .15, .012);scene.add(mesh);return {mesh,last:0,work:0,materials};
 }
 return {
  probe(point:THREE.Vector3,time:number,dt:number){
   // Raised shelter floors and water must not acquire lawn holes.
   if(point.y>.045)return;
   let hole=holes.find(h=>Math.hypot(h.mesh.position.x-point.x,h.mesh.position.z-point.z)<.075);
   if(!hole){hole=holes.length<64?make():holes.reduce((a,b)=>a.last<b.last?a:b);if(!holes.includes(hole))holes.push(hole);hole.work=0;hole.mesh.position.set(point.x,0,point.z);}
   hole.last=time;hole.work=Math.min(1,hole.work+dt*.22);hole.mesh.visible=true;
   hole.mesh.scale.set(.010+hole.work*.004,.15,.013+hole.work*.005);
   hole.materials.forEach(m=>m.opacity=1);
  },
  update(time:number){
   for(const h of holes){
    const fade=THREE.MathUtils.clamp(1-(time-h.last-15)/60,0,1);
    h.mesh.visible=fade>0;
    // Fade transparency only: an old fade factor above one enlarged fresh holes.
    h.materials.forEach(m=>m.opacity=fade);
   }
  }
 };
}
