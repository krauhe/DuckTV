/** Individual attention delays, followed by eased release when a stimulus passes. */
export class DuckAlert {
 private onset:number|undefined;
 private strength=0;
 update(active:boolean,time:number,dt:number,index:number){
  if(active&&this.onset===undefined)this.onset=time;
  if(!active)this.onset=undefined;
  const responding=this.onset!==undefined&&time-this.onset>=.18+index*.31;
  this.strength+=((responding?1:0)-this.strength)*(1-Math.exp(-Math.max(0,dt)*(responding?4:2.5)));
  return this.strength;
 }
}
