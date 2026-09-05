import {Expedition,LOCATIONS,WEAPONS,RELICS} from './expedition.js?v=journey4';
import {drawJourney,equipmentMarkup} from './journey-view.js?v=journey4';
import {floatingStick} from './joystick.js?v=lobby3';
import {HEROES,WORLD} from './engine.js?v=journey4';
import {poseFor,atlasCell} from './animation.js?v=journey4';
import {MONSTERS,monsterPose,prepareMonsters} from './monsters.js?v=journey4';
import {requiresLandscape} from './orientation.js?v=journey4';
const $=id=>document.getElementById(id),TAU=Math.PI*2;
let selected='qingfeng',selectedMode='campaign',game=null,images={},sprites={},atlases={},monsters={},audioEnabled=false,audioCtx=null,keys=new Set(),move={x:0,y:0},last=0,bannerUntil=4,shake=0,loaded=false,raf=0,lastHUD=0,resultDelay=null;
let previewClock=0,previewLast=0,previewManual=0,previewAction=null;
let orientationBlocked=false;
const canvas=$('game-canvas'),ctx=canvas.getContext('2d',{alpha:false});let width=1,height=1,dpr=1,zoom=1,camX=0,camY=0;
function show(id,on=true){$(id).hidden=!on;}
function hideDialogs(){['upgrade-screen','pause-screen','result-screen','help-screen','loot-screen','equipment-screen'].forEach(id=>show(id,false));}
function formatTime(n){return `${Math.floor(Math.max(n,0)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(n,0)%60).toString().padStart(2,'0')}`;}
function setHero(id){
 selected=id;const h=HEROES[id];$('hero-name').textContent=h.name;$('hero-role').textContent=h.role;$('hero-quote').textContent=h.quote;$('hero-description').textContent=h.description;$('hero-tag').textContent=h.tag;$('stat-hp').textContent=h.hp;$('stat-attack').textContent=h.attack;$('stat-speed').textContent=id==='qingfeng'?'★★★★':'★★★★★';document.querySelector('.hero-number').textContent=id==='qingfeng'?'01 / 02':'02 / 02';
 for(const key of ['passive','q','e']){const info=h[key];$(key+'-name').replaceChildren(document.createTextNode(info[0]+' '));const small=document.createElement('small');small.textContent=key==='passive'?'自动普攻':`${key.toUpperCase()} · ${info[2]} 秒`;$(key+'-name').append(small);$(key+'-desc').textContent=info[1];$(key+'-glyph').textContent=info[key==='passive'?2:3];}
 const art=$('hero-art');art.src=sprites[id]?.url||`./assets/${id}.png`;art.alt=`${h.name}：${h.role}，保留真人五官的 Q 版战斗角色`;art.style.animation='none';void art.offsetWidth;art.style.animation='';document.querySelector('.stage-caption').textContent='专属角色 · '+h.name;
 document.querySelectorAll('.character-card').forEach(b=>{b.classList.toggle('selected',b.dataset.hero===id);b.setAttribute('aria-pressed',String(b.dataset.hero===id));});
 if(loaded)$('start-label').textContent='以'+h.name+'之名 · 出战';
 previewClock=0;previewAction=null;previewManual=0;
 tone('select');
}
function soundToggle(){audioEnabled=!audioEnabled;if(audioEnabled)unlockAudio();document.querySelectorAll('.sound-button').forEach(b=>{b.setAttribute('aria-label',audioEnabled?'关闭音效':'开启音效');b.title=audioEnabled?'关闭音效':'开启音效';if(b.id==='sound-select')b.innerHTML=`♪<span>音效${audioEnabled?'开':'关'}</span>`;else b.textContent=audioEnabled?'关闭音效':'开启音效';});if(audioEnabled)tone('select');}
function unlockAudio(){try{audioCtx ||= new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});}catch{audioEnabled=false;}}
let lastTone=0;
function tone(kind){if(!audioEnabled||!audioCtx)return;const now=audioCtx.currentTime;if(kind==='attack'&&now-lastTone<.15)return;lastTone=now;const tones={attack:[560,.045,'triangle'],skill:[260,.25,'sine'],pickup:[920,.035,'sine'],upgrade:[660,.32,'sine'],hurt:[120,.15,'sawtooth'],won:[880,.6,'sine'],lost:[145,.5,'triangle'],select:[440,.08,'sine']};const [f,d,type]=tones[kind]||tones.attack;try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(kind==='skill'?700:f*.65,now+d);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.035,now+.01);g.gain.exponentialRampToValueAtTime(.0001,now+d);o.connect(g);g.connect(audioCtx.destination);o.start(now);o.stop(now+d+.02);}catch{}}
function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('资源载入失败'));image.src=src;});}
// Texture transparency is resolved at render time. The supplied art files remain intact.
function makeTexture(image,mode='checker'){
 const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const t=c.getContext('2d',{willReadFrequently:true});t.drawImage(image,0,0);const pixels=t.getImageData(0,0,c.width,c.height),p=pixels.data;
 for(let i=0;i<p.length;i+=4){if(mode==='magenta'){const gap=Math.min(p[i],p[i+2])-p[i+1];if(p[i]>130&&p[i+2]>110&&gap>65)p[i+3]=0;else if(gap>30&&p[i]>125&&p[i+2]>100){p[i+3]=Math.round(p[i+3]*(65-gap)/35);p[i]=Math.min(p[i],p[i+1]+35);p[i+2]=Math.min(p[i+2],p[i+1]+35);}}else{const hi=Math.max(p[i],p[i+1],p[i+2]),lo=Math.min(p[i],p[i+1],p[i+2]);if(lo>140&&hi-lo<13){p[i+3]=0;}else if(lo>165&&hi-lo<23){p[i+3]=Math.round(p[i+3]*(hi-lo-13)/10);}}}
 t.putImageData(pixels,0,0);return {image:c,url:c.toDataURL('image/png')};
}
function prepareAtlas(image,hero){const atlas=makeTexture(image,'magenta'),c=atlas.image,t=c.getContext('2d'),data=t.getImageData(0,0,c.width,c.height).data;atlas.frames=Array.from({length:16},(_,i)=>{const cell=atlasCell(i,c,hero);let baseline=cell.y+cell.h-1;for(let y=Math.floor(cell.y+cell.h)-1;y>=Math.ceil(cell.y);y--){let count=0;for(let x=Math.ceil(cell.x);x<Math.floor(cell.x+cell.w);x++)if(data[(y*c.width+x)*4+3]>170)count++;if(count>=5){baseline=y;break;}}return {...cell,baseline};});return atlas;}
async function loadAssets(){
 $('start-button').disabled=true;$('start-label').textContent='正在唤醒茶园…';$('asset-status').textContent='';
 try{const names=['qingfeng','lingye','garden','qingfeng-motion','lingye-motion','monsters','realms','chest'];const all=await Promise.all(names.map(k=>loadImage(`./assets/${k}.png`)));names.forEach((k,i)=>images[k]=all[i]);monsters=prepareMonsters(images.monsters,()=>document.createElement('canvas'));sprites.qingfeng=makeTexture(images.qingfeng);sprites.lingye=makeTexture(images.lingye);for(const hero of ['qingfeng','lingye'])atlases[hero]=prepareAtlas(images[hero+'-motion'],hero);document.querySelectorAll('.character-card').forEach(b=>b.querySelector('img').src=sprites[b.dataset.hero].url);$('select-screen').classList.add('assets-ready','has-motion');loaded=true;$('start-button').disabled=false;setHero(selected);}
 catch{loaded=false;$('asset-status').textContent='茶园素材暂时未能载入，请检查网络后重试。';$('start-label').textContent='重新载入';$('start-button').disabled=false;}
}
function syncOrientation(){const blocked=requiresLandscape({width:window.innerWidth,height:window.innerHeight,coarse:window.matchMedia('(pointer: coarse)').matches});if(blocked&&!orientationBlocked){pause();resetInput();}orientationBlocked=blocked;document.body.classList.toggle('needs-landscape',blocked);$('orientation-screen').setAttribute('aria-hidden',String(!blocked));for(const section of document.querySelectorAll('#app > section:not(#orientation-screen)'))section.inert=blocked;if(blocked)$('orientation-action').focus();}
async function requestLandscape(){try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch{}syncOrientation();if(orientationBlocked)$('orientation-hint').textContent='请关闭手机的竖排方向锁定，再将手机横过来。';}
function resize(){resetInput();width=window.innerWidth;height=window.innerHeight;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);const mobile=window.matchMedia('(pointer: coarse)').matches;zoom=mobile&&width>height?Math.max(.68,Math.min(.85,height/490)):width<760?.8:Math.min(1.12,Math.max(.85,width/1300));syncOrientation();}
function startGame(){if(orientationBlocked)return;if(!loaded){loadAssets();return;}hideDialogs();show('mode-screen',false);show('select-screen',false);show('play-screen');game=new Expedition(selected,selectedMode);resultDelay=null;resetInput();resize();const h=HEROES[selected];$('hud-name').textContent=h.name;$('hud-portrait').src=sprites[selected].url;for(const key of ['q','e']){const button=$('skill-'+key);button.setAttribute('aria-label',h[key][0]);button.querySelector('.skill-button-name').textContent=h[key][0];button.querySelector('b').textContent=h[key][3];}bannerUntil=4;setBanner(selectedMode==='campaign'?'青山茶园 · 第一关':'无尽守望',selectedMode==='campaign'?'清除敌人，开启宝箱，选择下一条路':'持续生存，击败首领后开启宝箱');$('boss-status').hidden=true;last=0;lastHUD=0;shake=0;unlockAudio();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);updateHUD();canvas.focus();}
function setBanner(title,subtitle,duration=3){$('game-banner').querySelector('strong').textContent=title;$('game-banner').querySelector('span').textContent=subtitle;$('game-banner').style.opacity='1';bannerUntil=(game?.time||0)+duration;}
function resetInput(){keys.clear();move.x=move.y=0;const held=joystickId;joystickId=null;$('joystick-knob').style.transform='';stick.style.left='';stick.style.top='';stick.classList.remove('active');if(held!==null&&zone.hasPointerCapture(held))zone.releasePointerCapture(held);}
function backToSelect(){cancelAnimationFrame(raf);game=null;resetInput();hideDialogs();show('play-screen',false);show('select-screen');setHero(selected);$('start-button').focus();}
function pause(){if(game?.pause()){resetInput();show('pause-screen');$('resume-button').focus();}}
function resume(){if(orientationBlocked)return;if(game?.resume()){show('pause-screen',false);last=0;}}
function triggerSkill(key){if(orientationBlocked||!game||game.state!=='playing')return;const vx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+move.x,vy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+move.y;if(Math.hypot(vx,vy)>.1)game.player.angle=Math.atan2(vy,vx);game.useSkill(key);}
function displayUpgrade(){resetInput();const holder=$('upgrade-options');holder.replaceChildren();for(const choice of game.choices){const b=document.createElement('button');b.className='upgrade-card';const desc=choice.id==='mastery'?(selected==='qingfeng'?'斩击范围扩大 20%，更容易扫中敌群。':'每次普攻额外发射一枚追踪飞叶。'):choice.desc;b.innerHTML=`<span class="upgrade-icon">${choice.icon}</span><h3>${choice.name}</h3><p>${desc}</p><small>${choice.type} · 选择强化 ↗</small>`;b.addEventListener('click',()=>{if(game?.chooseUpgrade(choice.id)){show('upgrade-screen',false);last=0;updateHUD();}});holder.append(b);}show('upgrade-screen');holder.querySelector('button').focus();}
function displayResult(won){resetInput();$('result-eyebrow').textContent=won?'茶园，再次迎来黎明':'暂别茶山，锋芒仍在';$('result-title').textContent=won?'五关通破':game.mode==='endless'?'守望告一段落':'此战惜败';$('result-journey').textContent=(game.mode==='endless'?'无尽第 '+game.stage+' 波':game.stage+' / 5 关 · '+game.place.name)+' · 已开宝箱 '+game.totalChests+' · '+game.weaponName+' Lv.'+game.weaponLevel;$('result-message').textContent=won?'风吹过茶山，这一抹新绿因你而留。':'试着边移动边攻击，留一个技能用来脱离包围。';$('result-kills').textContent=game.kills;$('result-time').textContent=formatTime(game.time);$('result-level').textContent=game.level;show('result-screen');$('retry-button').focus();}
function updateHUD(){if(!game)return;const p=game.player;$('health-fill').style.width=Math.max(0,p.hp/p.maxHp*100)+'%';$('health-text').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;const hp=$('health-fill').parentElement;hp.setAttribute('aria-valuemax',p.maxHp);hp.setAttribute('aria-valuenow',Math.ceil(p.hp));$('hud-level').textContent='Lv. '+game.level;$('kill-count').textContent=game.kills;$('xp-fill').style.width=Math.min(100,game.xp/game.xpNeeded*100)+'%';$('xp-fill').parentElement.setAttribute('aria-valuenow',Math.round(game.xp/game.xpNeeded*100));$('game-time').textContent=formatTime(game.time);$('wave-label').textContent=game.mode==='endless'?'无尽 · 第 '+game.stage+' 波':game.place.name;updateJourneyHUD();
 for(const key of ['q','e']){const cd=p[key+'CD'],b=$('skill-'+key);b.classList.toggle('on-cooldown',cd>.01);b.querySelector('.cooldown-text').textContent=cd>.01?Math.ceil(cd):'';b.querySelector('.cooldown-shade').style.transform=`scaleY(${cd/(game.config[key][2]*p.cdScale)})`;b.setAttribute('aria-label',game.config[key][0]+(cd>.01?'，冷却 '+Math.ceil(cd)+' 秒':'，可以释放'));}
 $('boss-status').hidden=!game.boss||game.boss.dead;if(game.boss){$('boss-name').textContent=game.boss.title||'月蚀茶魇';$('boss-fill').style.width=Math.max(0,game.boss.hp/game.boss.maxHp*100)+'%';$('boss-hp-text').textContent=Math.max(0,Math.ceil(game.boss.hp));}$('game-banner').style.opacity=game.time<bannerUntil?'1':'0';
}
function frame(now){if(!game)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;const x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+move.x,y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+move.y;if(!orientationBlocked)game.update(dt,{x,y});
 for(const event of game.takeEvents()){if(event.type==='upgrade'){displayUpgrade();tone('upgrade');}else if(event.type==='won'||event.type==='lost'){resultDelay={won:event.type==='won',left:event.type==='won'?.85:.65};tone(event.type);}else if(event.type==='room-clear'){resetInput();setBanner(game.finalChest?'首领已败 · 领取终章秘藏':'关卡已清 · 宝箱现身','恢复 18% 生命，技能已就绪；靠近宝箱开启',4);tone('upgrade');}else if(event.type==='loot'){displayLoot();}else if(event.type==='portals'){resetInput();setBanner(game.stage===4?'终点已现 · 月蚀遗庭':'两界之间 · 选择前路','靠近传送门，按 F 或点击进入',4);}else if(event.type==='entered'){resetInput();setBanner('第 '+game.stage+' 关 · '+game.place.name,game.place.risk,4);}else if(event.type==='equipped'){tone('upgrade');updateJourneyHUD();}else if(event.type==='boss'){setBanner(game.boss?.title||'茶魇现身',game.stage===5?'避开弹幕与冲撞；半血后留意地面落火':'避开弹幕与冲撞，击败后可开宝箱',4);shake=9;}else if(event.type==='skill'){tone('skill');shake=event.key==='e'?2:3;}else if(event.type==='impact'){shake=8;tone('skill');}else if(event.type==='hurt'){tone('hurt');shake=8;}else if(event.type==='attack'){tone('attack');}}
 if(resultDelay){resultDelay.left-=dt;if(resultDelay.left<=0){const won=resultDelay.won;resultDelay=null;displayResult(won);}}
 if(now-lastHUD>65){updateHUD();lastHUD=now;}render(dt);raf=requestAnimationFrame(frame);
}
function circle(x,y,r,fill,stroke,line=1){ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function render(dt){
 const p=game.player,viewW=width/zoom,viewH=height/zoom;camX=Math.max(0,Math.min(WORLD.w-viewW,p.x-viewW*.5));camY=Math.max(0,Math.min(WORLD.h-viewH,p.y-viewH*.51));if(viewW>WORLD.w)camX=(WORLD.w-viewW)/2;if(viewH>WORLD.h)camY=(WORLD.h-viewH)/2;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0b2626';ctx.fillRect(0,0,width,height);ctx.save();shake*=Math.exp(-dt*9);const sx=Math.sin(game.time*120)*shake,sy=Math.cos(game.time*95)*shake;ctx.translate(sx,sy);ctx.scale(zoom,zoom);ctx.translate(-camX,-camY);const cell=game.place.cell;if(cell<0)ctx.drawImage(images.garden,0,0,WORLD.w,WORLD.h);else{const art=images.realms,w=art.width/2,h=art.height/2;ctx.drawImage(art,(cell%2)*w,Math.floor(cell/2)*h,w,h,0,0,WORLD.w,WORLD.h);}ctx.fillStyle='#061f2b15';ctx.fillRect(0,0,WORLD.w,WORLD.h);
 // A restrained combat boundary keeps movement away from the scenic perimeter.
 ctx.strokeStyle='#8bcfb325';ctx.lineWidth=2;ctx.setLineDash([6,22]);ctx.strokeRect(WORLD.pad-22,WORLD.pad-22,WORLD.w-WORLD.pad*2+44,WORLD.h-WORLD.pad*2+44);ctx.setLineDash([]);
 for(let i=0;i<24;i++){const x=(i*173+Math.sin(game.time*.4+i)*35)%WORLD.w,y=(i*137+Math.cos(game.time*.6+i)*22)%WORLD.h;circle(x,y,1.7,'#d4e9a54a');}
 for(const f of game.fields){ctx.save();ctx.globalAlpha=Math.min(1,f.life);const gr=ctx.createRadialGradient(f.x,f.y,5,f.x,f.y,f.r);gr.addColorStop(0,'#88ffcc05');gr.addColorStop(.8,'#78f9d11e');gr.addColorStop(1,'#b0fff033');circle(f.x,f.y,f.r,gr,'#9bf9d78c',2);ctx.translate(f.x,f.y);ctx.rotate(game.time*.45);ctx.strokeStyle='#9afce288';ctx.lineWidth=2;ctx.setLineDash([15,22]);ctx.beginPath();ctx.arc(0,0,f.r-12,0,TAU);ctx.stroke();ctx.setLineDash([]);for(let i=0;i<7;i++){ctx.rotate(TAU/7);ctx.beginPath();ctx.ellipse(f.r*.68,0,13,5,.7,0,TAU);ctx.fillStyle='#a0ffe19c';ctx.fill();}ctx.restore();}
 drawJourney(ctx,game,images,performance.now()/1000);
 for(const d of game.drops){ctx.save();ctx.translate(d.x,d.y+Math.sin(game.time*3+d.seed)*2);ctx.shadowBlur=12;ctx.shadowColor=d.kind==='heal'?'#ffbaac':'#92ffc8';if(d.kind==='heal'){circle(0,0,8,'#e4d0ae','#fff3da',1);ctx.fillStyle='#346d49';ctx.fillRect(-4,-1,8,2);ctx.fillRect(-1,-4,2,8);}else{ctx.rotate(Math.PI/4);ctx.fillStyle='#97efc5';ctx.fillRect(-4,-4,8,8);ctx.fillStyle='#e3ffdd';ctx.fillRect(-2,-2,3,3);}ctx.restore();}
 for(const e of game.enemies){if(e.type==='boss'&&e.windup>0){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.atan2(e.chargeY,e.chargeX));ctx.fillStyle='#ea659536';ctx.strokeStyle='#ffa9c0aa';ctx.lineWidth=2;ctx.fillRect(0,-e.r,370,e.r*2);ctx.strokeRect(0,-e.r,370,e.r*2);ctx.restore();}}
 for(const trail of game.trails){ctx.save();ctx.translate(trail.x,trail.y);ctx.globalAlpha=trail.life/.2*.23;paintCharacter(ctx,game.hero,{frame:4+Math.floor(trail.stride)%4,flip:trail.facing,x:0,y:-4,rotation:.16*trail.facing,scaleX:1.05,scaleY:.96,alpha:1,glow:0},170);ctx.restore();}
 const ordered=[...game.enemies.map(e=>({kind:'enemy',item:e,y:e.y})),{kind:'player',item:p,y:p.y}].sort((a,b)=>a.y-b.y);for(const o of ordered){if(o.kind==='player')drawPlayer(p);else drawEnemy(o.item);}
 for(const b of game.bullets){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);ctx.shadowColor=b.color||(b.enemy?'#db74be':'#b1ffe1');ctx.shadowBlur=b.enemy?10:15;if(b.enemy){circle(0,0,b.r,b.color||'#da80ba','#f9bfdb',1.5);circle(-1,-1,3,'#fff0ef');}else{ctx.fillStyle=b.color||'#cbffdf';ctx.beginPath();ctx.ellipse(0,0,b.weapon==='spear'?26:16,b.weapon==='spear'?3:5,0,0,TAU);ctx.fill();ctx.strokeStyle='#62cf9c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(12,0);ctx.stroke();}ctx.restore();}
 for(const e of game.effects)drawEffect(e);
 for(const v of game.particles){ctx.globalAlpha=Math.min(1,v.life*2);circle(v.x,v.y,v.r,v.color);}ctx.globalAlpha=1;
 for(const t of game.texts){ctx.globalAlpha=Math.min(1,t.life*3);ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#15322ed9';ctx.strokeText(t.label,t.x,t.y);ctx.fillStyle=t.color;ctx.fillText(t.label,t.x,t.y);}ctx.globalAlpha=1;
 ctx.restore();
 if(p.hp/p.maxHp<.25){ctx.fillStyle=`rgba(160,25,55,${.035+Math.sin(game.time*4)*.02})`;ctx.fillRect(0,0,width,height);}
 drawBossArrow();
}
function drawPlayer(p){
 ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(0,14,35,12,0,0,TAU);ctx.fill();circle(0,8,27,null,game.config.color+'9c',2);if(p.invincible>0){circle(0,-15,52,'#b9ffd507','#c2ffd847',2);}
 const pose=poseFor(p,game.time,game.hero);ctx.globalAlpha=p.invincible>0&&Math.floor(game.time*16)%2===0?.78:1;paintCharacter(ctx,game.hero,pose,170);ctx.restore();
}
function paintCharacter(context,hero,pose,size){
 const image=atlases[hero].image,cell=atlases[hero].frames[pose.frame],scale=size/cell.w;context.save();context.translate(pose.x,pose.y);context.rotate(pose.rotation);context.scale(pose.flip*pose.scaleX,pose.scaleY);context.globalAlpha*=pose.alpha;
 if(pose.glow>0){context.shadowBlur=22*pose.glow;context.shadowColor=HEROES[hero].color;}
 context.drawImage(image,cell.x,cell.y,cell.w,cell.h,-size/2,22-(cell.baseline-cell.y)*scale,size,cell.h*scale);context.restore();
}
function previewFrame(now){
 const dt=previewLast?Math.min(.05,(now-previewLast)/1000):0;previewLast=now;
 if(loaded&&!orientationBlocked&&!$('select-screen').hidden){
  previewClock+=dt;const c=$('hero-preview'),pc=c.getContext('2d');pc.clearRect(0,0,c.width,c.height);
  if(previewAction){previewAction.elapsed+=dt;if(previewAction.elapsed>previewAction.duration)previewAction=null;}
  const sequence=previewClock%10;const running=sequence>3&&sequence<4.6;let action=previewAction;
  if(!action&&sequence>5.4&&sequence<6)action={name:'attack',elapsed:sequence-5.4,duration:.6,facing:1};
  if(!action&&sequence>7.6&&sequence<8.6)action={name:'ultimate',elapsed:sequence-7.6,duration:1,facing:1};
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pose=poseFor({facing:1,moveBlend:reduce?0:Number(running),stride:previewClock*8,action:reduce&&!previewAction?null:action},reduce?0:previewClock,selected);
  pc.save();pc.translate(c.width/2,c.height*.91);paintCharacter(pc,selected,pose,c.width*1.12);pc.restore();
 }
 requestAnimationFrame(previewFrame);
}
function drawEnemy(e){
 const art=MONSTERS[e.type],sprite=monsters[e.type],size=art.height*(e.elite?1.15:1);
 if(e.x<camX-size||e.x>camX+width/zoom+size||e.y<camY-size||e.y>camY+height/zoom+size)return;
 const pose=monsterPose(e,game.time);e.facing=pose.facing;
 const spriteW=size*sprite.image.width/sprite.image.height,feet=e.r*.7;
 ctx.save();ctx.translate(e.x,e.y);
 ctx.fillStyle='#00171380';ctx.beginPath();ctx.ellipse(0,feet,e.r*.95,e.r*.32,0,0,TAU);ctx.fill();
 if(e.type==='boss'){
  const charge=e.windup>0||e.charge>0;
  circle(0,feet,e.r*1.12,null,charge?'#ff9cbdc0':'#db80b65c',charge?3:1.5);
 }
 ctx.save();ctx.translate(0,feet+pose.y);ctx.scale(pose.facing,1);ctx.rotate(pose.rotation);ctx.scale(pose.scaleX,pose.scaleY);
 ctx.drawImage(monsterVariant(e,sprite),-spriteW/2,-size,spriteW,size);
 if(pose.impact>0){ctx.globalAlpha=pose.impact*.65;ctx.drawImage(sprite.flash,-spriteW/2,-size,spriteW,size);ctx.globalAlpha=1;}
 ctx.restore();
 if(e.hp<e.maxHp&&e.type!=='boss'){
  const barW=e.r*1.7,barY=feet-size-8;
  ctx.fillStyle='#041b21d9';ctx.fillRect(-barW/2-1,barY-1,barW+2,5);
  ctx.fillStyle=art.color;ctx.fillRect(-barW/2,barY,barW*Math.max(0,e.hp/e.maxHp),3);if(e.elite||(e.variant&&e.variant!=='garden')){ctx.font='13px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#061b20';ctx.strokeText(e.title,0,barY-7);ctx.fillStyle=e.elite?'#ffd887':LOCATIONS[e.variant].color;ctx.fillText(e.title,0,barY-7);}
 }
 ctx.restore();
}
function drawEffect(e){const progress=1-e.life/e.maxLife;ctx.save();ctx.globalAlpha=(1-progress)*.85;ctx.translate(e.x,e.y);ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.shadowColor=e.color;ctx.shadowBlur=14;
 if(e.kind==='ring'){ctx.lineWidth=3*(1-progress)+1;ctx.beginPath();ctx.arc(0,0,e.r*(.2+progress*.8),0,TAU);ctx.stroke();}
 if(e.kind==='slash'){ctx.rotate(e.angle);ctx.lineWidth=11*(1-progress)+2;ctx.beginPath();ctx.arc(0,0,e.r*(.55+progress*.4),-1.35,1.35);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.r*(.7+progress*.25),-1.2,1.1);ctx.stroke();}
 if(e.kind==='dash'){ctx.rotate(e.angle);ctx.lineWidth=22*(1-progress);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(e.r,0);ctx.stroke();}
 if(e.kind==='nova'){ctx.rotate(progress*3);for(let i=0;i<10;i++){ctx.rotate(TAU/10);ctx.beginPath();ctx.ellipse(e.r*progress,0,22,5,-.5,0,TAU);ctx.fill();}}
 if(e.kind==='step'){ctx.shadowBlur=0;ctx.globalAlpha=(1-progress)*.24;ctx.beginPath();ctx.ellipse(0,0,e.r*(.5+progress),3+progress*4,0,0,TAU);ctx.fill();}
 ctx.restore();}
function drawBossArrow(){if(!game.boss||game.boss.dead)return;const b=game.boss,x=(b.x-camX)*zoom,y=(b.y-camY)*zoom;if(x>45&&x<width-45&&y>100&&y<height-100)return;const p=game.player,a=Math.atan2(b.y-p.y,b.x-p.x),ax=Math.max(30,Math.min(width-30,x)),ay=Math.max(135,Math.min(height-155,y));ctx.save();ctx.translate(ax,ay);ctx.rotate(a);ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-6,-8);ctx.lineTo(-6,8);ctx.closePath();ctx.fillStyle='#f0a8c7';ctx.fill();ctx.restore();ctx.font='11px system-ui';ctx.fillStyle='#f2c0d7';ctx.textAlign='center';ctx.fillText('茶魇',ax,ay+23);}
let joystickId=null;
const stick=$('joystick'),zone=$('joystick-zone');
let stickCenter={x:0,y:0};
function stickBounds(){const r=zone.getBoundingClientRect(),radius=stick.offsetWidth/2;return {left:r.left+radius,right:r.right-radius,top:r.top+radius,bottom:r.bottom-radius};}
function placeStick(){const r=zone.getBoundingClientRect();stick.style.left=`${stickCenter.x-r.left-stick.offsetWidth/2}px`;stick.style.top=`${stickCenter.y-r.top-stick.offsetHeight/2}px`;}
function updateStick(event){const max=stick.offsetWidth*.33,result=floatingStick(stickCenter,{x:event.clientX,y:event.clientY},max,stickBounds());stickCenter=result.center;move.x=result.x;move.y=result.y;placeStick();$('joystick-knob').style.transform=`translate(${result.x*max}px,${result.y*max}px)`;}
zone.addEventListener('pointerdown',e=>{if(orientationBlocked||game?.state!=='playing'||joystickId!==null||e.button!==0)return;e.preventDefault();joystickId=e.pointerId;zone.setPointerCapture(e.pointerId);const b=stickBounds();stickCenter={x:Math.max(b.left,Math.min(b.right,e.clientX)),y:Math.max(b.top,Math.min(b.bottom,e.clientY))};stick.classList.add('active');placeStick();updateStick(e);});
zone.addEventListener('pointermove',e=>{if(e.pointerId===joystickId){e.preventDefault();updateStick(e);}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(event,e=>{if(e.pointerId===joystickId)resetInput();});
for(const key of ['q','e']){$('skill-'+key).addEventListener('pointerdown',e=>{e.preventDefault();triggerSkill(key);});$('skill-'+key).addEventListener('click',()=>triggerSkill(key));}
window.addEventListener('keydown',e=>{if(orientationBlocked)return;const k=e.key.toLowerCase();if(k==='escape'){e.preventDefault();if(!$('equipment-screen').hidden){closeEquipment();return;}if(!$('help-screen').hidden){show('help-screen',false);$('help-open').focus();return;}if(game?.state==='playing')pause();else if(game?.state==='paused')resume();return;}if(game?.state!=='playing')return;if(k==='f'){e.preventDefault();if(!e.repeat)interact();return;}if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','q','e',' '].includes(k)){e.preventDefault();keys.add(k);}if(!e.repeat){if(k==='q'||k===' ')triggerSkill('q');if(k==='e')triggerSkill('e');}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('resize',resize);
// Keep keyboard focus inside the currently visible dialog.
document.addEventListener('keydown',e=>{if(e.key!=='Tab')return;if(orientationBlocked){e.preventDefault();$('orientation-action').focus();return;}const modal=[...document.querySelectorAll('.modal-screen')].find(m=>!m.hidden);if(!modal)return;const focusable=[...modal.querySelectorAll('button:not([disabled]),a[href]')];if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
document.querySelectorAll('.character-card').forEach(b=>b.addEventListener('click',()=>setHero(b.dataset.hero)));document.querySelectorAll('.sound-button').forEach(b=>b.addEventListener('click',soundToggle));$('start-button').addEventListener('click',startGame);$('pause-button').addEventListener('click',pause);$('resume-button').addEventListener('click',resume);$('quit-button').addEventListener('click',backToSelect);$('retry-button').addEventListener('click',startGame);$('choose-button').addEventListener('click',backToSelect);$('help-open').addEventListener('click',()=>{show('help-screen');$('help-close').focus();});for(const id of ['help-close','help-ready'])$(id).addEventListener('click',()=>{show('help-screen',false);$('help-open').focus();});
$('preview-action').addEventListener('click',()=>{previewManual++;previewAction={name:previewManual%2?'attack':'ultimate',elapsed:0,duration:previewManual%2?.6:.9,facing:1};tone('select');});
$('orientation-action').addEventListener('click',requestLandscape);window.matchMedia('(orientation: portrait)').addEventListener('change',resize);document.addEventListener('fullscreenchange',resize);
resize();loadAssets();requestAnimationFrame(previewFrame);

function chooseMode(mode){selectedMode=mode;show('mode-screen',false);show('select-screen');$('change-mode').textContent=(mode==='campaign'?'闯关':'无尽')+' · 更换模式';$('mode-description').textContent=mode==='campaign'?'分支路线 · 收集装备 · 终点首领':'持续生存 · 周期首领 · 宝箱成长';$('start-button').focus();}
document.querySelectorAll('.mode-option').forEach(b=>b.addEventListener('click',()=>chooseMode(b.dataset.mode)));
$('change-mode').addEventListener('click',()=>{show('select-screen',false);show('mode-screen');document.querySelector('.mode-option').focus();});
function interact(){if(orientationBlocked)return;if(game?.interact()){resetInput();updateJourneyHUD();}}
$('interact-button').addEventListener('click',interact);
function displayLoot(){resetInput();const holder=$('loot-options');holder.replaceChildren();$('loot-title').textContent=game.finalChest?'终章秘藏 · 最后的馈赠':'秘藏三选一';const labels={weapon:'武器 · 装备 / 升阶',relic:'法宝 · 本局被动',forge:'锻造 · 武器升级',card:'卡牌 · 角色强化'};for(const choice of game.loot){const b=document.createElement('button');b.className='upgrade-card loot-card '+choice.kind;b.innerHTML=`<span class="upgrade-icon">${choice.icon}</span><small class="loot-kind">${labels[choice.kind]}</small><h3>${choice.name}</h3><p>${choice.desc}</p><strong class="loot-take">选择这件 ↗</strong>`;b.addEventListener('click',()=>{if(orientationBlocked)return;if(game?.chooseLoot(choice.id)){show('loot-screen',false);last=0;updateHUD();canvas.focus();}});holder.append(b);}show('loot-screen');holder.querySelector('button').focus();}
function updateJourneyHUD(){
 if(!game)return;$('journey-objective').textContent=game.objective;const n=game.mode==='campaign'?game.stage:0;$('route-progress').textContent=n?Array.from({length:5},(_,i)=>i+1<n?'●':i+1===n?'◉':'○').join(' ─ '):'每 60 秒首领来袭';
 $('equipment-summary').textContent=WEAPONS[game.weapon].icon+' '+game.weaponName+' Lv.'+game.weaponLevel+(Object.keys(game.relics).length?' · 法宝 '+Object.keys(game.relics).length:'');
 $('route-hint').textContent=game.phase==='portals'?game.portals.map(p=>p.direction+'：'+LOCATIONS[p.destination].name).join('  /  '):'';
 const target=game.nearby();$('interact-button').hidden=!target;$('interact-button').textContent=target?target.label+' · F':'';
 document.querySelector('.combat-controls').hidden=game.phase!=='combat';
}
function openEquipment(){if(orientationBlocked||!game?.pause())return;resetInput();$('equipment-detail').innerHTML=equipmentMarkup(game);show('equipment-screen');$('equipment-close').focus();}
function closeEquipment(){if(orientationBlocked)return;show('equipment-screen',false);game?.resume();last=0;canvas.focus();}
$('equipment-button').addEventListener('click',openEquipment);$('equipment-close').addEventListener('click',closeEquipment);
const monsterTints=new Map();
function monsterVariant(enemy,sprite){if(!enemy.variant||enemy.variant==='garden')return sprite.image;const key=enemy.variant+enemy.type;if(monsterTints.has(key))return monsterTints.get(key);const c=document.createElement('canvas');c.width=sprite.image.width;c.height=sprite.image.height;const t=c.getContext('2d');t.drawImage(sprite.image,0,0);t.globalCompositeOperation='source-atop';t.fillStyle=LOCATIONS[enemy.variant].color+'48';t.fillRect(0,0,c.width,c.height);monsterTints.set(key,c);return c;}
