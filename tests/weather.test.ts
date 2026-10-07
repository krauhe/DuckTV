import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretWeather} from '../src/weather';
const current={cloud_cover:100,wind_speed_10m:4.3,rain:0,showers:0,is_day:1,temperature_2m:13.7,weather_code:3};
test('overcast alone does not invent rain',()=>{
 const result=interpretWeather(current);assert.equal(result.weather.cloud,100);assert.equal(result.weather.rain,0);assert.equal(result.description,'overskyet');
});
test('drizzle code survives a rounded zero amount and small measured showers remain visible',()=>{
 assert.ok(interpretWeather({...current,weather_code:51}).weather.rain>0);
 assert.equal(interpretWeather({...current,showers:.01}).weather.rain,.01);
 assert.equal(interpretWeather({...current,weather_code:71}).weather.rain,0);
});
test('malformed weather cannot replace valid cached conditions',()=>{
 assert.throws(()=>interpretWeather({...current,cloud_cover:NaN}));
});
