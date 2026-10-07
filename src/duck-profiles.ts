import type { DuckKind } from './types';

/** Identities from _KRH3464–3467. Numeric behaviour values are tuning, not measurements. */
export const DUCK_PROFILES: Record<DuckKind, {
  label: string; sex: 'male'|'female'; walkScale: number; followDelay: number;
  followDistance: number; forageTempo: number; bodyWidth: number;
}> = {
  drake: {label:'Han · halsring',sex:'male',walkScale:1,followDelay:1.2,followDistance:1.05,forageTempo:1.12,bodyWidth:1.03},
  buff: {label:'Lys hun · lyse vingefelter',sex:'female',walkScale:1.1,followDelay:.85,followDistance:.85,forageTempo:.94,bodyWidth:1},
  brown: {label:'Mønstret hun · mørke fjercentre',sex:'female',walkScale:.96,followDelay:1.3,followDistance:.95,forageTempo:1.06,bodyWidth:.97},
  pied: {label:'Broget hun · hvid hals og varmt brystfelt',sex:'female',walkScale:.8,followDelay:1.65,followDistance:1,forageTempo:1,bodyWidth:1.01},
};
