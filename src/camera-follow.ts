import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import { GARDEN, type Vec2 } from './types';

export const FOLLOW_CAMERA = {
  idleSeconds:20, clearance:1.9, speed:.24, lookSpeed:.32,
  centreSeconds:1.2, velocitySeconds:.8, aimSeconds:1.5,
  moveStart:.28, moveStop:.09, lookStart:.16, lookStop:.045,
};

/** Slow, local steering; every candidate segment respects all ducks, not just the centre. */
export class CameraFollow {
  private lastManual = -Infinity;
  private held = false;
  private centre = new Vector3();
  private candidate = new Vector3();
  private best = new Vector3();
  private rawCentre = new Vector3();
  private velocity = new Vector3();
  private wantedVelocity = new Vector3();
  private radius = 0;
  private initialized = false;
  private moving = false;
  private looking = false;
  private lastUpdate = -Infinity;

  /** Drop momentum when manual input, a pause or disabling follow takes over. */
  reset():void {
    this.initialized=false;this.moving=false;this.looking=false;this.velocity.set(0,0,0);
  }

  manual(now: number, held = false): void { this.lastManual = now; this.held = held; this.reset(); }

  release(now:number):void { if(Number.isFinite(this.lastManual))this.manual(now); }

  update(dt: number, now: number, camera: PerspectiveCamera, target: Vector3, ducks: readonly Vec2[]): boolean {
    if(this.held || now-this.lastManual<FOLLOW_CAMERA.idleSeconds || !ducks.length)return false;
    if(!Number.isFinite(dt)||dt<=0)return true;
    dt=Math.min(dt,.05);
    if(now-this.lastUpdate>.25)this.reset();
    this.lastUpdate=now;
    this.rawCentre.set(0,.65,0);
    for(const d of ducks){this.rawCentre.x+=d.x/ducks.length;this.rawCentre.z+=d.z/ducks.length;}
    this.rawCentre.x=MathUtils.clamp(this.rawCentre.x,GARDEN.minX+.7,GARDEN.maxX-.7);
    this.rawCentre.z=MathUtils.clamp(this.rawCentre.z,GARDEN.minZ+.7,GARDEN.maxZ-.7);
    let radius=0;
    for(const d of ducks)radius=Math.max(radius,Math.hypot(d.x-this.rawCentre.x,d.z-this.rawCentre.z));
    const response=1-Math.exp(-dt/FOLLOW_CAMERA.centreSeconds);
    if(!this.initialized){this.centre.copy(this.rawCentre);this.radius=radius;this.initialized=true;}
    else {this.centre.lerp(this.rawCentre,response);this.radius+=(radius-this.radius)*response;}
    const desiredDistance=Math.max(3,this.radius+FOLLOW_CAMERA.clearance);
    const current=camera.position;
    const error=Math.abs(Math.hypot(current.x-this.centre.x,current.z-this.centre.z)-desiredDistance);
    const crowded=ducks.some(d=>Math.hypot(current.x-d.x,current.z-d.z)<FOLLOW_CAMERA.clearance);
    if(crowded||error>FOLLOW_CAMERA.moveStart)this.moving=true;
    else if(error<FOLLOW_CAMERA.moveStop)this.moving=false;
    // Safety uses the live birds, never the delayed/filtered flock position.
    const safeSegment=(end:Vector3)=>{
      const dx=end.x-current.x,dz=end.z-current.z,len=dx*dx+dz*dz;
      return ducks.every(d=>{
        const start=Math.hypot(current.x-d.x,current.z-d.z);
        const t=len?MathUtils.clamp(((d.x-current.x)*dx+(d.z-current.z)*dz)/len,0,1):0;
        return Math.hypot(current.x+dx*t-d.x,current.z+dz*t-d.z)>=Math.min(start,FOLLOW_CAMERA.clearance)-1e-9;
      });
    };
    const cost=(p:Vector3)=>{
      let penalty=Math.abs(Math.hypot(p.x-this.centre.x,p.z-this.centre.z)-desiredDistance);
      for(const d of ducks)penalty+=Math.max(0,FOLLOW_CAMERA.clearance-Math.hypot(p.x-d.x,p.z-d.z))*8;
      return penalty;
    };
    this.best.copy(current);let bestCost=cost(current);
    for(let i=0;this.moving&&i<32;i++){
      const a=i*Math.PI/16;
      this.candidate.copy(current);
      this.candidate.x=MathUtils.clamp(current.x+Math.cos(a)*FOLLOW_CAMERA.speed*dt,GARDEN.minX+.15,GARDEN.maxX-.15);
      this.candidate.z=MathUtils.clamp(current.z+Math.sin(a)*FOLLOW_CAMERA.speed*dt,GARDEN.minZ+.15,GARDEN.maxZ-.15);
      const score=cost(this.candidate);
      if(safeSegment(this.candidate)&&score<bestCost-1e-8){bestCost=score;this.best.copy(this.candidate);}
    }
    // Filtering the selected velocity removes frame-to-frame changes between
    // neighbouring steering directions and eases both starts and stops.
    this.wantedVelocity.copy(this.best).sub(current).divideScalar(dt);
    this.velocity.lerp(this.wantedVelocity,1-Math.exp(-dt/FOLLOW_CAMERA.velocitySeconds));
    this.candidate.copy(current).addScaledVector(this.velocity,dt);
    this.candidate.x=MathUtils.clamp(this.candidate.x,GARDEN.minX+.15,GARDEN.maxX-.15);
    this.candidate.z=MathUtils.clamp(this.candidate.z,GARDEN.minZ+.15,GARDEN.maxZ-.15);
    if(safeSegment(this.candidate))camera.position.copy(this.candidate);
    else this.velocity.set(0,0,0);
    // Look gently towards the group even if there is no safe route closer.
    const gap=target.distanceTo(this.centre);
    if(gap>FOLLOW_CAMERA.lookStart)this.looking=true;
    else if(gap<FOLLOW_CAMERA.lookStop)this.looking=false;
    if(this.looking)target.lerp(this.centre,Math.min(1-Math.exp(-dt/FOLLOW_CAMERA.aimSeconds),FOLLOW_CAMERA.lookSpeed*dt/gap));
    camera.lookAt(target);
    return true;
  }
}
