import './style.css';
import {gardenGroundHeight} from './shelter';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDuck } from './duck-model';
import { createFly } from './insect-model';
import { createEnvironment } from './environment';
import { createEggs } from './eggs';
import { Simulation } from './simulation';
import { getGistrupWeather } from './weather';
import { GARDEN, POND } from './types';
import { FeedGesture } from './pointer-gesture';
import { constrainGardenCamera } from './camera-bounds';
import { CameraFollow } from './camera-follow';
import { DuckAudio } from './duck-audio';
import { getDaylight, formatTime } from './daylight';
import {readPreferences,writePreferences,DEFAULT_PREFERENCES,type Preferences} from './preferences';

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
let preferenceStorage:Storage|undefined;
try{preferenceStorage=localStorage;}catch{/* Storage may be disabled. */}
const preferences=preferenceStorage?readPreferences(preferenceStorage):{...DEFAULT_PREFERENCES};
declare const __DUCK_AUDIO_AVAILABLE__:boolean;
if(!__DUCK_AUDIO_AVAILABLE__){preferences.sound=false;$('sound-toggle').hidden=true;}
const savePreferences=()=>{if(preferenceStorage)writePreferences(preferenceStorage,preferences);};
$<HTMLSelectElement>('weather').value=preferences.weather;
$<HTMLSelectElement>('time-mode').value=preferences.timeMode;
$<HTMLInputElement>('auto-follow').checked=preferences.autoFollow;
$('auto-follow').addEventListener('change',()=>{preferences.autoFollow=$<HTMLInputElement>('auto-follow').checked;savePreferences();});
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
const cameraKeys=new Set<string>();
const arrowKeys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
const keyboardForward=new THREE.Vector3();
document.addEventListener('keydown',e=>{
 if(!arrowKeys.has(e.key)||e.altKey||e.ctrlKey||e.metaKey)return;
 if(e.target instanceof Element&&e.target.closest('input,select,textarea,button,a,[contenteditable]'))return;
 e.preventDefault();cameraKeys.add(e.key);cameraFollow.manual(performance.now()/1000);
});
document.addEventListener('keyup',e=>{
 if(cameraKeys.delete(e.key)){e.preventDefault();cameraFollow.manual(performance.now()/1000);}
});
addEventListener('blur',()=>cameraKeys.clear());
function moveCameraWithKeys(dt:number,now:number){
 if(!cameraKeys.size)return;
 cameraFollow.manual(now);
 const forward=Number(cameraKeys.has('ArrowUp'))-Number(cameraKeys.has('ArrowDown'));
 const side=Number(cameraKeys.has('ArrowRight'))-Number(cameraKeys.has('ArrowLeft'));
 const length=Math.hypot(forward,side);
 if(!length)return;
 camera.getWorldDirection(keyboardForward);keyboardForward.y=0;keyboardForward.normalize();
 const step=1.25*dt/length;
 const dx=(keyboardForward.x*forward-keyboardForward.z*side)*step;
 const dz=(keyboardForward.z*forward+keyboardForward.x*side)*step;
 // Translate the camera and its aim equally; stop both at the garden boundary.
 const x=THREE.MathUtils.clamp(dx,
  Math.max(GARDEN.minX+.15-camera.position.x,GARDEN.minX+.7-controls.target.x),
  Math.min(GARDEN.maxX-.15-camera.position.x,GARDEN.maxX-.7-controls.target.x));
 const z=THREE.MathUtils.clamp(dz,
  Math.max(GARDEN.minZ+.15-camera.position.z,GARDEN.minZ+.7-controls.target.z),
  Math.min(GARDEN.maxZ-.15-camera.position.z,GARDEN.maxZ-.7-controls.target.z));
 camera.position.x+=x;camera.position.z+=z;controls.target.x+=x;controls.target.z+=z;
}
const cameraFollow=new CameraFollow();
cameraFollow.manual(performance.now()/1000);
controls.addEventListener('start',()=>cameraFollow.manual(performance.now()/1000,true));
controls.addEventListener('end',()=>cameraFollow.manual(performance.now()/1000));
addEventListener('blur',()=>cameraFollow.manual(performance.now()/1000));
canvas.addEventListener('pointercancel',()=>cameraFollow.manual(performance.now()/1000));
controls.enableDamping=true;controls.dampingFactor=.055;
controls.minDistance=1.6;controls.maxDistance=9;
controls.minPolarAngle=1.15;controls.maxPolarAngle=Math.PI*.48;
controls.enablePan=true;
controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
controls.screenSpacePanning=false;
controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
function resetView(){cameraFollow.manual(performance.now()/1000);camera.position.set(.2,1.65,3.8);controls.target.set(.1,.65,-.3);controls.update();constrainGardenCamera(camera,controls.target)}
resetView();
const environment=createEnvironment(scene);
const eggs=createEggs(scene);
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


const duckAudio=new DuckAudio(()=>{syncSoundButton();});
function syncSoundButton(){
 const button=$('sound-toggle');
 button.textContent=duckAudio.active?'Lyd til':'Lyd fra';
 button.setAttribute('aria-pressed',String(duckAudio.active));
 button.setAttribute('aria-label',duckAudio.active?'Slå andelyd fra':'Slå andelyd til');
}
let pendingSound=preferences.sound;
if(pendingSound){$('sound-toggle').textContent='Lyd til · afventer klik';$('sound-toggle').setAttribute('aria-pressed','true');}
$('sound-toggle').addEventListener('click',()=>{
 if(pendingSound){pendingSound=false;preferences.sound=false;}
 else{duckAudio.toggle(performance.now()/1000);preferences.sound=duckAudio.active;}
 savePreferences();syncSoundButton();
});
const restoreSound=(event:Event)=>{
 if(!pendingSound||event.target instanceof Element&&event.target.closest('#sound-toggle'))return;
 pendingSound=false;duckAudio.toggle(performance.now()/1000);syncSoundButton();
};
document.addEventListener('pointerdown',restoreSound);
document.addEventListener('keydown',restoreSound);
function cast(x:number,z:number){return sim.castFood(x,z)}
const feedGesture=new FeedGesture();
canvas.addEventListener('pointerdown',e=>feedGesture.down(e.pointerId,e.button,e.clientX,e.clientY,performance.now()));
canvas.addEventListener('pointermove',e=>{feedGesture.move(e.pointerId,e.clientX,e.clientY);if(e.pointerType==='touch')return;const p=pointAt(e.clientX,e.clientY);pointerRing.visible=!!p&&p.x>GARDEN.minX&&p.x<GARDEN.maxX&&p.z>GARDEN.minZ&&p.z<GARDEN.maxZ&&Math.hypot(p.x-POND.x,p.z-POND.z)>POND.radius+.3;if(p)pointerRing.position.set(p.x,.027,p.z)});
canvas.addEventListener('pointerleave',()=>pointerRing.visible=false);
canvas.addEventListener('pointercancel',e=>feedGesture.cancel(e.pointerId));
canvas.addEventListener('lostpointercapture',e=>feedGesture.cancel(e.pointerId));
addEventListener('blur',()=>feedGesture.reset());
canvas.addEventListener('pointerup',e=>{if(!feedGesture.up(e.pointerId,e.button,e.clientX,e.clientY,performance.now()))return;const p=pointAt(e.clientX,e.clientY);if(p)cast(p.x,p.z)});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('app').requestFullscreen()}catch{console.warn('Fuld skærm er ikke tilgængelig i denne browser.')}});
const dock=$('settings'),dockContent=$('dock-content');
let dockPinned=false;
function showDock(open:boolean){dock.classList.toggle('open',open);dockContent.inert=!open;$('dock-toggle').setAttribute('aria-expanded',String(open));}
dock.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')showDock(true)});
dock.addEventListener('pointerleave',()=>{if(!dockPinned&&!dock.contains(document.activeElement))showDock(false)});
dock.addEventListener('focusin',()=>showDock(true));
dock.addEventListener('focusout',()=>{setTimeout(()=>{if(!dockPinned&&!dock.contains(document.activeElement)&&!dock.matches(':hover'))showDock(false)},0)});
$('dock-toggle').addEventListener('click',()=>{dockPinned=!dockPinned;showDock(dockPinned)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){dockPinned=false;showDock(false);$('dock-toggle').focus();showDock(false)}});
const timeMode=$<HTMLSelectElement>('time-mode'),daySlider=$<HTMLInputElement>('day-time');
let dayMinutes=preferences.timeMode==='live'?getDaylight(new Date()).minutes:preferences.minutes??getDaylight(new Date()).minutes;
daySlider.value=String(Math.floor(dayMinutes));
let clockTick=1;
daySlider.addEventListener('input',()=>{timeMode.value='manual';dayMinutes=Number(daySlider.value);clockTick=1;preferences.timeMode='manual';preferences.minutes=dayMinutes;savePreferences();});
timeMode.addEventListener('change',()=>{clockTick=1;preferences.timeMode=timeMode.value as Preferences['timeMode'];preferences.minutes=dayMinutes;savePreferences();});
addEventListener('pagehide',()=>{preferences.minutes=dayMinutes;savePreferences();});
function updateDaylight(dt:number){
 if(timeMode.value==='cycle')dayMinutes=(dayMinutes+dt*1440/300)%1440;
 clockTick+=dt;if(clockTick<.2)return;clockTick=0;
 const day=getDaylight(new Date(),timeMode.value==='live'?undefined:dayMinutes);
 dayMinutes=day.minutes;daySlider.value=String(Math.floor(day.minutes));
 $('clock-label').textContent=formatTime(day.minutes);
 daySlider.setAttribute('aria-valuetext',formatTime(day.minutes));
 $('sun-times').textContent=`${day.dateLabel} · Sol op ${formatTime(day.sunrise)} · ned ${formatTime(day.sunset)}`;
 environment.setDaylight(day.light,THREE.MathUtils.clamp((day.minutes-day.sunrise)/(day.sunset-day.sunrise),0,1));
 sim.setNight(day.night);
}
function applyQuality(){
 const compact=matchMedia('(pointer:coarse)').matches || innerWidth<700;
 renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.25:1.6));
 renderer.shadowMap.enabled=true;
 renderer.setSize(innerWidth,innerHeight);
}

applyQuality();
let weatherGeneration=0;
async function weatherChanged(){
 const generation=++weatherGeneration;
 const mode=$<HTMLSelectElement>('weather').value;
 const preset=mode==='rain'?{cloud:95,wind:3,rain:1.5,isDay:true}:mode==='cloud'?{cloud:85,wind:2,rain:0,isDay:true}:{cloud:22,wind:1.5,rain:0,isDay:true};
 if(mode!=='live'){environment.setWeather(preset);$('weather-label').textContent=mode==='rain'?'En stille regnbyge':mode==='cloud'?'Under skyerne':'En rolig dag';return}
 $('weather-label').textContent='Henter Gistrup-vejr …';
 try{const result=await getGistrupWeather();if(generation!==weatherGeneration)return;environment.setWeather(result.weather);$('weather-label').textContent=result.label}
 catch{if(generation!==weatherGeneration)return;$('weather-label').textContent='Gistrup · vejr utilgængeligt'}
}
$('weather').addEventListener('change',()=>{preferences.weather=$<HTMLSelectElement>('weather').value as Preferences['weather'];savePreferences();void weatherChanged();});
setInterval(()=>{if($<HTMLSelectElement>('weather').value==='live'&&!document.hidden)void weatherChanged()},15*60_000);
void weatherChanged();
addEventListener('resize',()=>{fitCameraWidth();applyQuality()});
let last=performance.now();
const previousCameraPosition=new THREE.Vector3();
function frame(now:number){
 const dt=Math.min((now-last)/1000,.05);last=now;
 if(document.hidden)return;
 previousCameraPosition.copy(camera.position);
 moveCameraWithKeys(dt,now/1000);
 if(!$<HTMLInputElement>('auto-follow').checked||!cameraFollow.update(dt,now/1000,camera,controls.target,sim.ducks))controls.update();
 constrainGardenCamera(camera,controls.target,previousCameraPosition);
 sim.setViewer(camera.position.x,camera.position.z);
 updateDaylight(dt);sim.update(dt);environment.update(sim.time,dt);environment.setShelterDoor(sim.shelterDoor.closed);
 eggs.update(sim.time,dt,sim.ducks,camera);
 duckAudio.update(now/1000,sim.ducks.some(d=>d.state!=='sleep'),Math.min(...sim.ducks.filter(d=>d.state!=='sleep').map(d=>Math.hypot(d.x-camera.position.x,d.z-camera.position.z))));
 for(let i=0;i<sim.ducks.length;i++){
  const d=sim.ducks[i],m=duckModels[i];m.group.position.set(d.x,d.y,d.z);m.group.rotation.y=d.heading;
  const fly=insects[i];fly.group.visible=!!d.insect;
  if(d.insect){
   fly.group.position.set(d.insect.x+Math.sin(sim.time*29)*.035,.49+Math.sin(sim.time*19)*.045,d.insect.z+Math.cos(sim.time*23)*.035);
   fly.group.rotation.y=Math.sin(sim.time*.7+i)*.6;
   fly.wings.forEach((wing,index)=>wing.rotation.z=(index?1:-1)*Math.sin(sim.time*67)*.7);
  }
  m.animate({mouthOpen:d.mouthOpen,groundHeight:gardenGroundHeight,waterBob:d.state==='swim'?d.y-POND.waterY:0,speed:d.speed,time:sim.time+i*1.71,state:d.state,look:d.look,peck:d.peck,upright:d.upright,headTilt:d.headTilt,displayDip:d.displayDip,accelerationForward:d.ax*Math.sin(d.heading)+d.az*Math.cos(d.heading),accelerationSide:d.ax*Math.cos(d.heading)-d.az*Math.sin(d.heading),jumpProgress:d.jumpProgress,crouch:d.crouch,landing:d.landing});
  if(d.waterEntries>seenWaterEntries[i])environment.ripple(d.x,d.z,1.6);
  seenWaterEntries[i]=d.waterEntries;
  if(d.state==='swim'&&Math.random()<dt*3)environment.ripple(d.x,d.z,.25);
  if(d.state==='drink'&&d.speed<.03&&d.peck>.47&&Math.random()<dt*1.5)
    environment.ripple(d.x+Math.sin(d.heading)*.64,d.z+Math.cos(d.heading)*.64,.2);
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
 renderer.render(scene,camera);
 if(!crtStarted){crtStarted=true;$('app').classList.add('crt-on');crtCleanupTimer=window.setTimeout(finishCrt,6000);}
}
let crtStarted=false,crtCleanupTimer=0;
function finishCrt(){
 window.clearTimeout(crtCleanupTimer);
 $('app').classList.remove('crt-boot','crt-on');loading.remove();
}
canvas.addEventListener('animationend',event=>{if(event.animationName==='crt-picture'||event.animationName==='crt-reduced')finishCrt();});
renderer.setAnimationLoop(frame);
document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){duckAudio.stop();cameraKeys.clear();}});
// Read-only diagnostics for repeatable browser tests, not part of the visible UI.
Object.assign(window,{__andeTV:{sim,scene,camera,renderer,project:(x:number,z:number)=>{const p=new THREE.Vector3(x,0,z).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}}}});

