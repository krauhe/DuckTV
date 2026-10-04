import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { DuckKind, DuckPose } from './types';
import { Spring } from './dynamics';

type Palette = {
  body: string; breast: string; neck: string; head: string; wing: string;
  covert: string; feather: string; tail: string; bill: string; foot: string;
  eyeRing: string; neckBand?: string;
};

const PALETTES: Record<DuckKind, Palette> = {
  drake: {
    body: '#a9aba2', breast: '#7c4032', neck: '#764536', head: '#263630',
    wing: '#777e79', covert: '#c2c3b7', feather: '#596469', tail: '#263b3a',
    bill: '#bbad6c', foot: '#d47b3b', eyeRing: '#b6a27b', neckBand: '#e6e5d5',
  },
  buff: {
    body: '#ad8363', breast: '#bc936b', neck: '#b9926e', head: '#c29b75',
    wing: '#8b6d56', covert: '#bc9b78', feather: '#705a49', tail: '#8a6952',
    bill: '#c6905c', foot: '#b96d3d', eyeRing: '#dfb98a',
  },
  brown: {
    body: '#74533e', breast: '#78503c', neck: '#7e5b43', head: '#76543f',
    wing: '#523f35', covert: '#89654d', feather: '#3e3934', tail: '#4c3c34',
    bill: '#856c4e', foot: '#a86539', eyeRing: '#b78c63',
  },
  pied: {
    body: '#ebe9df', breast: '#e2ded1', neck: '#eceae0', head: '#eeeae0',
    wing: '#363b3b', covert: '#555652', feather: '#262f32', tail: '#323738',
    bill: '#cba66b', foot: '#d47f40', eyeRing: '#b9a890',
  },
};

const sphere = new THREE.SphereGeometry(1, 16, 12);
const featherSphere = new THREE.SphereGeometry(1, 12, 8);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
const yAxis = new THREE.Vector3(0, 1, 0);

function material(hex: string, roughness = 0.89): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: hex, roughness, metalness: 0 });
}

function ellipsoid(
  parent: THREE.Object3D, mat: THREE.Material,
  position: [number, number, number], scale: [number, number, number],
  rotation?: [number, number, number], feather = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(feather ? featherSphere : sphere, mat);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function segment(
  parent: THREE.Object3D, mat: THREE.Material,
  a: THREE.Vector3, b: THREE.Vector3, radiusA: number, radiusB: number,
): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radiusB, radiusA, a.distanceTo(b), 9, 1);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(yAxis, b.clone().sub(a).normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

type Ring = { y: number; cx: number; cz: number; rx: number; rz: number; color?: string };

/** A smooth skin of elliptical rings, coloured by vertex so markings do not form stacked toy shapes. */
function ringMesh(parent: THREE.Object3D, rings: Ring[], mat: THREE.Material, sides = 16): THREE.Mesh {
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (const ring of rings) {
    const color = new THREE.Color(ring.color ?? '#ffffff');
    for (let j = 0; j < sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      vertices.push(ring.cx + Math.cos(angle) * ring.rx, ring.y,
        ring.cz + Math.sin(angle) * ring.rz);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j;
      const b = i * sides + (j + 1) % sides;
      const c = (i + 1) * sides + j;
      const d = (i + 1) * sides + (j + 1) % sides;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function bill(parent: THREE.Object3D, mat: THREE.Material, lowerMat: THREE.Material): void {
  // Upper bill: broad where it meets the face, flat and slightly downturned at the tip.
  const verts = [
    -.085, .093, .098, .085, .093, .098,
    -.071, .075, .224, .071, .075, .224,
    -.049, .052, .308, .049, .052, .308,
    -.084, .059, .107, .084, .059, .107,
    -.050, .045, .307, .050, .045, .307,
  ];
  const ix = [
    0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5,
    6, 7, 8, 7, 9, 8, 0, 6, 2, 2, 6, 8,
    1, 3, 7, 3, 9, 7, 4, 8, 5, 5, 8, 9,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(ix);
  geo.computeVertexNormals();
  const upper = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: (mat as THREE.MeshStandardMaterial).color, roughness: .78,
    side: THREE.DoubleSide,
  }));
  upper.castShadow = true;
  parent.add(upper);
  ellipsoid(parent, lowerMat, [0, .035, .215], [.064, .018, .105]);
  const nostril = material('#554c3d');
  for (const side of [-1, 1]) {
    ellipsoid(parent, nostril, [side * .055, .091, .162], [.006, .0035, .010]);
  }
}

function webbedFoot(parent: THREE.Object3D, footMat: THREE.Material): THREE.Group {
  const foot = new THREE.Group();
  foot.position.set(0, -.271, .018);
  parent.add(foot);
  const outline = new THREE.Shape();
  outline.moveTo(-.024, -.02);
  outline.bezierCurveTo(-.043, .028, -.104, .10, -.112, .168);
  outline.lineTo(-.069, .151);
  outline.lineTo(-.046, .193);
  outline.lineTo(0, .170);
  outline.lineTo(.046, .193);
  outline.lineTo(.069, .151);
  outline.lineTo(.112, .168);
  outline.bezierCurveTo(.104, .10, .043, .028, .024, -.02);
  outline.closePath();
  const geo = new THREE.ExtrudeGeometry(outline, {
    depth: .018, bevelEnabled: true, bevelThickness: .003, bevelSize: .003,
    bevelSegments: 1, curveSegments: 3,
  });
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, footMat);
  mesh.position.y = .018;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  foot.add(mesh);
  return foot;
}

function addWing(parent: THREE.Object3D, side: number, p: Palette,
  baseMat: THREE.Material, covertMat: THREE.Material,
  featherMat: THREE.Material): void {
  const wing = new THREE.Group();
  wing.position.set(side * .183, .016, -.100);
  wing.rotation.y = side * .12;
  parent.add(wing);
  ellipsoid(wing, baseMat, [side * .052, -.006, -.085],
    [.055, .135, .254], [.25, 0, side * -.10]);
  // The long trailing primary feathers are visible as a layered tapered edge.
  for (let i = 0; i < 5; i++) {
    const x = side * (.078 + i * .0015);
    const z = -.225 - i * .017;
    const feather = ellipsoid(wing, featherMat,
      [x, -.058 - i * .014, z], [.018, .042, .160 - i * .012],
      [.25, side * (.10 + i * .045), side * -.12], true);
    feather.material = featherMat;
  }
  ellipsoid(wing, covertMat, [side * .079, .039, -.095],
    [.024, .079, .177], [.24, 0, side * -.12], true);
  // Small covert tips break up the otherwise continuous wing surface.
  for (let i = 0; i < 4; i++) {
    ellipsoid(wing, covertMat,
      [side * .094, -.004 - i * .021, -.045 - i * .036],
      [.009, .020, .055], [.22, 0, side * -.18], true);
  }
  if (p === PALETTES.drake) {
    const speculum = material('#365963', .67);
    ellipsoid(wing, speculum, [side * .106, -.047, -.215],
      [.010, .042, .092], [.18, 0, side * -.16], true);
  }
}

function bodyMarkings(parent: THREE.Object3D, kind: DuckKind): void {
  if (kind === 'pied') {
    const charcoal = material('#414543');
    for (const side of [-1, 1]) {
      ellipsoid(parent, charcoal, [side * .221, -.085, -.249],
        [.023, .115, .142], [.25, side * .15, side * -.18]);
      ellipsoid(parent, charcoal, [side * .164, .178, -.072],
        [.023, .092, .101], [0, side * .12, side * -.26]);
    }
    return;
  }
  if (kind === 'buff' || kind === 'brown') {
    const stipple = material(kind === 'buff' ? '#8d6b54' : '#4e3d34');
    for (const side of [-1, 1]) {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          const z = -.25 + col * .105 + (row % 2) * .025;
          const y = -.11 + row * .055;
          const x = side * (.223 + (row === 3 ? -.012 : 0));
          ellipsoid(parent, stipple, [x, y, z],
            [.005, .007, .027], [0, side * -.15, side * -.28], true);
        }
      }
    }
  }
}

/** Bake rigid details that share a material into one mesh within each animated pivot. */
function combineRigidDetails(parent: THREE.Object3D): void {
  for (const child of [...parent.children]) {
    if (!(child instanceof THREE.Mesh)) combineRigidDetails(child);
  }
  const byMaterial = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of parent.children) {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) continue;
    const meshes = byMaterial.get(child.material) ?? [];
    meshes.push(child);
    byMaterial.set(child.material, meshes);
  }
  for (const [mat, meshes] of byMaterial) {
    if (meshes.length < 2) continue;
    const baked = meshes.map(mesh => {
      mesh.updateMatrix();
      return mesh.geometry.clone().applyMatrix4(mesh.matrix);
    });
    const geometry = mergeGeometries(baked, false);
    for (const item of baked) item.dispose();
    if (!geometry) continue;
    const combined = new THREE.Mesh(geometry, mat);
    combined.castShadow = meshes.some(mesh => mesh.castShadow);
    combined.receiveShadow = meshes.some(mesh => mesh.receiveShadow);
    for (const mesh of meshes) parent.remove(mesh);
    parent.add(combined);
  }
}

export function createDuck(kind: DuckKind): {
  group: THREE.Group; animate: (pose: DuckPose) => void;
} {
  const p = PALETTES[kind];
  const group = new THREE.Group();
  group.scale.setScalar(.8);
  const torso = new THREE.Group();
  torso.name = 'duck-torso';
  torso.position.set(0, .604, -.055);
  group.add(torso);
  // Shape only the feathered body. Keep the neck/head and leg rigs outside this
  // non-uniform scale so posture changes do not squash the face or stretch feet.
  const bodyShape = new THREE.Group();
  bodyShape.name = 'duck-body-shape';
  torso.add(bodyShape);

  const bodyMat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: .91, side: THREE.DoubleSide,
  });
  const bodyRings: Ring[] = [
    { y: -.29, cx: 0, cz: -.065, rx: .008, rz: .010, color: p.body },
    { y: -.26, cx: 0, cz: -.075, rx: .105, rz: .152, color: p.body },
    { y: -.18, cx: 0, cz: -.056, rx: .202, rz: .282, color: p.body },
    { y: -.06, cx: 0, cz: -.028, rx: .254, rz: .330, color: p.body },
    { y: .080, cx: 0, cz: .001, rx: .248, rz: .307, color: p.body },
    { y: .195, cx: 0, cz: .063, rx: .202, rz: .234, color: p.breast },
    { y: .285, cx: 0, cz: .101, rx: .142, rz: .153, color: p.breast },
    { y: .340, cx: 0, cz: .117, rx: .077, rz: .084, color: p.neck },
    { y: .359, cx: 0, cz: .122, rx: .008, rz: .009, color: p.neck },
  ];
  ringMesh(bodyShape, bodyRings, bodyMat, 20).name = 'duck-body-skin';
  bodyMarkings(bodyShape, kind);

  const wingMat = material(p.wing);
  const covertMat = material(p.covert);
  const featherMat = material(p.feather);
  for (const side of [-1, 1]) {
    addWing(bodyShape, side, p, wingMat, covertMat, featherMat);
  }

  const tailMat = material(p.tail);
  for (const side of [-1, 0, 1]) {
    ellipsoid(bodyShape, tailMat, [side * .057, -.101, -.377],
      [.049, .043, .185], [-.30, side * .13, side * .14], true);
  }

  // Neck is its own pivot: a peck swings the entire long neck forward and down.
  const neckPivot = new THREE.Group();
  neckPivot.name = 'duck-neck';
  neckPivot.position.set(0, .302, .143);
  torso.add(neckPivot);
  const neckMat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: .89, side: THREE.DoubleSide,
  });
  const band = p.neckBand ?? p.neck;
  ringMesh(neckPivot, [
    { y: -.025, cx: 0, cz: -.014, rx: .080, rz: .082, color: p.neck },
    { y: .035, cx: 0, cz: .003, rx: .087, rz: .085, color: p.neck },
    { y: .132, cx: 0, cz: .012, rx: .073, rz: .072, color: p.neck },
    { y: .235, cx: 0, cz: .023, rx: .057, rz: .057, color: p.neck },
    { y: .345, cx: 0, cz: .036, rx: .050, rz: .052, color: p.neck },
    { y: .397, cx: 0, cz: .043, rx: .050, rz: .052, color: band },
    { y: .431, cx: 0, cz: .048, rx: .052, rz: .053, color: band },
    { y: .469, cx: 0, cz: .053, rx: .057, rz: .055, color: p.head },
    { y: .540, cx: 0, cz: .056, rx: .071, rz: .063, color: p.head },
    { y: .578, cx: 0, cz: .056, rx: .008, rz: .009, color: p.head },
  ], neckMat, 12);

  const head = new THREE.Group();
  head.name = 'duck-head';
  head.position.set(0, .493, .050);
  neckPivot.add(head);
  const headMat = material(p.head, .86);
  const headSkin=ellipsoid(head, headMat, [0, .073, .025], [.081, .115, .087], [.13, 0, 0]);
  if(kind==='pied'){
    // Paint the crown directly on the skin: no raised side patches resembling ears.
    headSkin.geometry=new THREE.SphereGeometry(1,48,32);
    headMat.vertexColors=true;
    headMat.color.set('#ffffff');
    const positions=headSkin.geometry.getAttribute('position');
    const colors=new Float32Array(positions.count*3);
    const white=new THREE.Color(p.head),black=new THREE.Color('#303532');
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const left=((x+.32)/.46)**2+((z+.24)/.58)**2;
      const right=((x-.34)/.29)**2+((z+.04)/.42)**2;
      const color=y>.45&&(left<1||right<1)?black:white;
      color.toArray(colors,i*3);
    }
    headSkin.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  }
  // Broad brow and eye socket give the head a bird profile at distant camera angles.
  const eyeRingMat = material(p.eyeRing);
  const eyeMat = material('#181a17', .24);
  const glintMat = new THREE.MeshBasicMaterial({ color: '#f9f4e5' });
  const eyes: THREE.Group[]=[];
  const eyeGlints: THREE.Mesh[]=[];
  for (const side of [-1, 1]) {
    const eye=new THREE.Group();eye.position.set(side*.074,.087,.065);head.add(eye);eyes.push(eye);
    ellipsoid(eye, eyeRingMat, [0, 0, 0],
      [.012, .025, .026]);
    ellipsoid(eye, eyeMat, [side * .007, .001, .003],
      [.008, .016, .017]);
    eyeGlints.push(ellipsoid(eye, glintMat, [side * .013, .009, .011],
      [.0025, .004, .004]));
  }
  if (kind === 'pied') {
    ellipsoid(neckPivot, material('#c48668'), [0, .255, .078],
      [.043, .085, .012], [.08, 0, 0], true);
  }
  bill(head, material(p.bill), material(kind === 'drake' ? '#9f875a' : '#a87550'));

  const footMat = material(p.foot);
  const legs: THREE.Group[] = [];
  const feet: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'duck-left-leg' : 'duck-right-leg';
    leg.position.set(side * .112, .299, -.094);
    group.add(leg);
    segment(leg, footMat, new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * .009, -.242, .023), .018, .014);
    ellipsoid(leg, footMat, [side * .009, -.240, .026],
      [.022, .027, .026]);
    const foot = webbedFoot(leg, footMat);
    foot.position.x = side * .009;
    legs.push(leg);
    feet.push(foot);
  }

  combineRigidDetails(group);
  let previousTime = 0;
  let gaitPhase = 0;
  let swimBlend = 0;
  let uprightBlend = 1;
  let tiltBlend = 0;
  let displayBlend = 0;
  let preenBlend = 0;
  let sleepBlend = 0;
  let jumpBlend=0;
  const bodyPitch=new Spring(0,1.4,100,20),bodyRoll=new Spring(0,1.4,100,20);
  const neckForward=new Spring(0,.25,35,5),neckSide=new Spring(0,.25,35,5);
  const bodyExtension=new Spring(1,1,90,18);
  // Solve the neck from its body attachment to the intended steady head pose.
  // Reused scratch objects avoid allocations on every animation frame.
  const steadyHead = new THREE.Vector3();
  const desiredNeck = new THREE.Vector3();
  const currentNeck = new THREE.Vector3();
  const inverseTorso = new THREE.Matrix4();
  const steadyHeadRotation = new THREE.Quaternion();
  const neckCorrection = new THREE.Quaternion();
  const parentRotation = new THREE.Quaternion();

  function animate(pose: DuckPose): void {
    const { state, time } = pose;
    const dt = Math.max(0, Math.min(.05, time - previousTime));
    previousTime = time;
    const forward=THREE.MathUtils.clamp(pose.accelerationForward??0,-3,3);
    const lateral=THREE.MathUtils.clamp(pose.accelerationSide??0,-3,3);
    const pitch=bodyPitch.step(forward*.06,dt),roll=bodyRoll.step(-lateral*.05,dt);
    const headLag=neckForward.step(-forward*.014,dt),headSide=neckSide.step(-lateral*.014,dt);
    // Smooth the posture and expression signals independently of the walking gait.
    const postureResponse = 1 - Math.exp(-dt * 6);
    const jump=pose.jumpProgress??-1,airborne=jump>=0;
    jumpBlend+=((airborne?1:0)-jumpBlend)*(1-Math.exp(-dt*25));
    const crouch=pose.crouch??0,landing=pose.landing??0;
    preenBlend += ((state==='preen'?1:0)-preenBlend)*postureResponse;
    sleepBlend += ((state==='sleep'?1:0)-sleepBlend)*postureResponse;
    uprightBlend += (THREE.MathUtils.clamp(pose.upright, 0, 1) -
      uprightBlend) * postureResponse;
    tiltBlend += (THREE.MathUtils.clamp(pose.headTilt, -.48, .48) -
      tiltBlend) * postureResponse;
    displayBlend += (THREE.MathUtils.clamp(pose.displayDip, 0, 1) -
      displayBlend) * postureResponse;
    const moving = !airborne&&crouch===0&&pose.speed > .005 && state!=='swim' && state!=='sleep' && state!=='preen';
    const swim = state === 'swim';
    const peck = Math.max(0, pose.peck);
    const peckAmount = Math.min(1, peck);
    const stride = moving ? Math.min(1, Math.max(.08, pose.speed * 2.5)) : 0;
    if (moving) gaitPhase += dt * (7.5 + Math.min(4, pose.speed * 9));
    const phase = gaitPhase;
    const floatTarget=swim?1:state==='enter'&&airborne?THREE.MathUtils.smoothstep(jump,.35,.9):state==='exit'?(airborne?1-THREE.MathUtils.smoothstep(jump,0,.55):1):0;
    swimBlend += (floatTarget - swimBlend) * (1 - Math.exp(-dt * 18));
    if (Math.abs(swimBlend - floatTarget) < .001) swimBlend = floatTarget;
    const low = (1 - uprightBlend) * (1 - swimBlend) * (1 - peckAmount);
    const display = displayBlend * (1 - swimBlend) * (1 - peckAmount);
    // Raised runner posture: narrow breast, tucked wings and a longer silhouette.
    // A low or floating duck spreads into a fuller, longer horizontal body.
    const extension = THREE.MathUtils.clamp(bodyExtension.step(uprightBlend * (1 - swimBlend) * (1 - peckAmount * .6),dt),0,1);
    bodyShape.scale.set(1 - extension * .28, .94 + extension * .27, 1.06 - extension * .32);
    neckPivot.position.set(0, .302 * bodyShape.scale.y, .143 * bodyShape.scale.z);
    torso.position.y = .604 + extension * .035 - swimBlend * .38 - peckAmount * .17 -
      low * .14 - display * .045 - sleepBlend*.18 -crouch*.075 -landing*.045 + (moving ? 0 : Math.sin(time * 1.6) * .004);
    torso.rotation.x = low * .30 + display * .065 +
      (moving ? -.025 :
        -swimBlend * .035 + (state === 'rest' ? .022 : 0));
    torso.rotation.z = 0;
    neckPivot.scale.setScalar(1);
    head.scale.setScalar(1);
    neckPivot.rotation.x = peckAmount * 2.42 + low * .70 + display * .69;
    neckPivot.rotation.y = peckAmount < .3 ? pose.look * .36 : pose.look * .07;
    neckPivot.rotation.z = tiltBlend * .26 * (1 - peckAmount);
    head.rotation.x = peckAmount * -.22 - low * .75 - display * .14;
    head.rotation.y = pose.look * .12;
    head.rotation.z = tiltBlend * .74 * (1 - peckAmount);
    // Fold the neck back towards a wing. Short strokes comb the feathers;
    // sleeping holds the tucked pose with only the body's quiet breathing.
    const comfortBlend=Math.min(1,preenBlend+sleepBlend);
    const side=kind==='brown'||kind==='drake'?-1:1;
    const stroke=preenBlend*Math.sin(time*5.5)*.13;
    neckPivot.rotation.x=THREE.MathUtils.lerp(neckPivot.rotation.x,-1.73+stroke,comfortBlend);
    neckPivot.rotation.y=THREE.MathUtils.lerp(neckPivot.rotation.y,side*.38,comfortBlend);
    neckPivot.rotation.z*=1-comfortBlend;
    head.rotation.x=THREE.MathUtils.lerp(head.rotation.x,-2.25-stroke,comfortBlend);
    head.rotation.y=THREE.MathUtils.lerp(head.rotation.y,side*.25,comfortBlend);
    head.rotation.z=THREE.MathUtils.lerp(head.rotation.z,side*.2,comfortBlend);
    eyes.forEach(eye=>eye.scale.y=1-sleepBlend*.94);
    eyeGlints.forEach(glint=>glint.visible=sleepBlend<.5);
    if (moving || Math.abs(pitch)+Math.abs(roll)+Math.abs(headLag)+Math.abs(headSide)>.00001) {
      // Capture the intentional posture/look/tilt before adding the footfall sway.
      torso.updateMatrix();
      neckPivot.updateMatrix();
      steadyHead.copy(head.position).applyMatrix4(neckPivot.matrix).applyMatrix4(torso.matrix);
      steadyHead.x+=headSide;steadyHead.z+=headLag;
      steadyHeadRotation.copy(torso.quaternion).multiply(neckPivot.quaternion).multiply(head.quaternion);

      torso.position.y += Math.sin(phase * 2) * .017 * stride;
      torso.rotation.x += Math.sin(phase) * .028 * stride + pitch;
      torso.rotation.z = Math.sin(phase) * .024 * stride + roll;
      torso.updateMatrix();
      inverseTorso.copy(torso.matrix).invert();
      desiredNeck.copy(steadyHead).applyMatrix4(inverseTorso).sub(neckPivot.position);
      const neckLength = desiredNeck.length();
      currentNeck.copy(head.position).applyQuaternion(neckPivot.quaternion).normalize();
      neckCorrection.setFromUnitVectors(currentNeck, desiredNeck.normalize());
      neckPivot.quaternion.premultiply(neckCorrection);
      const spring = neckLength / head.position.length();
      neckPivot.scale.setScalar(spring);
      // The neck flexes; the head keeps its size and intended orientation.
      head.scale.setScalar(1 / spring);
      parentRotation.copy(torso.quaternion).multiply(neckPivot.quaternion).invert();
      head.quaternion.copy(parentRotation).multiply(steadyHeadRotation);
    }
    for (let i = 0; i < 2; i++) {
      const folded=Math.max(swimBlend,sleepBlend,jumpBlend*.8,crouch*.25);
      legs[i].visible = folded < .99;
      // Tuck the feet up towards the body in flight, rather than detaching the leg roots.
      legs[i].position.y = .299 - .27 * Math.max(swimBlend,sleepBlend) - crouch*.075;
      legs[i].scale.y = Math.max(.01, 1 - folded);
      const swing = Math.sin(phase + i * Math.PI) * stride;
      legs[i].rotation.x = swing * .47+jumpBlend*.6;
      feet[i].rotation.x = -legs[i].rotation.x * .78 +
        Math.max(0, -swing) * .16;
    }
  }

  animate({ state: 'rest', speed: 0, time: 0, look: 0, peck: 0,
    upright: 1, headTilt: 0, displayDip: 0 });
  return { group, animate };
}
