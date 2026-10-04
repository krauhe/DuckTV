import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDuck} from '../src/duck-model.ts';
import {gardenGroundHeight} from '../src/shelter.ts';

test('webbed soles stay above the raised shelter floor when entering and leaving',()=>{
 for(const direction of [-1,1]){
  const model=createDuck('buff');model.group.rotation.y=direction<0?Math.PI:0;
  for(let i=1;i<=220;i++){
   model.group.position.set(-3.7,0,(direction<0?-1.5:-2.7)+direction*i*.004);
   model.group.position.y=gardenGroundHeight(model.group.position.x,model.group.position.z);
   model.animate({time:i/60,state:'wander',speed:.24,look:0,peck:0,upright:1,headTilt:0,displayDip:0,groundHeight:gardenGroundHeight});
   model.group.updateMatrixWorld(true);
   for(const side of ['left','right']){
    const foot=model.group.getObjectByName(`duck-${side}-foot`)!;
    foot.traverse(object=>{
     if(!(object instanceof THREE.Mesh))return;
     const vertices=object.geometry.getAttribute('position');
     for(let j=0;j<vertices.count;j++){
      const point=object.localToWorld(new THREE.Vector3().fromBufferAttribute(vertices,j));
      assert.ok(point.y>=gardenGroundHeight(point.x,point.z)-.001,`sole through floor at frame ${i}: ${point.y}`);
     }
    });
   }
  }
 }
});
