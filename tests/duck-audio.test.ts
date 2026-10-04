import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DuckAudio } from '../src/duck-audio.ts';

test('audio requires opt-in, spaces calls, respects sleep, visibility and mute', async () => {
 const clips: FakeAudio[]=[];
 class FakeAudio {
  paused=true; currentTime=0; volume=0;
  constructor(public src:string){clips.push(this);}
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
 }
 const doc={baseURI:'https://example.test/DuckTV/',hidden:false};
 Object.assign(globalThis,{Audio:FakeAudio,document:doc});
 try {
  const sound=new DuckAudio(()=>assert.fail('unexpected playback failure'));
  sound.update(100,true,3);assert.equal(clips.length,0);
  sound.toggle(100);await new Promise(resolve=>setImmediate(resolve));
  assert.match(clips[0].src,/DuckTV\/audio\/duck-[123]\.wav$/);
  sound.update(101,true,3);assert.equal(clips.length,1);
  sound.update(150,false,3);assert.equal(clips[0].paused,true);
  doc.hidden=true;sound.update(200,true,3);assert.equal(clips.length,1);
  doc.hidden=false;sound.update(201,true,3);assert.equal(clips.length,2);
  sound.toggle(202);assert.equal(sound.active,false);assert.equal(clips[1].paused,true);
 } finally {
  delete (globalThis as any).Audio;delete (globalThis as any).document;
 }
});
