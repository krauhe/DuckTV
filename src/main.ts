import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDuck } from './duck-model';
import { createFly } from './insect-model';
import { createEnvironment } from './environment';
import { Simulation } from './simulation';
import { getGistrupWeather } from './weather';
import { GARDEN, POND } from './types';
import { FeedGesture } from './pointer-gesture';
import { constrainGardenCamera } from './camera-bounds';

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('garden');
const loading=$('loading');
let renderer:THREE.WebGLRenderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'})}
catch{loading.classList.add('error');loading.textContent='Denne browser kunne ikke starte 3D-haven. Prøv en opdateret browser med WebGL slået til.';throw new Error('WebGL unavailable')}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,150);
function fitCameraWidth(){
 camera.aspect=innerWidth/innerHeight;
 // Keep a useful view on narrow screens without moving the camera beyond the hedge.
 const verticalFov=2*Math.atan(Math.tan(THREE.MathUtils.degToRad(34))/camera.aspect);
 camera.fov=THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(verticalFov),55,100);
 camera.updateProjectionMatrix();
}
fitCameraWidth();
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.055;
controls.minDistance=1.6;controls.maxDistance=9;
controls.minPolarAngle=1.15;controls.maxPolarAngle=Math.PI*.48;
controls.enablePan=true;
controls.screenSpacePanning=false;
controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
function resetView(){camera.position.set(.2,1.65,3.8);controls.target.set(.1,.65,-.3);controls.update();constrainGardenCamera(camera,controls.target)}
resetView();
const environment=createEnvironment(scene);
const sim=new Simulation();
const duckModels=sim.ducks.map(d=>{const m=createDuck(d.kind);scene.add(m.group);return m});
const seenWaterEntries=sim.ducks.map(()=>0);
const insects=sim.ducks.map(()=>{const fly=createFly();scene.add(fly.group);return fly});

// A tiny spiral of pasta: actual 3D helix, shared geometry across pieces.
class FusilliCurve extends THREE.Curve<THREE.Vector3>{constructor(){super()}getPoint(t:number,target=new THREE.Vector3()){return target.set(Math.cos(t*Math.PI*7)*.028,(t-.5)*.18,Math.sin(t*Math.PI*7)*.028)}}
const pastaGeometry=new THREE.TubeGeometry(new FusilliCurve(),32,.016,5,false);
const pastaMaterial=new THREE.MeshStandardMaterial({color:0xe9c779,roughness:.85});
const foods=new Map<string,THREE.Mesh>();
const foodRotations=new Map<string,number>();
const raycaster=new THREE.Raycaster();const mouse=new THREE.Vector2();
const pointerRing=new THREE.Mesh(new THREE.RingGeometry(.19,.215,36),new THREE.MeshBasicMaterial({color:0xfff0b4,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));
pointerRing.rotation.x=-Math.PI/2;pointerRing.position.y=.025;pointerRing.visible=false;scene.add(pointerRing);
const pointAt=(clientX:number,clientY:number)=>{const r=canvas.getBoundingClientRect();mouse.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);return raycaster.intersectObject(environment.ground,false)[0]?.point};
let toastUntil=0;
function toast(text:string){$('toast').textContent=text;toastUntil=performance.now()+6000}
let lastCast=0;
function cast(x:number,z:number){
 if(sim.castFood(x,z)){lastCast=performance.now();toast('Et lille kast. Hunnerne nærmer sig, når de tør.');return true}
 if(Math.hypot(x-POND.x,z-POND.z)<POND.radius+.35)toast('Kast på græsset ved siden af bassinet.');
 else toast('Giv flokken et øjeblik, og kast lidt på græsset.');
 return false;
}
const feedGesture=new FeedGesture();
canvas.addEventListener('pointerdown',e=>feedGesture.down(e.pointerId,e.button,e.clientX,e.clientY,performance.now()));
canvas.addEventListener('pointermove',e=>{feedGesture.move(e.pointerId,e.clientX,e.clientY);if(e.pointerType==='touch')return;const p=pointAt(e.clientX,e.clientY);pointerRing.visible=!!p&&p.x>GARDEN.minX&&p.x<GARDEN.maxX&&p.z>GARDEN.minZ&&p.z<GARDEN.maxZ&&Math.hypot(p.x-POND.x,p.z-POND.z)>POND.radius+.3;if(p)pointerRing.position.set(p.x,.027,p.z)});
canvas.addEventListener('pointerleave',()=>pointerRing.visible=false);
canvas.addEventListener('pointercancel',e=>feedGesture.cancel(e.pointerId));
canvas.addEventListener('lostpointercapture',e=>feedGesture.cancel(e.pointerId));
addEventListener('blur',()=>feedGesture.reset());
canvas.addEventListener('pointerup',e=>{if(!feedGesture.up(e.pointerId,e.button,e.clientX,e.clientY,performance.now()))return;const p=pointAt(e.clientX,e.clientY);if(p)cast(p.x,p.z)});
$('feed').addEventListener('click',()=>cast(-1.4+Math.random()*.7,1.4+Math.random()*.6));
$('reset-view').addEventListener('click',resetView);
$('restart').addEventListener('click',()=>{sim.reset();toast('En ny rolig stund i haven.');lastCast=0});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('app').requestFullscreen()}catch{toast('Fuld skærm er ikke tilgængelig i denne browser.')}});
$('settings-toggle').addEventListener('click',()=>{const panel=$('settings');panel.hidden=!panel.hidden;$('settings-toggle').setAttribute('aria-expanded',String(!panel.hidden))});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('settings').hidden=true;$('settings-toggle').setAttribute('aria-expanded','false')}});
$<HTMLSelectElement>('quality').addEventListener('change',e=>{const q=(e.target as HTMLSelectElement).value;renderer.setPixelRatio(q==='low'?1:Math.min(devicePixelRatio,q==='high'?2:1.6));renderer.shadowMap.enabled=q!=='low';renderer.setSize(innerWidth,innerHeight)});
let weatherGeneration=0;
async function weatherChanged(){
 const generation=++weatherGeneration;
 const mode=$<HTMLSelectElement>('weather').value;
 const preset=mode==='rain'?{cloud:95,wind:3,rain:1.5,isDay:true}:mode==='cloud'?{cloud:85,wind:2,rain:0,isDay:true}:{cloud:22,wind:1.5,rain:0,isDay:true};
 if(mode!=='live'){environment.setWeather(preset);$('weather-label').textContent=mode==='rain'?'En stille regnbyge':mode==='cloud'?'Under skyerne':'En rolig dag';return}
 $('weather-label').textContent='Henter Gistrup-vejr …';
 try{const result=await getGistrupWeather();if(generation!==weatherGeneration)return;environment.setWeather(result.weather);$('weather-label').textContent=result.label}
 catch{if(generation!==weatherGeneration)return;$('weather-label').textContent='Gistrup · vejr utilgængeligt';toast('Vejret kunne ikke hentes. Haven fortsætter med sit seneste vejr.')}
}
$('weather').addEventListener('change',weatherChanged);
setInterval(()=>{if($<HTMLSelectElement>('weather').value==='live'&&!document.hidden)void weatherChanged()},15*60_000);
void weatherChanged();
addEventListener('resize',()=>{fitCameraWidth();renderer.setSize(innerWidth,innerHeight)});
let last=performance.now();let statusTick=0;
function frame(now:number){
 const dt=Math.min((now-last)/1000,.05);last=now;
 if(document.hidden)return;
 sim.setViewer(camera.position.x,camera.position.z);
 sim.update(dt);environment.update(sim.time,dt);
 for(let i=0;i<sim.ducks.length;i++){
  const d=sim.ducks[i],m=duckModels[i];m.group.position.set(d.x,d.y,d.z);m.group.rotation.y=d.heading;
  const fly=insects[i];fly.group.visible=!!d.insect;
  if(d.insect){
   fly.group.position.set(d.insect.x+Math.sin(sim.time*29)*.035,.49+Math.sin(sim.time*19)*.045,d.insect.z+Math.cos(sim.time*23)*.035);
   fly.group.rotation.y=d.heading;
   fly.wings.forEach((wing,index)=>wing.rotation.z=(index?1:-1)*Math.sin(sim.time*67)*.7);
  }
  m.animate({speed:d.speed,time:sim.time+i*1.71,state:d.state,look:d.look,peck:d.peck,upright:d.upright,headTilt:d.headTilt,displayDip:d.displayDip,accelerationForward:d.ax*Math.sin(d.heading)+d.az*Math.cos(d.heading),accelerationSide:d.ax*Math.cos(d.heading)-d.az*Math.sin(d.heading),jumpProgress:d.jumpProgress,crouch:d.crouch,landing:d.landing});
  if(d.waterEntries>seenWaterEntries[i])environment.ripple(d.x,d.z,1.6);
  seenWaterEntries[i]=d.waterEntries;
  if(d.state==='swim'&&Math.random()<dt*3)environment.ripple(d.x,d.z,.25);
 }
 const liveIds=new Set<string>();
 for(const f of sim.foods){
  if(f.eaten)continue;liveIds.add(f.id);let mesh=foods.get(f.id);
  if(!mesh){mesh=new THREE.Mesh(pastaGeometry,pastaMaterial);mesh.castShadow=true;foods.set(f.id,mesh);foodRotations.set(f.id,Math.random()*Math.PI*2);scene.add(mesh)}
  const t=Math.min(f.age/.65,1),angle=foodRotations.get(f.id)||0;
  const y=t<1?.045+(1-t)*2.2+Math.sin(t*Math.PI)*1.2:.045;
  mesh.position.set(f.x+(1-t)*.6,y,f.z+(1-t)*1.4);
  mesh.rotation.set(Math.PI/2+(1-t)*4,angle,(1-t)*3);
 }
 for(const [id,mesh] of foods)if(!liveIds.has(id)){scene.remove(mesh);foods.delete(id);foodRotations.delete(id)}
 statusTick+=dt;
 if(statusTick>.4){statusTick=0;const eating=sim.ducks.some(d=>d.state==='eat'),approach=sim.ducks.some(d=>d.state==='notice'||d.state==='approach'),swimming=sim.ducks.some(d=>d.state==='swim');$('flock-status').textContent=sim.courtship?(sim.courtship.mutualDisplay?'Hunnen svarer på hannens duk':'Hannen gør kur med rytmiske duk'):eating?'Hunnerne spiser · hannen holder vagt':approach?'Nysgerrighed kræver lidt mod':sim.ducks.some(d=>d.state==='chase')?'På jagt efter en flue':sim.ducks.some(d=>d.state==='forage')?'Næbbet på opdagelse i jorden':swimming?'En tur i det blå bassin':sim.ducks.some(d=>d.state==='preen')?'En stille stund med fjerpudsning':sim.ducks.some(d=>d.state==='sleep')?'En lille lur med hovedet ved vingen':'Flokken udforsker haven';if(now>toastUntil&&now-lastCast>6000)$('toast').textContent='De tager sig god tid. Lad dem komme til dig.'}
 controls.update();constrainGardenCamera(camera,controls.target);renderer.render(scene,camera);
}
renderer.setAnimationLoop(frame);
document.addEventListener('visibilitychange',()=>last=performance.now());
loading.classList.add('done');setTimeout(()=>loading.remove(),700);
// Read-only diagnostics for repeatable browser tests, not part of the visible UI.
Object.assign(window,{__andeTV:{sim,scene,camera,renderer,project:(x:number,z:number)=>{const p=new THREE.Vector3(x,0,z).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}}}});
