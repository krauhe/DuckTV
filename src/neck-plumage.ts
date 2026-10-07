import * as THREE from 'three';
import {featherSurface} from './feather-texture';

/** Short overlapping feathers bound to the deforming neck, including its pigment. */
export function neckPlumage(skin:THREE.BufferGeometry,rings:number,sides:number,mottled=false){
  const bindings:{indices:number[];weights:number[];lift:number}[]=[];
  const colors:number[]=[],uv:number[]=[],indices:number[]=[];
  const pigment=skin.getAttribute('color');
  for(let row=0;row<22;row++)for(let column=0;column<28;column++){
    const seed=((row*73+column*37)%101)/101;
    const root=.13+row*.037+(seed-.5)*.018;
    const angle=(column+(row%2)*.5+(seed-.5)*.4)/28;
    const length=.038+seed*.018,start=bindings.length;
    for(let along=0;along<=4;along++)for(let across=0;across<=2;across++){
      const t=along/4,a=across-1;
      const u=((angle+a*.023*Math.sin(Math.PI*(.12+.88*t))**.65+(seed-.5)*t*.013)%1+1)%1;
      const v=root-t*length,x=u*sides,y=v*rings,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
      const ids=[iy*(sides+1)+ix,iy*(sides+1)+ix+1,(iy+1)*(sides+1)+ix,(iy+1)*(sides+1)+ix+1];
      const weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
      const size=1-THREE.MathUtils.smoothstep(root,.6,1)*.5;
      bindings.push({indices:ids,weights,lift:.0006+size*(Math.sin(t*Math.PI)*.0012*(1-a*a)+t**3*(.003+seed*.003))});
      const shade=.94+seed*.09-Math.sin(t*Math.PI)**2*(1-a*a)*(mottled?.30:.07);
      for(let channel=0;channel<3;channel++)colors.push(ids.reduce((sum,id,j)=>sum+pigment.array[id*3+channel]*weights[j],0)*shade);
      uv.push((a+1)*.025,t*.036);
      if(along<4&&across<2){const k=start+along*3+across;indices.push(k,k+3,k+1,k+1,k+3,k+4);}
    }
  }
  const positions=new Float32Array(bindings.length*3),normals=new Float32Array(positions.length);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  const material=featherSurface(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}),true);
  material.bumpScale=.0007;
  const mesh=new THREE.Mesh(geometry,material);mesh.name='duck-neck-feathers';mesh.castShadow=mesh.receiveShadow=true;
  function update(){
    if(!mesh.visible)return;
    const source=skin.getAttribute('position').array,sourceNormals=skin.getAttribute('normal').array;
    bindings.forEach((binding,i)=>{
      for(let channel=0;channel<3;channel++){
        let p=0,n=0;
        for(let j=0;j<4;j++){const k=binding.indices[j]*3+channel,w=binding.weights[j];p+=source[k]*w;n+=sourceNormals[k]*w;}
        // The neck skin's winding points inward; feather relief belongs outside.
        positions[i*3+channel]=p-n*binding.lift;normals[i*3+channel]=-n;
      }
    });
    geometry.attributes.position.needsUpdate=geometry.attributes.normal.needsUpdate=true;
    geometry.boundingSphere=skin.boundingSphere?.clone()??null;
    if(geometry.boundingSphere)geometry.boundingSphere.radius+=.006;
  }
  return {mesh,update};
}
