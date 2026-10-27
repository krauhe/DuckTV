import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createContactShadows } from '../src/contact-shadows.ts';

test('contact shadows follow duck position and align with ground height', () => {
  const scene = new THREE.Scene();
  const shadows = createContactShadows(scene, 4);

  const mockGround = (x: number, z: number) => 0.02 + x * 0.01;
  const ducks = [
    { x: 1.5, y: 0.035, z: -2.0, heading: 0.75, state: 'wander' as const },
  ];

  shadows.update(ducks, mockGround);

  const shadow0 = shadows.shadows[0];
  assert.equal(shadow0.visible, true);
  assert.ok(Math.abs(shadow0.position.x - 1.5) < 1e-5);
  assert.ok(Math.abs(shadow0.position.z - (-2.0)) < 1e-5);
  assert.ok(Math.abs(shadow0.position.y - (mockGround(1.5, -2.0) + 0.005)) < 1e-5);
  assert.ok(Math.abs(shadow0.rotation.y - 0.75) < 1e-5);

  // Unused slots should be hidden
  assert.equal(shadows.shadows[1].visible, false);
});

test('contact shadow hides while swimming in the bath and fades during jumps', () => {
  const scene = new THREE.Scene();
  const shadows = createContactShadows(scene, 2);
  const mockGround = () => 0.0;

  // Swimming duck
  shadows.update([{ x: 0, y: -0.1, z: 0, heading: 0, state: 'swim' }], mockGround);
  assert.equal(shadows.shadows[0].visible, false, 'swimming duck shadow must be hidden');

  // Jumping duck (ground is 0, duck is at y = 0.5 - beyond 0.45 threshold)
  shadows.update([{ x: 0, y: 0.5, z: 0, heading: 0, state: 'wander' }], mockGround);
  assert.equal(shadows.shadows[0].visible, false, 'high jumping duck shadow should fade out completely');

  // Low hop (duck at y = 0.15)
  shadows.update([{ x: 0, y: 0.15, z: 0, heading: 0, state: 'wander' }], mockGround);
  assert.equal(shadows.shadows[0].visible, true);
  assert.ok(shadows.materials[0].opacity < 0.25, 'lifted duck shadow has reduced opacity');
});

test('resting or sleeping duck has larger shadow footprint and higher opacity', () => {
  const scene = new THREE.Scene();
  const shadows = createContactShadows(scene, 2);
  const mockGround = () => 0.0;

  shadows.update([
    { x: 0, y: 0, z: 0, heading: 0, state: 'wander' },
    { x: 1, y: 0, z: 1, heading: 0, state: 'sleep' },
  ], mockGround);

  const standingScaleZ = shadows.shadows[0].scale.z;
  const sleepingScaleZ = shadows.shadows[1].scale.z;
  assert.ok(sleepingScaleZ > standingScaleZ, 'sleeping shadow footprint is longer than standing');
  assert.ok(shadows.materials[1].opacity > shadows.materials[0].opacity, 'sleeping shadow has higher opacity');
});
