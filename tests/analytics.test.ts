import test from 'node:test';
import assert from 'node:assert/strict';
import {analyticsPage,startAnalytics} from '../src/analytics';

test('only the public garden counts; local work and model studies do not',()=>{
 for(const url of ['http://127.0.0.1:5173/','http://localhost:5173/DuckTV/','http://192.168.1.2/DuckTV/','file:///DuckTV/index.html','https://example.com/DuckTV/','https://krauhe.github.io/DuckTV/reference.html','https://krauhe.github.io/DuckTV/training.html'])assert.equal(analyticsPage(new URL(url)),null,url);
 for(const path of ['/DuckTV','/DuckTV/','/DuckTV/index.html','/DuckTV/?fbclid=example#camera'])assert.equal(analyticsPage(new URL('https://krauhe.github.io'+path)),'/DuckTV/');
});

test('loading is asynchronous and deduplicated, with no network script on localhost',()=>{
 const scripts:any[]=[];
 const document={querySelector:()=>scripts[0],createElement:()=>({dataset:{}}),head:{appendChild:(s:unknown)=>scripts.push(s)}};
 const window={location:new URL('http://127.0.0.1:5173/')};
 Object.assign(globalThis,{document,window});
 try{
  startAnalytics('https://example.goatcounter.com/count');assert.equal(scripts.length,0);
  window.location=new URL('https://krauhe.github.io/DuckTV/?fbclid=example');
  startAnalytics('');assert.equal(scripts.length,0,'inactive until its own site is configured');
  startAnalytics('https://example.goatcounter.com/count');startAnalytics('https://example.goatcounter.com/count');
  assert.equal(scripts.length,1);assert.equal(scripts[0].async,true);
  assert.equal((window as any).goatcounter.path(),'/DuckTV/');
  assert.equal((window as any).goatcounter.no_events,true);
 }finally{delete (globalThis as any).document;delete (globalThis as any).window;}
});
