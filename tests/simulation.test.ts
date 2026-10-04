import assert from 'node:assert/strict';
import test from 'node:test';
import { BEHAVIOR, Simulation } from '../src/simulation.ts';
import { GARDEN, POND } from '../src/types.ts';
import { DYNAMICS, HOP_GRAVITY } from '../src/dynamics';

function seeded(seed = 42): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function advance(sim: Simulation, seconds: number): void {
  for (let remaining = seconds; remaining > 0; remaining -= 0.1) sim.update(Math.min(remaining, 0.1));
}

test('pond flights follow gravity, clear the rim, and signal a single water landing',()=>{
 const sim=new Simulation(seeded(99));
 const samples=new Map<string,number[]>();
 let flights=0,landings=0,rimChecks=0;
 for(let i=0;i<15000;i++){
  const entries=sim.ducks.map(d=>d.waterEntries);
  sim.update(.01);
  sim.ducks.forEach((d,index)=>{
   if(d.waterEntries>entries[index]){
    assert.equal(d.waterEntries,entries[index]+1);assert.equal(d.state,'swim');
    assert.equal(d.y,POND.waterY);assert.ok(d.landing>.9);landings++;
   }
   if(d.jumpProgress<0){samples.delete(d.id);return}
   const ys=samples.get(d.id)??[];
   if(!ys.length)flights++;
   ys.push(d.y);if(ys.length>3)ys.shift();samples.set(d.id,ys);
   if(ys.length===3)assert.ok(Math.abs((ys[2]-2*ys[1]+ys[0])/.0001+HOP_GRAVITY)<1e-6);
   if(Math.abs(Math.hypot(d.x-POND.x,d.z-POND.z)-1.56)<.05){
    assert.ok(d.y>POND.rimY+.04,'feet clear the physical rim');rimChecks++;
   }
  });
 }
 assert.ok(flights>=6&&landings>=3&&rimChecks>=6);
});

test('all ducks preen and sleep individually; food wakes them and restores the guard',()=>{
 const sim=new Simulation(seeded(18));
 const preened=new Set<string>(),slept=new Set<string>();
 for(let i=0;i<6000;i++){
  sim.update(.05);
  assert.ok(sim.ducks.filter(d=>d.state==='sleep'||d.state==='preen').length<=2);
  for(const d of sim.ducks){
   if(d.state==='preen')preened.add(d.id);
   if(d.state==='sleep')slept.add(d.id);
   if(d.state==='sleep'||d.state==='preen'){assert.equal(d.speed,0);assert.equal(d.peck,0);assert.equal(d.y,0)}
  }
 }
 assert.equal(preened.size,4);assert.equal(slept.size,4);
 for(const state of ['preen','sleep']){
  const awake=new Simulation(seeded(18));
  for(let i=0;i<6000&&!awake.ducks.some(d=>d.state===state);i++)awake.update(.05);
  assert.ok(awake.ducks.some(d=>d.state===state));
  assert.equal(awake.castFood(-1,1.5),true);awake.update(.05);
  assert.ok(awake.ducks.every(d=>d.state!=='sleep'&&d.state!=='preen'));
  assert.equal(awake.ducks[0].state,'guard');assert.equal(awake.ducks[0].peck,0);
 }
});

test('casts land in the garden, reject the pond, and respect cooldown and cap', () => {
  const sim = new Simulation(seeded());
  assert.equal(sim.castFood(POND.x, POND.z), false);
  assert.equal(sim.castFood(GARDEN.maxX + 1, 0), false);
  assert.equal(sim.castFood(GARDEN.maxX - .4, GARDEN.maxZ - .4), true);
  assert.equal(sim.castFood(GARDEN.maxX - .4, GARDEN.maxZ - .4), false);
  assert.equal(sim.foods.length, BEHAVIOR.foodPieces);
  assert.ok(sim.foods.every(food => !food.landed && !food.eaten));
  advance(sim, BEHAVIOR.foodLandingDelay + 0.1);
  assert.ok(sim.foods.every(food => food.landed));
  for (let i = 1; i < 10; i++) {
    assert.equal(sim.castFood(GARDEN.maxX - .4, GARDEN.maxZ - .4), true);
    advance(sim, BEHAVIOR.castCooldown + 0.05);
  }
  assert.equal(sim.foods.filter(food => !food.eaten).length, BEHAVIOR.maxActiveFood);
  assert.equal(sim.castFood(GARDEN.maxX - .4, GARDEN.maxZ - .4), false);
  assert.ok(sim.foods.every(food => food.x >= GARDEN.minX && food.x <= GARDEN.maxX && food.z >= GARDEN.minZ && food.z <= GARDEN.maxZ));
});

test('female ducks notice, approach, and consume food; the drake never does', () => {
  const sim = new Simulation(seeded(7));
  assert.equal(sim.castFood(-1, -0.3), true);
  const femaleStates = new Set<string>();
  const firstApproach = new Map<string, number>();
  let eaten = false;
  for (let i = 0; i < 400; i++) {
    const foodAvailable = sim.foods.some(food => !food.eaten);
    sim.update(0.05);
    for (const duck of sim.ducks.filter(duck => duck.kind !== 'drake')) {
      femaleStates.add(duck.state);
      if (duck.state === 'approach' && !firstApproach.has(duck.kind)) firstApproach.set(duck.kind, sim.time);
    }
    eaten ||= sim.foods.some(food => food.eaten);
    const drake = sim.ducks.find(duck => duck.kind === 'drake')!;
    assert.notEqual(drake.state, 'eat');
    if (foodAvailable) {
      assert.equal(drake.state, 'guard');
      assert.equal(drake.peck, 0);
    }
  }
  assert.ok(femaleStates.has('notice'));
  assert.ok(femaleStates.has('approach'));
  assert.ok(femaleStates.has('eat'));
  assert.ok(eaten);
  assert.ok(firstApproach.get('buff')! < firstApproach.get('brown')!);
  assert.ok(firstApproach.get('brown')! < firstApproach.get('pied')!);
});

test('spontaneous ground foraging and faster low-neck chases yield to feeding', () => {
  const sim = new Simulation(seeded(18));
  let chased = false, probed = false, ranLow = false;
  const interrupted = new Set<string>();
  for (let i = 0; i < 8000; i++) {
    sim.update(.025);
    for (const duck of sim.ducks) {
      assert.equal(!!duck.insect, duck.state === 'chase');
      if (duck.state === 'chase') {
        chased = true;
        ranLow ||= duck.speed > BEHAVIOR.walkSpeed * 1.3 && duck.upright < .2;
        assert.ok(duck.y === 0 && Math.hypot(duck.x-POND.x,duck.z-POND.z) >= POND.radius);
        assert.ok(Math.hypot(duck.ax,duck.az) <= DYNAMICS.driveForce/duck.mass + 1e-8);
      }
      if (duck.state === 'forage' && duck.peck > .8) { probed = true; assert.ok(duck.speed < .06); }
    }
    const activity = sim.ducks.find(d => ['chase','forage'].includes(d.state) && !interrupted.has(d.state));
    // Let each activity establish its pose before checking interruption.
    if (activity && (activity.state === 'chase' ? ranLow : probed)) {
      interrupted.add(activity.state);
      assert.equal(sim.castFood(-1,1),true);
      sim.update(.025);
      assert.ok(sim.ducks.every(d => !['forage','chase'].includes(d.state) && !d.insect));
      assert.equal(sim.ducks[0].state,'guard');
    }
  }
  assert.ok(chased && probed && ranLow);
  assert.equal(interrupted.size,2);
});

test('feeding ducks hesitate mid-approach and react briefly to a nearby new cast', () => {
  const sim = new Simulation(seeded(31));
  assert.equal(sim.castFood(-1.1, -0.25), true);
  const buff = sim.ducks.find(duck => duck.kind === 'buff')!;
  let moving = false;
  for (let i = 0; i < 100; i++) {
    sim.update(0.05);
    if (buff.state === 'approach' && buff.speed > 0.01 && sim.time > BEHAVIOR.castCooldown) {
      moving = true;
      break;
    }
  }
  assert.ok(moving);
  assert.equal(sim.castFood(-0.8, 0.2), true);
  assert.equal(buff.state, 'notice');

  let pausedAfterMoving = false;
  let wasMoving = false;
  const eaten = new Set<string>();
  for (let i = 0; i < 360; i++) {
    sim.update(0.05);
    if (buff.state === 'approach' && buff.speed > 0.01) wasMoving = true;
    if (wasMoving && buff.state === 'approach' && buff.speed === 0) pausedAfterMoving = true;
    for (const food of sim.foods) if (food.eaten) eaten.add(food.id);
  }
  assert.ok(pausedAfterMoving);
  assert.ok(eaten.size >= 3, 'separate pasta targets allow multiple females to eat');
});

test('invalid delta times are ignored and a long frame is bounded', () => {
  const sim = new Simulation(seeded());
  sim.update(-1);
  sim.update(Number.NaN);
  sim.update(Infinity);
  assert.equal(sim.time, 0);
  sim.update(10);
  assert.ok(Math.abs(sim.time - BEHAVIOR.maxFrameDt) < 1e-9);
  sim.reset();
  assert.equal(sim.time, 0);
  assert.equal(sim.foods.length, 0);
  assert.equal(sim.ducks.length, 4);
});

test('wandering and pond visits remain finite and inside the garden', () => {
  const sim = new Simulation(seeded(99));
  const seen = new Set<string>();
  const swimmers = new Set<string>();
  let clearedRim = false;
  for (let i = 0; i < 2200; i++) {
    sim.update(0.1);
    for (const duck of sim.ducks) {
      seen.add(duck.state);
      if (duck.state === 'swim') {
        swimmers.add(duck.kind);
        assert.ok(Math.hypot(duck.x - POND.x, duck.z - POND.z) <= POND.radius - 0.50);
      }
      if (['enter', 'exit'].includes(duck.state) && duck.y > POND.rimY) clearedRim = true;
      for (const value of [duck.x, duck.y, duck.z, duck.heading, duck.speed, duck.look, duck.peck, duck.upright, duck.headTilt, duck.displayDip]) assert.ok(Number.isFinite(value));
      assert.ok(duck.x >= GARDEN.minX && duck.x <= GARDEN.maxX, `${duck.kind} x at ${sim.time}`);
      assert.ok(duck.z >= GARDEN.minZ && duck.z <= GARDEN.maxZ, `${duck.kind} z at ${sim.time}`);
      if (!['enter', 'swim', 'exit'].includes(duck.state)) {
        assert.ok(Math.hypot(duck.x - POND.x, duck.z - POND.z) >= POND.radius + BEHAVIOR.pondLandMargin - 0.001);
      }
    }
    const landDucks = sim.ducks.filter(duck => !['enter', 'swim', 'exit'].includes(duck.state));
    for (let a = 0; a < landDucks.length; a++) {
      for (let b = a + 1; b < landDucks.length; b++) {
        assert.ok(Math.hypot(landDucks[a].x - landDucks[b].x, landDucks[a].z - landDucks[b].z) >= BEHAVIOR.duckSpacing - 0.015);
      }
    }
    for (let a = 0; a < sim.ducks.length; a++) {
      for (let b = a + 1; b < sim.ducks.length; b++) {
        const left = sim.ducks[a], right = sim.ducks[b];
        if (!['enter', 'swim', 'exit'].includes(left.state) || !['enter', 'swim', 'exit'].includes(right.state)) continue;
        assert.ok(Math.hypot(left.x - right.x, left.z - right.z) >= 0.3, `pond ducks overlap at ${sim.time}`);
      }
    }
  }
  for (const state of ['enter', 'swim', 'exit']) assert.ok(seen.has(state), `missing pond state ${state}`);
  assert.ok(clearedRim, 'ducks must visibly lift over the pond rim');
  assert.deepEqual([...swimmers].sort(), ['brown', 'buff', 'pied']);
  assert.ok(sim.ducks.some(duck => duck.kind !== 'drake' && duck.state !== 'swim'));
});

test('courtship dips repeat at three seconds; a female can reply or decline; food interrupts', () => {
  for (const random of [() => 0.2, () => 0.9]) {
    const sim = new Simulation(random);
    for (let i = 0; i < 2000 && !sim.courtship; i++) sim.update(.025);
    assert.ok(sim.courtship, 'a nearby pair starts a display');
    const responds = sim.courtship.responds;
    assert.equal(responds, random() < BEHAVIOR.displayReplyChance);
    const partner = sim.ducks.find(d => d.id === sim.courtship!.partnerId)!;
    const starts: number[] = [];
    let previous = 0, replySeen = false;
    let previousSpeed=sim.ducks[0].speed;
    for (let i = 0; i < 390; i++) {
      sim.update(.025);
      const dip = sim.ducks[0].displayDip;
      if (dip > .1 && previous <= .1) starts.push(sim.time);
      previous = dip;
      if (partner.displayDip > .1) {
        replySeen = true;
        assert.ok(sim.time - sim.courtship!.startedAt >= BEHAVIOR.displayReplyDelay);
      }
      assert.equal(sim.ducks[0].peck, 0, 'courtship never uses the eating animation');
      assert.ok(sim.ducks[0].speed<=previousSpeed+1e-9,'drake brakes smoothly into courtship');
      previousSpeed=sim.ducks[0].speed;
    }
    assert.ok(starts.length >= 3);
    for (let i = 1; i < starts.length; i++) assert.ok(Math.abs(starts[i] - starts[i - 1] - 3) < .03);
    assert.equal(replySeen, responds);
    assert.equal(sim.courtship!.mutualDisplay, responds);
    assert.ok(sim.castFood(-1, 1));
    assert.equal(sim.courtship, null);
    assert.ok(sim.ducks.every(d => d.displayDip === 0));
    sim.reset();
    assert.ok(sim.ducks.every(d => d.upright === 1 && d.headTilt === 0));
  }
});

test('land ducks use both upright and low poses, and occasionally tilt their heads', () => {
  const sim = new Simulation(seeded(42));
  let lowWalking = false, tallWalking = false, tilted = false;
  for (let i = 0; i < 1500; i++) {
    sim.update(.05);
    for (const duck of sim.ducks) {
      assert.ok(duck.upright >= 0 && duck.upright <= 1);
      assert.ok(Math.abs(duck.headTilt) <= .35);
      if (duck.state === 'wander' && duck.speed > .1) {
        lowWalking ||= duck.upright < .3;
        tallWalking ||= duck.upright > .9;
      }
      tilted ||= Math.abs(duck.headTilt) > .15;
    }
  }
  assert.ok(lowWalking && tallWalking && tilted);
});

test('ducks approaching or leaving the shore do not block the pond queue', () => {
  for (const seed of [9, 68]) {
    const sim = new Simulation(seeded(seed));
    let swam = false;
    for (let i = 0; i < 2200; i++) {
      sim.update(.1);
      swam ||= sim.ducks.some(duck => duck.state === 'swim');
    }
    assert.ok(swam, `pond queue stalled for replay ${seed}`);
  }
});

test('guard following does not alternate with looking at the viewer every frame', () => {
  const sim = new Simulation(seeded(1));
  let transitions = 0, wasMoving = false;
  for (let i = 0; i < 60; i++) {
    sim.update(.05);
    const moving = sim.ducks[0].speed > .01;
    if (moving !== wasMoving) transitions++;
    wasMoving = moving;
  }
  assert.ok(transitions <= 3, `guard repeatedly starts/stops: ${transitions} transitions`);
});

test('turns stay bounded through wandering, feeding, courtship and pond crossings', () => {
  const states = new Set<string>();
  for (const seed of [1, 11, 68]) {
    const sim = new Simulation(seeded(seed));
    for (let i = 0; i < 4400; i++) {
      if (i === 60) sim.castFood(-1, 1.5);
      const headings = sim.ducks.map(duck => duck.heading);
      const angularSpeeds=sim.ducks.map(duck=>duck.angularVelocity);
      sim.update(.05);
      sim.ducks.forEach((duck, j) => {
        const delta = Math.atan2(Math.sin(duck.heading - headings[j]), Math.cos(duck.heading - headings[j]));
        assert.ok(Math.abs(delta) <= BEHAVIOR.turnSpeed * .05 + 1e-9);
        assert.ok(Math.abs(duck.angularVelocity-angularSpeeds[j])<=DYNAMICS.turnAcceleration*.05+1e-9);
        states.add(duck.state);
      });
    }
  }
  for (const state of ['guard', 'wander', 'notice', 'approach', 'eat', 'enter', 'swim', 'exit']) assert.ok(states.has(state));
});

test('navigation reaches goals on the permitted bath boundary instead of circling forever', () => {
  // Isolate the land navigator from flock collisions and randomly changing goals.
  for (const [x, z] of [[.5787182138, -.9167616363], [POND.x + 1.93, POND.z], [POND.x, POND.z + 1.93], [POND.x, POND.z - 1.93]]) {
    const sim = new Simulation(seeded(11));
    const duck = sim.ducks[1];
    const navigate = sim as unknown as { moveLand(duck: typeof sim.ducks[number], target: {x:number;z:number}, speed:number, dt:number): void };
    for (let i = 0; i < 1800; i++) {
      navigate.moveLand(duck, {x,z}, .8, .025);
      assert.ok(Math.hypot(duck.x - POND.x, duck.z - POND.z) >= POND.radius + BEHAVIOR.pondLandMargin - 1e-6);
    }
    assert.ok(Math.hypot(duck.x - x, duck.z - z) < .04, `never reached bath-side goal ${x}, ${z}`);
  }
});
