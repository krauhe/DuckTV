import { Vector3 } from 'three';

const turn = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const smooth = (t: number) => t*t*t*(t*(t*6-15)+10);

/** Procedural stepping: planted feet hold a world position until the next swing. */
export class DuckGait {
  readonly feet = [-1, 1].map(side => ({
    side, position: new Vector3(), from: new Vector3(), target: new Vector3(),
    yaw: 0, fromYaw: 0, targetYaw: 0, progress: 1, duration: .2, height: .04, lift: 0,
  }));
  private previous = new Vector3();
  private velocity = new Vector3();
  private neutral = new Vector3();
  private initialized = false;
  private next = 0;

  update(dt: number, position: Vector3, heading: number, enabled: boolean): void {
    const relocated = this.initialized && position.distanceTo(this.previous) > .65;
    this.velocity.copy(position).sub(this.previous);
    this.velocity.y = 0;
    if (dt > 0) this.velocity.divideScalar(dt); else this.velocity.set(0,0,0);
    this.velocity.clampLength(0,2);
    const speed = this.velocity.length();
    const neutralFor = (side: number) => this.neutral.set(
      position.x + Math.cos(heading)*side*.0968 - Math.sin(heading)*.056,
      position.y + .0032,
      position.z - Math.sin(heading)*side*.0968 - Math.cos(heading)*.056,
    );
    if (!this.initialized || relocated || !enabled) {
      for (const foot of this.feet) {
        foot.position.copy(neutralFor(foot.side));
        foot.yaw = heading; foot.progress = 1; foot.lift = 0;
      }
      this.initialized = true;
      this.previous.copy(position);
      return;
    }
    let swinging = false;
    for (const foot of this.feet) {
      if (foot.progress >= 1) continue;
      foot.progress = Math.min(1, foot.progress + dt/foot.duration);
      const u = smooth(foot.progress);
      foot.position.lerpVectors(foot.from, foot.target, u);
      foot.lift = Math.sin(Math.PI*foot.progress)**2;
      foot.position.y += foot.lift*foot.height;
      foot.yaw = foot.fromYaw + turn(foot.targetYaw-foot.fromYaw)*u;
      swinging ||= foot.progress < 1;
    }
    if (!swinging) {
      // Alternate steps, including short repositioning steps during turns.
      for (const index of [this.next, 1-this.next]) {
        const foot = this.feet[index];
        const offset = foot.position.distanceTo(neutralFor(foot.side));
        if (offset < .035 + speed*.012 && Math.abs(turn(heading-foot.yaw)) < .3) continue;
        foot.from.copy(foot.position); foot.fromYaw = foot.yaw;
        foot.duration = Math.max(.10, .23-speed*.08);
        foot.height = .035+speed*.025;
        foot.target.copy(this.neutral).addScaledVector(this.velocity, foot.duration*.65);
        foot.target.y = position.y+.0032;
        foot.targetYaw = heading; foot.progress = 0;
        this.next = 1-index;
        break;
      }
    }
    this.previous.copy(position);
  }
}
