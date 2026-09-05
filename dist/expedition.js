import {Game,PERKS,WORLD} from './engine.js?v=journey4';
export const LOCATIONS={
 garden:{name:'青山茶园',subtitle:'从这一山新绿出发',color:'#a3efc4',cell:-1,types:['shade','shade','fast'],reward:'card',risk:'枯叶灵围攻 · 适合起步'},
 bamboo:{name:'风啸竹海',subtitle:'疾风穿林，追猎不息',color:'#92e1a1',cell:0,types:['fast','fast','shade'],reward:'weapon',risk:'荆棘疾兽突袭 · 武器路线'},
 frost:{name:'寒潭雪境',subtitle:'冰魄凝结，寒星追身',color:'#a2e9ff',cell:1,types:['shade','shade','heavy'],reward:'relic',risk:'霜灵远程投射 · 法宝路线'},
 ember:{name:'赤焰古祠',subtitle:'避开火痕，击碎岩甲',color:'#ffb47e',cell:2,types:['heavy','fast','heavy'],reward:'forge',risk:'熔岩卫与落火 · 锻造路线'},
 ruins:{name:'月蚀遗庭',subtitle:'穿越最后一道门，直面茶魇',color:'#d5b2ff',cell:3,types:['shade','fast','heavy'],reward:'relic',risk:'最终首领 · 弹幕与冲撞'}
};
export const WEAPONS={
 native:{name:'本命武器',icon:'✧',desc:'保留守护者的原有攻击。',color:'#b0f1be'},
 spear:{name:'惊雷枪',icon:'↯',desc:'普攻改为远程雷枪，贯穿最多 3 名敌人。',color:'#e8dba0',range:600},
 fan:{name:'霜羽扇',icon:'❄',desc:'普攻改为三枚冰羽散射，命中减速 2 秒。',color:'#a2e9ff',range:540},
 ring:{name:'赤焰轮',icon:'◉',desc:'普攻改为周身火环，灼击范围内全部敌人。',color:'#ffb47e',range:225}
};
export const RELICS={
 bell:{name:'甘霖铃',icon:'♧',desc:'每 8 秒恢复 8 点生命，每级增加 8 点。'},
 orb:{name:'流光珠',icon:'✺',desc:'每 1.2 秒对身边敌人造成 35% 攻击伤害，每级增加 35%。'},
 seal:{name:'玄玉印',icon:'⬡',desc:'每级额外减伤 10%，最多 3 级。'}
};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class Expedition extends Game{
 constructor(hero='qingfeng',mode='campaign',random=Math.random){
  super(hero,random);this.mode=mode;this.stage=1;this.location='garden';this.history=['garden'];this.roomTime=0;this.roomSpawned=0;this.roomTarget=18;this.roomKills=0;this.phase='combat';this.chest=null;this.portals=[];this.loot=[];this.weapon='native';this.weaponLevels={native:1};this.relics={};this.relicClock=0;this.healClock=0;this.nextBoss=60;this.nextElite=30;this.bossCount=0;this.hazards=[];this.hazardClock=5;this.rewardBias='card';this.totalChests=0;this.interactionLock=0;
 }
 get place(){return LOCATIONS[this.location];}
 get weaponName(){return this.weapon==='native'?(this.hero==='qingfeng'?'青玉刃':'追风叶'):WEAPONS[this.weapon].name;}
 get weaponLevel(){return this.weaponLevels[this.weapon]||1;}
 get objective(){if(this.phase==='chest')return '关卡完成 · 靠近宝箱并开启';if(this.phase==='portals')return '选择方向 · 靠近传送门并进入';if(this.mode==='endless')return `无尽第 ${this.stage} 波 · ${this.boss&&!this.boss.dead?'击败首领':'首领将于 '+Math.ceil(Math.max(0,this.nextBoss-this.time))+' 秒后出现'}`;return this.stage===5?'终点 · 击败月蚀茶魇':`第 ${this.stage} / 5 关 · 击退 ${Math.min(this.roomKills,this.roomTarget)} / ${this.roomTarget}`;}
 spawnEnemy(type){
  const chosen=type||(this.mode==='endless'&&this.time>30&&this.random()<.25?'heavy':this.place.types[Math.floor(this.random()*this.place.types.length)]);const e=super.spawnEnemy(chosen);
  const difficulty=this.mode==='endless'?1+this.time/160:1+(this.stage-1)*.28;
  e.hp=e.maxHp=(chosen==='boss'?(this.mode==='endless'?900+this.bossCount*480:2100):{shade:34,fast:26,heavy:90}[chosen])*difficulty;
  e.damage*=Math.min(4,1+(this.mode==='endless'?this.time/240:(this.stage-1)*.14));e.speed*=Math.min(1.7,1+(this.mode==='endless'?this.time/700:(this.stage-1)*.045));
  e.variant=this.location;e.cast=2+this.random()*2;e.title=({garden:{shade:'枯叶灵',fast:'荆棘疾兽',heavy:'苔岩卫'},bamboo:{shade:'竹隐灵',fast:'竹影疾兽',heavy:'盘根卫'},frost:{shade:'寒潭霜灵',fast:'雪影兽',heavy:'冰甲岩卫'},ember:{shade:'余烬灵',fast:'赤炎疾兽',heavy:'熔岩卫'},ruins:{shade:'月蚀灵',fast:'暗月猎兽',heavy:'遗庭石卫'}})[this.location][chosen]||'';
  if(chosen==='boss'){e.title=this.mode==='campaign'?'月蚀茶魇':'茶魇 · 第 '+(this.bossCount+1)+' 化身';}
  if(this.location==='bamboo'&&chosen==='fast')e.speed*=1.2;
  if(this.location==='ember'&&chosen==='heavy'){e.hp*=1.2;e.maxHp=e.hp;}
  return e;
 }
 scheduleSpawns(dt){
  if(this.phase!=='combat')return;
  this.spawnTimer-=dt;
  if(this.mode==='endless'){
   this.stage=1+Math.floor(this.time/60);
   if(this.spawnTimer<=0){this.spawnTimer=Math.max(.23,.95-this.time*.0015);if(this.enemies.length<70)this.spawnEnemy();}
   if(this.time>=this.nextElite){this.nextElite+=30;const elite=this.spawnEnemy('heavy');elite.elite=true;elite.title='精英 · 苔岩统领';elite.hp*=2.2;elite.maxHp=elite.hp;elite.damage*=1.2;elite.xp*=3;}
   if(this.time>=this.nextBoss&&(!this.boss||this.boss.dead)){this.spawnEnemy('boss');this.nextBoss+=60;}
  }else if(this.stage===5){
   if(!this.bossSpawned)this.spawnEnemy('boss');
   if(this.spawnTimer<=0&&this.enemies.length<9){this.spawnTimer=5;this.spawnEnemy();}
  }else if(this.spawnTimer<=0&&this.roomSpawned<this.roomTarget&&this.enemies.length<14){this.spawnTimer=Math.max(.55,1.05-this.stage*.09);this.spawnEnemy();this.roomSpawned++;}
 }
 defeatedBoss(){
  this.bossCount++;this.finishRoom(this.mode==='campaign');
 }
 hit(enemy,damage,knock=0,origin=this.player){const wasDead=enemy.dead;super.hit(enemy,damage,knock,origin);if(!wasDead&&enemy.dead&&enemy.type!=='boss')this.roomKills++;}
 hurt(amount){if(this.phase!=='combat')return;super.hurt(amount*Math.max(.7,1-(this.relics.seal||0)*.1));}
 attack(){const p=this.player,range=p.range;p.range=Math.max(range,WEAPONS[this.weapon].range||0);const result=super.attack();p.range=range;return result;}
 releaseAttack(action){
  const level=this.weaponLevel,p=this.player,boost=1+(level-1)*.24;
  if(this.weapon==='native'){const damage=p.attack;p.attack*=boost;super.releaseAttack(action);p.attack=damage;return true;}
  const color=WEAPONS[this.weapon].color;
  if(this.weapon==='ring'){
   const radius=205+(level-1)*18+(p.range-this.config.range)*.5;
   this.effects.push({kind:'nova',x:p.x,y:p.y,r:radius,color,life:.4,maxLife:.4});
   for(const e of this.enemies)if(!e.dead&&dist(e,p)<radius+e.r)this.hit(e,p.attack*1.05*boost,90);
  }else{
   const count=this.weapon==='fan'?3+Math.floor((level-1)/2)+Math.min(2,p.projectiles-1):1;
   for(let i=0;i<count;i++){const a=action.angle+(i-(count-1)/2)*.2,speed=this.weapon==='spear'?650:470;this.bullets.push({x:p.x,y:p.y-15,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:10,damage:p.attack*boost*(this.weapon==='spear'?1.35:.7),life:1.5,enemy:false,angle:a,pierce:this.weapon==='spear'?2:0,slow:this.weapon==='fan'?2:0,color,weapon:this.weapon});}
  }
  this.emit('attack');return true;
 }
 finishRoom(final=false){
  if(this.phase!=='combat'||this.state!=='playing')return;
  this.phase='chest';this.finalChest=final;this.enemies=[];this.bullets=[];this.fields=[];this.hazards=[];this.pendingActions=[];this.player.action=null;this.player.dash=0;this.player.qCD=this.player.eCD=0;
  for(const d of this.drops)if(d.kind==='xp')this.xp+=d.value;this.drops=[];
  this.heal(this.player.maxHp*.18);this.chest={x:clamp(this.player.x+90,170,WORLD.w-170),y:clamp(this.player.y,170,WORLD.h-170)};this.emit('room-clear');
 }
 nearby(){if(this.state!=='playing'||this.phase==='combat')return null;if(this.phase==='chest'&&this.chest&&dist(this.chest,this.player)<135)return {kind:'chest',label:this.finalChest?'开启终章宝箱':'开启关卡宝箱'};const portal=this.portals.find(p=>dist(p,this.player)<125);return portal?{kind:'portal',label:'进入'+LOCATIONS[portal.destination].name,id:portal.id}:null;}
 interact(){const item=this.nearby();if(!item||this.interactionLock>0)return false;if(item.kind==='chest')return this.openChest();return this.enterPortal(item.id);}
 openChest(){if(this.state!=='playing'||this.phase!=='chest')return false;this.state='loot';this.loot=this.rollLoot();this.emit('loot');return true;}
 rollLoot(){
  const weaponKeys=Object.keys(WEAPONS).filter(k=>k!=='native'&&(k!==this.weapon||this.weaponLevel<5));const weaponKey=weaponKeys[Math.floor(this.random()*weaponKeys.length)];
  const gear={id:'weapon:'+weaponKey,kind:'weapon',name:WEAPONS[weaponKey].name,icon:WEAPONS[weaponKey].icon,desc:WEAPONS[weaponKey].desc+' 替换当前普攻，角色技能不变；重复获得升 1 级（最高 5 级）。'};
  const availableRelics=Object.keys(RELICS).filter(k=>(this.relics[k]||0)<3);const key=availableRelics[Math.floor(this.random()*availableRelics.length)];
  const relic=key?{id:'relic:'+key,kind:'relic',...RELICS[key]}:null;
  const perk=PERKS[Math.floor(this.random()*PERKS.length)];const card={...perk,id:'card:'+perk.id,kind:'card'};
  const forge={id:'forge',kind:'forge',name:'百炼升阶',icon:'✦',desc:this.weaponLevel<5?`${this.weaponName} 升至 ${this.weaponLevel+1} 级，普攻伤害提高，特殊武器效果成长。`:'武器已满级，改为所有伤害提高 22%。'};
  if(this.rewardBias==='forge')return [forge,gear,relic||card];
  if(this.rewardBias==='relic')return [relic||forge,gear,card];
  return [gear,relic||forge,relic&&this.random()<.5?forge:card];
 }
 chooseLoot(id){
  if(this.state!=='loot')return false;const choice=this.loot.find(v=>v.id===id);if(!choice)return false;
  if(choice.kind==='weapon'){const key=id.split(':')[1];this.weaponLevels[key]=Math.min(5,(this.weaponLevels[key]||0)+1);this.weapon=key;}
  else if(choice.kind==='relic'){const key=id.split(':')[1];this.relics[key]=Math.min(3,(this.relics[key]||0)+1);}
  else if(choice.kind==='forge'){if(this.weaponLevel<5)this.weaponLevels[this.weapon]=this.weaponLevel+1;else this.applyPerk('power');}
  else this.applyPerk(id.split(':')[1]);
  this.totalChests++;this.loot=[];this.chest=null;this.state='playing';this.player.invincible=2;this.interactionLock=.5;this.emit('equipped',{name:choice.name});
  if(this.finalChest){this.phase='complete';this.state='won';this.animate('victory',.9);this.emit('won');}
  else if(this.mode==='endless'){this.phase='combat';this.spawnTimer=2;this.nextBoss=Math.max(this.time+30,this.nextBoss);this.beginUpgrade();}
  else{this.phase='portals';this.createPortals();}
  return true;
 }
 createPortals(){
  const nextFinal=this.stage===4;const pool=['bamboo','frost','ember'].filter(k=>k!==this.location);const destinations=[];
  if(nextFinal)destinations.push('ruins');else while(destinations.length<2){const i=Math.floor(this.random()*pool.length);destinations.push(pool.splice(i,1)[0]);}
  const p=this.player;
  this.portals=destinations.map((destination,i)=>({id:'portal-'+i,destination,x:clamp(p.x+(i===0?-195:195),170,WORLD.w-170),y:clamp(p.y-95,170,WORLD.h-170),direction:i===0?'西门':'东门'}));
  // If near a boundary, keep the two exits visibly separate.
  if(this.portals.length===2&&dist(this.portals[0],this.portals[1])<240){this.portals[0].x=650;this.portals[1].x=1150;this.portals.forEach(p=>p.y=500);}
  this.emit('portals');
 }
 enterPortal(id){
  if(this.phase!=='portals'||this.state!=='playing')return false;const portal=this.portals.find(p=>p.id===id);if(!portal||dist(portal,this.player)>=125)return false;
  this.location=portal.destination;this.rewardBias=this.place.reward;this.history.push(this.location);this.stage++;this.roomTime=0;this.roomSpawned=0;this.roomKills=0;this.roomTarget=18+(this.stage-1)*6;this.portals=[];this.boss=null;this.bossSpawned=false;this.phase='combat';this.spawnTimer=1;this.hazardClock=4;this.effects=[];this.particles=[];this.texts=[];this.trails=[];
  Object.assign(this.player,{x:900,y:650,invincible:2,action:null,moving:false,dash:0});this.emit('entered');this.beginUpgrade();return true;
 }
 beginUpgrade(){if(this.phase&&this.phase!=='combat')return false;return super.beginUpgrade();}
 pause(){if(this.state!=='playing')return false;this.state='paused';return true;}
 update(dt,input={x:0,y:0}){
  const step=clamp(dt,0,.05);if(this.state!=='playing'){super.update(step,input);return;}
  this.interactionLock=Math.max(0,this.interactionLock-step);
  if(this.phase!=='combat'){
   // Peaceful intermission: movement remains available; combat and timer are frozen.
   const p=this.player,len=Math.hypot(input.x,input.y),scale=len>1?1/len:1;p.moving=len>.08;if(Math.abs(input.x)>.08)p.facing=input.x>0?1:-1;
   p.x=clamp(p.x+input.x*scale*p.speed*step,WORLD.pad,WORLD.w-WORLD.pad);p.y=clamp(p.y+input.y*scale*p.speed*step,WORLD.pad,WORLD.h-WORLD.pad);this.tickAnimation(step);return;
  }
  super.update(step,input);if(this.state!=='playing'||this.phase!=='combat')return;
  this.roomTime+=step;this.tickRelics(step);this.tickLocation(step);
  if(this.state==='playing'&&this.mode==='campaign'&&this.stage<5&&this.roomSpawned>=this.roomTarget&&!this.enemies.some(e=>!e.dead))this.finishRoom();
 }
 tickRelics(dt){
  this.healClock+=dt;this.relicClock+=dt;
  if(this.healClock>=8){this.healClock=0;if(this.relics.bell)this.heal(8*this.relics.bell);}
  if(this.relicClock>=1.2){this.relicClock=0;if(this.relics.orb){this.ring(this.player.x,this.player.y,125,'#e9da9e',.35);for(const e of this.enemies)if(!e.dead&&dist(e,this.player)<125+e.r)this.hit(e,this.player.attack*.35*this.relics.orb,15);}}
 }
 tickLocation(dt){
  for(const e of this.enemies){if(e.dead||e.type==='boss')continue;e.cast-=dt;
   if(this.location==='frost'&&e.type==='shade'&&e.cast<=0){e.cast=3.6;const a=Math.atan2(this.player.y-e.y,this.player.x-e.x);this.bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*210,vy:Math.sin(a)*210,r:8,damage:12,life:3.5,enemy:true,angle:a,color:'#a2e9ff'});}
  }
  if(this.location==='ember'||(this.stage===5&&this.mode==='campaign'&&this.boss?.hp<this.boss?.maxHp*.5)){
   this.hazardClock-=dt;if(this.hazardClock<=0){this.hazardClock=this.location==='ember'?5:3.2;this.hazards.push({x:this.player.x,y:this.player.y,r:85,life:1.8,warning:1.15,hit:false});}
  }
  for(const h of this.hazards){h.life-=dt;if(h.life<.65&&!h.hit){h.hit=true;if(dist(h,this.player)<h.r+this.player.r)this.hurt(22);this.ring(h.x,h.y,h.r,'#ff995f',.5);}}
  this.hazards=this.hazards.filter(h=>h.life>0);
 }
 useSkill(key){if(this.phase!=='combat')return false;return super.useSkill(key);}
}
