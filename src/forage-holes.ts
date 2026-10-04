import * as THREE from 'three';

/** Small soil marks pooled to keep long-running screensavers bounded. */
export function createForageHoles(scene:THREE.Scene){
 const holes:{mesh:THREE.Group;last:number;work:number;materials:THREE.MeshStandardMaterial[]}[]=[];
 function make(){
  const mesh=new THREE.Group();mesh.name='forage-hole';
  const materials=[new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.24+Math.random()*.055,.26+Math.random()*.14,.17+Math.random()*.055),roughness:1,vertexColors:true})];
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
  materials.forEach(m=>{m.transparent=true;m.depthWrite=false;});
  const opening=new THREE.Mesh(disk,materials[0]);opening.rotation.x=-Math.PI/2;opening.position.y=.007;mesh.add(opening);

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
