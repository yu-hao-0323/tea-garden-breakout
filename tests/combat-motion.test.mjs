import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
import {poseFor} from '../dist/animation.js';

function arena(hero){
 const g=new Game(hero,()=>.5);g.spawnTimer=1000;g.player.invincible=1000;g.player.attackTimer=0;
 const e=g.spawnEnemy('heavy');e.x=g.player.x+90;e.y=g.player.y;e.hp=e.maxHp=100000;e.speed=0;
 return g;
}

for(const hero of ['qingfeng','lingye']){
 const g=arena(hero),p=g.player;
 assert.equal(g.attack(),true);
 const action=p.action,pending=g.pendingActions.length;
 assert.ok(action.duration>=.5,'normal attacks have a readable windup and recovery');
 assert.equal(g.attack(),false,'repeated attacks cannot restart an active pose');
 assert.equal(p.action,action);assert.equal(g.pendingActions.length,pending);
 const release=g.pendingActions[0].delay;
 assert.equal(poseFor({...p,action:{...action,elapsed:release-1e-5}},0,hero).frame,9);
 assert.equal(poseFor({...p,action:{...action,elapsed:release+1e-5}},0,hero).frame,10,'damage matches the strike frame');
 p.moveBlend=1;p.stride=1.25;
 const end=poseFor({...p,action:{...action,elapsed:action.duration}},0,hero);
 assert.equal(end.frame,0,'recover to the neutral pose before the next attack');
 assert.equal(Math.abs(end.x)+Math.abs(end.y),0,'running bounce does not jerk the final attack frame');
 for(let i=0;i<120;i++)g.update(1/60);
 assert.ok(g.enemies[0].hp<100000,'slower attacks still deal damage');

 // Repeated haste upgrades must not compress the four attack drawings into a flicker.
 const fast=arena(hero);
 for(let i=0;i<20;i++){fast.state='upgrade';fast.choices=[{id:'haste'}];fast.chooseUpgrade('haste');}
 assert.ok(fast.player.interval>=.60,'attack-speed upgrades have a readable cadence floor');
 let starts=0,lastAction=null,previousStart=-Infinity;
 for(let i=0;i<240;i++){
  const enemy=fast.enemies[0];enemy.x=fast.player.x+90;enemy.y=fast.player.y;enemy.kx=enemy.ky=0;
  fast.update(1/60);const current=fast.player.action;
  if(current?.name==='attack'&&current!==lastAction){
   assert.ok(fast.time-previousStart>=.59,'each swing retains a gap even at maximum haste');
   assert.ok(current.duration>=.48);previousStart=fast.time;starts++;
  }
  lastAction=current;
 }
 assert.ok(starts>=5&&starts<=7,'maximum haste stays responsive without rapid-fire pose changes');

 for(const interrupt of ['q','e','hurt']){
  const interrupted=arena(hero);interrupted.attack();
  if(interrupt==='hurt'){interrupted.player.invincible=0;interrupted.hurt(1);}else interrupted.useSkill(interrupt);
  assert.equal(interrupted.pendingActions.some(a=>a.kind==='attack'),false,'interrupted windups cannot produce invisible attacks');
 }
}
console.log('PASS: readable attack cadence, strike synchronization, recovery, haste floor and interrupted windups.');
