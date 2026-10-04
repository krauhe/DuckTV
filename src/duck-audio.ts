/** Short excerpts of the owner's recording; never play before an explicit click. */
export class DuckAudio {
 private audio: HTMLAudioElement | undefined;
 private enabled = false;
 private pending = false;
 private next = 0;
 private clip = -1;
 constructor(private readonly onError: () => void) {}

 get active() { return this.enabled; }

 toggle(now: number) {
  this.enabled = !this.enabled;
  if (this.enabled) this.play(now);
  else this.stop();
 }

 stop() {
  this.audio?.pause();
  if (this.audio) this.audio.currentTime = 0;
 }

 update(now: number, awake: boolean, distance: number) {
  if (!this.enabled || document.hidden) return;
  if (this.audio) this.audio.volume = Math.max(.06, Math.min(.38, .7 / Math.max(1, distance)));
  if (!awake) { this.stop(); this.next = now + 6; return; }
  if (!this.pending && now >= this.next && (!this.audio || this.audio.paused)) this.play(now);
 }

 private play(now: number) {
  this.stop();
  // No overlapping calls and no immediate repeat of the same recording.
  this.clip = (this.clip + 1 + Math.floor(Math.random() * 2)) % 3;
  this.audio = new Audio(new URL(`audio/duck-${this.clip + 1}.wav`, document.baseURI).href);
  this.audio.volume = .25;
  this.next = now + 12 + Math.random() * 16;
  this.pending = true;
  const playing = this.audio;
  void playing.play().then(() => {
   if (!this.enabled || document.hidden || playing !== this.audio) playing.pause();
  }).catch(() => {
   if (playing !== this.audio) return;
   this.enabled = false;
   this.onError();
  }).finally(() => { this.pending = false; });
 }
}
