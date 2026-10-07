import * as THREE from 'three';
import type {DuckKind} from './types';
import {featherSurface} from './feather-texture';

/** Layered curved vanes on the actual body surface, in one draw call per bird.
 * Roots hug the skin; only the ragged tips lift into the silhouette. */
export function contourFeathers(skin:THREE.Mesh,kind:DuckKind,sides=64,head=false):THREE.Mesh {
  const source=skin.geometry,points=source.getAttribute('position'),normals=source.getAttribute('normal'),pigment=source.getAttribute('color');
  const rings=points.count/(sides+1)-1;
  skin.updateMatrix();
  const normalMatrix=new THREE.Matrix3().getNormalMatrix(skin.matrix);
  const base=(skin.material as THREE.MeshStandardMaterial).color;
  const rows=24,columns=head?48:58;
  const positions:number[]=[],colors:number[]=[],uv:number[]=[],indices:number[]=[];
  const p=new THREE.Vector3(),n=new THREE.Vector3(),c=new THREE.Vector3();
  const sample=(attribute:THREE.BufferAttribute|THREE.InterleavedBufferAttribute,u:number,v:number,out:THREE.Vector3)=>{
    const column=((u%1+1)%1)*sides,row=THREE.MathUtils.clamp(v,0,1)*rings;
    const x=Math.floor(column),y=Math.min(rings-1,Math.floor(row)),tx=column-x,ty=row-y;
    out.set(0,0,0);
    for(let j=0;j<2;j++)for(let i=0;i<2;i++){
      const index=(y+j)*(sides+1)+x+i,w=(i?tx:1-tx)*(j?ty:1-ty);
      out.x+=attribute.getX(index)*w;out.y+=attribute.getY(index)*w;out.z+=attribute.getZ(index)*w;
    }
    return out;
  };
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const seed=((row*73+column*37)%101)/101;
    const u=(column+(row%2)*.5+(seed-.5)*.3)/columns,v=head?.15+row*.027+(seed-.5)*.012:.12+row*(.70/(rows-1))+(seed-.5)*.018;
    sample(points,u,v,p).applyMatrix4(skin.matrix);
    // Leave eyes, cheek front and bill attachment unobstructed.
    if(head&&p.z>.035)continue;
    const length=head?.034+seed*.009:(.054+seed*.019)*(1-.75*THREE.MathUtils.smoothstep(v,.85,1)),width=head?.011:.007+seed*.003;
    const start=positions.length/3;
    for(let along=0;along<=7;along++)for(let across=0;across<=4;across++){
      const t=along/7,a=across/2-1;
      const vane=Math.sin(Math.PI*(.12+.88*t))**.65;
      const fringe=1-.11*Math.sin(along*2.9+seed*11)**2;
      const pu=u+a*width*vane*fringe-Math.cos(u*Math.PI*2)*t*(head?.004:.045),pv=v+(head?1:-1)*t*length;
      sample(points,pu,pv,p).applyMatrix4(skin.matrix);sample(normals,pu,pv,n).applyNormalMatrix(normalMatrix).normalize();
      if(pigment)sample(pigment,pu,pv,c);else c.set(base.r,base.g,base.b);
      // Curved, uneven lifted tips and a subtle raised central shaft.
      p.addScaledVector(n,(head?.0005:.0006)+Math.sin(t*Math.PI)*.0008*(1-a*a)+t**3*(head?.0016+seed*.0014:.0015+seed*.004));
      positions.push(p.x,p.y,p.z);
      const centre=kind==='brown'&&!head?(1-a*a)**3*Math.sin(t*Math.PI)**2*.48:0;
      c.multiplyScalar((head?.95+seed*.08:.94+seed*.10)-centre);colors.push(c.x,c.y,c.z);
      uv.push(head?pu:(a+1)*.025,head?pv:t*.036);
      if(along<7&&across<4){const k=start+along*5+across;indices.push(k,k+5,k+1,k+1,k+5,k+6);}
    }
  }
  if(!head){
    // A polar layout collapses into concentric rings at the shoulder summit.
    // Lay these feathers backwards on a staggered Cartesian grid instead.
    const right=new THREE.Vector3(),left=new THREE.Vector3(),front=new THREE.Vector3(),back=new THREE.Vector3();
    const project=(x:number,z:number)=>{
      let lo=.55,hi=1;
      for(let step=0;step<14;step++){
        const v=(lo+hi)/2;
        sample(points,0,v,right);sample(points,.5,v,left);sample(points,.25,v,front);sample(points,.75,v,back);
        const cx=(right.x+left.x)/2,cz=(front.z+back.z)/2;
        const radius=((x-cx)/((right.x-left.x)/2))**2+((z-cz)/((front.z-back.z)/2))**2;
        if(radius<1)lo=v;else hi=v;
      }
      const v=(lo+hi)/2;
      sample(points,0,v,right);sample(points,.5,v,left);sample(points,.25,v,front);sample(points,.75,v,back);
      const u=Math.atan2((z-(front.z+back.z)/2)/((front.z-back.z)/2),(x-(right.x+left.x)/2)/((right.x-left.x)/2))/(2*Math.PI);
      sample(points,u,v,p);sample(normals,u,v,n).normalize();
      // Close the tiny terminal ring without pinching the feather tips together.
      p.x=x;p.z=z;
      if(pigment)sample(pigment,u,v,c);else c.set(base.r,base.g,base.b);
      return v;
    };
    for(let row=0;row<22;row++)for(let column=0;column<24;column++){
      const seed=((row*73+column*37)%101)/101;
      const x=(column-11.5+(row%2)*.5+(seed-.5)*.65)*.012;
      const z=-.025+row*.012+(seed-.5)*.009;
      if(project(x,z)<.79)continue;
      const start=positions.length/3,length=.029+seed*.012,width=.0065+seed*.002;
      for(let along=0;along<=7;along++)for(let across=0;across<=4;across++){
        const t=along/7,a=across/2-1;
        const vane=Math.sin(Math.PI*(.12+.88*t))**.65;
        project(x+a*width*vane+(seed-.5)*t*.007,z-t*length);
        p.addScaledVector(n,.0009+Math.sin(t*Math.PI)*.001*(1-a*a)+t**3*(.0015+seed*.002));
        p.applyMatrix4(skin.matrix);positions.push(p.x,p.y,p.z);
        const centre=kind==='brown'?(1-a*a)**3*Math.sin(t*Math.PI)**2*.48:0;
        c.multiplyScalar(.94+seed*.10-centre);colors.push(c.x,c.y,c.z);
        uv.push((a+1)*.025,t*.036);
        if(along<7&&across<4){const k=start+along*5+across;indices.push(k,k+5,k+1,k+1,k+5,k+6);}
      }
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mat=featherSurface(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,side:THREE.DoubleSide}),true);
  mat.bumpScale=.0007;
  const mesh=new THREE.Mesh(geometry,mat);mesh.name=head?'duck-head-down':'duck-contour-feathers';mesh.receiveShadow=true;mesh.castShadow=true;
  return mesh;
}
