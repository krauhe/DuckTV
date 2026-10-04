import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {bones,initial,jointNames} from '../src/training/physics.ts';
const result=JSON.parse(readFileSync('public/training/result.json','utf8'));
if(result.status!=='finished')throw new Error('Wait for the current training run to finish before exporting its library.');
const entries=[];
for(const [index,skill] of result.skills.entries()){
 if(!Array.isArray(skill.frames)||!skill.frames.length||skill.frames.some((frame:number[][])=>frame.length!==jointNames.length||frame.some(p=>p.length!==2||!p.every(Number.isFinite))))throw new Error('Invalid recorded skeleton');
 const ids:Record<string,string>={'Start · stop · gå':'start-stop-candidate','Ståforsøg':'stand-candidate','Gangforsøg':'walk-candidate','Rytmiske duk':'bow-candidate','Skub fremad':'push-forward-candidate','Skub bagud':'push-backward-candidate','Balancereaktion fremad':'recovery-forward-candidate','Balancereaktion bagud':'recovery-backward-candidate'};
 const id=ids[skill.name]??`skill-${index}-candidate`;
 const rootMotion=skill.frames.map((frame:number[][])=>[frame[0][0],0,0]);
 const localFrames=skill.frames.map((frame:number[][])=>frame.map(([x,y])=>[x-frame[0][0],y,0]));
 const clip={schema:'ducktv-motion-clip-v1',id,name:skill.name,approval:'experimental-not-approved',runId:skill.runId??result.runId,physicsRevision:skill.physicsRevision??result.physicsRevision,
  units:'scene units; not measured metres',axes:{up:'y',forward:'x'},fps:skill.fps,loop:false,disturbance:skill.disturbance,instruction:skill.instruction,
  skeleton:{jointNames,bones,restPose:initial},rootMotion,localFrames,
  validation:skill.validation,longValidation:skill.longValidation,notes:['Planar physical trial, not a finished duck animation.','Retarget joint positions to the final rig before use.','Head orientation is not physically simulated.','Passing six-second pose trials does not prove naturalness or long-term balance.']};
 mkdirSync('public/training/clips',{recursive:true});writeFileSync(`public/training/clips/${id}.json`,JSON.stringify(clip));
 entries.push({id,name:skill.name,url:`./${id}.json`,approval:clip.approval});
}
// A gait-only run must not discard independently trained display motions.
const bowPath='public/training/clips/bow-candidate.json';
if(!entries.some(e=>e.id==='bow-candidate')&&existsSync(bowPath)){
 const bow=JSON.parse(readFileSync(bowPath,'utf8'));
 entries.push({id:bow.id,name:bow.name,url:'./bow-candidate.json',approval:bow.approval});
}
writeFileSync('public/training/clips/manifest.json',JSON.stringify({schema:'ducktv-motion-library-v1',runId:result.runId,entries},null,2));
console.log(`Exported ${entries.length} experimental clips with skeleton, root motion and validation.`);
