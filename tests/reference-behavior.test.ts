import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { Simulation } from '../src/simulation';
import { followCandidate, perceive, wingStimulus, type Neighbor } from '../src/social-behavior';
import { gestureChannels, type DuckGesture } from '../src/duck-gestures';
import { createDuck } from '../src/duck-model';

test('following excludes reciprocal chains, flight and distant birds',()=>{
  const a:Neighbor={id:'a',x:0,z:0,state:'wander',speed:0};
  const b:Neighbor={id:'b',x:0,z:2,state:'wander',speed:.5};
  assert.equal(followCandidate(a,[a,b])?.id,'b');
  for(const other of [{...b,followingId:'a'},{...b,state:'retreat' as const},{...b,z:5},{...b,speed:0}])
    assert.equal(followCandidate(a,[a,other]),undefined);
  assert.ok(perceive(a,[a,{...b,state:'forage'}]).foraging>0);
  assert.equal(perceive(a,[a,{...b,state:'forage',z:8}]).foraging,0);
});

test('gesture clips finish folded and feet stay grounded through wings and tail motion',()=>{
  for(const kind of ['wingFlap','wingStretch','tailWag'] as DuckGesture[]){
    assert.deepEqual(gestureChannels({kind,progress:0,side:-1}),gestureChannels());
    const end=gestureChannels({kind,progress:1,side:-1});
    assert.ok(Object.values(end).every(v=>Math.abs(v)<1e-9));
    const model=createDuck('pied');let maxSpan=0;
    for(let i=1;i<=240;i++){
      model.animate({state:'rest',time:i/60,speed:0,upright:1,look:0,peck:0,headTilt:0,displayDip:0,
        gesture:i<=180?{kind,progress:i/180,side:-1}:undefined});
      model.group.updateMatrixWorld(true);
      for(const side of ['left','right']){
        const foot=model.group.getObjectByName(`duck-${side}-foot`)!.getWorldPosition(new Vector3());
        assert.ok(Math.abs(foot.y-.0032)<1e-5,`${kind}: planted foot`);
      }
      maxSpan=Math.max(maxSpan,model.group.getObjectByName('duck-left-wing-shoulder')!.scale.x);
    }
    if(kind!=='tailWag')assert.ok(maxSpan>.7);
    assert.ok(model.group.getObjectByName('duck-left-wing-shoulder')!.scale.x<.002,'smoothly folds after interruption');
  }
});

test('flock decisions have a delay and food interrupts following and gestures',()=>{
  const sim=new Simulation(()=>.5);
  const follower=sim.ducks[2],leader=sim.ducks[1];
  Object.assign(follower,{x:-3,z:0,state:'wander',speed:0});
  Object.assign(leader,{x:-3,z:2,state:'wander',speed:.5,heading:0});
  sim.update(.025);assert.equal(follower.followingId,undefined);
  follower.followingId=leader.id;
  follower.gesture={kind:'wingFlap',progress:.5,side:1};
  sim.castFood(-2,0);sim.update(.025);
  assert.equal(follower.followingId,undefined);assert.equal(follower.gesture,undefined);
  assert.ok(['notice','approach','eat'].includes(follower.state));
});

test('a sustained moving neighbour recruits a follower after its individual delay',()=>{
  const sim=new Simulation(()=>.5),leader=sim.ducks[1],follower=sim.ducks[2];
  const followingAt:number[]=[];
  for(let frame=0;frame<100;frame++){
    // A controlled passing bird supplies the stimulus; the follower uses normal decisions.
    Object.assign(leader,{x:-.9,z:1.5+frame*.004,state:'wander',speed:.3,heading:0});
    Object.assign(follower,{x:-.9,z:.2,state:'wander',speed:0});
    Object.assign(sim.ducks[0],{x:-4,z:-3,state:'sleep',speed:0});
    Object.assign(sim.ducks[3],{x:4,z:3,state:'sleep',speed:0});
    sim.update(.025);
    if(follower.followingId===leader.id)followingAt.push(sim.time);
  }
  assert.ok(followingAt.length>0,'normal simulation starts following');
  assert.ok(followingAt[0]>=1.3&&followingAt[0]<1.6,'sustained perception precedes following');
});


test('flapping raises the body and sweeps both wrists forward while feet stay planted',()=>{
  const model=createDuck('buff');
  const pose={state:'rest' as const,time:0,speed:0,upright:1,look:0,peck:0,headTilt:0,displayDip:0};
  for(let i=0;i<120;i++)model.animate({...pose,time:i/60});
  model.group.updateMatrixWorld(true);
  const head=model.group.getObjectByName('duck-head')!;
  const baseline=head.getWorldPosition(new Vector3()).y;
  let forward=false,tall=false;
  for(let i=1;i<145;i++){
    model.animate({...pose,time:2+i/60,gesture:{kind:'wingFlap',progress:i/145,side:1}});
    model.group.updateMatrixWorld(true);
    tall ||= head.getWorldPosition(new Vector3()).y>baseline+.025;
    const left=model.group.getObjectByName('duck-left-wing-wrist')!.getWorldPosition(new Vector3());
    const right=model.group.getObjectByName('duck-right-wing-wrist')!.getWorldPosition(new Vector3());
    forward ||= left.z>.03&&right.z>.03;
  }
  assert.ok(tall,'body and neck extend during the bout');
  assert.ok(forward,'both wings sweep towards the bill');
});

test('pasta is held by one duck during handling and released on interruption',()=>{
  const sim=new Simulation(()=>.5);sim.setViewer(6,8);
  sim.castFood(-1,1);
  let held=false;
  for(let i=0;i<800;i++){
    sim.update(.025);
    const food=sim.foods.find(f=>f.carriedBy);
    if(!food)continue;
    held=true;
    const duck=sim.ducks.find(d=>d.id===food.carriedBy)!;
    assert.equal(duck.state,'eat');assert.ok(food.eaten);
    assert.ok(duck.mouthOpen>0);
    sim.setViewer(duck.x,duck.z);sim.update(.025);
    assert.equal(food.carriedBy,undefined,'a retreat clears the visible held piece');
    break;
  }
  assert.ok(held,'feeding reaches a separate handling phase');
});

test('a nearby pied hen can approach before a distant buff hen',()=>{
  const sim=new Simulation(()=>.5);sim.setViewer(6,8);
  Object.assign(sim.ducks[3],{x:-1,z:1,state:'rest'});
  Object.assign(sim.ducks[1],{x:-4,z:3,state:'rest'});
  sim.castFood(-1,1.4);
  const first=new Map<string,number>();
  for(let i=0;i<120;i++){
    sim.update(.025);
    for(const d of sim.ducks)if(d.state==='approach'&&!first.has(d.kind))first.set(d.kind,sim.time);
  }
  assert.ok(first.get('pied')!<first.get('buff')!,'distance can outweigh individual caution');
});


test('chest grooming reaches a distinct front target and releases into sleep',()=>{
  const model=createDuck('drake');
  const pose={state:'preen' as const,time:0,speed:0,upright:0,look:0,peck:0,headTilt:0,displayDip:0};
  const head=model.group.getObjectByName('duck-head')!;
  for(let i=0;i<180;i++)model.animate({...pose,time:i/60,preenTarget:'wing'});
  model.group.updateMatrixWorld(true);
  const back=head.getWorldPosition(new Vector3());
  for(let i=0;i<180;i++)model.animate({...pose,time:3+i/60,preenTarget:'chest'});
  model.group.updateMatrixWorld(true);
  assert.ok(head.getWorldPosition(new Vector3()).z>back.z+.1,'chest lies ahead of wing target');
  for(let i=0;i<180;i++)model.animate({...pose,state:'sleep',time:6+i/60,preenTarget:'chest'});
  model.group.updateMatrixWorld(true);
  assert.ok(head.getWorldPosition(new Vector3()).z<0,'sleep still tucks back');
  const up=new Vector3(0,1,0).transformDirection(head.matrixWorld);
  assert.ok(up.y>.7,'sleep leaves the crown upright');
});


test('social wing responses are local, delayed, and do not echo indefinitely',()=>{
  const self:Neighbor={id:'self',state:'rest',speed:0,x:0,z:0};
  const other:Neighbor={id:'other',state:'rest',speed:0,x:2,z:0,gesture:{kind:'wingFlap',progress:.2,side:1}};
  assert.equal(wingStimulus(self,[self,other])?.id,'other');
  assert.equal(wingStimulus(self,[{...other,x:5}]),undefined);
  assert.equal(wingStimulus(self,[{...other,gesture:{...other.gesture!,social:true}}]),undefined);
  const sim=new Simulation(()=>0);sim.setViewer(6,8);
  const positions=[[4,3],[0,2],[-1.5,2.4],[-4,3]];
  const source=sim.ducks[1],recipient=sim.ducks[2];
  const place=()=>sim.ducks.forEach((d,i)=>Object.assign(d,{x:positions[i][0],z:positions[i][1],state:'rest',speed:0,vx:0,vz:0}));
  place();source.gesture={kind:'wingFlap',progress:.2,side:1};
  let responseAt=0;
  for(let i=0;i<140;i++){
    place();sim.update(.025);
    if(recipient.gesture?.social){responseAt=sim.time;break;}
  }
  assert.ok(responseAt>=1.6&&responseAt<3,'response is delayed, not synchronized');
  sim.castFood(-1,2);sim.update(.025);
  assert.equal(recipient.gesture,undefined,'food interrupts social flapping too');
});
