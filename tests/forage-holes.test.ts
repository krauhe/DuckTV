import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createForageHoles} from '../src/forage-holes';
test('probing works the same hole, skips raised surfaces and bounds long-running soil marks',()=>{
 const scene=new THREE.Scene(),holes=createForageHoles(scene);
 holes.probe(new THREE.Vector3(0,.3,0),0,.1);assert.equal(scene.children.length,0);
 holes.probe(new THREE.Vector3(0,-.01,0),1,.1);
 const width=scene.children[0].scale.x;
 holes.probe(new THREE.Vector3(.02,-.01,0),2,1);
 assert.equal(scene.children.length,1);assert.ok(scene.children[0].scale.x>width);
 for(let i=0;i<100;i++)holes.probe(new THREE.Vector3(i*.2,-.01,1),i+3,.1);
 assert.equal(scene.children.length,64);
 holes.update(300);assert.ok(scene.children.every(h=>!h.visible));
});

test('finger-sized holes retain their size and fade smoothly instead of growing',()=>{
 const scene=new THREE.Scene(),holes=createForageHoles(scene);
 holes.probe(new THREE.Vector3(0,-.01,0),0,10);
 const hole=scene.children[0],size=hole.scale.clone();
 assert.ok(size.x*2*1.15<=.033 && size.z*2*1.15<=.042);
 const material=(hole.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
 holes.update(1);assert.equal(material.opacity,1);assert.ok(hole.scale.equals(size));
 holes.update(45);assert.equal(material.opacity,.5);assert.ok(hole.scale.equals(size));
 holes.update(75);assert.equal(material.opacity,0);assert.equal(hole.visible,false);
 holes.probe(new THREE.Vector3(0,-.01,0),76,.1);assert.equal(material.opacity,1);assert.equal(hole.visible,true);
});
