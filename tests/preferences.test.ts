import test from 'node:test';
import assert from 'node:assert/strict';
import {readPreferences,writePreferences,DEFAULT_PREFERENCES} from '../src/preferences.ts';
test('a new browser follows Gistrup weather and the current time',()=>{
 const p=readPreferences({getItem:()=>null});assert.equal(p.weather,'live');assert.equal(p.timeMode,'live');assert.equal(p.minutes,null);
});
test('manual weather, time and other controls survive storage round-trip',()=>{
 let value:string|null=null;
 const storage={getItem:()=>value,setItem:(_key:string,v:string)=>{value=v;}};
 const chosen={...DEFAULT_PREFERENCES,weather:'rain' as const,timeMode:'manual' as const,minutes:1375,quality:'low' as const,autoFollow:false,sound:true};
 writePreferences(storage,chosen);assert.deepEqual(readPreferences(storage),chosen);
});
test('invalid or inaccessible storage preserves valid settings and safe defaults',()=>{
 assert.deepEqual(readPreferences({getItem:()=>'{broken'}),DEFAULT_PREFERENCES);
 assert.deepEqual(readPreferences({getItem:()=>{throw new Error('denied');}}),DEFAULT_PREFERENCES);
 const p=readPreferences({getItem:()=>JSON.stringify({weather:'rain',timeMode:'invalid',minutes:9999,autoFollow:'false'})});
 assert.equal(p.weather,'rain');assert.equal(p.timeMode,'live');assert.equal(p.minutes,null);assert.equal(p.autoFollow,true);
 assert.doesNotThrow(()=>writePreferences({setItem:()=>{throw new Error('full');}},p));
});
