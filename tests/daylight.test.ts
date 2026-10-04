import test from 'node:test';
import assert from 'node:assert/strict';
import { getDaylight, formatTime } from '../src/daylight';

test('Gistrup has long summer days and short winter days', () => {
  const summer = getDaylight(new Date('2026-06-21T12:00:00Z'));
  const winter = getDaylight(new Date('2026-12-21T12:00:00Z'));
  assert.ok(summer.sunset - summer.sunrise > 17.5 * 60);
  assert.ok(winter.sunset - winter.sunrise < 7 * 60);
  assert.ok(summer.sunrise > 4 * 60 && summer.sunrise < 5 * 60);
  assert.ok(winter.sunrise > 8 * 60 && winter.sunrise < 9 * 60 + 15);
});

test('clock and calendar use Copenhagen including DST and local midnight', () => {
  assert.equal(getDaylight(new Date('2026-01-01T12:00:00Z')).minutes, 780);
  assert.equal(getDaylight(new Date('2026-07-01T12:00:00Z')).minutes, 840);
  const midnight = getDaylight(new Date('2026-07-01T22:00:00Z'));
  assert.equal(midnight.minutes, 0);
  assert.equal(midnight.dateLabel, '02.07.2026');
  assert.equal(midnight.light, 0);
  assert.equal(midnight.night, true);
  for (const day of ['2026-03-29', '2026-10-25']) {
    const early = getDaylight(new Date(`${day}T00:00:00Z`));
    const late = getDaylight(new Date(`${day}T12:00:00Z`));
    assert.equal(early.sunrise, late.sunrise);
    assert.equal(early.sunset, late.sunset);
  }
  assert.equal(getDaylight(new Date('2026-03-29T00:59:00Z')).minutes, 119);
  assert.equal(getDaylight(new Date('2026-03-29T01:00:00Z')).minutes, 180);
});

test('override retains local date and smoothly changes twilight and shelter timing', () => {
  const date = new Date('2026-07-01T22:00:00Z');
  const noon = getDaylight(date, 720);
  assert.equal(noon.minutes, 720);
  assert.equal(noon.dateLabel, '02.07.2026');
  assert.equal(noon.light, 1);
  assert.equal(noon.night, false);
  assert.equal(getDaylight(date, 0).minutes, 0);
  assert.equal(getDaylight(date, 1439).minutes, 1439);
  assert.equal(getDaylight(date, noon.sunrise - 30).light, 0);
  assert.equal(getDaylight(date, noon.sunrise).light, 0.5);
  assert.equal(getDaylight(date, noon.sunrise + 30).light, 1);
  assert.equal(getDaylight(date, noon.sunset).light, 0.5);
  assert.equal(getDaylight(date, noon.sunset + 30).light, 0);
  assert.equal(getDaylight(date, noon.sunset - 16).night, false);
  assert.equal(getDaylight(date, noon.sunset - 15).night, true);
});

test('all dates in a leap year produce finite, ordered solar times', () => {
  for (let day = 0; day < 366; day++) {
    const state = getDaylight(new Date(Date.UTC(2028, 0, 1 + day, 12)));
    for (const value of [state.minutes, state.sunrise, state.sunset, state.light])
      assert.ok(Number.isFinite(value));
    assert.ok(state.sunrise > 0 && state.sunrise < state.sunset && state.sunset < 1440);
    assert.ok(state.light >= 0 && state.light <= 1);
  }
});

test('clock formatting handles rounding and midnight', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(1439.9), '00:00');
  assert.equal(formatTime(-1), '23:59');
  assert.equal(formatTime(NaN), '--:--');
});
