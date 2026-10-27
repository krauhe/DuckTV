import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GARDEN, POND } from './types';
import { createShelter, SHELTER, gardenGroundHeight } from './shelter';
import { createSky } from './sky';
import { createNightSky } from './night-sky';
import { createRainImpacts } from './rain-impacts';
import { lawnTexture, lawnMarkMask } from './lawn-texture';
import { createHedgeDetails } from './hedge';
import { createTreesAndHolidays } from './trees';
import { createContactShadows, type DuckShadowTarget } from './contact-shadows';
import { createFootprints, type FootprintDuck } from './footprints';
import { createGistrupCastle, type GistrupCastle } from './gistrup-castle';
import { createGistrupHospital, type GistrupHospital } from './gistrup-hospital';
import { createHelicopter, type Helicopter } from './helicopter';
import { createGistrupForest, type GistrupForest } from './gistrup-forest';
import { createGistrupChurch, type GistrupChurch } from './gistrup-church';
import { createGistrupHouses, type GistrupHouses } from './gistrup-houses';

type Weather = { cloud: number; wind: number; rain: number; isDay: boolean; frost?: number; snow?: number };
type Ripple = { x: number; z: number; start: number; strength: number; line: THREE.LineLoop };

const TAU = Math.PI * 2;
const SHELL_LOBES = 12;

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shellRadius(angle: number, radius: number, strength = 1): number {
  const scalloped=radius*(1+.035*strength*Math.cos(SHELL_LOBES*angle));
  // A single moulded shell has a straight hinge edge at the back, not a round tub.
  return Math.sin(angle)<-.001?Math.min(scalloped,radius*.82/-Math.sin(angle)):scalloped;
}

function radialSurface(profile: Array<[number, number, number]>, segments = 144): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j < profile.length; j++) {
    const [radius, y, scallop] = profile[j];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * TAU;
      const r = shellRadius(angle, radius, scallop);
      positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
    }
  }
  for (let j = 0; j < profile.length - 1; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeRippleLine(): THREE.LineLoop {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
  const material = new THREE.LineBasicMaterial({ color: 0xe7ffff, transparent: true, opacity: 0, depthWrite: false });
  const line = new THREE.LineLoop(geometry, material);
  line.visible = false;
  line.renderOrder = 3;
  return line;
}

export function createEnvironment(scene: THREE.Scene): {
  ground: THREE.Mesh;
  update(time: number, dt: number): void;
  ripple(x: number, z: number, strength?: number): void;
  splash(x: number, y: number, z: number, count?: number, speed?: number, spread?: number, options?: { vx?: number; vy?: number; vz?: number; directionAngle?: number; arcWidth?: number; upwardBias?: number; life?: number }): void;
  setWeather(weather: Weather): void;
  setDaylight(light: number, phase: number): void;
  setSkyDate(date:Date):void;
  setLowQuality(low: boolean): void;
  setShelterDoor(closed:number):void;
  updateContactShadows(ducks: readonly DuckShadowTarget[], groundHeight: (x: number, z: number) => number): void;
  updateFootprints(ducks: readonly FootprintDuck[], dt: number): void;
  readonly helicopter: Helicopter;
  triggerHelicopter(): void;
} {
  const rand = random(75129);
  const shelter=createShelter(scene);
  const skyDay = new THREE.Color(0x9edaf0);
  const skyOvercast = new THREE.Color(0x566572);
  const skyNight = new THREE.Color(0x182c49);
  scene.background = skyDay.clone();
  const fog = new THREE.Fog(skyDay.clone(), 36, 130);
  scene.fog = fog;
  const sky=createSky(scene);

  const nightSky=createNightSky(scene);
  nightSky.setDate(new Date());

  const hemi = new THREE.HemisphereLight(0xdcf0ff, 0x7aa558, 1.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff5e0, 2.75);
  sun.position.set(-5, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 35;
  sun.shadow.bias = -0.00022;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  scene.add(sun.target);

  const winterUniforms = { uFrost: { value: 0 }, uSnow: { value: 0 } };

  // Its upper face is exactly y=0, so ground raycasts stay consistent with duck movement.
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: lawnTexture(), roughness: 1.0, metalness: 0.0 });
  groundMat.onBeforeCompile = (shader) => {
    shader.uniforms.uFrost = winterUniforms.uFrost;
    shader.uniforms.uSnow = winterUniforms.uSnow;
    shader.fragmentShader = 'uniform float uFrost;\nuniform float uSnow;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      float lawnLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      vec3 frostedLawn = mix(diffuseColor.rgb, vec3(0.76, 0.85, 0.90) * (0.78 + lawnLum * 0.42), uFrost * 0.72);
      vec3 snowyLawn = vec3(0.89, 0.93, 0.98) * (0.86 + lawnLum * 0.26);
      diffuseColor.rgb = mix(frostedLawn, snowyLawn, uSnow * 0.95);
      `
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
      reflectedLight.directSpecular = vec3(0.0);
      reflectedLight.indirectSpecular = vec3(0.0);
      `
    );
  };
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 320),
    groundMat,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'garden-ground';
  scene.add(ground);

  // Broad, low-color patches break up the otherwise uniform lawn without obscuring the ducks.
  const patchMaterial = new THREE.MeshStandardMaterial({ color: 0x90c96a, alphaMap:lawnMarkMask(), roughness:1, transparent: true, opacity: 0.18, depthWrite: false });
  const patchGeometry = new THREE.CircleGeometry(1, 24);
  const patchDummy = new THREE.Object3D();
  const patches = new THREE.InstancedMesh(patchGeometry, patchMaterial, 50);
  for (let i = 0; i < 50; i++) {
    const x = (rand() - 0.5) * 35;
    const z = (rand() - 0.5) * 29;
    patchDummy.position.set(x, 0.006, z);
    patchDummy.rotation.set(-Math.PI / 2, 0, rand() * TAU);
    patchDummy.scale.set(0.35 + rand() * 1.4, 0.2 + rand() * 0.9, 1);
    patchDummy.updateMatrix();
    patches.setMatrixAt(i, patchDummy.matrix);
  }
  patches.instanceMatrix.needsUpdate = true;
  patches.receiveShadow=true;
  patches.name='lawn-color-patches';
  scene.add(patches);

  // Three broad leaflets per tuft share one draw call. The central play area stays open.
  const bladeShape = new THREE.BufferGeometry();
  bladeShape.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.065, 0, 0, 0, 0.085, 0.012, 0.047, 0, 0,
    -0.018, 0, -0.04, 0.045, 0.072, -0.015, 0.065, 0, 0.035,
    -0.04, 0, 0.025, -0.023, 0.067, -0.035, 0.035, 0, -0.045,
  ], 3));
  bladeShape.computeVertexNormals();
  bladeShape.scale(.28,1,.28);
  const grassCount = 4200;
  const grassWindUniforms = { uTime: { value: 0 }, uWind: { value: 0.1 } };
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x5ea838, roughness: 0.72, side: THREE.DoubleSide, vertexColors: false });
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = grassWindUniforms.uTime;
    shader.uniforms.uWind = grassWindUniforms.uWind;
    shader.uniforms.uFrost = winterUniforms.uFrost;
    shader.uniforms.uSnow = winterUniforms.uSnow;
    shader.vertexShader = `
      uniform float uTime;
      uniform float uWind;
      varying float vBladeTip;
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float bend = clamp(transformed.y * 11.76, 0.0, 1.0);
      vBladeTip = bend;
      transformed.x += sin(uTime * 2.2 + position.x * 2.0) * bend * uWind * 0.035;
      transformed.z += cos(uTime * 1.8 + position.z * 2.5) * bend * uWind * 0.025;
      `
    );
    shader.fragmentShader = `
      uniform float uFrost;
      uniform float uSnow;
      varying float vBladeTip;
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec3 frostTip = vec3(0.85, 0.92, 0.97);
      diffuseColor.rgb = mix(diffuseColor.rgb, frostTip, smoothstep(0.12, 0.90, vBladeTip) * uFrost * 0.88);
      vec3 snowBlade = mix(vec3(0.78, 0.85, 0.93), vec3(0.94, 0.97, 1.0), vBladeTip);
      diffuseColor.rgb = mix(diffuseColor.rgb, snowBlade, uSnow * 0.92);
      `
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
      reflectedLight.directSpecular = vec3(0.0);
      reflectedLight.indirectSpecular = vec3(0.0);
      `
    );
  };
  const grass = new THREE.InstancedMesh(
    bladeShape,
    grassMat,
    grassCount,
  );
  const grassDummy = new THREE.Object3D();
  const grassColor = new THREE.Color();
  for (let i = 0; i < grassCount; i++) {
    let x = 0;
    let z = 0;
    do {
      x = (rand() - 0.5) * 37;
      z = (rand() - 0.5) * 31;
    } while (Math.hypot(x - POND.x, z - POND.z) < POND.radius + 0.35);
    const nearCentre = Math.abs(x) < 7 && Math.abs(z) < 5;
    const size = (nearCentre ? 0.55 : 0.9) * (0.6 + rand() * 0.85);
    const yaw = rand() * TAU;
    grassDummy.position.set(x, 0, z);
    grassDummy.rotation.set(0, yaw, 0);
    grassDummy.scale.setScalar(size);
    grassDummy.updateMatrix();
    grass.setMatrixAt(i, grassDummy.matrix);
    grassColor.setHSL(0.25 + rand() * 0.05, 0.34 + rand() * 0.16, 0.45 + rand() * 0.13);
    grass.setColorAt(i, grassColor);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  grass.frustumCulled = false;
  scene.add(grass);

  // Natural garden stepping stones (havefliser) leading from the bath exit shore into the lawn
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#88847c', roughness: 0.88 });
  const stonePositions = [
    { x: 1.54, z: -0.88, w: 0.38, d: 0.28, rot: 0.15 },
    { x: 1.28, z: -0.62, w: 0.34, d: 0.26, rot: -0.22 },
    { x: 1.06, z: -0.34, w: 0.36, d: 0.28, rot: 0.30 },
  ];
  for (const sp of stonePositions) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(sp.w, 0.022, sp.d), stoneMat);
    const gy = gardenGroundHeight(sp.x, sp.z);
    stone.position.set(sp.x, gy + 0.011, sp.z);
    stone.rotation.y = sp.rot;
    stone.castShadow = true;
    stone.receiveShadow = true;
    scene.add(stone);
  }

  const basin = new THREE.Group();
  basin.position.set(POND.x, 0, POND.z);
  basin.name = 'blue-shell-duck-bath';

  // Patinated duck trail (nedtrådt sti mellem andehus og muslingebassin)
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0x5a4f38, roughness: 0.98, transparent: true, opacity: 0.28, depthWrite: false,
  });
  const pathPoints = [
    new THREE.Vector3(-3.2, 0, 0.2),
    new THREE.Vector3(-2.2, 0, 0.1),
    new THREE.Vector3(-1.2, 0, -0.05),
    new THREE.Vector3(-0.2, 0, -0.15),
    new THREE.Vector3(0.5, 0, -0.25),
    new THREE.Vector3(1.06, 0, -0.34),
  ];
  const pathCurve = new THREE.CatmullRomCurve3(pathPoints);
  const pathSteps = 32;
  const pathGeo = new THREE.BufferGeometry();
  const pathPos: number[] = [], pathUvs: number[] = [], pathInd: number[] = [];
  for (let s = 0; s <= pathSteps; s++) {
    const t = s / pathSteps;
    const pt = pathCurve.getPoint(t);
    const tan = pathCurve.getTangent(t);
    const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const halfWidth = 0.22 + 0.05 * Math.sin(t * Math.PI * 4);
    const y0 = gardenGroundHeight(pt.x + norm.x * halfWidth, pt.z + norm.z * halfWidth) + 0.003;
    const y1 = gardenGroundHeight(pt.x - norm.x * halfWidth, pt.z - norm.z * halfWidth) + 0.003;
    pathPos.push(pt.x + norm.x * halfWidth, y0, pt.z + norm.z * halfWidth);
    pathPos.push(pt.x - norm.x * halfWidth, y1, pt.z - norm.z * halfWidth);
    pathUvs.push(0, t, 1, t);
    if (s < pathSteps) {
      const idx = s * 2;
      pathInd.push(idx, idx + 1, idx + 2, idx + 2, idx + 1, idx + 3);
    }
  }
  pathGeo.setAttribute('position', new THREE.Float32BufferAttribute(pathPos, 3));
  pathGeo.setAttribute('uv', new THREE.Float32BufferAttribute(pathUvs, 2));
  pathGeo.setIndex(pathInd);
  pathGeo.computeVertexNormals();
  const duckPathMesh = new THREE.Mesh(pathGeo, pathMat);
  duckPathMesh.name = 'worn-duck-path';
  duckPathMesh.receiveShadow = true;
  scene.add(duckPathMesh);

  // Sparkling morning dew droplets (morgendug på græsset)
  const dewMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const dewMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.006), dewMat, 120);
  dewMesh.name = 'morning-dew-sparkles';
  const dewDummy = new THREE.Object3D();
  for (let i = 0; i < 120; i++) {
    const gx = (rand() - 0.5) * 8.5;
    const gz = (rand() - 0.5) * 6.5;
    const gy = gardenGroundHeight(gx, gz) + 0.045 + rand() * 0.035;
    dewDummy.position.set(gx, gy, gz);
    dewDummy.rotation.set(rand() * TAU, rand() * TAU, 0);
    dewDummy.updateMatrix();
    dewMesh.setMatrixAt(i, dewDummy.matrix);
  }
  dewMesh.instanceMatrix.needsUpdate = true;
  scene.add(dewMesh);
  scene.add(basin);
  const plastic = new THREE.MeshPhysicalMaterial({
    color: 0x078fe3, roughness: 0.28, metalness: 0, clearcoat: 0.7,
    clearcoatRoughness: 0.19, side: THREE.DoubleSide,
  });
  const plasticInside = new THREE.MeshPhysicalMaterial({
    color: 0x30a9ef, roughness: 0.3, clearcoat: 0.75,
    clearcoatRoughness: 0.17, side: THREE.DoubleSide,
  });
  const wall = new THREE.Mesh(radialSurface([
    [1.14, 0.045, 0.12], [1.33, 0.07, 0.32], [1.43, 0.16, 0.65],
    [1.49, 0.32, 0.92], [1.53, POND.rimY, 1], [1.56, POND.rimY - 0.018, 1],
    [1.59, 0.34, 1], [1.52, 0.105, 0.7], [1.30, 0.025, 0.32],
  ]), plastic);
  wall.castShadow = true;
  wall.receiveShadow = true;
  basin.add(wall);
  const bottom = new THREE.Mesh(radialSurface([[0,.064,0],[1.22,.064,.3]]), plasticInside);
  bottom.receiveShadow = true;
  basin.add(bottom);

  // The raised rolled rim follows the scallops and reads as a molded plastic edge.
  const rimCurvePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 144; i++) {
    const angle = (i / 144) * TAU;
    const r = shellRadius(angle, 1.53);
    rimCurvePoints.push(new THREE.Vector3(Math.cos(angle) * r, POND.rimY - 0.009, Math.sin(angle) * r));
  }
  const rimCurve = new THREE.CatmullRomCurve3(rimCurvePoints, true, 'centripetal');
  const rim = new THREE.Mesh(
    new THREE.TubeGeometry(rimCurve, 216, 0.047, 6, true),
    new THREE.MeshPhysicalMaterial({ color: 0x1699e8, roughness: 0.22, clearcoat: 0.95 }),
  );
  rim.castShadow = true;
  basin.add(rim);

  // Shallow ribs are visible through the water, especially along the sloping inner wall.
  const ribMaterial = new THREE.MeshStandardMaterial({ color: 0x5dc0fa, roughness: 0.38, transparent: true, opacity: 0.62 });
  const ribGeometries: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 11; i++) {
    const a = -.12*Math.PI+(i/10)*1.24*Math.PI;
    const points = [
      new THREE.Vector3(Math.cos(a)*.16,.077,-.84),
      new THREE.Vector3(Math.cos(a)*.72,.078,Math.sin(a)*.60-.20),
      new THREE.Vector3(Math.cos(a) * 1.17, 0.078, Math.sin(a) * 1.17),
      new THREE.Vector3(Math.cos(a) * 1.33, 0.105, Math.sin(a) * 1.33),
      new THREE.Vector3(Math.cos(a) * shellRadius(a, 1.45, 0.75), 0.29, Math.sin(a) * shellRadius(a, 1.45, 0.75)),
    ];
    ribGeometries.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 7, 0.010, 4));
  }
  const ribs = new THREE.Mesh(mergeGeometries(ribGeometries)!, ribMaterial);
  basin.add(ribs);
  ribGeometries.forEach(geometry => geometry.dispose());

  const waterSegments = 96;
  const waterRings = 18;
  const waterPositions: number[] = [];
  const waterIndices: number[] = [];
  for (let j = 0; j <= waterRings; j++) {
    const r = (j / waterRings) * 1.42;
    for (let i = 0; i <= waterSegments; i++) {
      const a = (i / waterSegments) * TAU;
      const shellR=shellRadius(a,r,.65);
      waterPositions.push(Math.cos(a) * shellR, POND.waterY, Math.sin(a) * shellR);
    }
  }
  for (let j = 0; j < waterRings; j++) {
    for (let i = 0; i < waterSegments; i++) {
      const a = j * (waterSegments + 1) + i;
      const b = a + waterSegments + 1;
      waterIndices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const waterGeometry = new THREE.BufferGeometry();
  waterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
  waterGeometry.setIndex(waterIndices);
  waterGeometry.computeVertexNormals();
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x2eaedb, roughness: 0.04, metalness: 0.05, transparent: true,
    opacity: 0.85, side: THREE.DoubleSide, depthWrite: false,
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.name = 'duck-bath-water';
  water.receiveShadow = true;
  water.renderOrder = 1;
  basin.add(water);

  // Tynd is-bræmme langs bassinets inderkant ved hård frost og snevejr
  const iceRimGeo = radialSurface([
    [1.16, POND.waterY + 0.002, 0.55],
    [1.41, POND.waterY + 0.005, 0.65],
  ]);
  const iceRimMat = new THREE.MeshStandardMaterial({
    color: 0xe6f4ff,
    roughness: 0.25,
    metalness: 0.05,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const pondIceRim = new THREE.Mesh(iceRimGeo, iceRimMat);
  pondIceRim.name = 'pond-ice-rim';
  pondIceRim.visible = false;
  pondIceRim.renderOrder = 2;
  basin.add(pondIceRim);

  const ripplePool = Array.from({ length: 24 }, makeRippleLine);
  ripplePool.forEach(line => basin.add(line));
  const activeRipples: Ripple[] = [];
  let rippleCursor = 0;

  // A compact, enclosed garden. The camera stays below the hedge tops.
  const hillColors = [0x81b492, 0x94c5a0, 0x74a78a];
  const hills = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.78, depthWrite: false }),
    17,
  );
  for (let i = 0; i < 17; i++) {
    grassDummy.position.set(-22 + i * 2.75, -0.35, -22 - rand() * 3);
    grassDummy.rotation.set(0, 0, 0);
    grassDummy.scale.set(3.4 + rand() * 2, 1.3 + rand() * 1.8, 1.3);
    grassDummy.updateMatrix();
    hills.setMatrixAt(i, grassDummy.matrix);
    hills.setColorAt(i, new THREE.Color(hillColors[i % hillColors.length]));
  }
  hills.instanceMatrix.needsUpdate = true;
  hills.frustumCulled = false;
  scene.add(hills);
  const hedgeGeo = new THREE.IcosahedronGeometry(1, 2);
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x365f32, roughness: 1 });
  const hedgePositions: Array<[number, number, number, number]> = [];
  // Lidt lavere hæk (~1.30m) så man lettere kan se Gistrup-seværdighederne og nabohusene
  for (let x = GARDEN.minX-1.3; x <= GARDEN.maxX+1.3; x += .7) {
    hedgePositions.push([x, GARDEN.minZ-1.3, 0.58, 0.68 + rand() * 0.08]);
    hedgePositions.push([x, GARDEN.maxZ+1.3, 0.58, 0.68 + rand() * 0.08]);
  }
  for (let z = GARDEN.minZ-1.3; z <= GARDEN.maxZ+1.3; z += .7) {
    hedgePositions.push([GARDEN.minX-1.3, z, 0.58, 0.68 + rand() * 0.08]);
    hedgePositions.push([GARDEN.maxX+1.3, z, 0.58, 0.68 + rand() * 0.08]);
  }
  const hedges = new THREE.InstancedMesh(hedgeGeo, hedgeMat, hedgePositions.length);
  hedgePositions.forEach(([x, z, y, scale], i) => {
    grassDummy.position.set(x, y, z);
    grassDummy.rotation.set(rand() * 0.25, rand() * TAU, rand() * 0.25);
    grassDummy.scale.set(scale * 1.2, scale * 1.05, scale * 1.2);
    grassDummy.updateMatrix();
    hedges.setMatrixAt(i, grassDummy.matrix);
  });
  hedges.castShadow = true;
  hedges.receiveShadow = true;
  scene.add(hedges);
  hedges.name='hedge-core';
  const hedgeDetails = createHedgeDetails(hedgePositions, hedgeMat);
  scene.add(hedgeDetails);
  const treesAndHolidays = createTreesAndHolidays(scene);
  const footprints = createFootprints(scene);

  // Autentiske Gistrup-landemærker hele vejen rundt om haven
  const castle = createGistrupCastle();
  scene.add(castle.group);

  const hospital = createGistrupHospital();
  scene.add(hospital.group);

  const helicopter = createHelicopter(hospital.helipadPosition);
  scene.add(helicopter.group);

  const forest = createGistrupForest();
  scene.add(forest.group);

  const church = createGistrupChurch();
  scene.add(church.group);

  const houses = createGistrupHouses();
  scene.add(houses.group);

  // Snehætte på andehusets tag
  const roofSnowMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8fc,
    roughness: 0.78,
    metalness: 0.02,
    transparent: true,
    opacity: 0,
  });
  const roofSnowMesh = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.044, 1.92), roofSnowMat);
  roofSnowMesh.name = 'shelter-roof-snow';
  roofSnowMesh.position.set(-3.7, 1.535, -2.775);
  roofSnowMesh.visible = false;
  roofSnowMesh.receiveShadow = true;
  scene.add(roofSnowMesh);

  // Small daisies and buttercups gather mainly near the garden edges.
  const stemGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.19, 4);
  stemGeo.translate(0, 0.095, 0); // Base sits at ground level (y = 0), top at y = 0.19
  const petalGeo = new THREE.SphereGeometry(0.035, 6, 4);
  const centreGeo = new THREE.SphereGeometry(0.026, 6, 4);
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x367a36 });
  const petalColors = [0xfff8dc, 0xffe385, 0xefbfd7, 0xd6e8ff];
  const petalMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const centreMat = new THREE.MeshLambertMaterial({ color: 0xffb934 });
  const flowerCount = 55;
  const stems = new THREE.InstancedMesh(stemGeo, stemMat, flowerCount);
  const petals = new THREE.InstancedMesh(petalGeo, petalMat, flowerCount * 5);
  const centres = new THREE.InstancedMesh(centreGeo, centreMat, flowerCount);

  // Rigid hierarchical flower assembly: stem base stays anchored at y=0,
  // head and petals sit directly at stem tip and sway 100% in phase.
  const flowerRoot = new THREE.Object3D();
  const flowerStemObj = new THREE.Object3D();
  const flowerHead = new THREE.Object3D();
  const flowerCentreObj = new THREE.Object3D();
  const flowerPetalObjs: THREE.Object3D[] = [];

  flowerRoot.add(flowerStemObj);
  flowerRoot.add(flowerHead);
  flowerHead.add(flowerCentreObj);

  flowerHead.position.set(0, 0.19, 0);
  flowerCentreObj.position.set(0, 0.018, 0);

  const petalAxes: THREE.Vector3[] = [];
  const petalCos: number[] = [];
  const petalSin: number[] = [];
  for (let p = 0; p < 5; p++) {
    const angle = (p / 5) * TAU;
    petalAxes.push(new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize());
    petalCos.push(Math.cos(angle) * 0.041);
    petalSin.push(Math.sin(angle) * 0.041);
    const petalObj = new THREE.Object3D();
    petalObj.position.set(petalCos[p], 0.014, petalSin[p]);
    petalObj.scale.set(1, 0.45, 1);
    flowerHead.add(petalObj);
    flowerPetalObjs.push(petalObj);
  }

  const flowerInfo: Array<{ x: number; z: number; size: number; phase: number }> = [];
  for (let i = 0; i < 55; i++) {
    let x = 0;
    let z = 0;
    do {
      x = GARDEN.minX - 2 + rand() * (GARDEN.maxX - GARDEN.minX + 4);
      z = GARDEN.minZ - 1 + rand() * (GARDEN.maxZ - GARDEN.minZ + 2);
    } while ((Math.abs(x) < 4.3 && Math.abs(z) < 2.7) || Math.hypot(x - POND.x, z - POND.z) < POND.radius + 0.6);
    const size = 0.75 + rand() * 0.7;
    const phase = rand() * Math.PI * 2;
    flowerInfo.push({ x, z, size, phase });

    flowerRoot.position.set(x, 0, z);
    flowerRoot.rotation.set(0, 0, 0);
    flowerRoot.scale.setScalar(size);
    flowerHead.rotation.set(0, 0, 0);
    flowerRoot.updateMatrixWorld(true);

    stems.setMatrixAt(i, flowerStemObj.matrixWorld);
    centres.setMatrixAt(i, flowerCentreObj.matrixWorld);
    for (let p = 0; p < 5; p++) {
      petals.setMatrixAt(i * 5 + p, flowerPetalObjs[p].matrixWorld);
      petals.setColorAt(i * 5 + p, new THREE.Color(petalColors[i % petalColors.length]));
    }
  }
  stems.instanceMatrix.needsUpdate = true;
  stems.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.instanceMatrix.needsUpdate = true;
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  centres.instanceMatrix.needsUpdate = true;
  centres.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  stems.frustumCulled = false;
  petals.frustumCulled = false;
  centres.frustumCulled = false;
  scene.add(stems, petals, centres);

  // Visne efterårsblade der danser og flyver hen over haven i blæsevejr
  const flyingLeafGeo = new THREE.BufferGeometry();
  flyingLeafGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, -0.032, 0.038, 0, 0, 0.046, 0.012,
    -0.032, 0.038, 0, 0, 0.086, 0, 0, 0.046, 0.012,
    0, 0, 0, 0, 0.046, 0.012, 0.032, 0.038, 0,
    0.032, 0.038, 0, 0, 0.086, 0, 0, 0.046, 0.012,
  ], 3));
  flyingLeafGeo.computeVertexNormals();
  const flyingLeafMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  const flyingLeafCount = 42;
  const flyingLeaves = new THREE.InstancedMesh(flyingLeafGeo, flyingLeafMat, flyingLeafCount);
  flyingLeaves.castShadow = true;
  flyingLeaves.name = 'wind-autumn-leaves';
  scene.add(flyingLeaves);

  const leafPalette = ['#b8642a', '#c97834', '#9a471c', '#633114', '#d6943a', '#783816'];
  const leafDummy = new THREE.Object3D();
  const leafParticles = Array.from({ length: flyingLeafCount }, (_, i) => {
    flyingLeaves.setColorAt(i, new THREE.Color(leafPalette[i % leafPalette.length]));
    return {
      x: -5 + rand() * 10,
      y: 0.3 + rand() * 2.2,
      z: -4 + rand() * 8,
      vx: 0.8 + rand() * 0.9,
      vy: -0.16 - rand() * 0.22,
      rotX: rand() * Math.PI * 2,
      rotY: rand() * Math.PI * 2,
      rotZ: rand() * Math.PI * 2,
      rotSpeedX: 2.5 + rand() * 4,
      rotSpeedY: 2 + rand() * 3,
      scale: 0.65 + rand() * 0.55,
      phase: rand() * Math.PI * 2,
    };
  });
  if (flyingLeaves.instanceColor) flyingLeaves.instanceColor.needsUpdate = true;

  // Nedfaldne efterårsblade på græsplænen langs hækken og andehuset
  const fallenLeafCount = 140;
  const fallenLeaves = new THREE.InstancedMesh(flyingLeafGeo, flyingLeafMat, fallenLeafCount);
  fallenLeaves.name = 'fallen-autumn-leaves';
  fallenLeaves.receiveShadow = true;
  scene.add(fallenLeaves);

  const fallenLeafPalette = ['#7a3512', '#9c4819', '#58270e', '#ba6b29', '#46200a', '#853e16', '#a85a21'];
  const leafDummyFallen = new THREE.Object3D();
  for (let i = 0; i < fallenLeafCount; i++) {
    let lx = 0, lz = 0;
    const roll = rand();
    if (roll < 0.6) {
      const side = Math.floor(rand() * 4);
      if (side === 0) { lx = GARDEN.minX + rand() * (GARDEN.maxX - GARDEN.minX); lz = GARDEN.minZ + 0.2 + rand() * 1.4; }
      else if (side === 1) { lx = GARDEN.minX + rand() * (GARDEN.maxX - GARDEN.minX); lz = GARDEN.maxZ - 0.2 - rand() * 1.4; }
      else if (side === 2) { lx = GARDEN.minX + 0.2 + rand() * 1.4; lz = GARDEN.minZ + rand() * (GARDEN.maxZ - GARDEN.minZ); }
      else { lx = GARDEN.maxX - 0.2 - rand() * 1.4; lz = GARDEN.minZ + rand() * (GARDEN.maxZ - GARDEN.minZ); }
    } else if (roll < 0.85) {
      lx = SHELTER.minX - 0.6 + rand() * (SHELTER.maxX - SHELTER.minX + 1.2);
      lz = SHELTER.back - 0.6 + rand() * (SHELTER.front - SHELTER.back + 1.2);
    } else {
      lx = GARDEN.minX + 1 + rand() * (GARDEN.maxX - GARDEN.minX - 2);
      lz = GARDEN.minZ + 1 + rand() * (GARDEN.maxZ - GARDEN.minZ - 2);
    }
    if (Math.hypot(lx - POND.x, lz - POND.z) < POND.radius + 0.35) {
      lx += (lx > POND.x ? 1 : -1) * 1.2;
    }
    const gy = gardenGroundHeight(lx, lz);
    leafDummyFallen.position.set(lx, gy + 0.005 + rand() * 0.005, lz);
    leafDummyFallen.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.25, (rand() - 0.5) * 0.25, rand() * Math.PI * 2);
    leafDummyFallen.scale.setScalar(0.7 + rand() * 0.55);
    leafDummyFallen.updateMatrix();
    fallenLeaves.setMatrixAt(i, leafDummyFallen.matrix);
    fallenLeaves.setColorAt(i, new THREE.Color(fallenLeafPalette[i % fallenLeafPalette.length]));
  }
  fallenLeaves.instanceMatrix.needsUpdate = true;
  if (fallenLeaves.instanceColor) fallenLeaves.instanceColor.needsUpdate = true;

  // Weather supplies the cloud tint; ground bounce must not turn undersides green.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.77, depthWrite: false });
  const cloudGeo = new THREE.SphereGeometry(1, 12, 8);
  const cloudParts: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; cluster: number; speed: number }> = [];
  // Skyhøjt felt (y = 32 til 44m), så skyerne svæver højt på himlen og aldrig driver foran kirketårnet eller andre bygninger
  const cloudBaseY = 32;
  const cloudSpanY = 12;
  for (let c = 0; c < 36; c++) {
    const origin = -70 + (c % 6) * 28 + (rand() - .5) * 8;
    const y = cloudBaseY + rand() * cloudSpanY;
    const z = -70 + Math.floor(c / 6) * 28 + (rand() - .5) * 8;
    const speed = 0.22 + rand() * 0.16;
    const puffs = 3 + Math.floor(rand() * 3);
    for (let p = 0; p < puffs; p++) {
      cloudParts.push({
        x: origin + (p - (puffs - 1) / 2) * 2.5, y: y + rand() * 0.5, z: z + rand() * 0.6,
        sx: 2.8 + rand() * 1.6, sy: 1.4 + rand() * 0.7, sz: 2.2 + rand() * 1.1,
        cluster: origin, speed,
      });
    }
  }
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, cloudParts.length);
  clouds.name='drifting-clouds';
  clouds.frustumCulled = false;
  scene.add(clouds);

  const rainCount = 900;
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = (rand() - 0.5) * 19;
    rainPositions[i * 3 + 1] = rand() * 8;
    rainPositions[i * 3 + 2] = (rand() - 0.5) * 14;
  }
  const rainGeometry = new THREE.BufferGeometry();
  const rainLines=new Float32Array(rainCount*6);
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainLines, 3));
  const rainMaterial = new THREE.LineBasicMaterial({ color: 0xd8eeff, transparent: true, opacity: 0.43, depthWrite: false });
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial);rain.name='weather-rain';
  rain.visible = false;
  rain.frustumCulled = false;
  scene.add(rain);
  const rainImpacts=createRainImpacts(scene);
  const contactShadows=createContactShadows(scene);

  // Dalende snefnug (bløde svævende snefnug i 3D-rummet)
  const snowCount = 720;
  const snowPositions = new Float32Array(snowCount * 3);
  const snowPhases = new Float32Array(snowCount);
  const snowSpeeds = new Float32Array(snowCount);
  for (let i = 0; i < snowCount; i++) {
    snowPositions[i * 3] = (rand() - 0.5) * 20;
    snowPositions[i * 3 + 1] = rand() * 8.2;
    snowPositions[i * 3 + 2] = (rand() - 0.5) * 15;
    snowPhases[i] = rand() * TAU;
    snowSpeeds[i] = 0.65 + rand() * 0.55;
  }
  const snowGeometry = new THREE.BufferGeometry();
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  const snowMaterial = new THREE.PointsMaterial({
    color: 0xf7fbff,
    size: 0.052,
    map: createDropletTexture(),
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  const snow = new THREE.Points(snowGeometry, snowMaterial);
  snow.name = 'weather-snow';
  snow.visible = false;
  snow.frustumCulled = false;
  scene.add(snow);

  const waterContains=(x:number,z:number)=>{
    const dx=x-POND.x,dz=z-POND.z;
    return Math.hypot(dx,dz)<shellRadius(Math.atan2(dz,dx),1.40);
  };

  let weather: Weather = { cloud: 10, wind: 1.5, rain: 0, frost: 0, snow: 0, isDay: true };
  let daylight = 1;
  let solarPhase = 0.5;
  let elapsed = 0;
  let weatherInitialized = false;
  let lowQuality = false;
  let waterStep = 0;
  let currentFrost = 0;
  let currentSnow = 0;
  let targetFrost = 0;
  let targetSnow = 0;
  const targetSky = skyDay.clone();
  const targetSunColor = new THREE.Color(0xfff2d1);
  const targetWaterColor = new THREE.Color(0x68cdef);
  let targetHemi = hemi.intensity;
  let targetSun = sun.intensity;
  let targetCloudOpacity = cloudMat.opacity;
  const targetCloudColor=new THREE.Color();

  function setWeather(next: Weather): void {
    weather = {
      cloud: THREE.MathUtils.clamp(next.cloud, 0, 100),
      wind: Math.max(0, next.wind),
      rain: Math.max(0, next.rain),
      frost: THREE.MathUtils.clamp(next.frost ?? 0, 0, 1),
      snow: THREE.MathUtils.clamp(next.snow ?? 0, 0, 1),
      isDay: next.isDay,
    };
    targetFrost = weather.frost ?? 0;
    targetSnow = weather.snow ?? 0;
    const cloudiness = weather.cloud / 100;
    const rainFactor = Math.min(1, weather.rain / 2);
    const snowFactor = targetSnow;
    sky.set(daylight, cloudiness, sun.position, Math.max(rainFactor, snowFactor * 0.65));
    targetSky.copy(skyDay).lerp(skyOvercast, Math.min(1, cloudiness * 0.75 + rainFactor * 0.35 + snowFactor * 0.45)).lerp(skyNight, 1 - daylight);
    // Overcast diffuse skylight wraps around garden & ducks evenly, keeping them crisp and colorful
    const baseHemi = 2.10 - cloudiness * 0.06 + rainFactor * 0.15 + snowFactor * 0.25;
    targetHemi = THREE.MathUtils.lerp(.50, baseHemi, daylight);
    // Direct sun is softened and attenuated during clouds & rain
    targetSun = THREE.MathUtils.lerp(.16, Math.max(0.55, (2.85 - cloudiness * 1.80) * (1 - Math.max(rainFactor, snowFactor * 0.65) * 0.65)), daylight);
    targetSunColor.set(daylight > .8 ? (targetFrost > 0.3 || targetSnow > 0.3 ? 0xf2f7ff : 0xfff5e0) : daylight > .1 ? 0xffc48e : 0xa8bde2);
    targetCloudOpacity = THREE.MathUtils.lerp(0.22, 0.72 + cloudiness * 0.22, daylight);
    targetCloudColor.set(0xffffff).lerp(new THREE.Color(0x4a5866), Math.min(0.92, cloudiness * 0.45 + rainFactor * 0.5));
    targetCloudColor.lerp(new THREE.Color(0x121822), 1 - daylight);
    const upperCloudColor = new THREE.Color(0xffffff).lerp(new THREE.Color(0x9cb2c8), Math.min(1, cloudiness * 0.5 + rainFactor * 0.45)).lerp(new THREE.Color(0x151d28), 1 - daylight);
    const lowerCloudColor = new THREE.Color(0xc0d0e0).lerp(new THREE.Color(0x35404d), Math.min(1, cloudiness * 0.7 + rainFactor * 0.5)).lerp(new THREE.Color(0x0a0f16), 1 - daylight);
    for (let i = 0; i < cloudParts.length; i++) {
      const part = cloudParts[i];
      const relY = THREE.MathUtils.clamp((part.y - cloudBaseY) / cloudSpanY, 0, 1);
      const col = lowerCloudColor.clone().lerp(upperCloudColor, relY);
      clouds.setColorAt(i, col);
    }
    if (clouds.instanceColor) clouds.instanceColor.needsUpdate = true;

    // Bakker i horisonten får rim eller snedække
    const hillSnowTint = new THREE.Color(0xeaf2fa);
    const hillFrostTint = new THREE.Color(0xc2d8cf);
    for (let i = 0; i < 17; i++) {
      const col = new THREE.Color(hillColors[i % hillColors.length]);
      if (targetFrost > 0.01) col.lerp(hillFrostTint, targetFrost * 0.65);
      if (targetSnow > 0.01) col.lerp(hillSnowTint, targetSnow * 0.92);
      hills.setColorAt(i, col);
    }
    if (hills.instanceColor) hills.instanceColor.needsUpdate = true;

    targetWaterColor.set(weather.isDay ? (targetSnow > 0.3 || targetFrost > 0.4 ? 0x268cb8 : 0x2eaedb) : 0x245b7a);
    const qScale = lowQuality ? 0.5 : 1.0;
    rain.visible = weather.rain > 0 && targetSnow < 0.25;
    rainGeometry.setDrawRange(0, Math.min(rainCount, Math.round((160 + weather.rain * 320) * qScale)) * 2);
    snow.visible = targetSnow > 0.05;
    snowGeometry.setDrawRange(0, Math.min(snowCount, Math.round((180 + targetSnow * 540) * qScale)));
    if (!weatherInitialized) {
      (scene.background as THREE.Color).copy(targetSky);
      fog.color.copy(targetSky);
      hemi.intensity = targetHemi;
      sun.intensity = targetSun;
      sun.color.copy(targetSunColor);
      cloudMat.opacity = targetCloudOpacity;
      cloudMat.color.copy(targetCloudColor);
      waterMaterial.color.copy(targetWaterColor);
      currentFrost = targetFrost;
      currentSnow = targetSnow;
      winterUniforms.uFrost.value = currentFrost;
      winterUniforms.uSnow.value = currentSnow;
      hedgeDetails.setWinterWeather(currentFrost, currentSnow);
      treesAndHolidays.setWeather(currentFrost, currentSnow, daylight);
      castle.setWinterWeather(currentSnow, currentFrost);
      hospital.setWinterWeather(currentSnow, currentFrost);
      forest.setWinterWeather(currentSnow, currentFrost);
      church.setWinterWeather(currentSnow, currentFrost);
      houses.setWinterWeather(currentSnow, currentFrost);
      weatherInitialized = true;
      sky.update(1, 0);
    }
  }

  function ripple(x: number, z: number, strength = 1): void {
    if (Math.hypot(x - POND.x, z - POND.z) > POND.radius) return;
    const line = ripplePool[rippleCursor];
    rippleCursor = (rippleCursor + 1) % ripplePool.length;
    const existing = activeRipples.findIndex(item => item.line === line);
    if (existing >= 0) activeRipples.splice(existing, 1);
    activeRipples.push({ x: x - POND.x, z: z - POND.z, start: elapsed, strength: THREE.MathUtils.clamp(strength, 0.2, 2), line });
    line.visible = true;
  }

  function createDropletTexture(): THREE.Texture {
    if (typeof document === 'undefined') {
      const size = 8;
      const data = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = (x + 0.5 - size / 2) / (size / 2);
          const dy = (y + 0.5 - size / 2) / (size / 2);
          const d = Math.hypot(dx, dy);
          const a = Math.max(0, Math.min(255, Math.floor((1 - d) * 255)));
          const idx = (y * size + x) * 4;
          data[idx] = 230; data[idx + 1] = 245; data[idx + 2] = 255;
          data[idx + 3] = d <= 1 ? a : 0;
        }
      }
      const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
      texture.needsUpdate = true;
      return texture;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(220, 245, 255, 0.95)');
    grad.addColorStop(0.7, 'rgba(170, 225, 250, 0.45)');
    grad.addColorStop(1, 'rgba(140, 210, 245, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // Dynamiske vandstænk og dråber ved plask, dyk og fjer-ryst
  const splashMax = 320;
  const splashPositions = new Float32Array(splashMax * 3);
  const splashColors = new Float32Array(splashMax * 3);
  const splashGeo = new THREE.BufferGeometry();
  splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3));
  splashGeo.setAttribute('color', new THREE.BufferAttribute(splashColors, 3));
  const splashMat = new THREE.PointsMaterial({
    size: 0.020, // Realistisk fin dråbestørrelse i stedet for store klumper
    map: createDropletTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const splashPoints = new THREE.Points(splashGeo, splashMat);
  splashPoints.name = 'pond-water-splashes';
  splashPoints.frustumCulled = false;
  scene.add(splashPoints);

  interface SplashDrop {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    age: number;
    life: number;
    active: boolean;
  }
  const splashPool: SplashDrop[] = Array.from({ length: splashMax }, () => ({
    x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, age: 1, life: 1, active: false,
  }));
  let splashCursor = 0;

  function splash(
    x: number,
    y: number,
    z: number,
    count = 14,
    speed = 1.2,
    spread = 0.45,
    options?: {
      vx?: number;
      vy?: number;
      vz?: number;
      directionAngle?: number;
      arcWidth?: number;
      upwardBias?: number;
      life?: number;
    }
  ): void {
    const baseVx = options?.vx ?? 0;
    const baseVz = options?.vz ?? 0;
    const upwardBias = options?.upwardBias ?? 1.0;
    const hasDirection = options?.directionAngle !== undefined;
    const dirAngle = options?.directionAngle ?? 0;
    const arc = options?.arcWidth ?? Math.PI * 0.6;

    for (let c = 0; c < count; c++) {
      const drop = splashPool[splashCursor];
      splashCursor = (splashCursor + 1) % splashMax;

      const angle = hasDirection
        ? dirAngle + (rand() - 0.5) * arc
        : (c / count) * TAU + (rand() - 0.5) * 0.6;

      const radialSpeed = (0.35 + rand() * 0.65) * speed * spread;
      drop.x = x + (rand() - 0.5) * 0.03;
      drop.y = y + (rand() - 0.5) * 0.02;
      drop.z = z + (rand() - 0.5) * 0.03;

      drop.vx = Math.cos(angle) * radialSpeed + baseVx * 0.55;
      drop.vy = (0.22 + rand() * 0.85) * speed * upwardBias + (options?.vy ?? 0) * 0.4;
      drop.vz = Math.sin(angle) * radialSpeed + baseVz * 0.55;

      drop.age = 0;
      drop.life = options?.life ?? (0.22 + rand() * 0.22);
      drop.active = true;
    }
  }

  function update(time: number, dt: number): void {
    if (time < elapsed) {
      activeRipples.forEach(active => { active.line.visible = false; });
      activeRipples.length = 0;
    }
    elapsed = time;
    const weatherBlend = 1 - Math.exp(-Math.max(0, dt) * 1.3);
    sky.update(weatherBlend, time);
    (scene.background as THREE.Color).lerp(targetSky, weatherBlend);
    fog.color.copy(scene.background as THREE.Color);
    hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, targetHemi, weatherBlend);
    sun.intensity = THREE.MathUtils.lerp(sun.intensity, targetSun, weatherBlend);
    sun.color.lerp(targetSunColor, weatherBlend);
    cloudMat.opacity = THREE.MathUtils.lerp(cloudMat.opacity, targetCloudOpacity, weatherBlend);
    cloudMat.color.lerp(targetCloudColor,weatherBlend);
    rainImpacts.update(Math.max(0,dt),daylight,waterContains);
    waterMaterial.color.lerp(targetWaterColor, weatherBlend);
    nightSky.update(weather.cloud,weatherBlend);
    currentFrost = THREE.MathUtils.lerp(currentFrost, targetFrost, weatherBlend);
    currentSnow = THREE.MathUtils.lerp(currentSnow, targetSnow, weatherBlend);
    winterUniforms.uFrost.value = currentFrost;
    winterUniforms.uSnow.value = currentSnow;
    hedgeDetails.setWinterWeather(currentFrost, currentSnow);
    treesAndHolidays.setWeather(currentFrost, currentSnow, daylight);
    treesAndHolidays.update(time);

    const wind = Math.min(weather.wind, 20);

    castle.setWinterWeather(currentSnow, currentFrost);
    hospital.setWinterWeather(currentSnow, currentFrost);
    forest.setWinterWeather(currentSnow, currentFrost);
    church.setWinterWeather(currentSnow, currentFrost);
    houses.setWinterWeather(currentSnow, currentFrost);

    castle.update(dt);
    hospital.update(dt);
    helicopter.update(dt);
    forest.update(time, wind, dt);
    church.update(dt);
    houses.update(time, wind, dt);

    const roofSnowAmount = THREE.MathUtils.clamp(currentSnow * 0.96 + currentFrost * 0.18, 0, 1);
    roofSnowMesh.visible = roofSnowAmount > 0.04;
    roofSnowMat.opacity = roofSnowAmount;

    const iceRimAmount = THREE.MathUtils.clamp(currentSnow * 0.78 + currentFrost * 0.55, 0, 0.85);
    pondIceRim.visible = iceRimAmount > 0.05;
    iceRimMat.opacity = iceRimAmount;

    hedgeDetails.update(time, dt, wind);
    const sway = Math.min(wind / 15, 0.55);
    grassWindUniforms.uTime.value = time;
    grassWindUniforms.uWind.value = sway;
    const morningDew = daylight > 0.05 ? THREE.MathUtils.clamp((0.35 - solarPhase) / 0.35, 0, 1) * Math.min(1, daylight * 1.8) : 0;
    const sparkle = Math.max(morningDew, currentFrost * 0.92, currentSnow * 0.65);
    dewMesh.visible = sparkle > 0.04;
    dewMat.opacity = sparkle * 0.82;

    // Sommerblomster skjules under sne og hård frost, og nedfaldne blade dækkes ved dyb sne
    const showFlowers = currentSnow < 0.25 && currentFrost < 0.45;
    stems.visible = showFlowers;
    petals.visible = showFlowers;
    centres.visible = showFlowers;
    fallenLeaves.visible = currentSnow < 0.70;

    // Blomster svajer i vinden - stængel og blomsterhoved er 100% fasesynkrone,
    // og kronbladene blafrer og folder sig organisk sammen fra bunden af hovedet i vindstød.
    const flowerSway = Math.min(wind / 14, 0.35);
    const windLean = -Math.min(wind / 20, 0.20);
    for (let i = 0; i < 55; i++) {
      const fInfo = flowerInfo[i];
      const gust = Math.sin(time * (1.6 + wind * 0.14) + fInfo.phase);
      const crossGust = Math.cos(time * (1.2 + wind * 0.09) + fInfo.phase * 1.3);
      const tiltZ = windLean - flowerSway * (0.55 + 0.45 * gust);
      const tiltX = flowerSway * 0.28 * crossGust;

      flowerRoot.position.set(fInfo.x, 0, fInfo.z);
      flowerRoot.rotation.set(tiltX, 0, tiltZ);
      flowerRoot.scale.setScalar(fInfo.size);
      flowerHead.rotation.set(tiltX * 0.22, 0, tiltZ * 0.22);

      // Kronblade folder sig let sammen fra bunden af blomsterhovedet under vindpres,
      // med asynkron, kaotisk blafren på hvert enkelt blad.
      const bendStrength = Math.hypot(tiltZ, tiltX);
      for (let p = 0; p < 5; p++) {
        const petalSeed = fInfo.phase * 3.7 + p * 1.57;
        const flutter = Math.sin(time * (6.5 + wind * 0.9) + petalSeed) * 0.08 * Math.min(wind / 6, 1);
        const baseFold = (bendStrength / 0.42) * (0.24 + 0.20 * Math.sin(time * 3.1 + petalSeed));
        const phi = Math.max(0, Math.min(0.68, baseFold + flutter));
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        const petalObj = flowerPetalObjs[p];
        petalObj.position.set(petalCos[p] * cosPhi, 0.014 + 0.041 * sinPhi, petalSin[p] * cosPhi);
        petalObj.quaternion.setFromAxisAngle(petalAxes[p], phi);
      }

      flowerRoot.updateMatrixWorld(true);

      stems.setMatrixAt(i, flowerStemObj.matrixWorld);
      centres.setMatrixAt(i, flowerCentreObj.matrixWorld);
      for (let p = 0; p < 5; p++) {
        petals.setMatrixAt(i * 5 + p, flowerPetalObjs[p].matrixWorld);
      }
    }
    stems.instanceMatrix.needsUpdate = true;
    petals.instanceMatrix.needsUpdate = true;
    centres.instanceMatrix.needsUpdate = true;

    // Flyvende visne blade kræver mærkbar blæst/vindstød for at løfte sig fra jorden (fra ca. 5.5-6 m/s).
    // Ved let brise (som f.eks. 4 m/s) fyger blade ikke rundt; haven er rolig.
    const activeLeafCount = currentSnow > 0.35 ? 0 : Math.floor(THREE.MathUtils.clamp((weather.wind - 5.5) * 4.5, 0, flyingLeafCount));
    flyingLeaves.visible = activeLeafCount > 0;
    if (flyingLeaves.visible) {
      const leafSpeed = 0.5 + (weather.wind - 5.0) * 0.45;
      for (let i = 0; i < flyingLeafCount; i++) {
        if (i >= activeLeafCount) {
          leafDummy.position.set(0, -10, 0);
          leafDummy.scale.setScalar(0);
          leafDummy.updateMatrix();
          flyingLeaves.setMatrixAt(i, leafDummy.matrix);
          continue;
        }
        const lp = leafParticles[i];
        lp.x += dt * (leafSpeed * lp.vx + Math.sin(time * 2.5 + lp.phase) * 0.25);
        lp.z += dt * (leafSpeed * 0.25 + Math.cos(time * 2.0 + lp.phase) * 0.35);
        lp.y += dt * (lp.vy + Math.sin(time * 3.2 + lp.phase) * 0.18);
        lp.rotX += dt * lp.rotSpeedX * 0.7;
        lp.rotY += dt * lp.rotSpeedY * 0.7;

        const groundY = gardenGroundHeight(lp.x, lp.z);
        if (lp.x > GARDEN.maxX + 1.2 || lp.z > GARDEN.maxZ + 1.2 || lp.y < groundY + 0.015) {
          lp.x = GARDEN.minX - 0.8 - (rand() * 2);
          lp.z = GARDEN.minZ - 1 + rand() * (GARDEN.maxZ - GARDEN.minZ + 2);
          lp.y = 0.6 + rand() * 1.8;
        }
        leafDummy.position.set(lp.x, lp.y, lp.z);
        leafDummy.rotation.set(lp.rotX, lp.rotY, lp.rotZ);
        leafDummy.scale.setScalar(lp.scale);
        leafDummy.updateMatrix();
        flyingLeaves.setMatrixAt(i, leafDummy.matrix);
      }
      flyingLeaves.instanceMatrix.needsUpdate = true;
    }

    const cloudWrapSpan = 160;
    const cloudHalfSpan = cloudWrapSpan / 2; // 80
    cloudParts.forEach((part, i) => {
      const centre = ((part.cluster + cloudHalfSpan + time * part.speed) % cloudWrapSpan + cloudWrapSpan) % cloudWrapSpan - cloudHalfSpan;
      const drift = centre - part.cluster;
      grassDummy.position.set(part.x + drift, part.y, part.z);
      grassDummy.rotation.set(0, 0, 0);
      // Fade at the distant wrap boundary so a cluster never visibly jumps.
      const coverage = (1 + weather.cloud / 100 * 1.9) * (1 - THREE.MathUtils.smoothstep(Math.abs(centre), 68, 80));
      grassDummy.scale.set(part.sx * coverage, part.sy, part.sz * coverage);
      grassDummy.updateMatrix();
      clouds.setMatrixAt(i, grassDummy.matrix);
    });
    clouds.instanceMatrix.needsUpdate = true;

    if (!lowQuality || (waterStep++ & 1) === 0 || activeRipples.length > 0) {
      const positions = waterGeometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        let y = POND.waterY + 0.006 * Math.sin(x * 8 + time * 2.1) * Math.cos(z * 7 - time * 1.7);
        for (const active of activeRipples) {
          const age = time - active.start;
          if (age < 0 || age > 2.3) continue;
          const distance = Math.hypot(x - active.x, z - active.z);
          const wavefront = age * 0.65;
          const envelope = Math.exp(-((distance - wavefront) ** 2) / 0.035) * (1 - age / 2.3);
          y += 0.024 * active.strength * envelope * Math.sin((distance - wavefront) * 26);
        }
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
      waterGeometry.computeVertexNormals();
    }

    for (let i = activeRipples.length - 1; i >= 0; i--) {
      const active = activeRipples[i];
      const age = time - active.start;
      if (age > 2.2) {
        active.line.visible = false;
        activeRipples.splice(i, 1);
        continue;
      }
      const radius = 0.05 + age * 0.62;
      const linePositions = active.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let j = 0; j < 64; j++) {
        const a = (j / 64) * TAU;
        linePositions.setXYZ(j, active.x + Math.cos(a) * radius, POND.waterY + 0.003 + 0.008 * active.strength * (1 - age / 2.2), active.z + Math.sin(a) * radius);
      }
      linePositions.needsUpdate = true;
      const material = active.line.material as THREE.LineBasicMaterial;
      material.opacity = Math.max(0, 0.70 * (1 - age / 2.2) * active.strength);
      active.line.visible = radius + Math.hypot(active.x, active.z) < 1.43;
    }

    let activeSplashes = 0;
    const splashPosAttr = splashGeo.getAttribute('position') as THREE.BufferAttribute;
    const splashColAttr = splashGeo.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < splashMax; i++) {
      const drop = splashPool[i];
      if (!drop.active) {
        splashPositions[i * 3 + 1] = -10;
        continue;
      }
      drop.age += dt;
      if (drop.age >= drop.life) {
        drop.active = false;
        splashPositions[i * 3 + 1] = -10;
        continue;
      }
      const drag = Math.exp(-4.5 * dt);
      drop.vx *= drag;
      drop.vz *= drag;
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.z += drop.vz * dt;
      drop.vy -= 9.5 * dt;
      const groundAtDrop = waterContains(drop.x, drop.z) ? POND.waterY : gardenGroundHeight(drop.x, drop.z);
      if (drop.y <= groundAtDrop && drop.vy < 0) {
        drop.active = false;
        splashPositions[i * 3 + 1] = -10;
        continue;
      }
      activeSplashes++;
      splashPositions[i * 3] = drop.x;
      splashPositions[i * 3 + 1] = drop.y;
      splashPositions[i * 3 + 2] = drop.z;
      const progress = drop.age / drop.life;
      const alpha = Math.max(0, 1 - progress * progress);
      splashColors[i * 3] = 0.88 * alpha;
      splashColors[i * 3 + 1] = 0.96 * alpha;
      splashColors[i * 3 + 2] = 1.0 * alpha;
    }
    splashPosAttr.needsUpdate = true;
    splashColAttr.needsUpdate = true;
    splashPoints.visible = activeSplashes > 0;

    if (rain.visible) {
      const rainSpeed = 5 + Math.min(weather.rain, 30) * 0.1;
      for (let i = 0; i < rainCount; i++) {
        const yIndex = i * 3 + 1;
        rainPositions[yIndex] -= dt * rainSpeed;
        rainPositions[i * 3] += dt * wind * 0.075;
        const x=rainPositions[i*3],z=rainPositions[i*3+2];
        const roof=x>SHELTER.minX-.09&&x<SHELTER.maxX+.09&&z>SHELTER.back-.085&&z<SHELTER.front+.085;
        const water=waterContains(x,z);
        const dx=x-POND.x,dz=z-POND.z;
        const rim=!water&&Math.hypot(dx,dz)<shellRadius(Math.atan2(dz,dx),1.65);
        const impactY=roof?1.525:water?POND.waterY:rim?POND.rimY:gardenGroundHeight(x,z);
        if (rainPositions[yIndex] < impactY+.015) {
          if(i<rainGeometry.drawRange.count/2&&x>GARDEN.minX&&x<GARDEN.maxX&&z>GARDEN.minZ&&z<GARDEN.maxZ)
            rainImpacts.hit(x,impactY,z,water&&!roof);
          rainPositions[yIndex] = 7.5 + rand();
          rainPositions[i * 3] = (rand() - 0.5) * 19;
          rainPositions[i * 3+2] = (rand() - 0.5) * 14;
        }
      }
      for(let i=0;i<rainCount;i++){
        const p=i*3,k=i*6;
        rainLines[k]=rainPositions[p];rainLines[k+1]=rainPositions[p+1];rainLines[k+2]=rainPositions[p+2];
        rainLines[k+3]=rainPositions[p]-wind*.003;rainLines[k+4]=rainPositions[p+1]+.075;rainLines[k+5]=rainPositions[p+2];
      }
      rainGeometry.attributes.position.needsUpdate = true;
      rainMaterial.opacity = Math.min(0.6, 0.30 + weather.rain * 0.08);
    }

    if (snow.visible) {
      const activeSnowCount = Math.min(snowCount, Math.round(180 + Math.max(currentSnow, targetSnow) * 540));
      for (let i = 0; i < activeSnowCount; i++) {
        const idx = i * 3;
        const phase = snowPhases[i];
        const fallSpeed = snowSpeeds[i] * (0.62 + Math.min(wind, 8) * 0.04);
        snowPositions[idx + 1] -= dt * fallSpeed;
        snowPositions[idx] += dt * (wind * 0.06 + Math.sin(time * 1.35 + phase) * 0.28);
        snowPositions[idx + 2] += dt * Math.cos(time * 1.1 + phase * 1.3) * 0.22;

        const x = snowPositions[idx];
        const z = snowPositions[idx + 2];
        const roof = x > SHELTER.minX - 0.09 && x < SHELTER.maxX + 0.09 && z > SHELTER.back - 0.085 && z < SHELTER.front + 0.085;
        const groundY = roof ? 1.54 : waterContains(x, z) ? POND.waterY : gardenGroundHeight(x, z);
        if (snowPositions[idx + 1] < groundY + 0.02 || Math.abs(x) > 11 || Math.abs(z) > 8.5) {
          snowPositions[idx] = (rand() - 0.5) * 20;
          snowPositions[idx + 1] = 7.2 + rand() * 1.4;
          snowPositions[idx + 2] = (rand() - 0.5) * 15;
        }
      }
      snowGeometry.attributes.position.needsUpdate = true;
      snowMaterial.opacity = THREE.MathUtils.clamp(0.45 + Math.max(currentSnow, targetSnow) * 0.48, 0.35, 0.92);
    }
  }

  setWeather(weather);
  update(0, 0);
  function setDaylight(light:number,phase:number){
    daylight=THREE.MathUtils.clamp(light,0,1);
    solarPhase=phase;
    sun.position.set(-Math.cos(phase*Math.PI)*8,Math.max(1,Math.sin(phase*Math.PI)*10),4);
    setWeather({...weather,isDay:daylight>.3});
    const solarAltDeg = daylight > 0.05 ? THREE.MathUtils.lerp(-4, 52, Math.sin(solarPhase * Math.PI) * daylight) : -18;
    castle.setDaylight(solarAltDeg);
    hospital.setDaylight(solarAltDeg);
    helicopter.setDaylight(solarAltDeg);
    forest.setDaylight(solarAltDeg);
    church.setDaylight(solarAltDeg);
    houses.setDaylight(solarAltDeg);
  }
  function setSkyDate(date: Date) {
    nightSky.setDate(date);
    hedgeDetails.setDate(date);
    treesAndHolidays.setDate(date);
    castle.setDate(date);
    hospital.setDate(date);
    forest.setDate(date);
    church.setDate(date);
    houses.setDate(date);
  }
  function setLowQuality(low: boolean) {
    if (lowQuality === low) return;
    lowQuality = low;
    grass.count = low ? Math.floor(grassCount * 0.55) : grassCount;
    hedges.castShadow = !low;
    hedges.receiveShadow = !low;
    hedgeDetails.setLowQuality(low);
    setWeather(weather);
  }
  return {
    ground,
    update,
    ripple,
    splash,
    setWeather,
    setDaylight,
    setSkyDate,
    setLowQuality,
    setShelterDoor: shelter.setDoor,
    updateContactShadows: contactShadows.update,
    updateFootprints: (ducks, dt) => footprints.update(ducks, currentFrost, currentSnow, dt),
    helicopter,
    triggerHelicopter: () => helicopter.trigger(),
  };
}
