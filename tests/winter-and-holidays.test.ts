import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTreesAndHolidays } from '../src/trees.ts';
import { createEnvironment } from '../src/environment.ts';

test('deciduous trees behind hedge have foliage in summer/autumn and shed leaves in winter or snow', () => {
  const scene = new THREE.Scene();
  const th = createTreesAndHolidays(scene, new Date('2026-07-15T12:00:00Z'));

  const branches = scene.getObjectByName('deciduous-tree-branches') as THREE.InstancedMesh;
  const canopies = scene.getObjectByName('deciduous-tree-canopies') as THREE.InstancedMesh;
  const pines = scene.getObjectByName('evergreen-pines') as THREE.Group;

  assert.ok(branches, 'deciduous tree branch structure exists');
  assert.ok(canopies, 'deciduous tree canopy mesh exists');
  assert.ok(pines, 'evergreen pines exist behind hedge');
  assert.equal(canopies.visible, true, 'canopies are visible in July');

  // Switch to January (winter) -> leaves are shed
  th.setDate(new Date('2026-01-15T12:00:00Z'));
  assert.equal(canopies.visible, false, 'deciduous trees shed all leaves in winter');

  // Switch back to October -> golden/copper autumn leaves visible, unless snow/frost is active
  th.setDate(new Date('2026-10-25T12:00:00Z'));
  th.setWeather(0, 0, 1);
  assert.equal(canopies.visible, true, 'autumn canopy is visible in October without snow');

  // Activate winter snow preset -> trees shed leaves so bare branches stand against winter sky
  th.setWeather(0.5, 1.0, 1);
  assert.equal(canopies.visible, false, 'deciduous trees are bare during snow preset');
});

test('holidays: Halloween pumpkins appear around late October and Christmas tree with fairy lights in December', () => {
  const scene = new THREE.Scene();
  const th = createTreesAndHolidays(scene, new Date('2026-10-27T18:00:00Z'));

  const pumpkins = scene.getObjectByName('halloween-pumpkins') as THREE.Group;
  const xmasTree = scene.getObjectByName('garden-christmas-tree') as THREE.Group;
  const fairyLights = scene.getObjectByName('christmas-fairy-lights') as THREE.InstancedMesh;

  assert.ok(pumpkins, 'halloween pumpkins group exists');
  assert.ok(xmasTree, 'garden christmas tree group exists');
  assert.ok(fairyLights, 'christmas fairy lights instanced mesh exists');
  assert.equal(fairyLights.count, 40, 'christmas tree has 40 spiral fairy lights');

  // On Oct 27, Halloween pumpkins are visible and Christmas tree is hidden
  assert.equal(pumpkins.visible, true, 'pumpkins visible in late October (Halloween)');
  assert.equal(xmasTree.visible, false, 'christmas tree hidden in late October');

  // Verify pumpkin carvings are recessed into the pumpkin flesh and do not protrude outward from the sides
  pumpkins.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name !== 'halloween-pumpkins') {
      // Check that face meshes (extrusions/shapes) are inset inside the pumpkin shell (z <= 0.88 * r)
      const mat = child.material as THREE.Material;
      if (mat && (mat as THREE.MeshBasicMaterial).color?.getHex?.() === 0xffb830) {
        // Glowing cutout plane
        assert.ok(child.position.z < 0.25, 'glowing carving is recessed within pumpkin radius');
      }
    }
  });

  // Switch to July -> neither holiday decoration is visible
  th.setDate(new Date('2026-07-15T12:00:00Z'));
  assert.equal(pumpkins.visible, false, 'pumpkins hidden in July');
  assert.equal(xmasTree.visible, false, 'christmas tree hidden in July');

  // Switch to December 15 -> Christmas tree with fairy lights is visible
  th.setDate(new Date('2026-12-15T17:00:00Z'));
  th.setWeather(0.3, 0.8, 0.1);
  th.update(5.0);
  assert.equal(pumpkins.visible, false, 'pumpkins hidden in December');
  assert.equal(xmasTree.visible, true, 'christmas tree visible in December');
});

test('environment supports frost and snow weather presets, falling snow, roof snow, and pond ice rim', () => {
  const scene = new THREE.Scene();
  const env = createEnvironment(scene);

  const snowPoints = scene.getObjectByName('weather-snow') as THREE.Points;
  const roofSnow = scene.getObjectByName('shelter-roof-snow') as THREE.Mesh;
  const iceRim = scene.getObjectByName('pond-ice-rim') as THREE.Mesh;

  assert.ok(snowPoints, 'weather-snow particle system exists');
  assert.ok(roofSnow, 'shelter-roof-snow mesh exists');
  assert.ok(iceRim, 'pond-ice-rim mesh exists');
  assert.equal(snowPoints.visible, false, 'snow is hidden in clear weather');

  // Activate snow weather
  env.setWeather({ cloud: 88, wind: 2.2, rain: 0, frost: 0.5, snow: 1, isDay: true });
  env.update(2.0, 1.5);

  assert.equal(snowPoints.visible, true, 'falling snow is visible when snow > 0');
  assert.equal(roofSnow.visible, true, 'shelter roof snow cap appears in snow weather');
  assert.equal(iceRim.visible, true, 'pond ice rim appears in snow/frost weather');

  // Test low-quality mode reduces particle draw range and disables hedge shadows
  const fullSnowDraw = snowPoints.geometry.drawRange.count;
  env.setLowQuality(true);
  assert.ok(snowPoints.geometry.drawRange.count < fullSnowDraw, 'low quality mode reduces snow particle draw range');
  const hedgeCore = scene.getObjectByName('hedge-core') as THREE.InstancedMesh;
  assert.equal(hedgeCore.castShadow, false, 'low quality mode disables hedge shadow casting');
});
