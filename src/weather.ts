export interface Weather {cloud:number;wind:number;rain:number;isDay:boolean}
const CACHE='ande-tv-weather-v1';
export async function getGistrupWeather():Promise<{weather:Weather;label:string}> {
 const readCache=()=>{try{return JSON.parse(localStorage.getItem(CACHE)||'null')}catch{return null}};
 const cached=readCache();
 if(cached && Date.now()-cached.saved<15*60_000)return cached.value;
 const url='https://api.open-meteo.com/v1/forecast?latitude=56.995&longitude=9.995&current=temperature_2m,cloud_cover,wind_speed_10m,rain,showers,is_day&wind_speed_unit=ms&timezone=Europe%2FCopenhagen';
 try {
  const response=await fetch(url,{signal:AbortSignal.timeout(7000)});if(!response.ok)throw new Error('weather');
  const {current:c}=await response.json();
  if(!c || ![c.cloud_cover,c.wind_speed_10m,c.rain,c.showers,c.is_day,c.temperature_2m].every(Number.isFinite))throw new Error('invalid weather');
  const value={weather:{cloud:c.cloud_cover,wind:c.wind_speed_10m,rain:c.rain+c.showers,isDay:c.is_day===1},label:`Gistrup · ${Math.round(c.temperature_2m)}°`};
  try{localStorage.setItem(CACHE,JSON.stringify({saved:Date.now(),value}))}catch{/* private browsing */}
  return value;
 }catch(error){if(cached && Date.now()-cached.saved<3*60*60_000)return {...cached.value,label:cached.value.label+' · gemt vejr'};throw error}
}
