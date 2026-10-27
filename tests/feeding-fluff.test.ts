import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.ts';
import { createDuck } from '../src/duck-model.ts';

test('female duck rushes to pond to rinse bill after consuming all pasta', () => {
  const sim = new Simulation(() => 0.5);
  const duck = sim.ducks[1];
  const intent = (sim as any).intents.get(duck.id);

  // Cast pasta and place duck in eat state with the final piece in beak
  sim.castFood(duck.x + 0.1, duck.z);
  sim.foods.forEach(f => { f.eaten = true; });
  const food = sim.foods[0];
  food.carriedBy = duck.id;
  duck.state = 'eat';
  intent.foodId = food.id;
  intent.handlingSeconds = 0.5;
  intent.peckTimer = 0.001; // finished handling

  // Step simulation past eating completion
  sim.update(0.02);

  assert.equal(duck.state, 'drink', 'Duck should switch to drink state to rinse bill after eating final pasta');
  assert.ok(intent.drinkTarget, 'Duck should have a designated drinkTarget by the pond edge');
});

test('fluff expansion and breathing increase body width during rest, sleep and preening', () => {
  const model = createDuck('buff');
  const bodyShape = model.group.getObjectByName('duck-body-shape')!;

  // Baseline wander scale
  model.animate({ state: 'wander', speed: 0.3, time: 1.0, look: 0, peck: 0, upright: 0, headTilt: 0, displayDip: 0 });
  const wanderWidth = bodyShape.scale.x;

  // Rest state should fluff up body width
  for (let i = 0; i < 30; i++) {
    model.animate({ state: 'rest', speed: 0, time: 2.0 + i * 0.05, look: 0, peck: 0, upright: 0, headTilt: 0, displayDip: 0 });
  }
  const restWidth = bodyShape.scale.x;
  assert.ok(restWidth > wanderWidth * 1.03, 'Resting duck body should be visibly fluffed up compared to walking');

  // Sleep state should also have fluff
  for (let i = 0; i < 60; i++) {
    model.animate({ state: 'sleep', speed: 0, time: 5.0 + i * 0.05, look: 0, peck: 0, upright: 0, headTilt: 0, displayDip: 0 });
  }
  const sleepWidth = bodyShape.scale.x;
  assert.ok(sleepWidth > wanderWidth * 1.03, 'Sleeping duck should retain fluffed up body volume');
});

test('resting duck stands on one leg by tucking one foot into the plumage', () => {
  const model = createDuck('buff');
  const leftLeg = model.group.getObjectByName('duck-left-leg')!;
  const rightLeg = model.group.getObjectByName('duck-right-leg')!;

  // While walking: both legs are visible
  model.animate({ state: 'wander', speed: 0.4, time: 1.0, look: 0, peck: 0, upright: 1, headTilt: 0, displayDip: 0 });
  assert.equal(leftLeg.visible, true);
  assert.equal(rightLeg.visible, true);

  // When settling into rest on one leg:
  for (let i = 0; i < 60; i++) {
    model.animate({ state: 'rest', speed: 0, time: 2.0 + i * 0.05, look: 0, peck: 0, upright: 0, headTilt: 0, displayDip: 0, oneLeg: true });
  }

  // Exactly one leg should be tucked away inside the feathers while the other supports the bird
  const visibleCount = (leftLeg.visible ? 1 : 0) + (rightLeg.visible ? 1 : 0);
  assert.equal(visibleCount, 1, 'Resting duck should stand on exactly one leg');

  // When walking begins again: both legs return to walking stance
  for (let i = 0; i < 40; i++) {
    model.animate({ state: 'wander', speed: 0.4, time: 6.0 + i * 0.05, look: 0, peck: 0, upright: 1, headTilt: 0, displayDip: 0 });
  }
  assert.equal(leftLeg.visible, true);
  assert.equal(rightLeg.visible, true);
});

test('foraging soil accumulation and water washing on the beak', () => {
  const sim = new Simulation(() => 0.5);
  const duck = sim.ducks[1];
  const intent = (sim as any).intents.get(duck.id);
  duck.state = 'forage';
  intent.exploreStarted = sim.time;

  // Foraging increases mud on the bill
  for (let i = 0; i < 40; i++) {
    sim.update(0.05);
  }
  assert.ok((duck.mud ?? 0) > 0.25, 'Foraging in lawn should accumulate soil on the beak');

  // Drinking/rinsing at the pond washes the bill clean
  duck.state = 'drink';
  intent.drinkTarget = { x: 2.0, z: -1.0 };
  for (let i = 0; i < 50; i++) {
    sim.update(0.05);
  }
  assert.equal(duck.mud, 0, 'Rinsing bill in pond should wash mud completely off');
});
