import {Body, Equator, Illumination, Observer, RotateVector, Rotation_EQJ_HOR, Vector} from 'astronomy-engine';
import {Vector3} from 'three';

export const GISTRUP_OBSERVER=new Observer(56.995,9.995,0);
/** Garden -Z is north (house and pool), +X east, +Y up. */
export function horizonToGarden(v:{x:number;y:number;z:number}){return new Vector3(-v.y,v.z,-v.x);}
export function celestialFrame(date:Date){
 const rotation=Rotation_EQJ_HOR(date,GISTRUP_OBSERVER);
 const convert=(v:Vector)=>horizonToGarden(RotateVector(rotation,v));
 const moon=Equator(Body.Moon,date,GISTRUP_OBSERVER,false,true);
 const sun=Equator(Body.Sun,date,GISTRUP_OBSERVER,false,true);
 const moonVector=convert(moon.vec),sunVector=convert(sun.vec);
 return {
  star:(ra:number,dec:number)=>{
   const a=ra*Math.PI/12,d=dec*Math.PI/180;
   return convert(new Vector(Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d),moon.vec.t));
  },
  moonDirection:moonVector.clone().normalize(),
  sunlight:sunVector.clone().sub(moonVector).normalize(),
  sunAltitude:Math.asin(sunVector.clone().normalize().y)*180/Math.PI,
  moonRadius:65*1737.4/(moon.dist*149597870.7),
  illumination:Illumination(Body.Moon,date).phase_fraction,
 };
}
