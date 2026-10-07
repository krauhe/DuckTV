export interface Weather {cloud:number;wind:number;rain:number;isDay:boolean}
const CACHE='ande-tv-weather-v2';
export function interpretWeather(c:Record<string,number>){
 if(![c.cloud_cover,c.wind_speed_10m,c.rain,c.showers,c.is_day,c.temperature_2m,c.weather_code].every(Number.isFinite))throw new Error('invalid weather');
 const wetCode=[51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(c.weather_code);
 // Model amounts can round to zero even when the condition code reports drizzle.
 const rain=Math.max(0,c.rain+c.showers,wetCode?.03:0);
 const cloud=Math.max(c.cloud_cover,c.weather_code===3?100:0);
 const description=rain>0?'regn':cloud>=85?'overskyet':cloud>=40?'delvist skyet':'mest klart';
 return {weather:{cloud,wind:Math.max(0,c.wind_speed_10m),rain,isDay:c.is_day===1},description};
}
export async function getGistrupWeather():Promise<{weather:Weather;label:string}> {
 const readCache=()=>{try{return JSON.parse(localStorage.getItem(CACHE)||'null')}catch{return null}};
 const cached=readCache();
 if(cached && Date.now()-cached.saved<5*60_000)return cached.value;
 const url='https://api.open-meteo.com/v1/forecast?latitude=56.995&longitude=9.995&current=temperature_2m,cloud_cover,wind_speed_10m,rain,showers,is_day,weather_code&wind_speed_unit=ms&timezone=Europe%2FCopenhagen';
 try {
  const response=await fetch(url,{signal:AbortSignal.timeout(7000)});if(!response.ok)throw new Error('weather');
  const {current:c}=await response.json();
  if(!c)throw new Error('invalid weather');
  const {weather,description}=interpretWeather(c);
  const stamp=typeof c.time==='string'?c.time.slice(11,16):'';
  const value={weather,label:`Gistrup · ${Math.round(c.temperature_2m)}° · ${description}${stamp?' · '+stamp:''}`};
  try{localStorage.setItem(CACHE,JSON.stringify({saved:Date.now(),value}))}catch{/* private browsing */}
  return value;
 }catch(error){if(cached && Date.now()-cached.saved<3*60*60_000)return {...cached.value,label:cached.value.label+' · gemt vejr'};throw error}
}
