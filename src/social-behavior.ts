import type { DuckState, Vec2 } from './types';

export interface Neighbor extends Vec2 { id: string; state: DuckState; speed: number }
export interface Needs { bath: number; rest: number; sociability: number }

/** Read only the previous tick, so a decision cannot propagate through the flock in one frame. */
export function perceive(self: Neighbor, neighbors: readonly Neighbor[]) {
  let weight = 0, calm = 0, activity = 0, bathing = 0, x = 0, z = 0;
  for (const other of neighbors) {
    if (other.id === self.id) continue;
    const distance = Math.hypot(other.x-self.x, other.z-self.z);
    const w = Math.max(0, 1-distance/5);
    weight += w; x += other.x*w; z += other.z*w;
    calm += w * (['preen','sleep','rest'].includes(other.state) ? 1 : 0);
    activity += w * (other.speed > .7 || other.state === 'retreat' ? 1 : 0);
    bathing += w * (['enter','swim'].includes(other.state) ? 1 : 0);
  }
  return { calm: calm/Math.max(1,weight), activity: activity/Math.max(1,weight),
    bathing: bathing/Math.max(1,weight), center: weight ? {x:x/weight,z:z/weight} : undefined };
}

export function replyChance(needs: Needs, cameraDistance: number, partnerDistance: number): number {
  return Math.max(.05, Math.min(.9, .42 + needs.sociability*.22 +
    Math.max(0,1-partnerDistance/2.8)*.2 - needs.rest*.18 - needs.bath*.12 -
    Math.max(0,2-cameraDistance)*.4));
}
