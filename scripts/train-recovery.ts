import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {Trial} from '../src/training/physics.ts';
const path='public/training/result.json',result=JSON.parse(readFileSync(path,'utf8'));
if(result.status!=='finished')throw new Error('Another run is active');
copyFileSync(path,`.local/training/before-recovery-${Date.now()}.json`);
const source=result.skills.find((s:{name:string})=>s.name==='Gangforsøg');
const base=source.policy.slice(0,10);
function run(gain:number,lift:number,impulse:number,record=false,seconds=12){
 const t=new Trial([...base,gain,lift],true),frames=[];
 for(let i=0;i<seconds*120&&!t.fallen;i++){
  if(i===360)t.impulse(1,impulse);
  t.step();if(record&&i%4===0)frames.push(t.points.map(p=>[p.x,p.y]));
 }
 return {t,frames};
}
const trials=[];let best={gain:0,lift:0,score:-Infinity};
const cases=[-1.6,0,1.6];
for(const gain of [-1.2,-1,-.8,-.6,-.4,-.2,0])for(const lift of [0,.1,.2,.3]){
 const rows=cases.map(impulse=>{const {t}=run(gain,lift,impulse);return {impulse,seconds:t.time,fallen:t.fallen,distance:t.points[0].x,slip:t.slip};});
 const score=(rows[1].fallen?-100:0)+rows.filter(r=>!r.fallen).length*20+Math.min(...rows.map(r=>r.seconds))+rows.reduce((n,r)=>n+r.distance-r.slip,0)*.1;
 trials.push({gain,lift,score,rows});if(score>best.score)best={gain,lift,score};
 console.log(JSON.stringify({gain,lift,score,passed:rows.filter(r=>!r.fallen).length}));
}
writeFileSync('.local/training/recovery-search.json',JSON.stringify({sourceRun:result.runId,best,trials},null,2));
for(const impulse of [-1.6,1.6]){
 const {t,frames}=run(best.gain,best.lift,impulse,true,30),name=impulse<0?'Balancereaktion bagud':'Balancereaktion fremad';
 const skill={name,policy:t.policy,baseline:trials.find(r=>r.gain===0&&r.lift===0)!.score,score:best.score,
  seconds:t.time,fallen:t.fallen,distance:t.points[0].x,steps:t.steps,slip:t.slip,fps:30,frames,
  disturbance:{at:3,impulse,point:1},validation:[]};
 const index=result.skills.findIndex((s:{name:string})=>s.name===name);
 if(index>=0)result.skills[index]=skill;else result.skills.push(skill);
}
result.updatedAt=new Date().toISOString();result.recoverySearch={best,trials};
for(const root of ['public','dist'])writeFileSync(`${root}/training/result.json`,JSON.stringify(result));
console.log('BEST',JSON.stringify(best));
