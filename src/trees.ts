/**
 * Baggrundstræer bag hækken (få, naturligt forgrenede løvtræer med tusindvis af
 * individuelle 3D-blade på kvistene — ingen ballon-kugler — samt én nåletræs-silhuet)
 * og havens højtider:
 * - Halloween (ultimo okt - primo nov): Udskårne græskarhoveder med flakkende stearinlys.
 * - December / Jul (december måned eller ved snevejr): Juletræ i haven med varm lyskæde og topstjerne.
 */
import * as THREE from 'three';
import { getHedgeSeason, type HedgeSeason } from './hedge';
import { gardenGroundHeight } from './shelter';

export function isHalloweenDate(date: Date): boolean {
  const m = date.getMonth(); // 9 = Oktober, 10 = November
  const d = date.getDate();
  return (m === 9 && d >= 18) || (m === 10 && d <= 5);
}

export function isDecemberHoliday(date: Date, snow = 0): boolean {
  const m = date.getMonth(); // 11 = December, 0 = Januar
  const d = date.getDate();
  return m === 11 || (m === 0 && d <= 4) || snow > 0.45;
}

export interface GardenTreesAndHolidays {
  group: THREE.Group;
  setDate(date: Date): void;
  setWeather(frost: number, snow: number, daylight: number): void;
  update(time: number): void;
}

/**
 * Bygger en luftig, organisk kvist-klynge bestående af 32 individuelle foldede 3D-blade
 * i forskellige vinkler og størrelser (som på bøgehækken, aldrig runde kugler/balloner).
 */
function createLeafSprayGeometry(rand: () => number): THREE.BufferGeometry {
  const leavesInSpray = 32;
  const positions: number[] = [];
  const colors: number[] = [];

  // Grundblad med midterfold (4 trekanter = 12 vertices per blad)
  const baseLeafVerts = [
    0, 0, 0, -0.052, 0.068, 0, 0, 0.072, 0.020,
    -0.052, 0.068, 0, 0, 0.148, 0, 0, 0.072, 0.020,
    0, 0, 0, 0, 0.072, 0.020, 0.052, 0.068, 0,
    0.052, 0.068, 0, 0, 0.072, 0.020, 0, 0.148, 0,
  ];

  const v = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const offset = new THREE.Vector3();

  for (let i = 0; i < leavesInSpray; i++) {
    // Fordel bladene luftigt langs en flad, let hængende kvist-vifte (bredere end den er høj)
    const angle = (i / leavesInSpray) * Math.PI * 2 + (rand() - 0.5) * 0.45;
    const radius = 0.08 + Math.pow(rand(), 0.7) * 0.42;
    const archY = (1 - (radius / 0.5) ** 2) * 0.14 + (rand() - 0.5) * 0.16;
    offset.set(Math.cos(angle) * radius, archY, Math.sin(angle) * radius);

    euler.set(
      0.35 + (rand() - 0.5) * 1.4,
      angle + (rand() - 0.5) * 1.2,
      (rand() - 0.5) * 1.4,
    );
    quat.setFromEuler(euler);

    const scale = 1.15 + rand() * 0.85;
    // Indre blade er lidt mørkere, ydre/øvre blade lidt lysere for naturlig dybde
    const shade = 0.72 + (archY + 0.12) * 0.65 + rand() * 0.22;

    for (let k = 0; k < baseLeafVerts.length; k += 3) {
      v.set(baseLeafVerts[k] * scale, baseLeafVerts[k + 1] * scale, baseLeafVerts[k + 2] * scale);
      v.applyQuaternion(quat).add(offset);
      positions.push(v.x, v.y, v.z);
      // Lidt lysere mod bladspidsen
      const tipBoost = baseLeafVerts[k + 1] > 0.1 ? 1.08 : 0.96;
      const c = Math.min(1.15, shade * tipBoost);
      colors.push(c, c, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Bygger en flad, vifteformet gran-gren med takkede nålespidser (til naturlig fyr/gran uden kegle-balloner).
 */
function createPineBoughGeometry(rand: () => number): THREE.BufferGeometry {
  const needles = 26;
  const positions: number[] = [];
  const colors: number[] = [];
  const v = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const offset = new THREE.Vector3();

  // Smal nåle-vifte
  const frondVerts = [
    0, 0, 0, -0.06, 0.22, 0.01, 0, 0.26, 0.025,
    0, 0, 0, 0, 0.26, 0.025, 0.06, 0.22, 0.01,
    -0.06, 0.22, 0.01, 0, 0.44, -0.02, 0, 0.26, 0.025,
    0.06, 0.22, 0.01, 0, 0.26, 0.025, 0, 0.44, -0.02,
  ];

  for (let i = 0; i < needles; i++) {
    const a = (i / needles) * Math.PI * 2 + (rand() - 0.5) * 0.25;
    const dist = 0.04 + (i % 3) * 0.14 + rand() * 0.08;
    offset.set(Math.cos(a) * dist, (rand() - 0.5) * 0.06, Math.sin(a) * dist);
    // Hælder udad og let nedad som ægte grangrene
    euler.set(1.15 + (rand() - 0.5) * 0.35, a, (rand() - 0.5) * 0.3);
    quat.setFromEuler(euler);
    const scale = 0.85 + rand() * 0.55;
    const shade = 0.74 + rand() * 0.28;

    for (let k = 0; k < frondVerts.length; k += 3) {
      v.set(frondVerts[k] * scale, frondVerts[k + 1] * scale, frondVerts[k + 2] * scale);
      v.applyQuaternion(quat).add(offset);
      positions.push(v.x, v.y, v.z);
      colors.push(shade, shade, shade);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createTreesAndHolidays(scene: THREE.Scene, initialDate = new Date()): GardenTreesAndHolidays {
  const group = new THREE.Group();
  group.name = 'trees-and-holidays';
  scene.add(group);

  let seed = 49182;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // ============================================================================
  // 1. FÅ, NATURLIGT FORGRENEDE LØVTRÆER BAG HÆKKEN (4 træer i alt)
  // ============================================================================
  const deciduousSpecs: Array<{
    x: number;
    z: number;
    height: number;
    spread: number;
    kind: 'birch' | 'oak';
    yaw: number;
  }> = [
    { x: -6.4, z: -7.6, height: 5.4, spread: 2.3, kind: 'birch', yaw: 0.4 },
    { x: -2.6, z: -8.6, height: 6.1, spread: 2.8, kind: 'oak', yaw: 1.3 },
    { x: 6.2, z: -9.8, height: 5.2, spread: 2.2, kind: 'birch', yaw: 2.6 },
    // Træ mod vest flyttet mod syd (z=4.8) så det rammer villahaven flot uden at dække for Dannebrog-flaget (x=-11, z=0.5)
    { x: -9.2, z: 4.8, height: 5.6, spread: 2.4, kind: 'oak', yaw: 3.9 },
  ];

  // Vi opbygger hvert træ rekursivt med sammenhængende gren-segmenter fra rod til kvistspids
  interface BranchSeg {
    p0: THREE.Vector3;
    p1: THREE.Vector3;
    r0: number;
    r1: number;
    color: THREE.Color;
    upper: number;
  }
  interface SprayPlacement {
    pos: THREE.Vector3;
    rot: THREE.Euler;
    scale: THREE.Vector3;
    seed: number;
    isOak: boolean;
    elevation: number;
  }

  const branchSegments: BranchSeg[] = [];
  const sprayPlacements: SprayPlacement[] = [];
  const upVec = new THREE.Vector3(0, 1, 0);

  for (const spec of deciduousSpecs) {
    const baseBark = spec.kind === 'birch' ? new THREE.Color('#dcd8cf') : new THREE.Color('#48372a');
    const darkBark = spec.kind === 'birch' ? new THREE.Color('#544339') : new THREE.Color('#382a1f');
    const trunkR = spec.kind === 'birch' ? 0.13 : 0.21;

    // 1. Nederste og øverste stamme med et naturligt knæk
    const pBase = new THREE.Vector3(spec.x, -0.1, spec.z);
    const pMidTrunk = new THREE.Vector3(
      spec.x + (rand() - 0.5) * 0.18,
      spec.height * 0.24,
      spec.z + (rand() - 0.5) * 0.18,
    );
    const pCrownFork = new THREE.Vector3(
      pMidTrunk.x + (rand() - 0.5) * 0.22,
      spec.height * 0.46,
      pMidTrunk.z + (rand() - 0.5) * 0.22,
    );

    branchSegments.push({
      p0: pBase,
      p1: pMidTrunk,
      r0: trunkR,
      r1: trunkR * 0.84,
      color: baseBark.clone().multiplyScalar(0.92),
      upper: 0.05,
    });
    branchSegments.push({
      p0: pMidTrunk,
      p1: pCrownFork,
      r0: trunkR * 0.84,
      r1: trunkR * 0.68,
      color: baseBark.clone(),
      upper: 0.2,
    });

    // 2. 4-5 hovedstammer/krongrene ud fra stammen
    const mainCount = spec.kind === 'oak' ? 5 : 4;
    for (let m = 0; m < mainCount; m++) {
      const az = spec.yaw + (m / mainCount) * Math.PI * 2 + (rand() - 0.5) * 0.38;
      const tilt = (spec.kind === 'oak' ? 0.52 : 0.38) + rand() * 0.24;
      const len1 = spec.height * (0.24 + rand() * 0.08);
      const startPt = m === 0 ? pMidTrunk.clone().lerp(pCrownFork, 0.65) : pCrownFork.clone();

      const dir1 = new THREE.Vector3(
        Math.sin(tilt) * Math.cos(az),
        Math.cos(tilt),
        Math.sin(tilt) * Math.sin(az),
      ).normalize();
      const midBranchPt = startPt.clone().addScaledVector(dir1, len1);

      branchSegments.push({
        p0: startPt,
        p1: midBranchPt,
        r0: trunkR * 0.56,
        r1: trunkR * 0.36,
        color: baseBark.clone().lerp(darkBark, 0.28),
        upper: 0.55,
      });

      // Hovedgrenen fortsætter i et knæk udad/opad
      const az2 = az + (rand() - 0.5) * 0.35;
      const tilt2 = tilt + 0.14 + (rand() - 0.5) * 0.2;
      const len2 = spec.height * (0.20 + rand() * 0.08);
      const dir2 = new THREE.Vector3(
        Math.sin(tilt2) * Math.cos(az2),
        Math.cos(tilt2),
        Math.sin(tilt2) * Math.sin(az2),
      ).normalize();
      const endBranchPt = midBranchPt.clone().addScaledVector(dir2, len2);

      branchSegments.push({
        p0: midBranchPt,
        p1: endBranchPt,
        r0: trunkR * 0.36,
        r1: trunkR * 0.19,
        color: baseBark.clone().lerp(darkBark, 0.58),
        upper: 0.8,
      });

      // 3. Sidegrene fra både midBranchPt og endBranchPt
      const anchors = [midBranchPt, endBranchPt, midBranchPt.clone().lerp(endBranchPt, 0.55)];
      for (let s = 0; s < anchors.length; s++) {
        const subAz = az + (s % 2 === 0 ? -0.68 : 0.68) + (rand() - 0.5) * 0.4;
        const subTilt = tilt + 0.22 + (rand() - 0.5) * 0.32;
        const subLen = spec.spread * (0.34 + rand() * 0.16);
        const subDir = new THREE.Vector3(
          Math.sin(subTilt) * Math.cos(subAz),
          Math.cos(subTilt) * (spec.kind === 'birch' ? 0.72 : 0.88),
          Math.sin(subTilt) * Math.sin(subAz),
        ).normalize();
        const subEnd = anchors[s].clone().addScaledVector(subDir, subLen);

        branchSegments.push({
          p0: anchors[s],
          p1: subEnd,
          r0: trunkR * 0.22,
          r1: trunkR * 0.09,
          color: darkBark.clone(),
          upper: 0.92,
        });

        // Løv-kviste langs sidegrenen
        for (let l = 0; l < 2; l++) {
          const t = 0.45 + l * 0.5 + (rand() - 0.5) * 0.15;
          const pos = anchors[s].clone().lerp(subEnd, t);
          sprayPlacements.push({
            pos,
            rot: new THREE.Euler((rand() - 0.5) * 0.5, rand() * Math.PI * 2, (rand() - 0.5) * 0.5),
            scale: new THREE.Vector3(1.1 + rand() * 0.45, 0.85 + rand() * 0.35, 1.1 + rand() * 0.45),
            seed: rand(),
            isOak: spec.kind === 'oak',
            elevation: THREE.MathUtils.clamp((pos.y - spec.height * 0.4) / (spec.height * 0.55), 0, 1),
          });
        }

        // 4. Fine yderkviste (2 per sidegren) med løv-vifter
        for (let tw = 0; tw < 2; tw++) {
          const twAz = subAz + (tw === 0 ? -0.55 : 0.55) + (rand() - 0.5) * 0.35;
          const twTilt = subTilt + (spec.kind === 'birch' ? 0.35 : 0.05) + (rand() - 0.5) * 0.3;
          const twLen = spec.spread * (0.22 + rand() * 0.12);
          const twDir = new THREE.Vector3(
            Math.sin(twTilt) * Math.cos(twAz),
            Math.cos(twTilt),
            Math.sin(twTilt) * Math.sin(twAz),
          ).normalize();
          const twStart = tw === 0 ? subEnd : anchors[s].clone().lerp(subEnd, 0.65);
          const twEnd = twStart.clone().addScaledVector(twDir, twLen);

          branchSegments.push({
            p0: twStart,
            p1: twEnd,
            r0: trunkR * 0.10,
            r1: trunkR * 0.04,
            color: darkBark.clone().multiplyScalar(0.9),
            upper: 1.0,
          });

          // Løv-vifte ved kvistens midte og spids
          for (const frac of [0.55, 1.0]) {
            const pos = twStart.clone().lerp(twEnd, frac);
            sprayPlacements.push({
              pos,
              rot: new THREE.Euler((rand() - 0.5) * 0.6, rand() * Math.PI * 2, (rand() - 0.5) * 0.6),
              scale: new THREE.Vector3(0.95 + rand() * 0.45, 0.8 + rand() * 0.35, 0.95 + rand() * 0.45),
              seed: rand(),
              isOak: spec.kind === 'oak',
              elevation: THREE.MathUtils.clamp((pos.y - spec.height * 0.4) / (spec.height * 0.55), 0, 1),
            });
          }
        }
      }
    }
  }

  // Opret InstancedMesh til alle sammenhængende grene
  const totalBranchSegments = branchSegments.length;
  const cylGeo = new THREE.CylinderGeometry(0.55, 1.0, 1.0, 6);
  cylGeo.translate(0, 0.5, 0);
  const barkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94 });
  const treeBranches = new THREE.InstancedMesh(cylGeo, barkMat, totalBranchSegments);
  treeBranches.name = 'deciduous-tree-branches';

  const branchBaseColors = new Float32Array(totalBranchSegments * 3);
  const branchIsUpper = new Float32Array(totalBranchSegments);
  const dummy = new THREE.Object3D();
  const dirVec = new THREE.Vector3();
  const col = new THREE.Color();

  for (let i = 0; i < totalBranchSegments; i++) {
    const seg = branchSegments[i];
    dirVec.subVectors(seg.p1, seg.p0);
    const len = dirVec.length();
    dummy.position.copy(seg.p0);
    dummy.quaternion.setFromUnitVectors(upVec, dirVec.normalize());
    dummy.scale.set(seg.r0, len, seg.r0);
    dummy.updateMatrix();
    treeBranches.setMatrixAt(i, dummy.matrix);
    seg.color.toArray(branchBaseColors, i * 3);
    branchIsUpper[i] = seg.upper;
  }
  treeBranches.instanceMatrix.needsUpdate = true;

  // Opret InstancedMesh til 3D-løvkvistene (32 rigtige blade per kvist, ingen kugler!)
  const totalCanopySprays = sprayPlacements.length;
  const sprayGeo = createLeafSprayGeometry(rand);
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.86,
    side: THREE.DoubleSide,
  });
  const treeCanopies = new THREE.InstancedMesh(sprayGeo, canopyMat, totalCanopySprays);
  treeCanopies.name = 'deciduous-tree-canopies';

  for (let i = 0; i < totalCanopySprays; i++) {
    const sp = sprayPlacements[i];
    dummy.position.copy(sp.pos);
    dummy.rotation.copy(sp.rot);
    dummy.scale.copy(sp.scale);
    dummy.updateMatrix();
    treeCanopies.setMatrixAt(i, dummy.matrix);
  }
  treeCanopies.instanceMatrix.needsUpdate = true;
  group.add(treeBranches, treeCanopies);

  // ============================================================================
  // 2. ÉN NATURLIG SKOVFYR / GRAN BAG HÆKKEN (Opbygget af nålevifter, ikke kegler)
  // ============================================================================
  const pineGroup = new THREE.Group();
  pineGroup.name = 'evergreen-pines';
  const pineX = 9.4;
  const pineZ = -4.2;
  const pineH = 5.6;
  const pineTrunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.15, pineH * 0.88, 6),
    new THREE.MeshStandardMaterial({ color: 0x5c3e2b, roughness: 0.92 }),
  );
  pineTrunk.position.set(pineX, pineH * 0.42, pineZ);
  pineGroup.add(pineTrunk);

  const boughCount = 28;
  const boughGeo = createPineBoughGeometry(rand);
  const pineMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  const pineBoughs = new THREE.InstancedMesh(boughGeo, pineMat, boughCount);
  for (let i = 0; i < boughCount; i++) {
    const frac = i / (boughCount - 1);
    const y = 1.35 + frac * (pineH * 0.72);
    const whorlAngle = i * 2.39996; // Gylden vinkel giver naturlig spiral-krans
    const spreadR = (1 - frac * 0.72) * 1.15;
    dummy.position.set(
      pineX + Math.cos(whorlAngle) * spreadR * 0.35,
      y,
      pineZ + Math.sin(whorlAngle) * spreadR * 0.35,
    );
    dummy.rotation.set((rand() - 0.5) * 0.25, whorlAngle, (rand() - 0.5) * 0.25);
    const s = (1.35 - frac * 0.75) * (0.9 + rand() * 0.25);
    dummy.scale.set(s, s * 0.75, s);
    dummy.updateMatrix();
    pineBoughs.setMatrixAt(i, dummy.matrix);
  }
  pineBoughs.instanceMatrix.needsUpdate = true;
  pineGroup.add(pineBoughs);
  group.add(pineGroup);

  // ============================================================================
  // 3. HALLOWEEN GRÆSKARHOVEDER I HAVEN (Ultimo okt - primo nov)
  // ============================================================================
  const pumpkinGroup = new THREE.Group();
  pumpkinGroup.name = 'halloween-pumpkins';
  group.add(pumpkinGroup);

  const pumpkinBodyMat = new THREE.MeshStandardMaterial({ color: 0xd95b16, roughness: 0.62 });
  const pumpkinFleshMat = new THREE.MeshStandardMaterial({ color: 0xdf8428, roughness: 0.82 });
  const pumpkinStemMat = new THREE.MeshStandardMaterial({ color: 0x3b4d24, roughness: 0.88 });
  const pumpkinGlowMat = new THREE.MeshBasicMaterial({ color: 0xffb830, side: THREE.DoubleSide });

  function makePumpkin(radius: number, height: number, yaw: number): THREE.Group {
    const pGroup = new THREE.Group();
    const ribGeo = new THREE.SphereGeometry(radius, 10, 8);
    for (let r = 0; r < 8; r++) {
      const angle = (r / 8) * Math.PI * 2;
      const rib = new THREE.Mesh(ribGeo, pumpkinBodyMat);
      rib.position.set(Math.cos(angle) * radius * 0.22, height * 0.5, Math.sin(angle) * radius * 0.22);
      rib.scale.set(0.78, (height / (radius * 2)) * 1.02, 0.78);
      rib.castShadow = true;
      rib.receiveShadow = true;
      pGroup.add(rib);
    }

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.10, radius * 0.18, height * 0.28, 6), pumpkinStemMat);
    stem.position.set(0, height * 0.98, 0);
    stem.rotation.z = 0.18;
    pGroup.add(stem);

    // Udskåret ansigt: Sidder forsænket INDE i græskarskallen (Z = radius * 0.70..0.87).
    // Fra siden rager intet ud over græskarrets runde form; man ser tværtimod ind i det udskårne kød.
    const faceGroup = new THREE.Group();
    faceGroup.position.set(0, height * 0.50, 0);

    // 1. Trekantede øjne (udskåret i græskarkødet)
    const eyeShape = new THREE.Shape();
    eyeShape.moveTo(-radius * 0.12, -height * 0.08);
    eyeShape.lineTo(radius * 0.12, -height * 0.08);
    eyeShape.lineTo(0, height * 0.10);
    eyeShape.closePath();
    const eyeExtrudeSettings = {
      depth: radius * 0.16,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: radius * 0.025,
      bevelThickness: radius * 0.02,
    };
    const eyeFleshGeo = new THREE.ExtrudeGeometry(eyeShape, eyeExtrudeSettings);
    const eyeCutLeft = new THREE.Mesh(eyeFleshGeo, pumpkinFleshMat);
    eyeCutLeft.position.set(-radius * 0.28, height * 0.06, radius * 0.69);
    const eyeCutRight = new THREE.Mesh(eyeFleshGeo, pumpkinFleshMat);
    eyeCutRight.position.set(radius * 0.28, height * 0.06, radius * 0.69);

    const eyeGlowGeo = new THREE.ShapeGeometry(eyeShape);
    const leftEyeGlow = new THREE.Mesh(eyeGlowGeo, pumpkinGlowMat);
    leftEyeGlow.position.set(-radius * 0.28, height * 0.06, radius * 0.71);
    const rightEyeGlow = new THREE.Mesh(eyeGlowGeo, pumpkinGlowMat);
    rightEyeGlow.position.set(radius * 0.28, height * 0.06, radius * 0.71);

    // 2. Trekantet næse
    const noseShape = new THREE.Shape();
    noseShape.moveTo(-radius * 0.08, -height * 0.06);
    noseShape.lineTo(radius * 0.08, -height * 0.06);
    noseShape.lineTo(0, height * 0.06);
    noseShape.closePath();
    const noseFleshGeo = new THREE.ExtrudeGeometry(noseShape, eyeExtrudeSettings);
    const noseCut = new THREE.Mesh(noseFleshGeo, pumpkinFleshMat);
    noseCut.position.set(0, -height * 0.05, radius * 0.71);
    const noseGlow = new THREE.Mesh(new THREE.ShapeGeometry(noseShape), pumpkinGlowMat);
    noseGlow.position.set(0, -height * 0.05, radius * 0.73);

    // 3. Takket, udskåret grin/mund med tænder forsænket i græskarret
    const mouthShape = new THREE.Shape();
    mouthShape.moveTo(-radius * 0.44, -height * 0.14);
    mouthShape.lineTo(-radius * 0.26, -height * 0.14);
    mouthShape.lineTo(-radius * 0.26, -height * 0.20);
    mouthShape.lineTo(-radius * 0.14, -height * 0.20);
    mouthShape.lineTo(-radius * 0.14, -height * 0.14);
    mouthShape.lineTo(radius * 0.14, -height * 0.14);
    mouthShape.lineTo(radius * 0.14, -height * 0.20);
    mouthShape.lineTo(radius * 0.26, -height * 0.20);
    mouthShape.lineTo(radius * 0.26, -height * 0.14);
    mouthShape.lineTo(radius * 0.44, -height * 0.14);
    mouthShape.lineTo(radius * 0.36, -height * 0.27);
    mouthShape.lineTo(radius * 0.08, -height * 0.26);
    mouthShape.lineTo(radius * 0.08, -height * 0.21);
    mouthShape.lineTo(-radius * 0.08, -height * 0.21);
    mouthShape.lineTo(-radius * 0.08, -height * 0.26);
    mouthShape.lineTo(-radius * 0.36, -height * 0.27);
    mouthShape.closePath();

    const mouthFleshGeo = new THREE.ExtrudeGeometry(mouthShape, eyeExtrudeSettings);
    const mouthCut = new THREE.Mesh(mouthFleshGeo, pumpkinFleshMat);
    mouthCut.position.set(0, 0, radius * 0.69);

    const mouthGlow = new THREE.Mesh(new THREE.ShapeGeometry(mouthShape), pumpkinGlowMat);
    mouthGlow.position.set(0, 0, radius * 0.71);

    faceGroup.add(
      eyeCutLeft, eyeCutRight, leftEyeGlow, rightEyeGlow,
      noseCut, noseGlow,
      mouthCut, mouthGlow,
    );
    pGroup.add(faceGroup);
    pGroup.rotation.y = yaw;
    return pGroup;
  }

  const pumpkinPlacements = [
    { x: -2.42, z: -1.82, r: 0.18, h: 0.26, yaw: 0.48 },
    { x: -2.14, z: -1.98, r: 0.13, h: 0.19, yaw: 0.18 },
    { x: 2.38, z: -2.35, r: 0.16, h: 0.23, yaw: -0.52 },
  ];
  for (const pp of pumpkinPlacements) {
    const pMesh = makePumpkin(pp.r, pp.h, pp.yaw);
    pMesh.position.set(pp.x, gardenGroundHeight(pp.x, pp.z), pp.z);
    pumpkinGroup.add(pMesh);
  }

  const pumpkinLight = new THREE.PointLight(0xff8c24, 0, 1.35, 2.0);
  pumpkinLight.position.set(-2.28, 0.24, -1.78);
  pumpkinGroup.add(pumpkinLight);

  // ============================================================================
  // 4. JULETRÆ MED LYSKÆDE I HAVEN (December måned eller ved snevejr)
  // ============================================================================
  const christmasGroup = new THREE.Group();
  christmasGroup.name = 'garden-christmas-tree';
  const treeX = -0.65;
  const treeZ = -2.55;
  christmasGroup.position.set(treeX, gardenGroundHeight(treeX, treeZ), treeZ);
  group.add(christmasGroup);

  const standMat = new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.88 });
  const trunkMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 1.55, 8), standMat);
  trunkMesh.position.y = 0.80;
  trunkMesh.castShadow = true;
  christmasGroup.add(trunkMesh);

  const footPlate1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.09), standMat);
  footPlate1.position.y = 0.02;
  const footPlate2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.46), standMat);
  footPlate2.position.y = 0.02;
  christmasGroup.add(footPlate1, footPlate2);

  // Naturlige gran-kranse af nåle-vifter på juletræet i stedet for glatte kegler
  const xmasBoughCount = 34;
  const xmasBoughMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });
  const xmasBoughs = new THREE.InstancedMesh(boughGeo, xmasBoughMat, xmasBoughCount);
  for (let i = 0; i < xmasBoughCount; i++) {
    const t = i / (xmasBoughCount - 1);
    const y = 0.28 + t * 1.32;
    const angle = i * 2.39996;
    const r = (1 - t * 0.78) * 0.42;
    dummy.position.set(Math.cos(angle) * r * 0.35, y, Math.sin(angle) * r * 0.35);
    dummy.rotation.set(0.08, angle, 0);
    const s = (1.15 - t * 0.78);
    dummy.scale.set(s, s * 0.85, s);
    dummy.updateMatrix();
    xmasBoughs.setMatrixAt(i, dummy.matrix);
  }
  xmasBoughs.instanceMatrix.needsUpdate = true;
  christmasGroup.add(xmasBoughs);

  // Gylden topstjerne
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffe47a });
  const topStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 0), starMat);
  topStar.position.y = 1.72;
  topStar.scale.set(1, 1.15, 0.45);
  christmasGroup.add(topStar);

  // Lyskæde med 40 små varme lyspærer snoet i en spiral rundt om juletræet
  const bulbCount = 40;
  const bulbGeo = new THREE.SphereGeometry(0.022, 6, 6);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffdf85 });
  const fairyLights = new THREE.InstancedMesh(bulbGeo, bulbMat, bulbCount);
  fairyLights.name = 'christmas-fairy-lights';

  const bulbPalette = [
    new THREE.Color('#ffdf80'),
    new THREE.Color('#ffd166'),
    new THREE.Color('#ffeab3'),
    new THREE.Color('#ffb84d'),
  ];
  for (let i = 0; i < bulbCount; i++) {
    const t = i / (bulbCount - 1);
    const y = 0.28 + t * 1.32;
    const coneRadiusAtY = 0.56 * (1 - t * 0.78);
    const spiralAngle = t * Math.PI * 2 * 4.5;
    const bx = Math.cos(spiralAngle) * coneRadiusAtY;
    const bz = Math.sin(spiralAngle) * coneRadiusAtY;
    dummy.position.set(bx, y, bz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    fairyLights.setMatrixAt(i, dummy.matrix);
    fairyLights.setColorAt(i, bulbPalette[i % bulbPalette.length]);
  }
  fairyLights.instanceMatrix.needsUpdate = true;
  if (fairyLights.instanceColor) fairyLights.instanceColor.needsUpdate = true;
  christmasGroup.add(fairyLights);

  const xmasLight = new THREE.PointLight(0xffcf70, 0, 2.2, 2.0);
  xmasLight.position.set(0, 1.05, 0.35);
  christmasGroup.add(xmasLight);

  // ============================================================================
  // 5. ÅRSTIDS- OG VEJROPDATERING
  // ============================================================================
  let currentDate = initialDate;
  let frostLevel = 0;
  let snowLevel = 0;
  let daylightLevel = 1;
  let lastSeason: HedgeSeason | null = null;
  let lastFrostQ = -1;
  let lastSnowQ = -1;

  const snowTint = new THREE.Color('#eef5fc');
  const frostTint = new THREE.Color('#cfdfec');

  function updateVisuals(force = false) {
    const baseSeason = getHedgeSeason(currentDate);
    const effectiveSeason: HedgeSeason = (snowLevel > 0.25 || frostLevel > 0.25)
      ? 'winter'
      : baseSeason;

    pumpkinGroup.visible = isHalloweenDate(currentDate) && snowLevel < 0.35;
    christmasGroup.visible = isDecemberHoliday(currentDate, snowLevel);

    const fQ = Math.round(frostLevel * 10);
    const sQ = Math.round(snowLevel * 10);
    if (!force && effectiveSeason === lastSeason && fQ === lastFrostQ && sQ === lastSnowQ) {
      return;
    }
    lastSeason = effectiveSeason;
    lastFrostQ = fQ;
    lastSnowQ = sQ;

    // Om vinteren taber løvtræerne alle bladene og står med nøgne grene
    treeCanopies.visible = effectiveSeason !== 'winter';

    // Opdater grenfarver (med rim eller sne på de øverste grene om vinteren)
    const winterWhite = Math.max(snowLevel * 0.85, frostLevel * 0.45);
    for (let i = 0; i < totalBranchSegments; i++) {
      col.fromArray(branchBaseColors, i * 3);
      if (winterWhite > 0.02) {
        const upper = branchIsUpper[i];
        col.lerp(snowLevel >= frostLevel ? snowTint : frostTint, winterWhite * upper);
      }
      treeBranches.setColorAt(i, col);
    }
    if (treeBranches.instanceColor) treeBranches.instanceColor.needsUpdate = true;

    // Opdater løv-kvisternes årstidsfarver (afstemt naturligt efter bøgehækken)
    if (treeCanopies.visible) {
      for (let i = 0; i < totalCanopySprays; i++) {
        const sp = sprayPlacements[i];
        const r1 = sp.seed;
        const elev = sp.elevation;

        if (effectiveSeason === 'copper_autumn') {
          // Birk bliver gylden/ravfarvet; eg/bøg bliver varm kobber/rødbrun
          const hue = sp.isOak ? 0.055 + r1 * 0.04 : 0.105 + r1 * 0.035;
          col.setHSL(hue, 0.72, 0.32 + elev * 0.14 + r1 * 0.06);
        } else if (effectiveSeason === 'early_autumn') {
          const hue = sp.isOak ? 0.13 + r1 * 0.06 : 0.16 + r1 * 0.05;
          col.setHSL(hue, 0.52, 0.30 + elev * 0.12);
        } else if (effectiveSeason === 'spring') {
          col.setHSL(0.25 + r1 * 0.04, 0.48, 0.34 + elev * 0.12);
        } else {
          // Naturlig dæmpet nordisk løvgrøn (ikke neon-grøn)
          col.setHSL(0.27 + r1 * 0.04, 0.36, 0.25 + elev * 0.11);
        }
        treeCanopies.setColorAt(i, col);
      }
      if (treeCanopies.instanceColor) treeCanopies.instanceColor.needsUpdate = true;
    }

    // Opdater skovfyr og juletræets grangrene (mørkegrønne med sne/rim om vinteren)
    for (let i = 0; i < boughCount; i++) {
      const frac = i / boughCount;
      col.setHSL(0.34, 0.34, 0.18 + frac * 0.07);
      if (frostLevel > 0.02) col.lerp(frostTint, frostLevel * (0.25 + frac * 0.28));
      if (snowLevel > 0.02) col.lerp(snowTint, snowLevel * (0.52 + frac * 0.35));
      pineBoughs.setColorAt(i, col);
    }
    if (pineBoughs.instanceColor) pineBoughs.instanceColor.needsUpdate = true;

    for (let i = 0; i < xmasBoughCount; i++) {
      const frac = i / xmasBoughCount;
      col.setHSL(0.35, 0.42, 0.19 + frac * 0.06);
      if (frostLevel > 0.02) col.lerp(frostTint, frostLevel * 0.32);
      if (snowLevel > 0.02) col.lerp(snowTint, snowLevel * (0.48 + (i % 2) * 0.22));
      xmasBoughs.setColorAt(i, col);
    }
    if (xmasBoughs.instanceColor) xmasBoughs.instanceColor.needsUpdate = true;
  }

  updateVisuals(true);

  return {
    group,
    setDate(date: Date) {
      currentDate = date;
      updateVisuals(false);
    },
    setWeather(frost: number, snow: number, daylight: number) {
      frostLevel = THREE.MathUtils.clamp(frost, 0, 1);
      snowLevel = THREE.MathUtils.clamp(snow, 0, 1);
      daylightLevel = THREE.MathUtils.clamp(daylight, 0, 1);
      updateVisuals(false);
    },
    update(time: number) {
      if (pumpkinGroup.visible) {
        const flicker = 0.85 + 0.15 * Math.sin(time * 9.5) * Math.cos(time * 14.3);
        const duskFactor = THREE.MathUtils.clamp(1.15 - daylightLevel * 1.1, 0.05, 1.0);
        pumpkinLight.intensity = 0.55 * flicker * duskFactor;
        pumpkinGlowMat.color.setHSL(0.09 + 0.015 * flicker, 0.98, 0.56 + 0.08 * flicker);
      } else {
        pumpkinLight.intensity = 0;
      }
      if (christmasGroup.visible) {
        const twinkle = 0.92 + 0.08 * Math.sin(time * 3.2);
        const duskFactor = THREE.MathUtils.clamp(1.2 - daylightLevel * 1.05, 0.1, 1.0);
        xmasLight.intensity = 0.75 * twinkle * duskFactor;
        topStar.rotation.y = Math.sin(time * 0.8) * 0.15;
      } else {
        xmasLight.intensity = 0;
      }
    },
  };
}
