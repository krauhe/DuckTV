import * as THREE from 'three';

/** Reused short-lived splash crowns and small water rings, separate from duck wakes. */
export function createRainImpacts(scene:THREE.Scene){
 const slots=Array.from({length:64},()=>{
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(58*3),3));
  const material=new THREE.LineBasicMaterial({color:0xc2dce8,transparent:true,opacity:0,depthWrite:false});
  const mesh=new THREE.LineSegments(geometry,material);mesh.visible=false;mesh.frustumCulled=false;mesh.name='rain-surface-impact';scene.add(mesh);
  return {mesh,material,age:2,water:false,x:0,y:0,z:0};
 });
 let next=0;
 return {
  hit(x:number,y:number,z:number,water:boolean){
   const s=slots[next];next=(next+1)%slots.length;
   Object.assign(s,{x,y,z,water,age:0});s.mesh.visible=true;
  },
  update(dt:number,light:number,waterContains:(x:number,z:number)=>boolean){
   for(const s of slots){
    s.age+=dt;const life=s.water?1.05:.32;
    if(s.age>=life){s.mesh.visible=false;continue;}
    const p=s.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const radius=.012+s.age*(s.water?.26:.15);
    let index=0;
    const vertex=(x:number,y:number,z:number)=>p.setXYZ(index++,s.x+x,s.y+y+.014,s.z+z);
    for(let j=0;j<24;j++){
     const a=j/24*Math.PI*2,b=(j+1)/24*Math.PI*2;
     const x=Math.cos(a)*radius,z=Math.sin(a)*radius;
     const x2=Math.cos(b)*radius,z2=Math.sin(b)*radius;
     const visible=s.water&&waterContains(s.x+x,s.z+z)&&waterContains(s.x+x2,s.z+z2);
     vertex(visible?x:0,0,visible?z:0);vertex(visible?x2:0,0,visible?z2:0);
    }
    // Short ballistic ejecta; they fall back instead of hovering over the hit.
    const h=Math.max(0,.85*s.age-4.9*s.age*s.age);
    for(let j=0;j<5;j++){
     const a=j/5*Math.PI*2+s.x;
     const r=h>0?s.age*.24:0;
     vertex(Math.cos(a)*r,h,Math.sin(a)*r);
     vertex(Math.cos(a)*r,h+Math.min(.022,h),Math.sin(a)*r);
    }
    p.needsUpdate=true;
    s.material.opacity=.7*(1-s.age/life)*THREE.MathUtils.lerp(.18,1,light);
   }
  },
 };
}
