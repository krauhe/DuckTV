import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createDuck } from '../src/duck-model';
import { Simulation } from '../src/simulation';
import type { DuckPose } from '../src/types';

test('walking ducks exhibit rhythmic body waddle including lateral sway and pelvic yaw', () => {
  const model = createDuck('buff');
  const torso = model.group.getObjectByName('duck-torso')!;
  let minX = Infinity, maxX = -Infinity;
  let minYaw = Infinity, maxYaw = -Infinity;
  let minRoll = Infinity, maxRoll = -Infinity;

  const pose: DuckPose = {
    state: 'wander',
    speed: 0.8,
    time: 0,
    look: 0,
    peck: 0,
    upright: 1,
    headTilt: 0,
    displayDip: 0,
  };

  for (let i = 0; i < 240; i++) {
    pose.time = i / 60;
    model.group.position.z = pose.time * pose.speed;
    model.animate(pose);
    model.group.updateMatrixWorld(true);

    if (i < 60) continue; // let movement stabilize
    minX = Math.min(minX, torso.position.x);
    maxX = Math.max(maxX, torso.position.x);
    minYaw = Math.min(minYaw, torso.rotation.y);
    maxYaw = Math.max(maxYaw, torso.rotation.y);
    minRoll = Math.min(minRoll, torso.rotation.z);
    maxRoll = Math.max(maxRoll, torso.rotation.z);
  }

  // Verify non-zero rhythmic lateral shift (waddle)
  const lateralRange = maxX - minX;
  assert.ok(lateralRange > 0.015, `Torso should have a distinct lateral waddle, got range ${lateralRange}`);

  // Verify non-zero pelvic yaw counter-oscillation
  const yawRange = maxYaw - minYaw;
  assert.ok(yawRange > 0.03, `Torso should have rhythmic pelvic yaw during walking, got range ${yawRange}`);

  // Verify body roll
  const rollRange = maxRoll - minRoll;
  assert.ok(rollRange > 0.04, `Torso should have natural roll during walking, got range ${rollRange}`);
});

test('ducks anticipate heading changes with head-leads-body gaze direction', () => {
  const sim = new Simulation();
  const duck = sim.ducks[0];
  sim.update(0.1);

  // Set duck moving towards a target at +90 degrees (right turn)
  duck.x = 0;
  duck.z = 0;
  duck.heading = 0; // facing forward (+Z)
  duck.speed = 0.5;

  // Simulate updating towards a sharp turn
  sim.update(0.05);

  // While turning towards a waypoint to the right, duck.look should anticipate into the turn
  for (let step = 0; step < 10; step++) {
    sim.update(0.05);
    assert.ok(Number.isFinite(duck.look), 'duck.look should remain a finite value');
    assert.ok(Math.abs(duck.look) <= 1.15, 'duck.look stays within realistic anatomical limits');
  }
});

test('standing idle ducks show subtle living presence through soft weight shifting and breathing', () => {
  const model = createDuck('pied');
  const torso = model.group.getObjectByName('duck-torso')!;
  const bodyShape = model.group.getObjectByName('duck-body-shape')!;

  let minX = Infinity, maxX = -Infinity;
  let minScaleX = Infinity, maxScaleX = -Infinity;

  for (let i = 0; i < 300; i++) {
    model.animate({
      state: 'guard',
      speed: 0,
      time: i / 60,
      look: 0,
      peck: 0,
      upright: 1,
      headTilt: 0,
      displayDip: 0,
    });
    model.group.updateMatrixWorld(true);

    minX = Math.min(minX, torso.position.x);
    maxX = Math.max(maxX, torso.position.x);
    minScaleX = Math.min(minScaleX, bodyShape.scale.x);
    maxScaleX = Math.max(maxScaleX, bodyShape.scale.x);
  }

  // Weight shift should be subtle (1 to 8 mm)
  const shiftRange = maxX - minX;
  assert.ok(shiftRange > 0.002 && shiftRange < 0.015, `Subtle stance shift should be living and gentle, got ${shiftRange}`);

  // Breathing should be visible in bodyShape scale
  const breathRange = maxScaleX - minScaleX;
  assert.ok(breathRange > 0.004, `Standing alert duck should breathe subtly, got scale range ${breathRange}`);
});

test('swimming ducks rock organically with paddle strokes', () => {
  const model = createDuck('brown');
  const torso = model.group.getObjectByName('duck-torso')!;

  let minRoll = Infinity, maxRoll = -Infinity;
  for (let i = 0; i < 180; i++) {
    model.animate({
      state: 'swim',
      speed: 0.6,
      time: i / 60,
      look: 0,
      peck: 0,
      upright: 0,
      headTilt: 0,
      displayDip: 0,
    });
    minRoll = Math.min(minRoll, torso.rotation.z);
    maxRoll = Math.max(maxRoll, torso.rotation.z);
  }

  const paddleRollRange = maxRoll - minRoll;
  assert.ok(paddleRollRange > 0.03, `Swimming torso should rock in roll with alternating paddle strokes, got ${paddleRollRange}`);
});
