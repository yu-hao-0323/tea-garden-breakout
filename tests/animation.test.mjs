import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
import {poseFor,atlasCell,CLIPS} from '../dist/animation.js';
for(const hero of ['qingfeng','lingye']){
 const g=new Game(hero,()=>.5),p=g.player;
 const runFrames=new Set();for(let i=0;i<45;i++){g.update(1/60,{x:1,y:0});runFrames.add(poseFor(p,g.time,hero).frame);}
 for(const f of CLIPS.run)assert.ok(runFrames.has(f),'running must show four genuinely different poses');
 const e=g.spawnEnemy('heavy');e.x=p.x+100;e.y=p.y;g.attack();
 const health=e.hp;assert.equal(p.action.name,'attack');assert.equal(poseFor(p,g.time,hero).frame,8);
 for(let i=0;i<5;i++)g.update(1/60);assert.equal(e.hp,health,'windup must not deal early damage');
 for(let i=0;i<14;i++)g.update(1/60);assert.ok(e.hp<health||g.bullets.length>0,'strike releases its damage/projectile');
 g.useSkill('e');assert.equal(p.action.name,'ultimate');assert.equal(g.attack(),false,'auto attack must not replace the ultimate pose');
 const elapsed=p.action.elapsed;g.pause();g.update(.05);assert.equal(p.action.elapsed,elapsed,'pause freezes animation');g.resume();
 for(let i=0;i<45;i++)g.update(1/60);g.useSkill('q');assert.equal(p.action.name,'dash');g.update(.02);assert.ok(g.trails.length>0);
 for(let i=0;i<50;i++)g.update(1/60);p.invincible=0;g.hurt(1);assert.equal(p.action.name,'hurt');
 p.invincible=0;g.hurt(10000);assert.equal(p.action.name,'defeat');g.update(.05);assert.ok(poseFor(p,g.time,hero).rotation!==0);
 const image={width:1254,height:1254};for(let f=0;f<16;f++){const c=atlasCell(f,image,hero);assert.ok(c.x>=0&&c.y>=0&&c.x+c.w<=1254.01&&c.y+c.h<=1254.01);}
}
console.log('PASS: 4-frame running, timed strikes, skill priority, pause, dash trails, reactions, and all 32 atlas cells.');
