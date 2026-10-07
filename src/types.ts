import type { GesturePose } from './duck-gestures';
export type DuckKind = 'drake' | 'buff' | 'brown' | 'pied';
export type DuckState = 'wander' | 'notice' | 'approach' | 'eat' | 'guard' | 'rest' | 'preen' | 'sleep' | 'forage' | 'drink' | 'chase' | 'retreat' | 'swim' | 'enter' | 'exit';
export interface RecordedFootTarget { position:{x:number;y:number;z:number}; yaw:number; lift:number; pitch?:number; }
export interface RecordedBodyTarget { pelvis:{x:number;y:number;z:number}; head:{x:number;y:number;z:number}; neckMiddle?:{x:number;y:number;z:number}; pitch:number; }
export interface DuckPose { preenTarget?:'chest'|'wing'; gesture?:GesturePose; mouthOpen?:number; groundHeight?:(x:number,z:number)=>number; recordedBody?:RecordedBodyTarget; /** Optional world-space foot recording, in left/right order. */ recordedFeet?:[RecordedFootTarget,RecordedFootTarget]; /** Vertical water displacement in world units, excluding intentional jumps. */ waterBob?:number; speed: number; time: number; state: DuckState; look: number; peck: number; upright: number; headTilt: number; displayDip: number; accelerationForward?:number; accelerationSide?:number; jumpProgress?:number; crouch?:number; landing?:number; }
export interface Vec2 { x: number; z: number; }
export const POND = { x: 2.5, z: -1.1, radius: 1.65, waterY: 0.27, rimY: 0.40 };
export const GARDEN = { minX: -5.25, maxX: 5.25, minZ: -4, maxZ: 4 };


