export type DuckKind = 'drake' | 'buff' | 'brown' | 'pied';
export type DuckState = 'wander' | 'notice' | 'approach' | 'eat' | 'guard' | 'rest' | 'preen' | 'sleep' | 'forage' | 'chase' | 'swim' | 'enter' | 'exit';
export interface DuckPose { speed: number; time: number; state: DuckState; look: number; peck: number; upright: number; headTilt: number; displayDip: number; accelerationForward?:number; accelerationSide?:number; jumpProgress?:number; crouch?:number; landing?:number; }
export interface Vec2 { x: number; z: number; }
export const POND = { x: 2.5, z: -1.1, radius: 1.65, waterY: 0.27, rimY: 0.40 };
export const GARDEN = { minX: -5.25, maxX: 5.25, minZ: -4, maxZ: 4 };
