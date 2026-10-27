/** Hækkens løv: små overlappende skud, grenværk og foldede blade med årstidsfarver, løvfald og sne/rim. */
import * as THREE from 'three';

export type HedgeSeason = 'spring' | 'summer' | 'early_autumn' | 'copper_autumn' | 'winter';

export function getHedgeSeason(date: Date): HedgeSeason {
  const m = date.getMonth(); // 0 = Jan, 4 = Maj, 9 = Okt, 11 = Dec
  const d = date.getDate();
  if (m === 11 || m <= 2) return 'winter'; // Dec - Marts: udtyndet vinter-bøgehæk med grenværk
  if (m === 3 || m === 4) return 'spring'; // April - Maj: frisk lysegrøn
  if (m >= 5 && m <= 7) return 'summer'; // Juni - Aug: frodig dybgrøn
  if (m === 8 || (m === 9 && d < 15)) return 'early_autumn'; // Sep - medio okt: gyldengrøn overgang
  return 'copper_autumn'; // Ultimo okt - nov: varm kobberbrun efterårsbøg
}

export type HedgeFoliage = THREE.Group & {
  setDate(date: Date): void;
  setWinterWeather(frost: number, snow: number): void;
  setLowQuality(low: boolean): void;
  update(time: number, dt: number, wind: number): void;
};

export function createHedgeDetails(
  positions: ReadonlyArray<readonly [number, number, number, number]>,
  coreMaterial: THREE.MeshStandardMaterial,
  initialDate = new Date(),
): HedgeFoliage {
  const group = new THREE.Group();
  group.name = 'hedge-foliage';

  // Egen seed holder resten af havens tilfældige detaljer uændrede.
  let seed = 81023;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  const shootsPerBush = 36, leavesPerShoot = 24, branchesPerBush = 10;
  const totalShoots = positions.length * shootsPerBush;
  const totalLeaves = totalShoots * leavesPerShoot;
  const totalBranches = positions.length * branchesPerBush;

  // Lette vinduniforms til bladenes blafren (svarende til kronbladene på blomsterne)
  const windUniforms = {
    windTime: { value: 0 },
    windStrength: { value: 0.1 },
  };

  // Neutralt bladmønster der muliggør dynamisk årstidsfarvning i Three.js shaderen.
  let texture: THREE.Texture | null = null;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#b0b8ae';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 360; i++) {
        const x = rand() * 256, y = rand() * 256, angle = rand() * Math.PI;
        const tone = Math.floor(140 + rand() * 90);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4 + rand() * 4, 8 + rand() * 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#858d83';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(0, 8);
        ctx.stroke();
        ctx.restore();
      }
      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const coreTexture = texture.clone();
      coreTexture.wrapS = coreTexture.wrapT = THREE.RepeatWrapping;
      coreTexture.repeat.set(4, 3);
      coreMaterial.map = coreTexture;
      coreMaterial.needsUpdate = true;
    }
  }

  // Indre grenværk der bliver tydeligt, når hækken smider størstedelen af bladene om vinteren
  const branchGeo = new THREE.CylinderGeometry(0.012, 0.028, 1.0, 5);
  branchGeo.translate(0, 0.5, 0);
  const branchMat = new THREE.MeshStandardMaterial({ color: 0x3b2d22, roughness: 0.95 });
  const branches = new THREE.InstancedMesh(branchGeo, branchMat, totalBranches);
  branches.name = 'hedge-branches';
  branches.castShadow = false;
  branches.receiveShadow = true;

  // Klyngerne og hækkens faste kerne er helt rolige og faste (bølger ikke).
  const shoots = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: texture, roughness: 1 }),
    totalShoots,
  );
  shoots.name = 'hedge-leaf-clusters';
  shoots.castShadow = false;
  shoots.receiveShadow = true;

  // En lille midterfold giver bladet to forskellige lysflader uden billedteksturer.
  const leaf = new THREE.BufferGeometry();
  leaf.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, -0.045, 0.06, 0, 0, 0.065, 0.018,
    -0.045, 0.06, 0, 0, 0.13, 0, 0, 0.065, 0.018,
    0, 0, 0, 0, 0.065, 0.018, 0.045, 0.06, 0,
    0.045, 0.06, 0, 0, 0.065, 0.018, 0, 0.13, 0,
  ], 3));
  leaf.computeVertexNormals();

  // Kun enkelte blade (~15% af de mest udsatte yderblade/topblade) blafrer i vinden,
  // præcis som kronbladene på blomsterne. Resten af hækken står helt fast.
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  leafMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = windUniforms.windTime;
    shader.uniforms.windStrength = windUniforms.windStrength;
    shader.vertexShader = 'uniform float windTime;\nuniform float windStrength;\n' + shader.vertexShader;
    const target = '#include <project_vertex>';
    const replacement = `
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_BATCHING
        mvPosition = batchingMatrix * mvPosition;
      #endif
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif

      // Kun ~15% af de øverste/yderste blade blafrer let i vinden (ligesom blomsterblade)
      float leafSeed = fract(sin(dot(mvPosition.xz, vec2(12.9898, 78.233)) + mvPosition.y * 37.1) * 43758.5453);
      float isFlutterLeaf = smoothstep(0.85, 0.97, leafSeed) * smoothstep(0.35, 1.1, mvPosition.y);
      if (isFlutterLeaf > 0.001) {
        float flutterAngle = sin(windTime * (6.5 + windStrength * 3.5) + leafSeed * 25.0);
        float flutterCross = cos(windTime * 5.2 + leafSeed * 18.0);
        vec3 flutterOffset = vec3(
          flutterAngle * 0.016,
          sin(windTime * 8.0 + leafSeed * 31.0) * 0.005,
          flutterCross * 0.012
        ) * windStrength * isFlutterLeaf;
        mvPosition.xyz += flutterOffset;
      }

      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
    `;
    shader.vertexShader = shader.vertexShader.replace(target, replacement);
  };

  const leaves = new THREE.InstancedMesh(
    leaf,
    leafMaterial,
    totalLeaves,
  );
  leaves.name = 'hedge-individual-leaves';
  leaves.receiveShadow = true;

  const shootLights = new Float32Array(totalShoots);
  const shootElevations = new Float32Array(totalShoots);
  const shootRands = new Float32Array(totalShoots * 2);
  const shootBaseMatrices = new Float32Array(totalShoots * 16);

  const leafLights = new Float32Array(totalLeaves);
  const leafElevations = new Float32Array(totalLeaves);
  const leafRands = new Float32Array(totalLeaves * 2);
  const leafBaseMatrices = new Float32Array(totalLeaves * 16);

  let shootIndex = 0, leafIndex = 0, branchIndex = 0;
  for (const [x, z, y, size] of positions) {
    const inward = new THREE.Vector3(-x, 0, -z);
    if (Math.abs(x) > Math.abs(z) + 0.5) inward.set(-Math.sign(x), 0, 0);
    else inward.set(0, 0, -Math.sign(z));
    const tangent = new THREE.Vector3(-inward.z, 0, inward.x);

    // Forgrenet indre træskelet i hver hæk-busk
    for (let b = 0; b < branchesPerBush; b++) {
      const sideOffset = (rand() - 0.5) * 1.1 * size;
      const inOffset = (rand() - 0.3) * 0.65 * size;
      dummy.position.set(x, 0.05 + (b % 3) * 0.35 * size, z)
        .addScaledVector(tangent, sideOffset)
        .addScaledVector(inward, inOffset);
      dummy.rotation.set(
        (rand() - 0.5) * 0.55,
        rand() * Math.PI * 2,
        (rand() - 0.5) * 0.55,
      );
      const bLen = (0.95 + rand() * 0.85) * size;
      dummy.scale.set(1, bLen, 1);
      dummy.updateMatrix();
      branches.setMatrixAt(branchIndex, dummy.matrix);
      color.setHSL(0.07 + rand() * 0.03, 0.32, 0.14 + rand() * 0.08);
      branches.setColorAt(branchIndex, color);
      branchIndex++;
    }

    for (let j = 0; j < shootsPerBush; j++) {
      const elevation = -0.85 + rand() * 2.2, side = (rand() - 0.5) * 1.9;
      const shell = Math.sqrt(Math.max(0.05, 1 - (elevation / 1.5) ** 2 - (side / 1.3) ** 2));
      const centre = new THREE.Vector3(x, y + elevation * size, z)
        .addScaledVector(inward, 1.15 * size * shell)
        .addScaledVector(tangent, side * size);
      const radius = 0.13 + rand() * 0.13;
      dummy.position.copy(centre);
      dummy.rotation.set(rand(), rand() * Math.PI * 2, rand());
      dummy.scale.set(radius * (0.85 + rand() * 0.4), radius * (0.8 + rand() * 0.5), radius);
      dummy.updateMatrix();
      shoots.setMatrixAt(shootIndex, dummy.matrix);
      dummy.matrix.toArray(shootBaseMatrices, shootIndex * 16);

      const light = 0.08 + rand() * 0.055 + Math.max(0, elevation) * 0.02;
      shootLights[shootIndex] = light;
      shootElevations[shootIndex] = elevation;
      shootRands[shootIndex * 2] = rand();
      shootRands[shootIndex * 2 + 1] = rand();
      shootIndex++;

      for (let k = 0; k < leavesPerShoot; k++) {
        const normal = new THREE.Vector3(rand() - 0.5, rand() - 0.3, rand() - 0.5).normalize();
        dummy.position.copy(centre).addScaledVector(normal, radius * (1.05 + rand() * 0.2));
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        dummy.rotateZ(rand() * Math.PI * 2);
        const leafSize = 0.8 + rand() * 0.65;
        dummy.scale.set(leafSize, leafSize, leafSize);
        dummy.updateMatrix();
        leaves.setMatrixAt(leafIndex, dummy.matrix);
        dummy.matrix.toArray(leafBaseMatrices, leafIndex * 16);

        leafLights[leafIndex] = light;
        leafElevations[leafIndex] = elevation + normal.y * 0.35;
        leafRands[leafIndex * 2] = rand();
        leafRands[leafIndex * 2 + 1] = rand();
        leafIndex++;
      }
    }
  }
  branches.instanceMatrix.needsUpdate = true;
  if (branches.instanceColor) branches.instanceColor.needsUpdate = true;

  let currentSeason: HedgeSeason | null = null;
  let currentDate = initialDate;
  let frostLevel = 0;
  let snowLevel = 0;
  let lowQuality = false;
  let lastWinterThinning = false;
  let lastLowQuality = false;
  let lastFrostQuant = -1;
  let lastSnowQuant = -1;
  const tempMat = new THREE.Matrix4();
  const snowColor = new THREE.Color('#eef5fc');
  const frostColor = new THREE.Color('#d2e4f0');

  function refreshAppearance(force = false) {
    const baseSeason = getHedgeSeason(currentDate);
    const effectiveSeason: HedgeSeason = (snowLevel > 0.25 || frostLevel > 0.25) && (baseSeason === 'copper_autumn' || baseSeason === 'winter')
      ? 'winter'
      : (snowLevel > 0.45 ? 'winter' : baseSeason);

    const frostQ = Math.round(frostLevel * 12);
    const snowQ = Math.round(snowLevel * 12);
    if (!force && effectiveSeason === currentSeason && frostQ === lastFrostQuant && snowQ === lastSnowQuant && lowQuality === lastLowQuality) {
      return;
    }
    currentSeason = effectiveSeason;
    lastFrostQuant = frostQ;
    lastSnowQuant = snowQ;

    const isWinter = effectiveSeason === 'winter';

    // Udtynd ~58% af løvet om vinteren, så grenværk og træerne bag hækken anes gennem toppen
    if (isWinter !== lastWinterThinning || lowQuality !== lastLowQuality) {
      lastWinterThinning = isWinter;
      lastLowQuality = lowQuality;
      for (let i = 0; i < totalShoots; i++) {
        tempMat.fromArray(shootBaseMatrices, i * 16);
        if (isWinter) {
          const r1 = shootRands[i * 2];
          const elev = shootElevations[i];
          // Toppen af hækken udtyndes mest, mens bunden stadig skærmer haven
          const dropChance = elev > 0.15 ? 0.55 : 0.25;
          if (r1 < dropChance && snowLevel < 0.4) {
            tempMat.scale(new THREE.Vector3(0.42, 0.42, 0.42));
          } else if (r1 < dropChance * 0.65) {
            tempMat.scale(new THREE.Vector3(0, 0, 0));
          }
        }
        shoots.setMatrixAt(i, tempMat);
      }
      shoots.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < totalLeaves; i++) {
        tempMat.fromArray(leafBaseMatrices, i * 16);
        if (lowQuality && i % 2 === 1) {
          tempMat.scale(new THREE.Vector3(0, 0, 0));
        } else if (isWinter) {
          const r1 = leafRands[i * 2];
          const elev = leafElevations[i];
          const dropChance = elev > 0.1 ? 0.65 : 0.45;
          if (r1 < dropChance) {
            tempMat.scale(new THREE.Vector3(0, 0, 0));
          }
        }
        leaves.setMatrixAt(i, tempMat);
      }
      leaves.instanceMatrix.needsUpdate = true;
    }

    if (effectiveSeason === 'winter') {
      coreMaterial.color.set('#4a2d1b').lerp(new THREE.Color('#8c9aa8'), snowLevel * 0.45 + frostLevel * 0.22);
    } else if (effectiveSeason === 'copper_autumn') {
      coreMaterial.color.set('#763d1c').lerp(frostColor, frostLevel * 0.25);
    } else if (effectiveSeason === 'early_autumn') {
      coreMaterial.color.set('#5c6130');
    } else if (effectiveSeason === 'spring') {
      coreMaterial.color.set('#4a6638');
    } else {
      coreMaterial.color.set('#425338');
    }
    coreMaterial.needsUpdate = true;

    for (let i = 0; i < totalShoots; i++) {
      const light = shootLights[i];
      const elev = shootElevations[i];
      const r1 = shootRands[i * 2], r2 = shootRands[i * 2 + 1];
      if (effectiveSeason === 'winter') {
        color.setHSL(0.072 + r1 * 0.03, 0.58 + r2 * 0.15, light * 1.15 + 0.07);
      } else if (effectiveSeason === 'copper_autumn') {
        color.setHSL(0.078 + r1 * 0.035, 0.74 + r2 * 0.16, light * 1.35 + 0.10);
      } else if (effectiveSeason === 'early_autumn') {
        color.setHSL(0.16 + r1 * 0.07, 0.45 + r2 * 0.20, light + 0.045);
      } else if (effectiveSeason === 'spring') {
        color.setHSL(0.26 + r1 * 0.04, 0.52 + r2 * 0.18, light + 0.07);
      } else {
        color.setHSL(0.27 + r1 * 0.055, 0.34 + r2 * 0.16, light + 0.045);
      }
      if (frostLevel > 0.02) {
        const rimExposure = THREE.MathUtils.clamp((elev + 0.4) / 1.4, 0.15, 1.0);
        color.lerp(frostColor, frostLevel * rimExposure * (0.45 + r2 * 0.35));
      }
      if (snowLevel > 0.02) {
        const topSnow = THREE.MathUtils.smoothstep(elev + r2 * 0.35, -0.15, 0.65);
        color.lerp(snowColor, snowLevel * topSnow * 0.92);
      }
      shoots.setColorAt(i, color);
    }
    if (shoots.instanceColor) shoots.instanceColor.needsUpdate = true;

    for (let i = 0; i < totalLeaves; i++) {
      const light = leafLights[i];
      const elev = leafElevations[i];
      const r1 = leafRands[i * 2], r2 = leafRands[i * 2 + 1];
      if (effectiveSeason === 'winter') {
        color.setHSL(0.068 + r1 * 0.035, 0.64 + r2 * 0.15, light * 1.18 + 0.06 + r2 * 0.04);
      } else if (effectiveSeason === 'copper_autumn') {
        color.setHSL(0.072 + r1 * 0.042, 0.76 + r2 * 0.16, light * 1.32 + 0.08 + r2 * 0.05);
      } else if (effectiveSeason === 'early_autumn') {
        color.setHSL(0.15 + r1 * 0.09, 0.48 + r2 * 0.20, light + 0.01 + r2 * 0.035);
      } else if (effectiveSeason === 'spring') {
        color.setHSL(0.25 + r1 * 0.05, 0.55 + r2 * 0.20, light + 0.05 + r2 * 0.04);
      } else {
        color.setHSL(0.25 + r1 * 0.075, 0.35 + r2 * 0.2, light + 0.005 + r2 * 0.035);
      }
      if (frostLevel > 0.02) {
        const rimExposure = THREE.MathUtils.clamp((elev + 0.3) / 1.3, 0.2, 1.0);
        color.lerp(frostColor, frostLevel * rimExposure * 0.58);
      }
      if (snowLevel > 0.02) {
        const topSnow = THREE.MathUtils.smoothstep(elev + r2 * 0.3, 0.0, 0.75);
        color.lerp(snowColor, snowLevel * topSnow * 0.88);
      }
      leaves.setColorAt(i, color);
    }
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  }

  refreshAppearance(true);
  branches.computeBoundingSphere();
  shoots.computeBoundingSphere();
  leaves.computeBoundingSphere();
  group.add(branches, shoots, leaves);

  return Object.assign(group, {
    setDate(date: Date) {
      currentDate = date;
      refreshAppearance(false);
    },
    setWinterWeather(frost: number, snow: number) {
      frostLevel = THREE.MathUtils.clamp(frost, 0, 1);
      snowLevel = THREE.MathUtils.clamp(snow, 0, 1);
      refreshAppearance(false);
    },
    setLowQuality(low: boolean) {
      lowQuality = low;
      shoots.receiveShadow = !low;
      leaves.receiveShadow = !low;
      branches.receiveShadow = !low;
      refreshAppearance(false);
    },
    update(time: number, _dt: number, wind: number) {
      windUniforms.windTime.value = time;
      windUniforms.windStrength.value = THREE.MathUtils.clamp(wind / 6.0, 0.0, 0.65);
    },
  });
}
