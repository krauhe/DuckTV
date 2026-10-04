import {getDaylight} from './daylight';
export interface Preferences {
 weather:'live'|'sun'|'cloud'|'rain';timeMode:'live'|'manual'|'cycle';
 minutes:number|null;quality:'auto'|'low'|'high';autoFollow:boolean;sound:boolean;
}
export const PREFERENCES_KEY='ducktv.preferences.v1';
export const DEFAULT_PREFERENCES:Preferences={weather:'live',timeMode:'live',minutes:null,quality:'auto',autoFollow:true,sound:false};
export function readPreferences(storage:Pick<Storage,'getItem'>):Preferences{
 const result={...DEFAULT_PREFERENCES};
 try{
  const value=JSON.parse(storage.getItem(PREFERENCES_KEY)??'null');
  if(!value||typeof value!=='object')return result;
  if(['live','sun','cloud','rain'].includes(value.weather))result.weather=value.weather;
  if(['live','manual','cycle'].includes(value.timeMode))result.timeMode=value.timeMode;
  if(['auto','low','high'].includes(value.quality))result.quality=value.quality;
  if(typeof value.minutes==='number'&&Number.isFinite(value.minutes)&&value.minutes>=0&&value.minutes<1440)result.minutes=value.minutes;
  if(typeof value.autoFollow==='boolean')result.autoFollow=value.autoFollow;
  if(typeof value.sound==='boolean')result.sound=value.sound;
 }catch{/* Unavailable storage or old/corrupt data must not prevent startup. */}
 return result;
}
export function writePreferences(storage:Pick<Storage,'setItem'>,value:Preferences){
 try{storage.setItem(PREFERENCES_KEY,JSON.stringify(value));}catch{/* Private/restricted browsers can still use the controls. */}
}

/** A first evening visit shows the ducks awake; explicit saved time choices win. */
export function initialPreferences(storage:Pick<Storage,'getItem'>|undefined,date:Date):Preferences{
 const preferences=storage?readPreferences(storage):{...DEFAULT_PREFERENCES};
 let savedTime=false;
 try{
  const saved=JSON.parse(storage?.getItem(PREFERENCES_KEY)??'null');
  savedTime=!!saved && (saved.timeMode==='live' ||
   (['manual','cycle'].includes(saved.timeMode)&&typeof saved.minutes==='number'&&Number.isFinite(saved.minutes)&&saved.minutes>=0&&saved.minutes<1440));
 }catch{/* Corrupt or blocked storage behaves like a first visit. */}
 if(!savedTime&&getDaylight(date).night){preferences.timeMode='manual';preferences.minutes=14*60;}
 return preferences;
}
