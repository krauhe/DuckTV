import test from 'node:test';
import assert from 'node:assert/strict';
import {callEnvelope,sampleCall} from '../src/call-envelope';

test('recorded syllables open the beak slightly; silence and clip end close it',()=>{
 const samples=new Float32Array(1000);
 samples.fill(.6,100,250);samples.fill(.3,600,750);
 const envelope=callEnvelope(samples,1000);
 assert.equal(sampleCall(envelope,.05,1),0);
 assert.ok(sampleCall(envelope,.2,1)>.2);
 assert.ok(sampleCall(envelope,.65,1)>.08);
 assert.ok(sampleCall(envelope,.55,1)<.001);
 assert.ok(envelope.every(value=>Number.isFinite(value)&&value>=0&&value<=.32));
 assert.equal(sampleCall(envelope,1,1),0);
 assert.equal(sampleCall(envelope,-.01,1),0);
 assert.ok(callEnvelope(new Float32Array(100),1000).every(v=>v===0));
});
