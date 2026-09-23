const STEP=1.25;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function segmentDistanceSquared(point,x1,z1,x2,z2){
  const dx=x2-x1,dz=z2-z1;
  const t=clamp(((point.x-x1)*dx+(point.z-z1)*dz)/(dx*dx+dz*dz||1),0,1);
  return (point.x-x1-dx*t)**2+(point.z-z1-dz*t)**2;
}

// All enemies of the same size share a flow field. Rebuild it only when the
// player's nearest grid cell changes, instead of searching once per enemy.
export class Navigation{
  constructor(obstacles,arena){
    this.obstacles=obstacles;this.arena=arena;
    this.size=Math.floor((arena*2-1)/STEP)+1;
    this.origin=-(this.size-1)*STEP/2;
    this.maps=new Map();
  }

  clear(x1,z1,x2,z2,radius){
    for(const obstacle of this.obstacles){
      if(segmentDistanceSquared(obstacle,x1,z1,x2,z2)<(obstacle.r+radius)**2)return false;
    }
    return true;
  }

  _map(radius){
    const key=radius.toFixed(2);
    if(this.maps.has(key))return this.maps.get(key);
    const count=this.size*this.size,walkable=new Uint8Array(count),links=Array.from({length:count},()=>[]);
    const clearance=radius+.18,limit=this.arena-radius-.2;
    const position=index=>({x:this.origin+(index%this.size)*STEP,z:this.origin+Math.floor(index/this.size)*STEP});
    for(let index=0;index<count;index++){
      const {x,z}=position(index);
      walkable[index]=Math.abs(x)<limit&&Math.abs(z)<limit&&
        this.obstacles.every(obstacle=>Math.hypot(x-obstacle.x,z-obstacle.z)>=obstacle.r+clearance)?1:0;
    }
    for(let index=0;index<count;index++){
      if(!walkable[index])continue;
      const x=index%this.size,z=Math.floor(index/this.size),from=position(index);
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dz||x+dx<0||x+dx>=this.size||z+dz<0||z+dz>=this.size)continue;
        const other=(z+dz)*this.size+x+dx;
        if(!walkable[other])continue;
        const to=position(other);
        if(this.clear(from.x,from.z,to.x,to.z,clearance))links[index].push(other);
      }
    }
    const map={walkable,links,position,field:new Int16Array(count).fill(-1),goal:-1,playerCell:-1};
    this.maps.set(key,map);
    return map;
  }

  _field(map,player){
    const gx=clamp(Math.round((player.x-this.origin)/STEP),0,this.size-1);
    const gz=clamp(Math.round((player.z-this.origin)/STEP),0,this.size-1);
    const playerCell=gz*this.size+gx;
    if(map.playerCell===playerCell)return;
    map.playerCell=playerCell;
    let goal=-1,best=Infinity;
    for(let index=0;index<map.walkable.length;index++){
      if(!map.walkable[index])continue;
      const cell=map.position(index),d=(cell.x-player.x)**2+(cell.z-player.z)**2;
      if(d<best){best=d;goal=index}
    }
    if(goal===map.goal)return;
    map.goal=goal;map.field.fill(-1);
    if(goal<0)return;
    const queue=new Int16Array(map.walkable.length);let head=0,tail=0;
    queue[tail++]=goal;map.field[goal]=0;
    while(head<tail){
      const current=queue[head++],nextDistance=map.field[current]+1;
      for(const next of map.links[current]){
        if(map.field[next]>=0)continue;
        map.field[next]=nextDistance;queue[tail++]=next;
      }
    }
  }

  direction(enemy,player){
    const radius=enemy.radius+.08;
    if(this.clear(enemy.x,enemy.z,player.x,player.z,radius))return null;
    const map=this._map(enemy.radius);
    this._field(map,player);
    const gx=clamp(Math.round((enemy.x-this.origin)/STEP),0,this.size-1);
    const gz=clamp(Math.round((enemy.z-this.origin)/STEP),0,this.size-1);
    let start=-1,best=Infinity;
    for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){
      const x=gx+dx,z=gz+dz;
      if(x<0||x>=this.size||z<0||z>=this.size)continue;
      const index=z*this.size+x;
      if(map.field[index]<0)continue;
      const cell=map.position(index),d=Math.hypot(cell.x-enemy.x,cell.z-enemy.z);
      if(d>3.6||!this.clear(enemy.x,enemy.z,cell.x,cell.z,radius))continue;
      const score=d+map.field[index]*.035;
      if(score<best){best=score;start=index}
    }
    if(start<0)return null;
    let next=start,shortest=map.field[start];
    for(const index of map.links[start]){
      if(map.field[index]<0||map.field[index]>=shortest)continue;
      const cell=map.position(index);
      if(!this.clear(enemy.x,enemy.z,cell.x,cell.z,radius))continue;
      shortest=map.field[index];next=index;
    }
    const waypoint=map.position(next),dx=waypoint.x-enemy.x,dz=waypoint.z-enemy.z,d=Math.hypot(dx,dz);
    return d>.01?{x:dx/d,z:dz/d}:{x:0,z:0};
  }
}
