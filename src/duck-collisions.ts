import type { Duck } from './simulation';
import { SHELTER } from './shelter';

/** Conservative collision volumes in scene units, including the reaching head.
 * These approximate the rendered rig; they are not measured duck anatomy.
 */
export function duckVolumes(d:Duck){
 const resting=d.state==='sleep'||d.state==='preen';
 const reach=resting?-.20:d.state==='chase'?.60:.22+.42*d.peck;
 const headY=resting?.48:d.state==='chase'?.65:1.02-.78*d.peck;
 return [{forward:-.04,y:resting?.25:.43,r:.24},{forward:-.25,y:resting?.25:.43,r:.15},
  {forward:reach,y:headY,r:.15},{forward:reach*.55,y:(headY+.45)/2,r:.12}]
  .map(v=>({x:d.x+Math.sin(d.heading)*v.forward,z:d.z+Math.cos(d.heading)*v.forward,y:d.y+v.y,r:v.r}));
}
const walls=[
 [SHELTER.minX,SHELTER.back,SHELTER.minX,SHELTER.front],
 [SHELTER.maxX,SHELTER.back,SHELTER.maxX,SHELTER.front],
 [SHELTER.minX,SHELTER.back,SHELTER.maxX,SHELTER.back],
];
function removeInwardVelocity(d:Duck,nx:number,nz:number){
 const speed=d.vx*nx+d.vz*nz;if(speed<0){d.vx-=speed*nx;d.vz-=speed*nz;}
 d.speed=Math.hypot(d.vx,d.vz);
}
export function constrainShelter(d:Duck,door=0){
 const barriers=door>0?[...walls,[SHELTER.minX,SHELTER.front,SHELTER.maxX,SHELTER.front]]:walls;
 for(const [index,[ax,az,bx,bz]] of barriers.entries())for(const v of duckVolumes(d)){
  if(index===3&&v.y+v.r<1.445-door*1.42)continue;
  if(v.y-v.r>1.48)continue;
  const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((v.x-ax)*dx+(v.z-az)*dz)/(dx*dx+dz*dz)));
  const x=v.x-ax-t*dx,z=v.z-az-t*dz,limit=v.r+.04;
  let dist=Math.hypot(x,z);
  // Keep the head on the body's side of a wall even if a turn has already
  // carried its centre through the mesh. Nearest-side projection would fail here.
  if(t>0&&t<1){
   const nx=dz?Math.sign(d.x-ax)||1:0,nz=dx?Math.sign(d.z-az)||1:0;
   dist=x*nx+z*nz;
   if(dist<limit){d.x+=nx*(limit-dist);d.z+=nz*(limit-dist);removeInwardVelocity(d,nx,nz);}
   continue;
  }
  if(dist>=limit)continue;
  const nx=dist>1e-8?x/dist:dz?Math.sign(d.x-ax)||1:0;
  const nz=dist>1e-8?z/dist:dx?Math.sign(d.z-az)||1:0;
  d.x+=nx*(limit-dist);d.z+=nz*(limit-dist);removeInwardVelocity(d,nx,nz);
 }
}
export function resolveDuckContacts(ducks:Duck[],door=0,constrainGround?:(duck:Duck)=>void){
 for(let pass=0;pass<24;pass++){
  for(let i=0;i<ducks.length;i++)for(let j=i+1;j<ducks.length;j++){
   const a=ducks[i],b=ducks[j];
   const dx=a.x-b.x,dz=a.z-b.z,d=Math.hypot(dx,dz);
   let depth=Math.max(0,.47-d),nx=d>1e-8?dx/d:1,nz=d>1e-8?dz/d:0;
   // Resolve the deepest current contact once, then recompute next iteration.
   // Applying several stale head contacts could undo body separation.
   for(const av of duckVolumes(a))for(const bv of duckVolumes(b)){
    const dy=av.y-bv.y,r=av.r+bv.r;if(Math.abs(dy)>=r)continue;
    const limit=Math.sqrt(r*r-dy*dy),vx=av.x-bv.x,vz=av.z-bv.z,dist=Math.hypot(vx,vz);
    if(limit-dist<=depth)continue;
    depth=limit-dist;nx=dist>1e-8?vx/dist:1;nz=dist>1e-8?vz/dist:0;
   }
   if(depth<=0)continue;
   const aw=a.state==='retreat'?.15:b.state==='retreat'?.85:.5;
   a.x+=nx*depth*aw;a.z+=nz*depth*aw;b.x-=nx*depth*(1-aw);b.z-=nz*depth*(1-aw);
   removeInwardVelocity(a,nx,nz);removeInwardVelocity(b,-nx,-nz);
  }
  ducks.forEach(d=>constrainShelter(d,door));
  if(constrainGround)ducks.forEach(constrainGround);
 }
}