import {POND, type Vec2} from './types';

// 540019 mono samples at 22050 Hz: sound/1 water ducks chatting.wav.
// Shared by behavior and playback, including when sound is disabled.
export const BATH_DUET_SECONDS = 540019 / 22050;
export interface BathDuet {
  id: number;
  leaderId: string;
  followerId: string;
  startedAt: number;
  duration: number;
  direction: 1 | -1;
}

/** Steer relative to the birds' actual positions; never place them on a timeline. */
export function bathDuetSteering(duet: BathDuet, bird: Vec2, leader: Vec2, follower: Vec2, isLeader: boolean, time: number) {
  const angle = (p: Vec2) => Math.atan2(p.z-POND.z,p.x-POND.x);
  const gap = ((angle(leader)-angle(follower))*duet.direction + Math.PI*2) % (Math.PI*2);
  const elapsed = time-duet.startedAt;
  const ease = (x:number) => {const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
  const pace = (.75+.25*ease(elapsed/1.5))*(.65+.35*ease((duet.duration-elapsed)/2.5));
  const speed = isLeader ? (gap>2.4?.24:.32) : Math.max(.10,Math.min(.43,.32+(gap-1.55)*.13));
  const radius = .86+.035*Math.sin(elapsed*.55);
  const ahead = angle(bird)+duet.direction*.55;
  return {target:{x:POND.x+Math.cos(ahead)*radius,z:POND.z+Math.sin(ahead)*radius},speed:speed*pace};
}
