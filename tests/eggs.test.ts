import assert from 'node:assert/strict';
import test from 'node:test';
import {EggLife} from '../src/eggs';
import type {Duck} from '../src/simulation';

const bird=(kind:Duck['kind'])=>({id:kind,kind,state:'preen' as const,speed:0,upright:0,x:0,z:0,heading:0});
test('only settled hens lay occasional eggs, with a cooldown',()=>{
 const life=new EggLife(()=>0),ducks=[bird('drake'),bird('buff')];
 for(let t=0;t<400;t+=.1)life.update(t,.1,ducks,()=>true);
 assert.equal(life.eggs.length,1);
 for(let t=400;t<800;t+=.1)life.update(t,.1,ducks,()=>true);
 assert.equal(life.eggs.length,1);
 const moving=new EggLife(()=>0);
 for(let t=0;t<300;t+=.1)moving.update(t,.1,[{...bird('brown'),speed:.3}],()=>false);
 assert.equal(moving.eggs.length,0);
});
test('old eggs persist on screen; fade only offscreen and recover if the camera returns',()=>{
 const life=new EggLife(()=>0);
 life.eggs.push({id:0,x:0,y:.052,z:0,born:0,opacity:1,hiddenFor:0});
 life.update(500,1,[],()=>true);assert.equal(life.eggs[0].opacity,1);
 for(let i=0;i<25;i++)life.update(501+i*.1,.1,[],()=>false);
 assert.ok(life.eggs[0].opacity<1&&life.eggs[0].opacity>0);
 life.update(510,.1,[],()=>true);assert.equal(life.eggs[0].opacity,1);
 for(let i=0;i<50;i++)life.update(511+i*.1,.1,[],()=>false);
 assert.equal(life.eggs.length,0);
});
