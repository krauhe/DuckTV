// Experimental planar, position-based articulated body. No measured duck anatomy.
import { FootContact } from './foot-contact';
export type Point={x:number;y:number;px:number;py:number;w:number};
export const jointNames=['pelvis','breast','neck-middle','head','left-knee','left-hock','left-ankle','right-knee','right-hock','right-ankle','left-toe','left-heel','right-toe','right-heel'];
export const bones=[[0,1],[1,2],[2,3],[0,4],[4,5],[5,6],[0,7],[7,8],[8,9],[6,10],[6,11],[10,11],[9,12],[9,13],[12,13]];
export const initial=[[0,.53],[.05,.87],[.20,1.13],[.08,1.40],[.09,.43],[-.07,.25],[.08,.065],[.09,.43],[-.07,.25],[.08,.065],[.22,.025],[-.06,.025],[.22,.025],[-.06,.025]];
export const lengths=bones.map(([a,b])=>Math.hypot(initial[a][0]-initial[b][0],initial[a][1]-initial[b][1]));
export type Policy=number[];
export const seedPolicy:Policy=[0, .15, 1.3, .13, 0, 0, 0,0,0,0];
const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
export function startStopEnvelope(time:number){
 const smooth=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x);};
 return smooth(time/1.2)*(1-smooth((time-3.2)/.8))+smooth((time-6)/1.2);
}
export class Trial {
 points:Point[]=initial.map(([x,y],i)=>({x,y,px:x,py:y,w:i===0?.5:i===1?1:i<4?6:i<10?12:30}));
 time=0;fallen=false;effort=0;slip=0;upright=0;headMotion=0;footPosture=0;
 private headGoalX=.08;
 private controlledPhase=0;
 private contacts=new FootContact();
 get steps(){return this.contacts.steps;}
 singleSupport=0;
 constructor(public policy:Policy,public walking:boolean,perturbation=0,public activity:'balance'|'bow'|'start-stop'='balance'){
  // A changed initial pose is not an impulse: move the Verlet history too.
  this.points[1].x+=perturbation;this.points[1].px+=perturbation;
 }
 /** Apply a physical impulse through Verlet velocity history, not a position jump.
  * Units follow the experimental point masses; they are not calibrated duck forces.
  */
 impulse(point:number,x:number,y=0,dt=1/120){
  if(!Number.isInteger(point)||!this.points[point]||![x,y,dt].every(Number.isFinite)||dt<=0)throw new RangeError('Invalid impulse');
  const q=this.points[point];q.px-=x*q.w*dt;q.py-=y*q.w*dt;
 }
 step(dt=1/120){
  const p=this.points;
  for(const q of p){const vx=(q.x-q.px)*.998,vy=(q.y-q.py)*.998;q.px=q.x;q.py=q.y;q.x+=vx;q.y+=vy-9.81*dt*dt;}
  // Internal joint motors redistribute motion across all three masses.
  const joint=(a:number,b:number,c:number,target:number,strength:number)=>{
   const u={x:p[a].x-p[b].x,y:p[a].y-p[b].y},v={x:p[c].x-p[b].x,y:p[c].y-p[b].y};
   const l=Math.max(.0001,u.x*u.x+u.y*u.y),r=Math.max(.0001,v.x*v.x+v.y*v.y);
   const error=wrap(Math.atan2(v.y,v.x)-Math.atan2(u.y,u.x)-target);
   const g=[{x:-u.y/l,y:u.x/l},{x:u.y/l-v.y/r,y:-u.x/l+v.x/r},{x:v.y/r,y:-v.x/r}];
   // g is the negative gradient; move along it to reduce the angle error.
   const ids=[a,b,c];let denom=0;ids.forEach((id,i)=>denom+=p[id].w*(g[i].x*g[i].x+g[i].y*g[i].y));
   const impulse=Math.max(-.10,Math.min(.10,error))*strength/Math.max(.0001,denom);
   ids.forEach((id,i)=>{p[id].x+=p[id].w*g[i].x*impulse;p[id].y+=p[id].w*g[i].y*impulse;});
   this.effort+=Math.abs(impulse);
  };
  const [lean,amp,freq,kneeAmp,kneeBias,phaseBias,neck,balance=0,damping=0,ankleBias=0,recoveryGain=0,recoveryLift=0]=this.policy;
  const tilt=Math.atan2(p[1].x-p[0].x,p[1].y-p[0].y)-.146;
  const oldTilt=Math.atan2(p[1].px-p[0].px,p[1].py-p[0].py)-.146;
  const correction=Math.max(-.6,Math.min(.6,balance*tilt+damping*wrap(tilt-oldTilt)/dt));
  // Reactive joint targets, not an external force or a pinned body.
  // Leave normal sway alone; recruit the swinging leg when lean/rotation grows.
  const predictedLean=tilt+wrap(tilt-oldTilt)/dt*.12;
  const recovery=Math.sign(predictedLean)*Math.min(.6,Math.max(0,Math.abs(predictedLean)-.20));
  const gaitRamp=this.activity==='start-stop'?startStopEnvelope(this.time):Math.min(1,this.time/1.2);
  const phase=this.activity==='start-stop'?this.controlledPhase:this.time*Math.PI*2*freq;
  this.controlledPhase+=Math.PI*2*freq*gaitRamp*dt;
  // Follow forward travel slowly, but absorb the body's faster balance sway.
  const bowPhase=this.time%3;
  const bow=this.activity==='bow'&&bowPhase<.95?Math.sin(bowPhase/.95*Math.PI)**2:0;
  this.headGoalX+=((this.walking?p[0].x:0)+.08+bow*.12-this.headGoalX)*(1-Math.exp(-dt*4));
  for(let k=0;k<35;k++){
   for(let side=0;side<2;side++){
    const h=4+side*3,s=phase+side*Math.PI;
    const swing=this.walking?Math.sin(s)*gaitRamp:0;
    const freeLeg=this.walking?Math.max(0,Math.sin(s+phaseBias)):0;
    joint(1,0,h,-2.26+lean+amp*swing+recovery*recoveryGain*freeLeg,.23);
    joint(0,h,h+1,1.68+kneeBias-(this.walking?kneeAmp*freeLeg*gaitRamp:0)-Math.abs(recovery)*recoveryLift*freeLeg,.24);
    joint(h,h+1,h+2,-1.74,.22);
    joint(h+1,h+2,10+side*2,-2.53+ankleBias+correction,.22);
    // Preserve the upper side of the rigid webbed foot. Distance constraints
    // alone permit a triangle to turn inside out during a strong contact step.
    joint(11+side*2,h+2,10+side*2,2.585,.8);
   }
   // Two internal neck motors aim at a steady head position. The head is never
   // pinned to world coordinates: joint forces also act back on the body.
   const dx=this.headGoalX-p[1].x,dy=1.4+neck*.08-bow*.20-p[1].y;
   const distance=Math.max(.01,Math.hypot(dx,dy));
   const reach=Math.min(lengths[1]+lengths[2]-.002,Math.max(Math.abs(lengths[1]-lengths[2])+.002,distance));
   const along=(lengths[1]**2-lengths[2]**2+reach**2)/(2*reach);
   const bend=Math.sqrt(Math.max(0,lengths[1]**2-along**2));
   const ex=dx/distance*along+dy/distance*bend,ey=dy/distance*along-dx/distance*bend;
   const lowerAngle=Math.atan2(ey,ex),upperAngle=Math.atan2(dy/distance*reach-ey,dx/distance*reach-ex);
   const bodyAngle=Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x);
   joint(0,1,2,wrap(lowerAngle-bodyAngle-Math.PI),.5);
   joint(1,2,3,wrap(upperAngle-lowerAngle-Math.PI),.5);
   bones.forEach(([a,b],i)=>{const dx=p[b].x-p[a].x,dy=p[b].y-p[a].y,d=Math.max(.0001,Math.hypot(dx,dy));const f=(d-lengths[i])/d/(p[a].w+p[b].w);p[a].x+=dx*f*p[a].w;p[a].y+=dy*f*p[a].w;p[b].x-=dx*f*p[b].w;p[b].y-=dy*f*p[b].w;});
   for(let i=0;i<p.length;i++)if(p[i].y<.025){p[i].y=.025;if(i>=10)p[i].x+=(p[i].px-p[i].x)*.65;}
  }
  this.time+=dt;this.upright+=Math.max(0,p[1].y-p[0].y)*dt;
  for(let i=10;i<p.length;i++)if(p[i].y<.03)this.slip+=Math.abs(p[i].x-p[i].px);
  this.headMotion+=Math.abs(p[3].y-p[3].py);
  for(let side=0;side<2;side++){
   const toe=p[10+side*2],heel=p[11+side*2];
   if(!this.walking||Math.min(toe.y,heel.y)<.03)this.footPosture+=Math.abs(toe.y-heel.y)*dt;
   this.contacts.sample(side,this.time,dt,toe,heel);
   const otherToe=p[10+(1-side)*2],otherHeel=p[11+(1-side)*2];
   if(Math.min(toe.y,heel.y)>.045&&Math.max(otherToe.y,otherHeel.y)<.04)this.singleSupport+=dt;
  }
  if(p[0].y<.2||p[1].y<.38)this.fallen=true;
 }
 score(){return this.time*2+this.upright*8+(this.walking?Math.max(-1,Math.min(2,this.points[0].x))*5*Math.min(1,this.steps/3)+Math.min(12,this.steps)*1.5+Math.min(3,this.singleSupport)*2: -Math.abs(this.points[0].x)*3)-this.slip*3-this.headMotion*.5-this.footPosture*20-this.effort*.002-(this.fallen?8:0);}
}
export function evaluate(policy:Policy,walking:boolean,perturbation=0){const trial=new Trial(policy,walking,perturbation);for(let i=0;i<720&&!trial.fallen;i++)trial.step();return trial;}
