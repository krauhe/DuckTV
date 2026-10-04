import {mkdirSync,writeFileSync,existsSync,copyFileSync,readFileSync} from 'node:fs';
import {Trial,evaluate,seedPolicy,type Policy} from '../src/training/physics.ts';
let seed=421;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const bounds=[[-.6,.6],[0,.7],[.4,2.5],[0,.8],[-.6,.6],[-Math.PI,Math.PI],[-.4,.4],[-3,3],[-.4,.4],[-.5,.5]];
const generations=Number(process.env.DUCK_TRAIN_GENERATIONS)||40;
const robust=process.env.DUCK_TRAIN_ROBUST==='1';
function runTrial(policy:Policy,walking:boolean,offset:number,seconds=6){
 const t=new Trial(policy,walking,offset);
 for(let i=0;i<seconds*120&&!t.fallen;i++)t.step();
 return t;
}
const history:{stage:string;generation:number;score:number}[]=[];
const skills:ReturnType<typeof capture>[]=[];
const runId=new Date().toISOString();
const previous=existsSync('public/training/result.json')?JSON.parse(readFileSync('public/training/result.json','utf8')):undefined;
mkdirSync('public/training',{recursive:true});mkdirSync('.local/training',{recursive:true});
if(existsSync('public/training/result.json'))copyFileSync('public/training/result.json',`.local/training/before-${Date.now()}.json`);
function assess(policy:Policy,walking:boolean){
 if(robust&&walking){
  const trials=[-.025,-.0125,0,.0125,.025].map(offset=>runTrial(policy,true,offset,12));
  const scores=trials.map(t=>t.score()/12-(t.fallen?60:0)-t.slip/12*4);
  return Math.min(...scores)*.85+scores.reduce((a,b)=>a+b,0)/scores.length*.15;
 }
 const scores=[-.015,0,.015].map(offset=>evaluate(policy,walking,offset).score());
 return Math.min(...scores)*.7+scores.reduce((a,b)=>a+b,0)/scores.length*.3;
}
function capture(policy:Policy,walking:boolean,baseline:number,score:number){
 const trial=new Trial(policy,walking),frames=[];
 for(let i=0;i<720&&!trial.fallen;i++){trial.step();if(i%4===0)frames.push(trial.points.map(p=>[p.x,p.y]));}
 const validation=[-.025,-.01,0,.01,.025].map(offset=>{const t=evaluate(policy,walking,offset);return {offset,seconds:t.time,fallen:t.fallen,distance:t.points[0].x,score:t.score()};});
 return {name:walking?'Gangforsøg':'Ståforsøg',policy:[...policy],baseline,score,seconds:trial.time,fallen:trial.fallen,distance:trial.points[0].x,steps:trial.steps,slip:trial.slip,fps:30,frames,validation};
}
function publish(stage:string,generation:number,status='running'){
 const data=JSON.stringify({version:2,physicsRevision:'verified-forward-steps-6',runId,updatedAt:new Date().toISOString(),status,stage,generation,generationsPerStage:generations,candidatesPerGeneration:24,method:'Evolutionary search; steps require forward travel, sustained clearance and alternating foot contact',skills,history});
 for(const root of ['public','dist'])if(existsSync(root)){
  mkdirSync(`${root}/training`,{recursive:true});writeFileSync(`${root}/training/result.json`,data);
 }
}
let best=previous?.skills?.[0]?.policy?.length===seedPolicy.length?[...previous.skills[0].policy]:[...seedPolicy];
for(const walking of [false,true]){
 if(walking&&previous?.skills?.[1]?.policy?.length===seedPolicy.length){
  const old=previous.skills[1].policy;
  if(robust||assess(old,true)>assess(best,true))best=[...old];
 }
 const stage=walking?'Gangforsøg':'Ståforsøg',index=walking?1:0;
 const baseline=assess(best,walking);let score=baseline;
 skills[index]=capture(best,walking,baseline,score);publish(stage,0);
 if(!walking&&process.env.DUCK_TRAIN_GAIT_ONLY==='1')continue; // standing checkpoint was re-evaluated under the current physics
 for(let generation=1;generation<=generations;generation++){
  for(let candidate=0;candidate<24;candidate++){
   const scale=(robust?(candidate%3===0?.015:.055):.15)*(1-generation/(generations+20));
   const policy=best.map((v,i)=>Math.max(bounds[i][0],Math.min(bounds[i][1],v+(random()+random()+random()-1.5)*(bounds[i][1]-bounds[i][0])*scale)));
   const fitness=assess(policy,walking);
   if(fitness>score){score=fitness;best=policy;}
  }
  history.push({stage,generation,score});skills[index]=capture(best,walking,baseline,score);publish(stage,generation);
  if(generation%10===0)console.log(stage,generation,score.toFixed(3),skills[index].validation.filter(v=>!v.fallen).length+'/5 stable');
 }
}
if(robust){
 const s=skills[1];
 const replay=new Trial(s.policy,true),frames=[];
 for(let i=0;i<3600&&!replay.fallen;i++){replay.step();if(i%4===0)frames.push(replay.points.map(p=>[p.x,p.y]));}
 Object.assign(s,{frames,seconds:replay.time,distance:replay.points[0].x,steps:replay.steps,slip:replay.slip,fallen:replay.fallen});
 Object.assign(s,{longValidation:[-.025,-.01,0,.01,.025].map(offset=>{
  const t=runTrial(s.policy,true,offset,30);return {offset,seconds:t.time,fallen:t.fallen,distance:t.points[0].x,steps:t.steps,slip:t.slip};
 }),trainingHorizon:12});
}
publish('Afsluttet',generations,'finished');
console.log(JSON.stringify(skills.map(({frames,...s})=>s),null,2));
