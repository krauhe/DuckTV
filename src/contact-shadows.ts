import * as THREE from 'three';
import type { DuckState } from './types';

export interface DuckShadowTarget {
  x: number;
  y: number;
  z: number;
  heading: number;
  state: DuckState;
}

export function createContactShadows(scene: THREE.Scene, count = 4) {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size * 2 - 1;
      const dy = (y + 0.5) / size * 2 - 1;
      const dist = Math.hypot(dx, dy);
      const alpha = 1 - THREE.MathUtils.smoothstep(dist, 0.1, 0.95);
      const index = (y * size + x) * 4;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = Math.round(alpha * 255);
      pixels[index + 3] = 255;
    }
  }
  const mask = new THREE.DataTexture(pixels, size, size);
  mask.needsUpdate = true;
  mask.magFilter = THREE.LinearFilter;

  const group = new THREE.Group();
  group.name = 'duck-contact-shadows';
  scene.add(group);

  const shadowGeo = new THREE.CircleGeometry(1, 24);
  const shadows: THREE.Group[] = [];
  const materials: THREE.MeshBasicMaterial[] = [];

  for (let i = 0; i < count; i++) {
    const shadowGroup = new THREE.Group();
    shadowGroup.name = `duck-contact-shadow-${i}`;

    const mat = new THREE.MeshBasicMaterial({
      color: '#122310',
      alphaMap: mask,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    materials.push(mat);

    const mesh = new THREE.Mesh(shadowGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 1;
    shadowGroup.add(mesh);

    group.add(shadowGroup);
    shadows.push(shadowGroup);
  }

  return {
    group,
    shadows,
    materials,
    update(ducks: readonly DuckShadowTarget[], groundHeight: (x: number, z: number) => number) {
      for (let i = 0; i < count; i++) {
        const shadow = shadows[i];
        if (i >= ducks.length) {
          shadow.visible = false;
          continue;
        }
        const d = ducks[i];
        if (d.state === 'swim') {
          shadow.visible = false;
          continue;
        }
        const gy = groundHeight(d.x, d.z);
        const lift = Math.max(0, d.y - gy);
        const heightFade = THREE.MathUtils.clamp(1 - lift / 0.45, 0, 1);
        if (heightFade <= 0.02) {
          shadow.visible = false;
          continue;
        }
        shadow.visible = true;
        shadow.position.set(d.x, gy + 0.005, d.z);
        shadow.rotation.y = d.heading;

        const lying = d.state === 'sleep' || d.state === 'rest';
        const rx = (lying ? 0.21 : 0.17) * (1 - lift * 0.35);
        const rz = (lying ? 0.30 : 0.24) * (1 - lift * 0.35);
        shadow.scale.set(Math.max(0.04, rx), 1, Math.max(0.04, rz));
        materials[i].opacity = (lying ? 0.33 : 0.25) * heightFade;
      }
    },
  };
}
