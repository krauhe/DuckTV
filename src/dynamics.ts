/** Artist-tunable scene units, not measured duck masses or tissue properties. */
export const DYNAMICS={driveForce:3.2,velocityGain:7,turnAcceleration:5,turnTorque:.9,turnGain:1.5,arrivalGain:2.4} as const;

export interface Motion {vx:number;vz:number;ax:number;az:number;mass:number}

export const HOP_GRAVITY=9.81;
/** Choose a takeoff impulse that clears the rim; gravity controls the flight. */
export function planHop(startY:number,endY:number,apex:number,mass:number){
 const height=Math.max(apex,startY+.01,endY+.01);
 const launchSpeed=Math.sqrt(2*HOP_GRAVITY*(height-startY));
 const duration=(launchSpeed+Math.sqrt(2*HOP_GRAVITY*(height-endY)))/HOP_GRAVITY;
 return {impulse:mass*launchSpeed,duration};
}

/** A bounded steering force changes momentum; even stopping takes time. */
export function drive(m:Motion,wantedX:number,wantedZ:number,dt:number):void{
 let fx=(wantedX-m.vx)*DYNAMICS.velocityGain;
 let fz=(wantedZ-m.vz)*DYNAMICS.velocityGain;
 const force=Math.hypot(fx,fz);
 if(force>DYNAMICS.driveForce){fx*=DYNAMICS.driveForce/force;fz*=DYNAMICS.driveForce/force}
 m.ax=fx/m.mass;m.az=fz/m.mass;
 m.vx+=m.ax*dt;m.vz+=m.az*dt;
}

/** Damped mass-spring, substepped independently of the render frame rate. */
export class Spring {
 velocity=0;
 constructor(public value=0,readonly mass=1,readonly stiffness=95,readonly damping=17){}
 step(target:number,dt:number):number{
  const count=Math.max(1,Math.ceil(dt*120)),h=dt/count;
  for(let i=0;i<count;i++){
   const force=this.stiffness*(target-this.value)-this.damping*this.velocity;
   this.velocity+=force/this.mass*h;
   this.value+=this.velocity*h;
  }
  return this.value;
 }
}
