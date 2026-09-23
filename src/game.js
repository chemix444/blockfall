import * as THREE from 'three';
import {BIOMES,ENEMIES,WEAPONS,UPGRADES} from './data.js';
import {Navigation,segmentDistanceSquared} from './navigation.js';

const TAU=Math.PI*2;
const ARENA=17;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const random=(min,max)=>min+Math.random()*(max-min);
const material=(color,emissive=0,metalness=.25)=>new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:emissive?.4:0,metalness,roughness:.45});

function mesh(geometry,color,emissive=0){
  const object=new THREE.Mesh(geometry,material(color,emissive));
  object.castShadow=true;object.receiveShadow=true;
  return object;
}
function discard(object){
  object.traverse(child=>{
    if(child.geometry){
      child.geometry.dispose();
      const materials=Array.isArray(child.material)?child.material:[child.material];
      for(const mat of materials)mat.dispose();
    }
  });
  object.removeFromParent();
}

export class Game{
  constructor(canvas,save,audio,events){
    this.save=save;this.audio=audio;this.events=events;
    this.mobile=matchMedia('(pointer: coarse)').matches;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:!this.mobile,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled=!this.mobile;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(53,1,.1,160);
    this.ambient=new THREE.HemisphereLight(0xa9e4e1,0x172031,2.1);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight(0xb6f9e9,2.4);this.sun.position.set(-8,20,12);this.sun.castShadow=!this.mobile;this.sun.shadow.mapSize.set(1024,1024);
    this.sun.shadow.camera.left=-24;this.sun.shadow.camera.right=24;this.sun.shadow.camera.top=24;this.sun.shadow.camera.bottom=-24;
    this.scene.add(this.sun);
    this.world=new THREE.Group();this.scene.add(this.world);
    this.actors=new THREE.Group();this.scene.add(this.actors);
    this.fx=new THREE.Group();this.scene.add(this.fx);
    this.keys=new Set();this.touchMove={x:0,y:0};
    this.gamepad={moveX:0,moveY:0,dash:false,pulse:false};
    this.player={x:0,z:0,rotation:0,mesh:null};
    this.aim={x:0,z:-1};this.target=null;
    this.cameraTarget=new THREE.Vector3(0,0,0);
    this.enemies=[];this.projectiles=[];this.pickups=[];this.particles=[];this.rings=[];
    this.obstacles=[];this.hazards=[];
    this.mode='campaign';this.difficulty='normal';this.phase='menu';
    this.time=0;this.elapsed=0;this.cameraShake=0;this.lastFrame=0;this.wave=0;
    this._createPlayer();
    this.targetMarker=new THREE.Mesh(new THREE.RingGeometry(.8,1,48),new THREE.MeshBasicMaterial({color:0xd8ff91,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));
    this.targetMarker.rotation.x=-Math.PI/2;this.targetMarker.visible=false;this.fx.add(this.targetMarker);
    this.buildArena(0);
    this.resize();
    addEventListener('resize',()=>this.resize());
    this.setQuality(save.settings.quality);
    requestAnimationFrame(time=>this.frame(time));
  }

  _createPlayer(){
    const group=new THREE.Group();
    const base=mesh(new THREE.CylinderGeometry(.48,.58,.28,8),0x1a3942);base.position.y=.28;group.add(base);
    const body=mesh(new THREE.CylinderGeometry(.34,.43,.85,6),0xc2f8ec,0x17493e);body.position.y=.82;group.add(body);
    const core=mesh(new THREE.OctahedronGeometry(.24),0x8bffe4,0x8bffe4);core.position.set(0,.93,-.36);group.add(core);
    const head=mesh(new THREE.BoxGeometry(.52,.32,.5),0x162b3e);head.position.y=1.43;group.add(head);
    const visor=mesh(new THREE.BoxGeometry(.38,.11,.04),0x8affdf,0x8affdf);visor.position.set(0,1.46,-.27);group.add(visor);
    const barrel=mesh(new THREE.CylinderGeometry(.09,.14,.9,8),0x86f4da,0x3f8e82);barrel.rotation.x=Math.PI/2;barrel.position.set(.38,1,-.48);group.add(barrel);
    const ring=mesh(new THREE.TorusGeometry(.58,.035,5,40),0x86f3da,0x388e85);ring.rotation.x=Math.PI/2;ring.position.y=.13;group.add(ring);
    group.userData={core,ring};this.actors.add(group);this.player.mesh=group;
  }

  resize(){
    const width=innerWidth,height=innerHeight;
    this.camera.aspect=width/height;this.camera.fov=height<500?62:53;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width,height,false);
    this.setQuality(this.save.settings.quality);
  }
  setQuality(quality){
    const low=quality==='low'||(quality==='auto'&&this.mobile);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,low?1.25:2));
    this.renderer.shadowMap.enabled=!low;
    this.sun.castShadow=!low;
    this.renderer.shadowMap.needsUpdate=true;
  }

  buildArena(index){
    this.biomeIndex=index%BIOMES.length;
    const biome=BIOMES[this.biomeIndex];
    while(this.world.children.length)discard(this.world.children[0]);
    this.obstacles=[];this.hazards=[];
    this.scene.background=new THREE.Color(biome.sky);
    this.scene.fog=new THREE.FogExp2(biome.fog,.023);
    this.ambient.color.setHex(biome.accent);
    const floor=mesh(new THREE.BoxGeometry(ARENA*2+.5,.6,ARENA*2+.5),biome.floor);floor.position.y=-.42;floor.receiveShadow=true;this.world.add(floor);
    const grid=new THREE.GridHelper(ARENA*2,34,biome.accent,0x6a93a0);
    grid.position.y=-.104;grid.material.transparent=true;grid.material.opacity=.16;this.world.add(grid);
    const perimeter=material(biome.accent,biome.accent);
    for(let i=0;i<4;i++){
      const wall=mesh(new THREE.BoxGeometry(i<2?ARENA*2+1:.55,.8,i<2?.55:ARENA*2+1),0x142b39);
      wall.position.set(i===2?-ARENA:i===3?ARENA:0,.25,i===0?-ARENA:i===1?ARENA:0);this.world.add(wall);
      const beam=new THREE.Mesh(new THREE.BoxGeometry(i<2?ARENA*2:.08,.055,i<2?.08:ARENA*2),perimeter.clone());
      beam.position.set(wall.position.x,.73,wall.position.z);this.world.add(beam);
    }
    for(let i=0;i<20;i++){
      const angle=i/20*TAU,radius=ARENA+2.4+random(0,5);
      const height=random(1,6);
      const tower=mesh(new THREE.BoxGeometry(random(.6,1.8),height,random(.6,1.8)),biome.floor);
      tower.position.set(Math.cos(angle)*radius,height/2-.2,Math.sin(angle)*radius);tower.rotation.y=random(0,TAU);this.world.add(tower);
      if(i%3===0){
        const light=mesh(new THREE.BoxGeometry(.6,.1,.6),biome.accent,biome.accent);
        light.position.set(tower.position.x,height-.3,tower.position.z);this.world.add(light);
      }
    }
    const positions=[[-10,-7],[10,-7],[-10,7],[10,7],[-5,-11],[5,11],[0,-10],[0,10]];
    for(const [x,z] of positions){
      if(Math.random()<.18)continue;
      const width=random(1.4,2.5),depth=random(1.2,2.3),height=random(.9,2.3);
      const block=mesh(new THREE.BoxGeometry(width,height,depth),0x294453);
      block.position.set(x,height/2,z);block.rotation.y=Math.random()<.5?0:Math.PI/2;this.world.add(block);
      const cap=mesh(new THREE.BoxGeometry(width+.08,.1,depth+.08),biome.accent,biome.accent);
      cap.position.set(x,height+.03,z);cap.rotation.y=block.rotation.y;this.world.add(cap);
      this.obstacles.push({x,z,r:Math.max(width,depth)*.53});
    }
    if(biome.hazard){
      for(let i=0;i<4;i++){
        const angle=i*TAU/4+Math.PI/4, x=Math.cos(angle)*9,z=Math.sin(angle)*9;
        const disk=new THREE.Mesh(new THREE.CylinderGeometry(2.15,2.15,.035,32),new THREE.MeshBasicMaterial({color:biome.accent,transparent:true,opacity:.22,depthWrite:false}));
        disk.position.set(x,-.07,z);this.world.add(disk);
        const outline=new THREE.Mesh(new THREE.RingGeometry(2.05,2.14,40),new THREE.MeshBasicMaterial({color:biome.accent,transparent:true,opacity:.75,side:THREE.DoubleSide}));
        outline.rotation.x=-Math.PI/2;outline.position.set(x,-.045,z);this.world.add(outline);
        this.hazards.push({x,z,r:2.05,kind:biome.hazard});
      }
    }
    this.navigation=new Navigation(this.obstacles,ARENA);
    this.events.biome?.(biome);
  }

  _clearDynamic(){
    this.target=null;this.targetMarker.visible=false;
    for(const collection of [this.enemies,this.projectiles,this.pickups,this.particles,this.rings]){
      for(const entry of collection)discard(entry.mesh);
      collection.length=0;
    }
  }

  startRun(mode,difficulty){
    this._clearDynamic();this.mode=mode;this.difficulty=difficulty;this.phase='playing';
    this.wave=0;this.level=1;this.xp=0;this.xpNext=10;this.score=0;this.kills=0;this.shards=0;
    this.combo=0;this.comboTime=0;this.elapsed=0;this.waveDone=false;this.pending=[];
    const forge=this.save.forge;
    this.stats={
      maxHealth:100+forge.vitality*10,damage:1+forge.power*.06,fireRate:1+forge.reservoir*.06,
      moveSpeed:7*(1+forge.tempo*.04),dashCooldown:2.6,pulseCooldown:8,pulseDamage:36,pulseRange:4,
      pickupRange:2.2+forge.reach*1.5,crit:.05,extraShots:0,healOnKill:0,reduction:0,
    };
    this.health=this.stats.maxHealth;this.invuln=0;this.dashTime=0;this.dashLeft=0;this.pulseLeft=0;
    this.fireLeft=0;this.hazardLeft=0;this.hurtSoundLeft=0;this.selected=0;
    this.weapons=new Set(['blaster']);this.upgrades={};this.offered=[];
    this.player.x=0;this.player.z=2;this.player.mesh.position.set(0,0,2);
    this.player.mesh.visible=true;
    this.cameraTarget.set(0,0,2);
    this.buildArena(0);this.startWave();
  }

  startWave(){
    this.wave++;
    const index=Math.floor((this.wave-1)/3)%BIOMES.length;
    if(index!==this.biomeIndex)this.buildArena(index);
    this.waveDone=false;this.spawnClock=1;this.waveTime=0;
    const boss=this.wave%5===0;
    this.spawnsLeft=Math.ceil((4+this.wave*2.1)*(this.difficulty==='hard'?1.3:1));
    if(boss){this.spawnsLeft=Math.ceil(this.spawnsLeft*.42);this.spawnEnemy('warden')}
    this.audio.biome=this.biomeIndex;this.audio.playing=true;
    this.audio.effect(boss?'boss':'wave');
    this.events.wave?.(this.wave,BIOMES[this.biomeIndex],boss);
  }

  pickEnemy(){
    const weights=[['drifter',5],['sprinter',this.wave>=2?2.4:0],['gunner',this.wave>=3?2:0],['bruiser',this.wave>=4?1.2:0]];
    let roll=Math.random()*weights.reduce((sum,entry)=>sum+entry[1],0);
    for(const [id,weight] of weights){roll-=weight;if(roll<=0)return id}
    return 'drifter';
  }

  spawnEnemy(type){
    const definition=ENEMIES[type],isBoss=type==='warden';
    let x=0,z=0;
    for(let attempts=0;attempts<25;attempts++){
      const angle=random(0,TAU),radius=random(10,14.3);
      x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;
      if(this.obstacles.every(obstacle=>Math.hypot(x-obstacle.x,z-obstacle.z)>obstacle.r+definition.radius+.25)&&distance({x,z},this.player)>8)break;
    }
    const scale=definition.radius;
    const group=new THREE.Group();
    const shell=mesh(isBoss?new THREE.DodecahedronGeometry(scale,0):new THREE.OctahedronGeometry(scale,0),definition.color,definition.color);
    shell.position.y=scale+.45;group.add(shell);
    const eye=mesh(new THREE.BoxGeometry(scale*.65,scale*.19,.08),0xffffff,0xffffff);
    eye.position.set(0,scale+.53,-scale*.82);group.add(eye);
    if(isBoss){
      const crown=mesh(new THREE.TorusGeometry(scale*1.18,.07,5,40),0xff7eaa,0xff7eaa);
      crown.rotation.x=Math.PI/2;crown.position.y=scale+.55;group.add(crown);
      const horn=mesh(new THREE.ConeGeometry(.35,.85,5),0xffb6ce,0xffb6ce);
      horn.position.y=scale*2+.35;group.add(horn);
    }else if(type==='gunner'){
      const antenna=mesh(new THREE.CylinderGeometry(.09,.09,.8,5),0xded1ff);
      antenna.position.y=scale*2+.4;group.add(antenna);
    }else if(type==='bruiser'){
      const ring=mesh(new THREE.TorusGeometry(scale*1.1,.08,4,8),0xffa37d,0xffa37d);
      ring.rotation.x=Math.PI/2;ring.position.y=scale+.3;group.add(ring);
    }
    const healthBar=new THREE.Group();
    const back=new THREE.Mesh(new THREE.PlaneGeometry(scale*2.1,.14),new THREE.MeshBasicMaterial({color:0x111e2d,side:THREE.DoubleSide}));
    const fill=new THREE.Mesh(new THREE.PlaneGeometry(scale*2.04,.1),new THREE.MeshBasicMaterial({color:definition.color,side:THREE.DoubleSide}));
    fill.position.z=.012;healthBar.add(back,fill);healthBar.position.y=scale*2+1.15;group.add(healthBar);
    group.position.set(x,0,z);this.actors.add(group);
    const factor=(this.difficulty==='hard'?1.35:1)*(1+(this.wave-1)*.18);
    const enemy={type,x,z,mesh:group,shell,fill,healthBar,radius:scale,hp:definition.hp*factor,maxHp:definition.hp*factor,
      cooldown:random(.4,1.4),contactLeft:0,telegraph:0,phase:random(0,TAU),flash:0};
    this.enemies.push(enemy);
    return enemy;
  }

  unlockWeapon(id){
    this.weapons.add(id);this.selected=id==='scatter'?1:2;
    this.events.toast?.(WEAPONS[id].name+' ONLINE');
  }

  selectWeapon(slot){
    const id=['blaster','scatter','rail'][slot];
    if(this.weapons.has(id)&&this.selected!==slot){this.selected=slot;this.audio.effect('choice')}
  }

  _movement(){
    let x=0,z=0;
    if(this.keys.has('KeyW')||this.keys.has('ArrowUp'))z--;
    if(this.keys.has('KeyS')||this.keys.has('ArrowDown'))z++;
    if(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))x--;
    if(this.keys.has('KeyD')||this.keys.has('ArrowRight'))x++;
    if(Math.abs(this.touchMove.x)+Math.abs(this.touchMove.y)>.12){x=this.touchMove.x;z=this.touchMove.y}
    if(Math.abs(this.gamepad.moveX)+Math.abs(this.gamepad.moveY)>.24){x=this.gamepad.moveX;z=this.gamepad.moveY}
    const length=Math.hypot(x,z);
    return length>1?{x:x/length,z:z/length}:{x,z};
  }

  _aim(){
    let nearest=null,nearestDistance=Infinity;
    for(const enemy of this.enemies){
      const d=distance(enemy,this.player);
      if(d<nearestDistance){nearest=enemy;nearestDistance=d}
    }
    this.target=nearest;
    this.targetMarker.visible=!!nearest;
    if(!nearest)return;
    const dx=nearest.x-this.player.x,dz=nearest.z-this.player.z;
    this.aim={x:dx/(nearestDistance||1),z:dz/(nearestDistance||1)};
    this.player.mesh.rotation.y=Math.atan2(-this.aim.x,-this.aim.z);
    this.targetMarker.position.set(nearest.x,.055,nearest.z);
    this.targetMarker.scale.setScalar((nearest.radius+.48)*(1+Math.sin(this.time*8)*.06));
    this.targetMarker.material.opacity=.6+Math.sin(this.time*8)*.2;
  }

  _move(dt){
    const move=this._movement(),player=this.player;
    if(this.dashTime>0)this.dashTime=Math.max(0,this.dashTime-dt);
    const speed=this.stats.moveSpeed*(this.dashTime>0?3.6:1)*(BIOMES[this.biomeIndex].hazard==='ice'?.94:1);
    if(this.dashTime>0){this._position(player.x+this.dashDirection.x*speed*dt,player.z+this.dashDirection.z*speed*dt,.44)}
    else this._position(player.x+move.x*speed*dt,player.z+move.z*speed*dt,.44);
    this.player.mesh.position.set(player.x,Math.sin(this.time*11)*(this.dashTime>0?.08:.035),player.z);
    this.player.mesh.userData.core.rotation.y+=dt*2.3;
    this.player.mesh.userData.ring.rotation.z+=dt*.7;
    if(this.dashTime>0&&Math.random()<.65)this.particle(player.x,.4,player.z,0x85ffe2,1.1);
  }

  _position(x,z,r){
    const player=this.player;
    x=clamp(x,-ARENA+r,ARENA-r);z=clamp(z,-ARENA+r,ARENA-r);
    for(const obstacle of this.obstacles){
      const dx=x-obstacle.x,dz=z-obstacle.z,len=Math.hypot(dx,dz)||.001,min=obstacle.r+r;
      if(len<min){x=obstacle.x+dx/len*min;z=obstacle.z+dz/len*min}
    }
    player.x=clamp(x,-ARENA+r,ARENA-r);player.z=clamp(z,-ARENA+r,ARENA-r);
  }

  dash(){
    if(this.phase!=='playing'||this.dashLeft>0)return;
    const move=this._movement(),length=Math.hypot(move.x,move.z);
    this.dashDirection=length>.1?{x:move.x/length,z:move.z/length}:{...this.aim};
    this.dashTime=.16;this.invuln=Math.max(this.invuln,.22);this.dashLeft=this.stats.dashCooldown;
    this.audio.effect('dash');this.ring(this.player.x,this.player.z,0x8ffff0,1.5,.27);
  }

  pulse(){
    if(this.phase!=='playing'||this.pulseLeft>0)return;
    this.pulseLeft=this.stats.pulseCooldown;this.audio.effect('pulse');
    this.ring(this.player.x,this.player.z,0x8fffe5,this.stats.pulseRange,.45);
    this.cameraShake=this.save.settings.reducedMotion?0:.13;
    for(const enemy of [...this.enemies]){
      const d=distance(enemy,this.player);
      if(d<this.stats.pulseRange+enemy.radius){
        this._advanceEnemy(enemy,(enemy.x-this.player.x)/(d||1),(enemy.z-this.player.z)/(d||1),1.5);
        this.damageEnemy(enemy,this.stats.pulseDamage*this.stats.damage);
      }
    }
    for(const projectile of [...this.projectiles])if(projectile.owner==='enemy'&&distance(projectile,this.player)<this.stats.pulseRange)this.removeProjectile(projectile);
  }

  _fire(dt){
    this.fireLeft=Math.max(0,this.fireLeft-dt);
    if(!this.target||this.fireLeft>0)return;
    const id=['blaster','scatter','rail'][this.selected],weapon=WEAPONS[id];
    this.fireLeft=weapon.cooldown/this.stats.fireRate;
    const angle=Math.atan2(this.aim.z,this.aim.x);
    if(id==='scatter'){
      for(let i=0;i<7;i++)this.spawnProjectile('player',angle+(i-3)*.11+random(-.025,.025),weapon,weapon.damage*this.stats.damage,0);
    }else if(id==='blaster'){
      const total=1+this.stats.extraShots;
      for(let i=0;i<total;i++)this.spawnProjectile('player',angle+(i-(total-1)/2)*.14,weapon,weapon.damage*this.stats.damage,0);
    }else this.spawnProjectile('player',angle,weapon,weapon.damage*this.stats.damage,5);
    this.audio.effect(id==='blaster'?'shoot':id);
    this.cameraShake=this.save.settings.reducedMotion?0:id==='rail'?.14:.035;
    this.particle(this.player.x+this.aim.x*.75,1,this.player.z+this.aim.z*.75,weapon.color,.5);
  }

  spawnProjectile(owner,angle,weapon,damage,pierce=0,origin){
    const player=owner==='player',source=origin||this.player;
    const radius=weapon.radius;
    const projectileMesh=mesh(new THREE.SphereGeometry(radius,8,6),weapon.color,weapon.color);
    const x=source.x+Math.cos(angle)*(player?.4:source.radius+.3);
    const z=source.z+Math.sin(angle)*(player?.4:source.radius+.3);
    projectileMesh.position.set(x,player?1:.7,z);this.actors.add(projectileMesh);
    const projectile={owner,x,z,mesh:projectileMesh,vx:Math.cos(angle)*weapon.speed,vz:Math.sin(angle)*weapon.speed,
      radius,damage,life:weapon.range/weapon.speed,pierce,hit:new Set()};
    this.projectiles.push(projectile);
    return projectile;
  }

  removeProjectile(projectile){
    const index=this.projectiles.indexOf(projectile);
    if(index>=0){this.projectiles.splice(index,1);discard(projectile.mesh)}
  }

  damageEnemy(enemy,amount){
    if(!this.enemies.includes(enemy))return;
    const critical=Math.random()<this.stats.crit;
    const damage=amount*(critical?2:1);
    enemy.hp-=damage;enemy.flash=.1;
    enemy.fill.scale.x=clamp(enemy.hp/enemy.maxHp,0,1);
    enemy.fill.position.x=-(1-enemy.fill.scale.x)*enemy.radius;
    this.particle(enemy.x,enemy.radius+.6,enemy.z,critical?0xffdf84:0xff8597,1.1);
    if(critical){
      this.ring(enemy.x,enemy.z,0xffd779,enemy.radius+1,.24);
      this.events.pop?.(enemy.x,enemy.z,Math.ceil(damage)+' CRIT','crit');
      this.audio.effect('crit');
    }else if(Math.random()<.35)this.events.pop?.(enemy.x,enemy.z,Math.ceil(damage),'damage');
    if(enemy.hp<=0)this.killEnemy(enemy);
    else if(Math.random()<.25)this.audio.effect('hit');
  }

  killEnemy(enemy){
    const index=this.enemies.indexOf(enemy);
    if(index<0)return;
    this.enemies.splice(index,1);
    const definition=ENEMIES[enemy.type];
    this.kills++;this.combo++;this.comboTime=4;
    this.score+=Math.round(definition.score*Math.min(5,1+Math.floor(this.combo/8)*.25));
    this.shards+=enemy.type==='warden'?25:enemy.type==='bruiser'?3:1;
    this.health=Math.min(this.stats.maxHealth,this.health+this.stats.healOnKill);
    this.audio.effect('kill',this.combo);
    this.events.pop?.(enemy.x,enemy.z,'+'+(enemy.type==='warden'?25:enemy.type==='bruiser'?3:1)+' ◆','shard');
    if(this.combo===5||this.combo===10||this.combo>=20&&this.combo%10===0){
      this.events.streak?.(this.combo);
      this.audio.effect('streak');
      this.cameraShake=this.save.settings.reducedMotion?0:.12;
    }
    this.ring(enemy.x,enemy.z,definition.color,enemy.type==='warden'?4:1.2,.3);
    for(let i=0;i<(enemy.type==='warden'?24:7);i++)this.particle(enemy.x,enemy.radius+.5,enemy.z,definition.color,random(1,2));
    this.spawnPickup('xp',enemy.x,enemy.z,definition.xp);
    if(Math.random()<(enemy.type==='warden'?.75:.07))this.spawnPickup('heal',enemy.x+random(-.7,.7),enemy.z+random(-.7,.7),18);
    discard(enemy.mesh);
    if(enemy.type==='warden'){
      this.events.toast?.('WARDEN ELIMINATED · +25 ◆');
      this.events.impact?.();
    }
  }

  hurt(amount){
    if(this.invuln>0||this.phase!=='playing')return;
    this.health=Math.max(0,this.health-Math.ceil(amount*(1-this.stats.reduction)));
    this.invuln=.58;this.cameraShake=this.save.settings.reducedMotion?0:.3;
    this.audio.effect('hurt');this.events.hurt?.(this.health/this.stats.maxHealth);
    if(this.health<=0)this.finish('defeat');
  }

  spawnPickup(kind,x,z,value){
    const color=kind==='xp'?0xad9eff:0x81f3bc;
    const object=mesh(kind==='xp'?new THREE.OctahedronGeometry(.2):new THREE.IcosahedronGeometry(.28,0),color,color);
    object.position.set(x,.55,z);this.actors.add(object);
    this.pickups.push({kind,value,x,z,mesh:object,age:random(0,TAU)});
  }

  _collectPickup(pickup,quiet=false){
    const index=this.pickups.indexOf(pickup);
    if(index<0)return;
    this.pickups.splice(index,1);discard(pickup.mesh);
    if(pickup.kind==='xp'){
      this.xp+=pickup.value;
      if(!quiet&&pickup.value>=7)this.events.pop?.(this.player.x,this.player.z,'+'+pickup.value+' XP','xp');
      while(this.xp>=this.xpNext){
        this.xp-=this.xpNext;this.level++;this.xpNext=Math.round(10+this.level*7);
        this.pending.push('level');this.audio.effect('level');
        this.events.impact?.();
      }
    }else{
      const healed=Math.min(this.stats.maxHealth-this.health,pickup.value);
      this.health+=healed;
      if(healed>0&&!quiet)this.events.pop?.(this.player.x,this.player.z,'+'+Math.ceil(healed)+' HP','heal');
    }
    if(!quiet)this.audio.effect('pickup');
  }

  _updatePickups(dt){
    for(const pickup of [...this.pickups]){
      pickup.age+=dt*3;pickup.mesh.rotation.y+=dt*2;
      pickup.mesh.position.set(pickup.x,.55+Math.sin(pickup.age)*.15,pickup.z);
      const d=distance(pickup,this.player);
      if(d<this.stats.pickupRange&&d>.65){
        const speed=Math.min(16,5+8/(d+.3));
        pickup.x+=(this.player.x-pickup.x)/d*speed*dt;
        pickup.z+=(this.player.z-pickup.z)/d*speed*dt;
      }
      if(d<.75){
        this._collectPickup(pickup);
      }
    }
  }

  _updateProjectiles(dt){
    for(const projectile of [...this.projectiles]){
      const oldX=projectile.x,oldZ=projectile.z;
      projectile.x+=projectile.vx*dt;projectile.z+=projectile.vz*dt;projectile.life-=dt;
      projectile.mesh.position.x=projectile.x;projectile.mesh.position.z=projectile.z;
      if(projectile.life<=0||Math.abs(projectile.x)>ARENA||Math.abs(projectile.z)>ARENA||
         this.obstacles.some(obstacle=>segmentDistanceSquared(obstacle,oldX,oldZ,projectile.x,projectile.z)<(obstacle.r+projectile.radius)**2)){
        this.removeProjectile(projectile);continue;
      }
      if(projectile.owner==='player'){
        for(const enemy of [...this.enemies]){
          if(projectile.hit.has(enemy)||segmentDistanceSquared(enemy,oldX,oldZ,projectile.x,projectile.z)>(projectile.radius+enemy.radius)**2)continue;
          projectile.hit.add(enemy);this.damageEnemy(enemy,projectile.damage);
          if(projectile.pierce--<=0){this.removeProjectile(projectile);break}
        }
      }else if(segmentDistanceSquared(this.player,oldX,oldZ,projectile.x,projectile.z)<(projectile.radius+.45)**2){
        this.removeProjectile(projectile);this.hurt(projectile.damage);
      }
      if(projectile.owner==='player'&&Math.random()<.55)this.particle(projectile.x,.8,projectile.z,projectile.mesh.material.color.getHex(),.45);
    }
  }

  _advanceEnemy(enemy,x,z,amount){
    const length=Math.hypot(x,z);
    if(!length||amount<=0)return;
    const steps=Math.ceil(amount/.3),step=amount/steps,radius=enemy.radius+.02;
    for(let i=0;i<steps;i++){
      const nx=clamp(enemy.x+x/length*step,-ARENA+radius,ARENA-radius);
      const nz=clamp(enemy.z+z/length*step,-ARENA+radius,ARENA-radius);
      if(this.navigation.clear(enemy.x,enemy.z,nx,nz,radius)){
        enemy.x=nx;enemy.z=nz;
      }else if(this.navigation.clear(enemy.x,enemy.z,nx,enemy.z,radius))enemy.x=nx;
      else if(this.navigation.clear(enemy.x,enemy.z,enemy.x,nz,radius))enemy.z=nz;
    }
  }

  _updateEnemies(dt){
    for(const enemy of [...this.enemies]){
      enemy.cooldown-=dt;enemy.contactLeft=Math.max(0,enemy.contactLeft-dt);
      enemy.flash=Math.max(0,enemy.flash-dt);
      enemy.shell.material.emissiveIntensity=enemy.flash>0?1.5:.4;
      enemy.shell.scale.setScalar(enemy.flash>0?1.13:1);
      enemy.phase+=dt*2;
      const dx=this.player.x-enemy.x,dz=this.player.z-enemy.z,d=Math.hypot(dx,dz)||.001;
      enemy.mesh.rotation.y=Math.atan2(-dx,-dz);
      enemy.healthBar.quaternion.copy(this.camera.quaternion);
      enemy.mesh.position.y=Math.sin(enemy.phase)*.055;
      if(enemy.telegraph>0){
        enemy.telegraph-=dt;
        if(enemy.telegraph<=0){
          if(enemy.type==='bruiser'){
            const route=this.navigation.direction(enemy,this.player);
            this._advanceEnemy(enemy,route?.x??dx/d,route?.z??dz/d,Math.min(3,Math.max(0,d-1)));
            this.ring(enemy.x,enemy.z,0xff9477,2.2,.2);
            if(distance(enemy,this.player)<2.1)this.hurt(ENEMIES.bruiser.damage*(this.difficulty==='hard'?1.4:1));
          }else this.enemyVolley(enemy);
        }
      }else{
        let speed=ENEMIES[enemy.type].speed*(1+(this.wave-1)*.025);
        let direction=1;
        if(enemy.type==='gunner'&&d<8)direction=-.65;
        if(enemy.type==='warden'&&d<5)direction=-.25;
        if(d>enemy.radius+.65){
          const route=this.navigation.direction(enemy,this.player);
          const strafe=!route&&(enemy.type==='gunner'||enemy.type==='warden')?Math.sin(enemy.phase*.65)*.42:0;
          const dir=route?1:direction;
          const vx=(route?.x??dx/d)*dir-(route?.z??dz/d)*strafe;
          const vz=(route?.z??dz/d)*dir+(route?.x??dx/d)*strafe;
          this._advanceEnemy(enemy,vx,vz,speed*dt);
        }
        if(enemy.cooldown<=0){
          if(enemy.type==='gunner'||enemy.type==='warden'||enemy.type==='bruiser'){
            enemy.telegraph=enemy.type==='warden'?.65:.55;
            enemy.cooldown=enemy.type==='warden'?2.5:enemy.type==='gunner'?2.1:3.1;
            this.ring(enemy.x,enemy.z,enemy.type==='warden'?0xff6486:0xffb284,enemy.radius+1,.5);
          }
        }
      }
      enemy.mesh.position.x=enemy.x;enemy.mesh.position.z=enemy.z;
      if(d<enemy.radius+.45&&enemy.contactLeft<=0){
        enemy.contactLeft=.75;this.hurt(ENEMIES[enemy.type].damage*(this.difficulty==='hard'?1.4:1));
      }
    }
  }

  enemyVolley(enemy){
    const angle=Math.atan2(this.player.z-enemy.z,this.player.x-enemy.x);
    const bullet={speed:enemy.type==='warden'?9:11,range:27,radius:.18,damage:ENEMIES[enemy.type].damage*(this.difficulty==='hard'?1.4:1),color:enemy.type==='warden'?0xff6992:0xd1a3ff};
    if(enemy.type==='warden'){
      for(let i=0;i<10;i++)this.spawnProjectile('enemy',i*TAU/10+this.time*.4,bullet,bullet.damage,0,enemy);
      for(let i=-1;i<=1;i++)this.spawnProjectile('enemy',angle+i*.21,bullet,bullet.damage,0,enemy);
      this.audio.effect('boss');
    }else if(enemy.type==='gunner'){
      this.spawnProjectile('enemy',angle,bullet,bullet.damage,0,enemy);
      this.audio.effect('shoot');
    }
  }

  _updateHazards(dt){
    this.hazardLeft=Math.max(0,this.hazardLeft-dt);
    if(this.hazardLeft>0)return;
    const biome=BIOMES[this.biomeIndex];
    if(biome.hazard==='ice')return;
    for(const hazard of this.hazards){
      if(distance(hazard,this.player)<hazard.r){
        this.hazardLeft=1.1;
        this.hurt(biome.hazard==='fire'?7:5);
        this.ring(hazard.x,hazard.z,biome.accent,hazard.r,.35);
        break;
      }
    }
  }

  particle(x,y,z,color,power=1){
    if(this.particles.length>=140)return;
    const object=new THREE.Mesh(new THREE.BoxGeometry(.09,.09,.09),new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false}));
    object.position.set(x+random(-.12,.12),y,z+random(-.12,.12));this.fx.add(object);
    this.particles.push({mesh:object,vx:random(-3,3)*power,vy:random(1,4)*power,vz:random(-3,3)*power,life:random(.2,.55)});
  }

  ring(x,z,color,radius,life){
    const object=new THREE.Mesh(new THREE.RingGeometry(.96,1,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));
    object.rotation.x=-Math.PI/2;object.position.set(x,.08,z);object.scale.setScalar(.2);
    this.fx.add(object);this.rings.push({mesh:object,radius,life,maxLife:life});
  }

  _updateEffects(dt){
    for(const particle of [...this.particles]){
      particle.life-=dt;particle.mesh.position.x+=particle.vx*dt;particle.mesh.position.y+=particle.vy*dt;particle.mesh.position.z+=particle.vz*dt;
      particle.vy-=12*dt;particle.mesh.material.opacity=clamp(particle.life*2,0,1);
      if(particle.life<=0){this.particles.splice(this.particles.indexOf(particle),1);discard(particle.mesh)}
    }
    for(const ring of [...this.rings]){
      ring.life-=dt;ring.mesh.scale.setScalar(ring.radius*(1-ring.life/ring.maxLife));
      ring.mesh.material.opacity=clamp(ring.life/ring.maxLife,0,1)*.75;
      if(ring.life<=0){this.rings.splice(this.rings.indexOf(ring),1);discard(ring.mesh)}
    }
  }

  _checkWave(){
    if(this.spawnsLeft>0||this.enemies.length||this.waveDone)return;
    this.waveDone=true;
    if(this.pickups.length){
      const count=this.pickups.length;
      for(const pickup of [...this.pickups])this._collectPickup(pickup,true);
      this.events.sweep?.(count);
      this.audio.effect('sweep');
    }
    if(this.mode==='campaign'&&this.wave>=10){this.finish('victory');return}
    this.pending.push('wave');
    this._offerChoice();
  }

  _offerChoice(){
    if(!this.pending.length||this.phase==='choice'||this.phase==='result')return;
    const reason=this.pending.shift();
    this.phase='choice';this.audio.playing=false;
    const available=UPGRADES.filter(upgrade=>(this.upgrades[upgrade.id]||0)<upgrade.max&&(!upgrade.available||upgrade.available(this)));
    const pool=[...available],choices=[];
    while(pool.length&&choices.length<3){
      const index=Math.floor(Math.random()*pool.length);
      choices.push(pool.splice(index,1)[0]);
    }
    if(!choices.length){
      this.health=Math.min(this.stats.maxHealth,this.health+30);
      this.shards+=10;this.phase='playing';
      this.events.toast?.('BUILD COMPLETE · +30 HEALTH · +10 ◆');
      if(this.pending.length)this._offerChoice();
      else if(this.waveDone)this.startWave();
      return;
    }
    this.offered=choices.map(choice=>choice.id);
    if(this.save.settings.autoPick){this.chooseRandom(true);return}
    this.events.choice?.(choices,reason,this);
  }

  chooseRandom(automatic=false){
    if(this.phase!=='choice'||!this.offered.length)return;
    const id=this.offered[Math.floor(Math.random()*this.offered.length)];
    this.choose(id,automatic?'auto':'random');
  }

  choose(id,source='manual'){
    if(this.phase!=='choice')return;
    const upgrade=UPGRADES.find(option=>option.id===id);
    if(!upgrade||!this.offered.includes(id)||this.upgrades[id]>=upgrade.max||upgrade.available&&!upgrade.available(this))return;
    this.offered=[];
    this.upgrades[id]=(this.upgrades[id]||0)+1;
    upgrade.apply(this);this.audio.effect('choice');
    if(source==='auto')this.events.autoPick?.(upgrade.name);
    else this.events.toast?.((source==='random'?'RANDOM PICK · ':'')+upgrade.name+' INSTALLED');
    this.phase='playing';
    if(this.pending.length)this._offerChoice();
    else if(this.waveDone)this.startWave();
    else this.audio.playing=true;
  }

  pause(){
    if(this.phase!=='playing')return;
    this.phase='paused';this.audio.playing=false;
    this.events.pause?.();
  }
  resume(){if(this.phase==='paused'){this.phase='playing';this.audio.playing=true}}

  finish(reason){
    if(this.phase==='result'||this.phase==='menu')return;
    this.phase='result';this.audio.playing=false;this.targetMarker.visible=false;
    this.events.result?.({reason,mode:this.mode,difficulty:this.difficulty,wave:this.wave,kills:this.kills,score:this.score,shards:Math.round(this.shards*(this.difficulty==='hard'?1.5:1))});
  }
  toMenu(){
    this.phase='menu';this.audio.playing=false;this._clearDynamic();this.wave=0;
    this.player.x=0;this.player.z=0;this.player.mesh.position.set(0,0,0);
    this.player.mesh.visible=true;
    this.buildArena(0);
  }

  snapshot(){
    const boss=this.enemies.find(enemy=>enemy.type==='warden');
    return {phase:this.phase,wave:this.wave,mode:this.mode,difficulty:this.difficulty,
      biome:BIOMES[this.biomeIndex].name,enemies:this.enemies.length+this.spawnsLeft,
      score:this.score,health:this.health,maxHealth:this.stats?.maxHealth||100,
      dash:this.dashLeft||0,pulse:this.pulseLeft||0,selected:this.selected,weapons:this.weapons||new Set(['blaster']),
      level:this.level||1,xp:this.xp||0,xpNext:this.xpNext||10,combo:this.combo||0,comboTime:this.comboTime||0,
      shards:this.shards||0,target:this.target&&this.enemies.includes(this.target)?this.target:null,boss};
  }

  project(x,z){
    const point=new THREE.Vector3(x,1.3,z).project(this.camera);
    return {x:(point.x+1)*innerWidth/2,y:(1-point.y)*innerHeight/2,visible:point.z<1&&Math.abs(point.x)<1.1&&Math.abs(point.y)<1.1};
  }

  _pollGamepad(){
    const pad=navigator.getGamepads?.()[0];
    if(!pad){this.gamepad={moveX:0,moveY:0,dash:false,pulse:false};return}
    const axis=value=>Math.abs(value)>.22?value:0;
    this.gamepad.moveX=axis(pad.axes[0]||0);this.gamepad.moveY=axis(pad.axes[1]||0);
    if(pad.buttons[0]?.pressed&&!this.gamepad.dash)this.dash();
    if(pad.buttons[1]?.pressed&&!this.gamepad.pulse)this.pulse();
    this.gamepad.dash=!!pad.buttons[0]?.pressed;this.gamepad.pulse=!!pad.buttons[1]?.pressed;
    for(let i=0;i<3;i++)if(pad.buttons[12+i]?.pressed)this.selectWeapon(i);
  }

  _camera(dt){
    const target=this.phase==='menu'?{x:0,z:0}:this.player;
    this.cameraTarget.lerp(new THREE.Vector3(target.x,0,target.z),clamp(dt*5,0,1));
    const menu=this.phase==='menu';
    const drift=menu?Math.sin(this.time*.15)*2.2:0;
    const shake=this.cameraShake>0?(Math.random()-.5)*this.cameraShake:0;
    this.camera.position.set(this.cameraTarget.x+drift+shake,menu?21:20,this.cameraTarget.z+(menu?24:21)+shake);
    this.camera.lookAt(this.cameraTarget.x,0,this.cameraTarget.z);
    this.cameraShake=Math.max(0,this.cameraShake-dt*.95);
  }

  frame(now){
    requestAnimationFrame(next=>this.frame(next));
    const dt=Math.min(.04,Math.max(0,(now-this.lastFrame)/1000||0));
    this.lastFrame=now;this.time+=dt;
    this._camera(dt);
    if(this.phase==='playing'){
      this._pollGamepad();this._move(dt);
      this.invuln=Math.max(0,this.invuln-dt);this.dashLeft=Math.max(0,this.dashLeft-dt);
      this.pulseLeft=Math.max(0,this.pulseLeft-dt);this.comboTime=Math.max(0,this.comboTime-dt);
      if(!this.comboTime)this.combo=0;
      this.player.mesh.visible=this.invuln<=0||Math.floor(this.time*18)%2===0;
      this.waveTime+=dt;this.elapsed+=dt;
      if(this.spawnsLeft>0){
        this.spawnClock-=dt;
        if(this.spawnClock<=0){this.spawnEnemy(this.pickEnemy());this.spawnsLeft--;this.spawnClock=clamp(.65-this.wave*.025,.18,.65)}
      }
      this._updateEnemies(dt);this._aim();this._fire(dt);this._updateProjectiles(dt);
      this._updatePickups(dt);this._updateHazards(dt);this._checkWave();
      if(this.phase==='playing'&&this.pending.length)this._offerChoice();
      this.audio.update(dt);
    }else if(this.phase==='menu'){
      this.player.mesh.rotation.y+=dt*.23;
      this.player.mesh.userData.core.rotation.y+=dt*1.6;
      this.player.mesh.userData.ring.rotation.z+=dt*.4;
    }
    this._updateEffects(dt);
    this.renderer.render(this.scene,this.camera);
    this.events.frame?.(this.snapshot());
  }
}
