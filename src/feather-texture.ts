import * as THREE from 'three';

const cache = new Map<string, {color:THREE.DataTexture; relief:THREE.DataTexture; roughness:THREE.DataTexture}>();

/** Small repeating feather vanes; neutral pigment preserves each bird's markings. */
export function featherTexture(fine=false,mottled=false){
 const key=`${fine?'fine':'body'}-${mottled}`;const existing=cache.get(key);if(existing)return existing;
 const size=512,color=new Uint8Array(size*size*4),relief=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
 const columns=fine?20:12,rows=fine?28:18;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const v=y/size*rows,row=Math.floor(v),fy=v-row;
  const u=x/size*columns+(row%2)*.5,fx=u-Math.floor(u)-.5;
  const variation=((Math.floor(u)*17+row*31)%13)/13;
  const edge=Math.exp(-Math.pow((fy-(.70-1.8*fx*fx+variation*.10))/.04,2));
  const shaft=Math.exp(-fx*fx/.0018)*Math.sin(fy*Math.PI);
  const barbs=Math.sin((fy+Math.abs(fx)*.7)*Math.PI*18)*.5+.5;
  const noise=((Math.imul(x+13,y+71)*37)>>>0)%101/100;
  // Dark centres and pale feather margins break up the brown birds' plumage.
  // Keep the white bird neutral so its existing crown markings remain distinct.
  const pigment=mottled?Math.exp(-fx*fx/.065)*Math.pow(Math.sin(fy*Math.PI),2)*(.16+variation*.16):0;
  const shade=Math.max(0,Math.min(1,.97-edge*.14-shaft*.045+barbs*.024+(noise-.5)*.035-pigment));
  const height=Math.max(0,Math.min(1,.48-edge*.16+shaft*.12+barbs*.055));
  const i=(y*size+x)*4;
  color[i]=color[i+1]=color[i+2]=Math.round(shade*255);color[i+3]=255;
  relief[i]=relief[i+1]=relief[i+2]=Math.round(height*255);relief[i+3]=255;
  roughness[i]=roughness[i+1]=roughness[i+2]=Math.round((.88+edge*.09-barbs*.08)*255);roughness[i+3]=255;
 }
 const texture=(bytes:Uint8Array)=>{
  const t=new THREE.DataTexture(bytes,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;
  t.anisotropy=4;t.needsUpdate=true;return t;
 };
 const result={color:texture(color),relief:texture(relief),roughness:texture(roughness)};result.color.colorSpace=THREE.SRGBColorSpace;
 cache.set(key,result);return result;
}

export function featherSurface(mat:THREE.MeshStandardMaterial,fine=false,mottled=false){
 const maps=featherTexture(fine,mottled);mat.map=maps.color;mat.bumpMap=maps.relief;
 mat.roughnessMap=maps.roughness;
 mat.bumpScale=fine?.001:.0026;return mat;
}
