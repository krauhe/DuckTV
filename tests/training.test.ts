import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,seedPolicy,Trial,startStopEnvelope} from '../src/training/physics.ts';

test('start and stop envelope has a genuine quiet pause and gradual boundaries',()=>{
 assert.equal(startStopEnvelope(0),0);assert.equal(startStopEnvelope(2),1);
 for(const t of [4,4.5,5,5.9,6])assert.equal(startStopEnvelope(t),0);
 assert.equal(startStopEnvelope(8),1);
 for(const boundary of [1.2,3.2,4,6,7.2])
  assert.ok(Math.abs(startStopEnvelope(boundary+.001)-startStopEnvelope(boundary-.001))<.00002);
});

test('external impulse changes momentum through inverse mass without teleporting joints',()=>{
 const t=new Trial(seedPolicy,true),dt=1/120;
 const before=t.points.map(p=>({...p}));
 t.impulse(1,.08,0,dt);
 assert.equal(t.points[1].x,before[1].x);
 assert.equal(t.points[1].y,before[1].y);
 const momentum=(t.points[1].x-t.points[1].px)/dt/t.points[1].w;
 assert.ok(Math.abs(momentum-.08)<1e-10);
 assert.deepEqual(t.points[0],before[0]);
 assert.throws(()=>t.impulse(100,1));
});
test('training simulation is deterministic and remains finite until a fall',()=>{
 const a=evaluate(seedPolicy,true),b=evaluate(seedPolicy,true);
 assert.deepEqual(a.points,b.points);
 assert.equal(a.score(),b.score());
 assert.ok(a.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.y>=.025));
 assert.ok(a.time>0&&a.time<=6.01);
});
test('an unsupported articulated body falls under gravity rather than staying suspended',()=>{
 const t=new Trial(seedPolicy,false);
 for(const p of t.points){p.y+=3;p.py+=3;}
 const start=t.points.reduce((sum,p)=>sum+p.y/p.w,0);
 for(let i=0;i<12;i++)t.step();
 const end=t.points.reduce((sum,p)=>sum+p.y/p.w,0);
 assert.ok(end<start-.1);
});

test('pose variation does not secretly inject an initial velocity',()=>{
 const t=new Trial(seedPolicy,false,.025);
 for(const p of t.points){assert.equal(p.x,p.px);assert.equal(p.y,p.py);}
});

test('standing feet retain their upper side and a broad sole in contact',()=>{
 const t=new Trial(seedPolicy,false);
 for(let i=0;i<720;i++){
  t.step();
  for(let side=0;side<2;side++){
   const ankle=t.points[6+side*3],toe=t.points[10+side*2],heel=t.points[11+side*2];
   const signedArea=(toe.x-heel.x)*(ankle.y-heel.y)-(toe.y-heel.y)*(ankle.x-heel.x);
   assert.ok(signedArea>.007,'foot triangle cannot invert under weight');
   if(i>120){assert.ok(Math.abs(toe.y-heel.y)<.012,'stance uses a flat sole');}
  }
 }
 assert.equal(t.fallen,false);
});

test('neck motors absorb a small torso balance correction without dragging the head along',()=>{
 const t=new Trial(seedPolicy,false),head:number[]=[],body:number[]=[];
 for(let i=0;i<360;i++){
  if(i===120)t.points[1].px-=.002; // An explicit impulse, separate from pose validation.
  t.step();
  if(i>=120&&i<240){head.push(t.points[3].x);body.push(t.points[1].x);}
 }
 const span=(values:number[])=>Math.max(...values)-Math.min(...values);
 assert.ok(span(body)>.02,'the disturbance actually moves the body');
 assert.ok(span(head)<span(body)*.15,'neck absorbs most of the torso correction');
 assert.equal(t.fallen,false);
});

test('deliberate three-second bows remain visible while neck control preserves balance',()=>{
 const t=new Trial(seedPolicy,false,0,'bow'),heights:number[]=[];
 for(let i=0;i<720;i++){t.step();heights.push(t.points[3].y);}
 assert.equal(t.fallen,false);
 assert.ok(Math.max(...heights)-Math.min(...heights)>.17,'head stabilization must not erase the intentional bow');
 assert.ok(Math.abs(heights[57]-heights[417])<.01,'the second bow repeats three seconds later');
 assert.ok(Math.max(...heights.slice(1).map((h,i)=>Math.abs(h-heights[i])))<.012,'no one-frame snapping');
});
