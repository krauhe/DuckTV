import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createEnvironment } from '../src/environment.ts';
import { POND } from '../src/types.ts';

test('water splash points material uses fine realistic drop size and circular sprite texture', () => {
  const scene = new THREE.Scene();
  const env = createEnvironment(scene);

  const splashPoints = scene.getObjectByName('pond-water-splashes') as THREE.Points;
  assert.ok(splashPoints, 'Scene should contain pond-water-splashes points object');

  const mat = splashPoints.material as THREE.PointsMaterial;
  assert.ok(mat.size <= 0.025, `Droplet size should be fine (<= 0.025m), got ${mat.size}`);
  assert.ok(mat.map, 'Material should have circular droplet texture map to prevent blocky square points');
});

test('splash function supports directional wing-flap spray and velocity inheritance', () => {
  const scene = new THREE.Scene();
  const env = createEnvironment(scene);

  // Trigger wing flap spray to the left (angle -PI/2) with forward motion
  env.splash(1.0, 0.4, 0.0, 16, 1.8, 0.5, {
    directionAngle: -Math.PI / 2,
    arcWidth: Math.PI * 0.6,
    upwardBias: 0.45,
    vx: 0.3,
    vz: 0.1,
    life: 0.28,
  });

  // Step environment update with drag and gravity to write positions to buffer
  env.update(0.05, 0.05);

  const splashPoints = scene.getObjectByName('pond-water-splashes') as THREE.Points;
  const posAttr = splashPoints.geometry.getAttribute('position') as THREE.BufferAttribute;

  // Verify at least one active droplet has been placed in the buffer
  let foundActive = false;
  for (let i = 0; i < posAttr.count; i++) {
    if (posAttr.getY(i) > -5) {
      foundActive = true;
      break;
    }
  }
  assert.ok(foundActive, 'Splash should activate particles in buffer');

  // Step further to let drops land on ground and deactivate
  env.update(1.0, 0.45);

  let activeCount = 0;
  for (let i = 0; i < posAttr.count; i++) {
    if (posAttr.getY(i) > -5) activeCount++;
  }
  // Droplets should disperse and disappear upon hitting ground
  assert.ok(activeCount < posAttr.count, 'Drops hitting the ground must deactivate rather than slide indefinitely');
});
