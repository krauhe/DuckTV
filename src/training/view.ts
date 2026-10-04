import * as THREE from 'three';
import {bones} from './physics';
import {createDuck} from '../duck-model';
import {retargetFeet} from './retarget';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import './style.css';

type Validation={offset:number;seconds:number;fallen:boolean;distance:number;score:number};
type Skill={instruction?:string;name:string;policy:number[];baseline:number;score:number;seconds:number;fallen:boolean;distance:number;fps:number;frames:number[][][];validation?:Validation[];longValidation?:Validation[];disturbance?:{at:number;impulse:number;point:number}};
type HistoryPoint={stage:number|string;generation:number;score:number};
type TrainingData={runId?:string;updatedAt?:string;status?:'running'|'finished';stage?:number|string;generation?:number;generationsPerStage?:number;candidatesPerGeneration?:number;history?:HistoryPoint[];skills:Skill[]};

const $=<T extends Element>(id:string)=>document.getElementById(id) as unknown as T;
const view=$<HTMLDivElement>('view'),select=$<HTMLSelectElement>('skill'),result=$<HTMLParagraphElement>('result');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;view.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e4eddd');
const camera=new THREE.PerspectiveCamera(40,1,.01,100);camera.position.set(0,1.05,2.9);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.72,0);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=1.8;controls.maxDistance=8;controls.update();
scene.add(new THREE.HemisphereLight(0xffffff,0x63745d,2.4));const keyLight=new THREE.DirectionalLight(0xfff8e8,2.5);keyLight.position.set(-2,4,3);scene.add(keyLight);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(18,18),new THREE.MeshStandardMaterial({color:'#cbd9c3',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=.005;scene.add(floor);
const grid=new THREE.GridHelper(10,50,0x789175,0xaab9a3);grid.position.y=.012;scene.add(grid);
const duck=new THREE.Group();scene.add(duck);
const gardenDuck=createDuck('buff');gardenDuck.group.rotation.y=Math.PI/2;
gardenDuck.group.visible=false;scene.add(gardenDuck.group);
let gardenPreview=false;let cameraFollowX=0;
let latestFrame:number[][]|undefined;
$<HTMLInputElement>('garden-model').addEventListener('change',event=>{
 gardenPreview=(event.currentTarget as HTMLInputElement).checked;
 gardenDuck.group.visible=gardenPreview;duck.visible=!gardenPreview;
 $('model-note').textContent=gardenPreview?'Havens model: optagne fødder, bækken, kropshældning og hovedposition. Halsen bøjer gennem det optagne halsled; benenes bøjning tilpasses modellen.':'Fysikmodellen: alle led kommer fra optagelsen. Visningen følger anden.';
});
const feather=new THREE.MeshStandardMaterial({color:'#e7d8b5',roughness:.78});const featherLight=new THREE.MeshStandardMaterial({color:'#f0e4c8',roughness:.8});const billMat=new THREE.MeshStandardMaterial({color:'#cc9a50',roughness:.67});const darkMat=new THREE.MeshStandardMaterial({color:'#39473b',roughness:.5});
const sphere=new THREE.SphereGeometry(1,24,18);
function ellipsoid(scale:THREE.Vector3,mat:THREE.Material){const m=new THREE.Mesh(sphere,mat);m.scale.copy(scale);duck.add(m);return m;}
const torso=ellipsoid(new THREE.Vector3(.19,.32,.19),feather);const head=ellipsoid(new THREE.Vector3(.09,.09,.095),featherLight);const wing=ellipsoid(new THREE.Vector3(.115,.205,.028),featherLight);const tail=ellipsoid(new THREE.Vector3(.13,.075,.10),feather);
const eye=ellipsoid(new THREE.Vector3(.009,.011,.007),darkMat);
// Continuous skin follows both recorded neck segments, rather than two beads.
const neckGeometry=new THREE.BufferGeometry(),neckVertices=new Float32Array(17*12*3),neckIndices:number[]=[];
for(let ring=0;ring<16;ring++)for(let side=0;side<12;side++){const a=ring*12+side,b=ring*12+(side+1)%12;neckIndices.push(a,a+12,b,b,a+12,b+12);}
neckGeometry.setAttribute('position',new THREE.BufferAttribute(neckVertices,3));neckGeometry.setIndex(neckIndices);
duck.add(new THREE.Mesh(neckGeometry,feather));
const billShape=new THREE.Shape();billShape.moveTo(0,-.035);billShape.lineTo(.15,-.022);billShape.lineTo(.21,0);billShape.lineTo(.15,.022);billShape.lineTo(0,.035);billShape.closePath();const billGeometry=new THREE.ExtrudeGeometry(billShape,{depth:.085,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.004,bevelThickness:.004});const bill=new THREE.Mesh(billGeometry,billMat);duck.add(bill);
const skeletonMaterial=new THREE.MeshStandardMaterial({color:'#63865d',transparent:true,opacity:.72});
const joints=Array.from({length:14},(_,i)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(i<4?.032:.022,12,10),skeletonMaterial);duck.add(m);return m;});
const links=bones.map(()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1,8),skeletonMaterial);duck.add(m);return m;});
const legMaterial=new THREE.MeshStandardMaterial({color:'#b4a17c',roughness:.9});
const legRods=[[5,6],[8,9]].map(()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.027,.032,1,10),legMaterial);duck.add(m);return m;});
const footMaterial=new THREE.MeshStandardMaterial({color:'#c29b5d',roughness:.8,side:THREE.DoubleSide});
function makeWebbedFoot(){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(18),3));geometry.setIndex([0,1,2,3,5,4,0,3,4,0,4,1,1,4,5,1,5,2,2,5,3,2,3,0]);const mesh=new THREE.Mesh(geometry,footMaterial);duck.add(mesh);return mesh;}
const feet=[makeWebbedFoot(),makeWebbedFoot()];
let skeletonVisible=false;const setSkeleton=(visible:boolean)=>{skeletonVisible=visible;joints.forEach(m=>m.visible=visible);links.forEach(m=>m.visible=visible);};setSkeleton(false);

let skills:Skill[]=[],data:TrainingData|undefined,active=-1,loadedStamp='',currentFrame=0,playing=false,playStart=0,frameAtStart=0,playSpeed=1,lastUiFrame=-1;
let cameraMode:'side'|'perspective'='side';
function currentSkill(){return skills[active];}
function clampFrame(value:number,s= currentSkill()){return s?.frames.length?Math.max(0,Math.min(s.frames.length-1,value)):0;}
function frameForNow(now:number){const s=currentSkill();if(!s?.frames.length)return 0;if(!playing)return clampFrame(currentFrame,s);const frame=frameAtStart+(now-playStart)/1000*Math.max(1,s.fps)*playSpeed;if(frame>=s.frames.length-1){currentFrame=s.frames.length-1;playing=false;setPlayButton();return currentFrame;}return clampFrame(frame,s);}
function setPlayButton(){const button=$<HTMLButtonElement>('play');button.textContent=playing?'Ⅱ':'▶';button.setAttribute('aria-label',playing?'Sæt på pause':'Afspil');}
function formatTime(seconds:number){const n=Math.max(0,Math.floor(seconds));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
function nice(value:number,digits=1){return Number.isFinite(value)?value.toFixed(digits):'—';}
function updatePlaybackUi(){const chosen=currentSkill(),event=chosen?.disturbance;$('disturbance-note').textContent=event?`${currentFrame/(chosen?.fps||30)<event.at?'Skub kommer':'Skub udført'} ved ${event.at} sek. · ${event.impulse>0?'fremad':'bagud'} · impuls ${Math.abs(event.impulse)} i modellens enheder.`:chosen?.instruction??'';const s=currentSkill(),max=s?.frames.length? s.frames.length-1:0,safe=clampFrame(currentFrame,s);const scrub=$<HTMLInputElement>('scrub');scrub.max=String(max);scrub.value=String(safe);const duration=s?.frames.length&&s.fps? (s.frames.length-1)/s.fps:(s?.seconds||0);$('elapsed').textContent=formatTime(s&&s.fps?safe/s.fps:0);$('clip-length').textContent=formatTime(duration);$('duration').textContent=s?`${nice(s.seconds,1)} sek.`:'—';$('distance').textContent=s?`${nice(s.distance,2)} enheder`:'—';$('score').textContent=s?nice(s.score,1):'—';$('frame-count').textContent=s?`${s.frames.length.toLocaleString('da-DK')} billeder`:'—';}
function updateFall(s?:Skill){const note=$<HTMLDivElement>('fall-note');note.className='fall-note';if(!s){note.textContent='Faldstatus vises for det valgte forsøg.';return;}if(s.fallen===true){note.classList.add('fallen');note.textContent='Fald registreret i forsøget.';}else if(s.fallen===false){note.textContent='Intet fald registreret under forsøget.';}else{note.classList.add('unknown');note.textContent='Faldstatus findes ikke i resultatdata.';}}
function selectSkill(index:number,reset=true){if(!skills.length){active=-1;updateRobustness(undefined);return;}active=Math.max(0,Math.min(skills.length-1,index));if(reset){currentFrame=0;playing=false;frameAtStart=0;lastUiFrame=-1;}select.value=String(active);const s=currentSkill();if(!s)return;view.classList.add('has-clip');const fall=s.fallen===true?'Fald registreret.':s.fallen===false?'Intet fald registreret.':'Faldstatus ikke gemt.';result.textContent=`${s.name} · ${fall} Score ${nice(s.score)} (baseline ${nice(s.baseline)}). Score er et mål i modellen, ikke en vurdering af naturlig gang.`;setPlayButton();updateFall(s);updatePlaybackUi();updateTrend(data?.history??[],s.name);updateRobustness(s);}
select.addEventListener('change',()=>selectSkill(Number(select.value)));
$<HTMLButtonElement>('replay').addEventListener('click',()=>{if(!currentSkill()?.frames.length)return;currentFrame=0;frameAtStart=0;playSpeed=Number($<HTMLSelectElement>('speed').value);playStart=performance.now();playing=true;setPlayButton();});
$<HTMLButtonElement>('play').addEventListener('click',()=>{const s=currentSkill();if(!s?.frames.length)return;if(playing){currentFrame=frameForNow(performance.now());playing=false;}else{if(currentFrame>=s.frames.length-1)currentFrame=0;frameAtStart=currentFrame;playSpeed=Number($<HTMLSelectElement>('speed').value);playStart=performance.now();playing=true;}setPlayButton();updatePlaybackUi();});
$<HTMLInputElement>('scrub').addEventListener('input',event=>{const target=event.currentTarget as HTMLInputElement;playing=false;currentFrame=clampFrame(Number(target.value));frameAtStart=currentFrame;setPlayButton();updatePlaybackUi();});
$<HTMLSelectElement>('speed').addEventListener('change',()=>{if(playing){currentFrame=frameForNow(performance.now());frameAtStart=currentFrame;playStart=performance.now();}playSpeed=Number($<HTMLSelectElement>('speed').value);});
$<HTMLInputElement>('skeleton').addEventListener('change',event=>setSkeleton((event.currentTarget as HTMLInputElement).checked));
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button=>button.addEventListener('click',()=>{cameraMode=button.dataset.camera as 'side'|'perspective';document.querySelectorAll('[data-camera]').forEach(b=>b.classList.toggle('active',b===button));if(cameraMode==='side')camera.position.set(0,1.05,2.9);else camera.position.set(1.6,1.4,2.7);camera.lookAt(0,.72,0);controls.target.set(0,.72,0);cameraFollowX=0;controls.update();}));
$<HTMLButtonElement>('download').addEventListener('click',()=>{const s=currentSkill();if(!s)return;const blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${s.name.toLowerCase().replace(/[^a-z0-9æøå-]+/gi,'-')}-clip.json`;a.click();URL.revokeObjectURL(url);});

function updateTrend(history:HistoryPoint[]=[],behavior=data?.stage){const svg=$<SVGSVGElement>('trend');const selectedBehavior=currentSkill()?.name??behavior;const scoped=history.filter(x=>String(x.stage)===String(selectedBehavior));const values=scoped.map(x=>x.score).filter(Number.isFinite);$('trend-title').textContent=selectedBehavior?`Udvikling · ${String(selectedBehavior).toLowerCase()}`:'Udvikling pr. generation';if(!values.length){svg.innerHTML='<text x="320" y="95" text-anchor="middle">Venter på målinger for dette forsøg …</text>';$('history-count').textContent='0 målinger';$('best-score').textContent=`Bedste ${selectedBehavior?String(selectedBehavior).toLowerCase()+' ':''}score —`;return;}
 const w=640,h=180,left=36,right=12,top=13,bottom=26,lo=Math.min(...values),hi=Math.max(...values),range=Math.max(1,hi-lo),n=values.length;const x=(i:number)=>left+(n===1?(w-left-right)/2:i/(n-1)*(w-left-right));const y=(v:number)=>top+(hi-v)/range*(h-top-bottom);const points=values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');const area=`${x(0)},${h-bottom} ${points} ${x(n-1)},${h-bottom}`;const ticks=[hi,(hi+lo)/2,lo];svg.innerHTML=`<defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#83a977" stop-opacity=".25"/><stop offset="100%" stop-color="#83a977" stop-opacity="0"/></linearGradient></defs>${ticks.map(v=>`<line class="gridline" x1="${left}" y1="${y(v)}" x2="${w-right}" y2="${y(v)}"/><text x="${left-8}" y="${y(v)+4}" text-anchor="end">${nice(v,0)}</text>`).join('')}<polygon class="trend-area" points="${area}"/><polyline class="trend-line" points="${points}"/>${values.length===1?`<circle class="trend-dot" cx="${x(0)}" cy="${y(values[0])}" r="5"/>`:''}`;
 $('history-count').textContent=`${values.length.toLocaleString('da-DK')} målinger`;$('best-score').textContent=`Bedste ${selectedBehavior?String(selectedBehavior).toLowerCase()+' ':''}score ${nice(Math.max(...values),1)}`;
}
function updateRobustness(skill=currentSkill()){const long=skill?.longValidation;$('long-validation').textContent=long?.length?`30 sekunder: ${long.filter(v=>!v.fallen&&v.seconds>=29.99).length}/${long.length} uden fald. Ingen ydre skub i denne prøve.`:'30-sekunders prøve: endnu ikke udført.';const rows=Array.isArray(skill?.validation)?skill.validation:[];const total=rows.length,passed=rows.filter(v=>v.fallen===false).length;$('validation-passed').textContent=total?String(passed):'—';$('validation-total').textContent=total?`af ${total} uden fald`:'af —';$('validation-note').textContent=total?`${total-passed} af ${total} startstillinger havde fald eller manglende faldstatus.`:'Ingen valideringsdata for dette forsøg endnu.';$<HTMLSpanElement>('robust-fill').style.width=total?`${passed/total*100}%`:'0%';}
function renderData(next:TrainingData){data=next;const previousName=currentSkill()?.name;const previousIndex=active;skills=Array.isArray(next.skills)?next.skills.filter(s=>Array.isArray(s.frames)):[];const follow=$<HTMLInputElement>('follow').checked;const latest=skills.length-1;let target=previousName?skills.findIndex(s=>s.name===previousName):-1;if(follow&&latest>=0)target=latest;if(target<0&&skills.length)target=Math.min(Math.max(previousIndex,0),latest);
 const selectedName=target>=0?skills[target].name:'';const changedClip=selectedName!==previousName;select.replaceChildren();skills.forEach((s,i)=>select.add(new Option(s.name||`Forsøg ${i+1}`,String(i))));if(target>=0){selectSkill(target,changedClip);if(changedClip){playing=skills[target].frames.length>1;frameAtStart=0;playSpeed=Number($<HTMLSelectElement>('speed').value);playStart=performance.now();setPlayButton();}}
 const generation=Number(next.generation)||0,perStage=Number(next.generationsPerStage)||60;const stage=next.stage??'—';$('stage-title').textContent=next.status==='finished'?'Træning afsluttet':String(stage);$('generation-label').textContent=`Generation ${generation.toLocaleString('da-DK')} / ${perStage.toLocaleString('da-DK')}`;$('population-label').textContent=`${(Number(next.candidatesPerGeneration)||24).toLocaleString('da-DK')} kandidater pr. generation`;$('stage-label').textContent=next.status==='finished'?'Resultaterne er færdige':`Forsøg ${stage} · nye data gemmes løbende`;
 const percent=Math.max(0,Math.min(100,generation/perStage*100));$<HTMLSpanElement>('progress-fill').style.width=`${percent}%`;$<HTMLDivElement>('progress-fill').parentElement?.setAttribute('aria-valuenow',String(Math.min(perStage,generation)));
 const stamp=next.updatedAt?new Date(next.updatedAt):null;$('updated-label').textContent=stamp&&!Number.isNaN(stamp.valueOf())?`Opdateret ${stamp.toLocaleTimeString('da-DK',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:'Opdateringstid ikke angivet';if(!skills.length){updateTrend(Array.isArray(next.history)?next.history:[],next.stage);updateRobustness(undefined);result.textContent='Resultatfilen er klar, men indeholder ingen optagelser endnu.';}const state=$<HTMLDivElement>('connection');state.className=`live-state ${next.status==='finished'?'finished':'connected'}`;$('connection').textContent=next.status==='finished'?'Træning afsluttet':'Live · opdaterer automatisk';
}
async function poll(){try{const response=await fetch(`./training/result.json?_=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const json=await response.json() as TrainingData;if(!Array.isArray(json.skills))throw new Error('Ugyldigt resultatformat');const stamp=String(json.updatedAt??'')+':'+String(json.skills.length)+':'+String(json.generation??'');if(stamp!==loadedStamp){loadedStamp=stamp;renderData(json);}else{const state=$<HTMLDivElement>('connection');state.className=`live-state ${json.status==='finished'?'finished':'connected'}`;}}catch(error){const state=$<HTMLDivElement>('connection');state.className='live-state error';$('connection').textContent='Venter på resultatfil';if(!data){result.textContent='Intet træningsresultat endnu. Resultatet vises, når første datafil er gemt.';}console.debug('Training result is not available yet',error);}}
void poll();window.setInterval(poll,2000);

const positions=Array.from({length:14},()=>new THREE.Vector3());
function updateMeshAlong(mesh:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,scaleLength=false){mesh.position.copy(a).add(b).multiplyScalar(.5);const d=new THREE.Vector3().subVectors(b,a);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());if(scaleLength)mesh.scale.y=d.length();}
function applyFrame(frame:number[][]){if(!Array.isArray(frame))return;latestFrame=frame;duck.position.x=0;frame.forEach((point,i)=>{if(i>=positions.length||!Array.isArray(point)||!Number.isFinite(point[0])||!Number.isFinite(point[1]))return;const z=i>=12?-.09:i>=10?.09:i>=7?-.09:i>=4?.09:0;positions[i].set(point[0],point[1],z);});
 updateMeshAlong(torso,positions[0],positions[1]);head.position.copy(positions[3]);
 // Skin starts deep inside the breast and exits along the body's upward axis.
 // Starting the tube at the moving neck joint let its base turn sideways and
 // appear as a separate stump through the torso during a deep bow.
 const bodyUp=new THREE.Vector3().subVectors(positions[1],positions[0]).normalize();
 const bodyForward=new THREE.Vector3(bodyUp.y,-bodyUp.x,0);
 const neckRoot=torso.position.clone().addScaledVector(bodyUp,.10).addScaledVector(bodyForward,.025);
 const collar=torso.position.clone().addScaledVector(bodyUp,.20).addScaledVector(bodyForward,.035);
 const curve=new THREE.CatmullRomCurve3([neckRoot,collar,positions[2],positions[3]]);
 for(let ring=0;ring<=16;ring++){
  const t=ring/16,point=curve.getPoint(t),tangent=curve.getTangent(t),radius=(.069-.026*t)*Math.min(1,t*12+.02);
  for(let side=0;side<12;side++){const a=side/12*Math.PI*2,index=(ring*12+side)*3;neckVertices[index]=point.x+Math.cos(a)*radius*tangent.y;neckVertices[index+1]=point.y-Math.cos(a)*radius*tangent.x;neckVertices[index+2]=Math.sin(a)*radius;}
 }
 neckGeometry.attributes.position.needsUpdate=true;neckGeometry.computeVertexNormals();neckGeometry.computeBoundingSphere();
 wing.position.copy(positions[0]).add(positions[1]).multiplyScalar(.5);wing.position.x-=.035;wing.position.z=.17;wing.quaternion.copy(torso.quaternion);
 tail.position.copy(positions[0]).add(new THREE.Vector3(-.14,0,0));tail.quaternion.copy(torso.quaternion);eye.position.copy(positions[3]).add(new THREE.Vector3(.033,.025,.081));
 bill.position.copy(positions[3]).add(new THREE.Vector3(.045,0,-.0425));bill.rotation.z=0;
 bones.forEach(([a,b],i)=>{if(!positions[a]||!positions[b])return;updateMeshAlong(links[i],positions[a],positions[b],true);});
 updateMeshAlong(legRods[0],positions[5],positions[6],true);updateMeshAlong(legRods[1],positions[8],positions[9],true);
 [[6,10,11],[9,12,13]].forEach(([ankle,toeA,toeB],side)=>{const vertices=[positions[ankle],positions[toeA],positions[toeB],positions[ankle],positions[toeA],positions[toeB]];const values=new Float32Array(18);vertices.forEach((p,i)=>{values[i*3]=p.x;values[i*3+1]=p.y;values[i*3+2]=p.z+(i<3?-.075:.075);});const geometry=feet[side].geometry;geometry.attributes.position.array.set(values);geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();});
 for(let i=0;i<joints.length;i++)joints[i].position.copy(positions[i]);
}
new ResizeObserver(()=>{const width=Math.max(1,view.clientWidth),height=Math.max(1,view.clientHeight);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(view);
renderer.setAnimationLoop(now=>{controls.update();const s=currentSkill();if(s?.frames.length){const framePosition=frameForNow(now);if(framePosition!==lastUiFrame){currentFrame=framePosition;const lower=Math.floor(framePosition),upper=Math.min(lower+1,s.frames.length-1),fraction=framePosition-lower;const before=s.frames[lower],after=s.frames[upper];const interpolated=before.map((point,index)=>{const next=after[index]??point;return [point[0]+(next[0]-point[0])*fraction,point[1]+(next[1]-point[1])*fraction];});applyFrame(interpolated);lastUiFrame=framePosition;updatePlaybackUi();}}if(gardenPreview&&latestFrame){const mapped=retargetFeet(latestFrame);gardenDuck.group.position.y=mapped.rootY;gardenDuck.animate({state:'wander',speed:0,time:now/1000,look:0,peck:0,upright:1,headTilt:0,displayDip:0,recordedFeet:mapped.feet,recordedBody:mapped.body});}if(latestFrame){const x=latestFrame[0][0]*(gardenPreview?.8:1);const followX=Math.sign(x)*Math.max(0,Math.abs(x)-.35);camera.position.x+=followX-cameraFollowX;controls.target.x+=followX-cameraFollowX;cameraFollowX=followX;}renderer.render(scene,camera);});





