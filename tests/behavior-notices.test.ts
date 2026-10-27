import test from 'node:test';
import assert from 'node:assert/strict';
import { BehaviorNotices, DUCK_NAMES } from '../src/behavior-notices.ts';
import { DUCK_PROFILES } from '../src/duck-profiles.ts';

test('duck names match Anders, Andemette, Andedorte and Andja', () => {
  assert.equal(DUCK_NAMES.drake, 'Anders');
  assert.equal(DUCK_NAMES.buff, 'Andemette');
  assert.equal(DUCK_NAMES.brown, 'Andedorte');
  assert.equal(DUCK_NAMES.pied, 'Andja');
  assert.match(DUCK_PROFILES.drake.label, /^Anders\b/);
  assert.match(DUCK_PROFILES.buff.label, /^Andemette\b/);
  assert.match(DUCK_PROFILES.brown.label, /^Andedorte\b/);
  assert.match(DUCK_PROFILES.pied.label, /^Andja\b/);
});

test('behavior notices generate readable notifications with proper duck names', () => {
  const children: any[] = [];
  const container = {
    replaceChildren() { children.length = 0; },
    append(node: any) { children.push(node); },
  } as unknown as HTMLElement;

  const prevDoc = (globalThis as any).document;
  (globalThis as any).document = {
    createElement(tag: string) {
      return {
        tag,
        textContent: '',
        remove() {
          const idx = children.indexOf(this);
          if (idx >= 0) children.splice(idx, 1);
        },
      };
    },
  };

  try {
    const notices = new BehaviorNotices(container);
    // initial observation establishes baseline (no notice)
    notices.update([
      { id: 'd1', kind: 'drake', state: 'wander' },
      { id: 'd2', kind: 'buff', state: 'wander' },
    ], 1000, true);
    assert.equal(children.length, 0);

    // change state: Anders starts guarding
    notices.update([
      { id: 'd1', kind: 'drake', state: 'guard' },
      { id: 'd2', kind: 'buff', state: 'wander' },
    ], 20000, true);
    assert.equal(children.length, 1);
    assert.equal(children[0].textContent, 'Anders holder vagt.');

    // Andemette forages
    notices.update([
      { id: 'd1', kind: 'drake', state: 'guard' },
      { id: 'd2', kind: 'buff', state: 'forage' },
    ], 40000, true);
    assert.ok(children.some(c => c.textContent === 'Andemette søger føde i græsset.'));
  } finally {
    if (prevDoc) {
      (globalThis as any).document = prevDoc;
    } else {
      delete (globalThis as any).document;
    }
  }
});
