import assert from 'node:assert/strict';
import {Expedition,WEAPONS} from '../dist/expedition.js';
function seed(n=32){return ()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
function tick(g,seconds){for(let i=0;i<seconds*20;i++){if(g.state==='upgrade')g.chooseUpgrade(g.choices[0].id);g.update(.05);g.takeEvents();}}
// Complete five rooms via the actual finite spawn director, claim each chest exactly once,
// move to a real portal and retain earned equipment into the next room.
for(const hero of ['qingfeng','lingye']){
 const g=new Expedition(hero,'campaign',seed());g.player.invincible=9999;
 for(let stage=1;stage<=5;stage++){
  for(let i=0;i<3000&&g.phase==='combat';i++){
   if(g.state==='upgrade')g.chooseUpgrade(g.choices[0].id);
   g.update(.05);
   for(const e of [...g.enemies])g.hit(e,1e8);
  }
  assert.equal(g.phase,'chest','every room including final boss awards a chest');
  assert.equal(g.stage,stage);assert.equal(g.state,'playing');assert.equal(g.enemies.length,0);assert.equal(g.bullets.length,0);
  const time=g.time,hp=g.player.hp;g.hurt(1000);tick(g,2);assert.equal(g.time,time);assert.equal(g.player.hp,hp,'intermission is safe');
  assert.equal(g.useSkill('q'),false);assert.equal(g.enterPortal('bogus'),false);
  Object.assign(g.player,{x:g.chest.x,y:g.chest.y});assert.equal(g.interact(),true);assert.equal(g.state,'loot');
  const frozen=g.time;g.update(.05,{x:1,y:0});assert.equal(g.time,frozen);assert.equal(g.openChest(),false);
  assert.equal(new Set(g.loot.map(x=>x.id)).size,3);assert.equal(g.chooseLoot('unknown'),false);
  const reward=g.loot.find(c=>stage===1?c.kind==='weapon':c.kind==='relic')||g.loot[0];assert.equal(g.chooseLoot(reward.id),true);assert.equal(g.chooseLoot(reward.id),false);
  assert.equal(g.totalChests,stage);
  if(stage===5){assert.equal(g.state,'won');break;}
  assert.equal(g.phase,'portals');assert.equal(g.portals.length,stage===4?1:2);assert.equal(new Set(g.portals.map(p=>p.destination)).size,g.portals.length);
  const portal=g.portals[stage%g.portals.length];const oldWeapon=g.weapon;assert.equal(g.enterPortal(portal.id),false,'must approach the portal');
  Object.assign(g.player,{x:portal.x,y:portal.y});g.enterPortal(portal.id);assert.equal(g.stage,stage+1);assert.equal(g.weapon,oldWeapon);assert.equal(g.location,portal.destination);
  assert.equal(g.enterPortal(portal.id),false,'a portal cannot be claimed twice');
 }
 assert.equal(g.history.length,5);assert.equal(g.history.at(-1),'ruins');
 console.log('PASS:',hero,'five rooms, chest rewards, branch portals, final boss and victory');
}
// Endless mode survives beyond the old 90-second cutoff and bosses never end the run.
const endless=new Expedition('lingye','endless',seed(80));endless.player.invincible=9999;
for(let i=0;i<4000;i++){
 if(endless.state==='upgrade')endless.chooseUpgrade(endless.choices[0].id);
 if(endless.phase==='chest'){endless.openChest();endless.chooseLoot(endless.loot[0].id);}
 endless.update(.05);for(const e of [...endless.enemies])endless.hit(e,1e9);endless.takeEvents();
}
assert.ok(endless.time>195);assert.ok(endless.bossCount>=3);assert.notEqual(endless.state,'won');assert.ok(endless.roomKills>150);
console.log('PASS: endless continues beyond 3 minutes, periodic bosses, chest rewards and growing enemy waves');
// Equipped weapons really change collision behavior, not just the card's name.
const spear=new Expedition('qingfeng');spear.weapon='spear';spear.weaponLevels.spear=2;spear.spawnTimer=100;
const p=spear.player;const enemies=[100,160,220].map(dx=>{const e=spear.spawnEnemy('heavy');e.x=p.x+dx;e.y=p.y-15;e.speed=0;e.hp=e.maxHp=1e5;return e;});
spear.releaseAttack({angle:0});assert.equal(spear.bullets.length,1);assert.equal(spear.bullets[0].pierce,2);spear.player.attackTimer=100;tick(spear,.6);assert.ok(enemies.every(e=>e.hp<1e5),'spear hits three distinct targets');
const fan=new Expedition();fan.weapon='fan';fan.weaponLevels.fan=1;fan.releaseAttack({angle:0});assert.equal(fan.bullets.length,3);assert.ok(fan.bullets.every(b=>b.slow===2));
const ring=new Expedition();ring.weapon='ring';const near=ring.spawnEnemy('heavy');near.x=ring.player.x-100;near.y=ring.player.y;const hp=near.hp;ring.releaseAttack({angle:0});assert.ok(near.hp<hp,'ring hits behind the player too');
const relic=new Expedition();relic.player.hp=50;relic.relics.bell=2;relic.tickRelics(8);assert.equal(relic.player.hp,66);relic.relics.seal=3;relic.player.invincible=0;relic.hurt(10);assert.equal(relic.player.hp,59);
relic.relics.orb=1;const orbTarget=relic.spawnEnemy('heavy');orbTarget.x=relic.player.x+80;orbTarget.y=relic.player.y;const ohp=orbTarget.hp;relic.tickRelics(1.2);assert.ok(orbTarget.hp<ohp);
const frost=new Expedition();frost.location='frost';const caster=frost.spawnEnemy('shade');caster.cast=0;frost.tickLocation(.05);assert.ok(frost.bullets.some(b=>b.enemy),'frost enemies cast projectiles');
const fire=new Expedition();fire.location='ember';fire.hazardClock=0;fire.tickLocation(.05);assert.equal(fire.hazards.length,1);const fireHP=fire.player.hp;fire.player.invincible=0;for(let i=0;i<24;i++)fire.tickLocation(.05);assert.ok(fire.player.hp<fireHP,'telegraphed hazards deal damage after warning');
console.log('PASS: piercing/split/area weapons, relic effects, distinct location enemies and telegraphed hazards');
const paused=new Expedition();paused.pause();const before=paused.time;paused.update(.05);assert.equal(paused.time,before);paused.resume();assert.equal(paused.state,'playing');paused.player.invincible=0;paused.hurt(1e6);assert.equal(paused.state,'lost');assert.equal(new Expedition().totalChests,0);

const capped=new Expedition('qingfeng','campaign',()=>0);capped.relics={bell:3,orb:3,seal:3};capped.weapon='spear';capped.weaponLevels.spear=5;assert.equal(new Set(capped.rollLoot().map(c=>c.id)).size,3,'full relic inventory still gives three distinct rewards');assert.ok(!capped.rollLoot().some(c=>c.id==='weapon:spear'),'do not offer a no-op duplicate of the equipped max-level weapon');
