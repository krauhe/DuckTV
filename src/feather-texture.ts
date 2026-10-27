import * as THREE from 'three';

const cache = new Map<string, {color:THREE.DataTexture; relief:THREE.DataTexture; roughness:THREE.DataTexture}>();

/** Small repeating feather vanes; neutral pigment preserves each bird's markings. */
export function featherTexture(fine=false,mottled=false){
 const key=`${fine?'fine':'body'}-${mottled}`;const existing=cache.get(key);if(existing)return existing;
 const size=1024,color=new Uint8Array(size*size*4),relief=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
 const columns=fine?24:mottled?24:14,rows=fine?32:mottled?14:20;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const v=y/size*rows,row=Math.floor(v),fy=v-row;
  const u=x/size*columns+(row%2)*.5,fx=u-Math.floor(u)-.5;
  const variation=((Math.floor(u)*17+row*31)%13)/13;

  // 1. Feather scallop rim and overlap shadow
  const scallopBorder = 0.72 - 1.6 * fx * fx + variation * 0.08;
  const overlapShadow = Math.exp(-Math.max(0, fy - scallopBorder) / 0.07) * (fy > scallopBorder ? 0.38 : 0);
  const rimHighlight = Math.exp(-Math.pow((fy - scallopBorder) / 0.032, 2)) * 0.28;

  // 2. Central quill / shaft with pale highlight and groove
  const quill = Math.exp(-fx * fx / 0.0010) * Math.sin(fy * Math.PI);
  const quillGroove = Math.exp(-Math.pow(Math.abs(fx) - 0.016, 2) / 0.0008) * 0.18;

  // 3. Diagonal feather barbs fanning outward
  const barbWave = Math.sin((fy + Math.abs(fx) * 0.70) * Math.PI * 26) * 0.5 + 0.5;
  const barbRelief = (barbWave - 0.5) * 0.16;
  const noise = ((Math.imul(x + 13, y + 71) * 37) >>> 0) % 101 / 100;

  // 4. Mottled / penciled markings (for Andedorte / brown runner)
  // Bold, authentic concentric crescent feather penciling
  const crescentRing = Math.exp(-Math.pow((Math.hypot(fx * 1.9, fy - 0.44) - 0.28) / 0.065, 2)) * 0.46;
  const darkCore = Math.exp(-fx * fx / (0.006 + 0.010 * Math.sin(fy * Math.PI) ** 2)) * Math.sin(fy * Math.PI) ** 1.8;
  const mottledPattern = mottled ? (darkCore * 0.55 + crescentRing * 0.40) * (0.8 + variation * 0.4) : 0;

  // 5. Final color shade with rich, clear contrast
  const baseShade = 0.94 + rimHighlight - overlapShadow - quillGroove + barbRelief - mottledPattern;
  const shade = Math.max(0.20, Math.min(1.28, baseShade + (noise - 0.5) * 0.035));

  // 6. 3D surface relief
  const height = Math.max(0.08, Math.min(0.96, 0.52 - overlapShadow * 0.58 + rimHighlight * 0.45 + quill * 0.35 + barbRelief * 0.6));

  const i=(y*size+x)*4;
  color[i]=color[i+1]=color[i+2]=Math.round(shade*255);color[i+3]=255;
  relief[i]=relief[i+1]=relief[i+2]=Math.round(height*255);relief[i+3]=255;
  roughness[i]=roughness[i+1]=roughness[i+2]=Math.round((.76+overlapShadow*.18-barbRelief*.12)*255);roughness[i+3]=255;
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
 mat.bumpScale=fine?.003:.009;
 if (mat instanceof THREE.MeshPhysicalMaterial) {
  if (mat.sheen === 0 || mat.sheen === undefined) {
   mat.sheen = 0.68;
   mat.sheenRoughness = 0.42;
   mat.sheenColor = new THREE.Color('#dcd4c8');
  }
 }
 return mat;
}

let legScales:THREE.DataTexture|undefined;
/** Fine transverse scutes, separate from the feather material and foot web. */
export function legSurface(mat:THREE.MeshStandardMaterial){
 if(!legScales){
  const width=128,height=256,bytes=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const row=Math.floor(y/8),v=(y%8)/8,u=(x/width*7+(row%2)*.5)%1;
   const border=Math.exp(-Math.pow((v-.1)/.1,2))+Math.exp(-Math.pow((u-.03)/.045,2))*.4;
   const grain=Math.sin(x*1.7+y*2.3)*.02;
   const value=Math.round(255*Math.max(.65,.97-border*.16+grain)),i=(y*width+x)*4;
   bytes[i]=bytes[i+1]=bytes[i+2]=value;bytes[i+3]=255;
  }
  legScales=new THREE.DataTexture(bytes,width,height);legScales.wrapS=legScales.wrapT=THREE.RepeatWrapping;
  legScales.magFilter=THREE.LinearFilter;legScales.minFilter=THREE.LinearMipmapLinearFilter;legScales.generateMipmaps=true;legScales.needsUpdate=true;
 }
 mat.map=legScales;mat.bumpMap=legScales;mat.bumpScale=.0012;mat.roughness=.68;
 if (mat instanceof THREE.MeshPhysicalMaterial) {
  mat.clearcoat = 0.22;
  mat.clearcoatRoughness = 0.35;
 }
 return mat;
}
