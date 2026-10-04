import test from 'node:test';
import assert from 'node:assert/strict';
import { FeedGesture } from '../src/pointer-gesture';

test('short left click casts with a little hand movement',()=>{
 const g=new FeedGesture();g.down(1,0,100,100,0);
 assert.equal(g.up(1,0,103,102,120),true);
});
test('camera drag returning to its origin never casts',()=>{
 const g=new FeedGesture();g.down(1,0,100,100,0);g.move(1,150,100);g.move(1,100,100);
 assert.equal(g.up(1,0,100,100,150),false);
});
test('right and middle buttons and a long hold never cast',()=>{
 for(const button of [1,2]){const g=new FeedGesture();g.down(1,button,100,100,0);assert.equal(g.up(1,button,100,100,100),false)}
 const g=new FeedGesture();g.down(1,0,100,100,0);assert.equal(g.up(1,0,100,100,500),false);
});
test('multitouch cancels feeding until a fresh gesture',()=>{
 const g=new FeedGesture();g.down(1,0,100,100,0);g.down(2,0,120,120,10);
 assert.equal(g.up(2,0,120,120,80),false);assert.equal(g.up(1,0,100,100,90),false);
 g.down(3,0,100,100,100);assert.equal(g.up(3,0,100,100,200),true);
});
test('cancelled pointers and window blur cannot leave a pending cast',()=>{
 const g=new FeedGesture();g.down(1,0,100,100,0);g.cancel(1);assert.equal(g.up(1,0,100,100,100),false);
 g.down(2,0,100,100,200);g.reset();assert.equal(g.up(2,0,100,100,250),false);
});
