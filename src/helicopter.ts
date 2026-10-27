import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface Helicopter {
  group: THREE.Group;
  readonly position: THREE.Vector3;
  readonly isAudibleOrVisibleNear: boolean;
  update(dt: number): void;
  setDaylight(solarAltitude: number): void;
  trigger(): void;
}

type FlightState =
  | 'idle'
  | 'inbound'
  | 'approach'
  | 'landed'
  | 'takeoff'
  | 'outbound'
  | 'cooldown';

/**
 * Den Landsdækkende Akutlægehelikopter (gul Airbus H145 / BK117 D-2).
 * Opererer i Gistrup luftrummet og lander på AAUH-Supersygehusets heliplads.
 */
export function createHelicopter(helipadTarget: THREE.Vector3): Helicopter {
  const group = new THREE.Group();
  group.name = 'akutlaegehelikopter';
  group.visible = false;

  // -------------------------------------------------------------
  // MATERIALER
  // -------------------------------------------------------------
  const yellowPaintMat = new THREE.MeshStandardMaterial({
    color: 0xfed100, // Akutlægehelikopterens karakteristiske gule farve
    roughness: 0.35,
    metalness: 0.15,
  });

  const cockpitGlassMat = new THREE.MeshStandardMaterial({
    color: 0x14181f, // Mørkt tonet glas
    roughness: 0.12,
    metalness: 0.85,
  });

  const redMedicalMat = new THREE.MeshStandardMaterial({
    color: 0xd62828, // Rød medicinsk stribe
    roughness: 0.4,
    metalness: 0.1,
  });

  const whiteMedicalMat = new THREE.MeshStandardMaterial({
    color: 0xf4f7f6, // Hvid medicinsk stribe
    roughness: 0.4,
    metalness: 0.1,
  });

  const skidMetalMat = new THREE.MeshStandardMaterial({
    color: 0x2b2d30, // Landingsmeder i mørkegråt stål
    roughness: 0.5,
    metalness: 0.75,
  });

  const rotorBladeMat = new THREE.MeshStandardMaterial({
    color: 0x1e2124, // Hovedrotorens kulfiberblade
    roughness: 0.4,
    metalness: 0.4,
  });

  // Gennemsigtig rotorskive ved høj omdrejningshastighed
  const rotorBlurMat = new THREE.MeshBasicMaterial({
    color: 0xdddddd,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // Antikollisions-lys (rød strobe på top og bund)
  const beaconLightMat = new THREE.MeshBasicMaterial({
    color: 0xff1020,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });

  // Positionslys (grøn højre/styrbord, rød venstre/bagbord, hvid hale)
  const greenNavMat = new THREE.MeshBasicMaterial({
    color: 0x00ff55,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });

  const redNavMat = new THREE.MeshBasicMaterial({
    color: 0xff2222,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });

  const whiteNavMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });

  const whiteTailStrobeMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });

  // -------------------------------------------------------------
  // 1. STATISK SKROG (Airbus H145)
  // -------------------------------------------------------------
  const yellowGeos: THREE.BufferGeometry[] = [];
  const cockpitGeos: THREE.BufferGeometry[] = [];
  const redGeos: THREE.BufferGeometry[] = [];
  const whiteGeos: THREE.BufferGeometry[] = [];
  const skidGeos: THREE.BufferGeometry[] = [];

  // Hovedkabine (dråbeformet krop)
  // Længde ~4.4m, bredde ~1.7m, højde ~1.6m
  const cabinGeo = new THREE.BoxGeometry(1.68, 1.55, 3.8);
  cabinGeo.translate(0, 0, 0.2);
  yellowGeos.push(cabinGeo);

  // Afrundet næseparti
  const noseGeo = new THREE.CylinderGeometry(0.82, 0.84, 1.1, 12);
  noseGeo.rotateX(Math.PI / 2);
  noseGeo.scale(1.0, 0.88, 1.0);
  noseGeo.translate(0, -0.05, 2.2);
  yellowGeos.push(noseGeo);

  // Cockpit forrude og sideruder (mørkt tonet glas)
  const cockpitFrontGeo = new THREE.BoxGeometry(1.52, 0.88, 1.25);
  cockpitFrontGeo.rotateX(-0.35); // Skrå forrude
  cockpitFrontGeo.translate(0, 0.15, 2.05);
  cockpitGeos.push(cockpitFrontGeo);

  // Klarglas sideruder
  for (const side of [-1, 1]) {
    const sideGlass = new THREE.PlaneGeometry(1.4, 0.62);
    sideGlass.rotateY(side * Math.PI / 2);
    sideGlass.translate(side * 0.86, 0.12, 0.4);
    cockpitGeos.push(sideGlass);
  }

  // Motordæk / transmissionstop (doghouse)
  const engineCoverGeo = new THREE.BoxGeometry(1.25, 0.65, 2.2);
  engineCoverGeo.translate(0, 1.05, -0.2);
  yellowGeos.push(engineCoverGeo);

  // Udstødningsrør bag motorerne
  for (const exSide of [-0.35, 0.35]) {
    const exhaustGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.45, 8);
    exhaustGeo.rotateX(-Math.PI / 3);
    exhaustGeo.translate(exSide, 1.15, -1.25);
    skidGeos.push(exhaustGeo);
  }

  // Medicinsk stribe langs siden (rød & hvid chevron)
  for (const side of [-1, 1]) {
    const redStripe = new THREE.PlaneGeometry(3.2, 0.22);
    redStripe.rotateY(side * Math.PI / 2);
    redStripe.translate(side * 0.855, -0.08, 0.2);
    redGeos.push(redStripe);

    const whiteStripe = new THREE.PlaneGeometry(3.2, 0.14);
    whiteStripe.rotateY(side * Math.PI / 2);
    whiteStripe.translate(side * 0.855, -0.26, 0.2);
    whiteGeos.push(whiteStripe);
  }

  // Halebom (Tail boom)
  // Slank, let opadstigende bom fra z = -1.7 til z = -5.8
  const tailBoomGeo = new THREE.CylinderGeometry(0.24, 0.48, 4.2, 10);
  tailBoomGeo.rotateX(Math.PI / 2);
  tailBoomGeo.translate(0, 0.45, -3.8);
  yellowGeos.push(tailBoomGeo);

  // Fenestron halefinne (indkapslet haleror)
  // Slank vertikal finne ved z = -5.9 med cirkulær tunnel
  const finGeo = new THREE.BoxGeometry(0.16, 1.65, 1.1);
  finGeo.translate(0, 0.95, -5.9);
  yellowGeos.push(finGeo);

  // Fenestron tunnel (cirkulær cylinder i finnen)
  const ductRing = new THREE.CylinderGeometry(0.42, 0.42, 0.22, 16);
  ductRing.rotateZ(Math.PI / 2);
  ductRing.translate(0, 0.95, -5.9);
  skidGeos.push(ductRing);

  // Vandrette halestabilisatorer med ende-finner
  const stabW = 1.9;
  const stabGeo = new THREE.BoxGeometry(stabW, 0.05, 0.42);
  stabGeo.translate(0, 0.52, -5.4);
  yellowGeos.push(stabGeo);

  for (const sSide of [-1, 1]) {
    const endPlate = new THREE.BoxGeometry(0.04, 0.55, 0.42);
    endPlate.translate(sSide * (stabW / 2), 0.52, -5.4);
    yellowGeos.push(endPlate);
  }

  // Landingsmeder (Skids)
  // Nederste punkt er ved y = -0.88m under skrogets centrum
  const skidY = -0.88;
  const skidSpread = 0.92;
  const skidLen = 3.6;

  for (const sSide of [-1, 1]) {
    const sx = sSide * skidSpread;

    // Lige vandret mede-rør
    const tubeGeo = new THREE.CylinderGeometry(0.045, 0.045, skidLen, 8);
    tubeGeo.rotateX(Math.PI / 2);
    tubeGeo.translate(sx, skidY, 0.3);
    skidGeos.push(tubeGeo);

    // Opadbøjet spids forrest på meden
    const toeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.65, 8);
    toeGeo.rotateX(Math.PI / 3);
    toeGeo.translate(sx, skidY + 0.22, 0.3 + skidLen / 2 + 0.2);
    skidGeos.push(toeGeo);

    // Bagerste buede ende
    const heelGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.35, 8);
    heelGeo.rotateX(-Math.PI / 3.5);
    heelGeo.translate(sx, skidY + 0.12, 0.3 - skidLen / 2 - 0.1);
    skidGeos.push(heelGeo);

    // To lodrette/skrå tværstivere op til skroget
    for (const zPost of [-0.65, 1.25]) {
      const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8);
      postGeo.rotateZ(-sSide * 0.18);
      postGeo.translate(sx + sSide * 0.06, skidY + 0.32, zPost);
      skidGeos.push(postGeo);
    }
  }

  // Samling af det faste skrog
  if (yellowGeos.length) group.add(new THREE.Mesh(mergeGeometries(yellowGeos, false), yellowPaintMat));
  if (cockpitGeos.length) group.add(new THREE.Mesh(mergeGeometries(cockpitGeos, false), cockpitGlassMat));
  if (redGeos.length) group.add(new THREE.Mesh(mergeGeometries(redGeos, false), redMedicalMat));
  if (whiteGeos.length) group.add(new THREE.Mesh(mergeGeometries(whiteGeos, false), whiteMedicalMat));
  if (skidGeos.length) group.add(new THREE.Mesh(mergeGeometries(skidGeos, false), skidMetalMat));

  // -------------------------------------------------------------
  // 2. ROTERENDE ROTORER (Hovedrotor & Fenestron)
  // -------------------------------------------------------------
  const mainRotorGroup = new THREE.Group();
  mainRotorGroup.position.set(0, 1.58, 0.35); // På toppen af rotormasten
  group.add(mainRotorGroup);

  // Rotornav
  const hubGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.16, 12);
  const hubMesh = new THREE.Mesh(hubGeo, skidMetalMat);
  mainRotorGroup.add(hubMesh);

  // 5 rotorblade (Airbus H145 har en moderne 5-bladet hovedrotor)
  const bladeCount = 5;
  const bladeRadius = 3.8; // Radius 3.8m = diameter 7.6m (passer flot til 8.4m heliplads)
  const bladeGeos: THREE.BufferGeometry[] = [];

  for (let b = 0; b < bladeCount; b++) {
    const bAngle = (b / bladeCount) * Math.PI * 2;
    const blade = new THREE.BoxGeometry(0.18, 0.02, bladeRadius);
    blade.translate(0, 0, bladeRadius / 2);
    blade.rotateY(bAngle);
    bladeGeos.push(blade);
  }
  if (bladeGeos.length) {
    const bladesMesh = new THREE.Mesh(mergeGeometries(bladeGeos, false), rotorBladeMat);
    mainRotorGroup.add(bladesMesh);
  }

  // Gennemsigtig rotorskive (motion blur effect ved høj fart)
  const blurGeo = new THREE.CircleGeometry(bladeRadius + 0.08, 32);
  blurGeo.rotateX(-Math.PI / 2);
  const blurMesh = new THREE.Mesh(blurGeo, rotorBlurMat);
  mainRotorGroup.add(blurMesh);

  // Fenestron haleror (roterende lille rotor i haletunnelen)
  const fenestronGroup = new THREE.Group();
  fenestronGroup.position.set(0, 0.95, -5.9);
  group.add(fenestronGroup);

  const fBladeGeos: THREE.BufferGeometry[] = [];
  for (let f = 0; f < 8; f++) {
    const fAng = (f / 8) * Math.PI * 2;
    const fb = new THREE.BoxGeometry(0.04, 0.36, 0.015);
    fb.translate(0, 0.18, 0);
    fb.rotateX(fAng);
    fBladeGeos.push(fb);
  }
  if (fBladeGeos.length) {
    const fMesh = new THREE.Mesh(mergeGeometries(fBladeGeos, false), rotorBladeMat);
    fenestronGroup.add(fMesh);
  }

  // -------------------------------------------------------------
  // 3. LYS & STROBES (Autentisk luftfartsbelysning)
  // -------------------------------------------------------------
  // Rød antikollision: Top (på rotormasten) og Bund (under bugen)
  const beaconGeo = new THREE.SphereGeometry(0.08, 8, 8);

  const topBeaconMesh = new THREE.Mesh(beaconGeo, beaconLightMat);
  topBeaconMesh.position.set(0, 1.72, 0.35);
  group.add(topBeaconMesh);

  const bottomBeaconMesh = new THREE.Mesh(beaconGeo, beaconLightMat);
  bottomBeaconMesh.position.set(0, -0.82, 0.2);
  group.add(bottomBeaconMesh);

  // Positionslys (Navigation lights)
  // Grøn højre vinge/stabilisator (styrbord)
  const navGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const greenNavMesh = new THREE.Mesh(navGeo, greenNavMat);
  greenNavMesh.position.set(stabW / 2 + 0.04, 0.52, -5.4);
  group.add(greenNavMesh);

  // Rød venstre vinge/stabilisator (bagbord)
  const redNavMesh = new THREE.Mesh(navGeo, redNavMat);
  redNavMesh.position.set(-stabW / 2 - 0.04, 0.52, -5.4);
  group.add(redNavMesh);

  // Hvid agterlanterne (steady rear navigation light på halestabilisatoren)
  const whiteNavGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const whiteNavMesh = new THREE.Mesh(whiteNavGeo, whiteNavMat);
  whiteNavMesh.position.set(0, 0.52, -5.65);
  group.add(whiteNavMesh);

  // Hvidt halestrobe på toppen af halefinnen (omnidirektionel 3D-kugle)
  const tailStrobeGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const tailStrobeMesh = new THREE.Mesh(tailStrobeGeo, whiteTailStrobeMat);
  tailStrobeMesh.position.set(0, 1.78, -6.4);
  group.add(tailStrobeMesh);

  // -------------------------------------------------------------
  // 4. STATE MACHINE & FLIGHT PATH
  // -------------------------------------------------------------
  let state: FlightState = 'idle';
  let stateTime = 0;
  let rotorSpeed = 0; // rad/s
  let rotorAngle = 0;
  let beaconTimer = 0;
  let solarAltitude = 45; // Dag som udgangspunkt
  let isAudibleOrVisibleNear = false;

  // Touchdown-højde: Når mederne rører helipladsens overflade
  const skidTouchdownOffsetY = Math.abs(skidY); // 0.88m

  // Flyvekoordinater
  const startPos = new THREE.Vector3(58.0, 30.0, 16.0); // Over skoven mod øst
  const midPos = new THREE.Vector3(14.0, 18.0, -22.0); // Tæt forbi haven
  const approachPos = new THREE.Vector3(
    helipadTarget.x + 9.0,
    helipadTarget.y + 11.0,
    helipadTarget.z + 12.0
  );
  const hoverPos = new THREE.Vector3(
    helipadTarget.x,
    helipadTarget.y + 4.5,
    helipadTarget.z
  );
  const landPos = new THREE.Vector3(
    helipadTarget.x,
    helipadTarget.y + skidTouchdownOffsetY,
    helipadTarget.z
  );
  const takeoffHoverPos = new THREE.Vector3(
    helipadTarget.x,
    helipadTarget.y + 6.0,
    helipadTarget.z
  );
  const outMidPos = new THREE.Vector3(-22.0, 24.0, -56.0); // Accelererer mod vest/nordvest
  const outEndPos = new THREE.Vector3(-68.0, 34.0, -68.0); // Forsvinder i horisonten

  // Standby timer til automatisk periodisk flyvning
  let autoTriggerTimer = 16.0; // Første flyvning starter kort efter opstart for fin stemning

  function resetToIdle(): void {
    state = 'idle';
    stateTime = 0;
    group.visible = false;
    isAudibleOrVisibleNear = false;
    rotorSpeed = 0;
    autoTriggerTimer = 140.0; // Næste tur efter ca. 2.5 minutter
  }

  function startInbound(): void {
    state = 'inbound';
    stateTime = 0;
    group.visible = true;
    rotorSpeed = 26.0; // Fuld rotorfart
    group.position.copy(startPos);
    const initHeading = Math.atan2(midPos.x - startPos.x, midPos.z - startPos.z);
    group.rotation.set(0.10, initHeading, 0);
  }

  return {
    group,

    get position(): THREE.Vector3 {
      return group.position;
    },

    get isAudibleOrVisibleNear(): boolean {
      return isAudibleOrVisibleNear;
    },

    trigger(): void {
      if (state === 'idle' || state === 'cooldown') {
        startInbound();
      } else if (state === 'landed') {
        // Afkort opholdet på helipladsen så den letter straks
        stateTime = Math.max(stateTime, 44.0);
      }
    },

    setDaylight(altitude: number): void {
      solarAltitude = altitude;
    },

    update(dt: number): void {
      // Beskyt mod for store deltatider
      const delta = Math.min(dt, 0.1);
      stateTime += delta;
      beaconTimer += delta;

      // ---------------------------------------------------------
      // A. ROTOR ROTATION
      // ---------------------------------------------------------
      rotorAngle += rotorSpeed * delta;
      mainRotorGroup.rotation.y = rotorAngle;
      fenestronGroup.rotation.x = rotorAngle * 2.8;

      // Blur-skive gennemsigtighed stiger med rotorfart
      rotorBlurMat.opacity = Math.min(0.35, (rotorSpeed / 28.0) * 0.35);

      // ---------------------------------------------------------
      // B. BELYSNING & BLINK
      // ---------------------------------------------------------
      // Dobbeltblink hvert 1.2s (klassisk rød luftfarts-beacon)
      const bPeriod = 1.2;
      const bPhase = (beaconTimer % bPeriod);
      const isBeaconFlash = (bPhase < 0.08) || (bPhase > 0.20 && bPhase < 0.28);
      beaconLightMat.opacity = isBeaconFlash && group.visible ? 1.0 : 0.0;

      // Hvidt halestrobe blink hvert 1.2s (modfase)
      const isTailFlash = (bPhase > 0.58 && bPhase < 0.66);
      whiteTailStrobeMat.opacity = isTailFlash && group.visible ? 1.2 : 0.0;

      // Navigationslys er altid tændt når helikopteren er i luften
      const navBrightness = solarAltitude < 5 ? 1.0 : 0.7;
      greenNavMat.opacity = navBrightness;
      redNavMat.opacity = navBrightness;
      whiteNavMat.opacity = navBrightness;

      // ---------------------------------------------------------
      // C. STATE MACHINE
      // ---------------------------------------------------------
      const prevPos = group.position.clone();

      switch (state) {
        case 'idle': {
          group.visible = false;
          isAudibleOrVisibleNear = false;
          rotorSpeed = 0;

          autoTriggerTimer -= delta;
          if (autoTriggerTimer <= 0) {
            startInbound();
          }
          break;
        }

        case 'inbound': {
          // Varighed: 22 sekunder
          // Flyver over den østlige skov, forbi haven i behagelig kiggeafstand
          const duration = 22.0;
          const t = Math.min(1.0, stateTime / duration);
          group.visible = true;
          rotorSpeed = 28.0;

          // Blød Catmull-Rom kurve fra startPos via midPos mod approachPos
          const p1 = startPos;
          const p2 = midPos;
          const p3 = approachPos;

          // Kvadratisk bezier interpolation
          const oneMinusT = 1.0 - t;
          group.position.set(
            oneMinusT * oneMinusT * p1.x + 2 * oneMinusT * t * p2.x + t * t * p3.x,
            oneMinusT * oneMinusT * p1.y + 2 * oneMinusT * t * p2.y + t * t * p3.y,
            oneMinusT * oneMinusT * p1.z + 2 * oneMinusT * t * p2.z + t * t * p3.z
          );

          // Flyver tæt forbi haven: hørbar og synlig
          const distToGarden = Math.hypot(group.position.x, group.position.z);
          isAudibleOrVisibleNear = distToGarden < 32.0;

          // Drej helikopteren med flyveretningen og bank i kurven
          const dirX = group.position.x - prevPos.x;
          const dirZ = group.position.z - prevPos.z;
          if (Math.hypot(dirX, dirZ) > 0.01) {
            const targetHeading = Math.atan2(dirX, dirZ);
            group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetHeading, 0.08);
            // Let næsedyp (pitch) og krængning (roll) i kurven
            group.rotation.x = 0.10;
            group.rotation.z = -0.15 * (1.0 - Math.abs(t - 0.5) * 2);
          }

          if (t >= 1.0) {
            state = 'approach';
            stateTime = 0;
          }
          break;
        }

        case 'approach': {
          // Varighed: 12 sekunder
          // Cirkler ind mod sygehuset næsen forrest, sænker farten og lander lodret
          const duration = 12.0;
          const t = Math.min(1.0, stateTime / duration);
          rotorSpeed = 27.0;
          isAudibleOrVisibleNear = false;

          // Nedstigning: først flyvning til hoverPos (t=0..0.7), derefter lodret touchdown til landPos (t=0.7..1.0)
          if (t < 0.7) {
            const subT = t / 0.7;
            const easeT = 0.5 - 0.5 * Math.cos(subT * Math.PI);
            group.position.lerpVectors(approachPos, hoverPos, easeT);

            const dirX = group.position.x - prevPos.x;
            const dirZ = group.position.z - prevPos.z;
            if (Math.hypot(dirX, dirZ) > 0.01) {
              const targetHeading = Math.atan2(dirX, dirZ);
              group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetHeading, 0.12);
              // Let afbremsning (svag flare / næse op for at tage farten af)
              group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, -0.05, 0.08);
              group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, 0, 0.08);
            }
          } else {
            const subT = (t - 0.7) / 0.3;
            const easeT = 0.5 - 0.5 * Math.cos(subT * Math.PI);
            group.position.lerpVectors(hoverPos, landPos, easeT);

            // Lodret fald til helipladsen i helt vandret attityde
            group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, 0, 0.10);
            group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, 0, 0.10);
          }

          if (t >= 1.0) {
            state = 'landed';
            stateTime = 0;
            group.position.copy(landPos);
            group.rotation.x = 0;
            group.rotation.z = 0;
          }
          break;
        }

        case 'landed': {
          // Holder på helipladsen i præcis 45 sekunder
          const stayDuration = 45.0;
          group.position.copy(landPos);
          isAudibleOrVisibleNear = false;

          // Rotoren decelererer blødt til rolig tomgang (~8 rad/s)
          // og speeder op igen de sidste 4 sekunder før afgang
          const timeRemaining = stayDuration - stateTime;
          if (timeRemaining > 4.0) {
            rotorSpeed = THREE.MathUtils.lerp(rotorSpeed, 8.0, 0.03);
          } else {
            // Turbinerne pisker op før takeoff
            rotorSpeed = THREE.MathUtils.lerp(rotorSpeed, 28.0, 0.08);
          }

          if (stateTime >= stayDuration) {
            state = 'takeoff';
            stateTime = 0;
          }
          break;
        }

        case 'takeoff': {
          // Varighed: 8 sekunder
          // Letter lodret 6m op fra helipladsen, vipper næsen fremad og drejer mod udflyvningsretningen
          const duration = 8.0;
          const t = Math.min(1.0, stateTime / duration);
          rotorSpeed = 28.0;
          isAudibleOrVisibleNear = false;

          // Lodret løft
          const easeT = 0.5 - 0.5 * Math.cos(t * Math.PI);
          group.position.lerpVectors(landPos, takeoffHoverPos, easeT);

          // Drej mod udflyvningsretningen (mod outMidPos mod vest/nordvest)
          const targetTakeoffHeading = Math.atan2(outMidPos.x - takeoffHoverPos.x, outMidPos.z - takeoffHoverPos.z);
          group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetTakeoffHeading, 0.08);

          // Vip næsen fremad i slutningen af løftet
          if (t > 0.5) {
            group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, 0.12, 0.08);
          }

          if (t >= 1.0) {
            state = 'outbound';
            stateTime = 0;
          }
          break;
        }

        case 'outbound': {
          // Varighed: 18 sekunder
          // Flyver hurtigt væk mod vest/nordvest mod Aalborg
          const duration = 18.0;
          const t = Math.min(1.0, stateTime / duration);
          rotorSpeed = 28.0;

          // Kvadratisk bezier ud mod horisonten
          const p1 = takeoffHoverPos;
          const p2 = outMidPos;
          const p3 = outEndPos;
          const oneMinusT = 1.0 - t;

          group.position.set(
            oneMinusT * oneMinusT * p1.x + 2 * oneMinusT * t * p2.x + t * t * p3.x,
            oneMinusT * oneMinusT * p1.y + 2 * oneMinusT * t * p2.y + t * t * p3.y,
            oneMinusT * oneMinusT * p1.z + 2 * oneMinusT * t * p2.z + t * t * p3.z
          );

          const dirX = group.position.x - prevPos.x;
          const dirZ = group.position.z - prevPos.z;
          if (Math.hypot(dirX, dirZ) > 0.01) {
            const targetHeading = Math.atan2(dirX, dirZ);
            group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetHeading, 0.08);
            group.rotation.x = 0.12;
            group.rotation.z = 0.10 * (1.0 - t);
          }

          // Ikke længere hørbar tæt på haven
          isAudibleOrVisibleNear = false;

          if (t >= 1.0) {
            state = 'cooldown';
            stateTime = 0;
            group.visible = false;
          }
          break;
        }

        case 'cooldown': {
          // Pause før næste helikopter kan udløses
          group.visible = false;
          isAudibleOrVisibleNear = false;
          rotorSpeed = 0;

          if (stateTime >= 60.0) {
            resetToIdle();
          }
          break;
        }
      }
    },
  };
}
