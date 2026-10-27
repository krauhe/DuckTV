import * as THREE from 'three';

export interface GistrupForest {
  group: THREE.Group;
  update(windTime: number, windStrength: number, dt: number): void;
  setDate(date: Date): void;
  setWinterWeather(snow: number, frost: number): void;
  setDaylight(solarAltitude: number): void;
}

export type ForestSeason = 'spring' | 'summer' | 'early_autumn' | 'copper_autumn' | 'winter';

export function getForestSeason(date: Date): ForestSeason {
  const m = date.getMonth(); // 0 = Jan, 3 = Apr, 4 = May, 8 = Sep, 9 = Oct, 10 = Nov, 11 = Dec
  const d = date.getDate();
  if (m === 11 || m <= 2) return 'winter'; // Dec - Mar
  if (m === 3 || m === 4) return 'spring'; // Apr - May
  if (m >= 5 && m <= 7) return 'summer'; // Jun - Aug
  if (m === 8 || (m === 9 && d <= 10)) return 'early_autumn'; // Sep - primo Oct
  return 'copper_autumn'; // Ultimo Oct - Nov
}

/**
 * Builds an organic, multi-lobed deciduous tree crown geometry (beech/oak)
 * consisting of multiple irregular flattened lobes around branch centers.
 * Avoids any simple smooth sphere/balloon shape.
 */
function createBeechCrownGeometry(seed = 101): THREE.BufferGeometry {
  let s = seed >>> 0;
  const rand = () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };

  // Base icosahedron for building irregular foliage lobes
  const baseIco = new THREE.IcosahedronGeometry(1, 1);
  const posAttr = baseIco.getAttribute('position') as THREE.BufferAttribute;

  // We cluster 7 irregular lobes to create a wide, airy, natural Danish beech crown
  const lobes: Array<{ center: THREE.Vector3; radius: THREE.Vector3 }> = [
    { center: new THREE.Vector3(0, 1.45, 0), radius: new THREE.Vector3(1.15, 0.78, 1.15) },
    { center: new THREE.Vector3(-0.85, 1.15, 0.45), radius: new THREE.Vector3(0.95, 0.65, 0.90) },
    { center: new THREE.Vector3(0.80, 1.20, -0.40), radius: new THREE.Vector3(0.92, 0.68, 0.88) },
    { center: new THREE.Vector3(0.35, 1.05, 0.85), radius: new THREE.Vector3(0.88, 0.62, 0.85) },
    { center: new THREE.Vector3(-0.45, 0.95, -0.80), radius: new THREE.Vector3(0.85, 0.60, 0.82) },
    { center: new THREE.Vector3(1.10, 0.85, 0.25), radius: new THREE.Vector3(0.78, 0.55, 0.75) },
    { center: new THREE.Vector3(-1.05, 0.75, -0.35), radius: new THREE.Vector3(0.75, 0.52, 0.72) },
  ];

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let l = 0; l < lobes.length; l++) {
    const lobe = lobes[l];
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      // Displace vertices irregularly for natural leafy foliage surface
      const noise = 0.84 + rand() * 0.32;
      n.copy(v).normalize();
      v.x = lobe.center.x + n.x * lobe.radius.x * noise;
      v.y = lobe.center.y + n.y * lobe.radius.y * noise;
      v.z = lobe.center.z + n.z * lobe.radius.z * noise;
      positions.push(v.x, v.y, v.z);
      normals.push(n.x, n.y, n.z);
      uvs.push((v.x + 2) / 4, (v.z + 2) / 4);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  // Build index from base icosahedron index
  if (baseIco.index) {
    const baseIndices = baseIco.index.array;
    const indices: number[] = [];
    for (let l = 0; l < lobes.length; l++) {
      const offset = l * posAttr.count;
      for (let j = 0; j < baseIndices.length; j++) {
        indices.push(baseIndices[j] + offset);
      }
    }
    geo.setIndex(indices);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a natural tiered conifer (Danish skovfyr/rødgran) crown geometry
 * with 5 cascading, multi-faceted drooping bough tiers.
 */
function createPineCrownGeometry(): THREE.BufferGeometry {
  const tiers = 5;
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  let vertOffset = 0;

  for (let t = 0; t < tiers; t++) {
    const frac = t / (tiers - 1); // 0 at bottom, 1 at top
    const baseY = 0.6 + frac * 2.3;
    const peakY = baseY + 1.15 - frac * 0.35;
    const radius = (1.25 - frac * 0.85) * 1.1;
    const rimY = baseY - 0.22;
    const segments = 10;

    // Peak vertex
    positions.push(0, peakY, 0);
    normals.push(0, 1, 0);
    const peakIdx = vertOffset++;

    // Rim vertices
    const rimStart = vertOffset;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Slight star/scallop modulation for irregular pine branches
      const rMod = radius * (0.88 + ((i % 2 === 0) ? 0.24 : -0.12));
      const px = Math.cos(angle) * rMod;
      const pz = Math.sin(angle) * rMod;
      positions.push(px, rimY, pz);
      // Approximate normal pointing outward and slightly up
      const nVec = new THREE.Vector3(px, radius * 0.65, pz).normalize();
      normals.push(nVec.x, nVec.y, nVec.z);
      vertOffset++;
    }

    // Underside center
    positions.push(0, baseY, 0);
    normals.push(0, -1, 0);
    const underCenter = vertOffset++;

    // Triangles for upper conical skirt
    for (let i = 0; i < segments; i++) {
      const cur = rimStart + i;
      const next = rimStart + ((i + 1) % segments);
      indices.push(peakIdx, next, cur);
      // Underside skirt closure
      indices.push(underCenter, cur, next);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates realistic tapered tree trunk geometry with a gentle natural crook
 * and visible base root flare.
 */
function createTrunkGeometry(height = 2.4, rBase = 0.18, rTop = 0.09): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(rTop, rBase, height, 7);
  geo.translate(0, height / 2, 0);
  return geo;
}

export function createGistrupForest(): GistrupForest {
  const group = new THREE.Group();
  group.name = 'gistrup-forest';

  let seed = 91823;
  const rand = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // ========================================================================
  // 1. ROLLING HILL RIDGES (Lundby Krat morænebakker)
  // 3 distinct layers extending towards East and South-East (x: 25-55, z: -15-30)
  // Layer 1: Front ridge (x ~ 26-33, detail, crisp moraine slopes)
  // Layer 2: Mid ridge (x ~ 36-44, higher elevation)
  // Layer 3: Distant ridge (x ~ 47-56, tallest hill tops, blueish haze)
  // ========================================================================

  interface RidgeSpec {
    layerIndex: number;
    baseX: number;
    hazeFactor: number;
    elevMin: number;
    elevMax: number;
    hillCount: number;
    treeCount: number;
  }

  const ridgeSpecs: RidgeSpec[] = [
    { layerIndex: 0, baseX: 28.5, hazeFactor: 0.00, elevMin: 2.2, elevMax: 4.8, hillCount: 7, treeCount: 36 },
    { layerIndex: 1, baseX: 38.0, hazeFactor: 0.18, elevMin: 4.5, elevMax: 8.5, hillCount: 8, treeCount: 46 },
    { layerIndex: 2, baseX: 48.5, hazeFactor: 0.38, elevMin: 8.0, elevMax: 14.0, hillCount: 9, treeCount: 56 },
  ];

  // Geometries for hills: smooth rolling Gaussian ellipsoids
  const hillBaseGeo = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);

  // Hill materials per ridge layer for atmospheric depth (aerial perspective)
  const hillMaterials: THREE.MeshStandardMaterial[] = ridgeSpecs.map((spec) => {
    return new THREE.MeshStandardMaterial({
      color: 0x5b7a3e,
      roughness: 0.96,
      metalness: 0.02,
      flatShading: false,
    });
  });

  interface HillPlacement {
    x: number;
    y: number;
    z: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    layer: number;
  }
  const hillPlacements: HillPlacement[] = [];

  // Populate hills across the 3 layers
  for (const spec of ridgeSpecs) {
    const zSpan = 45; // z from -15 to 30
    const step = zSpan / spec.hillCount;
    for (let i = 0; i < spec.hillCount; i++) {
      const z = -14 + i * step + (rand() - 0.5) * 4.0;
      const x = spec.baseX + (rand() - 0.5) * 4.5;
      const h = spec.elevMin + rand() * (spec.elevMax - spec.elevMin);
      const radX = 6.5 + rand() * 4.5;
      const radZ = 7.0 + rand() * 5.0;
      hillPlacements.push({
        x,
        y: h * 0.45,
        z,
        scaleX: radX,
        scaleY: h,
        scaleZ: radZ,
        layer: spec.layerIndex,
      });
    }
  }

  // Create hill meshes per layer
  const hillMeshes: THREE.Mesh[] = [];
  ridgeSpecs.forEach((spec, layerIdx) => {
    const layerHills = hillPlacements.filter(h => h.layer === layerIdx);
    const hillGroup = new THREE.Group();
    hillGroup.name = `forest-hills-layer-${layerIdx}`;
    for (const hp of layerHills) {
      const mesh = new THREE.Mesh(hillBaseGeo, hillMaterials[layerIdx]);
      mesh.position.set(hp.x, hp.y, hp.z);
      mesh.scale.set(hp.scaleX, hp.scaleY, hp.scaleZ);
      mesh.rotation.y = rand() * Math.PI * 2;
      mesh.receiveShadow = layerIdx === 0;
      hillGroup.add(mesh);
    }
    group.add(hillGroup);
  });

  /**
   * Helper function to sample ground elevation at (x, z) for placing trees.
   */
  function getForestGroundHeight(x: number, z: number): number {
    let maxY = 0;
    for (const hp of hillPlacements) {
      const dx = (x - hp.x) / hp.scaleX;
      const dz = (z - hp.z) / hp.scaleZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < 1.0) {
        const localY = hp.y + Math.sqrt(Math.max(0, 1 - distSq)) * hp.scaleY * 0.65;
        if (localY > maxY) maxY = localY;
      }
    }
    return Math.max(0.1, maxY);
  }

  // ========================================================================
  // 2. PROCEDURAL TREES: DANISH BEECH & DARK PINE TREES
  // ========================================================================

  const beechCrownGeo = createBeechCrownGeometry(1452);
  const pineCrownGeo = createPineCrownGeometry();
  const trunkGeo = createTrunkGeometry(2.6, 0.22, 0.11);

  // Materials for crowns & trunks
  // We use vertex colors or individual layers/materials for high performance
  const beechMaterials: THREE.MeshStandardMaterial[] = ridgeSpecs.map((spec) => {
    return new THREE.MeshStandardMaterial({
      color: 0x2d5e23,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: true,
    });
  });

  const pineMaterials: THREE.MeshStandardMaterial[] = ridgeSpecs.map((spec) => {
    return new THREE.MeshStandardMaterial({
      color: 0x203622,
      roughness: 0.82,
      metalness: 0.05,
      flatShading: true,
    });
  });

  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x483a2e,
    roughness: 0.95,
  });

  // Snow cap overlay materials
  const snowCrownMaterial = new THREE.MeshStandardMaterial({
    color: 0xeef5fc,
    roughness: 0.90,
    metalness: 0.02,
    transparent: true,
    opacity: 0.0,
  });

  interface TreePlacement {
    pos: THREE.Vector3;
    scale: number;
    rotY: number;
    isPine: boolean;
    layer: number;
    swayPhase: number;
    swaySpeed: number;
  }

  const treePlacements: TreePlacement[] = [];

  for (const spec of ridgeSpecs) {
    const zMin = -15;
    const zMax = 30;
    const count = spec.treeCount;
    for (let i = 0; i < count; i++) {
      const z = zMin + (i / count) * (zMax - zMin) + (rand() - 0.5) * 3.2;
      const x = spec.baseX + (rand() - 0.5) * 6.5;
      const y = getForestGroundHeight(x, z);
      const isPine = rand() < 0.38; // ~38% pine / conifer, 62% beech
      const scale = (isPine ? 1.05 + rand() * 0.45 : 1.25 + rand() * 0.55) * (1.0 + spec.layerIndex * 0.12);
      treePlacements.push({
        pos: new THREE.Vector3(x, y - 0.05, z),
        scale,
        rotY: rand() * Math.PI * 2,
        isPine,
        layer: spec.layerIndex,
        swayPhase: rand() * Math.PI * 2,
        swaySpeed: 0.9 + rand() * 0.35,
      });
    }
  }

  // Build instanced meshes for trees
  const dummy = new THREE.Object3D();

  // Create separate groups for each layer so we can animate wind swaying with phase delay
  const layerGroups: THREE.Group[] = ridgeSpecs.map((spec, layerIdx) => {
    const lg = new THREE.Group();
    lg.name = `forest-trees-layer-${layerIdx}`;
    group.add(lg);
    return lg;
  });



  ridgeSpecs.forEach((spec, layerIdx) => {
    const trees = treePlacements.filter(t => t.layer === layerIdx);
    const beeches = trees.filter(t => !t.isPine);
    const pines = trees.filter(t => t.isPine);

    // Trunks
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMaterial, trees.length);
    trunkMesh.castShadow = layerIdx === 0;
    trunkMesh.receiveShadow = layerIdx === 0;

    // Beeches
    const beechMesh = new THREE.InstancedMesh(beechCrownGeo, beechMaterials[layerIdx], Math.max(1, beeches.length));
    beechMesh.castShadow = layerIdx === 0;
    beechMesh.receiveShadow = layerIdx === 0;

    // Pines
    const pineMesh = new THREE.InstancedMesh(pineCrownGeo, pineMaterials[layerIdx], Math.max(1, pines.length));
    pineMesh.castShadow = layerIdx === 0;
    pineMesh.receiveShadow = layerIdx === 0;

    // Snow caps
    const snowMesh = new THREE.InstancedMesh(beechCrownGeo, snowCrownMaterial, Math.max(1, beeches.length));

    let tIdx = 0;
    let bIdx = 0;
    let pIdx = 0;

    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      // Set trunk
      dummy.position.copy(t.pos);
      dummy.rotation.set(0, t.rotY, 0);
      dummy.scale.set(t.scale, t.scale, t.scale);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(tIdx++, dummy.matrix);

      if (t.isPine) {
        dummy.position.set(t.pos.x, t.pos.y + 0.4 * t.scale, t.pos.z);
        dummy.rotation.set(0, t.rotY, 0);
        dummy.scale.set(t.scale * 1.1, t.scale * 1.25, t.scale * 1.1);
        dummy.updateMatrix();
        pineMesh.setMatrixAt(pIdx++, dummy.matrix);
      } else {
        dummy.position.set(t.pos.x, t.pos.y + 1.2 * t.scale, t.pos.z);
        dummy.rotation.set(0, t.rotY, 0);
        dummy.scale.set(t.scale * 1.35, t.scale * 1.25, t.scale * 1.35);
        dummy.updateMatrix();
        beechMesh.setMatrixAt(bIdx, dummy.matrix);
        // Slightly scaled up for snow cap
        dummy.scale.set(t.scale * 1.38, t.scale * 1.28, t.scale * 1.38);
        dummy.position.y += 0.08 * t.scale;
        dummy.updateMatrix();
        snowMesh.setMatrixAt(bIdx, dummy.matrix);
        bIdx++;
      }
    }

    trunkMesh.instanceMatrix.needsUpdate = true;
    if (beeches.length > 0) beechMesh.instanceMatrix.needsUpdate = true;
    if (pines.length > 0) pineMesh.instanceMatrix.needsUpdate = true;
    if (beeches.length > 0) snowMesh.instanceMatrix.needsUpdate = true;

    layerGroups[layerIdx].add(trunkMesh);
    if (beeches.length > 0) layerGroups[layerIdx].add(beechMesh);
    if (pines.length > 0) layerGroups[layerIdx].add(pineMesh);
    if (beeches.length > 0) layerGroups[layerIdx].add(snowMesh);


  });

  // ========================================================================
  // 3. SEASON & WINTER WEATHER STATE
  // ========================================================================

  let currentDate = new Date();
  let snowLevel = 0;
  let frostLevel = 0;
  let solarAlt = 45; // Degrees

  // Palette definitions from specification:
  // Forår (apr-maj): frisk lysegrøn (#7eb844)
  // Sommer (jun-aug): dyb frodig skovgrøn (#2d5e23)
  // Tidlig efterår (sep-primo okt): gyldengrøn overgang (#9e942e)
  // Kobber-efterår (ultimo okt-nov): varm kobber, rav og gyldenbrun (#9c4918, #bd7426)
  // Vinter (dec-mar): gråbrune nøgne løvkroner (#4d4038) med mørkegrønne grantræer imellem (#203622).
  const PALETTE = {
    spring: new THREE.Color('#7eb844'),
    summer: new THREE.Color('#2d5e23'),
    early_autumn: new THREE.Color('#9e942e'),
    copper_autumn_primary: new THREE.Color('#9c4918'),
    copper_autumn_secondary: new THREE.Color('#bd7426'),
    winter_deciduous: new THREE.Color('#4d4038'),
    pine_evergreen: new THREE.Color('#203622'),
    snow_white: new THREE.Color('#edf5fc'),
    frost_white: new THREE.Color('#d4e4f2'),
    aerial_haze: new THREE.Color('#9bbdd8'),
    hill_spring: new THREE.Color('#75a842'),
    hill_summer: new THREE.Color('#4f7e34'),
    hill_early_autumn: new THREE.Color('#858c38'),
    hill_copper_autumn: new THREE.Color('#6f5038'),
    hill_winter: new THREE.Color('#48423a'),
  };

  const tempCol = new THREE.Color();

  function updateForestColors() {
    const season = getForestSeason(currentDate);

    // 1. Beech canopy base color
    let baseBeechCol: THREE.Color;
    if (season === 'spring') {
      baseBeechCol = PALETTE.spring;
    } else if (season === 'summer') {
      baseBeechCol = PALETTE.summer;
    } else if (season === 'early_autumn') {
      baseBeechCol = PALETTE.early_autumn;
    } else if (season === 'copper_autumn') {
      baseBeechCol = PALETTE.copper_autumn_primary;
    } else {
      // Winter: bare grey-brown crowns
      baseBeechCol = PALETTE.winter_deciduous;
    }

    // 2. Hill base color
    let baseHillCol: THREE.Color;
    if (season === 'spring') baseHillCol = PALETTE.hill_spring;
    else if (season === 'summer') baseHillCol = PALETTE.hill_summer;
    else if (season === 'early_autumn') baseHillCol = PALETTE.hill_early_autumn;
    else if (season === 'copper_autumn') baseHillCol = PALETTE.hill_copper_autumn;
    else baseHillCol = PALETTE.hill_winter;

    // Apply aerial perspective per ridge layer (distant layers blend slightly towards sky/haze)
    ridgeSpecs.forEach((spec, idx) => {
      const haze = spec.hazeFactor;

      // Update beech material
      const bMat = beechMaterials[idx];
      tempCol.copy(baseBeechCol);
      if (haze > 0) tempCol.lerp(PALETTE.aerial_haze, haze * 0.75);
      // Snow/frost dusting on deciduous crown
      if (snowLevel > 0.05) tempCol.lerp(PALETTE.snow_white, snowLevel * 0.45);
      else if (frostLevel > 0.05) tempCol.lerp(PALETTE.frost_white, frostLevel * 0.28);
      bMat.color.copy(tempCol);

      // Update pine material (stays evergreen #203622 with snow/haze)
      const pMat = pineMaterials[idx];
      tempCol.copy(PALETTE.pine_evergreen);
      if (haze > 0) tempCol.lerp(PALETTE.aerial_haze, haze * 0.65);
      if (snowLevel > 0.05) tempCol.lerp(PALETTE.snow_white, snowLevel * 0.50);
      else if (frostLevel > 0.05) tempCol.lerp(PALETTE.frost_white, frostLevel * 0.30);
      pMat.color.copy(tempCol);

      // Update hill material
      const hMat = hillMaterials[idx];
      tempCol.copy(baseHillCol);
      if (haze > 0) tempCol.lerp(PALETTE.aerial_haze, haze * 0.85);
      // Winter snow on hills
      if (snowLevel > 0.02) tempCol.lerp(PALETTE.snow_white, Math.min(1.0, snowLevel * 0.95));
      else if (frostLevel > 0.02) tempCol.lerp(PALETTE.frost_white, frostLevel * 0.65);
      hMat.color.copy(tempCol);
    });

    // Snow overlay mesh on tree canopies
    snowCrownMaterial.opacity = THREE.MathUtils.clamp((snowLevel - 0.1) * 1.25, 0.0, 0.92);
    snowCrownMaterial.visible = snowLevel > 0.1;
  }

  // Initial color setup
  updateForestColors();

  return {
    group,
    update(_windTime: number, _windStrength: number, _dt: number) {
      // Skoven og bakkerne i horisonten er fast jord og klipper — ingen rotation
      // omkring have-origo, så skoven står fuldstændig stabilt og aldrig bølger op og ned.
    },
    setDate(date: Date) {
      currentDate = date;
      updateForestColors();
    },
    setWinterWeather(snow: number, frost: number) {
      snowLevel = THREE.MathUtils.clamp(snow, 0, 1);
      frostLevel = THREE.MathUtils.clamp(frost, 0, 1);
      updateForestColors();
    },
    setDaylight(solarAltitude: number) {
      solarAlt = solarAltitude;
      // Adjust foliage and hill materials for dusk / dawn / night atmosphere
      // Solar altitude: > 10 = bright day, 0 to 10 = golden twilight, < 0 = blue hour / night
      const duskFactor = THREE.MathUtils.clamp((solarAlt + 6) / 16, 0.15, 1.0);
      const nightFactor = THREE.MathUtils.clamp((-solarAlt) / 12, 0.0, 1.0);

      // Night tint: nocturnal deep indigo-blue
      const nocturnalShift = new THREE.Color('#10223b');

      ridgeSpecs.forEach((_, idx) => {
        const bMat = beechMaterials[idx];
        const pMat = pineMaterials[idx];
        const hMat = hillMaterials[idx];

        // Softly shift towards nocturnal depth when sun is below horizon
        if (nightFactor > 0.01) {
          bMat.color.lerp(nocturnalShift, nightFactor * 0.45);
          pMat.color.lerp(nocturnalShift, nightFactor * 0.55);
          hMat.color.lerp(nocturnalShift, nightFactor * 0.50);
        }
      });
    },
  };
}
