import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.ts';

test('pond exit initiates full post-bath ritual: tailWag -> wingFlap -> preen', () => {
  const sim = new Simulation(() => 0.5);
  const duck = sim.ducks[1]; // buff hen
  const intent = (sim as any).intents.get(duck.id);

  // Position duck in bath exit transition
  duck.state = 'exit';
  intent.crossTime = 0.5;
  intent.crossingFrom = { x: 2.5, z: -1.1 };
  intent.crossingY = 0.27;

  // Step simulation until the exit hop lands on the shore
  for (let i = 0; i < 60; i++) {
    sim.update(0.025);
    if (duck.state !== 'exit') break;
  }

  // Stage 1: landed, shaking tail/body
  assert.equal(duck.state, 'wander');
  assert.equal(duck.gesture?.kind, 'tailWag', 'stage 1 should trigger tailWag shake');
  assert.equal(intent.postBathStage, 1);
  assert.ok(duck.lastSwimAt! > 0, 'lastSwimAt should be recorded');

  // Advance time past tailWag (GESTURE_SECONDS.tailWag is 1.1s)
  for (let i = 0; i < 50; i++) {
    sim.update(0.025);
    if (intent.postBathStage !== 1) break;
  }

  // Stage 2: wingFlap
  assert.equal(duck.gesture?.kind, 'wingFlap', 'stage 2 should trigger wingFlap');
  assert.equal(intent.postBathStage, 2);

  // Advance time past wingFlap (GESTURE_SECONDS.wingFlap is 3.8s)
  for (let i = 0; i < 160; i++) {
    sim.update(0.025);
    if (intent.postBathStage !== 2) break;
  }

  // Stage 3: settle down into preen
  assert.equal(duck.state, 'preen', 'stage 3 should settle into preen on shore');
  assert.equal(intent.postBathStage, 0);
});
