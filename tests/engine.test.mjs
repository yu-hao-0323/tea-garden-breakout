import assert from 'node:assert/strict';
import {Game,WORLD} from '../dist/engine.js';

function seed(n=71){return ()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
function enemyAt(g,dx,dy,type='heavy'){const e=g.spawnEnemy(type);e.x=g.player.x+dx;e.y=g.player.y+dy;return e;}

const melee=new Game('qingfeng',seed());
const e=enemyAt(melee,100,0);melee.player.angle=0;
assert.equal(melee.useSkill('q'),true);assert.ok(e.hp<e.maxHp);
const firstX=melee.player.x;melee.update(.05,{x:1,y:0});assert.ok(melee.player.x>firstX+40);
assert.equal(melee.useSkill('q'),false,'cooldown prevents repeat activation');

const ranged=new Game('lingye',seed());ranged.player.hp=50;
const target=enemyAt(ranged,300,0);ranged.attack();assert.equal(ranged.bullets.length,0,'projectile waits for the casting pose');
assert.equal(target.hp,target.maxHp,'ranged damage requires projectile travel');
for(let i=0;i<40;i++)ranged.update(1/60);
assert.ok(target.hp<target.maxHp,'projectile hits its target');
ranged.useSkill('q');assert.equal(ranged.player.hp,64,'leaf dash heals');
ranged.useSkill('e');assert.equal(ranged.fields.length,0,'ultimate starts with a windup');
for(let i=0;i<22;i++)ranged.update(1/60);
assert.equal(ranged.fields.length,1,'leaf ultimate creates a persistent field on release');

const leveling=new Game('qingfeng',seed());leveling.xp=7;leveling.update(.01);
assert.equal(leveling.state,'upgrade');assert.equal(leveling.choices.length,3);
assert.equal(new Set(leveling.choices.map(c=>c.id)).size,3);
const stopped=leveling.time;leveling.update(.05,{x:1,y:0});assert.equal(leveling.time,stopped);
assert.equal(leveling.useSkill('e'),false);assert.equal(leveling.chooseUpgrade('invalid'),false);
assert.equal(leveling.chooseUpgrade(leveling.choices[0].id),true);assert.equal(leveling.state,'playing');
assert.equal(leveling.pause(),true);leveling.update(.05);assert.equal(leveling.time,stopped);
assert.equal(leveling.resume(),true);

const dead=new Game();dead.player.invincible=0;dead.hurt(999);assert.equal(dead.state,'lost');
const final=new Game();final.time=74.99;final.update(.02);assert.equal(final.bossSpawned,true);
assert.equal(final.enemies.filter(e=>e.type==='boss').length,1);
final.hit(final.boss,10000);assert.equal(final.state,'won');
assert.equal(new Game('lingye').state,'playing','restart creates a clean session');

// Long-running integration: both kits, random upgrades, edge clamping and capped collections.
for(const hero of ['qingfeng','lingye']){
 const g=new Game(hero,seed(82));g.player.hp=g.player.maxHp=5000;
 for(let i=0;i<7200&&g.state!=='won';i++){
  if(g.state==='upgrade')g.chooseUpgrade(g.choices[0].id);
  const p=g.player;let target=g.boss&&!g.boss.dead?g.boss:g.drops[0];
  if(!target)target=g.enemies[0]||{x:900,y:600};
  const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy)||1;
  const desired=hero==='qingfeng'?95:230;
  const advance=target.hp&&d<desired?-.1:1;
  const input={x:dx/d*advance,y:dy/d*advance};
  p.angle=Math.atan2(dy,dx);if(i%45===0)g.useSkill('e');if(i%30===0)g.useSkill('q');
  g.update(1/60,input);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.hp));
  assert.ok(p.x>=WORLD.pad&&p.x<=WORLD.w-WORLD.pad);
  assert.ok(p.y>=WORLD.pad&&p.y<=WORLD.h-WORLD.pad);
  assert.ok(g.particles.length<=300);g.takeEvents();
 }
 assert.equal(g.state,'won',`${hero} can reach and defeat the final boss`);
 console.log(`${hero}: complete run, ${g.kills} kills, level ${g.level}, ${g.time.toFixed(1)} seconds.`);
}
console.log('PASS: distinct kits, cooldowns, pause/upgrades, death, boss victory, restart, and complete runs.');
