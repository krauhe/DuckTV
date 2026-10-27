import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSky } from '../src/sky.ts';

test('createSky applies tone mapping and balanced atmospheric slate colors in overcast rain', () => {
  const scene = new THREE.Scene();
  const sky = createSky(scene);
  const mesh = scene.getObjectByName('atmospheric-sky') as THREE.Mesh;
  assert.ok(mesh, 'sky mesh exists in scene');
  const mat = mesh.material as THREE.ShaderMaterial;
  assert.equal(mat.toneMapped, true, 'sky material has toneMapped true to match ACES pipeline');

  // Test clear daylight
  sky.set(1.0, 0.0, new THREE.Vector3(0, 10, 0), 0);
  sky.update(1.0, 0);
  assert.ok(mat.uniforms.cloudCover.value < 0.01);
  assert.equal(mat.uniforms.rain.value, 0);

  // Test heavy overcast rain
  sky.set(1.0, 1.0, new THREE.Vector3(0, 5, 0), 0.8);
  sky.update(1.0, 15.5);
  assert.ok(mat.uniforms.cloudCover.value > 0.95);
  assert.ok(mat.uniforms.rain.value > 0.75);
  assert.equal(mat.uniforms.time.value, 15.5);

  // Overcast daylight horizon is a deep atmospheric slate rather than bleached flat white
  const horizonColor = mat.uniforms.horizon.value as THREE.Color;
  assert.ok(horizonColor.r < 0.55 && horizonColor.g < 0.60 && horizonColor.b < 0.65,
    'horizon is a moody atmospheric slate gray rather than flat white');
  
  // Zenith is deep slate
  const zenithColor = mat.uniforms.zenith.value as THREE.Color;
  assert.ok(zenithColor.r < 0.40 && zenithColor.g < 0.45,
    'zenith has deep stormy slate tone');
});

test('createSky applies dark nocturnal palette and zeroes daylight at night', () => {
  const scene = new THREE.Scene();
  const sky = createSky(scene);
  const mesh = scene.getObjectByName('atmospheric-sky') as THREE.Mesh;
  const mat = mesh.material as THREE.ShaderMaterial;

  // Test full night (daylight = 0) with overcast clouds
  sky.set(0.0, 0.8, new THREE.Vector3(0, -10, 0), 0);
  sky.update(1.0, 0);
  assert.equal(mat.uniforms.daylight.value, 0, 'daylight uniform is 0 at night');

  const horizonColor = mat.uniforms.horizon.value as THREE.Color;
  assert.ok(horizonColor.r < 0.15 && horizonColor.g < 0.20 && horizonColor.b < 0.30,
    'night horizon is dark nocturnal navy/slate');

  const zenithColor = mat.uniforms.zenith.value as THREE.Color;
  assert.ok(zenithColor.r < 0.10 && zenithColor.g < 0.12 && zenithColor.b < 0.18,
    'night zenith is deep dark night blue');
});
