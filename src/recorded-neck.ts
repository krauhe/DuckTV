import * as THREE from 'three';

/** Continuous feathered skin through the recorded neck joint. Radii are never
 * multiplied by the breast-to-head distance, so a bow folds instead of shrinking.
 */
export function createRecordedNeck(material:THREE.Material,neckColor:string,headColor:string,band?:string,throatPatch=false){
 const rings=32,sides=16,positions=new Float32Array((rings+1)*(sides+1)*3),uv:number[]=[],colors:number[]=[],indices:number[]=[];
 const dark=new THREE.Color(neckColor),head=new THREE.Color(headColor),white=new THREE.Color(band??neckColor);
 for(let r=0;r<=rings;r++)for(let s=0;s<=sides;s++){
  const t=r/rings;uv.push(s/sides,t);
  const color=(t>.88?head:band&&t>.77?white:dark).clone();
  // Pigment belongs to the skin, so it follows every neck deformation.
  const front=Math.sin(s/sides*Math.PI*2);
  const patch=((t-.48)/.14)**2+((s/sides-.75)/.12)**2;
  if(throatPatch&&front<0)color.lerp(new THREE.Color('#c48668'),1-THREE.MathUtils.smoothstep(patch,.65,1));
  color.toArray(colors,(r*(sides+1)+s)*3);
  if(r<rings&&s<sides){const a=r*(sides+1)+s,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
 const mesh=new THREE.Mesh(geometry,material);mesh.name='duck-recorded-neck';mesh.visible=false;mesh.castShadow=mesh.receiveShadow=true;
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()]);
 const point=new THREE.Vector3(),tangent=new THREE.Vector3(),normal=new THREE.Vector3(),side=new THREE.Vector3(1,0,0);
 function update(root:THREE.Vector3,collar:THREE.Vector3,middle:THREE.Vector3,end:THREE.Vector3){
  [root,collar,middle,end].forEach((p,i)=>curve.points[i].copy(p));
  for(let r=0;r<=rings;r++){
   const t=r/rings;curve.getPoint(t,point);curve.getTangent(t,tangent);
   side.set(Math.abs(tangent.x)>.95?0:1,0,Math.abs(tangent.x)>.95?1:0);
   side.addScaledVector(tangent,-side.dot(tangent)).normalize();normal.crossVectors(tangent,side).normalize();
   // Broad root buried in the breast, then a narrower feathered neck.
   const radius=.047+.065*Math.pow(1-t,3)-.017*Math.pow(t,8);
   for(let s=0;s<=sides;s++){
    const a=s/sides*Math.PI*2,index=(r*(sides+1)+s)*3;
    positions[index]=point.x+radius*(Math.cos(a)*side.x+Math.sin(a)*normal.x);
    positions[index+1]=point.y+radius*(Math.cos(a)*side.y+Math.sin(a)*normal.y);
    positions[index+2]=point.z+radius*(Math.cos(a)*side.z+Math.sin(a)*normal.z);
   }
  }
  geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
 }
 return {mesh,update};
}
