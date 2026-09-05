export const HEROES={
  qingfeng:{name:'青锋',role:'近战 · 机械采茶师',tag:'近身爆发',quote:'以锋为界，守住这一山新绿。',description:'机械臂与茶刃并用，切入敌群，在近身战斗中打开缺口。',hp:140,attack:28,speed:230,interval:.7,range:152,color:'#a3f7b9',passive:['茶刃横扫','挥斩前方敌人，命中时击退。','✧'],q:['回风斩','向移动方向突进，斩击沿途敌人。',5,'↯'],e:['万叶归刃','释放环形刃风，重创周围敌人。',12,'✺']},
  lingye:{name:'灵叶',role:'远程 · 御叶行者',tag:'远程控场',quote:'一叶听风，万物皆有回响。',description:'用灵叶追击暗影，以结界控制战场，灵巧走位让敌人无法近身。',hp:105,attack:19,speed:250,interval:.5,range:540,color:'#71f4dd',passive:['追风灵叶','自动发射飞叶，追击最近的敌人。','❧'],q:['叶影穿行','轻盈闪身，恢复 14 点生命。',6,'↯'],e:['青岚结界','生成 5 秒结界，减速并持续伤害敌人。',13,'❋']}
};
export const PERKS=[
 {id:'power',name:'锋芒初露',icon:'✧',desc:'所有伤害提升 22%。',type:'攻击强化'},
 {id:'haste',name:'疾风心法',icon:'↯',desc:'普攻速度提升 18%，技能冷却缩短 10%。',type:'速度强化'},
 {id:'vitality',name:'生生不息',icon:'♡',desc:'最大生命增加 25，立即恢复 40 点生命。',type:'生存强化'},
 {id:'stride',name:'踏叶无痕',icon:'➶',desc:'移动速度提升 15%，拾取范围增加 25%。',type:'机动强化'},
 {id:'mastery',name:'万象归一',icon:'❋',desc:'青锋斩击范围扩大 20%；灵叶额外发射一枚飞叶。',type:'专属强化'},
 {id:'ward',name:'青玉护身',icon:'⬡',desc:'受到的伤害降低 15%，立即恢复 20 点生命。',type:'防御强化'}
];
export const WORLD={w:1800,h:1200,pad:112};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hypot=Math.hypot;
const distance=(a,b)=>hypot(a.x-b.x,a.y-b.y);
const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export class Game{
 constructor(hero='qingfeng',random=Math.random){
  this.hero=hero;this.config=HEROES[hero];this.random=random;this.state='playing';this.time=0;this.kills=0;this.level=1;this.xp=0;this.xpNeeded=7;this.wave=1;this.spawnTimer=.6;this.bossSpawned=false;this.boss=null;this.id=0;this.enemies=[];this.bullets=[];this.drops=[];this.effects=[];this.particles=[];this.texts=[];this.events=[];this.fields=[];this.choices=[];
  this.player={x:900,y:610,r:20,hp:this.config.hp,maxHp:this.config.hp,attack:this.config.attack,speed:this.config.speed,interval:this.config.interval,range:this.config.range,attackTimer:.3,qCD:0,eCD:0,cdScale:1,armor:1,invincible:1.3,angle:-Math.PI/2,facing:1,moving:false,magnet:92,projectiles:1,regen:0,dash:0,dashX:0,dashY:0,action:null,stride:0,moveBlend:0,step:0};
  this.pendingActions=[];this.trails=[];
 }
 animate(name,duration,angle=this.player.angle){const p=this.player;p.action={name,duration,elapsed:0,facing:Math.cos(angle)<-.05?-1:Math.cos(angle)>.05?1:p.facing};}
 tickAnimation(dt){const p=this.player;if(p.action){p.action.elapsed+=dt;if(p.action.elapsed>=p.action.duration&&!['defeat','victory'].includes(p.action.name))p.action=null;}p.moveBlend+=(Number(p.moving)-p.moveBlend)*Math.min(1,dt*13);if(p.moving)p.stride+=dt*10.5*(p.speed/230);for(const t of this.trails)t.life-=dt;this.trails=this.trails.filter(t=>t.life>0);}
 emit(type,data={}){this.events.push({type,...data});}
 takeEvents(){return this.events.splice(0);}
 spawnEnemy(type){
  const a=this.random()*Math.PI*2,r=410+this.random()*130,p=this.player;
  let x=clamp(p.x+Math.cos(a)*r,WORLD.pad,WORLD.w-WORLD.pad),y=clamp(p.y+Math.sin(a)*r,WORLD.pad,WORLD.h-WORLD.pad);
  if(hypot(x-p.x,y-p.y)<230){x=p.x<WORLD.w/2?WORLD.w-WORLD.pad:WORLD.pad;y=clamp(p.y+Math.sin(a)*200,WORLD.pad,WORLD.h-WORLD.pad);}
  const kind=type||(this.time>28&&this.random()<.2?'heavy':this.time>14&&this.random()<.35?'fast':'shade');
  const stat={shade:[36,67,13,20,1],fast:[23,124,10,15,1],heavy:[104,43,19,29,3],boss:[1080,61,23,53,20]}[kind];
  const e={id:++this.id,type:kind,x,y,hp:stat[0]*(kind==='boss'?1:1+this.time*.004),maxHp:stat[0]*(kind==='boss'?1:1+this.time*.004),speed:stat[1],damage:stat[2],r:stat[3],xp:stat[4],angle:0,flash:0,kx:0,ky:0,seed:this.random()*10,fire:2.4,charge:0,windup:0,chargeX:0,chargeY:0,chargeTimer:5,dead:false};
  this.enemies.push(e);if(kind==='boss'){this.boss=e;this.bossSpawned=true;this.emit('boss');this.ring(e.x,e.y,160,'#d56b9d',1.3);}return e;
 }
 ring(x,y,r,color,duration=.45){this.effects.push({kind:'ring',x,y,r,color,life:duration,maxLife:duration});}
 burst(x,y,color,count=8){for(let i=0;i<count;i++){const a=this.random()*Math.PI*2,s=35+this.random()*145;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3+this.random()*.4,maxLife:.7,color,r:2+this.random()*3});}if(this.particles.length>300)this.particles.splice(0,this.particles.length-300);}
 text(x,y,label,color='#edffc2'){this.texts.push({x,y,label,color,life:.7});if(this.texts.length>55)this.texts.shift();}
 hit(e,damage,knock=0,origin=this.player){if(e.dead)return;e.hp-=damage;e.flash=.12;const a=Math.atan2(e.y-origin.y,e.x-origin.x);e.kx+=Math.cos(a)*knock;e.ky+=Math.sin(a)*knock;this.text(e.x,e.y-e.r-14,Math.round(damage).toString());this.burst(e.x,e.y,this.config.color,3);if(e.hp<=0){e.dead=true;this.kills++;this.burst(e.x,e.y,e.type==='boss'?'#f5c78a':'#94dac2',e.type==='boss'?35:9);this.drops.push({x:e.x,y:e.y,r:6,value:e.xp,kind:'xp',seed:this.random()*6});if(this.random()<.055)this.drops.push({x:e.x+12,y:e.y,r:9,value:17,kind:'heal',seed:0});if(e.type==='boss'){this.state='won';this.animate('victory',.9);this.emit('won');}else this.emit('kill');}}
 hurt(amount){const p=this.player;if(p.invincible>0||this.state!=='playing')return;p.hp=Math.max(0,p.hp-amount*p.armor);p.invincible=.7;this.animate('hurt',.24);this.ring(p.x,p.y,50,'#f69599',.28);this.text(p.x,p.y-85,'−'+Math.round(amount*p.armor),'#ff9e9e');this.emit('hurt');if(p.hp<=0){this.state='lost';this.animate('defeat',.65);this.pendingActions=[];this.emit('lost');}}
 heal(amount){const p=this.player,actual=Math.min(p.maxHp-p.hp,amount);p.hp=Math.min(p.maxHp,p.hp+amount);if(actual>0)this.text(p.x,p.y-88,'+'+Math.round(actual),'#a9ffd0');}
 useSkill(key){
  if(this.state!=='playing')return false;const p=this.player,h=this.config,cd=key==='q'?'qCD':'eCD';if(p[cd]>.001)return false;p[cd]=h[key][2]*p.cdScale;
  if(key==='q'){
   this.animate('dash',.32);p.facing=p.action.facing;
   p.dash=.2;p.dashX=Math.cos(p.angle);p.dashY=Math.sin(p.angle);p.invincible=Math.max(p.invincible,.48);this.ring(p.x,p.y,80,h.color,.4);
   if(this.hero==='lingye')this.heal(14);else for(const e of this.enemies){if(e.dead)continue;const dx=e.x-p.x,dy=e.y-p.y,along=dx*p.dashX+dy*p.dashY,across=Math.abs(dx*p.dashY-dy*p.dashX);if(along>-55&&along<300&&across<85+e.r)this.hit(e,p.attack*2.1,210);}
   this.effects.push({kind:'dash',x:p.x,y:p.y,angle:p.angle,r:240,color:h.color,life:.35,maxLife:.35});
  }else{
   this.animate('ultimate',.66);p.invincible=Math.max(p.invincible,.72);this.pendingActions.push({kind:'ultimate',delay:.33});this.ring(p.x,p.y,60,h.color,.33);
  }
  this.emit('skill',{key});return true;
 }
 releaseUltimate(){const p=this.player;if(this.hero==='qingfeng'){const radius=275*(p.range/this.config.range);for(const e of this.enemies)if(!e.dead&&distance(p,e)<radius+e.r)this.hit(e,p.attack*3.8,360);this.ring(p.x,p.y,radius,'#d4f7a2',.85);this.effects.push({kind:'nova',x:p.x,y:p.y,r:radius,color:'#b3f5af',life:.8,maxLife:.8});}else{this.fields.push({x:p.x,y:p.y,r:235,life:5,tick:.01});this.ring(p.x,p.y,235,'#6bf4db',.7);}this.emit('impact',{kind:'ultimate'});}
 attack(){
  const p=this.player;if(p.action&&['dash','ultimate','hurt'].includes(p.action.name))return false;let target=null,nearest=p.range;
  for(const e of this.enemies){if(e.dead)continue;const d=distance(p,e);if(d<nearest){nearest=d;target=e;}}
  if(!target)return false;const angle=Math.atan2(target.y-p.y,target.x-p.x);p.facing=target.x<p.x?-1:1;
  const duration=Math.min(.32,p.interval*.85);this.animate('attack',duration,angle);this.pendingActions.push({kind:'attack',delay:duration*.5,angle,targetId:target.id});return true;
 }
 releaseAttack(action){
  const p=this.player,angle=action.angle;
  if(this.hero==='qingfeng'){
   this.effects.push({kind:'slash',x:p.x,y:p.y,angle,r:p.range,color:this.config.color,life:.26,maxLife:.26});
   for(const e of this.enemies){if(!e.dead&&distance(p,e)<p.range+e.r&&Math.abs(angleDifference(Math.atan2(e.y-p.y,e.x-p.x),angle))<1.48)this.hit(e,p.attack,110);}
  }else{
   for(let i=0;i<p.projectiles;i++){const a=angle+(i-(p.projectiles-1)/2)*.14;this.bullets.push({x:p.x+Math.cos(a)*24,y:p.y-18+Math.sin(a)*24,vx:Math.cos(a)*520,vy:Math.sin(a)*520,r:9,damage:p.attack,life:1.3,enemy:false,targetId:action.targetId,pierce:0,angle:a});}
  }
  this.emit('attack');return true;
 }
 beginUpgrade(){if(this.state!=='playing'||this.xp<this.xpNeeded)return false;this.xp-=this.xpNeeded;this.level++;this.xpNeeded=Math.round(7+this.level*3.5);this.state='upgrade';const pool=[...PERKS];this.choices=[];for(let i=0;i<3;i++)this.choices.push(pool.splice(Math.floor(this.random()*pool.length),1)[0]);this.emit('upgrade');return true;}
 chooseUpgrade(id){if(this.state!=='upgrade'||!this.choices.some(v=>v.id===id))return false;const p=this.player;
  if(id==='power')p.attack*=1.22;
  if(id==='haste'){p.interval=Math.max(.15,p.interval/1.18);p.cdScale=Math.max(.35,p.cdScale*.9);}
  if(id==='vitality'){p.maxHp+=25;this.heal(40);}
  if(id==='stride'){p.speed=Math.min(440,p.speed*1.15);p.magnet*=1.25;}
  if(id==='mastery'){if(this.hero==='qingfeng')p.range=Math.min(310,p.range*1.2);else p.projectiles=Math.min(6,p.projectiles+1);}
  if(id==='ward'){p.armor=Math.max(.35,p.armor*.85);this.heal(20);}
  p.invincible=Math.max(p.invincible,1);this.choices=[];this.state='playing';this.emit('upgraded');this.beginUpgrade();return true;
 }
 pause(){if(this.state==='playing'){this.state='paused';return true;}return false;}
 resume(){if(this.state==='paused'){this.state='playing';return true;}return false;}
 update(dt,input={x:0,y:0}){
  dt=clamp(dt,0,.05);if(['won','lost'].includes(this.state)){this.tickAnimation(dt);return;}if(this.state!=='playing')return;this.tickAnimation(dt);this.time+=dt;const p=this.player;this.wave=1+Math.floor(Math.min(this.time,74)/20);
  p.qCD=Math.max(0,p.qCD-dt);p.eCD=Math.max(0,p.eCD-dt);p.invincible=Math.max(0,p.invincible-dt);p.attackTimer-=dt;
  const length=hypot(input.x,input.y);const mx=length>1?input.x/length:input.x,my=length>1?input.y/length:input.y;p.moving=length>.08;
  if(p.moving){p.angle=Math.atan2(my,mx);if(Math.abs(mx)>.1&&!p.action)p.facing=mx>0?1:-1;p.step+=dt;if(p.step>.14){p.step=0;this.effects.push({kind:'step',x:p.x+(Math.floor(p.stride)%2?8:-8),y:p.y+18,r:10,color:'#bce8b7',life:.28,maxLife:.28});}}
  if(p.dash>0){this.trails.push({x:p.x,y:p.y,facing:p.facing,life:.2,stride:p.stride});if(this.trails.length>9)this.trails.shift();p.x+=p.dashX*1150*dt;p.y+=p.dashY*1150*dt;p.dash-=dt;if(this.random()<.5)this.burst(p.x,p.y,this.config.color,2);}
  else{p.x+=mx*p.speed*dt;p.y+=my*p.speed*dt;}
  p.x=clamp(p.x,WORLD.pad,WORLD.w-WORLD.pad);p.y=clamp(p.y,WORLD.pad,WORLD.h-WORLD.pad);
  const ready=[];for(const action of this.pendingActions){action.delay-=dt;if(action.delay<=0)ready.push(action);}this.pendingActions=this.pendingActions.filter(a=>a.delay>0);for(const action of ready){if(this.state!=='playing')break;if(action.kind==='attack')this.releaseAttack(action);else this.releaseUltimate();}
  if(p.attackTimer<=0){p.attackTimer=this.attack()?p.interval:.08;}
  this.spawnTimer-=dt;if(this.time<90&&this.spawnTimer<=0){this.spawnTimer=Math.max(.3,1.2-this.time*.01);if(this.enemies.length<78){this.spawnEnemy();if(this.time>38&&this.random()<.35)this.spawnEnemy();}}
  if(this.time>=75&&!this.bossSpawned)this.spawnEnemy('boss');
  for(const f of this.fields){f.life-=dt;f.tick-=dt;if(f.tick<=0){f.tick=.45;for(const e of this.enemies)if(!e.dead&&distance(f,e)<f.r)this.hit(e,p.attack*.8,0,f);}}
  this.fields=this.fields.filter(f=>f.life>0);
  for(const e of this.enemies){
   if(e.dead)continue;let dx=p.x-e.x,dy=p.y-e.y,dist=hypot(dx,dy)||1;e.angle=Math.atan2(dy,dx);e.flash=Math.max(0,e.flash-dt);let slow=1;for(const f of this.fields)if(distance(f,e)<f.r)slow=.35;
   if(e.type==='boss'){
    e.fire-=dt;e.chargeTimer-=dt;
    if(e.fire<=0){e.fire=2.7;for(let i=0;i<12;i++){const a=i/12*Math.PI*2+this.time*.15;this.bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*170,vy:Math.sin(a)*170,r:9,damage:14,life:5,enemy:true,angle:a});}this.ring(e.x,e.y,90,'#e792b7',.4);}
    if(e.chargeTimer<=0&&e.windup<=0&&e.charge<=0){e.chargeTimer=6;e.windup=.85;e.chargeX=dx/dist;e.chargeY=dy/dist;}
    if(e.windup>0){e.windup-=dt;if(e.windup<=0)e.charge=.6;}
    else if(e.charge>0){e.charge-=dt;e.x+=e.chargeX*450*dt;e.y+=e.chargeY*450*dt;}
    else{e.x+=dx/dist*e.speed*slow*dt;e.y+=dy/dist*e.speed*slow*dt;}
   }else{e.x+=dx/dist*e.speed*slow*dt;e.y+=dy/dist*e.speed*slow*dt;}
   e.x+=e.kx*dt;e.y+=e.ky*dt;e.kx*=Math.exp(-8*dt);e.ky*=Math.exp(-8*dt);e.x=clamp(e.x,75,WORLD.w-75);e.y=clamp(e.y,75,WORLD.h-75);
   if(distance(p,e)<p.r+e.r)this.hurt(e.damage);
  }
  for(let i=0;i<this.enemies.length;i++){const a=this.enemies[i];if(a.dead)continue;for(let j=i+1;j<this.enemies.length;j++){const b=this.enemies[j];if(b.dead)continue;const dx=b.x-a.x,dy=b.y-a.y,d=hypot(dx,dy)||.1,overlap=(a.r+b.r)*.77-d;if(overlap>0){const push=overlap*.5;a.x-=dx/d*push;a.y-=dy/d*push;b.x+=dx/d*push;b.y+=dy/d*push;}}}
  for(const b of this.bullets){
   b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.enemy){if(distance(b,p)<b.r+p.r){this.hurt(b.damage);b.life=0;}}
   else{if(b.targetId){const target=this.enemies.find(e=>e.id===b.targetId&&!e.dead);if(target){const a=Math.atan2(target.y-b.y,target.x-b.x);b.vx+=(Math.cos(a)*520-b.vx)*dt*3;b.vy+=(Math.sin(a)*520-b.vy)*dt*3;b.angle=Math.atan2(b.vy,b.vx);}}
    for(const e of this.enemies){if(!e.dead&&distance(b,e)<b.r+e.r){this.hit(e,b.damage,30,b);b.life=0;break;}}
   }
  }
  this.bullets=this.bullets.filter(b=>b.life>0);this.enemies=this.enemies.filter(e=>!e.dead);
  for(const d of this.drops){const dist=distance(d,p);if(dist<p.magnet){const speed=dist<35?600:330;const k=Math.min(1,dt*speed/(dist||1));d.x+=(p.x-d.x)*k;d.y+=(p.y-d.y)*k;}if(distance(d,p)<24){if(d.kind==='heal')this.heal(d.value);else this.xp+=d.value;d.collected=true;this.emit('pickup');}}
  this.drops=this.drops.filter(d=>!d.collected);if(this.drops.length>320){const old=this.drops.splice(0,70);this.drops[0].value+=old.reduce((s,d)=>s+d.value,0);}
  for(const v of this.effects)v.life-=dt;this.effects=this.effects.filter(v=>v.life>0);
  for(const v of this.particles){v.life-=dt;v.x+=v.vx*dt;v.y+=v.vy*dt;v.vx*=.96;v.vy*=.96;}this.particles=this.particles.filter(v=>v.life>0);
  for(const t of this.texts){t.life-=dt;t.y-=dt*34;}this.texts=this.texts.filter(t=>t.life>0);
  this.beginUpgrade();
 }
}
