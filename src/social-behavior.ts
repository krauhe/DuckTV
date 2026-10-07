import type {GesturePose} from './duck-gestures';
import type { DuckState, Vec2 } from './types';

export interface Neighbor extends Vec2 { id: string; state: DuckState; speed: number; heading?:number; followingId?:string; gesture?:GesturePose }
export interface Needs { bath: number; rest: number; sociability: number }

/** Read only the previous tick, so a decision cannot propagate through the flock in one frame. */
export function perceive(self: Neighbor, neighbors: readonly Neighbor[]) {
  let weight = 0, calm = 0, activity = 0, bathing = 0, foraging = 0, x = 0, z = 0;
  for (const other of neighbors) {
    if (other.id === self.id) continue;
    const distance = Math.hypot(other.x-self.x, other.z-self.z);
    const w = Math.max(0, 1-distance/5);
    weight += w; x += other.x*w; z += other.z*w;
    calm += w * (['preen','sleep','rest'].includes(other.state) ? 1 : 0);
    activity += w * (other.speed > .7 || other.state === 'retreat' ? 1 : 0);
    bathing += w * (['enter','swim'].includes(other.state) ? 1 : 0);
    foraging += w * (other.state==='forage' ? 1 : 0);
  }
  return { calm: calm/Math.max(1,weight), activity: activity/Math.max(1,weight),
    bathing: bathing/Math.max(1,weight), foraging:foraging/Math.max(1,weight), center: weight ? {x:x/weight,z:z/weight} : undefined };
}

/** Follow an independently moving neighbour, never a follower or a fleeing bird. */
export function followCandidate(self:Neighbor, neighbors:readonly Neighbor[]):Neighbor|undefined{
  return neighbors.filter(other=>other.id!==self.id&&!other.followingId&&other.speed>.12&&
    ['wander','guard'].includes(other.state)&&Math.hypot(other.x-self.x,other.z-self.z)>.9&&
    Math.hypot(other.x-self.x,other.z-self.z)<3.8)
    .sort((a,b)=>Math.hypot(a.x-self.x,a.z-self.z)-Math.hypot(b.x-self.x,b.z-self.z)||a.id.localeCompare(b.id))[0];
}

export function replyChance(needs: Needs, cameraDistance: number, partnerDistance: number): number {
  return Math.max(.05, Math.min(.9, .42 + needs.sociability*.22 +
    Math.max(0,1-partnerDistance/2.8)*.2 - needs.rest*.18 - needs.bath*.12 -
    Math.max(0,2-cameraDistance)*.4));
}

/** A nearby spontaneous bout can invite a delayed response, not a pose copy.
 * Responses do not invite further responses, preventing a self-sustaining loop. */
export function wingStimulus(self:Neighbor,neighbors:readonly Neighbor[]):Neighbor|undefined{
  return neighbors.find(other=>other.id!==self.id&&other.gesture?.kind==='wingFlap'&&
    !other.gesture.social&&other.gesture.progress<.75&&Math.hypot(other.x-self.x,other.z-self.z)<3.5);
}
