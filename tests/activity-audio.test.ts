import test from 'node:test';
import assert from 'node:assert/strict';
import {ActivityAudio,effectLevels,helicopterLevel} from '../src/activity-audio';
import {initialPreferences,DEFAULT_PREFERENCES,readPreferences} from '../src/preferences';
test('weather and nearby swimming control independent bounded layers',()=>{
 const clear=effectLevels({rain:0,wind:1},false,0,Infinity);
 assert.equal(clear.rain,0);assert.equal(clear.wind,0);assert.equal(clear.swim,0);
 const wet=effectLevels({rain:5,wind:12},false,2,2);
 assert.ok(wet.rain>0&&wet.rain<=.65);assert.ok(wet.wind<=.5);assert.ok(wet.birds<clear.birds);
 assert.ok(effectLevels({rain:0,wind:1},true,0,2).birds<clear.birds);
 assert.ok(effectLevels({rain:0,wind:1},false,1,20).swim<wet.swim);
});
test('effect volume is persisted, clamped and robust to invalid data',()=>{
 assert.equal(readPreferences({getItem:()=>JSON.stringify({...DEFAULT_PREFERENCES,sound:true,soundVolume:.31})}).soundVolume,.31);
 assert.equal(readPreferences({getItem:()=>JSON.stringify({soundVolume:9})}).soundVolume,1);
 assert.equal(readPreferences({getItem:()=>JSON.stringify({soundVolume:-3})}).soundVolume,0);
 assert.equal(readPreferences({getItem:()=>JSON.stringify({soundVolume:'bad'})}).soundVolume,.75);
 assert.equal(readPreferences({getItem:()=>JSON.stringify({sound:false,soundVolume:.8})}).soundVolume,0,'old disabled switch migrates to slider at zero');
 assert.equal(readPreferences({getItem:()=>JSON.stringify({sound:true})}).soundVolume,.55,'old enabled setting keeps a useful volume');
 assert.equal(readPreferences({getItem:()=>JSON.stringify({sound:true,soundVolume:0})}).sound,false);
 assert.equal(readPreferences({getItem:()=>JSON.stringify({soundVolume:.4})}).sound,true);
});

test('audio requires enabling, fades gain and pauses hidden tabs',async()=>{
 const original={AudioContext:(globalThis as any).AudioContext,fetch:globalThis.fetch,document:(globalThis as any).document};
 const gains:any[]=[],sources:any[]=[];let context:any;
 const param=()=>({value:0,targets:[] as number[],setTargetAtTime(v:number){this.targets.push(v);},setValueAtTime(){},linearRampToValueAtTime(){}});
 class Context{
  currentTime=0;state='suspended';destination={};
  constructor(){context=this;}
  createGain(){const g={gain:param(),connect(){},disconnect(){}};gains.push(g);return g;}
  createBufferSource(){const s={playbackRate:{value:1},buffer:null,connect(){},disconnect(){},start(){},onended:null};sources.push(s);return s;}
  async resume(){this.state='running';}async suspend(){this.state='suspended';}
  async decodeAudioData(){return {duration:10,sampleRate:100,getChannelData:()=>new Float32Array(1000)};}
 }
 Object.assign(globalThis,{AudioContext:Context,document:{baseURI:'https://example.test/DuckTV/'},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})});
 try{
  const mixer=new ActivityAudio(false,.5,()=>{});await mixer.start();assert.equal(context,undefined);
  mixer.setEnabled(true);await mixer.start();assert.equal(context.state,'running');
  assert.equal(gains[0].gain.targets.at(-1),.5);
  mixer.setWeather({rain:2,wind:6});mixer.update([],{x:0,z:0},false);
  assert.equal(sources.length,3,'rain, wind and birds loop; no swimming sound');
  assert.ok(gains.slice(1).some(g=>g.gain.targets.some((v:number)=>v>0)));
  mixer.setVolume(.2);assert.equal(gains[0].gain.targets.at(-1),.2);
  mixer.setEnabled(false);assert.equal(gains[0].gain.targets.at(-1),0);
  mixer.setVisible(false);assert.equal(context.state,'suspended');
 }finally{Object.assign(globalThis,original);}
});


test('helicopter stays quiet, fades with distance and stops with the rotor',()=>{
 assert.equal(helicopterLevel(0,0),0);
 assert.equal(helicopterLevel(0,1),.13);
 assert.ok(helicopterLevel(100,1)<helicopterLevel(30,1));
 assert.ok(helicopterLevel(30,.25)<helicopterLevel(30,1));
 assert.ok(helicopterLevel(500,1)<.001);
});
