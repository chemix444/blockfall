import {FORGE} from './data.js';

const KEY='blockfall_2_save';
const defaults=()=>({
  version:2, shards:0, records:{campaign:0,endless:0}, wins:0, runs:0, kills:0,
  forge:Object.fromEntries(FORGE.map(upgrade=>[upgrade.id,0])),
  settings:{volume:60,quality:'auto',colorMode:'none',reducedMotion:false,autoPick:false},
});
const number=(value,min,max,fallback)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;

export function validateSave(input){
  if(!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Invalid save');
  const save=defaults();
  save.shards=Math.floor(number(input.shards,0,1e9,0));
  save.wins=Math.floor(number(input.wins,0,1e7,0));
  save.runs=Math.floor(number(input.runs,0,1e7,0));
  save.kills=Math.floor(number(input.kills,0,1e9,0));
  for(const mode of ['campaign','endless']) save.records[mode]=Math.floor(number(input.records?.[mode],0,1e7,0));
  for(const upgrade of FORGE) save.forge[upgrade.id]=Math.floor(number(input.forge?.[upgrade.id],0,5,0));
  save.settings.volume=number(input.settings?.volume,0,100,60);
  if(['auto','high','low'].includes(input.settings?.quality)) save.settings.quality=input.settings.quality;
  if(['none','deuteranopia','protanopia','tritanopia'].includes(input.settings?.colorMode)) save.settings.colorMode=input.settings.colorMode;
  save.settings.reducedMotion=input.settings?.reducedMotion===true;
  save.settings.autoPick=input.settings?.autoPick===true;
  return save;
}

export function loadSave(){
  try{
    const raw=localStorage.getItem(KEY);
    return raw?validateSave(JSON.parse(raw)):defaults();
  }catch{
    return defaults();
  }
}

export function writeSave(save){
  try{localStorage.setItem(KEY,JSON.stringify(validateSave(save)));return true}
  catch{return false}
}

export function exportSave(save){
  const bytes=new TextEncoder().encode(JSON.stringify(validateSave(save)));
  return btoa(String.fromCharCode(...bytes));
}

export function importSave(code){
  const bytes=Uint8Array.from(atob(code.trim()),character=>character.charCodeAt(0));
  return validateSave(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
}
