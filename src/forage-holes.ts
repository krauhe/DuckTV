import * as THREE from 'three';

/** Small soil marks pooled to keep long-running screensavers bounded. */
export function createForageHoles(scene:THREE.Scene){
 const size=64,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(x+.5)/size*2-1,dy=(y+.5)/size*2-1;
  const a=Math.atan2(dy,dx),edge=.82+.07*Math.sin(a*5)+.04*Math.cos(a*9);
  const alpha=1-THREE.MathUtils.smoothstep(Math.hypot(dx,dy),edge-.24,edge);
  const grain=.84+.16*Math.sin(x*1.7+y*.9)**2,index=(y*size+x)*4;
  pixels[index]=pixels[index+1]=pixels[index+2]=Math.round(alpha*grain*255);pixels[index+3]=255;
 }
 const mask=new THREE.DataTexture(pixels,size,size);mask.needsUpdate=true;mask.magFilter=THREE.LinearFilter;
 const holes:{mesh:THREE.Group;last:number;work:number;materials:THREE.MeshStandardMaterial[]}[]=[];
 const pending=new Map<string,{point:THREE.Vector3;work:number}>();
 function make(){
  const mesh=new THREE.Group();mesh.name='forage-hole';
  const materials=[new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.065+Math.random()*.025,.38+Math.random()*.12,.11+Math.random()*.025),roughness:1,vertexColors:true,alphaMap:mask})];
  const disk=new THREE.CircleGeometry(1,24),positions=disk.getAttribute('position');
  const colors=new Float32Array(positions.count*3),phase=Math.random()*Math.PI*2;
  for(let i=0;i<positions.count;i++){
    const a=Math.atan2(positions.getY(i),positions.getX(i));
    const radius=.78+.12*Math.sin(a*3+phase)+.08*Math.cos(a*5-phase);
    positions.setXY(i,positions.getX(i)*radius,positions.getY(i)*radius);
    const shade=i===0?.82:1.18;colors.set([shade,shade,shade],i*3);
  }
  disk.setAttribute('color',new THREE.BufferAttribute(colors,3));
  disk.computeVertexNormals();mesh.rotation.y=Math.random()*Math.PI*2;
  const smearMaterial=materials[0].clone();smearMaterial.color.set('#49321f');materials.push(smearMaterial);
  materials.forEach(m=>{m.transparent=true;m.depthWrite=false;m.polygonOffset=true;m.polygonOffsetFactor=-2;m.polygonOffsetUnits=-2;});
  const opening=new THREE.Mesh(disk,materials[0]);opening.rotation.x=-Math.PI/2;opening.position.y=.014;opening.renderOrder=3;mesh.add(opening);
  // Disturbed wet soil around the small puncture remains readable at garden distance.
  const smear=new THREE.Mesh(disk,smearMaterial);smear.rotation.x=-Math.PI/2;smear.position.y=.012;smear.scale.set(2.4,2.1,1);smear.renderOrder=2;mesh.add(smear);

  mesh.scale.set(.015, 1, .012);scene.add(mesh);return {mesh,last:0,work:0,materials};
 }
 return {
  contact(id:string,point:THREE.Vector3,time:number,dt:number,probing:boolean){
   if(probing&&point.y<=.045){
    const held=pending.get(id)??{point:point.clone(),work:0};
    held.point.copy(point);held.work+=Math.max(0,dt);pending.set(id,held);
   }
   const held=pending.get(id);
   if(!held)return;
   // Use the rendered bill position, not the intention to lift: the neck eases
   // behind the simulation's peck signal and may still intersect the turf.
   if(point.y>.065||Math.hypot(point.x-held.point.x,point.z-held.point.z)>.12){
    this.probe(held.point,time,held.work);pending.delete(id);
   }else{
    for(const hole of holes)if(Math.hypot(hole.mesh.position.x-held.point.x,hole.mesh.position.z-held.point.z)<.06)hole.mesh.visible=false;
   }
  },
  probe(point:THREE.Vector3,time:number,dt:number){
   // Raised shelter floors and water must not acquire lawn holes.
   if(point.y>.045)return;
   let hole=holes.find(h=>Math.hypot(h.mesh.position.x-point.x,h.mesh.position.z-point.z)<.06);
   if(!hole){hole=holes.length<64?make():holes.reduce((a,b)=>a.last<b.last?a:b);if(!holes.includes(hole))holes.push(hole);hole.work=0;hole.mesh.position.set(point.x,0,point.z);}
   hole.last=time;hole.work=Math.min(1,hole.work+dt*.22);hole.mesh.visible=true;
   hole.mesh.scale.set(.010+hole.work*.004,1,.013+hole.work*.005);
   // Repeated probing scuffs a patch of turf, not just a subpixel puncture.
   // Keep the central hole small while the surrounding disturbed grass grows.
   hole.mesh.children[1].scale.set(4+hole.work*2,3.5+hole.work*2,1);
   hole.materials.forEach((m,i)=>m.opacity=i===0?1:.92);
  },
  update(time:number){
   for(const h of holes){
    const fade=THREE.MathUtils.clamp(1-(time-h.last-15)/60,0,1);
    h.mesh.visible=fade>0;
    // Fade transparency only: an old fade factor above one enlarged fresh holes.
    h.materials.forEach((m,i)=>m.opacity=fade*(i===0?1:.92));
   }
  }
 };
}
