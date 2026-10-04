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
