/**
 * Fodspor i sne og rimfrost.
 * Hver gang en and har flyttet sig ca. et skridt på land, sættes et svømmefod-aftryk
 * (skiftevis venstre/højre fod) på jorden. Aftrykkene falmer langsomt bort.
 * I sne ses de som blågrå, nedtrådte fordybninger; i rimfrost som mørkegrønne aftryk,
 * hvor rimen er trådt af græsset – præcis som i en rigtig frostklar morgenhave.
 */
import * as THREE from 'three';
import { POND } from './types';
import { SHELTER, gardenGroundHeight } from './shelter';

export interface FootprintDuck {
  id: string;
  x: number;
  z: number;
  y: number;
  heading: number;
  state: string;
}

export interface Footprints {
  mesh: THREE.InstancedMesh;
  update(ducks: readonly FootprintDuck[], frost: number, snow: number, dt: number): void;
  readonly activeCount: number;
}

const MAX_PRINTS = 420;
const STEP_LENGTH = 0.15;
const FOOT_SPREAD = 0.055;
const LIFETIME = 150; // sekunder før et aftryk er helt væk

function footprintGeometry(): THREE.BufferGeometry {
  // Tre-tået svømmefod med svømmehud (samme silhuet som andens egen fod, i mindre format)
  const s = new THREE.Shape();
  s.moveTo(-0.010, -0.012);
  s.bezierCurveTo(-0.018, 0.012, -0.040, 0.040, -0.044, 0.066);
  s.lineTo(-0.027, 0.059);
  s.lineTo(-0.018, 0.076);
  s.lineTo(0, 0.067);
  s.lineTo(0.018, 0.076);
  s.lineTo(0.027, 0.059);
  s.lineTo(0.044, 0.066);
  s.bezierCurveTo(0.040, 0.040, 0.018, 0.012, 0.010, -0.012);
  s.closePath();
  const geo = new THREE.ShapeGeometry(s, 3);
  geo.rotateX(Math.PI / 2); // tæer peger mod lokal +Z (andens fremadretning)
  return geo;
}

export function createFootprints(scene: THREE.Scene): Footprints {
  const fade = new Float32Array(MAX_PRINTS);
  const age = new Float32Array(MAX_PRINTS).fill(LIFETIME);
  const geo = footprintGeometry();
  const fadeAttr = new THREE.InstancedBufferAttribute(fade, 1);
  fadeAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aFade', fadeAttr);

  const uniforms = {
    uSnowColor: { value: new THREE.Color('#8fa3bb') },
    uFrostColor: { value: new THREE.Color('#3f6b33') },
    uSnow: { value: 0 },
    uFrost: { value: 0 },
  };
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'attribute float aFade;\nvarying float vFade;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvFade = aFade;',
    );
    shader.fragmentShader = `uniform vec3 uSnowColor;
uniform vec3 uFrostColor;
uniform float uSnow;
uniform float uFrost;
varying float vFade;
` + shader.fragmentShader.replace(
      '#include <alphamap_fragment>',
      `#include <alphamap_fragment>
      float snowW = clamp(uSnow * 1.6, 0.0, 1.0);
      diffuseColor.rgb = mix(uFrostColor, uSnowColor, snowW);
      diffuseColor.a = vFade * max(snowW * 0.62, clamp(uFrost, 0.0, 1.0) * 0.48);`,
    );
  };

  const mesh = new THREE.InstancedMesh(geo, material, MAX_PRINTS);
  mesh.name = 'duck-footprints';
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  mesh.count = 0;
  mesh.visible = false;
  scene.add(mesh);

  const tracks = new Map<string, { x: number; z: number; left: boolean }>();
  const dummy = new THREE.Object3D();
  let cursor = 0;
  let used = 0;

  function canPrint(d: FootprintDuck): boolean {
    if (d.state === 'swim' || d.state === 'enter' || d.state === 'exit' || d.state === 'fly') return false;
    if (d.y > 0.06) return false; // i luften / på kanten af badet
    const dx = d.x - POND.x, dz = d.z - POND.z;
    if (Math.hypot(dx, dz) < POND.radius + 0.05) return false;
    // Under andehusets tag ligger der ingen sne
    if (d.x > SHELTER.minX - 0.05 && d.x < SHELTER.maxX + 0.05 && d.z > SHELTER.back - 0.05 && d.z < SHELTER.front + 0.05) return false;
    return true;
  }

  function stamp(x: number, z: number, heading: number, left: boolean) {
    const side = left ? 1 : -1;
    // Højre-vektor for en and der kigger mod +Z ved heading 0
    const rx = Math.cos(heading), rz = -Math.sin(heading);
    const px = x + rx * FOOT_SPREAD * side;
    const pz = z + rz * FOOT_SPREAD * side;
    dummy.position.set(px, gardenGroundHeight(px, pz) + 0.003, pz);
    // Ænder sætter tæerne let indad
    dummy.rotation.set(0, heading - side * 0.12, 0);
    dummy.scale.setScalar(0.9 + ((cursor * 37) % 10) * 0.02);
    dummy.updateMatrix();
    mesh.setMatrixAt(cursor, dummy.matrix);
    age[cursor] = 0;
    cursor = (cursor + 1) % MAX_PRINTS;
    used = Math.min(MAX_PRINTS, used + 1);
    mesh.count = used;
    mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    mesh,
    get activeCount() {
      let n = 0;
      for (let i = 0; i < used; i++) if (age[i] < LIFETIME) n++;
      return n;
    },
    update(ducks, frost, snow, dt) {
      const step = Math.max(0, Math.min(dt, 0.25));
      uniforms.uSnow.value = snow;
      uniforms.uFrost.value = frost;
      const groundCovered = snow > 0.2 || frost > 0.35;

      for (const d of ducks) {
        const t = tracks.get(d.id);
        if (!t) { tracks.set(d.id, { x: d.x, z: d.z, left: false }); continue; }
        const moved = Math.hypot(d.x - t.x, d.z - t.z);
        if (moved > 1.2) { t.x = d.x; t.z = d.z; continue; } // teleport/reset
        if (moved >= STEP_LENGTH) {
          if (groundCovered && canPrint(d)) {
            const travel = Math.atan2(d.x - t.x, d.z - t.z);
            stamp(d.x, d.z, travel, t.left);
            t.left = !t.left;
          }
          t.x = d.x; t.z = d.z;
        }
      }

      // Rimfrost tør hurtigere væk end sne fyger til
      const decay = snow > 0.2 ? 1 : 1.8;
      let anyVisible = false;
      for (let i = 0; i < used; i++) {
        if (age[i] < LIFETIME) age[i] += step * decay;
        const life = 1 - age[i] / LIFETIME;
        const f = life <= 0 ? 0 : Math.min(1, life * 1.6);
        fade[i] = f;
        if (f > 0.01) anyVisible = true;
      }
      fadeAttr.needsUpdate = true;
      mesh.visible = anyVisible && (snow > 0.05 || frost > 0.1);
    },
  };
}
