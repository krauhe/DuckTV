import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createForageHoles} from '../src/forage-holes';
test('mud appears only after the rendered bill lifts clear and waits during neck easing',()=>{
 const scene=new THREE.Scene(),holes=createForageHoles(scene);
 holes.contact('buff',new THREE.Vector3(0,-.01,0),1,1,true);
 assert.equal(scene.children.length,0);
 holes.contact('buff',new THREE.Vector3(0,.02,0),2,.1,false);
 assert.equal(scene.children.length,0,'ending the state does not reveal mud through a still-low bill');
 holes.contact('buff',new THREE.Vector3(0,.10,0),3,.1,false);
 assert.equal(scene.children.length,1);assert.equal(scene.children[0].visible,true);
 holes.contact('buff',new THREE.Vector3(0,-.01,0),4,.1,true);
 assert.equal(scene.children[0].visible,false);
 holes.update(5);holes.contact('buff',new THREE.Vector3(0,.01,0),5,.1,false);
 assert.equal(scene.children[0].visible,false);
 holes.contact('buff',new THREE.Vector3(0,.10,0),6,.1,false);
 assert.equal(scene.children[0].visible,true);
});
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
 scene.updateMatrixWorld(true);
 const centre=new THREE.Vector3();hole.children[0].getWorldPosition(centre);
 assert.ok(centre.y>.006,'the mark stays above the lawn colour overlay after scaling');
 const smear=hole.children[1] as THREE.Mesh;
 assert.ok(smear.renderOrder>0&&smear.scale.x>1,'disturbed soil surrounds the small puncture');
 assert.ok(size.x*2*1.15<=.033 && size.z*2*1.15<=.042);
 const material=(hole.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
 holes.update(1);assert.equal(material.opacity,1);assert.ok(hole.scale.equals(size));
 holes.update(45);assert.equal(material.opacity,.5);assert.ok(hole.scale.equals(size));
 holes.update(75);assert.equal(material.opacity,0);assert.equal(hole.visible,false);
 holes.probe(new THREE.Vector3(0,-.01,0),76,.1);assert.equal(material.opacity,1);assert.equal(hole.visible,true);
});
