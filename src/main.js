import {Game} from './game.js';
import {AudioSystem} from './audio.js';
import {FORGE,forgeCost} from './data.js';
import {loadSave,writeSave,exportSave,importSave} from './save.js';

const $=id=>document.getElementById(id);
const screens=['menu','choices','pause','results','forge','settings','how'];
const show=(id,visible)=>$(id).classList.toggle('hidden',!visible);
const screen=(id,visible)=>{
  $(id).classList.toggle('visible',visible);
  $(id).classList.toggle('hidden',!visible);
};
const compact=value=>Math.floor(value).toLocaleString('en-US');
let save=loadSave(),mode='campaign',difficulty='normal',settingsFrom='menu',toastTimer=0,bannerTimer=0,streakTimer=0,lastHud=0,lastScore=0;
const audio=new AudioSystem();

function toast(message){
  const el=$('toast');el.textContent=message;el.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200);
}
function updateMenu(){
  $('shards-pill').textContent=compact(save.shards)+' ◆';
  $('record-wave').textContent=String(save.records[mode]).padStart(2,'0');
  $('record-mode').textContent=mode==='campaign'?'EXPEDITION':'ENDLESS';
  $('record-runs').textContent=compact(save.runs);
  $('record-kills').textContent=compact(save.kills);
}

const game=new Game($('world'),save,audio,{
  toast,
  pop:(x,z,label,kind)=>{
    if(save.settings.reducedMotion)return;
    const point=game.project(x,z);
    if(!point.visible)return;
    const layer=$('combat-popups');
    if(layer.childElementCount>=28)layer.firstElementChild.remove();
    const item=document.createElement('span');
    item.className='combat-pop '+kind;item.textContent=label;
    item.style.left=point.x+(Math.random()-.5)*35+'px';
    item.style.top=point.y+(Math.random()-.5)*20+'px';
    layer.append(item);setTimeout(()=>item.remove(),850);
  },
  impact:()=>{
    if(save.settings.reducedMotion)return;
    const flash=$('reward-flash');
    flash.classList.remove('pulse');void flash.offsetWidth;flash.classList.add('pulse');
  },
  streak:combo=>{
    const callout=$('streak-callout');
    callout.textContent=combo>=20?'UNSTOPPABLE · '+combo+' KILLS':combo>=10?'RAMPAGE · '+combo+' KILLS':'ON A ROLL · '+combo+' KILLS';
    show('streak-callout',true);callout.classList.remove('burst');void callout.offsetWidth;callout.classList.add('burst');
    clearTimeout(streakTimer);streakTimer=setTimeout(()=>show('streak-callout',false),1450);
  },
  sweep:count=>toast('FIELD SWEEP · '+count+' PICKUP'+(count===1?'':'S')+' COLLECTED'),
  biome:biome=>{document.documentElement.style.setProperty('--biome-accent','#'+biome.accent.toString(16).padStart(6,'0'))},
  wave:(wave,biome,boss)=>{
    const banner=$('wave-banner');
    banner.querySelector('span').textContent=boss?'BOSS INCOMING':'INCOMING';
    banner.querySelector('strong').textContent='WAVE '+String(wave).padStart(2,'0');
    banner.querySelector('small').textContent=biome.name;
    show('wave-banner',true);clearTimeout(bannerTimer);
    bannerTimer=setTimeout(()=>show('wave-banner',false),1900);
  },
  choice:(options,reason,run)=>{
    $('choice-kicker').textContent=reason==='level'?'LEVEL '+String(run.level).padStart(2,'0')+' REACHED':'WAVE '+String(run.wave).padStart(2,'0')+' CLEARED';
    $('choice-title').textContent=reason==='level'?'EVOLVE YOUR BUILD.':'CHOOSE YOUR NEXT EDGE.';
    $('choice-summary').textContent=reason==='level'?'Your experience has earned you another upgrade.':'The arena waits for your decision.';
    $('choice-shards').textContent='+'+compact(run.shards)+' ◆ THIS RUN';
    const grid=$('choice-cards');grid.replaceChildren();
    for(const [index,option] of options.entries()){
      const button=document.createElement('button');button.className='choice-card';
      const number=document.createElement('span');number.className='card-number';number.textContent='OPTION 0'+(index+1);
      const icon=document.createElement('span');icon.className='card-icon';icon.textContent=option.icon;
      const title=document.createElement('strong');title.textContent=option.name;
      const description=document.createElement('p');description.textContent=option.desc;
      const kind=document.createElement('span');kind.className='card-kind';
      kind.textContent=option.kind+' / LV '+((run.upgrades[option.id]||0)+1);
      button.append(number,icon,title,description,kind);
      button.addEventListener('click',()=>{game.choose(option.id);if(game.phase!=='choice')screen('choices',false)});
      grid.append(button);
    }
    screen('choices',true);grid.querySelector('button')?.focus();
  },
  pause:()=>{
    $('pause-stats').textContent='WAVE '+String(game.wave).padStart(2,'0')+' · '+compact(game.kills)+' ELIMINATIONS';
    screen('pause',true);
  },
  result:result=>{
    save.shards+=result.shards;save.runs++;save.kills+=result.kills;
    save.records[result.mode]=Math.max(save.records[result.mode],result.wave);
    if(result.reason==='victory')save.wins++;
    if(!writeSave(save))toast('SAVE UNAVAILABLE IN THIS BROWSER');
    updateMenu();
    $('result-kicker').textContent=result.reason==='victory'?'EXPEDITION COMPLETE':result.reason==='abandon'?'RUN ENDED':'SIGNAL LOST';
    $('result-title').textContent=result.reason==='victory'?'CYCLE BROKEN.':result.reason==='abandon'?'UNTIL NEXT TIME.':'THE ARENA REMEMBERS.';
    $('result-sub').textContent=result.reason==='victory'?'You cleared the tenth wave. The arena will be waiting.':result.reason==='abandon'?'Your shards are safe. Come back stronger.':'Every run leaves something behind.';
    $('result-wave').textContent=String(result.wave).padStart(2,'0');
    $('result-kills').textContent=compact(result.kills);
    $('result-score').textContent=compact(result.score);
    $('result-shards').textContent=compact(result.shards)+' ◆';
    screen('choices',false);screen('pause',false);screen('settings',false);
    show('wave-banner',false);screen('results',true);
    audio.effect(result.reason==='victory'?'choice':'boss');
  },
  hurt:ratio=>{
    const flash=$('flash');flash.style.opacity=ratio<.3?'.8':'.45';
    setTimeout(()=>flash.style.opacity='0',140);
  },
  frame:state=>{
    if(performance.now()-lastHud<75||state.phase==='menu')return;
    lastHud=performance.now();
    $('hud-mode').textContent=(state.mode==='campaign'?'EXPEDITION':'ENDLESS')+' / '+(state.difficulty==='hard'?'HOSTILE':'STANDARD');
    $('hud-wave').textContent='WAVE '+String(state.wave).padStart(2,'0')+(state.mode==='campaign'?' / 10':' / ∞');
    $('hud-biome').textContent=state.biome;
    $('hud-enemies').textContent=state.enemies+' HOSTILES';
    $('hud-score').textContent=String(state.score).padStart(6,'0');
    if(state.score!==lastScore){
      lastScore=state.score;
      const score=$('hud-score');score.classList.remove('score-pop');void score.offsetWidth;score.classList.add('score-pop');
    }
    $('run-shards').textContent=compact(state.shards)+' ◆ THIS RUN';
    $('health-value').textContent=Math.ceil(state.health)+' / '+Math.ceil(state.maxHealth);
    $('health-fill').style.width=Math.max(0,state.health/state.maxHealth*100)+'%';
    $('dash-status').textContent=state.dash<=0?'READY':state.dash.toFixed(1)+'S';
    $('pulse-status').textContent=state.pulse<=0?'READY':state.pulse.toFixed(1)+'S';
    $('level-value').textContent=String(state.level).padStart(2,'0');
    $('xp-fill').style.width=state.xp/state.xpNext*100+'%';
    $('xp-value').textContent=state.xp+' / '+state.xpNext+' XP';
    $('combo').textContent=state.combo>1?'COMBO ×'+state.combo:'BUILD YOUR COMBO';
    $('combo').classList.toggle('hot',state.combo>=5);
    $('combo-fill').style.width=state.combo>1?Math.max(0,state.comboTime/4*100)+'%':'0%';
    $('target-readout').textContent=state.target?'AUTO LOCK · '+state.target.type.toUpperCase()+' · '+Math.round(Math.hypot(state.target.x-game.player.x,state.target.z-game.player.z))+'M':'AUTO LOCK · SCANNING';
    for(const [id,cooldown] of [['mobile-dash',state.dash],['mobile-pulse',state.pulse]]){
      const button=$(id);
      button.classList.toggle('cooling',cooldown>0);
      button.textContent=cooldown>0?cooldown.toFixed(1):id==='mobile-dash'?'DASH':'PULSE';
    }
    for(const [index,id] of ['blaster','scatter','rail'].entries()){
      const slot=document.querySelector('[data-slot="'+index+'"]');
      slot.classList.toggle('active',state.selected===index);
      slot.classList.toggle('locked',!state.weapons.has(id));
      $('weapon-'+index).textContent=state.weapons.has(id)?id.toUpperCase():'LOCKED';
    }
    show('boss-wrap',!!state.boss);
    if(state.boss){
      const hp=Math.max(0,state.boss.hp/state.boss.maxHp);
      $('boss-name').textContent=state.boss.type==='warden'?'THE WARDEN':'BOSS';
      $('boss-percent').textContent=Math.ceil(hp*100)+'%';
      $('boss-fill').style.width=hp*100+'%';
    }
  },
});

function startRun(){
  audio.start();
  lastScore=0;$('combat-popups').replaceChildren();show('streak-callout',false);
  for(const id of screens)screen(id,false);
  show('hud',true);
  document.body.classList.add('playing');
  if(game.mobile)show('mobile-controls',true);
  game.startRun(mode,difficulty);
}
function returnMenu(){
  game.toMenu();show('hud',false);show('mobile-controls',false);
  document.body.classList.remove('playing');
  for(const id of screens)screen(id,false);
  screen('menu',true);updateMenu();
}

function syncSettings(){
  $('volume').value=save.settings.volume;$('volume-value').textContent=save.settings.volume+'%';
  $('quality').value=save.settings.quality;
  $('color-mode').value=save.settings.colorMode;
  $('reduced-motion').checked=save.settings.reducedMotion;
  document.body.dataset.filter=save.settings.colorMode;
  audio.setVolume(save.settings.volume);
  game.setQuality(save.settings.quality);
}
function openSettings(from){
  settingsFrom=from;syncSettings();
  if(from==='pause')screen('pause',false);
  screen('settings',true);
}
function closeSettings(){
  screen('settings',false);
  if(settingsFrom==='pause'&&game.phase==='paused')screen('pause',true);
}
function renderForge(){
  $('forge-shards').textContent=compact(save.shards)+' ◆';
  const grid=$('forge-grid');grid.replaceChildren();
  for(const upgrade of FORGE){
    const level=save.forge[upgrade.id],cost=forgeCost(upgrade.id,level);
    const card=document.createElement('div');card.className='forge-item';
    const content=document.createElement('div');
    const title=document.createElement('b');title.textContent=upgrade.name;
    const description=document.createElement('p');description.textContent=upgrade.desc;
    const pips=document.createElement('div');pips.className='pips';pips.textContent='◆'.repeat(level)+'◇'.repeat(5-level);
    content.append(title,description,pips);
    const button=document.createElement('button');button.textContent=level>=5?'MAXED':cost+' ◆';
    button.disabled=level>=5||save.shards<cost;
    button.addEventListener('click',()=>{
      save.shards-=cost;save.forge[upgrade.id]++;
      if(!writeSave(save))toast('SAVE UNAVAILABLE IN THIS BROWSER');
      audio.start();audio.effect('choice');updateMenu();renderForge();
    });
    card.append(content,button);grid.append(card);
  }
}

document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  mode=button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(item=>{item.classList.toggle('selected',item===button);item.setAttribute('aria-pressed',item===button?'true':'false')});
  updateMenu();
}));
document.querySelectorAll('[data-difficulty]').forEach(button=>button.addEventListener('click',()=>{
  difficulty=button.dataset.difficulty;
  document.querySelectorAll('[data-difficulty]').forEach(item=>{item.classList.toggle('selected',item===button);item.setAttribute('aria-pressed',item===button?'true':'false')});
}));
$('play').addEventListener('click',startRun);
$('again').addEventListener('click',startRun);
$('return-menu').addEventListener('click',returnMenu);
$('open-forge').addEventListener('click',()=>{renderForge();screen('forge',true)});
$('forge-close').addEventListener('click',()=>screen('forge',false));
$('open-how').addEventListener('click',()=>screen('how',true));
$('how-close').addEventListener('click',()=>screen('how',false));
$('open-settings').addEventListener('click',()=>openSettings('menu'));
$('pause-settings').addEventListener('click',()=>openSettings('pause'));
$('settings-close').addEventListener('click',closeSettings);
$('pause-button').addEventListener('click',()=>game.pause());
$('resume').addEventListener('click',()=>{screen('pause',false);game.resume()});
$('abandon').addEventListener('click',()=>game.finish('abandon'));
document.querySelectorAll('[data-slot]').forEach(button=>button.addEventListener('click',()=>game.selectWeapon(Number(button.dataset.slot))));

$('volume').addEventListener('input',event=>{
  save.settings.volume=Number(event.target.value);
  $('volume-value').textContent=save.settings.volume+'%';
  audio.setVolume(save.settings.volume);writeSave(save);
});
$('quality').addEventListener('change',event=>{save.settings.quality=event.target.value;game.setQuality(save.settings.quality);writeSave(save)});
$('color-mode').addEventListener('change',event=>{save.settings.colorMode=event.target.value;document.body.dataset.filter=save.settings.colorMode;writeSave(save)});
$('reduced-motion').addEventListener('change',event=>{save.settings.reducedMotion=event.target.checked;writeSave(save)});
$('export-save').addEventListener('click',async()=>{
  const code=exportSave(save);
  try{await navigator.clipboard.writeText(code);toast('SAVE CODE COPIED')}
  catch{prompt('Copy your save code:',code)}
});
$('import-save').addEventListener('click',()=>{
  const code=prompt('Paste your Blockfall 2.0 save code:');
  if(!code)return;
  try{
    save=importSave(code);game.save=save;writeSave(save);updateMenu();syncSettings();renderForge();toast('SAVE IMPORTED');
  }catch{toast('INVALID SAVE CODE')}
});

function escape(){
  if($('settings').classList.contains('visible')){closeSettings();return}
  if($('how').classList.contains('visible')){screen('how',false);return}
  if($('forge').classList.contains('visible')){screen('forge',false);return}
  if(game.phase==='paused'){screen('pause',false);game.resume();return}
  if(game.phase==='playing')game.pause();
}
addEventListener('keydown',event=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
  if(event.code==='Escape'){if(!event.repeat)escape();return}
  if(game.phase==='choice'&&/^Digit[1-3]$/.test(event.code)&&!event.repeat){
    $('choice-cards').querySelectorAll('button')[Number(event.code.slice(-1))-1]?.click();
    return;
  }
  if(game.phase!=='playing'||event.repeat)return;
  game.keys.add(event.code);
  if(event.code==='Space')game.dash();
  if(event.code==='KeyE')game.pulse();
  if(['Digit1','Digit2','Digit3'].includes(event.code))game.selectWeapon(Number(event.code.slice(-1))-1);
});
addEventListener('keyup',event=>game.keys.delete(event.code));
addEventListener('blur',()=>{game.keys.clear();if(game.phase==='playing')game.pause()});
{
  const pad=$('move-pad');let pointerId=null;
  function move(event){
    const rect=pad.getBoundingClientRect(),centerX=rect.left+rect.width/2,centerY=rect.top+rect.height/2;
    const dx=(event.clientX-centerX)/(rect.width*.4),dy=(event.clientY-centerY)/(rect.height*.4);
    const length=Math.max(1,Math.hypot(dx,dy));
    game.touchMove.x=dx/length;game.touchMove.y=dy/length;
    pad.querySelector('.touch-knob').style.transform='translate(calc(-50% + '+(game.touchMove.x*rect.width*.3)+'px), calc(-50% + '+(game.touchMove.y*rect.height*.3)+'px))';
  }
  pad.addEventListener('pointerdown',event=>{event.preventDefault();pointerId=event.pointerId;pad.setPointerCapture(pointerId);audio.start();move(event)});
  pad.addEventListener('pointermove',event=>{if(event.pointerId===pointerId)move(event)});
  function release(event){
    if(event.pointerId!==pointerId)return;
    pointerId=null;game.touchMove.x=0;game.touchMove.y=0;
    pad.querySelector('.touch-knob').style.transform='translate(-50%,-50%)';
  }
  pad.addEventListener('pointerup',release);pad.addEventListener('pointercancel',release);
}
$('mobile-dash').addEventListener('pointerdown',event=>{event.preventDefault();game.dash()});
$('mobile-pulse').addEventListener('pointerdown',event=>{event.preventDefault();game.pulse()});
updateMenu();syncSettings();
export {game};
