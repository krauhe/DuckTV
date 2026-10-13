import test from 'node:test';
import assert from 'node:assert/strict';
import {SearchMoonPhase} from 'astronomy-engine';
import * as THREE from 'three';
import {celestialFrame,horizonToGarden} from '../src/celestial';
import {getSceneDate} from '../src/daylight';
import {createNightSky} from '../src/night-sky';

test('north faces the house and Polaris stays above the northern horizon in Gistrup',()=>{
 assert.deepEqual(horizonToGarden({x:1,y:0,z:0}).toArray().map(v=>v||0),[0,0,-1]);
 assert.equal(horizonToGarden({x:0,y:-1,z:0}).x,1,'east is +X');
 for(const hour of [0,6,12,18]){
  const sky=celestialFrame(new Date(Date.UTC(2026,9,7,hour))),polaris=sky.star(2.5303,89.2641);
  const altitude=Math.asin(polaris.y)*180/Math.PI;
  assert.ok(altitude>56&&altitude<58);assert.ok(polaris.z<0);assert.ok(Math.abs(polaris.x)<.02);
 }
});

test('sky time respects Copenhagen date and summer/winter time overrides',()=>{
 assert.equal(getSceneDate(new Date('2026-10-07T15:00:00Z'),1380).toISOString(),'2026-10-07T21:00:00.000Z');
 assert.equal(getSceneDate(new Date('2026-01-07T15:00:00Z'),1380).toISOString(),'2026-01-07T22:00:00.000Z');
 assert.equal(getSceneDate(new Date('2026-10-07T23:30:00Z'),60).toISOString(),'2026-10-07T23:00:00.000Z');
 const now=new Date();assert.equal(getSceneDate(now).getTime(),now.getTime());
});

test('lunar lighting shows the bright side at full moon and the dark side at new moon',()=>{
 for(const phase of [0,180]){
  const time=SearchMoonPhase(phase,new Date('2026-10-01T00:00:00Z'),40)!;
  const frame=celestialFrame(time.date),facingLight=frame.sunlight.dot(frame.moonDirection.clone().negate());
  assert.ok(phase===0?frame.illumination<.01:frame.illumination>.99);
  assert.ok(phase===0?facingLight<-.98:facingLight>.98);
  assert.ok(frame.moonRadius>.25&&frame.moonRadius<.35,'realistic angular lunar radius');
 }
});

test('catalogue stars show on clear nights, fade in daylight/overcast, and the moon respects the horizon',()=>{
 const scene=new THREE.Scene(),sky=createNightSky(scene);
 const stars=scene.getObjectByName('night-stars') as THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;
 const moon=scene.getObjectByName('gistrup-moon')!;
 sky.setDate(new Date('2026-10-07T21:00:00Z'));sky.update(0,1);
 assert.ok(stars.geometry.attributes.position.count>2500);assert.equal(stars.visible,true);
 assert.ok(stars.material.uniforms.opacity.value>.95);
 sky.update(100,1);assert.equal(stars.visible,false);assert.equal(moon.visible,false);
 sky.setDate(new Date('2026-10-07T10:00:00Z'));sky.update(0,1);assert.equal(stars.visible,false);
 for(let hour=0;hour<24;hour++){
  const date=new Date(Date.UTC(2026,9,7,hour));sky.setDate(date);sky.update(0,1);
  assert.equal(moon.visible,celestialFrame(date).moonDirection.y>0);
 }
});
