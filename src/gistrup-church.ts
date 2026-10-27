import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface GistrupChurch {
  group: THREE.Group;
  update(dt: number): void;
  setDate(date: Date): void;
  setWinterWeather(snow: number, frost: number): void;
  setDaylight(solarAltitude: number): void;
}

/**
 * Gistrup Kirke (indviet 1985, tegnet af Inger og Johannes Exner).
 * Karakteristisk moderne hvidkalket dansk kirkearkitektur:
 * - Markant, slankt og højt hvidt klokketårn (~15.2m højt) med skråt pulttag,
 *   sorte lodrette lydglugger med lameller, og et slankt mørkt kors på toppen.
 * - Højre fløj (kirkerummet): pulttag der skråner mod højre, med en markant
 *   høj sprossevinduessøjle ved tårnet, og et kampestensdige/stengærde ved soklen.
 * - Venstre fløj (indgang & menighedslokaler): pulttag med den karakteristiske
 *   kongeblå indgangsdør og vinduesbånd.
 * - Brolagt forplads med rundgang og bøgehæk jvf. brugerens referencefotos.
 */
export function createGistrupChurch(): GistrupChurch {
  const group = new THREE.Group();
  group.name = 'gistrup-church';

  // Placering mod Syd:
  // x ≈ -2.0, y = 0, z ≈ 27.0
  const baseX = -2.0;
  const baseY = 0.0;
  const baseZ = 27.0;
  group.position.set(baseX, baseY, baseZ);

  // ========================================================================
  // MATERIALER
  // ========================================================================
  // Ren hvidkalket murværk / vandskuret facade
  const wallBaseColor = new THREE.Color(0xf7f8f9);
  const wallMat = new THREE.MeshStandardMaterial({
    color: wallBaseColor.clone(),
    roughness: 0.88,
    metalness: 0.02,
  });

  // Mørk zink / koksgrå skifertag på pulttage og tårntag
  const roofBaseColor = new THREE.Color(0x2d3034);
  const roofDarkMat = new THREE.MeshStandardMaterial({
    color: roofBaseColor.clone(),
    roughness: 0.68,
    metalness: 0.22,
  });

  // Den karakteristiske kongeblå kirkedør (jvf. fotoet)
  const blueDoorMat = new THREE.MeshStandardMaterial({
    color: 0x1b58a2,
    roughness: 0.52,
    metalness: 0.06,
  });

  // Sorte aluminiums-vinduesrammer, sprosser og sternlister
  const darkFrameMat = new THREE.MeshStandardMaterial({
    color: 0x18191b,
    roughness: 0.55,
    metalness: 0.45,
  });

  // Sorte lydglugge-lameller i klokketårnet
  const louverMat = new THREE.MeshStandardMaterial({
    color: 0x141517,
    roughness: 0.75,
    metalness: 0.35,
  });

  // Mørkt smedejern / stål til korset på tårnets top
  const crossMat = new THREE.MeshStandardMaterial({
    color: 0x222326,
    roughness: 0.45,
    metalness: 0.85,
  });

  // Kirkeglas: reflekterende om dagen, varm gylden aften/natteglød
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x242c33,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0.0,
    roughness: 0.22,
    metalness: 0.65,
    transparent: true,
    opacity: 0.92,
  });

  // Marksten / kampesten til stengærdet ved korets sokkel
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x726e68,
    roughness: 0.94,
    metalness: 0.04,
  });

  // Lav klippet hæk / buskads på stengærdet
  const hedgeGreenMat = new THREE.MeshStandardMaterial({
    color: 0x334d28,
    roughness: 0.92,
  });

  // Bøgehæk i vinter/efterårsfarve (gyldenbrun) om kirkearealet
  const beechHedgeMat = new THREE.MeshStandardMaterial({
    color: 0x5a3d28,
    roughness: 0.95,
  });

  // Brolægning på forpladsen
  const courtyardMat = new THREE.MeshStandardMaterial({
    color: 0x82807a,
    roughness: 0.90,
  });

  // Snelag til tage og tårntop i vintervejr
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf2f7fc,
    roughness: 0.85,
    metalness: 0.02,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  // Geometrisamlinger til merging
  const wallGeos: THREE.BufferGeometry[] = [];
  const roofGeos: THREE.BufferGeometry[] = [];
  const frameGeos: THREE.BufferGeometry[] = [];
  const louverGeos: THREE.BufferGeometry[] = [];
  const glassGeos: THREE.BufferGeometry[] = [];
  const stoneGeos: THREE.BufferGeometry[] = [];
  const hedgeGeos: THREE.BufferGeometry[] = [];
  const snowGeos: THREE.BufferGeometry[] = [];

  // ========================================================================
  // 1. FORPLADS & BROLÆGNING (Courtyard paving)
  // ========================================================================
  const courtGeo = new THREE.BoxGeometry(22.0, 0.14, 12.0);
  courtGeo.translate(-1.0, 0.05, -3.0);
  const courtMesh = new THREE.Mesh(courtGeo, courtyardMat);
  courtMesh.receiveShadow = true;
  group.add(courtMesh);

  // Cirkulær brolægnings-roset foran indgangen jvf. fotoet
  const circlePaveGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.16, 24);
  circlePaveGeo.translate(-1.0, 0.06, -1.8);
  const circlePaveMesh = new THREE.Mesh(circlePaveGeo, stoneMat);
  circlePaveMesh.receiveShadow = true;
  group.add(circlePaveMesh);

  // ========================================================================
  // 2. KLOKKETÅRNET (The iconic monolithic white bell tower)
  // ~15.2m højt, slankt, pulttag med fald bagud/til højre, mørkt kors og lydglugger
  // ========================================================================
  const tW = 3.0;
  const tD = 3.4;
  const tWallH = 14.0;
  const tPeakH = 15.2;
  const tSlopeH = tPeakH - tWallH; // 1.2m skråning

  // Tårnets massive hvide krop
  const tBody = new THREE.BoxGeometry(tW, tWallH, tD);
  tBody.translate(0, tWallH / 2, tD / 2);
  wallGeos.push(tBody);

  // Tårnets skrå pulttag-top (skråner ned fra for-venstre mod bag-højre)
  const tRoofShape = new THREE.Shape();
  tRoofShape.moveTo(-tW / 2, 0);
  tRoofShape.lineTo(tW / 2, 0);
  tRoofShape.lineTo(tW / 2, tSlopeH * 0.4);
  tRoofShape.lineTo(-tW / 2, tSlopeH);
  tRoofShape.closePath();

  const tRoofExtrude = new THREE.ExtrudeGeometry(tRoofShape, { depth: tD, bevelEnabled: false });
  tRoofExtrude.translate(0, tWallH, 0);
  wallGeos.push(tRoofExtrude);

  // Zinkinddækning / metalkant på tårnets pulttag
  const tRoofCap = new THREE.BoxGeometry(tW + 0.16, 0.12, tD + 0.16);
  tRoofCap.rotateZ(-Math.atan2(tSlopeH * 0.6, tW));
  tRoofCap.translate(0, tWallH + tSlopeH * 0.65, tD / 2);
  roofGeos.push(tRoofCap);

  // Snelag på tårnets tag
  const tSnow = new THREE.BoxGeometry(tW + 0.12, 0.08, tD + 0.12);
  tSnow.rotateZ(-Math.atan2(tSlopeH * 0.6, tW));
  tSnow.translate(0, tWallH + tSlopeH * 0.65 + 0.06, tD / 2);
  snowGeos.push(tSnow);

  // LYDGLUGGER (Lydåbninger for kirkeklokkerne med sorte lameller)
  // Forreste lydglugge: lodret smal åbning mod haven/forpladsen (z = 0)
  const louverSlotW = 0.45;
  const louverSlotH = 2.65;
  const louverSlotX = -0.75;
  const louverSlotY = 12.0;

  // Forsænket sort baggrund
  const lSlotFront = new THREE.BoxGeometry(louverSlotW, louverSlotH, 0.12);
  lSlotFront.translate(louverSlotX, louverSlotY, 0.05);
  louverGeos.push(lSlotFront);

  // Horisontale sorte lameller i forreste lydglugge
  const louverBladeCount = 8;
  for (let b = 0; b < louverBladeCount; b++) {
    const by = louverSlotY - louverSlotH / 2 + 0.18 + b * (louverSlotH / louverBladeCount);
    const blade = new THREE.BoxGeometry(louverSlotW + 0.04, 0.05, 0.08);
    blade.translate(louverSlotX, by, 0.02);
    louverGeos.push(blade);
  }

  // Højre lydglugge: lodret åbning på tårnets østside (x = tW / 2 = 1.5)
  const lSlotSide = new THREE.BoxGeometry(0.12, louverSlotH, louverSlotW);
  lSlotSide.translate(tW / 2 - 0.05, louverSlotY, 1.2);
  louverGeos.push(lSlotSide);

  for (let b = 0; b < louverBladeCount; b++) {
    const by = louverSlotY - louverSlotH / 2 + 0.18 + b * (louverSlotH / louverBladeCount);
    const blade = new THREE.BoxGeometry(0.08, 0.05, louverSlotW + 0.04);
    blade.translate(tW / 2 + 0.02, by, 1.2);
    louverGeos.push(blade);
  }

  // KORSET (Slankt mørkt latinsk kors monteret på tårnets top jvf. fotoet)
  const crossGroup = new THREE.Group();
  crossGroup.name = 'gistrup-church-cross';
  crossGroup.position.set(louverSlotX, tPeakH, 0.08);
  const crossVert = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.45, 0.09), crossMat);
  crossVert.position.y = 0.55;
  const crossHoriz = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.09, 0.09), crossMat);
  crossHoriz.position.y = 0.85;
  crossGroup.add(crossVert, crossHoriz);
  group.add(crossGroup);

  // =============================================================
  // 3. HØJRE FLØJ (Kirkerummet / Salen med pulttag & stort vindue)
  // Jvf. fotoet: Slutter op mod tårnets højre mur og skråner mod højre
  // =============================================================
  const naveStartX = tW / 2; // +1.50
  const naveW = 6.8;
  const naveD = 9.2;
  const naveRidgeH = 8.6; // Højeste punkt mod tårnmuren
  const naveEavesH = 5.2; // Laveste punkt mod højre ydergavl
  const naveSlopeAngle = Math.atan2(naveRidgeH - naveEavesH, naveW);
  const naveSlopeLen = Math.hypot(naveW + 0.35, naveRidgeH - naveEavesH);

  // Mure: Krop op til 5.2m
  const naveBaseWalls = new THREE.BoxGeometry(naveW, naveEavesH, naveD);
  naveBaseWalls.translate(naveStartX + naveW / 2, naveEavesH / 2, naveD / 2);
  wallGeos.push(naveBaseWalls);

  // Skrå trekantmur foran og bagved
  for (const zSign of [0, naveD]) {
    const triShape = new THREE.Shape();
    triShape.moveTo(0, 0);
    triShape.lineTo(naveW, 0);
    triShape.lineTo(0, naveRidgeH - naveEavesH);
    triShape.closePath();

    const triGeo = new THREE.ExtrudeGeometry(triShape, { depth: 0.32, bevelEnabled: false });
    triGeo.translate(naveStartX, naveEavesH, zSign === 0 ? 0 : naveD - 0.32);
    wallGeos.push(triGeo);
  }

  // Pulttag i mørk zink/skifer
  const naveRoof = new THREE.BoxGeometry(naveSlopeLen, 0.16, naveD + 0.50);
  naveRoof.rotateZ(-naveSlopeAngle);
  naveRoof.translate(naveStartX + naveW / 2 + 0.12, (naveRidgeH + naveEavesH) / 2 + 0.08, naveD / 2);
  roofGeos.push(naveRoof);

  // Snelag på kirkerummets tag
  const naveSnow = new THREE.BoxGeometry(naveSlopeLen * 0.98, 0.08, (naveD + 0.45) * 0.98);
  naveSnow.rotateZ(-naveSlopeAngle);
  naveSnow.translate(naveStartX + naveW / 2 + 0.12, (naveRidgeH + naveEavesH) / 2 + 0.17, naveD / 2);
  snowGeos.push(naveSnow);

  // DET STORE HØJE VINDUE PÅ FORFACADEN (Jvf. fotoet)
  // Søjle af mørke sprosser og glas ved siden af tårnet
  const winW = 1.95;
  const winH = 7.20;
  const winX = naveStartX + winW / 2 + 0.18;
  const winZ = 0.02;

  // Glasflade
  const winGlass = new THREE.PlaneGeometry(winW, winH);
  winGlass.translate(winX, winH / 2 + 0.6, winZ);
  glassGeos.push(winGlass);

  // Ydre vinduesramme
  const wFrameGeo = new THREE.BoxGeometry(winW + 0.12, winH + 0.12, 0.08);
  wFrameGeo.translate(winX, winH / 2 + 0.6, winZ);
  frameGeos.push(wFrameGeo);

  // Lodret midtersprosse
  const wMidMullion = new THREE.BoxGeometry(0.06, winH, 0.08);
  wMidMullion.translate(winX, winH / 2 + 0.6, winZ + 0.02);
  frameGeos.push(wMidMullion);

  // Tværsprosser (5 vandrette felter)
  const tierCount = 5;
  for (let t = 1; t < tierCount; t++) {
    const ty = 0.6 + t * (winH / tierCount);
    const transom = new THREE.BoxGeometry(winW, 0.06, 0.08);
    transom.translate(winX, ty, winZ + 0.02);
    frameGeos.push(transom);
  }

  // KAMPESTENSDIGE / STENGÆRDE (Jvf. fotoet: Naturlig stensokkel ved korets fod)
  const dikeW = 5.6;
  const dikeH = 0.85;
  const dikeD = 1.1;
  const dikeX = naveStartX + 2.6;
  const dikeZ = -0.55;

  // Runde kampesten langs soklen
  let stoneSeed = 3891;
  const nextStoneRand = () => {
    stoneSeed = (stoneSeed * 9301 + 49297) % 233280;
    return stoneSeed / 233280;
  };

  const boulderCols = 11;
  for (let c = 0; c < boulderCols; c++) {
    for (let r = 0; r < 2; r++) {
      const bx = dikeX - dikeW / 2 + 0.35 + c * 0.48;
      const by = 0.22 + r * 0.38;
      const bz = dikeZ + (nextStoneRand() - 0.5) * 0.15;
      const bRadius = 0.22 + nextStoneRand() * 0.08;

      const bGeo = new THREE.DodecahedronGeometry(bRadius, 1);
      bGeo.scale(1.1, 0.85, 1.0);
      bGeo.translate(bx, by, bz);
      stoneGeos.push(bGeo);
    }
  }

  // Klippet lav hæk på toppen af stengærdet jvf. fotoet
  const dikeHedge = new THREE.BoxGeometry(dikeW - 0.2, 0.38, dikeD * 0.85);
  dikeHedge.translate(dikeX, dikeH + 0.19, dikeZ);
  hedgeGeos.push(dikeHedge);

  // =============================================================
  // 4. VENSTRE FLØJ (Indgangsparti med kongeblå dør & sognegård)
  // Jvf. fotoet: Pulttag skråner ned mod venstre
  // =============================================================
  const leftStartX = -tW / 2; // -1.50
  const leftW = 8.6;
  const leftD = 7.4;
  const leftRidgeH = 6.8; // Højeste punkt mod tårnmuren
  const leftEavesH = 3.6; // Laveste punkt mod venstre
  const leftSlopeAngle = Math.atan2(leftRidgeH - leftEavesH, leftW);
  const leftSlopeLen = Math.hypot(leftW + 0.35, leftRidgeH - leftEavesH);

  // Hovedmure i venstre fløj
  const leftBaseWalls = new THREE.BoxGeometry(leftW, leftEavesH, leftD);
  leftBaseWalls.translate(leftStartX - leftW / 2, leftEavesH / 2, leftD / 2);
  wallGeos.push(leftBaseWalls);

  // Skrå trekantmur
  const leftTriShape = new THREE.Shape();
  leftTriShape.moveTo(0, 0);
  leftTriShape.lineTo(-leftW, 0);
  leftTriShape.lineTo(0, leftRidgeH - leftEavesH);
  leftTriShape.closePath();

  const leftTriGeo = new THREE.ExtrudeGeometry(leftTriShape, { depth: 0.32, bevelEnabled: false });
  leftTriGeo.translate(leftStartX, leftEavesH, 0);
  wallGeos.push(leftTriGeo);

  // Pulttag over venstre fløj
  const leftRoof = new THREE.BoxGeometry(leftSlopeLen, 0.16, leftD + 0.45);
  leftRoof.rotateZ(leftSlopeAngle);
  leftRoof.translate(leftStartX - leftW / 2 - 0.12, (leftRidgeH + leftEavesH) / 2 + 0.08, leftD / 2);
  roofGeos.push(leftRoof);

  // Snelag over venstre fløj
  const leftSnow = new THREE.BoxGeometry(leftSlopeLen * 0.98, 0.08, (leftD + 0.40) * 0.98);
  leftSnow.rotateZ(leftSlopeAngle);
  leftSnow.translate(leftStartX - leftW / 2 - 0.12, (leftRidgeH + leftEavesH) / 2 + 0.17, leftD / 2);
  snowGeos.push(leftSnow);

  // DEN KONGEBLÅ KIRKEDØR (Gistrup Kirkes velkendte signatur jvf. fotoet!)
  const doorW = 1.25;
  const doorH = 2.40;
  const doorX = leftStartX - 0.95;
  const doorZ = 0.04;

  const blueDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.08), blueDoorMat);
  blueDoorMesh.name = 'gistrup-church-blue-door';
  blueDoorMesh.position.set(doorX, doorH / 2 + 0.05, doorZ);
  blueDoorMesh.castShadow = true;
  group.add(blueDoorMesh);

  // Dørramme i mørk profil
  const doorFrame = new THREE.BoxGeometry(doorW + 0.14, doorH + 0.14, 0.06);
  doorFrame.translate(doorX, doorH / 2 + 0.05, doorZ);
  frameGeos.push(doorFrame);

  // Dørgreb i stål
  const handleGeo = new THREE.BoxGeometry(0.04, 0.35, 0.06);
  handleGeo.translate(doorX + doorW / 2 - 0.15, 1.05, doorZ + 0.06);
  frameGeos.push(handleGeo);

  // Højloftet glasfelt over og til venstre for døren
  const clereW = 2.6;
  const clereH = 2.8;
  const clereX = leftStartX - 2.8;
  const clereGlass = new THREE.PlaneGeometry(clereW, clereH);
  clereGlass.translate(clereX, clereH / 2 + 1.2, 0.02);
  glassGeos.push(clereGlass);

  const clereFrame = new THREE.BoxGeometry(clereW + 0.10, clereH + 0.10, 0.06);
  clereFrame.translate(clereX, clereH / 2 + 1.2, 0.02);
  frameGeos.push(clereFrame);

  // Vinduesbånd på sognegårds-fløjen mod venstre (jvf. fotoet)
  const bandW = 3.6;
  const bandH = 1.6;
  const bandX = leftStartX - 6.2;
  const bandGlass = new THREE.PlaneGeometry(bandW, bandH);
  bandGlass.translate(bandX, bandH / 2 + 1.1, 0.02);
  glassGeos.push(bandGlass);

  const bandFrame = new THREE.BoxGeometry(bandW + 0.10, bandH + 0.10, 0.06);
  bandFrame.translate(bandX, bandH / 2 + 1.1, 0.02);
  frameGeos.push(bandFrame);

  for (let s = 1; s <= 3; s++) {
    const sx = bandX - bandW / 2 + s * (bandW / 4);
    const sMullion = new THREE.BoxGeometry(0.06, bandH, 0.08);
    sMullion.translate(sx, bandH / 2 + 1.1, 0.03);
    frameGeos.push(sMullion);
  }

  // =============================================================
  // 5. BØGEHÆK & FLAGSTANG I KIRKEHAVEN (Jvf. foto 2)
  // =============================================================
  // Klippet brunlig bøgehæk om forpladsen
  const hedgeThick = 0.65;
  const hedgeH = 1.25;

  // Hækstykke foran mod haven/parken
  const hFrontLeft = new THREE.BoxGeometry(6.5, hedgeH, hedgeThick);
  hFrontLeft.translate(-5.5, hedgeH / 2, -6.0);
  const hFrontRight = new THREE.BoxGeometry(6.5, hedgeH, hedgeThick);
  hFrontRight.translate(4.5, hedgeH / 2, -6.0);
  const beechMesh1 = new THREE.Mesh(hFrontLeft, beechHedgeMat);
  const beechMesh2 = new THREE.Mesh(hFrontRight, beechHedgeMat);
  group.add(beechMesh1, beechMesh2);

  // Kirkegårdens hvide flagstang (jvf. foto 2)
  const flagpoleGeo = new THREE.CylinderGeometry(0.06, 0.08, 9.5, 8);
  flagpoleGeo.translate(2.4, 9.5 / 2, -4.2);
  const flagpoleMesh = new THREE.Mesh(flagpoleGeo, wallMat);
  const flagKnob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), darkFrameMat);
  flagKnob.position.set(2.4, 9.55, -4.2);
  group.add(flagpoleMesh, flagKnob);

  // =============================================================
  // 6. MESH MERGING FOR MINIMALE DRAW CALLS
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
  if (roofGeos.length) group.add(new THREE.Mesh(safeMerge(roofGeos), roofDarkMat));
  if (frameGeos.length) group.add(new THREE.Mesh(safeMerge(frameGeos), darkFrameMat));
  if (louverGeos.length) group.add(new THREE.Mesh(safeMerge(louverGeos), louverMat));
  if (stoneGeos.length) group.add(new THREE.Mesh(safeMerge(stoneGeos), stoneMat));
  if (hedgeGeos.length) group.add(new THREE.Mesh(safeMerge(hedgeGeos), hedgeGreenMat));

  let glassMesh: THREE.Mesh | null = null;
  if (glassGeos.length) {
    glassMesh = new THREE.Mesh(safeMerge(glassGeos), glassMat);
    group.add(glassMesh);
  }

  let snowMesh: THREE.Mesh | null = null;
  if (snowGeos.length) {
    snowMesh = new THREE.Mesh(safeMerge(snowGeos), snowMat);
    snowMesh.visible = false;
    group.add(snowMesh);
  }

  // ========================================================================
  // 7. OPKALD & VEJRSTYRING
  // ========================================================================
  let snowLevel = 0;
  let frostLevel = 0;
  let solarAlt = 45;
  let animTime = 0;

  function updateChurchVisuals() {
    const effectiveSnow = Math.max(snowLevel * 0.95, frostLevel * 0.35);
    snowMat.opacity = THREE.MathUtils.clamp(effectiveSnow * 1.1, 0, 0.95);
    snowMat.visible = effectiveSnow > 0.02;

    if (snowLevel > 0.1) {
      wallMat.color.setHex(0xfafcff);
    } else if (frostLevel > 0.1) {
      wallMat.color.setHex(0xf0f4f8);
    } else {
      wallMat.color.copy(wallBaseColor);
    }
  }

  updateChurchVisuals();

  return {
    group,
    update(dt: number) {
      animTime += dt;
      if (solarAlt < 4.0) {
        const glowFactor = THREE.MathUtils.clamp((4.0 - solarAlt) / 9.0, 0.0, 1.0);
        const flicker = 0.95 + 0.05 * Math.sin(animTime * 1.6) * Math.cos(animTime * 2.3);
        glassMat.emissive.setHex(0xffaa38);
        glassMat.emissiveIntensity = glowFactor * flicker * 1.45;
      } else {
        glassMat.emissiveIntensity = 0.0;
      }
    },
    setDate(_date: Date) {
      updateChurchVisuals();
    },
    setWinterWeather(snow: number, frost: number) {
      snowLevel = THREE.MathUtils.clamp(snow, 0, 1);
      frostLevel = THREE.MathUtils.clamp(frost, 0, 1);
      updateChurchVisuals();
    },
    setDaylight(solarAltitude: number) {
      solarAlt = solarAltitude;
      if (solarAlt < 4.0) {
        const glowFactor = THREE.MathUtils.clamp((4.0 - solarAlt) / 9.0, 0.0, 1.0);
        glassMat.emissive.setHex(0xffaa38);
        glassMat.emissiveIntensity = glowFactor * 1.45;
      } else {
        glassMat.emissiveIntensity = 0.0;
      }
    },
  };
}
