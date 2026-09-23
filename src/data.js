export const BIOMES = [
  {name:'THE LOWLANDS', sky:0x0b202b, floor:0x315c5c, accent:0x83f4db, fog:0x173a45, hazard:null},
  {name:'EMBER RIFT', sky:0x321b24, floor:0x664046, accent:0xffaa79, fog:0x472832, hazard:'fire'},
  {name:'FROSTLINE', sky:0x162c42, floor:0x3b6477, accent:0xa6dfff, fog:0x244458, hazard:'ice'},
  {name:'NULL GARDEN', sky:0x1c1b38, floor:0x47466d, accent:0xc1a5ff, fog:0x2d2b4d, hazard:'static'},
];

export const ENEMIES = {
  drifter:{name:'DRIFTER', hp:28, speed:3.1, damage:9, radius:.55, xp:3, score:100, color:0xfc8795},
  sprinter:{name:'SPRINTER', hp:17, speed:5.6, damage:7, radius:.38, xp:3, score:140, color:0xffcf7f},
  gunner:{name:'GUNNER', hp:35, speed:2.2, damage:10, radius:.58, xp:4, score:200, color:0xbf9cff},
  bruiser:{name:'BRUISER', hp:92, speed:1.7, damage:18, radius:.84, xp:7, score:300, color:0xff897a},
  warden:{name:'THE WARDEN', hp:650, speed:2.2, damage:21, radius:1.6, xp:35, score:3000, color:0xff6688},
};

export const WEAPONS = {
  blaster:{name:'BLASTER', cooldown:.19, damage:12, speed:23, radius:.13, range:27, color:0x9bffea},
  scatter:{name:'SCATTER', cooldown:.68, damage:8, speed:22, radius:.11, range:12, color:0xffc788},
  rail:{name:'RAIL', cooldown:1.1, damage:55, speed:50, radius:.2, range:36, color:0xb7a2ff},
};

export const UPGRADES = [
  {id:'scatter',icon:'◈',name:'SCATTER PROTOCOL',desc:'Unlock a close-range spread weapon. Press 2 to equip it.',kind:'WEAPON',max:1,available:g=>!g.weapons.has('scatter'),apply:g=>g.unlockWeapon('scatter')},
  {id:'rail',icon:'⌁',name:'RAIL PROTOCOL',desc:'Unlock a piercing precision weapon. Press 3 to equip it.',kind:'WEAPON',max:1,available:g=>!g.weapons.has('rail'),apply:g=>g.unlockWeapon('rail')},
  {id:'overclock',icon:'⟡',name:'OVERCLOCK',desc:'Fire 15% faster with every weapon.',kind:'OFFENSE',max:5,apply:g=>g.stats.fireRate*=1.15},
  {id:'amplifier',icon:'✳',name:'AMPLIFIER',desc:'Deal 20% more damage.',kind:'OFFENSE',max:5,apply:g=>g.stats.damage*=1.2},
  {id:'multi',icon:'✦',name:'SPLIT SHOT',desc:'Blaster fires one extra projectile at a slight angle.',kind:'OFFENSE',max:3,apply:g=>g.stats.extraShots++},
  {id:'critical',icon:'✧',name:'WEAK POINTS',desc:'Critical chance increases by 12%. Critical hits deal double damage.',kind:'OFFENSE',max:4,apply:g=>g.stats.crit+=.12},
  {id:'vampire',icon:'♥',name:'RECOVERY LOOP',desc:'Heal 2 health on each elimination.',kind:'SURVIVAL',max:5,apply:g=>g.stats.healOnKill+=2},
  {id:'armor',icon:'⬡',name:'REINFORCED CORE',desc:'Gain 25 maximum health and heal 25 immediately.',kind:'SURVIVAL',max:5,apply:g=>{g.stats.maxHealth+=25;g.health=Math.min(g.stats.maxHealth,g.health+25)}},
  {id:'evade',icon:'≫',name:'SLIPSTREAM',desc:'Move 12% faster and reduce dash cooldown by 12%.',kind:'MOBILITY',max:4,apply:g=>{g.stats.moveSpeed*=1.12;g.stats.dashCooldown*=.88}},
  {id:'pulse',icon:'◎',name:'RESONANCE',desc:'Pulse deals 35% more damage and reaches farther.',kind:'ABILITY',max:4,apply:g=>{g.stats.pulseDamage*=1.35;g.stats.pulseRange+=.5}},
  {id:'magnet',icon:'◇',name:'GRAVITY WELL',desc:'Pull XP and pickups from farther away.',kind:'UTILITY',max:3,apply:g=>g.stats.pickupRange+=1.5},
  {id:'shield',icon:'⬢',name:'KINETIC SHIELD',desc:'Reduce incoming damage by 10%.',kind:'SURVIVAL',max:4,apply:g=>g.stats.reduction=Math.min(.5,g.stats.reduction+.1)},
  {id:'charge',icon:'⟳',name:'CAPACITOR',desc:'Pulse recovers 18% faster.',kind:'ABILITY',max:4,apply:g=>g.stats.pulseCooldown*=.82},
];

export const FORGE = [
  {id:'vitality',name:'VITALITY',desc:'+10 starting health per level.',base:35,scale:1.7},
  {id:'power',name:'POWER',desc:'+6% starting damage per level.',base:45,scale:1.8},
  {id:'tempo',name:'TEMPO',desc:'+4% movement speed per level.',base:40,scale:1.75},
  {id:'reservoir',name:'RESERVOIR',desc:'+6% starting fire rate per level.',base:50,scale:1.8},
  {id:'reach',name:'PICKUP RANGE',desc:'+1.5 pickup range per level. Pull XP and healing in sooner.',base:30,scale:1.65},
];

export const forgeCost = (id,level) => {
  const upgrade=FORGE.find(entry=>entry.id===id);
  return Math.round(upgrade.base*upgrade.scale**level);
};
