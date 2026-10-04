import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {Trial} from '../src/training/physics.ts';
const path='public/training/result.json',result=JSON.parse(readFileSync(path,'utf8'));
if(result.status!=='finished')throw new Error('Another training run is active');
copyFileSync(path,`.local/training/before-start-stop-${Date.now()}.json`);
let best=result.skills.find((s:{name:string})=>s.name==='Gangforsøg').policy.slice(0,10);
let seed=529;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function trial(policy:number[],offset=0,record=false){
 const t=new Trial(policy,true,offset,'start-stop'),frames=[];let pauseMotion=0,firstTravel=0,restartX=0;
 for(let i=0;i<1440&&!t.fallen;i++){
  t.step();if(record&&i%4===0)frames.push(t.points.map(p=>[p.x,p.y]));
  if(i===480)firstTravel=t.points[0].x;
  if(i===720)restartX=t.points[0].x;
  if(t.time>4.3&&t.time<5.8)for(const p of [t.points[0],...t.points.slice(10)])pauseMotion+=Math.abs(p.x-p.px);
 }
 const travel=Math.min(firstTravel,t.points[0].x-restartX);
 const score=(t.fallen?-100:0)+t.time+Math.min(1,travel)*12-pauseMotion*35-t.slip*3-t.headMotion;
 return {t,frames,score,pauseMotion};
}
function assess(p:number[]){const runs=[-.02,0,.02].map(o=>trial(p,o));return Math.min(...runs.map(r=>r.score));}
let score=assess(best);const baseline=score,name='Start · stop · gå';
const old=result.skills.findIndex((s:{name:string})=>s.name===name),index=old<0?result.skills.length:old;
function publish(generation:number,finished=false){
 const r=trial(best,0,true);
 result.skills[index]={name,policy:best,baseline,score,seconds:r.t.time,fallen:r.t.fallen,distance:r.t.points[0].x,steps:r.t.steps,slip:r.t.slip,pauseMotion:r.pauseMotion,fps:30,frames:r.frames,
  validation:[-.025,-.01,0,.01,.025].map(offset=>{const s=trial(best,offset);return {offset,seconds:s.t.time,fallen:s.t.fallen,distance:s.t.points[0].x,score:s.score};}),
  instruction:'Start roligt; brems 3,2–4 s; stå stille 4–6 s; gå videre fra 6 s.'};
 Object.assign(result,{status:finished?'finished':'running',stage:name,generation,generationsPerStage:8,candidatesPerGeneration:16,updatedAt:new Date().toISOString()});
 for(const root of ['public','dist'])writeFileSync(`${root}/training/result.json`,JSON.stringify(result));
}
publish(0);
for(let generation=1;generation<=8;generation++){
 for(let n=0;n<16;n++){
  const p=best.map((v:number,i:number)=>v+(rand()-.5)*([.08,.04,.08,.08,.08,.14,.06,.12,.04,.04][i]));
  p[1]=Math.max(0,p[1]);p[2]=Math.max(.4,p[2]);p[3]=Math.max(0,p[3]);
  const merit=assess(p);if(merit>score){score=merit;best=p;}
 }
 result.history.push({stage:name,generation,score});publish(generation);console.log(generation,score);
}
publish(8,true);
console.log(JSON.stringify({...result.skills[index],frames:undefined}));
