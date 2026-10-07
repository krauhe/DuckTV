import {contourFeathers} from './duck-plumage';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { POND, type DuckKind, type DuckPose } from './types';
import { Spring } from './dynamics';
import { DuckGait } from './duck-gait';
import { featherSurface, legSurface } from './feather-texture';
import { createRecordedNeck } from './recorded-neck';
import { DUCK_PROFILES } from './duck-profiles';
import { gestureChannels } from './duck-gestures';

type Palette = {
  body: string; breast: string; neck: string; head: string; wing: string;
  covert: string; feather: string; tail: string; bill: string; foot: string;
  eyeRing: string; neckBand?: string;
};

const PALETTES: Record<DuckKind, Palette> = {
  drake: {
    body: '#c7c7bc', breast: '#886253', neck: '#715044', head: '#303334',
    wing: '#aaa79c', covert: '#c6bdb1', feather: '#666976', tail: '#454949',
    bill: '#d6b447', foot: '#bf814f', eyeRing: '#b6a27b', neckBand: '#e6e5d5',
  },
  buff: {
    body: '#ad8363', breast: '#bc936b', neck: '#b9926e', head: '#c29b75',
    wing: '#bca084', covert: '#d6c9b7', feather: '#787675', tail: '#b4a18a',
    bill: '#c6905c', foot: '#9f7954', eyeRing: '#dfb98a',
  },
  brown: {
    body: '#ad895e', breast: '#b48e62', neck: '#b4946b', head: '#b69a73',
    wing: '#957653', covert: '#b9a687', feather: '#474946', tail: '#8a795f',
    bill: '#856c4e', foot: '#886c51', eyeRing: '#b78c63', neckBand: '#d6c9b5',
  },
  pied: {
    body: '#ebe9df', breast: '#bc8e68', neck: '#eceae0', head: '#eeeae0',
    wing: '#64666b', covert: '#e1dfd6', feather: '#e0dfd5', tail: '#505357',
    bill: '#cba66b', foot: '#b28a5c', eyeRing: '#b9a890',
  },
};

const sphere = new THREE.SphereGeometry(1, 16, 12);
const featherSphere = new THREE.SphereGeometry(1, 12, 8);
const taperedFeathers=new Map<string,THREE.BufferGeometry>();
function featherGeometry(scale:[number,number,number],position:[number,number,number]){
  const axis=scale[0]>scale[2]?'x':'z',sign=axis==='x'?(position[0]<0?-1:1):-1,key=axis+sign;
  let geometry=taperedFeathers.get(key);if(geometry)return geometry;
  geometry=featherSphere.clone();const vertices=geometry.getAttribute('position');
  for(let i=0;i<vertices.count;i++){
    let x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i);
    const t=((axis==='x'?x:z)*sign+1)/2,taper=1-.58*t*t;
    if(axis==='x')z*=taper;else x*=taper;
    y=y*.45+.09*Math.sin(t*Math.PI);
    vertices.setXYZ(i,x,y,z);
  }
  geometry.computeVertexNormals();taperedFeathers.set(key,geometry);return geometry;
}
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
  const mesh = new THREE.Mesh(feather ? featherGeometry(scale,position) : sphere, mat);
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
  const toeMat=(footMat as THREE.MeshStandardMaterial).clone();toeMat.color.multiplyScalar(.82);
  const clawMat=material('#66513a');
  for(const side of [-1,0,1]){
    const end=new THREE.Vector3(side*.082,.024,side===0?.183:.165);
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.01,.025,.015),new THREE.Vector3(side*.047,.026,.095),end]);
    const ridge=new THREE.Mesh(new THREE.TubeGeometry(curve,8,.0035,5,false),toeMat);foot.add(ridge);
    const claw=ellipsoid(foot,clawMat,[end.x,.019,end.z+.006],[.004,.003,.009]);claw.rotation.y=side*.3;
  }
  combineRigidDetails(foot);
  return foot;
}

function addWing(parent: THREE.Object3D, side: number, p: Palette,
  baseMat: THREE.Material, covertMat: THREE.Material,
  featherMat: THREE.Material): THREE.Group {
  const wing = new THREE.Group();
  wing.name=`duck-${side<0?'left':'right'}-folded-wing`;
  wing.position.set(side * .148, .06, -.085);
  wing.rotation.y = side * .12;
  parent.add(wing);
  ellipsoid(wing, baseMat, [side * .052, -.006, -.085],
    [.055, .135, .254], [.25, 0, side * -.10]);
  // The long trailing primary feathers are visible as a layered tapered edge.
  for (let i = 0; i < 8; i++) {
    const x = side * (.078 + i * .0015);
    const z = -.225 - i * .017;
    const feather = ellipsoid(wing, featherMat,
      [x, -.058 - i * .006, z], [.014, .027, .140 - i * .010],
      [.25, side * (.10 + i * .045), side * -.12], true);
    feather.material = featherMat;
  }

  // Small covert tips break up the otherwise continuous wing surface.
  for(let row=0;row<5;row++)for(let i=0;i<10;i++)
    ellipsoid(wing,row===2||row===3?covertMat:baseMat,
      [side*(.095+row*.002),.078-row*.022,-.005-i*.022-row*.012],
      [.009,.019,.039],[.3,0,side*-.18],true);
  if (p !== PALETTES.pied) {
    const speculum = material(p===PALETTES.drake?'#365963':'#45474d', .75);
    ellipsoid(wing,material('#ded9c7'),[side*.108,-.012,-.218],[.009,.013,.102],[.18,0,side*-.16],true);
    ellipsoid(wing, speculum, [side * .106, -.047, -.215],
      [.010, .042, .092], [.18, 0, side * -.16], true);
  }
  return wing;
}

/** Shoulder, elbow and wrist retain separate pivots when rigid details are batched. */
function openWing(parent:THREE.Object3D,side:number,p:Palette){
  const shoulder=new THREE.Group(),elbow=new THREE.Group(),wrist=new THREE.Group();
  const label=side<0?'left':'right';
  shoulder.name=`duck-${label}-wing-shoulder`;elbow.name=`duck-${label}-wing-elbow`;wrist.name=`duck-${label}-wing-wrist`;
  shoulder.position.set(side*.18,.10,-.05);parent.add(shoulder);
  elbow.position.x=side*.21;shoulder.add(elbow);wrist.position.x=side*.20;elbow.add(wrist);
  const cover=featherSurface(material(p.covert)),flight=featherSurface(material(p.feather));
  ellipsoid(shoulder,cover,[side*.11,0,-.04],[.19,.028,.12]);
  ellipsoid(elbow,cover,[side*.11,0,-.075],[.18,.025,.12]);
  for(let i=0;i<7;i++)ellipsoid(elbow,flight,[side*(.025+i*.03),-.014,-.21],[.033,.009,.18],[0,side*-.2,0],true);
  const feathers:THREE.Group[]=[];
  for(let i=0;i<9;i++){
    const pivot=new THREE.Group();pivot.position.set(side*.02,0,-.045);wrist.add(pivot);feathers.push(pivot);
    ellipsoid(pivot,i%4===0?cover:flight,[side*(.13-i*.004),0,-.025],[.18-i*.004,.010,.028],[0,0,0],true);
  }
  return {shoulder,elbow,wrist,feathers,side};
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
  group: THREE.Group; animate: (pose: DuckPose) => void; setDetailDistance:(distance:number)=>void;
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
  const mottled = kind === 'brown';
  featherSurface(bodyMat, false, mottled);
  // Extra vertical samples make irregular pigment patches follow the curved skin.
  const sampledBody:Ring[]=[];
  const smoothRadius=(i:number,key:'rx'|'rz',t:number)=>{
    const a=bodyRings[i],b=bodyRings[i+1],before=bodyRings[Math.max(0,i-1)],after=bodyRings[Math.min(bodyRings.length-1,i+2)];
    const dy=b.y-a.y,m0=(b[key]-before[key])/(b.y-before.y),m1=(after[key]-a[key])/(after.y-a.y);
    return Math.max(.008,(2*t**3-3*t*t+1)*a[key]+(t**3-2*t*t+t)*dy*m0+(-2*t**3+3*t*t)*b[key]+(t**3-t*t)*dy*m1);
  };
  for(let i=0;i<bodyRings.length-1;i++)for(let j=0;j<5;j++){
    const a=bodyRings[i],b=bodyRings[i+1],t=j/5;
    sampledBody.push({y:THREE.MathUtils.lerp(a.y,b.y,t),cx:0,cz:THREE.MathUtils.lerp(a.cz,b.cz,t),
      rx:smoothRadius(i,'rx',t),rz:smoothRadius(i,'rz',t),
      color:`#${new THREE.Color(a.color).lerp(new THREE.Color(b.color),t).getHexString()}`});
  }
  sampledBody.push(bodyRings[bodyRings.length-1]);
  const bodySkin=ringMesh(bodyShape, sampledBody, bodyMat, 64);
  bodySkin.name = 'duck-body-skin';
  if(kind==='pied'){
    // Pigment belongs to the skin, never protruding oval patches.
    const pos=bodySkin.geometry.getAttribute('position'),colors=bodySkin.geometry.getAttribute('color');
    const dark=new THREE.Color('#505259'),white=new THREE.Color(p.body);
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
      const patch=Math.sin(x*38+y*27)+Math.cos(z*32-y*19)+Math.sin(y*53+z*21);
      if(z<.015&&y<.20){const color=white.clone().lerp(dark,THREE.MathUtils.smoothstep(patch,.0,.7));colors.setXYZ(i,color.r,color.g,color.b);}
    }
  }

  const bodyFeathers=contourFeathers(bodySkin,kind);bodyShape.add(bodyFeathers);

  const wingMat = featherSurface(material(p.wing), false, mottled);
  const covertMat = featherSurface(material(p.covert), false, mottled);
  const featherMat = featherSurface(material(p.feather));
  const foldedWings=[-1,1].map(side=>addWing(bodyShape,side,p,wingMat,covertMat,featherMat));
  const openWings=[-1,1].map(side=>openWing(bodyShape,side,p));

  const tailMat = featherSurface(material(p.tail));
  const tail=new THREE.Group();tail.name='duck-tail';tail.position.set(0,-.101,-.32);bodyShape.add(tail);
  for (const side of [-1, 0, 1]) {
    ellipsoid(tail, tailMat, [side * .057, 0, -.057],
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
  featherSurface(neckMat,true,kind==='brown');
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
  head.position.set(0, .440, .065);
  neckPivot.add(head);
  const headMat = featherSurface(material(p.head, kind === 'drake' ? .65 : .86),true);
  const headSkin=ellipsoid(head, headMat, [0, .065, .030], [.071, .093, .110]);
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
      const cheek=Math.abs(x)>.40&&y>-.08&&y<.78&&z<.56+.08*Math.sin(y*12);
      const color=(y>.45&&(left<1||right<1))||cheek?black:white;
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
  const headDown=contourFeathers(headSkin,kind,48,true);head.add(headDown);
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
  const recordedNeck=createRecordedNeck(neckMat,p.neck,p.head,p.neckBand,kind==='pied',kind==='brown'?.78:.64,p.breast,kind==='brown');
  torso.add(recordedNeck.mesh);
  const recordedMiddle=new THREE.Vector3(),recordedEnd=new THREE.Vector3(),recordedRoot=new THREE.Vector3();
  const skinCollar=new THREE.Vector3();
  const footMat = material(p.foot);
  const legMat=legSurface(footMat.clone());
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
      const bone = new THREE.Mesh(cylinder, legMat);
      bone.name=`duck-${side<0?'left':'right'}-${parts===thighs?'thigh':parts===upperLegs?'shin':'tarsus'}`;
      bone.castShadow = true;
      leg.add(bone); parts.push(bone);
    }
    const hock=ellipsoid(leg, legMat, [0, 0, 0], [.018, .021, .018]);
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
  let chaseBlend=0,feedingBlend=0,drinkBlend=0,restLean=0;
  const wingAmounts=[0,0];let wingStroke=0,tailWag=0,gestureLean=0,gestureForward=0,gestureStretch=0,chestPreen=0,gestureBalance=0,rumpTurn=0;
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
    const gape=(state==='chase'||state==='eat'||state==='guard')?THREE.MathUtils.clamp(pose.mouthOpen??0,0,1):state==='forage'?Math.max(0,Math.sin(time*16))*.08*pose.peck:0;
    jaw.rotation.x+=(gape*.48-jaw.rotation.x)*(1-Math.exp(-dt*(gape>0?24:32)));
    const forward=THREE.MathUtils.clamp(pose.accelerationForward??0,-3,3);
    const lateral=THREE.MathUtils.clamp(pose.accelerationSide??0,-3,3);
    const pitch=bodyPitch.step(forward*.06,dt),roll=bodyRoll.step(-lateral*.05,dt);
    const headLag=neckForward.step(-forward*.014,dt),headSide=neckSide.step(-lateral*.014,dt);
    // Smooth the posture and expression signals independently of the walking gait.
    const postureResponse = 1 - Math.exp(-dt * 6);
    const channels=gestureChannels(pose.gesture),gestureResponse=1-Math.exp(-dt*18);
    wingStroke=pose.gesture?channels.stroke:wingStroke*(1-gestureResponse);
    tailWag+=(channels.tail-tailWag)*gestureResponse;
    gestureLean+=(channels.lean-gestureLean)*gestureResponse;
    gestureForward+=(channels.forward-gestureForward)*gestureResponse;
    gestureStretch+=(channels.stretch-gestureStretch)*postureResponse;
    gestureBalance+=(channels.balance-gestureBalance)*postureResponse;
    rumpTurn+=(channels.rump-rumpTurn)*gestureResponse;
    openWings.forEach((wing,i)=>{
      wingAmounts[i]+=((i===0?channels.left:channels.right)-wingAmounts[i])*gestureResponse;
      const amount=wingAmounts[i],side=wing.side;
      foldedWings[i].scale.setScalar(1-amount*.92);
      wing.shoulder.visible=amount>.002;
      wing.shoulder.scale.set(Math.max(.001,amount)*1.35,Math.max(.001,amount),Math.max(.001,amount));
      wing.shoulder.rotation.set(-.25,side*((1-amount)*1.25-gestureForward),side*(.06+wingStroke*.45));
      wing.elbow.rotation.y=side*(.5-.4*amount);
      wing.wrist.rotation.y=side*(-.3+wingStroke*.16-gestureForward*.25);
      wing.feathers.forEach((feather,j)=>feather.rotation.y=side*(-.35+j*.14*amount));
    });
    tail.rotation.y=tailWag;tail.rotation.z=tailWag*.14;
    chaseBlend += ((state==='chase'?1:0)-chaseBlend)*postureResponse;
    feedingBlend+=(((state==='forage'||state==='eat'||state==='drink'||(state==='guard'&&pose.peck>0))?1:0)-feedingBlend)*postureResponse;
    drinkBlend+=((state==='drink'?1:0)-drinkBlend)*postureResponse;
    restLean+=((state==='rest'?.022:0)-restLean)*postureResponse;
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
    // The reference birds have a slender trunk beneath the folded plumage.
    // Narrow both frontal width and chest depth without shortening the bird.
    bodyShape.scale.set(.88*(1 - extension * .22)*DUCK_PROFILES[kind].bodyWidth, .94 + extension * .19 + gestureStretch*.08, .91*(1.06 - extension * .26));
    foldedWings.forEach(wing=>wing.rotation.x=-.12*extension);
    neckPivot.position.set(0, .302 * bodyShape.scale.y, .143 * bodyShape.scale.z);
    torso.position.y = .604 + gestureStretch*.018 - extension * .035 - swimBlend * .44 - peckAmount * .015 -
      low * (.025+.115*sleepBlend) - display * .008 - sleepBlend*.18 -crouch*.075 -landing*.045 -
      Math.min(.016,pose.speed*.008)*(1-swimBlend)*(1-uprightBlend) + (moving || swim ? 0 : Math.sin(time * 1.6) * .004*(1-comfortBlend));
    const standingLean=.12*extension*(1-comfortBlend)*(1-gestureStretch);
    torso.rotation.x = standingLean + low * .30 + display * .065 + gestureLean +
      (moving ? -.025 :
        -swimBlend * .035 + restLean);
    torso.position.x=gestureBalance*.3;
    torso.rotation.z = gestureBalance;
    torso.rotation.y = rumpTurn;
    neckPivot.scale.setScalar(1);
    head.scale.setScalar(1);
    // During a sprint the skull reaches forward and down, rather than perching
    // above the end of the lowered neck. The same blend eases back out of chase.
    head.position.set(headLook*.028*(1-comfortBlend),.440+chaseBlend*.035+gestureStretch*.04,.065+chaseBlend*.065);
    // Reach forward in one streamlined line, without stacking two neck dips.
    neckPivot.rotation.x = -standingLean + THREE.MathUtils.lerp(peckAmount * 2.42 + low * .70 + display * .69, 1.32, chaseBlend);
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
    // Alternate feather targets without changing the sleep tuck. A chest bout
    // brings the bill to the breast, with small sideways combing strokes.
    chestPreen+=((state==='preen'&&pose.preenTarget==='chest'?1:0)-chestPreen)*postureResponse;
    if(chestPreen>.0001){
      neckPivot.updateMatrix();
      steadyHead.copy(head.position).applyMatrix4(neckPivot.matrix);
      steadyHead.lerp(desiredNeck.set(side*.09,.27,.34),chestPreen);
      head.position.copy(steadyHead).applyMatrix4(inverseTorso.copy(neckPivot.matrix).invert());
      comfortHeadRotation.setFromEuler(new THREE.Euler(.95,Math.PI+side*.2+Math.sin(time*3)*.055,0,'YXZ'));
      parentRotation.copy(torso.quaternion).multiply(neckPivot.quaternion);
      awakeHeadRotation.copy(parentRotation).multiply(head.quaternion).slerp(comfortHeadRotation,chestPreen);
      head.quaternion.copy(parentRotation.invert()).multiply(awakeHeadRotation);
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
      torso.rotation.z += Math.sin(phase) * .024 * stride + roll;
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
    const probe=feedingBlend*THREE.MathUtils.smoothstep(peckAmount,.08,THREE.MathUtils.lerp(.60,.44,drinkBlend));
    if(probe>0.0001 && !pose.recordedBody){
      torso.updateMatrix();neckPivot.updateMatrix();
      feedingParent.multiplyMatrices(torso.matrix,neckPivot.matrix);
      feedingHead.copy(head.position).applyMatrix4(feedingParent);
      steadyHeadRotation.copy(torso.quaternion).multiply(neckPivot.quaternion).multiply(head.quaternion);
      feedingRotation.setFromEuler(new THREE.Euler(.95+Math.sin(time*9)*.035,Math.sin(time*3.1)*.08,0,'YXZ'));
      feedingTip.set(Math.sin(time*3.1)*.018,0,.72);
      group.updateMatrixWorld(true);
      group.localToWorld(feedingTip);
      const groundTipY=(pose.groundHeight?.(feedingTip.x,feedingTip.z)??rootPosition.y)+(state==='forage'?-.012+.007*Math.sin(time*9):.008+.005*(1+Math.sin(time*9)));
      // Keep the old water target while the drinking pose releases. Switching
      // immediately to ground height made the head jump on the state boundary.
      feedingTip.y=THREE.MathUtils.lerp(groundTipY,POND.waterY,drinkBlend);
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
      if(!pose.recordedBody&&folded<.1){
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
  const setDetailDistance=(distance:number)=>{
    // Hysteresis avoids flicker at the detail boundary. Base skins remain visible.
    if(distance>6)bodyFeathers.visible=false;else if(distance<5.2)bodyFeathers.visible=true;
    if(distance>4.5)headDown.visible=false;else if(distance<3.8)headDown.visible=true;
    if(distance>5.2)recordedNeck.feathers.visible=false;else if(distance<4.5)recordedNeck.feathers.visible=true;
  };
  return { group, animate, setDetailDistance };
}

