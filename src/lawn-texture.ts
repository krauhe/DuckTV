import * as THREE from 'three';

/** Fine blades, flattened straw and irregular soil/moss marks in a repeating lawn tile. */
export function lawnTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const ctx=canvas.getContext('2d')!;
  let seed=7341;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  ctx.fillStyle='#648b43';ctx.fillRect(0,0,1024,1024);
  for(let i=0;i<130;i++){
    const x=random()*1024,y=random()*1024,r=15+random()*90;
    const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
    gradient.addColorStop(0,i%3===0?'#61533665':'#31542855');gradient.addColorStop(1,'#49653900');
    ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  for(let i=0;i<40000;i++){
    const x=random()*1024,y=random()*1024,length=2+random()*12,angle=random()*Math.PI*2;
    const dry=random()<.12;
    ctx.strokeStyle=dry?`rgba(164,151,92,${.2+random()*.3})`:`hsla(${78+random()*25},${25+random()*20}%,${23+random()*27}%,.65)`;
    ctx.lineWidth=.6+random()*1.2;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.cos(angle+.3)*length*.5,y+Math.sin(angle+.3)*length*.5,x+Math.cos(angle)*length,y+Math.sin(angle)*length);ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(160/3,160/3);texture.anisotropy=8;
  return texture;
}

export function lawnMarkMask(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='black';ctx.fillRect(0,0,128,128);
  const fade=ctx.createRadialGradient(64,64,10,64,64,64);fade.addColorStop(0,'white');fade.addColorStop(.5,'#777');fade.addColorStop(1,'black');
  ctx.fillStyle=fade;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(canvas);
}
