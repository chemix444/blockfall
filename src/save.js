import {BIOMES,ENEMIES,FORGE,UPGRADES,WEAPONS} from './data.js';

const KEY='blockfall_2_save';
const RUN_KEY='blockfall_2_run';
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

function validRun(run){
  const finite=Number.isFinite;
  const numbers=['wave','biomeIndex','waveTime','spawnClock','spawnsLeft','health',
    'level','xp','xpNext','score','kills','shards','combo','comboTime','elapsed',
    'invuln','dashLeft','pulseLeft','fireLeft','hazardLeft','selected'];
  const stats=['maxHealth','damage','fireRate','moveSpeed','dashCooldown','pulseCooldown',
    'pulseDamage','pulseRange','pickupRange','crit','extraShots','healOnKill','reduction'];
  if(run?.version!==1||!['campaign','endless'].includes(run.mode)||
     !['normal','hard'].includes(run.difficulty)||!['playing','paused','choice'].includes(run.phase)||
     typeof run.waveDone!=='boolean'||numbers.some(key=>!finite(run[key]))||
     run.wave<1||run.wave>100000||run.biomeIndex<0||run.biomeIndex>=BIOMES.length||
     run.selected<0||run.selected>2||run.spawnsLeft<0||
     !finite(run.player?.x)||!finite(run.player?.z)||
     Math.abs(run.player.x)>17||Math.abs(run.player.z)>17||
     stats.some(key=>!finite(run.stats?.[key]))||run.stats.maxHealth<=0||
     !Array.isArray(run.weapons)||!run.weapons.includes('blaster')||
     run.weapons.some(id=>!WEAPONS[id])||typeof run.upgrades!=='object'||!run.upgrades||
     Object.entries(run.upgrades).some(([id,level])=>{
       const upgrade=UPGRADES.find(entry=>entry.id===id);
       return !upgrade||!Number.isInteger(level)||level<0||level>upgrade.max;
     })||!Array.isArray(run.pending)||run.pending.some(reason=>!['level','wave'].includes(reason))||
     !Array.isArray(run.offered)||run.offered.some(id=>!UPGRADES.some(upgrade=>upgrade.id===id))||
     run.phase==='choice'&&(!run.offered.length||!['level','wave'].includes(run.choiceReason))||
     !Array.isArray(run.arenaBlocks)||run.arenaBlocks.length>8||
     !Array.isArray(run.enemies)||run.enemies.length>300||
     !Array.isArray(run.projectiles)||run.projectiles.length>600||
     !Array.isArray(run.pickups)||run.pickups.length>600)return false;
  if(run.arenaBlocks.some(block=>['x','z','width','depth','height'].some(key=>!finite(block?.[key]))||
    typeof block.rotated!=='boolean'||block.width<=0||block.depth<=0||block.height<=0))return false;
  if(run.enemies.some(enemy=>!ENEMIES[enemy?.type]||
    ['x','z','hp','maxHp','cooldown','contactLeft','telegraph','phase','flash'].some(key=>!finite(enemy[key]))||
    Math.abs(enemy.x)>17||Math.abs(enemy.z)>17||enemy.maxHp<=0))return false;
  if(run.projectiles.some(projectile=>!['player','enemy'].includes(projectile?.owner)||
    ['x','z','vx','vz','radius','damage','life','pierce','color'].some(key=>!finite(projectile[key]))||
    !Array.isArray(projectile.hit)||projectile.hit.some(index=>!Number.isInteger(index)||index<0||index>=run.enemies.length)))return false;
  return !run.pickups.some(pickup=>!['xp','heal'].includes(pickup?.kind)||
    ['x','z','value','age'].some(key=>!finite(pickup[key])));
}

export function readRun(){
  try{
    const raw=localStorage.getItem(RUN_KEY);
    if(!raw)return null;
    const run=JSON.parse(raw);
    return validRun(run)?run:null;
  }catch{return null}
}

export function writeRun(run){
  try{localStorage.setItem(RUN_KEY,JSON.stringify(run));return true}
  catch{return false}
}

export function clearRun(){
  try{localStorage.removeItem(RUN_KEY)}catch{}
}
