import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {Trial} from '../src/training/physics.ts';

const path='public/training/result.json';
const result=JSON.parse(readFileSync(path,'utf8'));
if(result.status!=='finished')throw new Error('Finish the current training run first');
const skill=result.skills.find((s:{name:string})=>s.name==='Start · stop · gå');
if(!skill)throw new Error('No start-stop candidate');
copyFileSync(path,`.local/training/before-start-stop-validation-${Date.now()}.json`);
skill.longValidation=[-.025,-.01,0,.01,.025].map(offset=>{
 const trial=new Trial(skill.policy,true,offset,'start-stop');
 const frames:number[][][]=[];
 for(let i=0;i<3600&&!trial.fallen;i++){
  trial.step();if(offset===0&&i%4===0)frames.push(trial.points.map(p=>[p.x,p.y]));
 }
 if(offset===0)Object.assign(skill,{seconds:trial.time,fallen:trial.fallen,distance:trial.points[0].x,steps:trial.steps,slip:trial.slip,frames});
 const summary={offset,seconds:trial.time,fallen:trial.fallen,distance:trial.points[0].x,slip:trial.slip,steps:trial.steps,score:trial.score()};
 console.log(JSON.stringify(summary));return summary;
});
result.updatedAt=new Date().toISOString();
for(const root of ['public','dist'])writeFileSync(`${root}/training/result.json`,JSON.stringify(result));
