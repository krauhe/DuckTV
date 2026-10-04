/** Count completed forward swings, not toe/heel contact chatter. Metres and seconds. */
export class FootContact {
 steps=0;
 private lastSide=-1;
 private lastTime=-Infinity;
 private feet=[0,1].map(()=>({stanceX:0,initialized:false,air:0,peak:0,swing:false}));
 sample(side:number,time:number,dt:number,toe:{x:number;y:number},heel:{x:number;y:number}){
  const foot=this.feet[side],x=(toe.x+heel.x)/2;
  const height=Math.min(toe.y,heel.y)-.025;
  if(!foot.initialized){foot.stanceX=x;foot.initialized=true;}
  if(height>.015){foot.air+=dt;foot.peak=Math.max(foot.peak,height);foot.swing=true;}
  else if(Math.max(toe.y,heel.y)<.04&&foot.swing){
   const travel=x-foot.stanceX;
   if(foot.air>=.09&&foot.peak>=.025&&travel>=.045&&side!==this.lastSide&&time-this.lastTime>=.16){
    this.steps++;this.lastSide=side;this.lastTime=time;
   }
   foot.stanceX=x;foot.air=0;foot.peak=0;foot.swing=false;
  }else if(!foot.swing){foot.stanceX=x;}
 }
}
