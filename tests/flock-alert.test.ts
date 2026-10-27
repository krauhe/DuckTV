import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.ts';

test('flock alert prompts standing and wandering ducks to raise upright necks in unison', () => {
  const sim = new Simulation(() => 0.5);

  // Advance simulation to just before sentinel alert phase ((time + 12) % 38 = 0 at time = 26)
  // Let ducks wander on land
  for (const duck of sim.ducks) {
    if (duck.state !== 'wander' && duck.state !== 'guard') {
      duck.state = 'wander';
    }
  }

  // Start right at the beginning of the alert window: time = 26.0 -> (26 + 12) % 38 = 0
  (sim as any).time = 26.0;

  // Advance 60 frames (1.5s) into the 2.9s alert window
  for (let frame = 0; frame < 60; frame++) {
    sim.update(0.025);
  }

  // During alert, land ducks should have upright rising towards 1
  const landDucks = sim.ducks.filter(d => !['swim', 'enter', 'exit', 'sleep'].includes(d.state));
  for (const d of landDucks) {
    assert.ok(d.upright > 0.85, `${d.kind} should adopt upright posture during flock sentinel alert (got ${d.upright})`);
  }

  // All awake land ducks look in the same general direction towards the common viewer
  const looks = landDucks.map(d => d.look);
  const firstLook = looks[0];
  for (let i = 1; i < looks.length; i++) {
    assert.ok(Math.abs(looks[i] - firstLook) < 0.6, 'ducks align gaze during flock alert');
  }
});
