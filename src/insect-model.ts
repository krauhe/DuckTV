import * as THREE from 'three';

const bodyGeometry = new THREE.SphereGeometry(.022, 8, 6);
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x34312b, roughness: .8 });
const wingGeometry = new THREE.SphereGeometry(1, 8, 6);
const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xc7dbe2, transparent: true, opacity: .7, roughness: .35 });

export function createFly() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.scale.set(1, .7, 1.4);
  group.add(body);
  const wings = [-1, 1].map(side => {
    const wing = new THREE.Mesh(wingGeometry, wingMaterial);
    wing.position.set(side * .025, .008, -.01);
    wing.scale.set(.038, .003, .022);
    group.add(wing);
    return wing;
  });
  group.visible = false;
  return { group, wings };
}
