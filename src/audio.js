const notes=[110,130.81,146.83,164.81,196,220,261.63,293.66];

export class AudioSystem{
  constructor(){this.context=null;this.volume=.6;this.musicClock=0;this.musicStep=0;this.playing=false;this.biome=0}
  start(){
    if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.volume*.38;this.master.connect(this.context.destination)}
    if(this.context.state==='suspended') this.context.resume();
  }
  setVolume(percent){this.volume=percent/100;if(this.master)this.master.gain.value=this.volume*.38}
  tone(frequency,duration=.12,type='sine',gain=.12,sweep=1){
    if(!this.context||this.volume===0)return;
    const time=this.context.currentTime,osc=this.context.createOscillator(),amp=this.context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(Math.max(30,frequency),time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*sweep),time+duration);
    amp.gain.setValueAtTime(.0001,time);amp.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),time+.012);
    amp.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(amp);amp.connect(this.master);osc.start(time);osc.stop(time+duration+.02);
  }
  effect(name){
    if(name==='shoot')this.tone(450,.065,'triangle',.09,.48);
    if(name==='scatter'){this.tone(105,.2,'sawtooth',.13,.35);this.tone(280,.08,'triangle',.05,.55)}
    if(name==='rail'){this.tone(1100,.3,'sawtooth',.12,.12);this.tone(90,.24,'sine',.11,.7)}
    if(name==='hit')this.tone(310,.07,'triangle',.05,.56);
    if(name==='kill')this.tone(150,.16,'sine',.09,2);
    if(name==='hurt')this.tone(140,.27,'sawtooth',.13,.45);
    if(name==='dash')this.tone(530,.15,'triangle',.1,.32);
    if(name==='pulse'){this.tone(95,.48,'sine',.16,3);this.tone(420,.23,'triangle',.08,.7)}
    if(name==='pickup')this.tone(550,.11,'sine',.06,1.5);
    if(name==='choice'){this.tone(392,.18,'sine',.1,1.25);setTimeout(()=>this.tone(588,.22,'sine',.08,1),90)}
    if(name==='wave'){this.tone(130,.4,'triangle',.09,1.5);setTimeout(()=>this.tone(196,.45,'triangle',.08,1.5),180)}
    if(name==='boss'){this.tone(82,.65,'sawtooth',.12,.7)}
  }
  update(dt){
    if(!this.playing||!this.context||this.volume===0)return;
    this.musicClock-=dt;
    if(this.musicClock>0)return;
    this.musicClock=.37;
    const step=this.musicStep++;
    const sequence=this.biome%2?[0,2,4,2,5,3,1,3]:[0,4,2,4,3,5,2,1];
    const note=notes[(sequence[step%8]+this.biome)%notes.length];
    if(step%4===0)this.tone(note/2,.48,'triangle',.028,.98);
    if(step%2===0)this.tone(note*2,.16,'sine',.015,1.01);
    if(step%8===7)this.tone(note*4,.25,'sine',.012,.86);
  }
}
