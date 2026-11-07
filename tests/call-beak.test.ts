import test from 'node:test';
import assert from 'node:assert/strict';
import {createDuck} from '../src/duck-model';

test('contact-call beak opening works during ordinary movement and stays closed in sleep',()=>{
 const duck=createDuck('pied');
 const jaw=duck.group.getObjectByName('duck-lower-jaw')!;
 for(let i=1;i<=20;i++)duck.animate({state:'wander',time:i/30,speed:.15,upright:1,look:0,peck:0,headTilt:0,displayDip:0,mouthOpen:.25});
 assert.ok(jaw.rotation.x>.1&&jaw.rotation.x<.15);
 for(let i=21;i<=40;i++)duck.animate({state:'sleep',time:i/30,speed:0,upright:0,look:0,peck:0,headTilt:0,displayDip:0,mouthOpen:.25});
 assert.ok(jaw.rotation.x<.001);
});
