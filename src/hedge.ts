/** Hækkens løv: små overlappende skud og foldede blade, samlet i to draw calls med årstidsfarver. */
import * as THREE from 'three';

export type HedgeSeason = 'spring' | 'summer' | 'early_autumn' | 'copper_autumn';

export function getHedgeSeason(date: Date): HedgeSeason {
  const m = date.getMonth(); // 0 = Jan, 4 = Maj, 9 = Okt
  const d = date.getDate();
  if (m === 4) return 'spring'; // Maj: frisk lysegrøn
  if (m >= 5 && m <= 7) return 'summer'; // Juni-Aug: frodig dybgrøn
  if (m === 8 || (m === 9 && d < 15)) return 'early_autumn'; // Sep - medio okt: gyldengrøn overgang
  return 'copper_autumn'; // Ultimo okt - marts: varm kobberbrun/rustrød vinterbøg
}

export type HedgeFoliage = THREE.Group & {
  setDate(date: Date): void;
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
  const shootsPerBush = 36, leavesPerShoot = 24;
  const totalShoots = positions.length * shootsPerBush;
  const totalLeaves = totalShoots * leavesPerShoot;

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
  const shootRands = new Float32Array(totalShoots * 2);
  const leafLights = new Float32Array(totalLeaves);
  const leafRands = new Float32Array(totalLeaves * 2);

  let shootIndex = 0, leafIndex = 0;
  for (const [x, z, y, size] of positions) {
    const inward = new THREE.Vector3(-x, 0, -z);
    if (Math.abs(x) > Math.abs(z) + 0.5) inward.set(-Math.sign(x), 0, 0);
    else inward.set(0, 0, -Math.sign(z));
    const tangent = new THREE.Vector3(-inward.z, 0, inward.x);

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

      const light = 0.08 + rand() * 0.055 + Math.max(0, elevation) * 0.02;
      shootLights[shootIndex] = light;
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

        leafLights[leafIndex] = light;
        leafRands[leafIndex * 2] = rand();
        leafRands[leafIndex * 2 + 1] = rand();
        leafIndex++;
      }
    }
  }

  let currentSeason: HedgeSeason | null = null;
  function applySeason(season: HedgeSeason) {
    if (season === currentSeason) return;
    currentSeason = season;

    if (season === 'copper_autumn') {
      coreMaterial.color.set('#763d1c');
    } else if (season === 'early_autumn') {
      coreMaterial.color.set('#5c6130');
    } else if (season === 'spring') {
      coreMaterial.color.set('#4a6638');
    } else {
      coreMaterial.color.set('#425338');
    }
    coreMaterial.needsUpdate = true;

    for (let i = 0; i < totalShoots; i++) {
      const light = shootLights[i];
      const r1 = shootRands[i * 2], r2 = shootRands[i * 2 + 1];
      if (season === 'copper_autumn') {
        color.setHSL(0.078 + r1 * 0.035, 0.74 + r2 * 0.16, light * 1.35 + 0.10);
      } else if (season === 'early_autumn') {
        color.setHSL(0.16 + r1 * 0.07, 0.45 + r2 * 0.20, light + 0.045);
      } else if (season === 'spring') {
        color.setHSL(0.26 + r1 * 0.04, 0.52 + r2 * 0.18, light + 0.07);
      } else {
        color.setHSL(0.27 + r1 * 0.055, 0.34 + r2 * 0.16, light + 0.045);
      }
      shoots.setColorAt(i, color);
    }
    if (shoots.instanceColor) shoots.instanceColor.needsUpdate = true;

    for (let i = 0; i < totalLeaves; i++) {
      const light = leafLights[i];
      const r1 = leafRands[i * 2], r2 = leafRands[i * 2 + 1];
      if (season === 'copper_autumn') {
        color.setHSL(0.072 + r1 * 0.042, 0.76 + r2 * 0.16, light * 1.32 + 0.08 + r2 * 0.05);
      } else if (season === 'early_autumn') {
        color.setHSL(0.15 + r1 * 0.09, 0.48 + r2 * 0.20, light + 0.01 + r2 * 0.035);
      } else if (season === 'spring') {
        color.setHSL(0.25 + r1 * 0.05, 0.55 + r2 * 0.20, light + 0.05 + r2 * 0.04);
      } else {
        color.setHSL(0.25 + r1 * 0.075, 0.35 + r2 * 0.2, light + 0.005 + r2 * 0.035);
      }
      leaves.setColorAt(i, color);
    }
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  }

  applySeason(getHedgeSeason(initialDate));
  shoots.computeBoundingSphere();
  leaves.computeBoundingSphere();
  group.add(shoots, leaves);

  return Object.assign(group, {
    setDate(date: Date) {
      applySeason(getHedgeSeason(date));
    },
    update(time: number, _dt: number, wind: number) {
      windUniforms.windTime.value = time;
      windUniforms.windStrength.value = THREE.MathUtils.clamp(wind / 6.0, 0.0, 0.65);
    },
  });
}
