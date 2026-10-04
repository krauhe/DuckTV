import test from 'node:test';
import assert from 'node:assert/strict';
import {drive,DYNAMICS,Spring,planHop,HOP_GRAVITY} from '../src/dynamics';

test('a hop clears its apex and reaches water under gravity, independently of mass',()=>{
 for(const [start,end] of [[0,.27],[.27,0]]){
  for(const mass of [1.7,2]){
   const hop=planHop(start,end,.56,mass),vy=hop.impulse/mass;
   const height=(t:number)=>start+vy*t-.5*HOP_GRAVITY*t*t;
   assert.ok(hop.duration>.45&&hop.duration<.7,'short flight instead of a floating transition');
   assert.ok(Math.abs(height(vy/HOP_GRAVITY)-.56)<1e-10);
   assert.ok(Math.abs(height(hop.duration)-end)<1e-10);
   assert.ok(vy-HOP_GRAVITY*hop.duration<0,'landing has downward momentum');
  }
 }
 assert.equal(planHop(0,.27,.56,1.7).duration,planHop(0,.27,.56,2).duration);
});

test('steering force bounds acceleration during starts, reversals and braking',()=>{
 for(const mass of [1.7,2]){
  const m={mass,vx:0,vz:0,ax:0,az:0};
  for(let i=0;i<240;i++){
   const vx=m.vx,vz=m.vz;
   drive(m,i<80?.8:i<160?-.8:0,i<160?.3:0,.025);
   assert.ok(Math.hypot(m.vx-vx,m.vz-vz)<=DYNAMICS.driveForce/mass*.025+1e-10);
  }
  assert.ok(Math.hypot(m.vx,m.vz)<.003);
 }
 const light={mass:1.7,vx:0,vz:0,ax:0,az:0},heavy={...light,mass:2};
 drive(light,1,0,.025);drive(heavy,1,0,.025);
 assert.ok(light.vx>heavy.vx,'the same force accelerates a lighter body faster');
});

test('braking travels a finite distance instead of freezing at the state change',()=>{
 const m={mass:2,vx:.8,vz:0,ax:0,az:0};let x=0;
 drive(m,0,0,.025);assert.ok(m.vx>0&&m.vx<.8);
 for(let i=0;i<200;i++){drive(m,0,0,.025);x+=m.vx*.025}
 assert.ok(x>.1&&x<.4);assert.ok(m.vx<.0001);
});

test('elastic spring has inertia, settles without exploding, and tolerates different frame rates',()=>{
 const endpoints=[];
 for(const dt of [1/30,1/60,1/120]){
  const spring=new Spring();
  const first=spring.step(.2,dt);assert.ok(first>0&&first<.2);
  for(let i=0;i<Math.round(2/dt);i++)spring.step(.2,dt);
  assert.ok(Math.abs(spring.value-.2)<.001);
  for(let i=0;i<Math.round(3/dt);i++){spring.step(0,dt);assert.ok(Number.isFinite(spring.value)&&Math.abs(spring.value)<.25)}
  endpoints.push(spring.value);assert.ok(Math.abs(spring.value)<.0001);
 }
 assert.ok(Math.max(...endpoints)-Math.min(...endpoints)<.0001);
});
