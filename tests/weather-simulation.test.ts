import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.ts';

test('high wind causes resting and guarding ducks to face their chests into the wind', () => {
  const sim = new Simulation(() => 0.5);
  const hen = sim.ducks[1]; // resting hen
  hen.state = 'rest';

  // In calm weather (wind = 1.0)
  sim.setWeather({ wind: 1.0 });
  sim.update(0.1);

  // In strong wind (wind = 3.5 > 2.8 threshold)
  sim.setWeather({ wind: 3.5 });
  // Step simulation so turning dynamics steer heading towards -Math.PI * 0.65
  for (let i = 0; i < 60; i++) {
    sim.update(0.05);
  }

  const expectedWindFacing = -Math.PI * 0.65;
  const diff = Math.abs(Math.atan2(Math.sin(hen.heading - expectedWindFacing), Math.cos(hen.heading - expectedWindFacing)));
  assert.ok(diff < 0.25, `Resting hen should turn chest into the wind, heading: ${hen.heading}, expected close to: ${expectedWindFacing}`);

  // Drake in stationary guard should also face into the wind
  const drake = sim.ducks[0];
  const drakeIntent = (sim as any).intents.get(drake.id);
  drake.state = 'guard';
  drakeIntent.guardMoving = false;
  // Position drake at target so it doesn't walk
  const females = sim.ducks.filter(other => other.kind !== 'drake');
  const flock = {
    x: females.reduce((sum, other) => sum + other.x, 0) / females.length,
    z: females.reduce((sum, other) => sum + other.z, 0) / females.length,
  };
  drake.x = flock.x - 0.85;
  drake.z = flock.z + 0.48;

  for (let i = 0; i < 60; i++) {
    sim.update(0.05);
  }
  const drakeDiff = Math.abs(Math.atan2(Math.sin(drake.heading - expectedWindFacing), Math.cos(drake.heading - expectedWindFacing)));
  assert.ok(drakeDiff < 0.25, `Stationary guarding drake should turn chest into the wind, heading: ${drake.heading}`);
});

test('rain increases foraging exploration urge ("snegle-vejr")', () => {
  const sim = new Simulation(() => 0.5);
  const duck = sim.ducks[1];
  duck.state = 'wander';
  const intent = (sim as any).intents.get(duck.id);
  intent.exploreAt = sim.time + 10.0;

  // In rain (rain = 1.5 > 0.25 threshold)
  sim.setWeather({ rain: 1.5 });
  const startExploreAt = intent.exploreAt;
  sim.update(0.1);

  // In rain, exploreAt should decrease faster than normal time passage (accelerated exploration)
  assert.ok(intent.exploreAt < startExploreAt - 0.1, 'Rain should accelerate exploreAt timing towards foraging');
});
