import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getHedgeSeason, createHedgeDetails } from '../src/hedge.ts';

test('getHedgeSeason returns copper autumn for late October, winter in January, spring in May, summer in July', () => {
  assert.equal(getHedgeSeason(new Date('2026-10-25T12:00:00Z')), 'copper_autumn');
  assert.equal(getHedgeSeason(new Date('2026-01-15T12:00:00Z')), 'winter');
  assert.equal(getHedgeSeason(new Date('2026-05-10T12:00:00Z')), 'spring');
  assert.equal(getHedgeSeason(new Date('2026-07-20T12:00:00Z')), 'summer');
  assert.equal(getHedgeSeason(new Date('2026-09-20T12:00:00Z')), 'early_autumn');
});

test('createHedgeDetails includes woody inner branches and thins upper leaves in winter', () => {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
  const hedge = createHedgeDetails([[0, 0, 0, 1]], mat, new Date('2026-01-15T12:00:00Z'));
  const branches = hedge.getObjectByName('hedge-branches') as THREE.InstancedMesh;
  assert.ok(branches, 'woody branch skeleton exists inside hedge');
  hedge.setWinterWeather(1, 1);
  const shoots = hedge.getObjectByName('hedge-leaf-clusters') as THREE.InstancedMesh;
  const col = new THREE.Color();
  shoots.getColorAt(0, col);
  assert.ok(col.b > 0.25, 'top shoots receive snowy/frosty tint in winter weather');
});

test('createHedgeDetails adjusts core material tone across seasons', () => {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
  const hedge = createHedgeDetails([[0, 0, 0, 1]], mat, new Date('2026-10-25T12:00:00Z'));
  assert.equal(hedge.name, 'hedge-foliage');
  // In copper autumn, core is a rich warm copper/bark tone (r > g)
  assert.ok(mat.color.r > mat.color.g, 'copper autumn core has warm reddish-copper cast');

  // Switch to summer
  hedge.setDate(new Date('2026-07-15T12:00:00Z'));
  assert.ok(mat.color.g > mat.color.r, 'summer core has green cast');
});

test('createHedgeDetails exposes wind update function and flutters exposed leaves', () => {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
  const hedge = createHedgeDetails([[0, 0, 0, 1]], mat);
  assert.equal(typeof hedge.update, 'function');

  // Verify calling update runs smoothly
  hedge.update(10.5, 0.05, 4.8);

  // Core material is solid and unperturbed (no gelatinous sway)
  assert.equal(mat.onBeforeCompile, THREE.Material.prototype.onBeforeCompile);

  // Individual leaves mesh has lightweight flutter shader for exposed leaves
  const leaves = hedge.getObjectByName('hedge-individual-leaves') as THREE.InstancedMesh;
  assert.ok(leaves, 'leaves mesh exists');
  const leafMat = leaves.material as THREE.MeshStandardMaterial;
  assert.equal(typeof leafMat.onBeforeCompile, 'function');

  const dummyShader = {
    uniforms: {} as Record<string, any>,
    vertexShader: THREE.ShaderChunk.meshphysical_vert,
  };
  leafMat.onBeforeCompile(dummyShader, {} as any);
  assert.ok(dummyShader.vertexShader.includes('windTime'), 'leaf shader contains windTime uniform');
  assert.ok(dummyShader.vertexShader.includes('isFlutterLeaf'), 'leaf shader contains isFlutterLeaf selection');
  assert.equal(dummyShader.uniforms.windTime.value, 10.5);
  assert.ok(dummyShader.uniforms.windStrength.value > 0.4);
});
