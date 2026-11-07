/** A small, smoothed beak opening driven by the recording, not a looping pose. */
export function callEnvelope(samples:Float32Array,sampleRate:number){
 const step=Math.max(1,Math.round(sampleRate*.01)),values:number[]=[];
 for(let i=0;i<samples.length;i+=step){
  let energy=0;const end=Math.min(samples.length,i+step);
  for(let j=i;j<end;j++)energy+=samples[j]*samples[j];
  values.push(Math.sqrt(energy/(end-i)));
 }
 const peak=Math.max(.0001,...values);let opening=0;
 return values.map(value=>{
  const target=Math.max(0,(value/peak-.09)/.91)*.32;
  opening+=(target-opening)*(target>opening?.7:.3);
  return opening;
 });
}
export function sampleCall(envelope:readonly number[],seconds:number,duration:number){
 if(seconds<0||seconds>=duration)return 0;
 const position=seconds*100,index=Math.floor(position),mix=position-index;
 const value=(envelope[index]??0)*(1-mix)+(envelope[index+1]??0)*mix;
 return value*Math.min(1,seconds/.02,(duration-seconds)/.06);
}
