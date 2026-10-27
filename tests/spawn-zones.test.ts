import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, START_ZONES } from '../src/simulation.ts';
import { GARDEN, POND } from '../src/types.ts';
import { gardenGroundHeight } from '../src/shelter.ts';

function seeded(seed = 42): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

test('START_ZONES defines multiple distinct natural garden spawn zones', () => {
  assert.ok(START_ZONES.length >= 5, 'Should provide at least 5 distinct flock spawn areas');
  const names = new Set(START_ZONES.map(z => z.name));
  assert.equal(names.size, START_ZONES.length, 'Zone names must be unique');

  for (const zone of START_ZONES) {
    assert.equal(zone.starts.length, 4, `Zone ${zone.name} must specify starting positions for all 4 ducks`);
    assert.ok(zone.label.length > 0, 'Zone must have a descriptive label');

    for (let i = 0; i < zone.starts.length; i++) {
      const p = zone.starts[i];
      // Must be safely within garden bounds
      assert.ok(p.x >= GARDEN.minX + 0.8 && p.x <= GARDEN.maxX - 0.8, `${zone.name} duck ${i} x within bounds`);
      assert.ok(p.z >= GARDEN.minZ + 0.8 && p.z <= GARDEN.maxZ - 0.8, `${zone.name} duck ${i} z within bounds`);

      // Must be safely outside the pond
      const pondDist = Math.hypot(p.x - POND.x, p.z - POND.z);
      assert.ok(pondDist >= POND.radius + 0.55, `${zone.name} duck ${i} outside pond (${pondDist.toFixed(2)})`);

      // Must be on the lawn (ground height = 0)
      assert.equal(gardenGroundHeight(p.x, p.z), 0, `${zone.name} duck ${i} must start on garden lawn`);

      // Ducks must maintain natural personal space
      for (let j = i + 1; j < zone.starts.length; j++) {
        const other = zone.starts[j];
        const duckDist = Math.hypot(p.x - other.x, p.z - other.z);
        assert.ok(duckDist >= 0.38, `${zone.name} ducks ${i} and ${j} spacing >= 0.38m (got ${duckDist.toFixed(2)}m)`);
      }
    }
  }
});

test('default new Simulation() produces varying flock starting zones', () => {
  const chosenZones = new Set<string>();
  const startXPositions = new Set<string>();

  for (let i = 0; i < 40; i++) {
    const sim = new Simulation();
    if (sim.spawnZone) chosenZones.add(sim.spawnZone.name);
    startXPositions.add(sim.ducks[0].x.toFixed(2));
  }

  // With 40 runs, multiple zones should be selected
  assert.ok(chosenZones.size >= 3, `Expected at least 3 different spawn zones across 40 runs, got ${chosenZones.size}`);
  assert.ok(startXPositions.size >= 5, `Expected multiple different start positions, got ${startXPositions.size}`);
});

test('explicit spawnZone option configures specific starting zone', () => {
  const simByName = new Simulation(seeded(123), { spawnZone: 'center-lawn' });
  assert.equal(simByName.spawnZone?.name, 'center-lawn');
  assert.ok(Math.abs(simByName.ducks[0].x - (-0.40)) < 0.01);
  assert.ok(Math.abs(simByName.ducks[0].z - 0.85) < 0.01);

  const simByIndex = new Simulation(seeded(123), { spawnZone: 3 });
  assert.equal(simByIndex.spawnZone?.name, 'south-garden');
  assert.ok(Math.abs(simByIndex.ducks[0].x - 0.50) < 0.01);

  const customStarts = [
    { x: -0.2, z: 0.5, heading: 0.1 },
    { x: 0.2, z: 0.5, heading: 0.2 },
    { x: -0.2, z: 0.9, heading: 0.3 },
    { x: 0.2, z: 0.9, heading: 0.4 },
  ];
  const simCustom = new Simulation(seeded(123), customStarts);
  assert.equal(simCustom.ducks[0].x, -0.2);
  assert.equal(simCustom.ducks[1].x, 0.2);
});

test('seeded Simulation without options retains deterministic baseline starts', () => {
  const simA = new Simulation(seeded(99));
  const simB = new Simulation(seeded(99));

  assert.equal(simA.spawnZone?.name, 'shelter-front');
  assert.equal(simA.ducks[0].x, -1.65);
  assert.equal(simA.ducks[0].z, 0.0);
  assert.deepEqual(simA.ducks.map(d => ({ x: d.x, z: d.z })), simB.ducks.map(d => ({ x: d.x, z: d.z })));
});
