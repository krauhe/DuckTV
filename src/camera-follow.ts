import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import { GARDEN, type Vec2 } from './types';

export const FOLLOW_CAMERA = { idleSeconds: 20, clearance: 1.9, speed: .24, lookSpeed: .32 };

/** Slow, local steering; every candidate segment respects all ducks, not just the centre. */
export class CameraFollow {
  private lastManual = -Infinity;
  private held = false;
  private centre = new Vector3();
  private candidate = new Vector3();
  private best = new Vector3();

  manual(now: number, held = false): void { this.lastManual = now; this.held = held; }

  release(now:number):void { if(Number.isFinite(this.lastManual))this.manual(now); }

  update(dt: number, now: number, camera: PerspectiveCamera, target: Vector3, ducks: readonly Vec2[]): boolean {
    if(this.held || now-this.lastManual<FOLLOW_CAMERA.idleSeconds || !ducks.length)return false;
    dt=Math.max(0,Math.min(dt,.05));
    this.centre.set(0,.65,0);
    for(const d of ducks){this.centre.x+=d.x/ducks.length;this.centre.z+=d.z/ducks.length;}
    this.centre.x=MathUtils.clamp(this.centre.x,GARDEN.minX+.7,GARDEN.maxX-.7);
    this.centre.z=MathUtils.clamp(this.centre.z,GARDEN.minZ+.7,GARDEN.maxZ-.7);
    let radius=0;
    for(const d of ducks)radius=Math.max(radius,Math.hypot(d.x-this.centre.x,d.z-this.centre.z));
    const desiredDistance=Math.max(3,radius+FOLLOW_CAMERA.clearance);
    const current=camera.position;
    const cost=(p:Vector3)=>{
      let penalty=Math.abs(Math.hypot(p.x-this.centre.x,p.z-this.centre.z)-desiredDistance);
      for(const d of ducks)penalty+=Math.max(0,FOLLOW_CAMERA.clearance-Math.hypot(p.x-d.x,p.z-d.z))*8;
      return penalty;
    };
    this.best.copy(current);let bestCost=cost(current);
    for(let i=0;i<32;i++){
      const a=i*Math.PI/16;
      this.candidate.copy(current);
      this.candidate.x=MathUtils.clamp(current.x+Math.cos(a)*FOLLOW_CAMERA.speed*dt,GARDEN.minX+.15,GARDEN.maxX-.15);
      this.candidate.z=MathUtils.clamp(current.z+Math.sin(a)*FOLLOW_CAMERA.speed*dt,GARDEN.minZ+.15,GARDEN.maxZ-.15);
      const dx=this.candidate.x-current.x,dz=this.candidate.z-current.z,len=dx*dx+dz*dz;
      const safe=ducks.every(d=>{
        const start=Math.hypot(current.x-d.x,current.z-d.z);
        const t=len?MathUtils.clamp(((d.x-current.x)*dx+(d.z-current.z)*dz)/len,0,1):0;
        const closest=Math.hypot(current.x+dx*t-d.x,current.z+dz*t-d.z);
        return closest>=Math.min(start,FOLLOW_CAMERA.clearance)-1e-9;
      });
      const score=cost(this.candidate);
      if(safe&&score<bestCost-1e-8){bestCost=score;this.best.copy(this.candidate);}
    }
    camera.position.copy(this.best);
    // Look gently towards the group even if there is no safe route closer.
    const gap=target.distanceTo(this.centre);
    if(gap>1e-6)target.lerp(this.centre,Math.min(1,FOLLOW_CAMERA.lookSpeed*dt/gap));
    camera.lookAt(target);
    return true;
  }
}
