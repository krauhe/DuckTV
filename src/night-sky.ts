import * as THREE from 'three';
import {STAR_CATALOG} from './star-catalog';
import {celestialFrame} from './celestial';

export function createNightSky(scene:THREE.Scene){
 const positions=new Float32Array(STAR_CATALOG.length*3),colors=new Float32Array(positions.length),sizes=new Float32Array(STAR_CATALOG.length);
 STAR_CATALOG.forEach((s,i)=>{
  const warmth=THREE.MathUtils.clamp((s[3]+.1)/2,0,1),brightness=THREE.MathUtils.clamp(1.2-s[2]*.10,.55,1);
  new THREE.Color().setRGB(1,1-warmth*.2,1-warmth*.4).multiplyScalar(brightness).toArray(colors,i*3);
  sizes[i]=THREE.MathUtils.clamp(5.5-s[2]*.55,2.2,6);
 });
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 geometry.setAttribute('size',new THREE.BufferAttribute(sizes,1));
 const starMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
  uniforms:{opacity:{value:0},pixelRatio:{value:1}},
  vertexShader:`attribute vec3 color;attribute float size;uniform float pixelRatio;varying vec3 tint;varying float elevation;
   void main(){tint=color;elevation=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=size*pixelRatio;}`,
  fragmentShader:`uniform float opacity;varying vec3 tint;varying float elevation;
   void main(){if(elevation<0.)discard;float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.15,1.,r))*opacity*smoothstep(0.,5.,elevation);gl_FragColor=vec4(tint,a);
    #include <colorspace_fragment>
   }`,
 });
 const stars=new THREE.Points(geometry,starMaterial);stars.name='night-stars';stars.frustumCulled=false;stars.renderOrder=-2;scene.add(stars);
 const moonMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
  uniforms:{sunlight:{value:new THREE.Vector3()},opacity:{value:0}},
  vertexShader:`varying vec3 n;void main(){n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 sunlight;uniform float opacity;varying vec3 n;
   void main(){vec3 normal=normalize(n);float lit=smoothstep(-.012,.035,dot(normal,sunlight));
    float terrain=.87+.07*sin(normal.x*23.+sin(normal.y*17.))*sin(normal.z*29.)+.06*sin(normal.y*9.+normal.z*13.);
    gl_FragColor=vec4(vec3(.92,.93,.88)*terrain*(.022+.978*lit),opacity);
    #include <colorspace_fragment>
   }`,
 });
 const moon=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),moonMaterial);moon.name='gistrup-moon';moon.renderOrder=-1;moon.frustumCulled=false;scene.add(moon);
 const moonOffset=new THREE.Vector3();let sunAltitude=90,moonAltitude=-90,lastDate=NaN;
 stars.onBeforeRender=(renderer,_scene,camera)=>{stars.position.copy(camera.position);stars.updateMatrixWorld();starMaterial.uniforms.pixelRatio.value=renderer.getPixelRatio();};
 moon.onBeforeRender=(_renderer,_scene,camera)=>{moon.position.copy(camera.position).add(moonOffset);moon.updateMatrixWorld();};
 return {
  setDate(date:Date){
   if(Math.abs(date.getTime()-lastDate)<15000)return;
   lastDate=date.getTime();const frame=celestialFrame(date);
   STAR_CATALOG.forEach((s,i)=>frame.star(s[0],s[1]).multiplyScalar(65).toArray(positions,i*3));
   geometry.attributes.position.needsUpdate=true;
   moonOffset.copy(frame.moonDirection).multiplyScalar(65);moon.scale.setScalar(frame.moonRadius);
   moonMaterial.uniforms.sunlight.value.copy(frame.sunlight);moonAltitude=frame.moonDirection.y;
   sunAltitude=frame.sunAltitude;moon.userData.illumination=frame.illumination;
  },
  update(cloud:number,blend:number){
   const clear=Math.pow(1-THREE.MathUtils.clamp(cloud/100,0,1),1.5);
   const darkness=1-THREE.MathUtils.smoothstep(sunAltitude,-12,-4);
   starMaterial.uniforms.opacity.value=THREE.MathUtils.lerp(starMaterial.uniforms.opacity.value,darkness*clear,blend);
   moonMaterial.uniforms.opacity.value=THREE.MathUtils.lerp(moonMaterial.uniforms.opacity.value,clear*(sunAltitude>0?.6:1),blend);
   stars.visible=starMaterial.uniforms.opacity.value>.002;
   moon.visible=moonAltitude>0&&moonMaterial.uniforms.opacity.value>.002;
  },
 };
}
