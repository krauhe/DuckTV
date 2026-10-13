/** Hækkens løv: små overlappende skud og foldede blade, samlet i to draw calls. */
import * as THREE from 'three';

export function createHedgeDetails(positions:ReadonlyArray<readonly [number,number,number,number]>,coreMaterial:THREE.MeshStandardMaterial):THREE.Group{
 const group=new THREE.Group();group.name='hedge-foliage';
 // Egen seed holder resten af havens tilfældige detaljer uændrede.
 let seed=81023;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 const shootsPerBush=36,leavesPerShoot=24;
 // Et diskret bladmønster bryder de store flader mellem de fritstående blade.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#718570';ctx.fillRect(0,0,256,256);
 for(let i=0;i<360;i++){
  const x=rand()*256,y=rand()*256,angle=rand()*Math.PI;
  const tone=Math.floor(115+rand()*115);
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=`rgb(${tone},${tone},${tone})`;
  ctx.beginPath();ctx.ellipse(0,0,4+rand()*4,8+rand()*7,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#51614d';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(0,8);ctx.stroke();ctx.restore();
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const coreTexture=texture.clone();coreTexture.wrapS=coreTexture.wrapT=THREE.RepeatWrapping;coreTexture.repeat.set(4,3);
 coreMaterial.map=coreTexture;coreMaterial.needsUpdate=true;
 const shoots=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0xffffff,map:texture,roughness:1}),positions.length*shootsPerBush);
 shoots.name='hedge-leaf-clusters';shoots.castShadow=true;shoots.receiveShadow=true;
 // En lille midterfold giver bladet to forskellige lysflader uden billedteksturer.
 const leaf=new THREE.BufferGeometry();
 leaf.setAttribute('position',new THREE.Float32BufferAttribute([
  0,0,0, -.045,.06,0, 0,.065,.018,
  -.045,.06,0, 0,.13,0, 0,.065,.018,
  0,0,0, 0,.065,.018, .045,.06,0,
  .045,.06,0, 0,.065,.018, 0,.13,0,
 ],3));leaf.computeVertexNormals();
 const leaves=new THREE.InstancedMesh(leaf,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,side:THREE.DoubleSide}),shoots.count*leavesPerShoot);
 leaves.name='hedge-individual-leaves';leaves.receiveShadow=true;
 let shootIndex=0,leafIndex=0;
 for(const [x,z,y,size] of positions){
  // De synlige skud vender ind mod haven; enkelte går op over den klippede top.
  const inward=new THREE.Vector3(-x,0,-z);
  if(Math.abs(x)>Math.abs(z)+.5)inward.set(-Math.sign(x),0,0);else inward.set(0,0,-Math.sign(z));
  const tangent=new THREE.Vector3(-inward.z,0,inward.x);
  for(let j=0;j<shootsPerBush;j++){
   const elevation=-.85+rand()*2.2,side=(rand()-.5)*1.9;
   const shell=Math.sqrt(Math.max(.05,1-(elevation/1.5)**2-(side/1.3)**2));
   const centre=new THREE.Vector3(x,y+elevation*size,z).addScaledVector(inward,1.15*size*shell).addScaledVector(tangent,side*size);
   const radius=.13+rand()*.13;
   dummy.position.copy(centre);dummy.rotation.set(rand(),rand()*Math.PI*2,rand());dummy.scale.set(radius*(.85+rand()*.4),radius*(.8+rand()*.5),radius);
   dummy.updateMatrix();shoots.setMatrixAt(shootIndex,dummy.matrix);
   const light=.08+rand()*.055+Math.max(0,elevation)*.02;
   color.setHSL(.27+rand()*.055,.34+rand()*.16,light+.045);shoots.setColorAt(shootIndex++,color);
   for(let k=0;k<leavesPerShoot;k++){
    const normal=new THREE.Vector3(rand()-.5,rand()-.3,rand()-.5).normalize();
    dummy.position.copy(centre).addScaledVector(normal,radius*(1.05+rand()*.2));
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
    dummy.rotateZ(rand()*Math.PI*2);
    const leafSize=.8+rand()*.65;dummy.scale.set(leafSize,leafSize,leafSize);
    dummy.updateMatrix();leaves.setMatrixAt(leafIndex,dummy.matrix);
    color.setHSL(.25+rand()*.075,.35+rand()*.2,light+.005+rand()*.035);leaves.setColorAt(leafIndex++,color);
   }
  }
 }
 shoots.computeBoundingSphere();leaves.computeBoundingSphere();
 group.add(shoots,leaves);return group;
}
