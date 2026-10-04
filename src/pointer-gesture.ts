/** Distinguish a short primary click/tap from camera dragging or multitouch. */
export class FeedGesture {
 private active=new Set<number>();
 private candidate:{id:number;x:number;y:number;time:number}|null=null;
 down(id:number,button:number,x:number,y:number,time:number){
  this.active.add(id);
  this.candidate=this.active.size===1&&button===0?{id,x,y,time}:null;
 }
 move(id:number,x:number,y:number){
  const c=this.candidate;
  if(c?.id===id&&Math.hypot(x-c.x,y-c.y)>7)this.candidate=null;
 }
 up(id:number,button:number,x:number,y:number,time:number){
  this.move(id,x,y);
  const c=this.candidate;
  this.active.delete(id);
  this.candidate=null;
  return !!c&&c.id===id&&button===0&&time-c.time<=350;
 }
 cancel(id:number){this.active.delete(id);this.candidate=null}
 reset(){this.active.clear();this.candidate=null}
}
