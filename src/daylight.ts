/** Offline approximate solar times for Gistrup, Denmark (56.995° N, 9.995° E).
 * NOAA fractional-year equations, with the standard 90.833° sunrise zenith:
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 * These are visual scene timings, not an astronomical ephemeris.
 */
const timeZone = 'Europe/Copenhagen';
const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const radians = Math.PI / 180;
const latitude = 56.995 * radians;
const longitude = 9.995;

export interface Daylight {
  minutes: number;
  sunrise: number;
  sunset: number;
  light: number;
  night: boolean;
  dateLabel: string;
}

function localParts(date: Date) {
  return Object.fromEntries(clock.formatToParts(date)
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, Number(part.value)]));
}

let cached: { key: string; sunrise: number; sunset: number } | undefined;

function solarTimes(year: number, month: number, day: number) {
  const key = `${year}-${month}-${day}`;
  if (cached?.key === key) return cached;
  const midnight = Date.UTC(year, month - 1, day);
  const dayOfYear = (midnight - Date.UTC(year, 0, 1)) / 86400000 + 1;
  const daysInYear = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
  const gamma = 2 * Math.PI / daysInYear * (dayOfYear - 1);
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);
  const cosine = Math.cos(90.833 * radians) / (Math.cos(latitude) * Math.cos(declination))
    - Math.tan(latitude) * Math.tan(declination);
  const hourAngle = Math.acos(Math.max(-1, Math.min(1, cosine))) / radians;
  // Noon is after Copenhagen's DST switch, as are both solar events.
  // Derive that day's offset rather than reusing the queried instant's offset.
  const noon = localParts(new Date(midnight + 12 * 3600000));
  const offset = (noon.hour - 12) * 60 + noon.minute;
  const solarNoon = 720 - 4 * longitude - equation + offset;
  cached = { key, sunrise: solarNoon - 4 * hourAngle, sunset: solarNoon + 4 * hourAngle };
  return cached;
}

function smoothstep(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** Override changes the clock on date's Copenhagen calendar day, not its date. */
export function getDaylight(date: Date, minuteOverride?: number): Daylight {
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid daylight date');
  const local = localParts(date);
  const { sunrise, sunset } = solarTimes(local.year, local.month, local.day);
  const minutes = minuteOverride !== undefined && Number.isFinite(minuteOverride)
    ? Math.max(0, Math.min(1439, minuteOverride))
    : local.hour * 60 + local.minute + local.second / 60;
  const light = smoothstep((minutes - sunrise + 30) / 60)
    * (1 - smoothstep((minutes - sunset + 30) / 60));
  return {
    minutes, sunrise, sunset, light,
    night: minutes < sunrise || minutes >= sunset - 15,
    dateLabel: `${String(local.day).padStart(2, '0')}.${String(local.month).padStart(2, '0')}.${local.year}`,
  };
}

/** Round a minute value to the nearest minute and wrap it into a 24-hour clock. */
export function formatTime(minutes: number): string {
  if (!Number.isFinite(minutes)) return '--:--';
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}
