import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GARDEN, POND } from './types';
import { createShelter, SHELTER, gardenGroundHeight } from './shelter';
import { createSky } from './sky';
import { createRainImpacts } from './rain-impacts';

type Weather = { cloud: number; wind: number; rain: number; isDay: boolean };
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
  setWeather(weather: Weather): void;
  setDaylight(light: number, phase: number): void;
  setShelterDoor(closed:number):void;
} {
  const rand = random(75129);
  const shelter=createShelter(scene);
  const skyDay = new THREE.Color(0x9edaf0);
  const skyOvercast = new THREE.Color(0xb9c8cc);
  const skyNight = new THREE.Color(0x182c49);
  scene.background = skyDay.clone();
  const fog = new THREE.Fog(skyDay.clone(), 19, 56);
  scene.fog = fog;
  const sky=createSky(scene);

  // Distant points belong to the sky, so local garden fog must not erase them.
  const starRandom=random(9260),starPositions:number[]=[],starColors:number[]=[];
  for(let i=0;i<550;i++){
    const elevation=.10+starRandom()*.90,azimuth=starRandom()*TAU;
    const horizontal=Math.sqrt(1-elevation*elevation)*65;
    starPositions.push(Math.cos(azimuth)*horizontal,elevation*65,Math.sin(azimuth)*horizontal);
    const brightness=.45+starRandom()*.55;
    starColors.push(brightness*.90,brightness*.95,brightness);
  }
  const starGeometry=new THREE.BufferGeometry();
  starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
  starGeometry.setAttribute('color',new THREE.Float32BufferAttribute(starColors,3));
  const starPixels=new Uint8Array(32*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const index=(y*32+x)*4,r=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5);
    starPixels[index]=starPixels[index+1]=starPixels[index+2]=255;
    starPixels[index+3]=Math.round(255*(1-THREE.MathUtils.smoothstep(r,.12,.95)));
  }
  const starMap=new THREE.DataTexture(starPixels,32,32);starMap.needsUpdate=true;
  starMap.magFilter=starMap.minFilter=THREE.LinearFilter;
  const starMaterial=new THREE.PointsMaterial({size:2.8,sizeAttenuation:false,map:starMap,vertexColors:true,
    transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false});
  const stars=new THREE.Points(starGeometry,starMaterial);stars.name='night-stars';stars.renderOrder=-2;scene.add(stars);

  const hemi = new THREE.HemisphereLight(0xdff6ff, 0x80a565, 2.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d1, 2.6);
  sun.position.set(-5, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
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

  // Its upper face is exactly y=0, so ground raycasts stay consistent with duck movement.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ color: 0x7ebe5c, roughness: 0.97 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'garden-ground';
  scene.add(ground);

  // Broad, low-color patches break up the otherwise uniform lawn without obscuring the ducks.
  const patchMaterial = new THREE.MeshStandardMaterial({ color: 0x90c96a, roughness:1, transparent: true, opacity: 0.22, depthWrite: false });
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
  const grassCount = 1250;
  const grass = new THREE.InstancedMesh(
    bladeShape,
    new THREE.MeshStandardMaterial({ color: 0x73b64d, roughness: 1, side: THREE.DoubleSide, vertexColors: false }),
    grassCount,
  );
  const grassDummy = new THREE.Object3D();
  const grassInfo: Array<{ x: number; z: number; size: number; phase: number; yaw: number }> = [];
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
    grassInfo.push({ x, z, size, phase: rand() * TAU, yaw });
    grassDummy.position.set(x, 0, z);
    grassDummy.rotation.set(0, yaw, 0);
    grassDummy.scale.setScalar(size);
    grassDummy.updateMatrix();
    grass.setMatrixAt(i, grassDummy.matrix);
    grassColor.setHSL(0.25 + rand() * 0.05, 0.34 + rand() * 0.16, 0.45 + rand() * 0.13);
    grass.setColorAt(i, grassColor);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  grass.frustumCulled = false;
  scene.add(grass);

  const basin = new THREE.Group();
  basin.position.set(POND.x, 0, POND.z);
  basin.name = 'blue-shell-duck-bath';
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
  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x68cdef, roughness: 0.18, metalness: 0.04, transparent: true,
    opacity: 0.78, clearcoat: 1, clearcoatRoughness: 0.08,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.name = 'duck-bath-water';
  water.receiveShadow = true;
  water.renderOrder = 1;
  basin.add(water);

  const ripplePool = Array.from({ length: 12 }, makeRippleLine);
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
  const hedgeGeo = new THREE.IcosahedronGeometry(1, 1);
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x4f9050, roughness: 1, flatShading: true });
  const hedgePositions: Array<[number, number, number, number]> = [];
  for (let x = GARDEN.minX-1.3; x <= GARDEN.maxX+1.3; x += .7) {
    hedgePositions.push([x,GARDEN.minZ-1.3,.95,.88+rand()*.12]);
    hedgePositions.push([x,GARDEN.maxZ+1.3,.95,.88+rand()*.12]);
  }
  for (let z = GARDEN.minZ-1.3; z <= GARDEN.maxZ+1.3; z += .7) {
    hedgePositions.push([GARDEN.minX-1.3,z,.95,.88+rand()*.12]);
    hedgePositions.push([GARDEN.maxX+1.3,z,.95,.88+rand()*.12]);
  }
  const hedges = new THREE.InstancedMesh(hedgeGeo, hedgeMat, hedgePositions.length);
  hedgePositions.forEach(([x, z, y, scale], i) => {
    grassDummy.position.set(x, y, z);
    grassDummy.rotation.set(rand() * 0.25, rand() * TAU, rand() * 0.25);
    grassDummy.scale.set(scale * 1.2, scale * 1.5, scale * 1.2);
    grassDummy.updateMatrix();
    hedges.setMatrixAt(i, grassDummy.matrix);
  });
  hedges.castShadow = true;
  hedges.receiveShadow = true;
  scene.add(hedges);

  // Small daisies and buttercups gather mainly near the garden edges.
  const stemGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.19, 4);
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
  const flowerDummy = new THREE.Object3D();
  for (let i = 0; i < 55; i++) {
    let x = 0;
    let z = 0;
    do {
      x = GARDEN.minX - 2 + rand() * (GARDEN.maxX - GARDEN.minX + 4);
      z = GARDEN.minZ - 1 + rand() * (GARDEN.maxZ - GARDEN.minZ + 2);
    } while ((Math.abs(x) < 4.3 && Math.abs(z) < 2.7) || Math.hypot(x - POND.x, z - POND.z) < POND.radius + 0.6);
    const size = 0.75 + rand() * 0.7;
    flowerDummy.position.set(x, 0.095 * size, z);
    flowerDummy.rotation.set(0, 0, 0);
    flowerDummy.scale.setScalar(size);
    flowerDummy.updateMatrix();
    stems.setMatrixAt(i, flowerDummy.matrix);
    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * TAU;
      flowerDummy.position.set(x + Math.cos(angle) * 0.041 * size, 0.204 * size, z + Math.sin(angle) * 0.041 * size);
      flowerDummy.scale.set(size, size * 0.45, size);
      flowerDummy.updateMatrix();
      petals.setMatrixAt(i * 5 + p, flowerDummy.matrix);
      petals.setColorAt(i * 5 + p, new THREE.Color(petalColors[i % petalColors.length]));
    }
    flowerDummy.position.set(x, 0.21 * size, z);
    flowerDummy.scale.setScalar(size);
    flowerDummy.updateMatrix();
    centres.setMatrixAt(i, flowerDummy.matrix);
  }
  stems.instanceMatrix.needsUpdate = true;
  petals.instanceMatrix.needsUpdate = true;
  centres.instanceMatrix.needsUpdate = true;
  stems.frustumCulled = false;
  petals.frustumCulled = false;
  centres.frustumCulled = false;
  scene.add(stems, petals, centres);

  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.77, depthWrite: false });
  const cloudGeo = new THREE.SphereGeometry(1, 12, 8);
  const cloudParts: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; cluster: number; speed: number }> = [];
  for (let c = 0; c < 7; c++) {
    const origin = -18 + c * 5.7 + rand() * 2;
    const y = 5.2 + rand() * 1.4;
    const z = -12 - rand() * 7;
    const speed = 0.2 + rand() * 0.18;
    const puffs = 3 + Math.floor(rand() * 3);
    for (let p = 0; p < puffs; p++) {
      cloudParts.push({
        x: origin + (p - (puffs - 1) / 2) * 0.9, y: y + rand() * 0.25, z: z + rand() * 0.3,
        sx: 1.1 + rand() * 0.7, sy: 0.55 + rand() * 0.25, sz: 0.65,
        cluster: origin, speed,
      });
    }
  }
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, cloudParts.length);
  clouds.frustumCulled = false;
  scene.add(clouds);

  const rainCount = 340;
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = (rand() - 0.5) * 19;
    rainPositions[i * 3 + 1] = rand() * 8;
    rainPositions[i * 3 + 2] = (rand() - 0.5) * 14;
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.PointsMaterial({ color: 0xd8eeff, size: 0.035, transparent: true, opacity: 0.43, depthWrite: false });
  const rain = new THREE.Points(rainGeometry, rainMaterial);
  rain.visible = false;
  rain.frustumCulled = false;
  scene.add(rain);
  const rainImpacts=createRainImpacts(scene);
  const waterContains=(x:number,z:number)=>{
    const dx=x-POND.x,dz=z-POND.z;
    return Math.hypot(dx,dz)<shellRadius(Math.atan2(dz,dx),1.40);
  };

  let weather: Weather = { cloud: 10, wind: 1.5, rain: 0, isDay: true };
  let daylight = 1;
  let elapsed = 0;
  let weatherInitialized = false;
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
      isDay: next.isDay,
    };
    const cloudiness = weather.cloud / 100;
    sky.set(daylight,cloudiness,sun.position);
    targetSky.copy(skyDay).lerp(skyOvercast,cloudiness*.8).lerp(skyNight,1-daylight);
    targetHemi = THREE.MathUtils.lerp(.32,2.15-cloudiness*.55,daylight);
    targetSun = THREE.MathUtils.lerp(.08,2.6-cloudiness*1.35,daylight);
    targetSunColor.set(daylight>.8 ? 0xfff2d1 : daylight>.1 ? 0xffbf87 : 0xa8bde2);
    targetCloudOpacity = weather.isDay ? 0.7 + cloudiness * 0.2 : 0.36;
    targetCloudColor.set(0xffffff).lerp(new THREE.Color(0x566474),Math.min(.9,cloudiness*.45+Math.min(1,weather.rain/2)*.5));
    targetWaterColor.set(weather.isDay ? 0x68cdef : 0x477b9f);
    rain.visible = weather.rain > 0.1;
    if (!weatherInitialized) {
      (scene.background as THREE.Color).copy(targetSky);
      fog.color.copy(targetSky);
      hemi.intensity = targetHemi;
      sun.intensity = targetSun;
      sun.color.copy(targetSunColor);
      cloudMat.opacity = targetCloudOpacity;
      cloudMat.color.copy(targetCloudColor);
      waterMaterial.color.copy(targetWaterColor);
      weatherInitialized = true;
      sky.update(1);
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

  function update(time: number, dt: number): void {
    if (time < elapsed) {
      activeRipples.forEach(active => { active.line.visible = false; });
      activeRipples.length = 0;
    }
    elapsed = time;
    const weatherBlend = 1 - Math.exp(-Math.max(0, dt) * 1.3);
    sky.update(weatherBlend);
    (scene.background as THREE.Color).lerp(targetSky, weatherBlend);
    fog.color.copy(scene.background as THREE.Color);
    hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, targetHemi, weatherBlend);
    sun.intensity = THREE.MathUtils.lerp(sun.intensity, targetSun, weatherBlend);
    sun.color.lerp(targetSunColor, weatherBlend);
    cloudMat.opacity = THREE.MathUtils.lerp(cloudMat.opacity, targetCloudOpacity, weatherBlend);
    cloudMat.color.lerp(targetCloudColor,weatherBlend);
    rainImpacts.update(Math.max(0,dt),daylight,waterContains);
    waterMaterial.color.lerp(targetWaterColor, weatherBlend);
    const starVisibility=(1-THREE.MathUtils.smoothstep(daylight,.02,.35))*Math.pow(1-weather.cloud/100,2);
    starMaterial.opacity=THREE.MathUtils.lerp(starMaterial.opacity,starVisibility,weatherBlend);
    stars.visible=starMaterial.opacity>.002;
    const wind = Math.min(weather.wind, 20);
    const sway = Math.min(wind / 15, 0.55);
    for (let i = 0; i < grassCount; i++) {
      const info = grassInfo[i];
      grassDummy.position.set(info.x, 0, info.z);
      grassDummy.rotation.set(0.02 + sway * Math.sin(time * (1.1 + wind * 0.15) + info.phase), info.yaw, sway * 0.25 * Math.cos(time * 1.5 + info.phase));
      grassDummy.scale.setScalar(info.size);
      grassDummy.updateMatrix();
      grass.setMatrixAt(i, grassDummy.matrix);
    }
    grass.instanceMatrix.needsUpdate = true;

    cloudParts.forEach((part, i) => {
      const drift = ((part.cluster + 25 + time * part.speed) % 50 + 50) % 50 - 25 - part.cluster;
      grassDummy.position.set(part.x + drift, part.y, part.z);
      grassDummy.rotation.set(0, 0, 0);
      grassDummy.scale.set(part.sx, part.sy, part.sz);
      grassDummy.updateMatrix();
      clouds.setMatrixAt(i, grassDummy.matrix);
    });
    clouds.instanceMatrix.needsUpdate = true;

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
        y += 0.017 * active.strength * envelope * Math.sin((distance - wavefront) * 28);
      }
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
    waterGeometry.computeVertexNormals();

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
        linePositions.setXYZ(j, active.x + Math.cos(a) * radius, POND.waterY + 0.013, active.z + Math.sin(a) * radius);
      }
      linePositions.needsUpdate = true;
      const material = active.line.material as THREE.LineBasicMaterial;
      material.opacity = Math.max(0, 0.46 * (1 - age / 2.2) * active.strength);
      active.line.visible = radius + Math.hypot(active.x, active.z) < 1.43;
    }

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
          if(x>GARDEN.minX&&x<GARDEN.maxX&&z>GARDEN.minZ&&z<GARDEN.maxZ)
            rainImpacts.hit(x,impactY,z,water&&!roof);
          rainPositions[yIndex] = 7.5 + rand();
          rainPositions[i * 3] = (rand() - 0.5) * 19;
          rainPositions[i * 3+2] = (rand() - 0.5) * 14;
        }
      }
      rainGeometry.attributes.position.needsUpdate = true;
      rainMaterial.opacity = Math.min(0.55, 0.18 + weather.rain * 0.015);
    }
  }

  setWeather(weather);
  update(0, 0);
  function setDaylight(light:number,phase:number){
    daylight=THREE.MathUtils.clamp(light,0,1);
    sun.position.set(-Math.cos(phase*Math.PI)*8,Math.max(1,Math.sin(phase*Math.PI)*10),4);
    setWeather({...weather,isDay:daylight>.3});
  }
  return { ground, update, ripple, setWeather, setDaylight, setShelterDoor:shelter.setDoor };
}
