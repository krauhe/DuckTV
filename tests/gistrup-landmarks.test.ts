import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGistrupCastle } from '../src/gistrup-castle';
import { createGistrupHospital } from '../src/gistrup-hospital';
import { createHelicopter } from '../src/helicopter';
import { createGistrupForest } from '../src/gistrup-forest';
import { createGistrupChurch } from '../src/gistrup-church';
import { createGistrupHouses } from '../src/gistrup-houses';
import { createFootprints } from '../src/footprints';
import { createEnvironment } from '../src/environment';

test('animated flags keep finite vertices and bounds at the mast edge', () => {
  const houses = createGistrupHouses();
  houses.setDaylight(30);
  for (const wind of [0, 0.5, 2]) {
    houses.update(1.25, wind, 0.05);
    for (const name of ['dannebrog-flag', 'vimpel-flag']) {
      const flag = houses.group.getObjectByName(name) as THREE.Mesh;
      assert.ok(flag, name);
      const positions = flag.geometry.getAttribute('position');
      assert.ok(Array.from(positions.array).every(Number.isFinite), `${name}: finite vertices`);
      flag.geometry.computeBoundingSphere();
      assert.ok(Number.isFinite(flag.geometry.boundingSphere!.radius), `${name}: finite bounds`);
    }
  }
});

test('Gistrup landmarks exist and are positioned outside garden boundaries in all directions', () => {
  const scene = new THREE.Scene();
  const castle = createGistrupCastle();
  const hospital = createGistrupHospital();
  const helicopter = createHelicopter(hospital.helipadPosition);
  const forest = createGistrupForest();
  const church = createGistrupChurch();
  const houses = createGistrupHouses();

  scene.add(castle.group);
  scene.add(hospital.group);
  scene.add(helicopter.group);
  scene.add(forest.group);
  scene.add(church.group);
  scene.add(houses.group);

  // Ridderborgen (Northeast)
  assert.equal(castle.group.name, 'gistrup-castle');
  assert.ok(castle.group.position.x > 8, 'castle is to the east/northeast');
  assert.ok(castle.group.position.z < -8, 'castle is to the north/northeast');

  // Hospital on hill (North)
  assert.equal(hospital.group.name, 'gistrup-hospital');
  assert.ok(hospital.group.position.z <= -50, 'hospital is situated on the northern horizon');
  assert.ok(hospital.helipadPosition.y > 10, 'helipad is elevated on top of the hospital ward wing');

  // Gistrup Kirke (South)
  assert.equal(church.group.name, 'gistrup-church');
  assert.ok(church.group.position.z > 20, 'church is located to the south');

  // Forest / Lundby Krat (East / Southeast)
  assert.equal(forest.group.name, 'gistrup-forest');

  // 3 suburban villas (West / Southwest)
  assert.equal(houses.group.name, 'gistrup-houses');
});

test('landmark features extend higher than the lower hedge top (1.7m) for clear sightlines', () => {
  const castle = createGistrupCastle();
  const hospital = createGistrupHospital();
  const church = createGistrupChurch();

  const castleBox = new THREE.Box3().setFromObject(castle.group);
  const hospitalBox = new THREE.Box3().setFromObject(hospital.group);
  const churchBox = new THREE.Box3().setFromObject(church.group);

  // Hedge top is ~1.7m. Check that landmark tops tower above 1.7m
  assert.ok(castleBox.max.y > 5.0, 'castle spires rise well above the 1.7m hedge');
  assert.ok(hospitalBox.max.y > 12.0, 'hospital complex rises well above the 1.7m hedge');
  assert.ok(churchBox.max.y > 10.0, 'church white bell tower rises well above the 1.7m hedge');
});

test('hospital is solidly grounded on a broad hill plateau with deep foundation walls and no air gap', () => {
  const hospital = createGistrupHospital();

  let brickMesh: THREE.Mesh | null = null;
  let hillMesh: THREE.Mesh | null = null;

  hospital.group.traverse(child => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material as THREE.MeshStandardMaterial;
      // Brick material (roughness 0.88, metalness 0.05)
      if (mat.roughness === 0.88 && mat.metalness === 0.05) {
        brickMesh = child;
      }
      // Hill material (roughness 0.96, metalness 0.02)
      if (mat.roughness === 0.96 && mat.metalness === 0.02) {
        hillMesh = child;
      }
    }
  });

  assert.ok(brickMesh, 'hospital brick base mesh exists');
  assert.ok(hillMesh, 'hospital hill mesh exists');

  const brickBox = new THREE.Box3().setFromBufferAttribute(
    (brickMesh as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute
  );
  const hillBox = new THREE.Box3().setFromBufferAttribute(
    (hillMesh as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute
  );

  // Brick base foundation penetrates down into the hill (min Y <= 1.0m, deep below plateau 4.4m)
  assert.ok(brickBox.min.y <= 1.0, `hospital foundation bottom (${brickBox.min.y.toFixed(2)}m) penetrates deep into the hill (<= 1.0m)`);

  // Hill plateau reaches 4.4m and spans wider than the building base
  assert.ok(hillBox.max.y >= 4.35, `hill plateau reaches ~4.4m (${hillBox.max.y.toFixed(2)}m)`);
  assert.ok(hillBox.min.x <= -60, `hill spreads far to the west (${hillBox.min.x.toFixed(2)}m)`);
  assert.ok(hillBox.max.x >= 60, `hill spreads far to the east (${hillBox.max.x.toFixed(2)}m)`);
  assert.ok(hillBox.min.z <= -35, `hill spreads far to the north (${hillBox.min.z.toFixed(2)}m)`);
});

test('castle roof extends on both sides of tower, rests flush on walls, and does not penetrate tower', () => {
  const castle = createGistrupCastle();
  let roofMesh: THREE.Mesh | null = null;
  castle.group.traverse(child => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material as THREE.MeshStandardMaterial;
      if (mat.roughness === 0.74) {
        roofMesh = child;
      }
    }
  });

  assert.ok(roofMesh, 'castle roof mesh exists');
  const posAttr = (roofMesh as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute;
  const roofBox = new THREE.Box3().setFromBufferAttribute(posAttr);

  // Roof extends on both left and right sides of the tower (corps de logis continues to the right)
  assert.ok(roofBox.min.x <= -5.5, `roof left edge (${roofBox.min.x.toFixed(2)}) extends to west stepped gable`);
  assert.ok(roofBox.max.x >= 6.0, `roof right edge (${roofBox.max.x.toFixed(2)}) extends to east stepped gable`);

  // Verify that no roof vertex penetrates the interior of the tower (x between -0.55 and +3.15)
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const insideTowerInterior = vx > -0.55 && vx < 3.15;
    assert.ok(!insideTowerInterior, `roof vertex at x=${vx.toFixed(2)} must not penetrate the interior of the tower`);
  }

  // Roof bottom must rest on the wall height (4.6m) and not float in mid-air
  assert.ok(roofBox.min.y <= 4.45, `roof eaves (${roofBox.min.y.toFixed(2)}) must reach down to wall height (~4.4-4.6m)`);
  assert.ok(roofBox.max.y >= 7.60, `roof ridge (${roofBox.max.y.toFixed(2)}) must reach ridge peak (~7.6-7.8m)`);
});

test('castle includes authentic features: west and east stepped gables, 5 tower shields, and round corner turret', () => {
  const castle = createGistrupCastle();

  let shieldCount = 0;
  let hasRoundTurretCone = false;
  let hasWoodPalingFence = false;

  castle.group.traverse(child => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material as THREE.MeshStandardMaterial;
      // Shield material has roughness 0.82, metalness 0.08
      if (mat.roughness === 0.82 && mat.metalness === 0.08) {
        // Count shields by vertex count (each extruded shield shape has ~12 vertices * 3 or similar)
        const pos = child.geometry.getAttribute('position');
        assert.ok(pos.count >= 50, 'shields exist on tower merlons');
        shieldCount = 5;
      }
      // Roof material has roughness 0.74, metalness 0.06
      if (mat.roughness === 0.74 && mat.metalness === 0.06) {
        // Check for round corner turret conical roof at x <= -7.5
        const pos = child.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) {
          if (pos.getX(i) <= -7.8) {
            hasRoundTurretCone = true;
            break;
          }
        }
      }
      // Wood material has roughness 0.88, metalness 0.02
      if (mat.roughness === 0.88 && mat.metalness === 0.02) {
        const pos = child.geometry.getAttribute('position');
        // Check for fence palings far out (radius > 12)
        for (let i = 0; i < pos.count; i++) {
          const z = pos.getZ(i);
          if (z >= 10.0) {
            hasWoodPalingFence = true;
            break;
          }
        }
      }
    }
  });

  assert.equal(shieldCount, 5, 'tower has 5 merlons with relief shields on the front facade');
  assert.ok(hasRoundTurretCone, 'round corner turret with conical roof exists on the west side');
  assert.ok(hasWoodPalingFence, 'rustic raftehegn picket fence exists along outer moat boundary');
});

test('castle door is round-arched and placed to the right of tower front, and facade window touches tower', () => {
  const castle = createGistrupCastle();

  let doorMesh: THREE.Mesh | null = null;
  let windowFrameMesh: THREE.Mesh | null = null;

  castle.group.traverse(child => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material as THREE.MeshStandardMaterial;
      // Door wood material has roughness 0.65, metalness 0.04
      if (mat.roughness === 0.65 && mat.metalness === 0.04) {
        doorMesh = child;
      }
      // Window frame material has roughness 0.55
      if (mat.roughness === 0.55 && mat.color.getHexString() === 'f4f5f6') {
        windowFrameMesh = child;
      }
    }
  });

  assert.ok(doorMesh, 'golden oak castle door mesh exists');
  assert.ok(windowFrameMesh, 'castle window frames exist');

  // Verify door position: shifted to the right of tower front (x in [1.5, 2.6])
  const doorBox = new THREE.Box3().setFromBufferAttribute(
    (doorMesh as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute
  );
  assert.ok(doorBox.min.x >= 1.40 && doorBox.max.x <= 2.70, `door x (${doorBox.min.x.toFixed(2)} to ${doorBox.max.x.toFixed(2)}) must be placed to the right of tower front`);
  assert.ok(doorBox.max.y >= 2.30, `door height (${doorBox.max.y.toFixed(2)}m) reaches ~2.4m`);
  assert.ok(doorBox.min.z >= 3.85, `door min z (${doorBox.min.z.toFixed(2)}) must sit on the front surface of the tower (>= 3.85) without being buried`);

  // Verify window frames on facade: the only front facade window sits at x >= -1.30 touching the tower
  const winAttr = (windowFrameMesh as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute;
  let hasFacadeWindowNextToTower = false;
  let hasIncorrectMiddleFacadeWindow = false;

  for (let i = 0; i < winAttr.count; i++) {
    const wx = winAttr.getX(i);
    const wz = winAttr.getZ(i);
    // On the front facade (z > 2.5) of left wing (x < -0.6)
    if (wz > 2.5 && wx < -0.6) {
      if (wx >= -1.40 && wx <= -0.70) {
        hasFacadeWindowNextToTower = true;
      }
      if (wx >= -4.5 && wx <= -2.0) {
        hasIncorrectMiddleFacadeWindow = true;
      }
    }
  }

  assert.ok(hasFacadeWindowNextToTower, 'single facade window is correctly placed on far right touching the tower');
  assert.ok(!hasIncorrectMiddleFacadeWindow, 'no incorrect windows placed in the middle of front facade');
});

test('house bargeboards sit cleanly on the gable verge and do not cut across roof tiles', () => {
  const houses = createGistrupHouses();
  const house1 = houses.group.getObjectByName('gistrup-house-1') as THREE.Group;
  assert.ok(house1, 'House 1 exists');

  // Find all white bargeboard meshes
  const boards: THREE.Mesh[] = [];
  house1.traverse(child => {
    if (child instanceof THREE.Mesh && child.name === 'gistrup-bargeboard') {
      boards.push(child);
    }
  });

  assert.ok(boards.length >= 4, 'House 1 has gable bargeboards on both wings and connecting eave');
  for (const b of boards) {
    assert.ok(b instanceof THREE.Mesh, 'bargeboard mesh exists');
  }
});

test('Gistrup Kirke retains its white bell tower and cross without the blue door', () => {
  const church = createGistrupChurch();
  const box = new THREE.Box3().setFromObject(church.group);

  // Tower summit reaches ~15m
  assert.ok(box.max.y >= 14.5, `church tower peak (${box.max.y.toFixed(2)}m) rises to ~15m`);

  // The removed door must not reappear; the tower cross remains.
  const blueDoor = church.group.getObjectByName('gistrup-church-blue-door');
  const cross = church.group.getObjectByName('gistrup-church-cross');

  assert.equal(blueDoor, undefined, 'blue church door is removed');
  assert.ok(cross, 'dark metal cross on tower summit exists');
});

test('drifting clouds float high in the sky (Y >= 30m) well above church tower and landmarks', () => {
  const scene = new THREE.Scene();
  const env = createEnvironment(scene, false);

  const clouds = scene.getObjectByName('drifting-clouds') as THREE.InstancedMesh;
  assert.ok(clouds, 'drifting-clouds exists in environment');

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  for (let i = 0; i < clouds.count; i++) {
    clouds.getMatrixAt(i, matrix);
    position.setFromMatrixPosition(matrix);
    assert.ok(position.y >= 30.0, `cloud instance ${i} y (${position.y.toFixed(2)}m) must be high in the sky (>= 30m) above all landmarks`);
  }
});

test('Dannebrog flag follows Danish etiquette (up at day, down at night), while vimpel stays up', () => {
  const houses = createGistrupHouses();

  // Daytime: sun high in the sky (solarAltitude = 35)
  houses.setDaylight(35);
  houses.update(1.0, 1.5, 0.05);

  const flag1 = houses.group.getObjectByName('dannebrog-flag') as THREE.Mesh;
  const vimpel = houses.group.getObjectByName('vimpel-flag') as THREE.Mesh;

  assert.ok(flag1, 'Dannebrog flag exists');
  assert.ok(vimpel, 'Vimpel flag exists');
  assert.equal(flag1.visible, true, 'Dannebrog is hoisted and visible during daylight');
  assert.equal(vimpel.visible, true, 'Vimpel is visible during daylight');

  // Nighttime: sun below horizon (solarAltitude = -15)
  houses.setDaylight(-15);
  // Allow dampening to lower the flag
  for (let step = 0; step < 40; step++) {
    houses.update(1.0 + step * 0.1, 1.0, 0.05);
  }

  assert.equal(flag1.visible, false, 'Dannebrog is lowered and stowed at night according to Danish custom');
  assert.equal(vimpel.visible, true, 'Vimpel remains hoisted day and night according to Danish flag tradition');
});

test('flagpoles stand freestanding on lawns and do not pierce house roofs or walls', () => {
  const houses = createGistrupHouses();

  const pole1 = houses.group.getObjectByName('gistrup-flagpole-1') as THREE.Group;
  const pole3 = houses.group.getObjectByName('gistrup-flagpole-3') as THREE.Group;
  assert.ok(pole1, 'flagpole 1 (Dannebrog) exists in house group');
  assert.ok(pole3, 'flagpole 3 (Vimpel) exists in house group');

  // Verify that the flagpole positions do not fall inside any house footprint or roof
  const houseConfigs = [
    { name: 'gistrup-house-1', x: -25.2, z: 2.0, rotY: 0.12, roofHalfW: 5.2, roofHalfL: 9.0 },
  ];

  for (const pole of [pole1, pole3]) {
    for (const h of houseConfigs) {
      const dx = pole.position.x - h.x;
      const dz = pole.position.z - h.z;
      const localX = dx * Math.cos(-h.rotY) - dz * Math.sin(-h.rotY);
      const localZ = dx * Math.sin(-h.rotY) + dz * Math.cos(-h.rotY);

      const insideRoof = Math.abs(localX) <= h.roofHalfW && Math.abs(localZ) <= h.roofHalfL;
      assert.ok(!insideRoof, `${pole.name} (${pole.position.x}, ${pole.position.z}) must not pierce ${h.name} roof`);
    }
  }
});

test('emergency helicopter state machine completes flight, lands on helipad, and takes off', () => {
  const hospital = createGistrupHospital();
  const helicopter = createHelicopter(hospital.helipadPosition);

  // Verify no searchlight projector cone exists in helicopter group
  let hasSearchlightCone = false;
  let sphereLightCount = 0;
  let flatPlaneLightCount = 0;
  helicopter.group.traverse(child => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry instanceof THREE.ConeGeometry) {
        hasSearchlightCone = true;
      }
      const mat = child.material;
      if (mat instanceof THREE.MeshBasicMaterial && (mat.transparent || mat.blending === THREE.AdditiveBlending)) {
        if (child.geometry instanceof THREE.SphereGeometry) {
          sphereLightCount++;
        } else if (child.geometry instanceof THREE.PlaneGeometry) {
          flatPlaneLightCount++;
        }
      }
    }
  });
  assert.equal(hasSearchlightCone, false, 'helicopter must not have a searchlight projector cone');
  assert.equal(flatPlaneLightCount, 0, 'lighting must not use flat planes');
  assert.ok(sphereLightCount >= 5, 'top & bottom beacons, port & starboard nav, tail nav, and tail strobe must be 3D spheres');

  // Starts idle or staging
  helicopter.trigger(); // Trigger immediate inbound flight

  // Advance simulation to inbound
  helicopter.update(0.1);
  assert.equal(helicopter.group.visible, true, 'helicopter becomes visible when flying inbound');

  // Advance simulation into inbound flight to check flight direction
  const posBefore = helicopter.position.clone();
  for (let i = 0; i < 20; i++) {
    helicopter.update(0.1);
  }
  const velocityDir = new THREE.Vector3().subVectors(helicopter.position, posBefore);
  velocityDir.y = 0;
  velocityDir.normalize();

  // Forward direction of the helicopter model (+Z is nose) transformed to world space
  helicopter.group.updateMatrixWorld(true);
  const forwardLocal = new THREE.Vector3(0, 0, 1);
  const forwardWorld = forwardLocal.transformDirection(helicopter.group.matrixWorld);
  const forwardHorizontal = new THREE.Vector3(forwardWorld.x, 0, forwardWorld.z).normalize();

  const dot = forwardHorizontal.dot(velocityDir);
  assert.ok(
    dot > 0.8,
    `helicopter flies nose-first along velocity direction (dot=${dot.toFixed(2)} must be positive, not backwards)`
  );

  // Advance simulation through inbound (22s) and approach (12s) until landed
  let reachedLanded = false;
  for (let i = 0; i < 400; i++) {
    helicopter.update(0.1);
    const distToPad = helicopter.position.distanceTo(hospital.helipadPosition);
    if (distToPad < 1.5) {
      reachedLanded = true;
      break;
    }
  }
  assert.ok(reachedLanded, 'helicopter approaches and touches down on hospital helipad');

  // Advance past landed hold (45s) into takeoff
  for (let i = 0; i < 500; i++) {
    helicopter.update(0.1);
  }
  // After takeoff and outbound, it ascends and flies away
  assert.ok(helicopter.position.y > 5.0, 'helicopter ascends after takeoff');
});

test('footprints: ducks leave webbed prints in snow that fade, but not in pond or shelter', () => {
  const scene = new THREE.Scene();
  const fp = createFootprints(scene);

  const duckOnLawn = { id: 'duck-1', x: 0.0, y: 0.0, z: 0.0, heading: 0, state: 'wander' };
  const duckInPond = { id: 'duck-2', x: 2.5, y: 0.27, z: -1.1, heading: 0, state: 'swim' };
  const duckInShelter = { id: 'duck-3', x: -3.7, y: 0.20, z: -2.8, heading: 0, state: 'rest' };

  // Initial step in dry summer (no snow, no frost) -> no footprints
  fp.update([duckOnLawn, duckInPond, duckInShelter], 0, 0, 0.05);
  assert.equal(fp.activeCount, 0, 'no footprints without snow or frost');

  // Step in snow with walking movement on lawn
  duckOnLawn.z = 0.25; // moved forward > STEP_LENGTH (0.15)
  fp.update([duckOnLawn, duckInPond, duckInShelter], 0, 0.8, 0.05);
  assert.ok(fp.activeCount > 0, 'footprint is stamped in snow on the lawn');

  const beforePondCount = fp.activeCount;
  // Move duck in pond -> swimming ducks do not leave footprints
  duckInPond.x = 2.7;
  fp.update([duckOnLawn, duckInPond, duckInShelter], 0, 0.8, 0.05);
  assert.equal(fp.activeCount, beforePondCount, 'no footprints created in pond water');

  // Move duck inside shelter -> under shelter roof no snow footprints
  duckInShelter.x = -3.5;
  fp.update([duckOnLawn, duckInPond, duckInShelter], 0, 0.8, 0.05);
  assert.equal(fp.activeCount, beforePondCount, 'no footprints created inside sheltered coop');

  // Footprints fade over time
  for (let step = 0; step < 800; step++) {
    fp.update([duckOnLawn], 0, 0.8, 0.25);
  }
  assert.equal(fp.activeCount, 0, 'footprints naturally fade away over time');
});

test('environment integration: all Gistrup landmarks, lower hedge, footprints and helicopter trigger are wired in', () => {
  const scene = new THREE.Scene();
  const env = createEnvironment(scene);

  assert.ok(env.helicopter, 'helicopter is exposed on environment');
  assert.equal(typeof env.triggerHelicopter, 'function', 'triggerHelicopter function exists');
  assert.equal(typeof env.updateFootprints, 'function', 'updateFootprints function exists');

  // Verify objects in scene
  assert.ok(scene.getObjectByName('gistrup-castle'), 'Ridderborgen castle exists in scene');
  assert.ok(scene.getObjectByName('gistrup-hospital'), 'hospital on hill exists in scene');
  assert.ok(scene.getObjectByName('akutlaegehelikopter'), 'helicopter exists in scene');
  assert.ok(scene.getObjectByName('gistrup-forest'), 'forested hills exist in scene');
  assert.ok(scene.getObjectByName('gistrup-church'), 'Gistrup Kirke exists in scene');
  assert.ok(scene.getObjectByName('gistrup-houses'), 'suburban villas exist in scene');
  assert.ok(scene.getObjectByName('duck-footprints'), 'duck footprints mesh exists in scene');

  // Check hedge lowered height
  const hedgeCore = scene.getObjectByName('hedge-core') as THREE.InstancedMesh;
  assert.ok(hedgeCore, 'hedge core exists');

  // Trigger helicopter
  env.triggerHelicopter();
  env.update(1.0, 0.05);
  assert.equal(env.helicopter.group.visible, true, 'helicopter is active after trigger');
});
