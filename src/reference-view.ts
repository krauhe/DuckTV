import {feedingPose} from './duck-feeding';
import * as THREE from 'three';
import {createDuck} from './duck-model';
import {DUCK_PROFILES} from './duck-profiles';
import {GESTURE_SECONDS,type DuckGesture} from './duck-gestures';
import type {DuckKind} from './types';

const scene=new THREE.Scene();scene.background=new THREE.Color('#aeb9ad');
scene.add(new THREE.HemisphereLight(0xffffff,0x536749,2));
const sun=new THREE.DirectionalLight(0xffecd6,2.5);sun.position.set(-3,5,4);scene.add(sun);
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.1,50);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:'#879c75',roughness:1}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.015;scene.add(floor);
const kinds:DuckKind[]=['drake','buff','brown','pied'];
const ducks=kinds.map((kind,i)=>{const duck=createDuck(kind);duck.group.position.x=(i-1.5)*1.65;scene.add(duck.group);return duck;});
document.querySelector('#identities')!.replaceChildren(...kinds.map(kind=>{const label=document.createElement('span');label.textContent=DUCK_PROFILES[kind].label;return label;}));
const individual=document.querySelector<HTMLSelectElement>('#individual')!;
const clip=document.querySelector<HTMLSelectElement>('#clip')!;
const angle=document.querySelector<HTMLInputElement>('#angle')!;
const progress=document.querySelector<HTMLInputElement>('#progress')!;
const pause=document.querySelector<HTMLButtonElement>('#pause')!;
const rate=document.querySelector<HTMLSelectElement>('#rate')!;
let time=0,phase=0,playing=true,dirty=true;
pause.onclick=()=>{playing=!playing;pause.textContent=playing?'Pause':'Afspil';};
progress.oninput=()=>{phase=Number(progress.value);playing=false;dirty=true;pause.textContent='Afspil';};
clip.onchange=()=>{phase=0;dirty=true;};
individual.onchange=()=>{dirty=true;resize();document.querySelector('#identities')!.replaceChildren(...kinds.filter(kind=>individual.value==='all'||kind===individual.value).map(kind=>{const label=document.createElement('span');label.textContent=DUCK_PROFILES[kind].label;return label;}));};
function resize(){camera.aspect=innerWidth/innerHeight;camera.position.set(0,individual.value==='all'?2.3:1.35,individual.value==='all'?Math.max(7.8,11/camera.aspect):Math.max(3.3,3.5/camera.aspect));camera.lookAt(0,.65,0);camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);resize();
const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{
  const dt=Math.min(.05,clock.getDelta())*Number(rate.value);
  const kind=clip.value,walking=['walk','slowWalk','walkFlap'].includes(kind);
  const gesture=kind==='walkFlap'?'wingFlap':Object.hasOwn(GESTURE_SECONDS,kind)?kind as DuckGesture:undefined;
  const duration=walking?4:gesture?GESTURE_SECONDS[gesture]+1:kind==='courtship'?6:5;
  const speed=walking?(kind==='slowWalk'?.23:.5):0;
  if(playing)phase=(phase+dt/duration)%1;
  progress.value=String(phase);
  if(playing)time+=dt;
  ducks.forEach((duck,i)=>{
    const heading=Number(angle.value),travel=walking?(phase-.5)*duration*speed:0;
    duck.group.rotation.y=heading;
    duck.group.visible=individual.value==='all'||individual.value===kinds[i];
    duck.group.position.set((individual.value==='all'?(i-1.5)*1.65:0)+Math.sin(heading)*travel,0,Math.cos(heading)*travel);
  });
  const feeding=feedingPose(phase*duration,1.6);
  const bowTime=(phase*duration)%3;
  const steps=playing?1:dirty?90:0;
  for(let step=0;step<steps;step++){
    if(!playing)time+=1/60;
    ducks.forEach(duck=>duck.animate({state:walking?'wander':kind==='eat'?'eat':kind==='forage'?'forage':kind.startsWith('preen')?'preen':'rest',preenTarget:kind==='preenChest'?'chest':'wing',time,speed,upright:kind==='forage'||kind==='lowStand'||kind.startsWith('preen')?0:1,
      look:0,mouthOpen:kind==='eat'?feeding.mouthOpen:0,peck:kind==='eat'?feeding.peck:kind==='forage'?.78+.1*Math.sin(phase*12*Math.PI)**2:0,headTilt:0,displayDip:kind==='courtship'&&bowTime<.95?Math.sin(bowTime/.95*Math.PI)**2:0,
      gesture:gesture?{kind:gesture,progress:Math.min(1,phase*duration/GESTURE_SECONDS[gesture]),side:-1}:undefined}));
  }
  dirty=false;
  renderer.render(scene,camera);
});
