import { GARDEN, POND, type DuckKind, type DuckState, type Vec2 } from './types';
import { drive, DYNAMICS, HOP_GRAVITY, planHop } from './dynamics';

/** Tunable scene timings and distances, in seconds and world units. */
export const BEHAVIOR = {
  maxFrameDt: 0.25,
  stepDt: 0.025,
  foodPieces: 5,
  maxActiveFood: 50,
  castCooldown: 0.7,
  foodSpread: 0.38,
  foodLandingDelay: 0.65,
  foodCleanupDelay: 2,
  foodLifetime: 55,
  pondCastMargin: 0.25,
  pondLandMargin: 0.28,
  edgeMargin: 0.27,
  duckSpacing: 0.47,
  foodVision: 7,
  foodReach: 0.43,
  peckSeconds: 0.52,
  peckConsumeFraction: 0.58,
  approachPauseDistance: 0.42,
  approachPauseSeconds: { buff: 0.18, brown: 0.32, pied: 0.46 },
  nearbyCastRadius: 2.5,
  nearbyCastHesitation: 0.38,
  walkSpeed: 0.82,
  approachSpeed: 0.62,
  swimSpeed: 0.36,
  guardSpeed: 0.55,
  turnSpeed: 2.4,
  guardFollowStart: 1.15,
  guardFollowStop: 0.65,
  wanderMin: 2.4,
  wanderMax: 6,
  restMin: 2.2,
  restMax: 4.7,
  restChance: 0.24,
  // Provisional comfort bouts based on the owner's description, not measured timings.
  comfortFirstAt: 35,
  comfortCooldown: 48,
  preenSeconds: 7,
  sleepSeconds: 14,
  pondVisitMin: 25,
  pondVisitMax: 48,
  swimMin: 6,
  swimMax: 10,
  hopPreparation: .14,
  rimClearance: 0.16,
  waterEdgeMargin: 0.51,
  guardScanRate: 1.27,
  guardScanRange: 0.42,
  guardTurnSeconds: 1.6,
  swimBobHeight: 0.018,
  swimBobRate: 5,
  swimLookRate: 1.8,
  swimLookRange: 0.18,
  encouragementDelay: 0.45,
  noticeDelay: { buff: 0.45, brown: 1.15, pied: 2.15 },
  // Owner observation: drake dips roughly every three seconds. Other timings
  // and probabilities are provisional animation choices, pending video calibration.
  displayInterval: 3,
  displayDipSeconds: 0.95,
  displayReplyDelay: 1.25,
  displayReplyChance: 0.65,
  displayDuration: 10.5,
  displayFirstAt: 16,
  displayCooldown: 45,
  displayRange: 2.8,
} as const;

export interface Duck {
  mass:number;
  inertia:number;
  vx:number;vz:number;ax:number;az:number;
  angularVelocity:number;
  jumpProgress:number;
  crouch:number;
  landing:number;
  waterEntries:number;
  id: string;
  kind: DuckKind;
  x: number;
  z: number;
  /** Body elevation above land; pond transitions clear the rim. */
  y: number;
  /** Radians, with zero facing local +Z. */
  heading: number;
  state: DuckState;
  speed: number;
  /** Signed head yaw in radians. */
  look: number;
  /** Peck animation strength in [0, 1]. */
  peck: number;
  upright: number;
  headTilt: number;
  displayDip: number;
}

export interface Courtship {
  partnerId: string;
  startedAt: number;
  responds: boolean;
  /** Mutual display is a possible precursor, never a guaranteed mating. */
  mutualDisplay: boolean;
}

export interface Food {
  id: string;
  x: number;
  z: number;
  /** Seconds since cast. Render falling pasta until `landed` is true. */
  age: number;
  landed: boolean;
  eaten: boolean;
  eatenAt?: number;
}

interface Intent {
  moved:boolean;
  crossingFrom?: Vec2;
  crossingY?: number;
  landedAt:number;
  comfortAt: number;
  comfortUntil: number;
  comfortCount: number;
  headingTarget: number;
  guardMoving: boolean;
  idleFor: number;
  route?: { target: Vec2; side: number };
  target: Vec2;
  timer: number;
  noticeUntil: number;
  peckTimer: number;
  approachTravel: number;
  approachPaused: boolean;
  pauseUntil: number;
  pondVisitAt: number;
  swimUntil: number;
  phase: 'shore' | 'cross';
  queueAt: number;
  crossTime: number;
  foodId?: string;
}

const kinds: DuckKind[] = ['drake', 'buff', 'brown', 'pied'];
const shore: Vec2 = { x: POND.x - POND.radius - 0.39, z: POND.z };
const waterGate: Vec2 = { x: POND.x - POND.radius + 0.60, z: POND.z };
const waitSlots: Record<'buff' | 'brown' | 'pied', Vec2> = {
  buff: { x: shore.x - 0.55, z: shore.z - 0.65 },
  brown: { x: shore.x - 0.55, z: shore.z + 0.65 },
  pied: { x: shore.x - 1.1, z: shore.z },
};

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Pure scene simulation. Random input lets tests replay the same flock. */
export class Simulation {
  ducks: Duck[] = [];
  foods: Food[] = [];
  time = 0;
  courtship: Courtship | null = null;

  private intents = new Map<string, Intent>();
  private nextDisplayAt = BEHAVIOR.displayFirstAt as number;
  private viewer: Vec2 = { x: 6, z: 8.8 };
  private nextFoodId = 0;
  private lastCast = -Infinity;

  constructor(private readonly random: () => number = Math.random) {
    this.reset();
  }

  reset(): void {
    this.time = 0;
    this.courtship = null;
    this.nextDisplayAt = BEHAVIOR.displayFirstAt;
    this.foods = [];
    this.nextFoodId = 0;
    this.lastCast = -Infinity;
    this.intents.clear();
    const starts = [
      { x: -1.65, z: 0.0, heading: 0.3 },
      { x: -0.55, z: 0.45, heading: 0.7 },
      { x: -1.15, z: -0.82, heading: -0.25 },
      { x: -2.15, z: -0.48, heading: 0.15 },
    ];
    this.ducks = kinds.map((kind, index) => {
      const start = starts[index];
      const duck: Duck = {
        mass:[2,1.7,1.85,1.8][index],inertia:[2,1.7,1.85,1.8][index]*.12,vx:0,vz:0,ax:0,az:0,angularVelocity:0,
        jumpProgress:-1,crouch:0,landing:0,waterEntries:0,
        id: kind, kind, x: start.x, z: start.z, y: 0,
        heading: start.heading, state: kind === 'drake' ? 'guard' : 'wander',
        speed: 0, look: 0, peck: 0, upright: 1, headTilt: 0, displayDip: 0,
      };
      this.intents.set(duck.id, {
        moved:false,landedAt:-Infinity,
        comfortAt: BEHAVIOR.comfortFirstAt + index * 9,
        comfortUntil: 0, comfortCount: 0,
        headingTarget: start.heading, guardMoving: false, idleFor: 0,
        target: { x: start.x, z: start.z }, timer: 0, noticeUntil: 0,
        peckTimer: 0, approachTravel: 0, approachPaused: false, pauseUntil: 0,
        pondVisitAt: this.range(BEHAVIOR.pondVisitMin, BEHAVIOR.pondVisitMax) + index * 3,
        swimUntil: 0, phase: 'shore', queueAt: Infinity, crossTime: 0,
      });
      return duck;
    });
  }

  castFood(x: number, z: number): boolean {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    if (x < GARDEN.minX || x > GARDEN.maxX || z < GARDEN.minZ || z > GARDEN.maxZ) return false;
    if (distance({ x, z }, POND) < POND.radius + BEHAVIOR.pondCastMargin) return false;
    if (this.time - this.lastCast < BEHAVIOR.castCooldown) return false;
    if (this.foods.filter(food => !food.eaten).length + BEHAVIOR.foodPieces > BEHAVIOR.maxActiveFood) return false;

    this.lastCast = this.time;
    this.endDisplay();
    for (let i = 0; i < BEHAVIOR.foodPieces; i++) {
      const angle = this.random() * Math.PI * 2;
      const radius = Math.sqrt(this.random()) * BEHAVIOR.foodSpread;
      let px = clamp(x + Math.cos(angle) * radius, GARDEN.minX + 0.08, GARDEN.maxX - 0.08);
      let pz = clamp(z + Math.sin(angle) * radius, GARDEN.minZ + 0.08, GARDEN.maxZ - 0.08);
      if (distance({ x: px, z: pz }, POND) < POND.radius + 0.12) {
        px = x;
        pz = z;
      }
      this.foods.push({ id: `food-${this.nextFoodId++}`, x: px, z: pz, age: 0, landed: false, eaten: false });
    }
    for (const duck of this.ducks) {
      if (duck.kind === 'drake' || duck.state === 'eat' || !['notice', 'approach'].includes(duck.state)) continue;
      if (distance(duck, { x, z }) > BEHAVIOR.nearbyCastRadius) continue;
      const intent = this.intents.get(duck.id)!;
      duck.state = 'notice';
      intent.noticeUntil = Math.max(intent.noticeUntil, this.time + BEHAVIOR.nearbyCastHesitation);
    }
    return true;
  }

  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const elapsed = Math.min(dt, BEHAVIOR.maxFrameDt);
    const steps = Math.ceil(elapsed / BEHAVIOR.stepDt);
    const step = elapsed / steps;
    for (let i = 0; i < steps; i++) this.tick(step);
  }

  setViewer(x: number, z: number): void {
    if (Number.isFinite(x) && Number.isFinite(z)) this.viewer = { x, z };
  }

  private tick(dt: number): void {
    this.time += dt;
    for (const food of this.foods) {
      food.age += dt;
      food.landed = food.age >= BEHAVIOR.foodLandingDelay;
    }
    this.foods = this.foods.filter(food => food.age < BEHAVIOR.foodLifetime && (!food.eaten || this.time - (food.eatenAt ?? this.time) < BEHAVIOR.foodCleanupDelay));
    this.updateDisplay();

    for (const duck of this.ducks) {
      const intent = this.intents.get(duck.id)!;
      intent.moved=false;
      duck.landing*=Math.exp(-dt*14);
      if (this.courtship && (duck.kind === 'drake' || duck.id === this.courtship.partnerId)) {
        const partner = this.ducks.find(other => duck.kind === 'drake' ? other.id === this.courtship!.partnerId : other.kind === 'drake')!;
        duck.state = duck.kind === 'drake' ? 'guard' : 'rest';
        duck.peck = 0;
        duck.look = 0;
        this.face(duck, partner);
        this.brake(duck,intent,dt);
        this.updateExpression(duck, dt);
        continue;
      }
      if (this.comfort(duck, intent)) { this.brake(duck,intent,dt);this.updateExpression(duck, dt); continue; }
      if (duck.kind === 'drake') this.guard(duck, intent, dt);
      else this.female(duck, intent, dt);
      if(!intent.moved)this.brake(duck,intent,dt);
      this.updateExpression(duck, dt);
    }
    this.separateDucks();
    for (const duck of this.ducks) {
      const intent = this.intents.get(duck.id)!;
      const delta = Math.atan2(Math.sin(intent.headingTarget - duck.heading), Math.cos(intent.headingTarget - duck.heading));
      const wantedTurn=clamp(delta*4,-BEHAVIOR.turnSpeed,BEHAVIOR.turnSpeed);
      const torque=clamp((wantedTurn-duck.angularVelocity)*DYNAMICS.turnGain,-DYNAMICS.turnTorque,DYNAMICS.turnTorque);
      duck.angularVelocity+=clamp(torque/duck.inertia,-DYNAMICS.turnAcceleration,DYNAMICS.turnAcceleration)*dt;
      duck.heading += duck.angularVelocity*dt;
      duck.heading = Math.atan2(Math.sin(duck.heading), Math.cos(duck.heading));
    }
  }

  private endDisplay(): void {
    if (!this.courtship) return;
    const partner = this.ducks.find(duck => duck.id === this.courtship!.partnerId);
    if (partner?.state === 'rest') this.intents.get(partner.id)!.timer = 0;
    this.courtship = null;
    this.nextDisplayAt = this.time + BEHAVIOR.displayCooldown;
    for (const duck of this.ducks) duck.displayDip = 0;
  }

  private comfort(duck: Duck, intent: Intent): boolean {
    const active=duck.state==='preen'||duck.state==='sleep';
    const foodAvailable=this.foods.some(food=>!food.eaten);
    if(active){
      if(foodAvailable||this.time>=intent.comfortUntil){
        duck.state=duck.kind==='drake'?'guard':'wander';
        intent.timer=0;
        intent.comfortAt=this.time+BEHAVIOR.comfortCooldown+this.ducks.indexOf(duck)*4;
        return false;
      }
      duck.peck=0;duck.look=0;
      return true;
    }
    if(foodAvailable||this.courtship||this.time<intent.comfortAt||
      !['wander','rest','guard'].includes(duck.state))return false;
    if(distance(duck,shore)<.95)return false; // Leave the shared bath landing clear.
    // Stagger individual bouts and leave at least two ducks awake and active.
    if(this.ducks.filter(other=>other.state==='sleep'||other.state==='preen').length>=2)return false;
    if(duck.speed>.0005)return true; // Brake before settling into a stationary pose.
    duck.state=intent.comfortCount++%2===0?'preen':'sleep';
    intent.comfortUntil=this.time+(duck.state==='preen'?BEHAVIOR.preenSeconds:BEHAVIOR.sleepSeconds);
    duck.peck=0;duck.look=0;
    return true;
  }

  private updateDisplay(): void {
    if (this.foods.some(food => !food.eaten)) { this.endDisplay(); return; }
    if (this.courtship) {
      const elapsed = this.time - this.courtship.startedAt;
      if (elapsed >= BEHAVIOR.displayDuration) this.endDisplay();
      else if (this.courtship.responds && elapsed >= BEHAVIOR.displayReplyDelay + BEHAVIOR.displayDipSeconds) this.courtship.mutualDisplay = true;
      return;
    }
    if (this.time < this.nextDisplayAt) return;
    const drake = this.ducks[0];
    if(drake.state==='preen'||drake.state==='sleep')return;
    const candidates = this.ducks.filter(duck => duck.kind !== 'drake' && ['rest', 'wander'].includes(duck.state) && distance(duck, drake) < BEHAVIOR.displayRange);
    if (!candidates.length) { this.nextDisplayAt = this.time + 4; return; }
    const partner = candidates[Math.min(candidates.length - 1, Math.floor(this.random() * candidates.length))];
    this.courtship = { partnerId: partner.id, startedAt: this.time, responds: this.random() < BEHAVIOR.displayReplyChance, mutualDisplay: false };
  }

  private updateExpression(duck: Duck, dt: number): void {
    const intent = this.intents.get(duck.id)!;
    intent.idleFor = duck.speed < .01 ? intent.idleFor + dt : 0;
    const index = this.ducks.indexOf(duck);
    const inWater = ['swim', 'enter', 'exit'].includes(duck.state);
    const displaying = this.courtship && (duck.kind === 'drake' || duck.id === this.courtship.partnerId);
    const posturePhase = (this.time + index * 5.2) % 21;
    const relaxed = posturePhase > 11 && posturePhase < 17;
    const comfortable=duck.state==='preen'||duck.state==='sleep';
    const uprightTarget = duck.state === 'swim' || comfortable ? 0 : inWater || displaying || duck.state === 'notice' ? 1 : relaxed ? 0.12 : 1;
    duck.upright += (uprightTarget - duck.upright) * (1 - Math.exp(-dt * 2.5));
    const curiosityPhase = (this.time + index * 3.7) % 13;
    const curious = !comfortable && !inWater && !displaying && duck.state !== 'eat' && (intent.idleFor > .6 || duck.state === 'notice') && curiosityPhase < 2.6;
    const tiltTarget = curious ? Math.sin(Math.PI * curiosityPhase / 2.6) * (index % 2 ? -.35 : .35) : 0;
    duck.headTilt += (tiltTarget - duck.headTilt) * (1 - Math.exp(-dt * 7));
    if (curious && duck.state !== 'notice') this.face(duck, this.viewer);
    duck.displayDip = 0;
    if (displaying) {
      const offset = duck.kind === 'drake' ? 0 : BEHAVIOR.displayReplyDelay;
      const elapsed = this.time - this.courtship!.startedAt - offset;
      const phase = elapsed % BEHAVIOR.displayInterval;
      if (elapsed >= 0 && phase < BEHAVIOR.displayDipSeconds && (duck.kind === 'drake' || this.courtship!.responds)) {
        duck.displayDip = Math.sin(Math.PI * phase / BEHAVIOR.displayDipSeconds) ** 2;
      }
    }
  }

  private female(duck: Duck, intent: Intent, dt: number): void {
    if (duck.state === 'enter') return this.enterPond(duck, intent, dt);
    if (duck.state === 'swim') return this.swim(duck, intent, dt);
    if (duck.state === 'exit') return this.exitPond(duck, intent, dt);

    const food = intent.foodId ? this.foods.find(piece => piece.id === intent.foodId && (!piece.eaten || duck.state === 'eat')) : undefined;
    if (!food && ['notice', 'approach', 'eat'].includes(duck.state)) {
      intent.foodId = undefined;
      duck.state = 'wander';
      intent.timer = 0;
      duck.peck = 0;
    }

    if (duck.state === 'eat' && food) {
      intent.peckTimer -= dt;
      const progress = 1 - clamp(intent.peckTimer / BEHAVIOR.peckSeconds, 0, 1);
      duck.peck = Math.sin(Math.PI * progress);
      duck.look = 0;
      if (!food.eaten && progress >= BEHAVIOR.peckConsumeFraction) {
        food.eaten = true;
        food.eatenAt = this.time;
      }
      if (intent.peckTimer <= 0) {
        intent.foodId = undefined;
        duck.peck = 0;
        duck.state = 'wander';
        intent.timer = 0;
      }
      return;
    }

    if (duck.state === 'notice' && food) {
      this.face(duck, food);
      duck.look = 0.12 * Math.sin(this.time * 5 + this.ducks.indexOf(duck));
      if (duck.kind === 'pied' && this.ducks.some(other => other.kind === 'brown' && ['approach', 'eat'].includes(other.state))) {
        intent.noticeUntil = Math.min(intent.noticeUntil, this.time + BEHAVIOR.encouragementDelay);
      }
      if (this.time >= intent.noticeUntil && food.landed) {
        duck.state = 'approach';
        intent.approachTravel = 0;
        intent.approachPaused = false;
        intent.pauseUntil = 0;
      }
      return;
    }

    if (duck.state === 'approach' && food) {
      if (this.time < intent.pauseUntil) return;
      if (!intent.approachPaused && intent.approachTravel >= BEHAVIOR.approachPauseDistance) {
        intent.approachPaused = true;
        intent.pauseUntil = this.time + BEHAVIOR.approachPauseSeconds[duck.kind as 'buff' | 'brown' | 'pied'];
        return;
      }
      const before = { x: duck.x, z: duck.z };
      this.moveLand(duck, food, BEHAVIOR.approachSpeed * this.temperament(duck.kind), dt);
      intent.approachTravel += distance(before, duck);
      duck.look = 0;
      if (distance(duck, food) <= BEHAVIOR.foodReach) {
        duck.state = 'eat';
        intent.peckTimer = BEHAVIOR.peckSeconds;
      }
      return;
    }

    const candidate = this.nearestFood(duck);
    if (candidate) {
      intent.foodId = candidate.id;
      duck.state = 'notice';
      const base = BEHAVIOR.noticeDelay[duck.kind as 'buff' | 'brown' | 'pied'];
      const encouraged = duck.kind === 'pied' && this.ducks.some(other => other.kind === 'brown' && ['approach', 'eat'].includes(other.state));
      intent.noticeUntil = this.time + (encouraged ? base * 0.6 : base);
      this.face(duck, candidate);
      return;
    }

    duck.look = Math.sin(this.time * 1.8 + this.ducks.indexOf(duck)) * 0.16;
    duck.peck = 0;
    if (duck.state === 'rest') {
      intent.timer -= dt;
      if (intent.timer <= 0) duck.state = 'wander';
      return;
    }

    if (this.time >= intent.pondVisitAt) {
      duck.state = 'enter';
      intent.phase = 'shore';
      intent.queueAt = this.time;
      intent.crossTime = 0;
      intent.pondVisitAt = this.time + this.range(BEHAVIOR.pondVisitMin, BEHAVIOR.pondVisitMax);
      return;
    }

    if (intent.timer <= 0 || distance(duck, intent.target) < 0.2) {
      if (this.random() < BEHAVIOR.restChance) {
        duck.state = 'rest';
        intent.timer = this.range(BEHAVIOR.restMin, BEHAVIOR.restMax);
        return;
      }
      intent.target = this.wanderTarget(duck);
      intent.timer = this.range(BEHAVIOR.wanderMin, BEHAVIOR.wanderMax);
    }
    duck.state = 'wander';
    intent.timer -= dt;
    this.moveLand(duck, intent.target, BEHAVIOR.walkSpeed * this.temperament(duck.kind), dt);
  }

  private guard(duck: Duck, intent: Intent, dt: number): void {
    duck.state = 'guard';
    duck.peck = 0;
    duck.look = BEHAVIOR.guardScanRange * Math.sin(this.time * BEHAVIOR.guardScanRate);
    const females = this.ducks.filter(other => other.kind !== 'drake');
    const flock = {
      x: females.reduce((sum, other) => sum + other.x, 0) / females.length,
      z: females.reduce((sum, other) => sum + other.z, 0) / females.length,
    };
    const target = this.safeLand({ x: flock.x - 0.85, z: flock.z + 0.48 });
    const gap = distance(duck, target);
    if (gap > BEHAVIOR.guardFollowStart) intent.guardMoving = true;
    else if (gap < BEHAVIOR.guardFollowStop) intent.guardMoving = false;
    if (intent.guardMoving) this.moveLand(duck, target, BEHAVIOR.guardSpeed, dt);
    else if (intent.timer <= 0) {
      this.face(duck, { x: duck.x + Math.sin(this.time * 0.6), z: duck.z + Math.cos(this.time * 0.6) });
      intent.timer = BEHAVIOR.guardTurnSeconds;
    }
    intent.timer -= dt;
  }

  private enterPond(duck: Duck, intent: Intent, dt: number): void {
    duck.look = 0;
    if (intent.phase === 'shore') {
      if (!this.gateFree(duck)) {
        this.moveLand(duck, waitSlots[duck.kind as 'buff' | 'brown' | 'pied'], BEHAVIOR.walkSpeed * 0.8, dt);
        return;
      }
      this.moveLand(duck, shore, BEHAVIOR.walkSpeed * 0.8, dt);
      // The obstacle-avoidance margin can stop a duck just short of this point.
      if (distance(duck, shore) < 0.05 && duck.speed < .14) {
        intent.phase = 'cross';
        intent.crossTime = 0;
        intent.crossingFrom={x:duck.x,z:duck.z};intent.crossingY=duck.y;
      }
      return;
    }
    const t=this.crossPond(duck,intent,waterGate,POND.waterY,dt);
    intent.headingTarget = Math.PI / 2;
    if (t >= 1) {
      duck.state = 'swim';
      duck.y = POND.waterY;
      duck.waterEntries++;
      intent.swimUntil = this.time + this.range(BEHAVIOR.swimMin, BEHAVIOR.swimMax);
      intent.target = this.swimTarget();
    }
  }

  private swim(duck: Duck, intent: Intent, dt: number): void {
    const afloat=this.time-intent.landedAt;
    duck.y = POND.waterY + BEHAVIOR.swimBobHeight * Math.sin(afloat * BEHAVIOR.swimBobRate)*(1-Math.exp(-afloat*3))
      -.035*Math.sin(afloat*18)*Math.exp(-afloat*8);
    duck.look = BEHAVIOR.swimLookRange * Math.sin(this.time * BEHAVIOR.swimLookRate);
    const wantsExit=this.time>=intent.swimUntil;
    const nextToExit=this.ducks.find(other=>other.state==='swim'&&this.time>=this.intents.get(other.id)!.swimUntil);
    const gateTurn=wantsExit&&nextToExit?.id===duck.id&&!this.ducks.some(other=>other.state==='exit');
    if(wantsExit){
      const index=this.ducks.indexOf(duck)-1;
      // Wait deeper in the bath, leaving room for the first swimmer to reach the gate.
      intent.target=gateTurn?waterGate:{x:POND.x+.35,z:POND.z+(index-1)*.65};
    }
    if (distance(duck, intent.target) < 0.12) {
      if (wantsExit) {
        if (gateTurn&&this.gateFree(duck)) {
          duck.state = 'exit';
          intent.crossTime = 0;
          intent.crossingFrom={x:duck.x,z:duck.z};intent.crossingY=duck.y;
        }
      } else intent.target = this.swimTarget();
    } else this.move(duck, intent.target, BEHAVIOR.swimSpeed, dt);
  }

  private exitPond(duck: Duck, intent: Intent, dt: number): void {
    const t=this.crossPond(duck,intent,shore,0,dt);
    intent.headingTarget = -Math.PI / 2;
    if (t >= 1) {
      duck.y = 0;
      duck.state = 'wander';
      intent.queueAt = Infinity;
      intent.target=this.safeLand({x:shore.x-.9,z:shore.z+.8});
      intent.timer=3;
    }
  }

  /** Short crouch, takeoff impulse, then an un-eased ballistic flight under gravity. */
  private crossPond(duck:Duck,intent:Intent,to:Vec2,endY:number,dt:number):number{
    intent.moved=true;
    intent.crossingFrom??={x:duck.x,z:duck.z};intent.crossingY??=duck.y;
    intent.headingTarget=Math.atan2(to.x-intent.crossingFrom.x,to.z-intent.crossingFrom.z);
    const turn=Math.atan2(Math.sin(intent.headingTarget-duck.heading),Math.cos(intent.headingTarget-duck.heading));
    if(intent.crossTime<BEHAVIOR.hopPreparation&&(Math.abs(turn)>.2||Math.abs(duck.angularVelocity)>.8)){
      intent.crossTime=Math.min(intent.crossTime+dt,BEHAVIOR.hopPreparation-.00001);
      duck.crouch=Math.sin(intent.crossTime/BEHAVIOR.hopPreparation*Math.PI/2);
      duck.vx=0;duck.vz=0;duck.speed=0;duck.ax=0;duck.az=0;
      return 0;
    }
    intent.crossTime+=dt;
    if(intent.crossTime<BEHAVIOR.hopPreparation){
      duck.crouch=Math.sin(intent.crossTime/BEHAVIOR.hopPreparation*Math.PI/2);
      duck.vx=0;duck.vz=0;duck.speed=0;duck.ax=0;duck.az=0;
      return 0;
    }
    const hop=planHop(intent.crossingY,endY,POND.rimY+BEHAVIOR.rimClearance,duck.mass);
    const elapsed=Math.min(hop.duration,intent.crossTime-BEHAVIOR.hopPreparation);
    const t=elapsed/hop.duration;
    const from=intent.crossingFrom;
    const vx=(to.x-from.x)/hop.duration,vz=(to.z-from.z)/hop.duration;
    duck.ax=(vx-duck.vx)/dt;duck.az=(vz-duck.vz)/dt;
    duck.vx=vx;duck.vz=vz;duck.speed=Math.hypot(vx,vz);
    duck.crouch=0;duck.jumpProgress=t;
    duck.x=mix(from.x,to.x,t);duck.z=mix(from.z,to.z,t);
    duck.y=intent.crossingY+(hop.impulse/duck.mass)*elapsed-.5*HOP_GRAVITY*elapsed*elapsed;
    if(t>=1){duck.y=endY;duck.jumpProgress=-1;duck.landing=1;intent.landedAt=this.time}
    return t;
  }

  private gateFree(duck: Duck): boolean {
    return !this.ducks.some(other => {
      if (other.id === duck.id) return false;
      const otherIntent = this.intents.get(other.id)!;
      if (other.state === 'exit' || (other.state === 'enter' && otherIntent.phase === 'cross')) return true;
      if (duck.state === 'enter' && other.state === 'enter' && otherIntent.phase === 'shore') {
        const myQueue = this.intents.get(duck.id)!.queueAt;
        if (otherIntent.queueAt < myQueue || (otherIntent.queueAt === myQueue && this.ducks.indexOf(other) < this.ducks.indexOf(duck))) return true;
      }
      if (other.state !== 'swim' || distance(other, waterGate) >= BEHAVIOR.duckSpacing + 0.08) return false;
      return duck.state === 'enter' || this.ducks.indexOf(other) < this.ducks.indexOf(duck);
    });
  }

  private moveLand(duck: Duck, target: Vec2, speed: number, dt: number): void {
    const safeTarget = this.safeLand(target);
    const waypoint = this.landWaypoint(duck, safeTarget, this.intents.get(duck.id)!);
    this.move(duck, waypoint, speed, dt);
    this.constrainLandMotion(duck);
  }

  private constrainLandMotion(duck:Duck):void{
    const corrected=this.safeLand(duck);
    const dx=corrected.x-duck.x,dz=corrected.z-duck.z,length=Math.hypot(dx,dz);
    if(length>1e-9){
      const inward=(duck.vx*dx+duck.vz*dz)/length;
      if(inward<0){duck.vx-=inward*dx/length;duck.vz-=inward*dz/length}
    }
    duck.x=corrected.x;duck.z=corrected.z;duck.y=0;
    duck.speed=Math.hypot(duck.vx,duck.vz);
  }

  private brake(duck:Duck,intent:Intent,dt:number):void{
    drive(duck,0,0,dt);
    duck.x+=duck.vx*dt;duck.z+=duck.vz*dt;
    if(Math.hypot(duck.vx,duck.vz)<.0005){duck.vx=0;duck.vz=0}
    duck.speed=Math.hypot(duck.vx,duck.vz);
    if(duck.state!=='swim'&&duck.state!=='exit'&&!(duck.state==='enter'&&intent.phase==='cross'))this.constrainLandMotion(duck);
  }

  private move(duck: Duck, target: Vec2, speed: number, dt: number): void {
    const dx = target.x - duck.x;
    const dz = target.z - duck.z;
    const dist = Math.hypot(dx, dz);
    const intent=this.intents.get(duck.id)!;
    intent.moved=true;
    if(dist>.025)intent.headingTarget=Math.atan2(dx,dz);
    const angle=Math.atan2(Math.sin(intent.headingTarget-duck.heading),Math.cos(intent.headingTarget-duck.heading));
    const alignment=duck.state==='swim'?1:Math.max(.2,Math.cos(angle));
    const wantedSpeed=Math.min(speed*alignment,dist*DYNAMICS.arrivalGain);
    drive(duck,dist>1e-6?dx/dist*wantedSpeed:0,dist>1e-6?dz/dist*wantedSpeed:0,dt);
    duck.x+=duck.vx*dt;duck.z+=duck.vz*dt;
    duck.speed=Math.hypot(duck.vx,duck.vz);
  }

  private landWaypoint(from: Vec2, target: Vec2, intent: Intent): Vec2 {
    // Test against the actual permitted land boundary. A larger collision radius
    // made goals placed by safeLand unreachable and caused alternating detours.
    const radius = POND.radius + BEHAVIOR.pondLandMargin;
    const dx = target.x - from.x;
    const dz = target.z - from.z;
    const lengthSquared = dx * dx + dz * dz;
    if (lengthSquared < 0.000625) { intent.route = undefined; return target; }
    const t = clamp(((POND.x - from.x) * dx + (POND.z - from.z) * dz) / lengthSquared, 0, 1);
    // Moving away from the bath is safe even inside the larger steering margin.
    if (t <= 0.001) { intent.route = undefined; return target; }
    const near = { x: from.x + dx * t, z: from.z + dz * t };
    if (distance(near, POND) >= radius - 0.0001) { intent.route = undefined; return target; }
    if (!intent.route || distance(intent.route.target, target) > .3) {
      const cross = (from.x - POND.x) * dz - (from.z - POND.z) * dx;
      intent.route = { target: { ...target }, side: cross >= 0 ? 1 : -1 };
    }
    // Keep the chosen side while going around the bath, including on its centreline.
    const angle = Math.atan2(from.z - POND.z, from.x - POND.x) + intent.route.side * 0.30;
    const detourRadius = radius + .18;
    return this.safeLand({ x: POND.x + Math.cos(angle) * detourRadius, z: POND.z + Math.sin(angle) * detourRadius });
  }

  private safeLand(point: Vec2): Vec2 {
    let x = clamp(point.x, GARDEN.minX + BEHAVIOR.edgeMargin, GARDEN.maxX - BEHAVIOR.edgeMargin);
    let z = clamp(point.z, GARDEN.minZ + BEHAVIOR.edgeMargin, GARDEN.maxZ - BEHAVIOR.edgeMargin);
    const dx = x - POND.x;
    const dz = z - POND.z;
    const distanceFromPond = Math.hypot(dx, dz);
    const minDistance = POND.radius + BEHAVIOR.pondLandMargin;
    if (distanceFromPond < minDistance) {
      const scale = minDistance / (distanceFromPond || 1);
      x = POND.x + (distanceFromPond ? dx * scale : -minDistance);
      z = POND.z + dz * scale;
    }
    return { x, z };
  }

  private nearestFood(duck: Duck): Food | undefined {
    let bestFree: Food | undefined;
    let bestFreeDistance: number = BEHAVIOR.foodVision;
    let bestClaimed: Food | undefined;
    let bestClaimedDistance: number = BEHAVIOR.foodVision;
    const claimed = new Set(this.ducks.filter(other => other.id !== duck.id && ['notice', 'approach', 'eat'].includes(other.state)).map(other => this.intents.get(other.id)!.foodId));
    for (const food of this.foods) {
      if (food.eaten) continue;
      const dist = distance(duck, food);
      if (claimed.has(food.id)) {
        if (dist < bestClaimedDistance) {
          bestClaimed = food;
          bestClaimedDistance = dist;
        }
      } else if (dist < bestFreeDistance) {
        bestFree = food;
        bestFreeDistance = dist;
      }
    }
    return bestFree ?? bestClaimed;
  }

  private wanderTarget(duck: Duck): Vec2 {
    const friends = this.ducks.filter(other => other.id !== duck.id && other.kind !== 'drake');
    const center = {
      x: friends.reduce((sum, other) => sum + other.x, 0) / friends.length,
      z: friends.reduce((sum, other) => sum + other.z, 0) / friends.length,
    };
    const angle = this.random() * Math.PI * 2;
    const radius = 0.7 + this.random() * 2.8;
    return this.safeLand({ x: mix(duck.x, center.x, 0.5) + Math.cos(angle) * radius, z: mix(duck.z, center.z, 0.5) + Math.sin(angle) * radius });
  }

  private swimTarget(): Vec2 {
    const angle = this.random() * Math.PI * 2;
    const radius = Math.sqrt(this.random()) * (POND.radius - 0.52);
    return { x: POND.x + Math.cos(angle) * radius, z: POND.z + Math.sin(angle) * radius };
  }

  private temperament(kind: DuckKind): number {
    return kind === 'buff' ? 1.1 : kind === 'brown' ? 0.96 : 0.8;
  }

  private face(duck: Duck, target: Vec2): void {
    if (distance(duck, target) < .025) return;
    this.intents.get(duck.id)!.headingTarget = Math.atan2(target.x - duck.x, target.z - duck.z);
  }

  private range(min: number, max: number): number {
    return min + clamp(this.random(), 0, 1) * (max - min);
  }

  private separateDucks(): void {
    for (let pass = 0; pass < 12; pass++) {
      for (let i = 0; i < this.ducks.length; i++) {
        for (let j = i + 1; j < this.ducks.length; j++) {
          const a = this.ducks[i];
          const b = this.ducks[j];
          const aWater = ['enter', 'swim', 'exit'].includes(a.state);
          const bWater = ['enter', 'swim', 'exit'].includes(b.state);
          if (aWater !== bWater) continue;
          const dx = a.x - b.x;
          const dz = a.z - b.z;
          const dist = Math.hypot(dx, dz);
          if (dist >= BEHAVIOR.duckSpacing) continue;
          const nx = dist > 0.0001 ? dx / dist : (i % 2 ? 1 : -1);
          const nz = dist > 0.0001 ? dz / dist : 0;
          const shift = (BEHAVIOR.duckSpacing - dist) * 0.5;
          const aStill=a.state==='preen'||a.state==='sleep';
          const bStill=b.state==='preen'||b.state==='sleep';
          if(aStill&&bStill)continue;
          const aWeight=aStill?0:bStill?2:1,bWeight=bStill?0:aStill?2:1;
          a.x += nx * shift * aWeight;
          a.z += nz * shift * aWeight;
          b.x -= nx * shift * bWeight;
          b.z -= nz * shift * bWeight;
          if (!aWater) {
            Object.assign(a, this.safeLand(a));
            Object.assign(b, this.safeLand(b));
          }
        }
      }
      for (const duck of this.ducks) {
        if (duck.state !== 'swim') continue;
        const dx = duck.x - POND.x;
        const dz = duck.z - POND.z;
        const radius = Math.hypot(dx, dz);
        const limit = POND.radius - BEHAVIOR.waterEdgeMargin;
        if (radius > limit) {
          duck.x = POND.x + dx / radius * limit;
          duck.z = POND.z + dz / radius * limit;
        }
      }
    }
  }
}
