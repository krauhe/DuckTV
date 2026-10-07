export type DuckGesture = 'wingFlap' | 'wingStretch' | 'tailWag';
export interface GesturePose { kind: DuckGesture; progress: number; side: number; /** A response must not trigger another response. */ social?:boolean }
export const GESTURE_SECONDS: Record<DuckGesture,number> = {wingFlap:3.8,wingStretch:3.2,tailWag:1.1};
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};

/** Bounded local clip time: starts/ends folded, independent of the global clock. */
export function gestureChannels(pose?:GesturePose){
  const result={left:0,right:0,stroke:0,tail:0,lean:0,forward:0,stretch:0,balance:0,rump:0};
  if(!pose||!Number.isFinite(pose.progress))return result;
  const t=Math.max(0,Math.min(1,pose.progress));
  if(t===0||t===1)return result;
  const envelope=smooth(t/.18)*smooth((1-t)/.22);
  if(pose.kind==='wingFlap'){
    result.left=result.right=envelope;
    const phase=t*GESTURE_SECONDS.wingFlap*5*Math.PI*2;
    result.stroke=Math.sin(phase)*envelope;
    // Body rises before the full stroke; forward sweep and elevation are
    // offset in phase so the wing traces an arc instead of a flat hinge.
    result.forward=(.40+.24*Math.cos(phase))*envelope;
    result.stretch=smooth(t/.12)*smooth((1-t)/.26);
    result.lean=-.10*result.stretch;
  }else if(pose.kind==='wingStretch'){
    result[pose.side<0?'left':'right']=envelope*.85;
    result.stroke=.22*envelope;
    result.lean=.035*envelope;
    result.stretch=.55*envelope;
    result.forward=.12*envelope;
    result.balance=-(pose.side<0?-1:1)*.045*envelope;
  }else {
    result.tail=Math.sin(t*Math.PI*2*4)*envelope*.30;
    result.rump=result.tail*.18;
  }
  return result;
}
