import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface GistrupHospital {
  group: THREE.Group;
  helipadPosition: THREE.Vector3; // world-koordinat for helipladsens landingsflade
  update(dt: number): void;
  setDate(date: Date): void;
  setWinterWeather(snow: number, frost: number): void;
  setDaylight(solarAltitude: number): void;
  setHelipadActive(active: boolean): void;
}

/**
 * Supersygehuset i Gistrup (Aalborg Universitetshospital).
 * Placeret mod nordvest i horisonten (x = -38, y = 0, z = -92).
 *
 * Forankret solidt på en stor, naturlig nordjysk bakkekam med:
 * - Et bredt, fladt plateau under hele bygningskomplekset.
 * - Dybe sokkelmure der går langt ned i bakken (ingen svæven over skråninger).
 * - Asfalteret adgangsvej og læhegn/skovbryn langs skråningerne.
 */
export function createGistrupHospital(): GistrupHospital {
  const group = new THREE.Group();
  group.name = 'gistrup-hospital';
  const groupPosX = -38.0;
  const groupPosY = 0.0;
  const groupPosZ = -92.0;
  const groupScale = 1.35;
  group.position.set(groupPosX, groupPosY, groupPosZ);
  group.scale.set(groupScale, groupScale, groupScale);

  // -------------------------------------------------------------
  // MATERIALER
  // -------------------------------------------------------------
  const brickBaseColor = new THREE.Color(0x964230); // Dansk rød tegl (behandlingsfløje)
  const spandrelBaseColor = new THREE.Color(0xe0e6ec); // Hvide brystninger
  const sundBaseColor = new THREE.Color(0x34383c); // Mørkegrå forskningsbygning (SUND)
  const glassBaseColor = new THREE.Color(0x88a9c3); // Spejlende lyst blågråt glas
  const hillBaseColor = new THREE.Color(0x4c6e44); // Diskret grøn bakketone
  const roadBaseColor = new THREE.Color(0x383c40); // Asfalteret tilkørselsvej/plads
  const treeBaseColor = new THREE.Color(0x284a26); // Mørkegrønne træer/læhegn

  const hillMat = new THREE.MeshStandardMaterial({
    color: hillBaseColor.clone(),
    roughness: 0.96,
    metalness: 0.02,
  });

  const brickMat = new THREE.MeshStandardMaterial({
    color: brickBaseColor.clone(),
    roughness: 0.88,
    metalness: 0.05,
  });

  const spandrelMat = new THREE.MeshStandardMaterial({
    color: spandrelBaseColor.clone(),
    roughness: 0.55,
    metalness: 0.15,
  });

  const sundMat = new THREE.MeshStandardMaterial({
    color: sundBaseColor.clone(),
    roughness: 0.75,
    metalness: 0.25,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: glassBaseColor.clone(),
    roughness: 0.22,
    metalness: 0.65,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0.0,
  });

  const roofTrimMat = new THREE.MeshStandardMaterial({
    color: 0x3a3e42,
    roughness: 0.85,
    metalness: 0.1,
  });

  const roadMat = new THREE.MeshStandardMaterial({
    color: roadBaseColor.clone(),
    roughness: 0.92,
    metalness: 0.05,
  });

  const treeMat = new THREE.MeshStandardMaterial({
    color: treeBaseColor.clone(),
    roughness: 0.94,
  });

  const helipadDeckMat = new THREE.MeshStandardMaterial({
    color: 0x24282c,
    roughness: 0.9,
    metalness: 0.2,
  });

  const helipadMarkingWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf5f8fa,
    roughness: 0.5,
  });

  const helipadMarkingRedMat = new THREE.MeshStandardMaterial({
    color: 0xd62828,
    roughness: 0.6,
  });

  const helipadMarkingYellowMat = new THREE.MeshStandardMaterial({
    color: 0xfcc419,
    roughness: 0.6,
  });

  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf2f6fa,
    roughness: 0.8,
    metalness: 0.02,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  // Geometrisamlinger for batching
  const brickGeos: THREE.BufferGeometry[] = [];
  const spandrelGeos: THREE.BufferGeometry[] = [];
  const sundGeos: THREE.BufferGeometry[] = [];
  const glassGeos: THREE.BufferGeometry[] = [];
  const roofGeos: THREE.BufferGeometry[] = [];
  const roadGeos: THREE.BufferGeometry[] = [];
  const treeGeos: THREE.BufferGeometry[] = [];
  const snowGeos: THREE.BufferGeometry[] = [];

  // -------------------------------------------------------------
  // 1. STOR BAKKE MED SOLIDT FLADT PLATEAU (y: 0 til 4.4m, 140m x 80m)
  // Plateauet dækker 100% af bygningernes grundplan, så intet svæver!
  // -------------------------------------------------------------
  const hillW = 140;
  const hillD = 80;
  const hillMaxY = 4.40;
  const segX = 48;
  const segZ = 36;

  // Bygningskompleksets udbredelse: x in [-26, 23], z in [-9, 9]
  // Plateauet har en rummelig sikkerhedszone: x in [-32, 28], z in [-14, 14]
  const platXMin = -32.0;
  const platXMax = 28.0;
  const platZMin = -14.0;
  const platZMax = 14.0;

  const hillGeo = new THREE.PlaneGeometry(hillW, hillD, segX, segZ);
  hillGeo.rotateX(-Math.PI / 2);
  const posAttr = hillGeo.attributes.position;

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);

    // Afstand fra plateau-rektanglet
    const dx = Math.max(0, platXMin - x, x - platXMax);
    const dz = Math.max(0, platZMin - z, z - platZMax);

    if (dx === 0 && dz === 0) {
      // Inde på det flade plateau under hospitalet
      posAttr.setY(i, hillMaxY);
    } else {
      // Blød, naturlig skråning ud mod bakkens fod
      const lx = (hillW / 2) - 30; // ~40m
      const lz = (hillD / 2) - 14; // ~26m
      const normDist = Math.hypot(dx / lx, dz / lz);

      if (normDist < 1.0) {
        // Cosinus-affladning ned mod y = 0
        const profile = Math.pow(Math.cos(normDist * (Math.PI / 2)), 1.35);
        posAttr.setY(i, hillMaxY * profile);
      } else {
        posAttr.setY(i, 0.0);
      }
    }
  }
  hillGeo.computeVertexNormals();

  const hillMesh = new THREE.Mesh(hillGeo, hillMat);
  hillMesh.receiveShadow = true;
  group.add(hillMesh);

  // Bakkens snelag
  const hillSnowGeo = hillGeo.clone();
  const snowMeshOnHill = new THREE.Mesh(hillSnowGeo, snowMat);
  snowMeshOnHill.position.y = 0.04;
  snowMeshOnHill.visible = false;
  group.add(snowMeshOnHill);

  // -------------------------------------------------------------
  // 2. BEHANDLINGSFLØJE I DANSK RØD TEGL (Base)
  // Sokkel/fundament går 3.8m NED i bakken (fra y = 0.60 til y = 8.60)
  // Derved er bygningerne solidt forankret i jorden, selv på skråninger!
  // -------------------------------------------------------------
  const foundationBottomY = 0.60;
  const baseTopY = 8.60;
  const baseBoxH = baseTopY - foundationBottomY; // 8.0m
  const baseCenterY = (foundationBottomY + baseTopY) / 2; // 4.60m

  // Hoved-behandlingsbase med atrier og fremspring
  const baseSections = [
    // [x, z, w, d]
    [-6.0,  0.0, 36.0, 16.0], // Central behandlingsfløj
    [15.0,  2.0, 16.0, 14.0], // Østlig poliklinik
    [-18.0, 1.5, 12.0, 12.0], // Akutmodtagelse base
  ];

  for (const [bx, bz, bw, bd] of baseSections) {
    // Solid murkrop der rækker dybt ned i bakken
    const bGeo = new THREE.BoxGeometry(bw, baseBoxH, bd);
    bGeo.translate(bx, baseCenterY, bz);
    brickGeos.push(bGeo);

    // Tag gesims / grustag på toppen (y = 8.60)
    const bRoof = new THREE.BoxGeometry(bw + 0.3, 0.15, bd + 0.3);
    bRoof.translate(bx, baseTopY + 0.075, bz);
    roofGeos.push(bRoof);

    // Sne på tag
    const bSnow = new THREE.BoxGeometry(bw + 0.2, 0.12, bd + 0.2);
    bSnow.translate(bx, baseTopY + 0.16, bz);
    snowGeos.push(bSnow);

    // Bånd af base-vinduer i stueetagen (y = 4.40 + 1.8 = 6.20)
    const winGeo = new THREE.BoxGeometry(bw * 0.92, 1.1, bd + 0.08);
    winGeo.translate(bx, 6.20, bz);
    glassGeos.push(winGeo);
  }

  // -------------------------------------------------------------
  // 3. MØRKEGRÅ FORSKNINGSBYGNING (SUND - Det Sundhedsvidenskabelige Fakultet)
  // Forankret fra y = 0.60 til y = 10.80
  // -------------------------------------------------------------
  const sundW = 15.0;
  const sundD = 13.0;
  const sundTopY = 10.80;
  const sundBodyH = sundTopY - foundationBottomY; // 10.20m
  const sundCenterY = (foundationBottomY + sundTopY) / 2; // 5.70m
  const sundX = -18.5;
  const sundZ = -2.5;

  const sundBody = new THREE.BoxGeometry(sundW, sundBodyH, sundD);
  sundBody.translate(sundX, sundCenterY, sundZ);
  sundGeos.push(sundBody);

  const sundRoof = new THREE.BoxGeometry(sundW + 0.2, 0.15, sundD + 0.2);
  sundRoof.translate(sundX, sundTopY + 0.075, sundZ);
  roofGeos.push(sundRoof);

  const sundSnow = new THREE.BoxGeometry(sundW + 0.15, 0.12, sundD + 0.15);
  sundSnow.translate(sundX, sundTopY + 0.16, sundZ);
  snowGeos.push(sundSnow);

  // Vertikale vinduesbånd på SUND (over bakkehøjde)
  for (let vx = -5.0; vx <= 5.0; vx += 2.5) {
    const sWin = new THREE.BoxGeometry(0.85, 4.8, sundD + 0.06);
    sWin.translate(sundX + vx, 4.40 + 2.8, sundZ);
    glassGeos.push(sWin);
  }

  // -------------------------------------------------------------
  // 4. HØJE SENGETÅRNE / GLASFLØJE (Bredde ~28m, højde ~11m over basen)
  // Rejser sig fra y = 8.60 til y = 19.60
  // -------------------------------------------------------------
  const towerBaseY = 8.60;
  const towerH = 11.0; // y op til 19.60

  // To slanke parallelle sengetårns-fløje med glas-atrium imellem
  const bedWings = [
    // [x, z, w, d]
    [-6.5, -3.2, 22.0, 7.5], // Nordre sengetårn
    [-4.5,  4.2, 24.0, 7.5], // Søndre sengetårn
  ];

  for (const [tx, tz, tw, td] of bedWings) {
    // 4 etager med skiftevis hvide brystninger og bånd af spejlende glas
    const floors = 4;
    const floorH = towerH / floors;

    for (let f = 0; f < floors; f++) {
      const fy = towerBaseY + f * floorH;

      // Hvid brystning nederst på etagen (spandrel)
      const spandrelH = floorH * 0.42;
      const spandrelGeo = new THREE.BoxGeometry(tw, spandrelH, td);
      spandrelGeo.translate(tx, fy + spandrelH / 2, tz);
      spandrelGeos.push(spandrelGeo);

      // Bånd af spejlende lyst blågråt glas øverst på etagen
      const glassH = floorH * 0.58;
      const glassBandGeo = new THREE.BoxGeometry(tw + 0.04, glassH, td + 0.04);
      glassBandGeo.translate(tx, fy + spandrelH + glassH / 2, tz);
      glassGeos.push(glassBandGeo);
    }

    // Tag gesims / parapet
    const twRoof = new THREE.BoxGeometry(tw + 0.35, 0.22, td + 0.35);
    twRoof.translate(tx, towerBaseY + towerH + 0.11, tz);
    roofGeos.push(twRoof);

    // Tag-sne
    const twSnow = new THREE.BoxGeometry(tw + 0.25, 0.12, td + 0.25);
    twSnow.translate(tx, towerBaseY + towerH + 0.24, tz);
    snowGeos.push(twSnow);
  }

  // Forbindende glasatrium mellem de to sengetårne
  const bridgeGeo = new THREE.BoxGeometry(10.0, towerH * 0.75, 4.0);
  bridgeGeo.translate(-5.5, towerBaseY + (towerH * 0.75) / 2, 0.5);
  glassGeos.push(bridgeGeo);

  // -------------------------------------------------------------
  // 5. HELIPLADS (Forhøjet cirkulær heliplads, diameter ~8.4m)
  // Placeres på taget ved x = -7.5, z = -3.2, y = 20.3
  // -------------------------------------------------------------
  const helipadLocalX = -7.5;
  const helipadLocalZ = -3.2;
  const helipadDeckY = towerBaseY + towerH + 0.7; // 20.3m
  const helipadRadius = 4.2; // Diameter 8.4m

  // Søjler under den hævede landingsplatform
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2;
    const colGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.7, 8);
    colGeo.translate(
      helipadLocalX + Math.cos(ang) * (helipadRadius * 0.8),
      towerBaseY + towerH + 0.35,
      helipadLocalZ + Math.sin(ang) * (helipadRadius * 0.8)
    );
    roofGeos.push(colGeo);
  }

  // Cirkulær dækflade
  const deckGeo = new THREE.CylinderGeometry(helipadRadius, helipadRadius, 0.18, 32);
  deckGeo.translate(helipadLocalX, helipadDeckY - 0.09, helipadLocalZ);
  const helipadDeckMesh = new THREE.Mesh(deckGeo, helipadDeckMat);
  group.add(helipadDeckMesh);

  // Skråt sikkerhedsnet rundt om helipladsen
  const netGeo = new THREE.RingGeometry(helipadRadius, helipadRadius + 0.65, 32);
  netGeo.rotateX(-Math.PI / 2);
  netGeo.translate(helipadLocalX, helipadDeckY - 0.05, helipadLocalZ);
  const netMesh = new THREE.Mesh(netGeo, roofTrimMat);
  group.add(netMesh);

  // HELIPLADS MARKERINGER (H, rød/hvid cirkel, gul perimeter)
  const markingGroup = new THREE.Group();
  markingGroup.position.set(helipadLocalX, helipadDeckY + 0.005, helipadLocalZ);
  markingGroup.rotation.x = -Math.PI / 2;
  group.add(markingGroup);

  // Gul yderring
  const yellowRing = new THREE.RingGeometry(helipadRadius - 0.32, helipadRadius - 0.08, 32);
  markingGroup.add(new THREE.Mesh(yellowRing, helipadMarkingYellowMat));

  // Rød markering (ydre advarselsring)
  const redRing = new THREE.RingGeometry(2.7, 3.5, 32);
  markingGroup.add(new THREE.Mesh(redRing, helipadMarkingRedMat));

  // Hvid indre ring
  const whiteRing = new THREE.RingGeometry(2.4, 2.7, 32);
  markingGroup.add(new THREE.Mesh(whiteRing, helipadMarkingWhiteMat));

  // Stort hvidt "H" i centrum
  const hBarV1 = new THREE.PlaneGeometry(0.42, 2.4);
  hBarV1.translate(-0.8, 0, 0);
  const hBarV2 = new THREE.PlaneGeometry(0.42, 2.4);
  hBarV2.translate(0.8, 0, 0);
  const hBarH = new THREE.PlaneGeometry(1.6, 0.42);
  const hGeom = mergeGeometries([hBarV1, hBarV2, hBarH], false);
  if (hGeom) {
    markingGroup.add(new THREE.Mesh(hGeom, helipadMarkingWhiteMat));
  }

  // Heliplads randlys (grønne/gule perimeter-dioder)
  const perimeterLightCount = 12;
  const perimeterLightGeos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < perimeterLightCount; i++) {
    const ang = (i / perimeterLightCount) * Math.PI * 2;
    const plGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 6);
    plGeo.translate(
      helipadLocalX + Math.cos(ang) * (helipadRadius - 0.15),
      helipadDeckY + 0.04,
      helipadLocalZ + Math.sin(ang) * (helipadRadius - 0.15)
    );
    perimeterLightGeos.push(plGeo);
  }
  const perimeterLightsMat = new THREE.MeshBasicMaterial({
    color: 0x33ff66,
    transparent: true,
    opacity: 0.3,
  });
  if (perimeterLightGeos.length) {
    const pMesh = new THREE.Mesh(mergeGeometries(perimeterLightGeos, false), perimeterLightsMat);
    group.add(pMesh);
  }

  // World-koordinat for helipladsens landingsflade
  const helipadPosition = new THREE.Vector3(
    groupPosX + helipadLocalX * groupScale,
    groupPosY + helipadDeckY * groupScale,
    groupPosZ + helipadLocalZ * groupScale
  );

  // -------------------------------------------------------------
  // 6. RØD FLYADVARSELSLAMPE PÅ HØJESTE TEKNIKTÅRN (Puls ~1.8s)
  // -------------------------------------------------------------
  const techX = 5.5;
  const techZ = -2.0;
  const techH = 3.6;
  const techGeo = new THREE.BoxGeometry(4.2, techH, 3.8);
  techGeo.translate(techX, towerBaseY + towerH + techH / 2, techZ);
  spandrelGeos.push(techGeo);

  // Antennemast på toppen
  const mastBaseY = towerBaseY + towerH + techH;
  const mastH = 2.4;
  const mastGeo = new THREE.CylinderGeometry(0.06, 0.12, mastH, 8);
  mastGeo.translate(techX, mastBaseY + mastH / 2, techZ);
  roofGeos.push(mastGeo);

  // Rød flyadvarsels-diode (sprite / glowing billboard)
  const beaconY = mastBaseY + mastH + 0.08;
  const beaconGeo = new THREE.PlaneGeometry(1.2, 1.2);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xff1020,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
  beaconMesh.position.set(techX, beaconY, techZ);
  group.add(beaconMesh);

  // En lille fysisk lampe-krop
  const lampBody = new THREE.CylinderGeometry(0.12, 0.12, 0.18, 8);
  lampBody.translate(techX, beaconY - 0.08, techZ);
  roofGeos.push(lampBody);

  // -------------------------------------------------------------
  // 7. ASFALTERET TILKØRSELSVEJ & FORPLADS (Forankring i terrænet)
  // -------------------------------------------------------------
  const roadW = 6.0;
  // Buede vejforløb ned ad bakkens forside
  for (let seg = 0; seg < 12; seg++) {
    const t = seg / 11;
    const rz = 9.0 + t * 24.0;
    const rx = -4.0 + Math.sin(t * Math.PI) * 14.0;
    // Beregn terrænhøjde på bakken
    const dx = Math.max(0, platXMin - rx, rx - platXMax);
    const dz = Math.max(0, platZMin - rz, rz - platZMax);
    const normDist = Math.hypot(dx / 40, dz / 26);
    const ry = normDist < 1.0 ? hillMaxY * Math.pow(Math.cos(normDist * (Math.PI / 2)), 1.35) : 0.0;

    const rPatch = new THREE.BoxGeometry(roadW, 0.08, 2.5);
    rPatch.translate(rx, ry + 0.04, rz);
    roadGeos.push(rPatch);
  }

  // -------------------------------------------------------------
  // 8. LÆHEGN & SKOVBRYN PÅ BAKKENS SKRÅNINGER (Visuel forankring)
  // Små klynger af træer og buske på bakkens sider
  // -------------------------------------------------------------
  const copsePositions = [
    { x: -38.0, z: 2.0, r: 3.2, h: 5.5 },
    { x: -44.0, z: -8.0, r: 3.6, h: 6.2 },
    { x: -34.0, z: -16.0, r: 2.8, h: 4.8 },
    { x: 33.0, z: 4.0, r: 3.4, h: 5.8 },
    { x: 42.0, z: -6.0, r: 3.8, h: 6.5 },
    { x: 36.0, z: -18.0, r: 3.0, h: 5.0 },
    { x: -12.0, z: 22.0, r: 2.6, h: 4.5 },
    { x: 14.0, z: 20.0, r: 2.8, h: 4.6 },
  ];

  for (const c of copsePositions) {
    const dx = Math.max(0, platXMin - c.x, c.x - platXMax);
    const dz = Math.max(0, platZMin - c.z, c.z - platZMax);
    const normDist = Math.hypot(dx / 40, dz / 26);
    const cy = normDist < 1.0 ? hillMaxY * Math.pow(Math.cos(normDist * (Math.PI / 2)), 1.35) : 0.0;

    // Trækrone
    const crownGeo = new THREE.DodecahedronGeometry(c.r, 1);
    crownGeo.scale(1.0, 1.25, 1.0);
    crownGeo.translate(c.x, cy + c.h * 0.65, c.z);
    treeGeos.push(crownGeo);

    // Træstamme
    const trunkGeo = new THREE.CylinderGeometry(c.r * 0.15, c.r * 0.22, c.h * 0.45, 6);
    trunkGeo.translate(c.x, cy + c.h * 0.225, c.z);
    roofGeos.push(trunkGeo);

    // Sne på trækrone
    const tSnow = new THREE.DodecahedronGeometry(c.r * 0.85, 1);
    tSnow.scale(1.0, 0.6, 1.0);
    tSnow.translate(c.x, cy + c.h * 0.95, c.z);
    snowGeos.push(tSnow);
  }

  // -------------------------------------------------------------
  // SAMLING AF MESHES (MED SIKKER ATTRIBUT-NORMALISERING)
  // -------------------------------------------------------------
  function safeMerge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (geos.length === 1) return geos[0];
    const clean = geos.map(g => {
      const nonIndexed = g.index ? g.toNonIndexed() : g.clone();
      const c = new THREE.BufferGeometry();
      c.setAttribute('position', nonIndexed.getAttribute('position'));
      if (nonIndexed.hasAttribute('normal')) {
        c.setAttribute('normal', nonIndexed.getAttribute('normal'));
      } else {
        c.computeVertexNormals();
      }
      return c;
    });
    return mergeGeometries(clean, false) ?? clean[0];
  }

  if (brickGeos.length) group.add(new THREE.Mesh(safeMerge(brickGeos), brickMat));
  if (spandrelGeos.length) group.add(new THREE.Mesh(safeMerge(spandrelGeos), spandrelMat));
  if (sundGeos.length) group.add(new THREE.Mesh(safeMerge(sundGeos), sundMat));
  if (glassGeos.length) group.add(new THREE.Mesh(safeMerge(glassGeos), glassMat));
  if (roofGeos.length) group.add(new THREE.Mesh(safeMerge(roofGeos), roofTrimMat));
  if (roadGeos.length) group.add(new THREE.Mesh(safeMerge(roadGeos), roadMat));
  if (treeGeos.length) group.add(new THREE.Mesh(safeMerge(treeGeos), treeMat));

  let roofSnowMesh: THREE.Mesh | null = null;
  if (snowGeos.length) {
    roofSnowMesh = new THREE.Mesh(safeMerge(snowGeos), snowMat);
    roofSnowMesh.visible = false;
    group.add(roofSnowMesh);
  }

  // -------------------------------------------------------------
  // STATE & STYRING
  // -------------------------------------------------------------
  let beaconTimer = 0;
  let currentSnow = 0;
  let currentFrost = 0;
  let helipadActive = false;

  return {
    group,
    helipadPosition,

    update(dt: number): void {
      beaconTimer += dt;

      // Rød flyadvarselslampe puls-periode ~1.8s (ICAO standard flash)
      const period = 1.8;
      const phase = (beaconTimer % period) / period;
      const pulse = Math.pow(Math.max(0, Math.sin(phase * Math.PI)), 4);
      beaconMat.opacity = 0.25 + pulse * 1.35;
      beaconMesh.scale.setScalar(0.75 + pulse * 0.6);

      // Heliplads perimeterlys pulserer når aktiv
      if (helipadActive) {
        const hPulse = 0.5 + 0.5 * Math.sin(beaconTimer * 4.0);
        perimeterLightsMat.opacity = 0.4 + hPulse * 0.6;
        perimeterLightsMat.color.setHex(0x00ff66);
      } else {
        perimeterLightsMat.opacity = 0.2;
        perimeterLightsMat.color.setHex(0x228844);
      }
    },

    setDate(_date: Date): void {},

    setWinterWeather(snow: number, frost: number): void {
      currentSnow = THREE.MathUtils.clamp(snow, 0, 1);
      currentFrost = THREE.MathUtils.clamp(frost, 0, 1);

      const hasSnow = currentSnow > 0.03;
      if (roofSnowMesh) {
        roofSnowMesh.visible = hasSnow;
        snowMat.opacity = Math.min(1.0, currentSnow * 1.1);
      }
      snowMeshOnHill.visible = hasSnow;

      // Bakke og facade tones ved frost og sne
      const winterBlend = Math.max(currentFrost * 0.4, currentSnow * 0.7);
      hillMat.color.copy(hillBaseColor).lerp(new THREE.Color(0xdce7d4), winterBlend * 0.75);
      brickMat.color.copy(brickBaseColor).lerp(new THREE.Color(0x824436), winterBlend * 0.3);
      spandrelMat.color.copy(spandrelBaseColor).lerp(new THREE.Color(0xf2f7fc), winterBlend * 0.3);
      sundMat.color.copy(sundBaseColor).lerp(new THREE.Color(0x42464b), winterBlend * 0.25);
    },

    setDaylight(solarAltitude: number): void {
      const duskProgress = 1.0 - THREE.MathUtils.clamp((solarAltitude - (-6)) / (3 - (-6)), 0, 1);

      if (duskProgress > 0.02) {
        glassMat.emissive.setHex(0xe8f0ff);
        glassMat.emissiveIntensity = duskProgress * 0.95;
      } else {
        glassMat.emissive.setHex(0x000000);
        glassMat.emissiveIntensity = 0;
      }
    },

    setHelipadActive(active: boolean): void {
      helipadActive = active;
    },
  };
}
