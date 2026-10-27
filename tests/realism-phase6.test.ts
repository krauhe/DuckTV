import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Simulation } from '../src/simulation.ts';
import { createDuck } from '../src/duck-model.ts';
import { createEnvironment } from '../src/environment.ts';

test('runner duck trot: trailing behind flock triggers trot speed boost', () => {
  const sim = new Simulation(() => 0.5);
  const duck = sim.ducks[1];
  const intent = (sim as any).intents.get(duck.id);

  duck.state = 'wander';
  // Position duck far away from flock center (> 2.0m)
  intent.social.center = { x: 0, z: 0 };
  duck.x = 2.5;
  duck.z = 1.0;
  intent.target = { x: 0, z: 0 };
  intent.timer = 5;

  sim.update(0.05);

  assert.equal(duck.trot, true, 'Duck trailing behind flock center should activate runner trot');
});

test('foraging snail catch: duck finds a snail, shakes head to clean it, and swallows', () => {
  const sim = new Simulation(() => 0.5);
  sim.setWeather({ cloud: 80, rain: 0.5, wind: 2, isDay: true });
  const duck = sim.ducks[1];
  const intent = (sim as any).intents.get(duck.id);

  duck.state = 'forage';
  duck.speed = 0; duck.vx = 0; duck.vz = 0;
  intent.exploreStarted = sim.time - 4; // past 3s check
  intent.forageStep = 0;
  intent.snailCatchAt = sim.time; // ready to catch

  // Run update to trigger catch
  sim.update(0.05);

  assert.ok(duck.snail, 'Duck should catch a snail during foraging');
  assert.equal(duck.snail.shaking, false, 'Initial catch phase holds snail before shaking');

  // Advance time into shake phase (0.5s - 1.3s)
  for (let i = 0; i < 15; i++) {
    sim.update(0.05);
  }
  assert.ok(duck.snail, 'Snail should still be held in beak during cleaning');
  assert.equal(duck.snail.shaking, true, 'Duck should shake head to clean snail');

  // Advance time past swallow (1.9s+)
  for (let i = 0; i < 30; i++) {
    sim.update(0.05);
  }
  assert.equal(duck.snail, undefined, 'Snail should be swallowed after cleaning');
  assert.equal(duck.gesture?.kind, 'tailWag', 'Duck should wag tail happily after swallowing');
});

test('ande-yoga: wing-and-leg stretch extends foot backward while keeping it planted on ground', () => {
  const model = createDuck('buff');
  const foot = new THREE.Vector3();

  // Baseline standing pose
  model.animate({ state: 'rest', speed: 0, time: 1.0, look: 0, peck: 0, upright: 1, headTilt: 0, displayDip: 0 });
  model.group.updateMatrixWorld(true);
  const leftFootMesh = model.group.getObjectByName('duck-left-foot')!;
  leftFootMesh.getWorldPosition(foot);
  const initialZ = foot.z;
  assert.ok(Math.abs(foot.y - 0.0032) < 1e-4, 'Standing foot should be planted at ground level');

  // Perform wingStretch gesture on left side (side: -1)
  model.animate({
    state: 'rest', speed: 0, time: 2.0, look: 0, peck: 0, upright: 1, headTilt: 0, displayDip: 0,
    gesture: { kind: 'wingStretch', progress: 0.5, side: -1 },
  });
  model.group.updateMatrixWorld(true);
  leftFootMesh.getWorldPosition(foot);

  assert.ok(foot.z < initialZ - 0.02, 'Left foot should stretch backward in Z during wingStretch');
  assert.ok(Math.abs(foot.y - 0.0032) < 1e-4, 'Stretching foot must stay planted flat on the ground');
});

test('tail-wag greeting: finishing drinking triggers tail wag celebration', () => {
  const sim = new Simulation(() => 0.5);
  const duck = sim.ducks[1];
  const intent = (sim as any).intents.get(duck.id);

  duck.state = 'drink';
  duck.x = 2.0; duck.z = -1.0; duck.speed = 0;
  duck.heading = 2.944;
  intent.drinkTarget = { x: 2.0, z: -1.0 };
  intent.drinkUntil = 0.05;
  (sim as any).time = 0.05;

  sim.update(0.02);

  assert.equal(duck.gesture?.kind, 'tailWag', 'Finishing drink at the pond should conclude with celebratory tail wag');
});

test('environment worn duck path and morning dew sparkles exist in scene', () => {
  const scene = new THREE.Scene();
  const env = createEnvironment(scene);

  const path = scene.getObjectByName('worn-duck-path');
  assert.ok(path, 'Scene should contain worn-duck-path between shelter and bath');
  assert.equal(path?.receiveShadow, true, 'Worn path should receive shadows');

  const dew = scene.getObjectByName('morning-dew-sparkles') as THREE.InstancedMesh;
  assert.ok(dew, 'Scene should contain morning-dew-sparkles');
  assert.equal(dew.count, 120, 'Dew sparkles should have 120 droplet instances');

  // Morning daylight phase (phase: 0.1) should activate dew
  env.setDaylight(0.9, 0.1);
  env.update(1.0, 0.05);
  assert.equal(dew.visible, true, 'Morning dew sparkles should be visible in early morning');

  // Midday daylight phase (phase: 0.5) should dry out dew
  env.setDaylight(1.0, 0.5);
  env.update(2.0, 0.05);
  assert.equal(dew.visible, false, 'Dew sparkles should vanish by midday');
});
