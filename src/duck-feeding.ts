/** Reach, pickup and low-neck handling. Durations are animation choices,
 * not measured swallowing times; no claim of identifying a swallow in video. */
export function feedingPose(elapsed:number, handlingSeconds:number){
  const reach=.52, t=Math.max(0,elapsed);
  if(t<reach){
    const p=t/reach;
    return {peck:Math.sin(Math.PI*.5*p),mouthOpen:Math.max(0,(p-.55)*.55),pickedUp:false,done:false};
  }
  const p=Math.min(1,(t-reach)/handlingSeconds);
  const settle=p>.8?1-(p-.8)/.2:1;
  return {peck:(.30+.18*Math.sin(p*Math.PI*3)**2)*settle,
    mouthOpen:(.22+.22*Math.sin(p*Math.PI*7)**2)*settle,pickedUp:true,done:p>=1};
}
