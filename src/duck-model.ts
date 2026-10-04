import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { DuckKind, DuckPose } from './types';
import { Spring } from './dynamics';
import { DuckGait } from './duck-gait';
import { featherSurface } from './feather-texture';
import { createRecordedNeck } from './recorded-neck';

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

type Ring = { y: number; cx: number; cz: number; rx: number; rz: number; color?: string };

/** A smooth skin of elliptical rings, coloured by vertex so markings do not form stacked toy shapes. */
function ringMesh(parent: THREE.Object3D, rings: Ring[], mat: THREE.Material, sides = 16): THREE.Mesh {
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const uv: number[] = [];
  for (const ring of rings) {
    const color = new THREE.Color(ring.color ?? '#ffffff');
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      vertices.push(ring.cx + Math.cos(angle) * ring.rx, ring.y,
        ring.cz + Math.sin(angle) * ring.rz);
      colors.push(color.r, color.g, color.b);
      uv.push(j/sides,(ring.y-rings[0].y)/(rings[rings.length-1].y-rings[0].y));
    }
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides+1) + j;
      const b = a+1;
      const c = (i + 1) * (sides+1) + j;
      const d = c+1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function bill(parent: THREE.Object3D, mat: THREE.Material, lowerMat: THREE.Material): THREE.Group {
  // Rounded cross-sections: a raised root flows into a broad, flattened spoon.
  const profile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.075,.065,.037), new THREE.Vector3(.115,.061,.028),
    new THREE.Vector3(.17,.052,.019), new THREE.Vector3(.235,.043,.013),
    new THREE.Vector3(.285,.038,.009), new THREE.Vector3(.313,.036,.004),
    new THREE.Vector3(.319,.036,.0005),
  ]);
  const widths=[.044,.051,.057,.061,.049,.023,.0005];
  const vertices:number[]=[],indices:number[]=[],uv:number[]=[],colors:number[]=[];
  const base=(mat as THREE.MeshStandardMaterial).color;
  for(let i=0;i<=48;i++){
    const t=i/48,p=profile.getPoint(t),f=t*(widths.length-1),k=Math.min(widths.length-2,Math.floor(f));
    const width=THREE.MathUtils.lerp(widths[k],widths[k+1],THREE.MathUtils.smoothstep(f-k,0,1));
    for(let j=0;j<=32;j++){
      const a=j/32*Math.PI*2,s=Math.sin(a);
      vertices.push(Math.cos(a)*width,p.y+s*p.z,p.x);
      uv.push(j/32,t);
      const shade=base.clone().multiplyScalar(.88+.12*Math.max(0,s));
      shade.toArray(colors,colors.length);
      if(i<48&&j<32){const n=i*33+j;indices.push(n,n+1,n+33,n+1,n+34,n+33);}
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(vertices.length),3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const surface=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.54});
  const upper=new THREE.Mesh(geo,surface);upper.castShadow=true;upper.receiveShadow=true;parent.add(upper);
  const jaw=new THREE.Group();jaw.name='duck-lower-jaw';jaw.position.set(0,.035,.09);parent.add(jaw);
  ellipsoid(jaw,lowerMat,[0,-.004,.119],[.052,.007,.102]);
  ellipsoid(jaw,material('#78524a'),[0,.003,.112],[.035,.002,.068]);
  const dark=material('#494337',.62);
  for(const side of [-1,1]){
    // Narrow oval nares sit flush on the sloping upper surface.
    ellipsoid(parent,lowerMat,[side*.031,.068,.162],[.009,.002,.017],[0,side*.22,0]);
    ellipsoid(parent,dark,[side*.031,.0695,.162],[.005,.0015,.011],[0,side*.22,0]);
    const seam=new THREE.CatmullRomCurve3([
      new THREE.Vector3(side*.043,.035,.10),new THREE.Vector3(side*.054,.029,.18),
      new THREE.Vector3(side*.059,.031,.24),new THREE.Vector3(side*.042,.032,.294),
    ]);
    parent.add(new THREE.Mesh(new THREE.TubeGeometry(seam,24,.0011,4,false),dark));
  }
  // Small keratin nail, following the rounded tip rather than projecting from it.
  ellipsoid(parent,dark,[0,.043,.301],[.014,.0025,.014],[-.18,0,0]);
  return jaw;
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
  for (let i = 0; i < 8; i++) {
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
  for(let row=0;row<3;row++)for(let i=0;i<6;i++)
    ellipsoid(wing,row%2?baseMat:covertMat,
      [side*(.095+row*.004),.065-row*.035,-.005-i*.035-row*.014],
      [.008,.025,.047],[.3,0,side*-.18],true);
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
  const mottled = kind === 'buff' || kind === 'brown';
  featherSurface(bodyMat, false, mottled);
  ringMesh(bodyShape, bodyRings, bodyMat, 32).name = 'duck-body-skin';
  bodyMarkings(bodyShape, kind);

  const wingMat = featherSurface(material(p.wing), false, mottled);
  const covertMat = featherSurface(material(p.covert), false, mottled);
  const featherMat = featherSurface(material(p.feather));
  for (const side of [-1, 1]) {
    addWing(bodyShape, side, p, wingMat, covertMat, featherMat);
  }

  const tailMat = featherSurface(material(p.tail));
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
  featherSurface(neckMat,true);
  const neckSkin=ringMesh(neckPivot, [
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
  ], neckMat, 24);

  const head = new THREE.Group();
  head.name = 'duck-head';
  head.position.set(0, .493, .050);
  neckPivot.add(head);
  const headMat = featherSurface(material(p.head, kind === 'drake' ? .65 : .86),true);
  const headSkin=ellipsoid(head, headMat, [0, .073, .025], [.071, .108, .099]);
  headSkin.name='duck-skull';
  headSkin.geometry=new THREE.SphereGeometry(1,48,32);
  if(kind==='pied'){
    // Paint the crown directly on the skin: no raised side patches resembling ears.
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
  // Taper the cheek and slope the forehead into the bill instead of a round ball.
  const skull=headSkin.geometry.getAttribute('position');
  for(let i=0;i<skull.count;i++){
    const x=skull.getX(i),y=skull.getY(i),z=skull.getZ(i);
    skull.setXYZ(i,x*(1-.12*Math.max(0,-y)),y-.22*Math.max(0,z)*Math.max(0,y),
      z+.12*Math.max(0,y)-.12*Math.max(0,-y));
  }
  skull.needsUpdate=true;headSkin.geometry.computeVertexNormals();
  // A narrow feathered eyelid surrounds a small, inset dark eye.
  const eyeRingMat = material(p.eyeRing);
  eyeRingMat.color.lerp(new THREE.Color(p.head),.65);
  const eyeMat = material('#181a17', .24);
  const glintMat = new THREE.MeshBasicMaterial({ color: '#f9f4e5' });
  const eyes: THREE.Group[]=[];
  const eyeGlints: THREE.Mesh[]=[];
  for (const side of [-1, 1]) {
    const eye=new THREE.Group();eye.position.set(side*.063,.108,.054);head.add(eye);eyes.push(eye);
    ellipsoid(eye, eyeRingMat, [0, 0, 0],
      [.007, .017, .019]);
    ellipsoid(eye, eyeMat, [side * .004, .001, .002],
      [.006, .013, .014]);
    eyeGlints.push(ellipsoid(eye, glintMat, [side * .009, .006, .008],
      [.0015, .002, .002]));
  }
  const jaw=bill(head, material(p.bill), material(kind === 'drake' ? '#9f875a' : '#a87550'));

  combineRigidDetails(group);
  const recordedNeck=createRecordedNeck(neckMat,p.neck,p.head,p.neckBand,kind==='pied');
  torso.add(recordedNeck.mesh);
  const recordedMiddle=new THREE.Vector3(),recordedEnd=new THREE.Vector3(),recordedRoot=new THREE.Vector3();
  const skinCollar=new THREE.Vector3();
  const footMat = material(p.foot);
  const legs: THREE.Group[] = [];
  const feet: THREE.Group[] = [];
  const upperLegs: THREE.Mesh[] = [], lowerLegs: THREE.Mesh[] = [];
  const thighs: THREE.Mesh[] = [], knees: THREE.Mesh[] = [];
  const hocks: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'duck-left-leg' : 'duck-right-leg';
    group.add(leg);
    for (const parts of [thighs, upperLegs, lowerLegs]) {
      const bone = new THREE.Mesh(cylinder, footMat);
      bone.name=`duck-${side<0?'left':'right'}-${parts===thighs?'thigh':parts===upperLegs?'shin':'tarsus'}`;
      bone.castShadow = true;
      leg.add(bone); parts.push(bone);
    }
    const hock=ellipsoid(leg, footMat, [0, 0, 0], [.022, .025, .022]);
    hock.name=side<0?'duck-left-hock':'duck-right-hock'; hocks.push(hock);
    const knee=ellipsoid(leg, material(p.body), [0,0,0], [.037,.037,.037]);
    knee.name=side<0?'duck-left-knee':'duck-right-knee'; knees.push(knee);
    const foot = webbedFoot(leg, footMat);
    foot.name = side < 0 ? 'duck-left-foot' : 'duck-right-foot';
    legs.push(leg);
    feet.push(foot);
  }

  let previousTime = 0;
  let gaitPhase = 0;
  let paddlePhase = 0;
  let swimBlend = 0;
  let uprightBlend = 1;
  let tiltBlend = 0;
  let displayBlend = 0;
  let preenBlend = 0;
  let sleepBlend = 0;
  let jumpBlend=0;
  let chaseBlend=0,feedingBlend=0;
  const feedingTip=new THREE.Vector3(),feedingHead=new THREE.Vector3(),feedingOffset=new THREE.Vector3();
  const feedingRotation=new THREE.Quaternion(),feedingParent=new THREE.Matrix4();
  let headLook=0,neckLook=0;
  const gait = new DuckGait();
  const bodyPitch=new Spring(0,1.4,100,20),bodyRoll=new Spring(0,1.4,100,20);
  const neckForward=new Spring(0,.25,35,5),neckSide=new Spring(0,.25,35,5);
  const bodyExtension=new Spring(1,1,90,18);
  const headDip=new Spring(0,.7,140,20);
  // Solve the neck from its body attachment to the intended steady head pose.
  // Reused scratch objects avoid allocations on every animation frame.
  const steadyHead = new THREE.Vector3();
  const desiredNeck = new THREE.Vector3();
  const currentNeck = new THREE.Vector3();
  const inverseTorso = new THREE.Matrix4();
  const steadyHeadRotation = new THREE.Quaternion();
  const neckCorrection = new THREE.Quaternion();
  const parentRotation = new THREE.Quaternion();
  const awakeHeadRotation = new THREE.Quaternion();
  const comfortHeadRotation = new THREE.Quaternion();
  const sleepingHeadRotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, Math.PI + (kind === 'brown' || kind === 'drake' ? -.3 : .3), 0),
  );
  const ankle = new THREE.Vector3(), joint = new THREE.Vector3();
  const legDirection = new THREE.Vector3(), legBend = new THREE.Vector3();
  const boneDirection = new THREE.Vector3();
  const legOrigin = new THREE.Vector3();
  const kneePosition = new THREE.Vector3(), footLocal = new THREE.Vector3();
  const rootPosition = new THREE.Vector3(), lastRootPosition = new THREE.Vector3();
  let hasRootPosition = false;
  function placeBone(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3, radius: number) {
    boneDirection.copy(to).sub(from);
    mesh.position.copy(from).add(to).multiplyScalar(.5);
    mesh.scale.set(radius, boneDirection.length(), radius);
    mesh.quaternion.setFromUnitVectors(yAxis, boneDirection.normalize());
  }

  function animate(pose: DuckPose): void {
    const { state, time } = pose;
    const dt = Math.max(0, Math.min(.05, time - previousTime));
    previousTime = time;
    const gape=state==='chase'?THREE.MathUtils.clamp(pose.mouthOpen??0,0,1):0;
    jaw.rotation.x+=(gape*.48-jaw.rotation.x)*(1-Math.exp(-dt*(gape>0?24:32)));
    const forward=THREE.MathUtils.clamp(pose.accelerationForward??0,-3,3);
    const lateral=THREE.MathUtils.clamp(pose.accelerationSide??0,-3,3);
    const pitch=bodyPitch.step(forward*.06,dt),roll=bodyRoll.step(-lateral*.05,dt);
    const headLag=neckForward.step(-forward*.014,dt),headSide=neckSide.step(-lateral*.014,dt);
    // Smooth the posture and expression signals independently of the walking gait.
    const postureResponse = 1 - Math.exp(-dt * 6);
    chaseBlend += ((state==='chase'?1:0)-chaseBlend)*postureResponse;
    feedingBlend+=(((state==='forage'||state==='eat')?1:0)-feedingBlend)*postureResponse;
    const jump=pose.jumpProgress??-1,airborne=jump>=0;
    jumpBlend+=((airborne?1:0)-jumpBlend)*(1-Math.exp(-dt*25));
    const crouch=pose.crouch??0,landing=pose.landing??0;
    preenBlend += ((state==='preen'?1:0)-preenBlend)*postureResponse;
    sleepBlend += ((state==='sleep'?1:0)-sleepBlend)*postureResponse;
    const comfortBlend=Math.min(1,preenBlend+sleepBlend);
    const lookTarget=THREE.MathUtils.clamp(pose.look,-1.15,1.15)*(1-comfortBlend)*(1-chaseBlend);
    headLook+=(lookTarget-headLook)*(1-Math.exp(-dt*13));
    neckLook+=(lookTarget-neckLook)*(1-Math.exp(-dt*4));
    uprightBlend += (THREE.MathUtils.clamp(pose.upright, 0, 1) -
      uprightBlend) * postureResponse;
    tiltBlend += (THREE.MathUtils.clamp(pose.headTilt, -.48, .48) -
      tiltBlend) * postureResponse;
    displayBlend += (THREE.MathUtils.clamp(pose.displayDip, 0, 1) -
      displayBlend) * postureResponse;
    const moving = !airborne&&crouch===0&&pose.speed > .005 && state!=='swim' && state!=='sleep' && state!=='preen';
    const swim = state === 'swim';
    if(swim)paddlePhase+=dt*Math.PI*2*(.65+Math.min(.8,pose.speed)*1.5);
    // Foraging and interrupted feeding can change the intent in one frame.
    // Let the neck accelerate into/out of the dip instead of copying that jump.
    const peckAmount = THREE.MathUtils.clamp(headDip.step(THREE.MathUtils.clamp(pose.peck,0,1),dt),0,1);
    const stride = moving ? Math.min(1, Math.max(.08, pose.speed * 2.5)) : 0;
    group.updateMatrixWorld(true);
    group.getWorldPosition(rootPosition);
    const travel = hasRootPosition ? Math.min(.1, rootPosition.distanceTo(lastRootPosition)) : 0;
    if (moving) gaitPhase += travel * 19;
    lastRootPosition.copy(rootPosition); hasRootPosition = true;
    const phase = gaitPhase;
    const floatTarget=swim?1:state==='enter'&&airborne?THREE.MathUtils.smoothstep(jump,.35,.9):state==='exit'?(airborne?1-THREE.MathUtils.smoothstep(jump,0,.55):1):0;
    swimBlend += (floatTarget - swimBlend) * (1 - Math.exp(-dt * 18));
    if (Math.abs(swimBlend - floatTarget) < .001) swimBlend = floatTarget;
    const low = (1 - uprightBlend) * (1 - swimBlend) * (1 - peckAmount);
    const display = displayBlend * (1 - swimBlend) * (1 - peckAmount);
    // Raised runner posture: narrow breast, tucked wings and a longer silhouette.
    // A low or floating duck spreads into a fuller, longer horizontal body.
    const extension = THREE.MathUtils.clamp(bodyExtension.step(uprightBlend * (1 - swimBlend) * (1 - peckAmount * .6),dt),0,1);
    bodyShape.scale.set(1 - extension * .35, .94 + extension * .27, 1.06 - extension * .37);
    neckPivot.position.set(0, .302 * bodyShape.scale.y, .143 * bodyShape.scale.z);
    torso.position.y = .604 - extension * .035 - swimBlend * .44 - peckAmount * .17 -
      low * .14 - display * .045 - sleepBlend*.18 -crouch*.075 -landing*.045 -
      Math.min(.07,pose.speed*.04)*(1-swimBlend)*(1-uprightBlend) + (moving || swim ? 0 : Math.sin(time * 1.6) * .004*(1-comfortBlend));
    torso.rotation.x = low * .30 + display * .065 +
      (moving ? -.025 :
        -swimBlend * .035 + (state === 'rest' ? .022 : 0));
    torso.rotation.z = 0;
    neckPivot.scale.setScalar(1);
    head.scale.setScalar(1);
    // During a sprint the skull reaches forward and down, rather than perching
    // above the end of the lowered neck. The same blend eases back out of chase.
    head.position.set(headLook*.028*(1-comfortBlend),.493+chaseBlend*.035,.050+chaseBlend*.065);
    // Reach forward in one streamlined line, without stacking two neck dips.
    neckPivot.rotation.x = THREE.MathUtils.lerp(peckAmount * 2.42 + low * .70 + display * .69, 1.32, chaseBlend);
    neckPivot.rotation.y = neckLook * THREE.MathUtils.lerp(.18,.04,THREE.MathUtils.smoothstep(peckAmount,.15,.45));
    neckPivot.rotation.z = tiltBlend * .26 * (1 - peckAmount);
    head.rotation.x = THREE.MathUtils.lerp(peckAmount * -.22 - low * .75 - display * .14, -1.60, chaseBlend);
    head.rotation.y = headLook * .78 * (1-peckAmount*.85);
    head.rotation.z = tiltBlend * .74 * (1 - peckAmount);
    awakeHeadRotation.copy(torso.quaternion).multiply(neckPivot.quaternion).multiply(head.quaternion);
    // Fold the neck back towards a wing. Short strokes comb the feathers;
    // Sleeping holds a still supported head, without the preening rhythm.
    const side=kind==='brown'||kind==='drake'?-1:1;
    // Groom with small bill turns, not a repeating vertical neck pump.
    // Keep the supported head endpoint still as grooming becomes sleep.
    const stroke=preenBlend*(1-sleepBlend)*Math.sin(time*2.4)*.06;
    neckPivot.rotation.x=THREE.MathUtils.lerp(neckPivot.rotation.x,-1.73,comfortBlend);
    neckPivot.rotation.y=THREE.MathUtils.lerp(neckPivot.rotation.y,side*.38,comfortBlend);
    neckPivot.rotation.z*=1-comfortBlend;
    head.rotation.x=THREE.MathUtils.lerp(head.rotation.x,-2.25,comfortBlend);
    head.rotation.y=THREE.MathUtils.lerp(head.rotation.y,side*.25,comfortBlend);
    head.rotation.z=THREE.MathUtils.lerp(head.rotation.z,side*.2,comfortBlend);
    // Blend the head in body/world axes, independently of the folding neck.
    // Using the preening head roll as a starting point made it fall backwards
    // halfway into sleep, even though the final sleeping orientation was upright.
    // Grooming must not leave an inverted head rotation behind when sleep starts.
    // Aim in body axes: yaw back to the wing with only a small downward bill tilt.
    comfortHeadRotation.setFromEuler(new THREE.Euler(.28,
      Math.PI+side*.45+stroke,side*.08,'YXZ'));
    awakeHeadRotation.slerp(comfortHeadRotation,preenBlend).slerp(sleepingHeadRotation,sleepBlend);
    parentRotation.copy(torso.quaternion).multiply(neckPivot.quaternion).invert();
    head.quaternion.copy(parentRotation).multiply(awakeHeadRotation);
    if(sleepBlend>0){
      // Rest the skull on the feathered back. Blend the endpoint rather than
      // rotating farther backwards, which would tip or suspend the head.
      neckPivot.updateMatrix();
      steadyHead.copy(head.position).applyMatrix4(neckPivot.matrix);
      steadyHead.lerp(desiredNeck.set(side*.08,.16,-.25),sleepBlend);
      desiredNeck.copy(steadyHead).sub(neckPivot.position);
      const length=desiredNeck.length();
      currentNeck.copy(head.position).applyQuaternion(neckPivot.quaternion).normalize();
      neckCorrection.setFromUnitVectors(currentNeck,desiredNeck.normalize());
      neckPivot.quaternion.premultiply(neckCorrection);
      const stretch=length/head.position.length();neckPivot.scale.setScalar(stretch);head.scale.setScalar(1/stretch);
      parentRotation.copy(torso.quaternion).multiply(neckPivot.quaternion).invert();
      head.quaternion.copy(parentRotation).multiply(awakeHeadRotation);
    }
    eyes.forEach(eye=>eye.scale.y=1-sleepBlend*.94);
    eyeGlints.forEach(glint=>glint.visible=sleepBlend<.5);
    // Water displacement belongs to the root, outside the torso animation.
    // Convert it back to model units so the neck absorbs it without moving the body.
    const waterCompensation = swim ? THREE.MathUtils.clamp(pose.waterBob??0,-.08,.08)*.94*swimBlend/group.scale.y : 0;
    if (moving || swim || Math.abs(pitch)+Math.abs(roll)+Math.abs(headLag)+Math.abs(headSide)>.00001) {
      // Capture the intentional posture/look/tilt before adding the footfall sway.
      torso.updateMatrix();
      neckPivot.updateMatrix();
      steadyHead.copy(head.position).applyMatrix4(neckPivot.matrix).applyMatrix4(torso.matrix);
      steadyHead.x+=headSide;steadyHead.z+=headLag;
      steadyHead.y-=waterCompensation;
      steadyHeadRotation.copy(torso.quaternion).multiply(neckPivot.quaternion).multiply(head.quaternion);

      torso.position.y += Math.sin(phase * 2) * .017 * stride;
      torso.rotation.x += Math.sin(phase) * .028 * stride + pitch;
      torso.rotation.z = Math.sin(phase) * .024 * stride + roll;
      if(swim){
        // Buoyant body rocks independently; the neck solves back to the steady
        // head captured above instead of carrying the skull along like a toy.
        torso.rotation.x+=(Math.sin(time*2.8)*.075+Math.sin(paddlePhase*2)*.018)*swimBlend;
        torso.rotation.z+=(Math.sin(time*2.1+.7)*.065+Math.sin(paddlePhase)*.025)*swimBlend;
      }
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
    // Ground feeding targets the bill, not a rigid rotation of the whole neck.
    // Keep the skull angled down independently while the flexible skin reaches it.
    const probe=feedingBlend*THREE.MathUtils.smoothstep(peckAmount,.08,.60);
    if(probe>0.0001 && !pose.recordedBody){
      torso.updateMatrix();neckPivot.updateMatrix();
      feedingParent.multiplyMatrices(torso.matrix,neckPivot.matrix);
      feedingHead.copy(head.position).applyMatrix4(feedingParent);
      steadyHeadRotation.copy(torso.quaternion).multiply(neckPivot.quaternion).multiply(head.quaternion);
      feedingRotation.setFromEuler(new THREE.Euler(.95+Math.sin(time*9)*.035,Math.sin(time*3.1)*.08,0,'YXZ'));
      feedingTip.set(Math.sin(time*3.1)*.018,0,.72);
      group.updateMatrixWorld(true);
      group.localToWorld(feedingTip);
      feedingTip.y=(pose.groundHeight?.(feedingTip.x,feedingTip.z)??rootPosition.y)+(state==='forage'?-.012+.007*Math.sin(time*9):.008+.005*(1+Math.sin(time*9)));
      group.worldToLocal(feedingTip);
      feedingOffset.set(0,.036,.30).applyQuaternion(feedingRotation);
      feedingHead.lerp(feedingTip.sub(feedingOffset),probe);
      head.position.copy(feedingHead).applyMatrix4(feedingParent.invert());
      steadyHeadRotation.slerp(feedingRotation,probe);
      parentRotation.copy(torso.quaternion).multiply(neckPivot.quaternion).invert();
      head.quaternion.copy(parentRotation).multiply(steadyHeadRotation);
    }
    const curvedRecording=!!pose.recordedBody?.neckMiddle;
    neckSkin.visible=false;recordedNeck.mesh.visible=true;
    if(pose.recordedBody){
      // Match the recorded pelvis (midpoint of the two hips) and body axis.
      // Do not smooth here: scrubbed frames must not retain the previous pose.
      torso.rotation.set(pose.recordedBody.pitch,0,0);
      steadyHead.copy(pose.recordedBody.pelvis);group.worldToLocal(steadyHead);
      currentNeck.set(0,-.05,-.055).multiply(bodyShape.scale).applyQuaternion(torso.quaternion);
      torso.position.copy(steadyHead).sub(currentNeck);
      torso.updateMatrix();inverseTorso.copy(torso.matrix).invert();
      desiredNeck.copy(pose.recordedBody.head);group.worldToLocal(desiredNeck);
      desiredNeck.applyMatrix4(inverseTorso).sub(neckPivot.position);
      const length=Math.max(.001,desiredNeck.length());
      neckPivot.quaternion.setFromUnitVectors(currentNeck.copy(head.position).normalize(),desiredNeck.normalize());
      const stretch=length/head.position.length();neckPivot.scale.setScalar(stretch);head.scale.setScalar(1/stretch);
      // Recordings have no skull rotation. Keep the same upright, forward gaze
      // as the physical preview, independently of body lean and neck deflection.
      head.quaternion.copy(torso.quaternion).multiply(neckPivot.quaternion).invert();
      if(pose.recordedBody.neckMiddle){
        recordedMiddle.copy(pose.recordedBody.neckMiddle);group.worldToLocal(recordedMiddle);recordedMiddle.applyMatrix4(inverseTorso);
        head.updateMatrix();neckPivot.updateMatrix();
        recordedEnd.set(0,.065,.005).applyMatrix4(head.matrix).applyMatrix4(neckPivot.matrix);
        recordedRoot.copy(neckPivot.position).multiplyScalar(.62);
        recordedNeck.update(recordedRoot,neckPivot.position,recordedMiddle,recordedEnd);
      }
    }
    if(!curvedRecording){
      neckPivot.updateMatrix();
      head.updateMatrix();
      // Bury the terminal ring inside the skull, following its own rotation.
      // The head pivot can lie outside the feathers when looking or bowing.
      recordedEnd.set(0,.065+chaseBlend*.008,.005-chaseBlend*.035)
        .applyMatrix4(head.matrix).applyMatrix4(neckPivot.matrix);
      // Anchor the skin inside the breast independently of the rotating head rig.
      // Lower the collar into a bow instead of swinging a rigid tube out of the back.
      const fold=Math.max(peckAmount,comfortBlend,chaseBlend*.6);
      skinCollar.copy(neckPivot.position).lerp(desiredNeck.set(0,.18,.16),fold);
      recordedMiddle.copy(skinCollar).lerp(recordedEnd,.58);
      const reach=skinCollar.distanceTo(recordedEnd);
      recordedMiddle.z+=.025+Math.sqrt(Math.max(0,.5*.5-reach*reach))*.15*(1-comfortBlend);
      recordedRoot.set(0,.08,.065);
      recordedNeck.update(recordedRoot,skinCollar,recordedMiddle,recordedEnd);
    }
    torso.updateMatrix();
    gait.update(dt,rootPosition,group.rotation.y,!airborne && swimBlend<.1 && sleepBlend<.1 && crouch===0,pose.groundHeight);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const folded=Math.max(swimBlend,sleepBlend,jumpBlend*.8,crouch*.25);
      legs[i].visible = swim || folded < .99;
      // Attach inside the feathered body, following its shape, bob and lean.
      // The hip sits higher inside the feathers. A low attachment forced the
      // visible hock into a deep permanent crouch even with a straight knee.
      legs[i].position.set(side*.112, pose.recordedBody?-.05:-.015+.012*uprightBlend*(1-folded), -.055)
        .multiply(bodyShape.scale).applyMatrix4(torso.matrix);
      const step = pose.recordedFeet?.[i] ?? gait.feet[i];
      // Preserve the support foot's world position and heading as the body passes it.
      footLocal.copy(step.position); group.worldToLocal(footLocal);
      feet[i].position.copy(footLocal).sub(legs[i].position);
      feet[i].position.lerp(ankle.set(side*.009, -.085, .015), folded);
      feet[i].rotation.set((pose.recordedFeet?.[i].pitch??step.lift*.22)*(1-folded)+folded*.6,
        Math.atan2(Math.sin(step.yaw-group.rotation.y),Math.cos(step.yaw-group.rotation.y))*(1-folded),0);
      if(swim){
        const phase=paddlePhase+i*Math.PI;
        const power=THREE.MathUtils.smoothstep(Math.sin(phase),-.35,.35);
        // Broad web pushes backwards; return stroke is lifted and turned edge-on.
        // Keep the stroke shallow enough for this low garden pool.
        ankle.set(side*.025,-.20+(1-power)*.035,-.025+Math.cos(phase)*.10);
        feet[i].position.lerp(ankle,swimBlend);
        feet[i].rotation.x=THREE.MathUtils.lerp(feet[i].rotation.x,THREE.MathUtils.lerp(-.2,.85,power),swimBlend);
        feet[i].rotation.y=side*THREE.MathUtils.lerp(1,.15,power)*swimBlend;
      }
      if(pose.groundHeight&&!airborne&&folded<.1){
        // The ankle can clear a step while a tilted toe still cuts through it.
        // Check the full sole envelope after applying the foot's rotation.
        let correction=0;
        for(const x of [-.115,.115])for(const z of [-.025,.20])for(const y of [-.004,.022]){
          footLocal.set(x,y,z).applyQuaternion(feet[i].quaternion).add(feet[i].position).add(legs[i].position);
          group.localToWorld(footLocal);
          correction=Math.max(correction,pose.groundHeight(footLocal.x,footLocal.z)+.001-footLocal.y);
        }
        feet[i].position.y+=correction/group.scale.y;
      }
      ankle.copy(feet[i].position).addScaledVector(yAxis, .025);
      // Short shanks, with a nearly extended knee in stance. Flexion increases
      // only during swing or tucking, rather than holding a deep crouch.
      const thighLength=.11, shinLength=.25, lowerLength=.17;
      const kneeFlex=.035+step.lift*.735+folded*1.1;
      const upperLength=Math.sqrt(thighLength**2+shinLength**2+2*thighLength*shinLength*Math.cos(kneeFlex));
      if(!pose.recordedFeet&&folded<.1){
        // Let the hip settle inside the feathers at full extension, rather than
        // stretching the shank or pulling a planted foot off the ground.
        const maxReach=upperLength+lowerLength-.001;
        const maxDrop=Math.sqrt(Math.max(0,maxReach**2-ankle.x**2-ankle.z**2));
        const settle=Math.max(0,-ankle.y-maxDrop);
        legs[i].position.y-=settle;feet[i].position.y+=settle;ankle.y+=settle;
      }
      legDirection.copy(ankle);
      const reach=Math.max(Math.abs(upperLength-lowerLength)+.001, Math.min(upperLength+lowerLength-.001, legDirection.length()));
      legDirection.normalize();
      const along=(upperLength**2-lowerLength**2+reach**2)/(2*reach);
      const bend=Math.sqrt(Math.max(0, upperLength**2-along**2));
      legBend.set(0,0,-1).addScaledVector(legDirection,legDirection.z).normalize();
      joint.copy(legDirection).multiplyScalar(along).addScaledVector(legBend,bend);
      // Resolve the thigh and shin around the forward-facing knee.
      legDirection.copy(joint).normalize();
      const kneeAlong=(thighLength**2-shinLength**2+upperLength**2)/(2*upperLength);
      const kneeBend=Math.sqrt(Math.max(0,thighLength**2-kneeAlong**2));
      legBend.set(0,0,1).addScaledVector(legDirection,-legDirection.z).normalize();
      kneePosition.copy(legDirection).multiplyScalar(kneeAlong).addScaledVector(legBend,kneeBend);
      knees[i].position.copy(kneePosition);
      placeBone(thighs[i],legOrigin,kneePosition,.023);
      placeBone(upperLegs[i],kneePosition,joint,.018);
      placeBone(lowerLegs[i],joint,ankle,.014);
      hocks[i].position.copy(joint);
    }
  }

  animate({ state: 'rest', speed: 0, time: 0, look: 0, peck: 0,
    upright: 1, headTilt: 0, displayDip: 0 });
  return { group, animate };
}

