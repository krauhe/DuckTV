import * as THREE from 'three';

/** Art-directed atmospheric gradient; sunlight direction matches the garden. */
export function createSky(scene:THREE.Scene){
 const uniforms={
  horizon:{value:new THREE.Color('#9edaf0')},zenith:{value:new THREE.Color('#4c99da')},
  warmth:{value:0},cloudCover:{value:0},sunDirection:{value:new THREE.Vector3(-8,0,4).normalize()},
 };
 const material=new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,depthTest:false,toneMapped:false,uniforms,
  vertexShader:`varying vec3 direction;
   void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`
   uniform vec3 horizon,zenith,sunDirection;uniform float warmth,cloudCover;varying vec3 direction;
   void main(){
    vec3 ray=normalize(direction);float elevation=max(0.0,ray.y);
    vec3 sky=mix(horizon,zenith,smoothstep(0.0,0.85,pow(elevation,0.65)));
    float facing=pow(max(0.0,dot(normalize(vec3(ray.x,0.001,ray.z)),sunDirection)),3.0);
    float glow=warmth*(0.45+0.55*facing);
    // Linear-light colors: coral horizon, peach above it, then cool twilight.
    vec3 warm=mix(vec3(0.78,0.13,0.09),vec3(1.0,0.49,0.25),smoothstep(0.0,0.22,elevation));
    sky=mix(sky,warm,glow*exp(-elevation*3.5));
    // Continuous soft overcast, including overhead and behind the viewer.
    float folds=sin(ray.x*13.0+sin(ray.z*9.0))*sin(ray.z*11.0+ray.y*7.0);
    sky*=1.0+folds*.055*smoothstep(.55,1.0,cloudCover);
    gl_FragColor=vec4(sky,1.0);
    #include <colorspace_fragment>
   }`,
 });
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(110,32,16),material);
 mesh.name='atmospheric-sky';mesh.frustumCulled=false;mesh.renderOrder=-10;
 mesh.onBeforeRender=(_renderer,_scene,camera)=>{mesh.position.copy(camera.position);mesh.updateMatrixWorld();};
 scene.add(mesh);
 const horizon=new THREE.Color(),zenith=new THREE.Color();
 let targetWarmth=0,targetCloud=0;
 return {
  set(light:number,cloud:number,sun:THREE.Vector3){
   targetCloud=cloud;
   targetWarmth=Math.pow(Math.max(0,Math.sin(Math.PI*light)),.7)*(1-cloud*.85);
   horizon.set('#9edaf0').lerp(new THREE.Color('#b9c0c3'),cloud).lerp(new THREE.Color('#182c49'),1-light);
   horizon.lerp(new THREE.Color('#df8c91'),targetWarmth*.45);
   zenith.set('#4c99da').lerp(new THREE.Color('#939da3'),cloud).lerp(new THREE.Color('#070e22'),1-light);
   zenith.lerp(new THREE.Color('#676b9a'),targetWarmth*.3);
   uniforms.sunDirection.value.set(sun.x,0,sun.z).normalize();
  },
  update(blend:number){
   uniforms.horizon.value.lerp(horizon,blend);uniforms.zenith.value.lerp(zenith,blend);
   uniforms.warmth.value=THREE.MathUtils.lerp(uniforms.warmth.value,targetWarmth,blend);
   uniforms.cloudCover.value=THREE.MathUtils.lerp(uniforms.cloudCover.value,targetCloud,blend);
  },
 };
}
