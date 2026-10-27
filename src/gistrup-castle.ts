import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface GistrupCastle {
  group: THREE.Group;
  update(dt: number): void;
  setDate(date: Date): void;
  setWinterWeather(snow: number, frost: number): void;
  setDaylight(solarAltitude: number): void;
}

/**
 * Ridderborgen - den ikoniske borg-villa på Hadsundvej i Gistrup.
 * Autentisk modelleret efter virkelighedens luftfoto:
 * - Hovedbygning i sandgråt murværk med kamtakkede gavle i begge ender (vest og øst).
 * - Karakteristisk saddeltag i orange vingetegl med rundbuefriser og smedejerns-murankre.
 * - Bygningen fortsætter på højre side af tårnet (østfløjen, lidt kortere end venstre side).
 * - Det markante fremspringende tårn med rundbueportal, 5 murtinder med våbenskjold og udkragede buer.
 * - Til venstre: mur, portbygning, rundt hjørnetårn (pebersvøb) med kegletag, og træ-vindebro.
 * - Omgivet af vandfyldt voldgrav med tæt kampestens-skråning, havebeplantning og raftehegn.
 *
 * Placeret mod Nordøst (x = 15.0, y = 0, z = -15.5, rotation.y = -0.42).
 */
export function createGistrupCastle(): GistrupCastle {
  const group = new THREE.Group();
  group.name = 'gistrup-castle';
  group.position.set(15.0, 0, -15.5);
  group.rotation.y = -0.42;

  // -------------------------------------------------------------
  // MATERIALER
  // -------------------------------------------------------------
  // Autentiske farver fra fotoet: varmt patineret sandgråt murværk, rig orange vingetegl
  const wallBaseColor = new THREE.Color(0xb0a89a); // Sandgrå / patineret lys tegl
  const roofBaseColor = new THREE.Color(0xc24f20); // Varm orange/teglrød dansk vingetegl
  const stoneFoundationColor = new THREE.Color(0x625e56); // Grålig sokkel / kampesten
  const shieldColor = new THREE.Color(0x9a9486); // Hugget sandsten våbenskjold
  const foliageColor = new THREE.Color(0x2d5230); // Mørkegrøn havebeplantning / enebær
  const doorWoodColor = new THREE.Color(0xd48a28); // Varm, tydelig gylden lakeret egetræ (jvf. fotoet af døren!)

  const wallMat = new THREE.MeshStandardMaterial({
    color: wallBaseColor.clone(),
    roughness: 0.88,
    metalness: 0.03,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: roofBaseColor.clone(),
    roughness: 0.74,
    metalness: 0.06,
  });

  const stoneMat = new THREE.MeshStandardMaterial({
    color: stoneFoundationColor.clone(),
    roughness: 0.94,
    metalness: 0.04,
  });

  const shieldMat = new THREE.MeshStandardMaterial({
    color: shieldColor.clone(),
    roughness: 0.82,
    metalness: 0.08,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x483424, // Mørkpatineret egetræ / vindebro / rafter
    roughness: 0.88,
    metalness: 0.02,
  });

  const doorWoodMat = new THREE.MeshStandardMaterial({
    color: doorWoodColor.clone(),
    roughness: 0.65,
    metalness: 0.04,
  });

  const ironMetalMat = new THREE.MeshStandardMaterial({
    color: 0x222224, // Sorte smedejerns-murankre & zink
    roughness: 0.5,
    metalness: 0.85,
  });

  const windowFrameMat = new THREE.MeshStandardMaterial({
    color: 0xf4f5f6, // Hvide sprossevinduer
    roughness: 0.55,
  });

  const windowLitMat = new THREE.MeshStandardMaterial({
    color: 0x1a222a,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0.0,
    roughness: 0.25,
    metalness: 0.7,
    side: THREE.DoubleSide,
  });

  const windowUnlitMat = new THREE.MeshStandardMaterial({
    color: 0x182026,
    roughness: 0.2,
    metalness: 0.85,
    side: THREE.DoubleSide,
  });

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2c3d32, // Naturlig voldgrav med svag andemadsgrøn tone og spejling
    roughness: 0.16,
    metalness: 0.72,
  });

  const foliageMat = new THREE.MeshStandardMaterial({
    color: foliageColor.clone(),
    roughness: 0.92,
  });

  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8fc,
    roughness: 0.85,
    metalness: 0.02,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  // Geometrisamlinger for draw-call optimering
  const wallGeos: THREE.BufferGeometry[] = [];
  const roofGeos: THREE.BufferGeometry[] = [];
  const stoneGeos: THREE.BufferGeometry[] = [];
  const shieldGeos: THREE.BufferGeometry[] = [];
  const woodGeos: THREE.BufferGeometry[] = [];
  const doorGeos: THREE.BufferGeometry[] = [];
  const ironGeos: THREE.BufferGeometry[] = [];
  const foliageGeos: THREE.BufferGeometry[] = [];
  const windowFrameGeos: THREE.BufferGeometry[] = [];
  const litWindowGeos: THREE.BufferGeometry[] = [];
  const unlitWindowGeos: THREE.BufferGeometry[] = [];
  const snowGeos: THREE.BufferGeometry[] = [];

  // =============================================================
  // HOVEDFLØJENS DIMENSIONER & BYGNINGSAKSER
  // =============================================================
  const houseD = 5.2; // Dybde (z = -2.60 til z = +2.60)
  const houseZ = 0.0;
  const houseWallH = 4.60; // Murens overkant
  const roofPitchH = 3.00; // Tagryg i 7.60m

  // Bygningsakser langs X:
  // Venstre gavl: x = -5.80 (kamtakket gavl)
  // Tårnets venstre mur: x = -0.60
  // Tårnets højre mur: x = +3.20 (tårnets bredde = 3.80m, center = +1.30m)
  // Højre gavl: x = +6.60 (kamtakket gavl)
  // Venstre fløj længde = 5.20m.
  // Højre fløj længde = 3.40m ("lidt kortere end den venstre side", jvf. brugerens observation!)
  const leftGableX = -5.80;
  const towerLeftX = -0.60;
  const towerRightX = +3.20;
  const rightGableX = +6.60;

  const towerW = towerRightX - towerLeftX; // 3.80m
  const towerX = (towerLeftX + towerRightX) / 2; // +1.30m
  const towerWallH = 8.10; // Gesims i 8.10m (højere end tagryggen på 7.60m)
  const towerFrontZ = 3.85; // Rager 1.25m frem foran facaden (z = 2.60)
  const towerBackZ = -2.60; // Dækker husets dybde bagtil
  const towerD = towerFrontZ - towerBackZ; // 6.45m
  const towerZ = (towerFrontZ + towerBackZ) / 2; // +0.625m

  // =============================================================
  // 1. MURE: VENSTRE FLØJ & HØJRE FLØJ
  // =============================================================
  // Venstre fløj (vestfløj)
  const leftWingW = towerLeftX - leftGableX; // 5.20m
  const leftWingCenterX = (leftGableX + towerLeftX) / 2; // -3.20m

  const leftBaseGeo = new THREE.BoxGeometry(leftWingW + 0.12, 0.40, houseD + 0.14);
  leftBaseGeo.translate(leftWingCenterX, 0.20, houseZ);
  stoneGeos.push(leftBaseGeo);

  const leftWalls = new THREE.BoxGeometry(leftWingW, houseWallH - 0.40, houseD);
  leftWalls.translate(leftWingCenterX, 0.40 + (houseWallH - 0.40) / 2, houseZ);
  wallGeos.push(leftWalls);

  // Højre fløj (østfløj - fortsættelse på højre side af tårnet!)
  const rightWingW = rightGableX - towerRightX; // 3.40m
  const rightWingCenterX = (towerRightX + rightGableX) / 2; // +4.90m

  const rightBaseGeo = new THREE.BoxGeometry(rightWingW + 0.12, 0.40, houseD + 0.14);
  rightBaseGeo.translate(rightWingCenterX, 0.20, houseZ);
  stoneGeos.push(rightBaseGeo);

  const rightWalls = new THREE.BoxGeometry(rightWingW, houseWallH - 0.40, houseD);
  rightWalls.translate(rightWingCenterX, 0.40 + (houseWallH - 0.40) / 2, houseZ);
  wallGeos.push(rightWalls);

  // =============================================================
  // 2. KAMTAKKEDE GAVLE (Stepped gables på venstre & højre gavl)
  // =============================================================
  function createSteppedGable(gx: number, isRightEnd: boolean): void {
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-houseD / 2, 0);
    gableShape.lineTo(houseD / 2, 0);
    gableShape.lineTo(0, roofPitchH);
    gableShape.closePath();

    const depth = 0.30;
    const gableGeom = new THREE.ExtrudeGeometry(gableShape, { depth, bevelEnabled: false });
    gableGeom.rotateY(Math.PI / 2);
    gableGeom.translate(isRightEnd ? gx - depth : gx, houseWallH, houseZ);
    wallGeos.push(gableGeom);

    // Kamtakker (trappetrin) langs gavlens hældning
    const stepCount = isRightEnd ? 6 : 7;
    const stepW = 0.36;
    const stepH = 0.46;
    const stepD = 0.44;

    for (let s = 1; s <= stepCount; s++) {
      const frac = s / (stepCount + 1);
      const stepY = houseWallH + frac * roofPitchH;
      const stepZDist = (houseD / 2) * (1 - frac * 0.95);

      for (const zSign of [-1, 1]) {
        const stepGeo = new THREE.BoxGeometry(stepW, stepH, stepD);
        stepGeo.translate(gx + (isRightEnd ? 0.04 : -0.04), stepY + stepH / 2, houseZ + zSign * stepZDist);
        wallGeos.push(stepGeo);

        // Teglafdækning på hvert trin
        const capGeo = new THREE.BoxGeometry(stepW + 0.05, 0.06, stepD + 0.05);
        capGeo.translate(gx + (isRightEnd ? 0.04 : -0.04), stepY + stepH + 0.03, houseZ + zSign * stepZDist);
        roofGeos.push(capGeo);

        // Sne på trinnets top
        const sSnow = new THREE.BoxGeometry(stepW + 0.02, 0.06, stepD + 0.02);
        sSnow.translate(gx + (isRightEnd ? 0.04 : -0.04), stepY + stepH + 0.065, houseZ + zSign * stepZDist);
        snowGeos.push(sSnow);
      }
    }

    // Tinde / pinnacle på gavltoppen
    const peakGeo = new THREE.BoxGeometry(0.42, 0.82, 0.42);
    peakGeo.translate(gx + (isRightEnd ? 0.04 : -0.04), houseWallH + roofPitchH + 0.41, houseZ);
    wallGeos.push(peakGeo);

    const peakCap = new THREE.BoxGeometry(0.48, 0.08, 0.48);
    peakCap.translate(gx + (isRightEnd ? 0.04 : -0.04), houseWallH + roofPitchH + 0.86, houseZ);
    roofGeos.push(peakCap);

    const peakSnow = new THREE.BoxGeometry(0.44, 0.07, 0.44);
    peakSnow.translate(gx + (isRightEnd ? 0.04 : -0.04), houseWallH + roofPitchH + 0.92, houseZ);
    snowGeos.push(peakSnow);
  }

  // Generer venstre og højre kamtakkede gavle
  createSteppedGable(leftGableX, false);
  createSteppedGable(rightGableX, true);

  // =============================================================
  // 3. TAG (Orange vingetegl på venstre & højre fløj)
  // Begge tage hviler præcist på murkronen (4.60m) og slutter mod tårnet
  // =============================================================
  const roofThickness = 0.16;
  const slopeAngle = Math.atan2(roofPitchH, houseD / 2);
  const slopeLen = Math.hypot(houseD / 2, roofPitchH);
  const overhang = 0.28;
  const totalSlopeLen = slopeLen + overhang;

  function buildWingRoof(xStart: number, xEnd: number): void {
    const len = xEnd - xStart;
    const cX = (xStart + xEnd) / 2;

    for (const zSign of [-1, 1]) {
      const rotX = zSign * slopeAngle;
      // Tagets underside hviler direkte på overkanten af muren (y = houseWallH = 4.60m)
      const midY = houseWallH + (roofPitchH - overhang * Math.sin(slopeAngle)) / 2 + (roofThickness / 2) * Math.cos(slopeAngle);
      const midZ = houseZ + zSign * ((houseD / 2 + overhang * Math.cos(slopeAngle)) / 2 + (roofThickness / 2) * Math.sin(slopeAngle));

      const slope = new THREE.BoxGeometry(len, roofThickness, totalSlopeLen);
      slope.rotateX(rotX);
      slope.translate(cX, midY, midZ);
      roofGeos.push(slope);

      // Snelag
      const snowSlope = new THREE.BoxGeometry(len - 0.04, 0.06, totalSlopeLen);
      snowSlope.rotateX(rotX);
      snowSlope.translate(cX, midY + 0.07 * Math.cos(rotX), midZ + zSign * 0.07 * Math.sin(rotX));
      snowGeos.push(snowSlope);

      // Zink-tagrender langs tagudhænget
      const eavesY = houseWallH - overhang * Math.sin(slopeAngle) + 0.02;
      const eavesZ = houseZ + zSign * (houseD / 2 + overhang * Math.cos(slopeAngle));
      const gutter = new THREE.CylinderGeometry(0.06, 0.06, len, 8, 1, false, 0, Math.PI);
      gutter.rotateZ(Math.PI / 2);
      gutter.translate(cX, eavesY, eavesZ);
      ironGeos.push(gutter);
    }

    // Rygningssten (teglkam) langs tagryggen
    const ridgeCap = new THREE.BoxGeometry(len, 0.10, 0.26);
    ridgeCap.translate(cX, houseWallH + roofPitchH + 0.06, houseZ);
    roofGeos.push(ridgeCap);
  }

  // Venstre tag (slutter præcis ved tårnets venstre mur)
  buildWingRoof(leftGableX + 0.02, towerLeftX);
  // Højre tag (starter præcis ved tårnets højre mur og går til højre gavl)
  buildWingRoof(towerRightX, rightGableX - 0.02);

  // Nedløbsrør på facaden ved gavlene jvf. fotoet
  for (const nx of [leftGableX + 0.16, rightGableX - 0.16]) {
    const downpipe = new THREE.CylinderGeometry(0.04, 0.04, houseWallH - 0.35, 8);
    downpipe.translate(nx, (houseWallH - 0.35) / 2 + 0.20, houseZ + houseD / 2 + 0.08);
    ironGeos.push(downpipe);
  }

  // Smedejerns-murankre (franske liljer / fleur-de-lis) hjælpemetode
  function addFleurDeLisAnchor(x: number, y: number, z: number, rotY = 0): void {
    const vBar = new THREE.BoxGeometry(0.03, 0.28, 0.015);
    vBar.rotateY(rotY);
    vBar.translate(x, y, z);
    ironGeos.push(vBar);

    const hBar = new THREE.BoxGeometry(0.16, 0.03, 0.015);
    hBar.rotateY(rotY);
    hBar.translate(x, y, z);
    ironGeos.push(hBar);

    for (const sign of [-1, 1]) {
      const curl = new THREE.TorusGeometry(0.025, 0.008, 4, 8, Math.PI);
      curl.rotateY(rotY);
      curl.translate(x + Math.cos(rotY) * sign * 0.08, y, z - Math.sin(rotY) * sign * 0.08);
      ironGeos.push(curl);
    }
  }

  // RUNDBUEFRISE (Lombard arched frieze) under facadens tagudhæng
  const friezeY = houseWallH - 0.28;
  const friezeZ = houseZ + houseD / 2 + 0.04;
  const archW = 0.52;

  function buildFrieze(startX: number, endX: number): void {
    const count = Math.floor((endX - startX) / archW);
    for (let a = 0; a < count; a++) {
      const ax = startX + (a + 0.5) * archW;
      const archTop = new THREE.TorusGeometry(archW * 0.40, 0.035, 6, 10, Math.PI);
      archTop.rotateZ(Math.PI);
      archTop.translate(ax, friezeY, friezeZ);
      wallGeos.push(archTop);
    }
  }

  // Friser på venstre og højre facade
  buildFrieze(leftGableX + 0.35, towerLeftX - 0.15);
  buildFrieze(towerRightX + 0.15, rightGableX - 0.35);

  // 4 smedejerns-murankre over buerne på venstre facade jvf. fotoet
  for (const ax of [-4.8, -3.8, -2.8, -1.8]) {
    addFleurDeLisAnchor(ax, houseWallH - 0.12, friezeZ + 0.02, 0);
  }
  // 1 smedejerns-muranker over buerne på højre facade jvf. fotoet
  addFleurDeLisAnchor(4.90, houseWallH - 0.12, friezeZ + 0.02, 0);

  // =============================================================
  // 4. DET NYE TÅRN (Fremspringende firkantet tårn)
  // Jvf. fotoet: 5 murtinder på fronten, våbenskjold, rundbueportal
  // =============================================================
  // Tårnsokkel
  const tBase = new THREE.BoxGeometry(towerW + 0.18, 0.42, towerD + 0.18);
  tBase.translate(towerX, 0.21, towerZ);
  stoneGeos.push(tBase);

  // Tårnkrop (massiv murkasse)
  const tWall = new THREE.BoxGeometry(towerW, towerWallH - 0.42, towerD);
  tWall.translate(towerX, 0.42 + (towerWallH - 0.42) / 2, towerZ);
  wallGeos.push(tWall);

  // Udkraget gesimskant under brystværnet
  const tCornice = new THREE.BoxGeometry(towerW + 0.20, 0.16, towerD + 0.20);
  tCornice.translate(towerX, towerWallH + 0.08, towerZ);
  stoneGeos.push(tCornice);

  // Rundbuefrise / konsoller under tårnets brystværn
  const tFriezeY = towerWallH - 0.30;
  const tArchW = 0.52;
  const tArchCountFront = 7;
  for (let a = 0; a < tArchCountFront; a++) {
    const ax = (towerX - towerW / 2 + 0.38) + a * tArchW;
    if (ax <= towerX + towerW / 2 - 0.25) {
      const archTop = new THREE.TorusGeometry(tArchW * 0.40, 0.035, 6, 10, Math.PI);
      archTop.rotateZ(Math.PI);
      archTop.translate(ax, tFriezeY, towerFrontZ + 0.03);
      wallGeos.push(archTop);
    }
  }

  // Sidebuer på tårnets østside (højre side foran husfacaden)
  for (let az = houseD / 2 + 0.4; az <= towerFrontZ - 0.3; az += tArchW) {
    const archTop = new THREE.TorusGeometry(tArchW * 0.40, 0.035, 6, 10, Math.PI);
    archTop.rotateX(Math.PI);
    archTop.rotateY(Math.PI / 2);
    archTop.translate(towerRightX + 0.03, tFriezeY, az);
    wallGeos.push(archTop);
  }

  // Sidebuer på tårnets vestside (venstre side foran husfacaden)
  for (let az = houseD / 2 + 0.4; az <= towerFrontZ - 0.3; az += tArchW) {
    const archTop = new THREE.TorusGeometry(tArchW * 0.40, 0.035, 6, 10, Math.PI);
    archTop.rotateX(Math.PI);
    archTop.rotateY(-Math.PI / 2);
    archTop.translate(towerLeftX - 0.03, tFriezeY, az);
    wallGeos.push(archTop);
  }

  // MURTINDER (Crenellations / merlons på det flade tårntag)
  const merlonW = 0.50;
  const merlonH = 0.76;
  const merlonD = 0.34;
  const merlonTopY = towerWallH + 0.16 + merlonH / 2;

  // 5 murtinder på forsiden jvf. det nye foto!
  const frontMerlonXs = [-1.44, -0.72, 0.0, 0.72, 1.44];
  for (const rx of frontMerlonXs) {
    const mx = towerX + rx;
    const mz = towerFrontZ - merlonD / 2 + 0.08;
    const mGeo = new THREE.BoxGeometry(merlonW, merlonH, merlonD);
    mGeo.translate(mx, merlonTopY, mz);
    wallGeos.push(mGeo);

    // Kantsokkel / dæksten på tindens top
    const mCap = new THREE.BoxGeometry(merlonW + 0.06, 0.06, merlonD + 0.06);
    mCap.translate(mx, towerWallH + 0.16 + merlonH + 0.03, mz);
    stoneGeos.push(mCap);

    // Sne på tinden
    const mSnow = new THREE.BoxGeometry(merlonW + 0.04, 0.06, merlonD + 0.04);
    mSnow.translate(mx, towerWallH + 0.16 + merlonH + 0.065, mz);
    snowGeos.push(mSnow);

    // VÅBENSKJOLD / RELIEF-SKJOLD (monteret midt på hver af de 5 tinder jvf. fotoet!)
    const shieldW = 0.28;
    const shieldH = 0.34;
    const sShape = new THREE.Shape();
    sShape.moveTo(-shieldW / 2, shieldH / 2);
    sShape.lineTo(shieldW / 2, shieldH / 2);
    sShape.lineTo(shieldW / 2, -shieldH / 6);
    sShape.quadraticCurveTo(shieldW / 2, -shieldH / 2, 0, -shieldH / 2);
    sShape.quadraticCurveTo(-shieldW / 2, -shieldH / 2, -shieldW / 2, -shieldH / 6);
    sShape.closePath();

    const sExtrude = new THREE.ExtrudeGeometry(sShape, { depth: 0.045, bevelEnabled: false });
    sExtrude.translate(mx, merlonTopY + 0.02, mz + merlonD / 2 + 0.02);
    shieldGeos.push(sExtrude);
  }

  // Tinder på tårnets østside (højre side)
  const sideMerlonZs = [-2.0, -1.0, 0.0, 1.0, 2.0, 3.0];
  for (const rz of sideMerlonZs) {
    const mx = towerRightX - merlonD / 2 + 0.08;
    const mz = towerZ + rz;
    const mGeo = new THREE.BoxGeometry(merlonD, merlonH, merlonW);
    mGeo.translate(mx, merlonTopY, mz);
    wallGeos.push(mGeo);

    const mCap = new THREE.BoxGeometry(merlonD + 0.06, 0.06, merlonW + 0.06);
    mCap.translate(mx, towerWallH + 0.16 + merlonH + 0.03, mz);
    stoneGeos.push(mCap);
  }

  // Tinder på tårnets venstre side foran taget (z > 2.60)
  for (const mz of [3.0, 3.6]) {
    const mx = towerLeftX + merlonD / 2 - 0.08;
    const mGeo = new THREE.BoxGeometry(merlonD, merlonH, merlonW);
    mGeo.translate(mx, merlonTopY, mz);
    wallGeos.push(mGeo);

    const mCap = new THREE.BoxGeometry(merlonD + 0.06, 0.06, merlonW + 0.06);
    mCap.translate(mx, towerWallH + 0.16 + merlonH + 0.03, mz);
    stoneGeos.push(mCap);
  }

  // Fladt tårntag / platform med sne
  const tFloorSnow = new THREE.BoxGeometry(towerW - 0.3, 0.06, towerD - 0.3);
  tFloorSnow.translate(towerX, towerWallH + 0.17, towerZ);
  snowGeos.push(tFloorSnow);

  // =============================================================
  // 4. RUNDBUET PORT I TÅRNET (Autentisk dørform & placering jvf. fotoet!)
  // Placeret til HØJRE på tårnets forside, tilbagetrukket i murniche,
  // gyldenbrun lakeret egetræ, halvcirkulær rundbue foroven,
  // 2 kraftige smedejernsbånd med cirkulære led, og massivt granittrin.
  // =============================================================
  const doorW = 1.05;
  const doorH = 2.40;
  const doorRadius = doorW / 2; // 0.525m
  const straightH = doorH - doorRadius; // 1.875m
  // Placeret til højre på tårnets front (tårn x går fra -0.60 til +3.20)
  const doorX = 2.05;
  const doorZ = towerFrontZ; // 3.85 (tårnets forreste murflade)

  // 1. Massivt mørkt granit-dørtrin (rager ud foran tårnet)
  const stepThreshold = new THREE.BoxGeometry(doorW + 0.36, 0.16, 0.42);
  stepThreshold.translate(doorX, 0.08, doorZ + 0.18);
  stoneGeos.push(stepThreshold);

  // 2. Fysisk profileret stenkarm / portalramme (rager 10 cm frem foran tårnets murflade)
  const jambW = 0.16;
  const jambD = 0.10;
  const jambCenterZ = doorZ + jambD / 2; // 3.90

  // Venstre karm-pille
  const leftJamb = new THREE.BoxGeometry(jambW, straightH, jambD);
  leftJamb.translate(doorX - doorRadius - jambW / 2, 0.16 + straightH / 2, jambCenterZ);
  stoneGeos.push(leftJamb);

  // Højre karm-pille
  const rightJamb = new THREE.BoxGeometry(jambW, straightH, jambD);
  rightJamb.translate(doorX + doorRadius + jambW / 2, 0.16 + straightH / 2, jambCenterZ);
  stoneGeos.push(rightJamb);

  // Rundbuestik over karmen (buet stenoverligger)
  const archOuterR = doorRadius + jambW;
  const archInnerR = doorRadius;
  const archShape = new THREE.Shape();
  archShape.absarc(0, 0, archOuterR, 0, Math.PI, false);
  archShape.lineTo(-archInnerR, 0);
  archShape.absarc(0, 0, archInnerR, Math.PI, 0, true);
  archShape.closePath();
  const archGeom = new THREE.ExtrudeGeometry(archShape, { depth: jambD, bevelEnabled: false });
  archGeom.translate(doorX, 0.16 + straightH, doorZ);
  stoneGeos.push(archGeom);

  // 3. Den gyldne egetræsdør (Rundbuet, sidder solidt foran muren i portalen)
  const doorThickness = 0.06;
  const doorPlacementZ = doorZ + 0.02; // Fra z = 3.87 til 3.93 - 100% SYNLIG foran muren!
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-doorRadius, 0);
  doorShape.lineTo(doorRadius, 0);
  doorShape.lineTo(doorRadius, straightH);
  doorShape.absarc(0, straightH, doorRadius, 0, Math.PI, false);
  doorShape.lineTo(-doorRadius, 0);
  doorShape.closePath();

  const doorExtrude = new THREE.ExtrudeGeometry(doorShape, { depth: doorThickness, bevelEnabled: false });
  doorExtrude.translate(doorX, 0.16, doorPlacementZ);
  doorGeos.push(doorExtrude);

  // Lodrette egetræsfuger / brædder på dørens forside
  for (const bx of [-doorRadius * 0.5, 0, doorRadius * 0.5]) {
    const bead = new THREE.BoxGeometry(0.015, straightH + doorRadius * 0.65, 0.012);
    bead.translate(doorX + bx, 0.16 + (straightH + doorRadius * 0.65) / 2, doorPlacementZ + doorThickness + 0.006);
    woodGeos.push(bead);
  }

  // To sorte smedejernsbånd (hængsler) med cirkulære led & pilespidser jvf. fotoet
  for (const hy of [0.55, 1.78]) {
    const hingeBar = new THREE.BoxGeometry(doorW * 0.90, 0.05, 0.02);
    hingeBar.translate(doorX, hy, doorPlacementZ + doorThickness + 0.01);
    ironGeos.push(hingeBar);

    // Cirkulært ringornament midt på hængslet
    const hRing = new THREE.TorusGeometry(0.055, 0.014, 6, 12);
    hRing.translate(doorX, hy, doorPlacementZ + doorThickness + 0.015);
    ironGeos.push(hRing);

    // Pilespids mod venstre
    const hTip = new THREE.ConeGeometry(0.035, 0.07, 4);
    hTip.rotateZ(-Math.PI / 2);
    hTip.translate(doorX - doorW * 0.45 - 0.03, hy, doorPlacementZ + doorThickness + 0.01);
    ironGeos.push(hTip);
  }

  // Smedejerns-ringgreb på venstre side af døren
  const handleRing = new THREE.TorusGeometry(0.065, 0.015, 6, 12);
  handleRing.translate(doorX - 0.32, 1.15, doorPlacementZ + doorThickness + 0.018);
  ironGeos.push(handleRing);

  // Buet gangsti af chaussésten der fører ud fra døren
  for (let s = 1; s <= 7; s++) {
    const t = s / 7;
    const sx = doorX + Math.sin(t * 1.4) * 1.6;
    const sz = doorZ + 0.30 + t * 2.8;
    const stepStone = new THREE.BoxGeometry(0.80, 0.05, 0.55);
    stepStone.rotateY(t * 0.8);
    stepStone.translate(sx, 0.03, sz);
    stoneGeos.push(stepStone);
  }

  // Smalle skydeskår & lyssprækker i tårnet
  // Forsiden: 1 smalt skydeskår placeret mod midten/venstre for døren
  const tSlitFront = new THREE.BoxGeometry(0.16, 0.95, 0.10);
  tSlitFront.translate(1.10, 5.10, towerFrontZ + 0.02);
  unlitWindowGeos.push(tSlitFront);

  const tSlitSillF = new THREE.BoxGeometry(0.28, 0.06, 0.12);
  tSlitSillF.translate(1.10, 5.10 - 0.48, towerFrontZ + 0.02);
  stoneGeos.push(tSlitSillF);

  // Smedejerns-liljer (murankre) på tårnets forside
  addFleurDeLisAnchor(0.35, 5.10, towerFrontZ + 0.03, 0);
  addFleurDeLisAnchor(1.85, 5.10, towerFrontZ + 0.03, 0);

  // Tårnets vestside (over hovedtaget): 1 smalt skydeskår
  const tSlitWest = new THREE.BoxGeometry(0.10, 0.95, 0.16);
  tSlitWest.translate(towerLeftX - 0.02, 5.10, 3.25);
  unlitWindowGeos.push(tSlitWest);

  const tSlitSillW = new THREE.BoxGeometry(0.12, 0.06, 0.28);
  tSlitSillW.translate(towerLeftX - 0.02, 5.10 - 0.48, 3.25);
  stoneGeos.push(tSlitSillW);

  addFleurDeLisAnchor(towerLeftX - 0.03, 5.10, 2.75, Math.PI / 2);
  addFleurDeLisAnchor(towerLeftX - 0.03, 5.10, 3.75, Math.PI / 2);

  // =============================================================
  // 5. VINDUE-PLACERING PÅ FACADER & GAVLE (Præcis jvf. fotoet!)
  // =============================================================
  // 1. Facade venstre fløj: KUN 1 vindue helt ude til højre mod tårnet!
  //    Toppen flugter/rører rundbuefrisen. Ingen andre vinduer på facaden.
  // 2. Vestgavl 1. sal: 2 høje rundbuede vinduer (8 ruder) med sålbænk.
  // 3. Vestgavl stue: 1 smalt lodret skydeskår i midten, 1 sprossevindue mod forside.
  // 4. Facade højre fløj: INGEN vinduer (kun murværk & bænke/terrasse).
  // 5. Østgavl 1. sal: 1 buet vindue.
  const castleWindows = [
    // Facade venstre fløj: Vindue i hjørnet helt mod tårnet
    { x: towerLeftX - 0.55, y: 3.82, z: houseZ + houseD / 2 + 0.03, rotY: 0, w: 0.76, h: 0.95, isLit: true, isArched: false, isSlit: false },

    // Vestgavl 1. sal: 2 høje buede vinduer (symmetrisk om gavlen)
    { x: leftGableX - 0.04, y: 5.40, z: houseZ - 1.05, rotY: Math.PI / 2, w: 0.78, h: 1.65, isLit: true, isArched: true, isSlit: false },
    { x: leftGableX - 0.04, y: 5.40, z: houseZ + 1.05, rotY: Math.PI / 2, w: 0.78, h: 1.65, isLit: true, isArched: true, isSlit: false },

    // Vestgavl stueetage: 1 smalt skydeskår i midten
    { x: leftGableX - 0.04, y: 2.45, z: houseZ, rotY: Math.PI / 2, w: 0.16, h: 1.10, isLit: false, isArched: false, isSlit: true },

    // Vestgavl stueetage: 1 rektangulært vindue mod forsiden
    { x: leftGableX - 0.04, y: 2.25, z: houseZ + 1.45, rotY: Math.PI / 2, w: 0.82, h: 1.20, isLit: false, isArched: false, isSlit: false },

    // Østgavl 1. sal: 1 buet vindue
    { x: rightGableX + 0.04, y: 5.40, z: houseZ, rotY: -Math.PI / 2, w: 0.78, h: 1.55, isLit: true, isArched: true, isSlit: false },
  ];

  for (const win of castleWindows) {
    if (win.isSlit) {
      // Skydeskår har en enkel ramme og mørkt glas
      const slitGeo = new THREE.BoxGeometry(win.w + 0.08, win.h + 0.08, 0.04);
      slitGeo.rotateY(win.rotY);
      slitGeo.translate(win.x, win.y, win.z);
      windowFrameGeos.push(slitGeo);

      const sGlass = new THREE.PlaneGeometry(win.w, win.h);
      sGlass.rotateY(win.rotY);
      sGlass.translate(win.x + (win.rotY !== 0 ? (win.rotY > 0 ? -0.025 : 0.025) : 0), win.y, win.z);
      unlitWindowGeos.push(sGlass);

      const sill = new THREE.BoxGeometry(win.w + 0.12, 0.06, 0.10);
      sill.rotateY(win.rotY);
      sill.translate(win.x, win.y - win.h / 2 - 0.03, win.z);
      stoneGeos.push(sill);
      continue;
    }

    const fGeo = new THREE.BoxGeometry(win.w + 0.12, win.h + 0.12, 0.06);
    fGeo.rotateY(win.rotY);
    fGeo.translate(win.x, win.y, win.z);
    windowFrameGeos.push(fGeo);

    // Rundbue-overstykke på de buede vinduer
    if (win.isArched) {
      const archTop = new THREE.TorusGeometry(win.w / 2, 0.04, 6, 12, Math.PI);
      archTop.rotateZ(Math.PI);
      archTop.rotateY(win.rotY);
      archTop.translate(win.x, win.y + win.h / 2, win.z);
      windowFrameGeos.push(archTop);
    }

    const gGeo = new THREE.PlaneGeometry(win.w, win.h);
    gGeo.rotateY(win.rotY);
    gGeo.translate(
      win.x + (win.rotY !== 0 ? (win.rotY > 0 ? -0.035 : 0.035) : 0),
      win.y,
      win.z + (win.rotY === 0 ? 0.035 : 0)
    );
    if (win.isLit) {
      litWindowGeos.push(gGeo);
    } else {
      unlitWindowGeos.push(gGeo);
    }

    // Sandstenskarm / sålbænk under vinduet
    const sill = new THREE.BoxGeometry(win.w + 0.18, 0.07, 0.14);
    sill.rotateY(win.rotY);
    sill.translate(win.x, win.y - win.h / 2 - 0.035, win.z);
    stoneGeos.push(sill);
  }

  // Smedejerns-liljer på vestgavlen på hver side af 1. sals vinduerne
  addFleurDeLisAnchor(leftGableX - 0.04, 5.40, houseZ - 1.85, Math.PI / 2);
  addFleurDeLisAnchor(leftGableX - 0.04, 5.40, houseZ + 1.85, Math.PI / 2);

  // Grøn havebusk (hortensia / syren) foran venstre facade jvf. fotoet
  const facadeBush = new THREE.DodecahedronGeometry(0.70, 1);
  facadeBush.scale(1.2, 1.0, 1.1);
  facadeBush.translate(-2.40, 0.65, houseZ + houseD / 2 + 0.60);
  foliageGeos.push(facadeBush);

  // Cirkulær brolagt terrasse med stenbænke foran højre fløj jvf. fotoet
  const patioGeo = new THREE.CylinderGeometry(1.45, 1.45, 0.04, 18);
  patioGeo.translate(4.80, 0.02, 5.20);
  stoneGeos.push(patioGeo);

  // 3 stenbænke på terrassen
  // Bænk 1 (bagest)
  const bench1Top = new THREE.BoxGeometry(1.20, 0.08, 0.35);
  bench1Top.translate(4.80, 0.40, 6.25);
  stoneGeos.push(bench1Top);
  for (const bx of [-0.45, 0.45]) {
    const leg = new THREE.BoxGeometry(0.20, 0.36, 0.28);
    leg.translate(4.80 + bx, 0.18, 6.25);
    stoneGeos.push(leg);
  }

  // Bænk 2 (venstre)
  const bench2Top = new THREE.BoxGeometry(0.35, 0.08, 1.05);
  bench2Top.translate(3.75, 0.40, 5.20);
  stoneGeos.push(bench2Top);
  for (const bz of [-0.38, 0.38]) {
    const leg = new THREE.BoxGeometry(0.28, 0.36, 0.20);
    leg.translate(3.75, 0.18, 5.20 + bz);
    stoneGeos.push(leg);
  }

  // Bænk 3 (højre)
  const bench3Top = new THREE.BoxGeometry(0.35, 0.08, 1.05);
  bench3Top.translate(5.85, 0.40, 5.20);
  stoneGeos.push(bench3Top);
  for (const bz of [-0.38, 0.38]) {
    const leg = new THREE.BoxGeometry(0.28, 0.36, 0.20);
    leg.translate(5.85, 0.18, 5.20 + bz);
    stoneGeos.push(leg);
  }

  // =============================================================
  // 6. GÅRDSAREVÆG, PORTBYGNING, RUNDT HJØRNETÅRN & VINDEBRO (Venstre side)
  // Jvf. fotoet: Det lille runde tårn (pebersvøb) med kegletag for enden af broen
  // =============================================================
  const turretX = -8.2;
  const turretZ = 2.4;
  const turretR = 0.65;
  const turretH = 3.20;

  // Rundt tårn murkrop
  const turretCyl = new THREE.CylinderGeometry(turretR, turretR, turretH, 14);
  turretCyl.translate(turretX, turretH / 2, turretZ);
  wallGeos.push(turretCyl);

  // Sokkel på det runde tårn
  const turretBase = new THREE.CylinderGeometry(turretR + 0.08, turretR + 0.12, 0.35, 14);
  turretBase.translate(turretX, 0.175, turretZ);
  stoneGeos.push(turretBase);

  // Udkraget sten-gesims under kegletaget
  const turretCornice = new THREE.CylinderGeometry(turretR + 0.10, turretR + 0.04, 0.12, 14);
  turretCornice.translate(turretX, turretH + 0.06, turretZ);
  stoneGeos.push(turretCornice);

  // Spidst kegletag (pebersvøb) i orange vingetegl
  const coneH = 1.60;
  const coneR = turretR + 0.14;
  const turretCone = new THREE.ConeGeometry(coneR, coneH, 16);
  turretCone.translate(turretX, turretH + 0.12 + coneH / 2, turretZ);
  roofGeos.push(turretCone);

  // Spire / finial på toppen af det lille tårn
  const spire = new THREE.CylinderGeometry(0.02, 0.05, 0.45, 6);
  spire.translate(turretX, turretH + 0.12 + coneH + 0.22, turretZ);
  ironGeos.push(spire);

  // Sne på det lille tårns kegletag
  const coneSnow = new THREE.ConeGeometry(coneR - 0.02, coneH * 0.85, 14);
  coneSnow.translate(turretX, turretH + 0.14 + (coneH * 0.85) / 2, turretZ);
  snowGeos.push(coneSnow);

  // Mur der forbinder venstre gavl og hjørnetårnet
  const wallLen = Math.hypot(turretX - leftGableX, turretZ - (houseZ + 1.0));
  const wallAngle = Math.atan2(turretZ - (houseZ + 1.0), turretX - leftGableX);
  const wallMidX = (leftGableX + turretX) / 2;
  const wallMidZ = (houseZ + 1.0 + turretZ) / 2;
  const lowWallH = 2.40;

  const courtyardWall = new THREE.BoxGeometry(wallLen, lowWallH, 0.32);
  courtyardWall.rotateY(-wallAngle);
  courtyardWall.translate(wallMidX, lowWallH / 2, wallMidZ);
  wallGeos.push(courtyardWall);

  const wallCoping = new THREE.BoxGeometry(wallLen + 0.05, 0.08, 0.40);
  wallCoping.rotateY(-wallAngle);
  wallCoping.translate(wallMidX, lowWallH + 0.04, wallMidZ);
  stoneGeos.push(wallCoping);

  // Portbygning med lille sadeltag ved broen
  const gateX = turretX + 0.85;
  const gateZ = turretZ + 0.85;
  const gateRoof = new THREE.BoxGeometry(1.6, 0.12, 1.4);
  gateRoof.rotateZ(0.35);
  gateRoof.translate(gateX, lowWallH + 0.45, gateZ);
  roofGeos.push(gateRoof);

  // TRÆBRO / VINDEBRO OVER VOLDGRAVEN (Fra hjørnetårnet ud mod vejen)
  const bridgeX = turretX - 0.15;
  const bridgeZ = turretZ + 2.40;
  const bridgeLen = 4.2;
  const bridgeW = 1.35;
  const bridgeH = 0.45;

  // Broens egetræsplanker
  const bridgePlanks = new THREE.BoxGeometry(bridgeW, 0.08, bridgeLen);
  bridgePlanks.translate(bridgeX, bridgeH, bridgeZ);
  woodGeos.push(bridgePlanks);

  // Rækværk i træstolper & tværliggere
  for (const xSide of [-bridgeW / 2 + 0.05, bridgeW / 2 - 0.05]) {
    for (let p = 0; p <= 3; p++) {
      const pz = bridgeZ - bridgeLen / 2 + p * (bridgeLen / 3);
      const post = new THREE.BoxGeometry(0.09, 0.85, 0.09);
      post.translate(bridgeX + xSide, bridgeH + 0.42, pz);
      woodGeos.push(post);
    }
    const rail = new THREE.BoxGeometry(0.08, 0.06, bridgeLen);
    rail.translate(bridgeX + xSide, bridgeH + 0.82, bridgeZ);
    woodGeos.push(rail);
  }

  // Sne på broen
  const bridgeSnow = new THREE.BoxGeometry(bridgeW - 0.05, 0.06, bridgeLen);
  bridgeSnow.translate(bridgeX, bridgeH + 0.05, bridgeZ);
  snowGeos.push(bridgeSnow);

  // =============================================================
  // 7. VOLDGRAVEN, KAMPPESTENS-BRINKEN & HAVEPLANTER
  // Jvf. fotoet: Smuk voldgrav omkranset af massiv kampestensmur
  // =============================================================
  const moatRInner = 7.8;
  const moatROuter = 12.6;
  const moatY = 0.02;
  const moatCenter = new THREE.Vector2(0.5, 0.8);

  // Spejlende vandflade i en bue foran og om slottet
  const waterGeo = new THREE.RingGeometry(moatRInner, moatROuter, 32, 1, 0, Math.PI * 1.35);
  waterGeo.rotateX(-Math.PI / 2);
  waterGeo.rotateY(0.35);
  waterGeo.translate(moatCenter.x, moatY, moatCenter.y);
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  // KÆMPE MARKSTENS-VOLD (Piled rounded fieldstones along the moat bank)
  let stoneRand = 421;
  const nextRand = () => {
    stoneRand = (stoneRand * 9301 + 49297) % 233280;
    return stoneRand / 233280;
  };

  const boulderCount = 84;
  for (let b = 0; b < boulderCount; b++) {
    const frac = b / boulderCount;
    const angle = 0.35 + frac * Math.PI * 1.32;
    const rDist = moatRInner - 0.15 + (nextRand() - 0.5) * 0.40;
    const bx = moatCenter.x + Math.cos(angle) * rDist;
    const bz = moatCenter.y + Math.sin(angle) * rDist;
    const bRadius = 0.22 + nextRand() * 0.24;

    const bGeo = new THREE.DodecahedronGeometry(bRadius, 1);
    bGeo.scale(1.0 + nextRand() * 0.3, 0.75 + nextRand() * 0.25, 0.9 + nextRand() * 0.3);
    bGeo.translate(bx, bRadius * 0.55, bz);
    stoneGeos.push(bGeo);

    // Dobbelt række sten på skråningen
    if (b % 2 === 0) {
      const b2x = moatCenter.x + Math.cos(angle) * (rDist - 0.42);
      const b2z = moatCenter.y + Math.sin(angle) * (rDist - 0.42);
      const b2Geo = new THREE.DodecahedronGeometry(bRadius * 0.88, 1);
      b2Geo.scale(1.1, 0.7, 0.95);
      b2Geo.translate(b2x, bRadius * 0.85, b2z);
      stoneGeos.push(b2Geo);
    }
  }

  // Grøn havebeplantning foran slottet (enebær / thuja / buske jvf. fotoet)
  const shrubConfigs = [
    { x: -1.2, z: 4.8, h: 1.8, r: 0.45 }, // Kegleformet mørkegrøn enebær
    { x: +0.6, z: 6.2, h: 2.4, r: 0.55 }, // Højere slank conifer midt i forhaven
    { x: +3.8, z: 5.5, h: 1.4, r: 0.50 }, // Lav busk ved højre fløj
    { x: +5.4, z: 4.6, h: 1.2, r: 0.60 }, // Spredt beplantning
    { x: -3.5, z: 4.2, h: 1.1, r: 0.55 },
  ];

  for (const sc of shrubConfigs) {
    const shrubGeo = new THREE.ConeGeometry(sc.r, sc.h, 7);
    shrubGeo.translate(sc.x, sc.h / 2, sc.z);
    foliageGeos.push(shrubGeo);

    // Sne på buskene
    const sSnow = new THREE.ConeGeometry(sc.r * 0.85, sc.h * 0.45, 7);
    sSnow.translate(sc.x, sc.h * 0.75, sc.z);
    snowGeos.push(sSnow);
  }

  // RUSTIKT RAFTEHEGN / KASTANJEHEGN (langs yderkanten mod vejen jvf. fotoet)
  const fenceCount = 38;
  for (let f = 0; f < fenceCount; f++) {
    const frac = f / fenceCount;
    const angle = 0.40 + frac * Math.PI * 1.26;
    const rDist = moatROuter + 0.45;
    const fx = moatCenter.x + Math.cos(angle) * rDist;
    const fz = moatCenter.y + Math.sin(angle) * rDist;

    // Pæl
    if (f % 4 === 0) {
      const post = new THREE.CylinderGeometry(0.06, 0.06, 0.95, 6);
      post.translate(fx, 0.47, fz);
      woodGeos.push(post);
    }

    // Lodrette rafte-stave
    const paling = new THREE.BoxGeometry(0.04, 0.75 + (f % 3) * 0.08, 0.04);
    paling.translate(fx, 0.40, fz);
    woodGeos.push(paling);
  }

  // =============================================================
  // 8. MESH-MERGING FOR MINIMALE DRAW CALLS
  // =============================================================
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

  if (wallGeos.length) group.add(new THREE.Mesh(safeMerge(wallGeos), wallMat));
  if (roofGeos.length) group.add(new THREE.Mesh(safeMerge(roofGeos), roofMat));
  if (stoneGeos.length) group.add(new THREE.Mesh(safeMerge(stoneGeos), stoneMat));
  if (shieldGeos.length) group.add(new THREE.Mesh(safeMerge(shieldGeos), shieldMat));
  if (woodGeos.length) group.add(new THREE.Mesh(safeMerge(woodGeos), woodMat));
  if (doorGeos.length) group.add(new THREE.Mesh(safeMerge(doorGeos), doorWoodMat));
  if (ironGeos.length) group.add(new THREE.Mesh(safeMerge(ironGeos), ironMetalMat));
  if (foliageGeos.length) group.add(new THREE.Mesh(safeMerge(foliageGeos), foliageMat));
  if (windowFrameGeos.length) group.add(new THREE.Mesh(safeMerge(windowFrameGeos), windowFrameMat));
  if (unlitWindowGeos.length) group.add(new THREE.Mesh(safeMerge(unlitWindowGeos), windowUnlitMat));

  let litWindowsMesh: THREE.Mesh | null = null;
  if (litWindowGeos.length) {
    litWindowsMesh = new THREE.Mesh(safeMerge(litWindowGeos), windowLitMat);
    group.add(litWindowsMesh);
  }

  let snowMesh: THREE.Mesh | null = null;
  if (snowGeos.length) {
    snowMesh = new THREE.Mesh(safeMerge(snowGeos), snowMat);
    snowMesh.visible = false;
    group.add(snowMesh);
  }

  // -------------------------------------------------------------
  // STATE & VEJRSTYRING
  // -------------------------------------------------------------
  let currentSnow = 0;
  let currentFrost = 0;

  return {
    group,

    update(_dt: number): void {
      // Ingen unødige CPU beregninger i idle loop
    },

    setDate(_date: Date): void {},

    setWinterWeather(snow: number, frost: number): void {
      currentSnow = THREE.MathUtils.clamp(snow, 0, 1);
      currentFrost = THREE.MathUtils.clamp(frost, 0, 1);

      if (snowMesh) {
        snowMesh.visible = currentSnow > 0.02;
        snowMat.opacity = Math.min(1.0, currentSnow * 1.05);
      }

      const frostBlend = Math.max(currentFrost * 0.45, currentSnow * 0.7);
      wallMat.color.copy(wallBaseColor).lerp(new THREE.Color(0xb2b6bc), frostBlend * 0.4);
      roofMat.color.copy(roofBaseColor).lerp(new THREE.Color(0xa85c46), frostBlend * 0.35);
      doorWoodMat.color.copy(doorWoodColor).lerp(new THREE.Color(0xd2b588), frostBlend * 0.35);
    },

    setDaylight(solarAltitude: number): void {
      const eveningBlend = 1.0 - THREE.MathUtils.clamp((solarAltitude - (-6)) / (4 - (-6)), 0, 1);
      if (eveningBlend > 0.02) {
        windowLitMat.color.setHex(0xffaa44);
        windowLitMat.emissive.setHex(0xff8c20);
        windowLitMat.emissiveIntensity = eveningBlend * 1.6;
      } else {
        windowLitMat.color.setHex(0x1a222a);
        windowLitMat.emissive.setHex(0x000000);
        windowLitMat.emissiveIntensity = 0;
      }
    },
  };
}
