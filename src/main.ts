import './style.css';
import {startAnalytics} from './analytics';
import {gardenGroundHeight} from './shelter';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDuck } from './duck-model';
import { createFly } from './insect-model';
import { createEnvironment } from './environment';
import { createEggs } from './eggs';
import { createForageHoles } from './forage-holes';
import { Simulation } from './simulation';
import { getGistrupWeather } from './weather';
import { GARDEN, POND } from './types';
import { FeedGesture } from './pointer-gesture';
import { constrainGardenCamera } from './camera-bounds';
import { CameraFollow } from './camera-follow';
import { getDaylight, getSceneDate, formatTime } from './daylight';
import {initialPreferences,writePreferences,type Preferences} from './preferences';
import {BackgroundMusic} from './background-music';
import {BehaviorNotices, DUCK_NAMES, DUCK_ACTIONS} from './behavior-notices';
import {DUCK_PROFILES} from './duck-profiles';

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
startAnalytics();
let preferenceStorage:Storage|undefined;
try{preferenceStorage=localStorage;}catch{/* Storage may be disabled. */}
const preferences=initialPreferences(preferenceStorage,new Date());
const savePreferences=()=>{if(preferenceStorage)writePreferences(preferenceStorage,preferences);};
const behaviorNotices=new BehaviorNotices($('behavior-notices'));
const behaviorSwitch=$<HTMLInputElement>('behavior-toggle');
behaviorSwitch.checked=preferences.showBehavior;
behaviorSwitch.addEventListener('change',()=>{preferences.showBehavior=behaviorSwitch.checked;savePreferences();if(!preferences.showBehavior)behaviorNotices.clear();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)behaviorNotices.clear();});
const musicSwitch=$<HTMLInputElement>('music-toggle');
musicSwitch.checked=preferences.music;
const music=new BackgroundMusic(new Audio(new URL('audio/music/Tropical-Pixel-Lounge.mp3',document.baseURI).href),preferences.music,message=>{$('music-note').textContent=message;$('music-note').hidden=!message;});
musicSwitch.addEventListener('change',()=>{preferences.music=musicSwitch.checked;savePreferences();music.setEnabled(preferences.music);});
// Browseren kræver et tryk eller tastetryk før første afspilning.
document.addEventListener('pointerup',e=>{if(!(e.target instanceof Element&&e.target.closest('#music-toggle')))music.start();});
document.addEventListener('keydown',e=>{if(!e.repeat&&!(e.target instanceof Element&&e.target.closest('#music-toggle')))music.start();});
document.addEventListener('visibilitychange',()=>music.setVisible(!document.hidden));
addEventListener('pagehide',()=>music.setVisible(false));
addEventListener('pageshow',()=>music.setVisible(!document.hidden));
$<HTMLSelectElement>('weather').value=preferences.weather;
$<HTMLSelectElement>('time-mode').value=preferences.timeMode;
$<HTMLInputElement>('auto-follow').checked=preferences.autoFollow;
$('auto-follow').addEventListener('change',()=>{preferences.autoFollow=$<HTMLInputElement>('auto-follow').checked;cameraFollow.reset();savePreferences();});
const fpsCounter = $('fps-counter');
const fpsVal = $('fps-val');
const fpsSwitch = $<HTMLInputElement>('fps-toggle');
if (fpsSwitch && fpsCounter) {
 fpsSwitch.checked = Boolean(preferences.showFps);
 fpsCounter.hidden = !preferences.showFps;
 fpsSwitch.addEventListener('change', () => {
  preferences.showFps = fpsSwitch.checked;
  fpsCounter.hidden = !preferences.showFps;
  savePreferences();
 });
}
const fpsLimitSwitch = $<HTMLInputElement>('fps-limit-toggle');
if (fpsLimitSwitch) {
 fpsLimitSwitch.checked = preferences.cap30Fps !== false;
 fpsLimitSwitch.addEventListener('change', () => {
  preferences.cap30Fps = fpsLimitSwitch.checked;
  savePreferences();
 });
}

let focusedDuckId: string | null = null;
const focusCard = $('duck-focus-card');
const focusName = $('duck-focus-name');
const focusTitle = $('duck-focus-title');
const focusStatus = $('duck-focus-status');
const focusClose = $('duck-focus-close');

function setFocusedDuck(id: string | null) {
  focusedDuckId = id;
  cameraFollow.reset();
  if (!id) {
    focusCard.hidden = true;
    return;
  }
  const duck = sim.ducks.find(d => d.id === id);
  if (!duck) {
    focusCard.hidden = true;
    return;
  }
  focusName.textContent = DUCK_NAMES[duck.kind];
  focusTitle.textContent = DUCK_PROFILES[duck.kind].label;
  const act = DUCK_ACTIONS[duck.state];
  focusStatus.textContent = act ? act.charAt(0).toUpperCase() + act.slice(1) : '';
  focusCard.hidden = false;
}
focusClose.addEventListener('click', e => {
  e.stopPropagation();
  setFocusedDuck(null);
});
const canvas=$<HTMLCanvasElement>('garden');
const loading=$('loading');
let renderer:THREE.WebGLRenderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'})}
catch{loading.classList.add('error');loading.textContent='Denne browser kunne ikke starte 3D-haven. Prøv en opdateret browser med WebGL slået til.';throw new Error('WebGL unavailable')}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
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
controls.addEventListener('start',()=>cameraFollow.manual(performance.now()/1000,true));
controls.addEventListener('end',()=>cameraFollow.manual(performance.now()/1000));
addEventListener('blur',()=>cameraFollow.release(performance.now()/1000));
canvas.addEventListener('pointercancel',()=>cameraFollow.manual(performance.now()/1000));
controls.enableDamping=true;controls.dampingFactor=.055;
canvas.addEventListener('pointerdown',e=>{
 const touch=e.pointerType==='touch';
 controls.panSpeed=touch?1.3:1;controls.dampingFactor=touch?.085:.055;
});
controls.minDistance=1.6;controls.maxDistance=9;
controls.minPolarAngle=1.15;controls.maxPolarAngle=Math.PI*.48;
controls.enablePan=true;
controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
controls.screenSpacePanning=false;
controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
const environment=createEnvironment(scene);
const eggs=createEggs(scene);
const forageHoles=createForageHoles(scene),forageTip=new THREE.Vector3();
const sim=new Simulation();
const duckModels=sim.ducks.map(d=>{const m=createDuck(d.kind);scene.add(m.group);return m});
function resetView(){
  camera.zoom=1;
  camera.updateProjectionMatrix();
  cameraFollow.reset();
  const fc = {
    x: sim.ducks.reduce((s, d) => s + d.x, 0) / sim.ducks.length,
    z: sim.ducks.reduce((s, d) => s + d.z, 0) / sim.ducks.length,
  };
  camera.position.set(THREE.MathUtils.clamp(fc.x + .15, -3.2, 3.2), 1.65, THREE.MathUtils.clamp(fc.z + 3.8, 1.2, 4.1));
  controls.target.set(fc.x, .65, fc.z);
  controls.update();
  constrainGardenCamera(camera, controls.target);
}
resetView();
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

const duckRoots = duckModels.map(m => m.group);
const duckProjectVec = new THREE.Vector3();
function duckAtScreen(clientX: number, clientY: number) {
  const r = canvas.getBoundingClientRect();
  mouse.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);

  // 1. Direkte 3D-mesh raycasting mod ændernes kroppe, hoveder og fjer
  const hits = raycaster.intersectObjects(duckRoots, true);
  if (hits.length > 0) {
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj) {
      const idx = duckRoots.indexOf(obj as THREE.Group);
      if (idx >= 0) return sim.ducks[idx];
      obj = obj.parent;
    }
  }

  // 2. Tilgivende skærm-afstand (for touch og hurtige klik)
  let closest: (typeof sim.ducks)[number] | undefined;
  let closestDist = Infinity;
  for (let i = 0; i < sim.ducks.length; i++) {
    const d = sim.ducks[i];
    duckProjectVec.set(d.x, d.y + 0.42, d.z).project(camera);
    if (duckProjectVec.z > 1) continue;
    const sx = (duckProjectVec.x * 0.5 + 0.5) * r.width + r.left;
    const sy = (-duckProjectVec.y * 0.5 + 0.5) * r.height + r.top;
    const pixelDist = Math.hypot(clientX - sx, clientY - sy);
    if (pixelDist < 52 && pixelDist < closestDist) {
      closestDist = pixelDist;
      closest = d;
    }
  }
  return closest;
}


function cast(x:number,z:number){return sim.castFood(x,z)}
const feedGesture=new FeedGesture();
canvas.addEventListener('pointerdown',e=>feedGesture.down(e.pointerId,e.button,e.clientX,e.clientY,performance.now()));
canvas.addEventListener('pointermove',e=>{
 feedGesture.move(e.pointerId,e.clientX,e.clientY);
 if(e.pointerType==='touch')return;
 const hoveredDuck = duckAtScreen(e.clientX, e.clientY);
 canvas.style.cursor = hoveredDuck ? 'pointer' : 'default';
 if(hoveredDuck){
  pointerRing.visible = false;
  return;
 }
 const p=pointAt(e.clientX,e.clientY);
 pointerRing.visible=!!p&&p.x>GARDEN.minX&&p.x<GARDEN.maxX&&p.z>GARDEN.minZ&&p.z<GARDEN.maxZ&&Math.hypot(p.x-POND.x,p.z-POND.z)>POND.radius+.3;
 if(p)pointerRing.position.set(p.x,.027,p.z);
});
canvas.addEventListener('pointerleave',()=>{pointerRing.visible=false;canvas.style.cursor='default';});
canvas.addEventListener('pointercancel',e=>feedGesture.cancel(e.pointerId));
canvas.addEventListener('lostpointercapture',e=>feedGesture.cancel(e.pointerId));
addEventListener('blur',()=>feedGesture.reset());
canvas.addEventListener('pointerup',e=>{
 if(!feedGesture.up(e.pointerId,e.button,e.clientX,e.clientY,performance.now()))return;
 // Første tryk uden for menuen lukker den uden samtidig at kaste pasta.
 if(dock.classList.contains('open')){showDock(false);return;}
 const clickedDuck = duckAtScreen(e.clientX, e.clientY);
 if(clickedDuck){
  setFocusedDuck(clickedDuck.id);
  return;
 }
 if(focusedDuckId){
  setFocusedDuck(null);
  return;
 }
 const p=pointAt(e.clientX,e.clientY);
 if(p) cast(p.x,p.z);
});
const fullscreenSwitch=$<HTMLInputElement>('fullscreen');
const syncFullscreen=()=>{fullscreenSwitch.checked=!!document.fullscreenElement;};
fullscreenSwitch.addEventListener('change',async()=>{
 try{if(fullscreenSwitch.checked&&!document.fullscreenElement)await $('app').requestFullscreen();else if(!fullscreenSwitch.checked&&document.fullscreenElement)await document.exitFullscreen();}
 catch{console.warn('Fuld skærm er ikke tilgængelig i denne browser.');}
 finally{syncFullscreen();}
});
document.addEventListener('fullscreenchange',syncFullscreen);
if(!document.fullscreenEnabled)fullscreenSwitch.closest('label')!.hidden=true;

const dock=$('settings'),dockContent=$('dock-content');
function showDock(open:boolean){dock.classList.toggle('open',open);dockContent.inert=!open;$('dock-toggle').setAttribute('aria-expanded',String(open));}
// Et eksplicit tryk giver samme tilstand med mus, touch og efter skærmrotation.
$('dock-toggle').addEventListener('click',()=>showDock(!dock.classList.contains('open')));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dock.classList.contains('open')){showDock(false);$('dock-toggle').focus();}});
const timeMode=$<HTMLSelectElement>('time-mode'),daySlider=$<HTMLInputElement>('day-time');
const syncTimeControl=()=>{$('manual-time').hidden=timeMode.value!=='manual';};
syncTimeControl();
let dayMinutes=preferences.timeMode==='live'?getDaylight(new Date()).minutes:preferences.minutes??getDaylight(new Date()).minutes;
daySlider.value=String(Math.floor(dayMinutes));
let clockTick=1;
daySlider.addEventListener('input',()=>{timeMode.value='manual';dayMinutes=Number(daySlider.value);clockTick=1;preferences.timeMode='manual';preferences.minutes=dayMinutes;savePreferences();});
timeMode.addEventListener('change',()=>{syncTimeControl();clockTick=1;preferences.timeMode=timeMode.value as Preferences['timeMode'];preferences.minutes=dayMinutes;savePreferences();});
addEventListener('pagehide',()=>{preferences.minutes=dayMinutes;savePreferences();});
function updateDaylight(dt:number){
 if(timeMode.value==='cycle')dayMinutes=(dayMinutes+dt*1440/300)%1440;
 clockTick+=dt;if(clockTick<.2)return;clockTick=0;
 const now=new Date(),override=timeMode.value==='live'?undefined:dayMinutes;
 const day=getDaylight(now,override);
 environment.setSkyDate(getSceneDate(now,override));
 dayMinutes=day.minutes;daySlider.value=String(Math.floor(day.minutes));
 $('clock-label').textContent=formatTime(day.minutes);
 daySlider.setAttribute('aria-valuetext',formatTime(day.minutes));
 $('sun-times').textContent=`${day.dateLabel} · Sol op ${formatTime(day.sunrise)} · ned ${formatTime(day.sunset)}`;
 environment.setDaylight(day.light,THREE.MathUtils.clamp((day.minutes-day.sunrise)/(day.sunset-day.sunrise),0,1));
 sim.setNight(day.night);
}
function applyQuality(){
 const compact=matchMedia('(pointer:coarse)').matches || innerWidth<700;
 renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.0:1.25));
 renderer.shadowMap.enabled=true;
 renderer.setSize(innerWidth,innerHeight);
}

applyQuality();
let weatherGeneration=0;
async function weatherChanged(){
 const generation=++weatherGeneration;
 const mode=$<HTMLSelectElement>('weather').value;
 const preset=mode==='rain'?{cloud:95,wind:3,rain:1.5,isDay:true}:mode==='cloud'?{cloud:85,wind:2,rain:0,isDay:true}:{cloud:22,wind:1.5,rain:0,isDay:true};
 if(mode!=='live'){
  environment.setWeather(preset);
  sim.setWeather(preset);
  $('weather-label').textContent=mode==='rain'?'En stille regnbyge':mode==='cloud'?'Under skyerne':'En rolig dag';
  return;
 }
 $('weather-label').textContent='Henter Gistrup-vejr …';
 try{
  const result=await getGistrupWeather();
  if(generation!==weatherGeneration)return;
  environment.setWeather(result.weather);
  sim.setWeather(result.weather);
  $('weather-label').textContent=result.label;
 }
 catch{
  if(generation!==weatherGeneration)return;
  $('weather-label').textContent='Gistrup · vejr utilgængeligt';
 }
}
$('weather').addEventListener('change',()=>{preferences.weather=$<HTMLSelectElement>('weather').value as Preferences['weather'];savePreferences();void weatherChanged();});
setInterval(()=>{if($<HTMLSelectElement>('weather').value==='live'&&!document.hidden)void weatherChanged()},5*60_000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$<HTMLSelectElement>('weather').value==='live')void weatherChanged();});
void weatherChanged();
addEventListener('resize',()=>{fitCameraWidth();applyQuality()});
let last=performance.now();
let lastRenderTime=performance.now();
let frameCount=0;
let lastFpsTime=performance.now();
const previousCameraPosition=new THREE.Vector3();
function frame(now:number){
 const targetFps = preferences.cap30Fps !== false ? 30 : 60;
 const minInterval = (1000 / targetFps) - 2.5;
 if (now - lastRenderTime < minInterval) return;
 lastRenderTime = now;
 const dt=Math.min((now-last)/1000,.05);last=now;
 if(document.hidden)return;
 previousCameraPosition.copy(camera.position);
 moveCameraWithKeys(dt,now/1000);
 const targetDucks = focusedDuckId ? sim.ducks.filter(d => d.id === focusedDuckId) : sim.ducks;
 if(!$<HTMLInputElement>('auto-follow').checked||!cameraFollow.update(dt,now/1000,camera,controls.target,targetDucks))controls.update();
 if(focusedDuckId){
  const fd=sim.ducks.find(d=>d.id===focusedDuckId);
  if(fd){
   const act=DUCK_ACTIONS[fd.state];
   focusStatus.textContent=act?act.charAt(0).toUpperCase()+act.slice(1):'';
  } else {
   setFocusedDuck(null);
  }
 }
 constrainGardenCamera(camera,controls.target,previousCameraPosition);
 sim.setViewer(camera.position.x,camera.position.z);
 updateDaylight(dt);sim.update(dt);environment.update(sim.time,dt);environment.setShelterDoor(sim.shelterDoor.closed);
 behaviorNotices.update(sim.ducks,now,preferences.showBehavior&&!$('app').classList.contains('crt-boot'));
 eggs.update(sim.time,dt,sim.ducks,camera);forageHoles.update(sim.time);
 for(let i=0;i<sim.ducks.length;i++){
  const d=sim.ducks[i],m=duckModels[i];m.group.position.set(d.x,d.y,d.z);m.group.rotation.y=d.heading;
  const fly=insects[i];fly.group.visible=!!d.insect;
  if(d.insect){
   fly.group.position.set(d.insect.x+Math.sin(sim.time*29)*.035,.49+Math.sin(sim.time*19)*.045,d.insect.z+Math.cos(sim.time*23)*.035);
   fly.group.rotation.y=Math.sin(sim.time*.7+i)*.6;
   fly.wings.forEach((wing,index)=>wing.rotation.z=(index?1:-1)*Math.sin(sim.time*67)*.7);
  }
  m.animate({preenTarget:d.preenTarget,gesture:d.gesture,mouthOpen:d.mouthOpen,groundHeight:gardenGroundHeight,waterBob:d.state==='swim'?d.y-POND.waterY:0,speed:d.speed,time:sim.time+i*1.71,state:d.state,look:d.look,peck:d.peck,upright:d.upright,headTilt:d.headTilt,displayDip:d.displayDip,accelerationForward:d.ax*Math.sin(d.heading)+d.az*Math.cos(d.heading),accelerationSide:d.ax*Math.cos(d.heading)-d.az*Math.sin(d.heading),jumpProgress:d.jumpProgress,crouch:d.crouch,landing:d.landing,wetness:d.state==='swim'?1:Math.max(0,1-(sim.time-(d.lastSwimAt??-100))/22),mud:d.mud,oneLeg:d.state==='rest'&&d.speed<0.03&&!d.gesture,trot:d.trot||d.speed>0.95,snail:d.snail});

  m.group.updateMatrixWorld(true);
  m.group.getObjectByName('duck-head')!.localToWorld(forageTip.set(0,.036,.30));
  forageHoles.contact(d.id,forageTip,sim.time,dt,d.state==='forage'&&d.speed<.06&&d.peck>.65);
  // 1. Landing i vandet (plask)
  if(d.waterEntries>seenWaterEntries[i]){
    environment.ripple(d.x,d.z,1.6);
    environment.splash(d.x,POND.waterY+.018,d.z,28,1.5,.45,{upwardBias:1.1});
  }
  seenWaterEntries[i]=d.waterEntries;

  // 2. Svømning og padling
  if(d.state==='swim'&&Math.random()<dt*5){
    const paddleOffset = (Math.random() < 0.5 ? -1 : 1) * 0.12;
    environment.ripple(d.x - Math.sin(d.heading)*0.15 + Math.cos(d.heading)*paddleOffset, d.z - Math.cos(d.heading)*0.15 - Math.sin(d.heading)*paddleOffset, 0.45);
    if(Math.random()<0.35)environment.splash(d.x+Math.sin(d.heading)*.18,POND.waterY+.01,d.z+Math.cos(d.heading)*.18,5,.75,.28,{upwardBias:0.8});
  }

  // 3. Drikke og næbskyl
  if(d.state==='drink'&&d.speed<.03&&d.peck>.47&&Math.random()<dt*1.5){
    environment.ripple(d.x+Math.sin(d.heading)*.64,d.z+Math.cos(d.heading)*.64,.2);
    environment.splash(d.x+Math.sin(d.heading)*.64,POND.waterY+.01,d.z+Math.cos(d.heading)*.64,4,.45,.2,{upwardBias:0.7});
  }

  // 4. Udspring fra bassinet (exit hop: afsæt fra vandfladen og fine dråber der følger anden)
  const isWet = d.state !== 'swim' && d.lastSwimAt !== undefined && (sim.time - d.lastSwimAt) < 22;
  const wetness = Math.max(0, 1 - (sim.time - (d.lastSwimAt ?? -100)) / 22);

  if (d.state === 'exit') {
    if (d.jumpProgress >= 0 && d.jumpProgress < 0.20) {
      // Afsæt fra vandet ved kanten
      environment.ripple(d.x, d.z, 0.8);
      environment.splash(d.x, POND.waterY + 0.015, d.z, 14, 1.2, 0.35, { vx: d.vx * 0.7, vz: d.vz * 0.7, upwardBias: 0.8 });
    } else if (d.jumpProgress >= 0.20 && d.jumpProgress < 0.90 && Math.random() < dt * 14) {
      // Fine dråber der drypper fra de våde svømmefødder under luftsprunget
      environment.splash(d.x, d.y + 0.03, d.z, 3, 0.5, 0.2, { vx: d.vx * 0.85, vz: d.vz * 0.85, upwardBias: 0.15, life: 0.25 });
    }
  }

  // 5. Landing på bredden (små stænk ved fødderne)
  if (d.landing > 0.35 && isWet && Math.random() < dt * 6) {
    environment.splash(d.x, d.y + 0.015, d.z, 6, 0.7, 0.35, { upwardBias: 0.3, life: 0.22 });
  }

  // 6. Kraftigt sprøjt når anden basker med vingerne (wingFlap)
  if (d.gesture?.kind === 'wingFlap' && isWet && d.gesture.progress > 0.08 && d.gesture.progress < 0.92) {
    const sinH = Math.sin(d.heading);
    const cosH = Math.cos(d.heading);
    // Vingeslag sker ved 5 Hz (faseberegning matcher duck-gestures)
    const strokePhase = Math.sin(d.gesture.progress * 3.8 * 5 * Math.PI * 2);
    if (strokePhase > 0.25 && Math.random() < dt * 32) {
      // Venstre vingespids slynger vand ud til venstre
      const leftWingX = d.x - cosH * 0.28 + sinH * 0.06;
      const leftWingZ = d.z + sinH * 0.28 + cosH * 0.06;
      environment.splash(leftWingX, d.y + 0.30, leftWingZ, 12, 1.9 * wetness, 0.55, {
        directionAngle: d.heading - Math.PI * 0.55,
        arcWidth: Math.PI * 0.75,
        upwardBias: 0.45,
        vx: d.vx, vz: d.vz,
        life: 0.30,
      });

      // Højre vingespids slynger vand ud til højre
      const rightWingX = d.x + cosH * 0.28 + sinH * 0.06;
      const rightWingZ = d.z - sinH * 0.28 + cosH * 0.06;
      environment.splash(rightWingX, d.y + 0.30, rightWingZ, 12, 1.9 * wetness, 0.55, {
        directionAngle: d.heading + Math.PI * 0.55,
        arcWidth: Math.PI * 0.75,
        upwardBias: 0.45,
        vx: d.vx, vz: d.vz,
        life: 0.30,
      });

      // Dråber fra bryst/krop
      if (Math.random() < 0.4) {
        environment.splash(d.x + sinH * 0.10, d.y + 0.28, d.z + cosH * 0.10, 6, 1.2 * wetness, 0.4, {
          directionAngle: d.heading,
          arcWidth: Math.PI * 0.5,
          upwardBias: 0.5,
          life: 0.25,
        });
      }
    }
  }

  // 7. Haleryst (tailWag)
  if (d.gesture?.kind === 'tailWag' && isWet && Math.random() < dt * 8) {
    const sinH = Math.sin(d.heading);
    const cosH = Math.cos(d.heading);
    const tailX = d.x - sinH * 0.22;
    const tailZ = d.z - cosH * 0.22;
    environment.splash(tailX, d.y + 0.16, tailZ, 7, 0.95 * wetness, 0.45, {
      directionAngle: d.heading + Math.PI,
      arcWidth: Math.PI * 0.8,
      upwardBias: 0.35,
      vx: d.vx, vz: d.vz,
      life: 0.24,
    });
  }
 }
 environment.updateContactShadows(sim.ducks,gardenGroundHeight);
 const liveIds=new Set<string>();
 for(const f of sim.foods){
  if(f.eaten&&!f.carriedBy)continue;liveIds.add(f.id);let mesh=foods.get(f.id);
  if(!mesh){mesh=new THREE.Mesh(pastaGeometry,pastaMaterial);mesh.castShadow=true;foods.set(f.id,mesh);foodRotations.set(f.id,Math.random()*Math.PI*2);scene.add(mesh)}
  const t=Math.min(f.age/.65,1),angle=foodRotations.get(f.id)||0;
  const y=t<1?.045+(1-t)*2.2+Math.sin(t*Math.PI)*1.2:.045;
  mesh.position.set(f.x+(1-t)*.6,y,f.z+(1-t)*1.4);
  mesh.rotation.set(Math.PI/2+(1-t)*4,angle,(1-t)*3);
  if(f.carriedBy){
   const index=sim.ducks.findIndex(d=>d.id===f.carriedBy);
   if(index>=0){const head=duckModels[index].group.getObjectByName('duck-head')!;
    head.updateWorldMatrix(true,false);head.localToWorld(mesh.position.set(0,.02,.29));
    head.getWorldQuaternion(mesh.quaternion);
    mesh.rotateZ(Math.PI/2+Math.sin(sim.time*11)*.12);
   }
  }
 }
 for(const [id,mesh] of foods)if(!liveIds.has(id)){scene.remove(mesh);foods.delete(id);foodRotations.delete(id)}
 renderer.render(scene,camera);
 frameCount++;
 if (now - lastFpsTime >= 500) {
  const fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
  frameCount = 0;
  lastFpsTime = now;
  if (preferences.showFps && fpsVal) {
   fpsVal.textContent = String(fps);
   if (fpsCounter) {
    const target = preferences.cap30Fps !== false ? 30 : 60;
    fpsCounter.classList.toggle('fps-low', fps < target * 0.8 && fps >= target * 0.55);
    fpsCounter.classList.toggle('fps-bad', fps < target * 0.55);
   }
  }
 }
 if(!crtReady){crtReady=true;if(preferences.music)$('tv-start').hidden=false;else startCrt();}
}
let crtReady=false,crtStarted=false,crtCleanupTimer=0;
function startCrt(){
 if(crtStarted||!crtReady)return;
 crtStarted=true;$('tv-start').hidden=true;
 const duration=matchMedia('(prefers-reduced-motion:reduce)').matches ? .4 : 4.8;
 music.beginBoot(duration);
 $('app').classList.add('crt-on');crtCleanupTimer=window.setTimeout(finishCrt,(duration+1)*1000);
}
$('tv-start').addEventListener('click',startCrt);
function finishCrt(){
 window.clearTimeout(crtCleanupTimer);
 music.finishBoot();
 $('app').classList.remove('crt-boot','crt-on');loading.remove();
}
canvas.addEventListener('animationend',event=>{if(event.animationName==='crt-picture'||event.animationName==='crt-reduced')finishCrt();});
renderer.setAnimationLoop(frame);
document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){cameraKeys.clear();}});
// Read-only diagnostics for repeatable browser tests, not part of the visible UI.
Object.assign(window,{__andeTV:{sim,scene,camera,renderer,project:(x:number,z:number)=>{const p=new THREE.Vector3(x,0,z).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}}}});

