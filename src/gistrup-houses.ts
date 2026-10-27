import * as THREE from 'three';

export interface GistrupHouses {
  group: THREE.Group;
  update(windTime: number, windStrength: number, dt: number): void;
  setDate(date: Date): void;
  setWinterWeather(snow: number, frost: number): void;
  setDaylight(solarAltitude: number): void;
}

/**
 * Creates authentic Dannebrog flag texture (Danish national flag)
 * Red field (#c8102e) with off-center white Nordic cross.
 */
function createDannebrogTexture(): THREE.Texture {
  if (typeof document === 'undefined') {
    const data = new Uint8Array([200, 16, 46, 255]);
    const tex = new THREE.DataTexture(data, 1, 1);
    tex.needsUpdate = true;
    return tex;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 148;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;

  // Official Danish flag red
  ctx.fillStyle = '#c8102e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // White cross
  ctx.fillStyle = '#ffffff';
  const crossWidth = 16;
  const crossX = 44; // 12/37 ratio from hoist
  const crossY = (canvas.height - crossWidth) / 2;

  // Vertical arm
  ctx.fillRect(crossX, 0, crossWidth, canvas.height);
  // Horizontal arm
  ctx.fillRect(0, crossY, canvas.width, crossWidth);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Creates authentic Danish Vimpel texture (long ribbon pennant)
 * Top half red (#c8102e), bottom half white (#ffffff).
 */
function createVimpelTexture(): THREE.Texture {
  if (typeof document === 'undefined') {
    const data = new Uint8Array([200, 16, 46, 255]);
    const tex = new THREE.DataTexture(data, 1, 1);
    tex.needsUpdate = true;
    return tex;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  // Top half: red
  ctx.fillStyle = '#c8102e';
  ctx.fillRect(0, 0, canvas.width, 16);

  // Bottom half: white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 16, canvas.width, 16);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createGistrupHouses(): GistrupHouses {
  const group = new THREE.Group();
  group.name = 'gistrup-houses';

  // ========================================================================
  // SHARED MATERIALS
  // ========================================================================

  // House 1: Red brick (#9e432c)
  const redBrickMat = new THREE.MeshStandardMaterial({
    color: 0x9e432c,
    roughness: 0.88,
    metalness: 0.02,
  });

  // House 2: Yellow brick (#d8b260)
  const yellowBrickMat = new THREE.MeshStandardMaterial({
    color: 0xd8b260,
    roughness: 0.85,
    metalness: 0.02,
  });

  // House 3: White rendered / plastered facade (#ede9e1)
  const whitePlasterMat = new THREE.MeshStandardMaterial({
    color: 0xede9e1,
    roughness: 0.82,
    metalness: 0.02,
  });

  // Orange Danish roof tiles (sadeltag i tegl, #c25424)
  const orangeTileRoofMat = new THREE.MeshStandardMaterial({
    color: 0xc25424,
    roughness: 0.82,
    metalness: 0.04,
  });

  // Black glazed tiles (sortglaseret tegl, #26292b)
  const blackGlazedRoofMat = new THREE.MeshStandardMaterial({
    color: 0x222527,
    roughness: 0.38,
    metalness: 0.25,
  });

  // Solar panels (solceller på taget)
  const solarPanelMat = new THREE.MeshStandardMaterial({
    color: 0x182436,
    roughness: 0.28,
    metalness: 0.75,
  });
  const solarFrameMat = new THREE.MeshStandardMaterial({
    color: 0x5a6068,
    roughness: 0.5,
    metalness: 0.6,
  });

  // White window frames & fascia
  const whiteTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf4f5f6,
    roughness: 0.5,
  });

  // Dark/daytime windows
  const darkWindowMat = new THREE.MeshStandardMaterial({
    color: 0x1a2228,
    roughness: 0.2,
    metalness: 0.8,
  });

  // Lit evening/night windows (warm cozy indoor glow)
  const litWindowMat = new THREE.MeshStandardMaterial({
    color: 0xffe2a4,
    emissive: 0xffa434,
    emissiveIntensity: 0.0,
    roughness: 0.35,
  });

  // Snow overlay for roofs
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xeef5fc,
    roughness: 0.9,
    metalness: 0.02,
    transparent: true,
    opacity: 0.0,
  });

  // White flagpoles
  const flagpoleMat = new THREE.MeshStandardMaterial({
    color: 0xf8f9fa,
    roughness: 0.4,
    metalness: 0.1,
  });
  const flagKnobMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Golden knob
    roughness: 0.3,
    metalness: 0.8,
  });
  const flagIronMat = new THREE.MeshStandardMaterial({
    color: 0x3a3d40, // Galvanized steel / wrought iron brackets
    roughness: 0.45,
    metalness: 0.75,
  });
  const flagbedSoilMat = new THREE.MeshStandardMaterial({
    color: 0x342921, // Dark rich garden soil
    roughness: 0.95,
  });

  // Foundation & driveway bases
  const drivewayMat = new THREE.MeshStandardMaterial({
    color: 0x6e7275,
    roughness: 0.9,
  });

  // ========================================================================
  // HELPER: BUILD A STANDARD DANISH PARCELHUS
  // ========================================================================
  interface HouseConfig {
    x: number;
    z: number;
    rotY: number;
    width: number;
    length: number;
    wallHeight: number;
    roofHeight: number;
    wallMat: THREE.Material;
    roofMat: THREE.Material;
    hasChimney?: boolean;
    hasSolarPanels?: boolean;
    isPhotoStyle?: boolean;
    name: string;
  }

  function buildDanishHouse(cfg: HouseConfig): void {
    const hGroup = new THREE.Group();
    hGroup.name = cfg.name;
    hGroup.position.set(cfg.x, 0, cfg.z);
    hGroup.rotation.y = cfg.rotY;

    // 1. Garden terrace / ground base
    const baseGeo = new THREE.BoxGeometry(cfg.width + 4.0, 0.14, cfg.length + 4.0);
    const baseMesh = new THREE.Mesh(baseGeo, drivewayMat);
    baseMesh.position.set(0, 0.05, 0);
    baseMesh.receiveShadow = true;
    hGroup.add(baseMesh);

    // 2. Main brick walls
    const wallGeo = new THREE.BoxGeometry(cfg.width, cfg.wallHeight, cfg.length);
    const wallMesh = new THREE.Mesh(wallGeo, cfg.wallMat);
    wallMesh.position.set(0, cfg.wallHeight / 2, 0);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    hGroup.add(wallMesh);

    // 3. Gable ends (gavle)
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-cfg.width / 2, 0);
    gableShape.lineTo(cfg.width / 2, 0);
    gableShape.lineTo(0, cfg.roofHeight);
    gableShape.closePath();

    const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.25, bevelEnabled: false });

    // Front gable (hvidmalet træ på foto-villaen jvf. brugerens foto)
    const gableMat = cfg.isPhotoStyle ? whiteTrimMat : cfg.wallMat;
    const gableFront = new THREE.Mesh(gableGeo, gableMat);
    gableFront.position.set(0, cfg.wallHeight, cfg.length / 2 - 0.25);
    gableFront.castShadow = true;
    hGroup.add(gableFront);

    // Back gable
    const gableBack = new THREE.Mesh(gableGeo, gableMat);
    gableBack.position.set(0, cfg.wallHeight, -cfg.length / 2);
    gableBack.castShadow = true;
    hGroup.add(gableBack);

    // 4. Saddle roof slopes (sadeltag)
    const roofOverhangEaves = 0.45;
    const gableOverhang = 0.22;
    const slopeLen = Math.hypot(cfg.width / 2 + roofOverhangEaves, cfg.roofHeight) + 0.15;
    const roofAngle = Math.atan2(cfg.roofHeight, cfg.width / 2);
    const roofThick = 0.16;
    const roofLenZ = cfg.length + 2 * gableOverhang;

    const roofSlopeGeo = new THREE.BoxGeometry(slopeLen, roofThick, roofLenZ);

    const roofLeft = new THREE.Mesh(roofSlopeGeo, cfg.roofMat);
    roofLeft.position.set(-cfg.width / 4 - 0.12, cfg.wallHeight + cfg.roofHeight / 2, 0);
    roofLeft.rotation.z = roofAngle;
    roofLeft.castShadow = true;
    roofLeft.receiveShadow = true;
    hGroup.add(roofLeft);

    const roofRight = new THREE.Mesh(roofSlopeGeo, cfg.roofMat);
    roofRight.position.set(cfg.width / 4 + 0.12, cfg.wallHeight + cfg.roofHeight / 2, 0);
    roofRight.rotation.z = -roofAngle;
    roofRight.castShadow = true;
    roofRight.receiveShadow = true;
    hGroup.add(roofRight);

    // Hvide vindskeder (bargeboards) og vinkelkrop (L-shape) jvf. brugerens uploadede foto!
    if (cfg.isPhotoStyle) {
      const bLen = slopeLen + 0.08;
      const bW = 0.08;
      const bH = roofThick + 0.04;
      // Vindskeder monteres på gavlens yderkant af tagudhænget, så de indrammer gavlen rent uden at skære igennem teglene
      for (const zSign of [-1, 1]) {
        for (const side of [-1, 1]) {
          // På forgavlen mod haven (zSign = 1): kun den frie venstre side (side = -1)
          // Højre side (side = 1) møder vinkelkroppen og skal ikke have en vindskede tværs over taget
          if (zSign === 1 && side === 1) continue;

          const board = new THREE.Mesh(new THREE.BoxGeometry(bLen, bH, bW), whiteTrimMat);
          board.name = 'gistrup-bargeboard';
          const boardZ = zSign * (cfg.length / 2 + gableOverhang + bW / 2);
          board.position.set(side * (cfg.width / 4 + 0.12), cfg.wallHeight + cfg.roofHeight / 2 - 0.01, boardZ);
          board.rotation.z = side * -roofAngle;
          board.castShadow = true;
          hGroup.add(board);
        }
      }

      // Vinkelkrop (vinkel-parcelhus jvf. fotoet)
      const wingW = 5.4;
      const wingL = 4.8;
      const wingH = cfg.wallHeight;
      const wingRoofH = cfg.roofHeight * 0.94;
      const wingGableOverhang = 0.22;
      const wingRoofLenX = wingL + wingGableOverhang;
      const wingStartX = cfg.width / 2;
      const wingRoofCenterX = wingStartX + wingRoofLenX / 2;
      const wingOffsetZ = cfg.length / 2 - wingW / 2;

      // Mur (gule mursten)
      const wingWall = new THREE.Mesh(new THREE.BoxGeometry(wingL, wingH, wingW), cfg.wallMat);
      wingWall.position.set(wingStartX + wingL / 2, wingH / 2, wingOffsetZ);
      wingWall.castShadow = true;
      hGroup.add(wingWall);

      // Hvid gavl på vinkelkroppen mod haven
      const wGableShape = new THREE.Shape();
      wGableShape.moveTo(-wingW / 2, 0);
      wGableShape.lineTo(wingW / 2, 0);
      wGableShape.lineTo(0, wingRoofH);
      wGableShape.closePath();
      const wGableGeo = new THREE.ExtrudeGeometry(wGableShape, { depth: 0.22, bevelEnabled: false });
      wGableGeo.rotateY(Math.PI / 2);
      const wGableMesh = new THREE.Mesh(wGableGeo, whiteTrimMat);
      wGableMesh.position.set(wingStartX + wingL - 0.22, wingH, wingOffsetZ);
      wGableMesh.castShadow = true;
      hGroup.add(wGableMesh);

      // Vinkelkroppens sadeltag i orange tegl
      const wSlopeLen = Math.hypot(wingW / 2 + 0.35, wingRoofH) + 0.12;
      const wRoofAngle = Math.atan2(wingRoofH, wingW / 2);
      for (const zSign of [-1, 1]) {
        const wRoofSlope = new THREE.Mesh(new THREE.BoxGeometry(wingRoofLenX, 0.15, wSlopeLen), cfg.roofMat);
        wRoofSlope.position.set(wingRoofCenterX, wingH + wingRoofH / 2, wingOffsetZ + zSign * (wingW / 4 + 0.08));
        wRoofSlope.rotation.x = zSign * wRoofAngle;
        wRoofSlope.castShadow = true;
        hGroup.add(wRoofSlope);

        // Hvide vindskeder (sternbrædder) på vinkelkroppens ydre gavl mod haven
        const wBoard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, wSlopeLen + 0.08), whiteTrimMat);
        wBoard.name = 'gistrup-bargeboard';
        wBoard.position.set(wingStartX + wingRoofLenX + 0.04, wingH + wingRoofH / 2 - 0.01, wingOffsetZ + zSign * (wingW / 4 + 0.08));
        wBoard.rotation.x = zSign * wRoofAngle;
        wBoard.castShadow = true;
        hGroup.add(wBoard);

        // Snelag på vinkelkroppens tag
        const wSnow = new THREE.Mesh(new THREE.BoxGeometry(wingRoofLenX * 0.98, 0.08, wSlopeLen * 0.98), snowMat);
        wSnow.position.set(wingRoofCenterX, wingH + wingRoofH / 2 + 0.07, wingOffsetZ + zSign * (wingW / 4 + 0.08));
        wSnow.rotation.x = zSign * wRoofAngle;
        hGroup.add(wSnow);
      }
    }

    // Snow overlay on roofs
    const snowSlopeGeo = new THREE.BoxGeometry(slopeLen * 0.98, 0.08, roofLenZ * 0.98);
    const snowLeft = new THREE.Mesh(snowSlopeGeo, snowMat);
    snowLeft.position.copy(roofLeft.position);
    snowLeft.position.y += 0.07;
    snowLeft.rotation.z = roofAngle;
    hGroup.add(snowLeft);

    const snowRight = new THREE.Mesh(snowSlopeGeo, snowMat);
    snowRight.position.copy(roofRight.position);
    snowRight.position.y += 0.07;
    snowRight.rotation.z = -roofAngle;
    hGroup.add(snowRight);

    // 5. Windows
    // Window frames and glass panes
    // Front windows (facing garden)
    const windowW = 1.35;
    const windowH = 1.25;
    const winGeo = new THREE.PlaneGeometry(windowW, windowH);
    const frameGeo = new THREE.BoxGeometry(windowW + 0.12, windowH + 0.12, 0.08);

    // Window 1: normal dark window
    const wFrame1 = new THREE.Mesh(frameGeo, whiteTrimMat);
    wFrame1.position.set(-cfg.width / 2 + 1.8, 1.6, cfg.length / 2 + 0.02);
    const wGlass1 = new THREE.Mesh(winGeo, darkWindowMat);
    wGlass1.position.set(0, 0, 0.05);
    wFrame1.add(wGlass1);
    hGroup.add(wFrame1);

    // Window 2: Lit cozy evening window
    const wFrame2 = new THREE.Mesh(frameGeo, whiteTrimMat);
    wFrame2.position.set(-cfg.width / 2 + 4.2, 1.6, cfg.length / 2 + 0.02);
    const wGlass2 = new THREE.Mesh(winGeo, litWindowMat);
    wGlass2.position.set(0, 0, 0.05);
    wFrame2.add(wGlass2);
    hGroup.add(wFrame2);

    // Window 3 on gable or side
    const wFrame3 = new THREE.Mesh(frameGeo, whiteTrimMat);
    wFrame3.position.set(cfg.width / 2 + 0.02, 1.6, 0.8);
    wFrame3.rotation.y = Math.PI / 2;
    const wGlass3 = new THREE.Mesh(winGeo, litWindowMat);
    wGlass3.position.set(0, 0, 0.05);
    wFrame3.add(wGlass3);
    hGroup.add(wFrame3);

    // Front door
    const doorGeo = new THREE.BoxGeometry(1.05, 2.15, 0.08);
    const doorMesh = new THREE.Mesh(doorGeo, whiteTrimMat);
    doorMesh.position.set(cfg.width / 2 - 1.8, 1.1, cfg.length / 2 + 0.02);
    hGroup.add(doorMesh);

    // Chimney (if specified)
    if (cfg.hasChimney) {
      const chimneyGeo = new THREE.BoxGeometry(0.75, 1.85, 0.75);
      const chimneyMesh = new THREE.Mesh(chimneyGeo, cfg.isPhotoStyle ? redBrickMat : cfg.wallMat);
      chimneyMesh.position.set(cfg.isPhotoStyle ? 0.35 : -0.8, cfg.wallHeight + cfg.roofHeight * 0.75, 0.8);
      chimneyMesh.castShadow = true;
      hGroup.add(chimneyMesh);

      const chimneyTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), drivewayMat);
      chimneyTop.position.set(0, 0.95, 0);
      chimneyMesh.add(chimneyTop);
    }

    // Solar panels (if specified, mounted on the south-facing slope)
    if (cfg.hasSolarPanels) {
      const panelCols = 4;
      const panelRows = 2;
      const pW = 1.05;
      const pH = 1.65;
      const pSpacing = 0.08;

      const solarGroup = new THREE.Group();
      // Mount onto right roof slope
      solarGroup.position.copy(roofRight.position);
      solarGroup.rotation.z = -roofAngle;
      solarGroup.position.y += 0.12;

      for (let r = 0; r < panelRows; r++) {
        for (let c = 0; c < panelCols; c++) {
          const px = (c - (panelCols - 1) / 2) * (pW + pSpacing);
          const pz = (r - (panelRows - 1) / 2) * (pH + pSpacing);

          const frame = new THREE.Mesh(new THREE.BoxGeometry(pW, 0.04, pH), solarFrameMat);
          frame.position.set(px, 0, pz);

          const panel = new THREE.Mesh(new THREE.PlaneGeometry(pW - 0.06, pH - 0.06), solarPanelMat);
          panel.rotation.x = -Math.PI / 2;
          panel.position.y = 0.025;
          frame.add(panel);

          solarGroup.add(frame);
        }
      }
      hGroup.add(solarGroup);
    }

    group.add(hGroup);
  }

  // ========================================================================
  // 1. HUS 1 (Hasselvej 28-stil jvf. brugerens foto: Gule mursten, hvide gavle
  // & vindskeder, orange tegltag med vinkelkrop og rød murstensskorsten)
  // x ≈ -14.5, z ≈ 8.5 (Sydvest, peger direkte frem mod hækken jvf. fotoet)
  // ========================================================================
  buildDanishHouse({
    name: 'gistrup-house-1',
    x: -14.5,
    z: 8.5,
    rotY: 0.20,
    width: 7.8,
    length: 11.2,
    wallHeight: 2.75,
    roofHeight: 2.25,
    wallMat: yellowBrickMat,
    roofMat: orangeTileRoofMat,
    hasChimney: true,
    isPhotoStyle: true,
  });

  // ========================================================================
  // 2. HUS 2 (Klassisk rød murstensvilla med haveflagstang & DANNEBROG)
  // x ≈ -17.5, z ≈ 0.5 (Vest)
  // ========================================================================
  buildDanishHouse({
    name: 'gistrup-house-2',
    x: -17.5,
    z: 0.5,
    rotY: 0.05,
    width: 8.2,
    length: 10.8,
    wallHeight: 2.85,
    roofHeight: 2.35,
    wallMat: redBrickMat,
    roofMat: orangeTileRoofMat,
    hasChimney: true,
  });

  // Flagstang 1: Hvid haveflagstang med Dannebrog
  // Står frit på plænen foran Hus 2 med god afstand til både tag, fliser og hæk
  const flagpole1Group = new THREE.Group();
  flagpole1Group.name = 'gistrup-flagpole-1';
  const pole1X = -11.0;
  const pole1Z = 0.5;
  const poleHeight = 8.6;
  flagpole1Group.position.set(pole1X, 0, pole1Z);
  flagpole1Group.rotation.y = 0.52; // Vinklet så Dannebrog ses flot bredsidet fra haven
  group.add(flagpole1Group);

  // Cirkulært flagbed i plænen (muld og granittrim)
  const bedGeo = new THREE.CylinderGeometry(0.46, 0.48, 0.04, 16);
  const bedMesh = new THREE.Mesh(bedGeo, flagbedSoilMat);
  bedMesh.position.y = 0.02;
  bedMesh.receiveShadow = true;
  flagpole1Group.add(bedMesh);

  const bedBorderGeo = new THREE.TorusGeometry(0.48, 0.032, 6, 16);
  bedBorderGeo.rotateX(Math.PI / 2);
  const bedBorderMesh = new THREE.Mesh(bedBorderGeo, drivewayMat);
  bedBorderMesh.position.y = 0.03;
  flagpole1Group.add(bedBorderMesh);

  // Traditionel dansk flagstangsstøtte (granit/egetræs-støttepæl med jernbeslag)
  const supportPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.35, 0.12), drivewayMat);
  supportPost.position.set(-0.07, 0.68, 0);
  supportPost.castShadow = true;
  flagpole1Group.add(supportPost);

  // 2 x spændebeslag (galvaniserede jernbånd med spændebolte)
  for (const bY of [0.38, 1.12]) {
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.045, 12), flagIronMat);
    bracket.position.set(0, bY, 0);
    flagpole1Group.add(bracket);
  }

  // Slender white mast
  const poleMast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.085, poleHeight, 10), flagpoleMat);
  poleMast.position.y = poleHeight / 2;
  poleMast.castShadow = true;
  flagpole1Group.add(poleMast);

  // Golden flag knob on summit
  const poleKnob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), flagKnobMat);
  poleKnob.position.y = poleHeight + 0.05;
  flagpole1Group.add(poleKnob);

  // DANNEBROG FLAG
  // Flapping grid geometry: 16x10 segments for smooth wind cloth ripples
  const flagW = 1.45;
  const flagH = 1.05;
  const flagSegX = 16;
  const flagSegY = 10;
  const dannebrogGeo = new THREE.PlaneGeometry(flagW, flagH, flagSegX, flagSegY);
  // Shift origin so the hoist edge (left side) is at x = 0 (pole attachment)
  dannebrogGeo.translate(flagW / 2, 0, 0);

  const dannebrogMat = new THREE.MeshStandardMaterial({
    map: createDannebrogTexture(),
    side: THREE.DoubleSide,
    roughness: 0.65,
    metalness: 0.05,
  });

  const dannebrogMesh = new THREE.Mesh(dannebrogGeo, dannebrogMat);
  dannebrogMesh.name = 'dannebrog-flag';
  // Default hoisted position: right beneath the knob
  const flagTopY = poleHeight - 0.15;
  dannebrogMesh.position.set(0.06, flagTopY - flagH / 2, 0);
  dannebrogMesh.castShadow = true;
  flagpole1Group.add(dannebrogMesh);

  // Cache original vertex positions for wind animation
  const dannebrogOrigPos = (dannebrogGeo.getAttribute('position') as THREE.BufferAttribute).clone();

  // ========================================================================
  // 3. HUS 3 (Hvidpudset parcelhus, sortglaseret tag, SOLCELLER & VIMPEL)
  // x ≈ -15.8, z ≈ -12.5 (Nordvest, mod sygehuset)
  // ========================================================================
  buildDanishHouse({
    name: 'gistrup-house-3',
    x: -15.8,
    z: -12.5,
    rotY: -0.25,
    width: 8.0,
    length: 10.6,
    wallHeight: 2.80,
    roofHeight: 2.30,
    wallMat: whitePlasterMat,
    roofMat: blackGlazedRoofMat,
    hasSolarPanels: true,
  });

  // Flagstang 2: Haveflagstang med VIMPEL (oppe både dag og nat!)
  // Står frit på plænen foran Hus 3 med god afstand til både tag og fliseterrasse
  const flagpole3Group = new THREE.Group();
  flagpole3Group.name = 'gistrup-flagpole-3';
  const pole3X = -10.5;
  const pole3Z = -10.5;
  const pole3Height = 8.2;
  flagpole3Group.position.set(pole3X, 0, pole3Z);
  flagpole3Group.rotation.y = 0.45; // Vinkles mod haven
  group.add(flagpole3Group);

  // Cirkulært flagbed i plænen
  const bed3Geo = new THREE.CylinderGeometry(0.44, 0.46, 0.04, 16);
  const bed3Mesh = new THREE.Mesh(bed3Geo, flagbedSoilMat);
  bed3Mesh.position.y = 0.02;
  bed3Mesh.receiveShadow = true;
  flagpole3Group.add(bed3Mesh);

  const bed3BorderGeo = new THREE.TorusGeometry(0.46, 0.030, 6, 16);
  bed3BorderGeo.rotateX(Math.PI / 2);
  const bed3BorderMesh = new THREE.Mesh(bed3BorderGeo, drivewayMat);
  bed3BorderMesh.position.y = 0.03;
  flagpole3Group.add(bed3BorderMesh);

  // Støttepæl med beslag
  const support3Post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.30, 0.12), drivewayMat);
  support3Post.position.set(-0.07, 0.65, 0);
  support3Post.castShadow = true;
  flagpole3Group.add(support3Post);

  for (const bY of [0.36, 1.08]) {
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.045, 12), flagIronMat);
    bracket.position.set(0, bY, 0);
    flagpole3Group.add(bracket);
  }

  const pole3Mast = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.08, pole3Height, 10), flagpoleMat);
  pole3Mast.position.y = pole3Height / 2;
  pole3Mast.castShadow = true;
  flagpole3Group.add(pole3Mast);

  const pole3Knob = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), flagKnobMat);
  pole3Knob.position.y = pole3Height + 0.05;
  flagpole3Group.add(pole3Knob);

  // VIMPEL (Danish long pennant)
  // Tapered ribbon: width 2.2m, hoist height 0.24m tapering to 0.04m at tip
  const vimpelLen = 2.4;
  const vimpelSegX = 20;
  const vimpelSegY = 4;
  const vimpelGeo = new THREE.PlaneGeometry(vimpelLen, 0.24, vimpelSegX, vimpelSegY);
  vimpelGeo.translate(vimpelLen / 2, 0, 0);

  // Taper geometry towards tip
  const vimpelPosAttr = vimpelGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < vimpelPosAttr.count; i++) {
    const vx = vimpelPosAttr.getX(i);
    const vy = vimpelPosAttr.getY(i);
    const frac = vx / vimpelLen; // 0 to 1
    // Taper height
    const scaleY = (1.0 - frac * 0.82);
    vimpelPosAttr.setY(i, vy * scaleY);
  }
  vimpelGeo.computeVertexNormals();
  const vimpelOrigPos = vimpelPosAttr.clone();

  const vimpelMat = new THREE.MeshStandardMaterial({
    map: createVimpelTexture(),
    side: THREE.DoubleSide,
    roughness: 0.65,
    metalness: 0.05,
  });

  const vimpelMesh = new THREE.Mesh(vimpelGeo, vimpelMat);
  vimpelMesh.name = 'vimpel-flag';
  vimpelMesh.position.set(0.05, pole3Height - 0.12, 0);
  vimpelMesh.castShadow = true;
  flagpole3Group.add(vimpelMesh);

  // ========================================================================
  // STATE & UPDATE LOGIC
  // ========================================================================

  let snowLevel = 0;
  let frostLevel = 0;
  let solarAlt = 45; // Degrees
  let flagHoisted = true; // Dannebrog hoisted state
  let flagCurrentY = flagTopY - flagH / 2;

  function updateHousesVisuals() {
    const effectiveSnow = Math.max(snowLevel * 0.95, frostLevel * 0.35);
    snowMat.opacity = THREE.MathUtils.clamp(effectiveSnow * 1.1, 0, 0.95);
    snowMat.visible = effectiveSnow > 0.02;
  }

  updateHousesVisuals();

  return {
    group,
    update(windTime: number, windStrength: number, dt: number) {
      const effWind = THREE.MathUtils.clamp(windStrength, 0.1, 4.0);

      // 1. Dannebrog state:
      // Dannebrog is hoisted when sun is above horizon (solarAlt > -0.5 deg).
      // Lowered down the flagpole or stowed at night!
      // In accordance with Danish flag etiquette, Dannebrog must not fly at night.
      const targetFlagY = flagHoisted ? flagTopY - flagH / 2 : 0.8;
      flagCurrentY = THREE.MathUtils.damp(flagCurrentY, targetFlagY, 4.0, dt);
      dannebrogMesh.position.y = flagCurrentY;
      dannebrogMesh.visible = flagCurrentY > 1.0;

      // 2. Dannebrog wind fluttering:
      if (dannebrogMesh.visible) {
        const dPos = dannebrogGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < dPos.count; i++) {
          const bx = dannebrogOrigPos.getX(i);
          const by = dannebrogOrigPos.getY(i);
          const u = bx / flagW; // 0 at hoist, 1 at fly

          // Flapping traveling waves
          const wave1 = Math.sin(windTime * 5.2 + u * 4.8);
          const wave2 = Math.cos(windTime * 7.4 + u * 7.2) * 0.42;
          const wave3 = Math.sin(windTime * 3.1 + by * 5.0) * 0.22;
          const amplitude = Math.pow(u, 1.35) * 0.18 * effWind;
          const zDisp = (wave1 + wave2 + wave3) * amplitude;

          // Lift slightly in stronger wind
          const lift = Math.pow(u, 1.5) * 0.06 * effWind;

          dPos.setXYZ(i, bx, by + lift, zDisp);
        }
        dPos.needsUpdate = true;
        dannebrogGeo.computeVertexNormals();
      }

      // 3. Vimpel wind fluttering (Vimpel flies both day and night!):
      const vPos = vimpelGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < vPos.count; i++) {
        const vx = vimpelOrigPos.getX(i);
        const vy = vimpelOrigPos.getY(i);
        const u = vx / vimpelLen; // 0 at mast, 1 at tip

        // Fast rippling ribbon wave
        const wave1 = Math.sin(windTime * 6.8 + u * 7.6);
        const wave2 = Math.cos(windTime * 9.2 + u * 11.4) * 0.38;
        const amplitude = Math.pow(u, 1.25) * 0.14 * effWind;
        const zDisp = (wave1 + wave2) * amplitude;

        // Gentle droop & wind lift
        const droop = -Math.pow(u, 1.8) * 0.14 * (1.0 / (effWind + 0.3));
        const lift = Math.pow(u, 1.4) * 0.04 * effWind;

        vPos.setXYZ(i, vx, vy + droop + lift, zDisp);
      }
      vPos.needsUpdate = true;
      vimpelGeo.computeVertexNormals();
    },
    setDate(_date: Date) {
      updateHousesVisuals();
    },
    setWinterWeather(snow: number, frost: number) {
      snowLevel = THREE.MathUtils.clamp(snow, 0, 1);
      frostLevel = THREE.MathUtils.clamp(frost, 0, 1);
      updateHousesVisuals();
    },
    setDaylight(solarAltitude: number) {
      solarAlt = solarAltitude;

      // Dannebrog day/night flag etiquette:
      // Hoisted when sun is up (solarAltitude > -0.5)
      // Taken down at sunset / night
      flagHoisted = solarAlt > -0.5;

      // Warm window lighting in evening and night:
      // Sunset begins around solarAlt = 3.5 deg
      if (solarAlt < 4.0) {
        const glowFactor = THREE.MathUtils.clamp((4.0 - solarAlt) / 8.0, 0.0, 1.0);
        litWindowMat.emissiveIntensity = glowFactor * 1.25;
      } else {
        litWindowMat.emissiveIntensity = 0.0;
      }
    },
  };
}
