import test from 'node:test';
import assert from 'node:assert/strict';
import {readRun,writeRun,clearRun} from '../src/save.js';

const stored=new Map();
globalThis.localStorage={
  getItem:key=>stored.get(key)??null,
  setItem:(key,value)=>stored.set(key,value),
  removeItem:key=>stored.delete(key),
};

const run=()=>({
  version:1,mode:'campaign',difficulty:'normal',phase:'choice',choiceReason:'level',
  wave:3,biomeIndex:0,waveDone:false,waveTime:17,spawnClock:.25,spawnsLeft:5,
  arenaBlocks:[{x:-10,z:-7,width:2,depth:1.8,height:1.4,rotated:true}],
  player:{x:3,z:2},health:76,
  stats:{maxHealth:100,damage:1,fireRate:1.15,moveSpeed:7,dashCooldown:2.6,
    pulseCooldown:8,pulseDamage:36,pulseRange:4,pickupRange:2.2,crit:.05,
    extraShots:0,healOnKill:0,reduction:0},
  level:4,xp:5,xpNext:38,score:3456,kills:9,shards:17,combo:4,comboTime:2,
  elapsed:42,invuln:0,dashLeft:1,pulseLeft:2,fireLeft:.1,hazardLeft:0,selected:0,
  weapons:['blaster'],upgrades:{overclock:1},pending:[],offered:['shield'],
  enemies:[{type:'bruiser',x:-5,z:-5,hp:55,maxHp:92,cooldown:3.5,contactLeft:0,
    telegraph:0,phase:1,flash:0}],
  projectiles:[{owner:'enemy',x:-4,z:-5,vx:11,vz:0,radius:.18,damage:18,
    life:1.4,pierce:0,color:0xd1a3ff,hit:[0]}],
  pickups:[{kind:'heal',x:1,z:1,value:18,age:2}],
});

test('stores and clears a complete mid-wave choice',()=>{
  const checkpoint=run();
  assert.equal(writeRun(checkpoint),true);
  assert.deepEqual(readRun(),checkpoint);
  clearRun();
  assert.equal(readRun(),null);
});

test('rejects corrupted checkpoints and invalid obstacle geometry',()=>{
  stored.set('blockfall_2_run','{bad');
  assert.equal(readRun(),null);
  stored.set('blockfall_2_run',JSON.stringify({...run(),arenaBlocks:[{x:0}]}));
  assert.equal(readRun(),null);
});

test('rejects projectile hit references to absent enemies',()=>{
  const checkpoint=run();
  checkpoint.projectiles[0].hit=[42];
  stored.set('blockfall_2_run',JSON.stringify(checkpoint));
  assert.equal(readRun(),null);
});
