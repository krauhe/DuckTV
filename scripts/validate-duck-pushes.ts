import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {Trial} from '../src/training/physics.ts';

const file='public/training/result.json';
const result=JSON.parse(readFileSync(file,'utf8'));
if(result.status!=='finished')throw new Error('Wait for active training');
const policy=result.skills.find((s:{name:string})=>s.name==='Gangforsøg').policy;
mkdirSync('.local/training',{recursive:true});
copyFileSync(file,`.local/training/before-pushes-${Date.now()}.json`);
const cases=[];
for(const impulse of [-1.6,-.8,-.4,.4,.8,1.6]){
 const trial=new Trial(policy,true),frames=[];
 for(let i=0;i<1800&&!trial.fallen;i++){
  if(i===360)trial.impulse(1,impulse);
  trial.step();if(i%4===0)frames.push(trial.points.map(p=>[p.x,p.y]));
 }
 const record={impulse,at:3,point:'breast',seconds:trial.time,fallen:trial.fallen,distance:trial.points[0].x,steps:trial.steps,slip:trial.slip};
 cases.push(record);
 // Keep the two moderate pushes visible even when a test fails.
 if(Math.abs(impulse)===.8){
  const name=impulse>0?'Skub fremad':'Skub bagud';
  const skill={name,policy,baseline:0,score:trial.score(),...record,fps:30,frames,
   disturbance:{at:3,impulse,point:1},validation:[]};
  const existing=result.skills.findIndex((s:{name:string})=>s.name===name);
  if(existing>=0)result.skills[existing]=skill;else result.skills.push(skill);
 }
}
result.disturbanceValidation={horizon:15,units:'uncalibrated model impulse',cases};
result.updatedAt=new Date().toISOString();
for(const root of ['public','dist'])writeFileSync(`${root}/training/result.json`,JSON.stringify(result));
console.log(JSON.stringify(cases,null,2));
