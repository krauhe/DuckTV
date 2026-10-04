import {readFileSync,writeFileSync,existsSync,copyFileSync} from 'node:fs';
import {Trial,type Policy} from '../src/training/physics.ts';
const data=JSON.parse(readFileSync('public/training/result.json','utf8'));
if(data.status!=='finished')throw new Error('Finish the active gait round first.');
copyFileSync('public/training/result.json',`.local/training/before-bow-${Date.now()}.json`);
const existing=data.skills.findIndex((s:{name:string})=>s.name==='Rytmiske duk');
const skillIndex=existing<0?data.skills.length:existing;
let best:Policy=[...data.skills[0].policy],seed=732;
for(const skill of data.skills){skill.runId??=data.runId;skill.physicsRevision??=data.physicsRevision;}
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function trial(policy:Policy,offset:number,seconds=6){const t=new Trial(policy,false,offset,'bow');for(let i=0;i<seconds*120&&!t.fallen;i++)t.step();return t;}
function score(policy:Policy){return Math.min(...[-.015,0,.015].map(o=>trial(policy,o).score()));}
let fitness=score(best);const baseline=fitness;
function capture(long=false){
 const t=new Trial(best,false,0,'bow'),frames=[];
 for(let i=0;i<(long?3600:720)&&!t.fallen;i++){t.step();if(i%4===0)frames.push(t.points.map(p=>[p.x,p.y]));}
 return {name:'Rytmiske duk',runId:data.runId,physicsRevision:data.physicsRevision,policy:[...best],baseline,score:fitness,seconds:t.time,fallen:t.fallen,distance:t.points[0].x,fps:30,frames,
  source:'Owner-observed three-second rhythm; reference target authored, balance parameters optimized.',
  instruction:'Rytmiske duk med tre sekunders mellemrum. Rytmen er angivet ud fra ejerens observation; balancen er optimeret i fysikmodellen.',
  ...(long?{longValidation:[-.025,-.01,0,.01,.025].map(offset=>{const v=trial(best,offset,30);return {offset,seconds:v.time,fallen:v.fallen,distance:v.points[0].x,score:v.score()};})}:{}),
  validation:[-.025,-.01,0,.01,.025].map(offset=>{const v=trial(best,offset);return {offset,seconds:v.time,fallen:v.fallen,distance:v.points[0].x,score:v.score()};})};
}
data.parentRunId=data.runId;data.runId=new Date().toISOString();data.physicsRevision='webbed-feet-neck-control-5';data.status='running';data.stage='Rytmiske duk';data.generationsPerStage=20;data.candidatesPerGeneration=12;
for(let generation=0;generation<=20;generation++){
 if(generation>0)for(let i=0;i<12;i++){
  const candidate=best.map((p,j)=>[0,4,6,7,8,9].includes(j)?Math.max(-.6,Math.min(.6,p+(random()-.5)*.06)):p);
  const s=score(candidate);if(s>fitness){fitness=s;best=candidate;}
 }
 data.skills[skillIndex]=capture(generation===20);data.history.push({stage:'Rytmiske duk',generation,score:fitness});data.generation=generation;data.updatedAt=new Date().toISOString();
 if(generation===20)data.status='finished';
 for(const root of ['public','dist'])if(existsSync(`${root}/training`))writeFileSync(`${root}/training/result.json`,JSON.stringify(data));
 if(generation%5===0)console.log('Rytmiske duk',generation,fitness.toFixed(2),data.skills[skillIndex].validation.filter((v:{fallen:boolean})=>!v.fallen).length+'/5');
}
