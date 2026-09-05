import {Game,HEROES,WORLD} from './engine.js?v=motion2';
import {poseFor,atlasCell} from './animation.js?v=motion2';
import {requiresLandscape} from './orientation.js?v=motion2';
const $=id=>document.getElementById(id),TAU=Math.PI*2;
let selected='qingfeng',game=null,images={},sprites={},atlases={},audioEnabled=false,audioCtx=null,keys=new Set(),move={x:0,y:0},last=0,bannerUntil=4,shake=0,loaded=false,raf=0,lastHUD=0,resultDelay=null;
let previewClock=0,previewLast=0,previewManual=0,previewAction=null;
let orientationBlocked=false;
const canvas=$('game-canvas'),ctx=canvas.getContext('2d',{alpha:false});let width=1,height=1,dpr=1,zoom=1,camX=0,camY=0;
function show(id,on=true){$(id).hidden=!on;}
function hideDialogs(){['upgrade-screen','pause-screen','result-screen','help-screen'].forEach(id=>show(id,false));}
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
 try{const names=['qingfeng','lingye','garden','qingfeng-motion','lingye-motion'];const all=await Promise.all(names.map(k=>loadImage(`./assets/${k}.png`)));names.forEach((k,i)=>images[k]=all[i]);sprites.qingfeng=makeTexture(images.qingfeng);sprites.lingye=makeTexture(images.lingye);for(const hero of ['qingfeng','lingye'])atlases[hero]=prepareAtlas(images[hero+'-motion'],hero);document.querySelectorAll('.character-card').forEach(b=>b.querySelector('img').src=sprites[b.dataset.hero].url);$('select-screen').classList.add('assets-ready','has-motion');loaded=true;$('start-button').disabled=false;setHero(selected);}
 catch{loaded=false;$('asset-status').textContent='茶园素材暂时未能载入，请检查网络后重试。';$('start-label').textContent='重新载入';$('start-button').disabled=false;}
}
function syncOrientation(){const blocked=requiresLandscape({width:window.innerWidth,height:window.innerHeight,coarse:window.matchMedia('(pointer: coarse)').matches});if(blocked&&!orientationBlocked){pause();resetInput();}orientationBlocked=blocked;document.body.classList.toggle('needs-landscape',blocked);$('orientation-screen').setAttribute('aria-hidden',String(!blocked));for(const section of document.querySelectorAll('#app > section:not(#orientation-screen)'))section.inert=blocked;if(blocked)$('orientation-action').focus();}
async function requestLandscape(){try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch{}syncOrientation();if(orientationBlocked)$('orientation-hint').textContent='请关闭手机的竖排方向锁定，再将手机横过来。';}
function resize(){width=window.innerWidth;height=window.innerHeight;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);const mobile=window.matchMedia('(pointer: coarse)').matches;zoom=mobile&&width>height?Math.max(.68,Math.min(.85,height/490)):width<760?.8:Math.min(1.12,Math.max(.85,width/1300));syncOrientation();}
function startGame(){if(orientationBlocked)return;if(!loaded){loadAssets();return;}hideDialogs();show('select-screen',false);show('play-screen');game=new Game(selected);resultDelay=null;resetInput();resize();const h=HEROES[selected];$('hud-name').textContent=h.name;$('hud-portrait').src=sprites[selected].url;for(const key of ['q','e']){const button=$('skill-'+key);button.setAttribute('aria-label',h[key][0]);button.querySelector('.skill-button-name').textContent=h[key][0];button.querySelector('b').textContent=h[key][3];}bannerUntil=4;setBanner('守住茶园','收集灵露升级，击败最终首领');$('boss-status').hidden=true;last=0;lastHUD=0;shake=0;unlockAudio();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);updateHUD();canvas.focus();}
function setBanner(title,subtitle,duration=3){$('game-banner').querySelector('strong').textContent=title;$('game-banner').querySelector('span').textContent=subtitle;$('game-banner').style.opacity='1';bannerUntil=(game?.time||0)+duration;}
function resetInput(){keys.clear();move.x=move.y=0;joystickId=null;$('joystick-knob').style.transform='';}
function backToSelect(){cancelAnimationFrame(raf);game=null;resetInput();hideDialogs();show('play-screen',false);show('select-screen');setHero(selected);$('start-button').focus();}
function pause(){if(game?.pause()){resetInput();show('pause-screen');$('resume-button').focus();}}
function resume(){if(orientationBlocked)return;if(game?.resume()){show('pause-screen',false);last=0;}}
function triggerSkill(key){if(orientationBlocked||!game||game.state!=='playing')return;const vx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+move.x,vy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+move.y;if(Math.hypot(vx,vy)>.1)game.player.angle=Math.atan2(vy,vx);game.useSkill(key);}
function displayUpgrade(){resetInput();const holder=$('upgrade-options');holder.replaceChildren();for(const choice of game.choices){const b=document.createElement('button');b.className='upgrade-card';const desc=choice.id==='mastery'?(selected==='qingfeng'?'斩击范围扩大 20%，更容易扫中敌群。':'每次普攻额外发射一枚追踪飞叶。'):choice.desc;b.innerHTML=`<span class="upgrade-icon">${choice.icon}</span><h3>${choice.name}</h3><p>${desc}</p><small>${choice.type} · 选择强化 ↗</small>`;b.addEventListener('click',()=>{if(game?.chooseUpgrade(choice.id)){show('upgrade-screen',false);last=0;updateHUD();}});holder.append(b);}show('upgrade-screen');holder.querySelector('button').focus();}
function displayResult(won){resetInput();$('result-eyebrow').textContent=won?'茶园，再次迎来黎明':'暂别茶山，锋芒仍在';$('result-title').textContent=won?'守护成功':'此战惜败';$('result-message').textContent=won?'风吹过茶山，这一抹新绿因你而留。':'试着边移动边攻击，留一个技能用来脱离包围。';$('result-kills').textContent=game.kills;$('result-time').textContent=formatTime(game.time);$('result-level').textContent=game.level;show('result-screen');$('retry-button').focus();}
function updateHUD(){if(!game)return;const p=game.player;$('health-fill').style.width=Math.max(0,p.hp/p.maxHp*100)+'%';$('health-text').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;const hp=$('health-fill').parentElement;hp.setAttribute('aria-valuemax',p.maxHp);hp.setAttribute('aria-valuenow',Math.ceil(p.hp));$('hud-level').textContent='Lv. '+game.level;$('kill-count').textContent=game.kills;$('xp-fill').style.width=Math.min(100,game.xp/game.xpNeeded*100)+'%';$('xp-fill').parentElement.setAttribute('aria-valuenow',Math.round(game.xp/game.xpNeeded*100));$('game-time').textContent=game.time>=90?'决 战':formatTime(90-game.time);$('wave-label').textContent=game.bossSpawned?'首领现身':['第一波 · 初雾','第二波 · 暗涌','第三波 · 夜袭','第四波 · 风暴'][game.wave-1];
 for(const key of ['q','e']){const cd=p[key+'CD'],b=$('skill-'+key);b.classList.toggle('on-cooldown',cd>.01);b.querySelector('.cooldown-text').textContent=cd>.01?Math.ceil(cd):'';b.querySelector('.cooldown-shade').style.transform=`scaleY(${cd/(game.config[key][2]*p.cdScale)})`;b.setAttribute('aria-label',game.config[key][0]+(cd>.01?'，冷却 '+Math.ceil(cd)+' 秒':'，可以释放'));}
 if(game.boss){$('boss-status').hidden=game.boss.dead;$('boss-fill').style.width=Math.max(0,game.boss.hp/game.boss.maxHp*100)+'%';$('boss-hp-text').textContent=Math.max(0,Math.ceil(game.boss.hp));}$('game-banner').style.opacity=game.time<bannerUntil?'1':'0';
}
function frame(now){if(!game)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;const x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+move.x,y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+move.y;if(!orientationBlocked)game.update(dt,{x,y});
 for(const event of game.takeEvents()){if(event.type==='upgrade'){displayUpgrade();tone('upgrade');}else if(event.type==='won'||event.type==='lost'){resultDelay={won:event.type==='won',left:event.type==='won'?.85:.65};tone(event.type);}else if(event.type==='boss'){setBanner('茶魇现身','避开紫色弹幕，抓住间隙全力反击',4);shake=9;}else if(event.type==='skill'){tone('skill');shake=event.key==='e'?2:3;}else if(event.type==='impact'){shake=8;tone('skill');}else if(event.type==='hurt'){tone('hurt');shake=8;}else if(event.type==='attack'){tone('attack');}}
 if(resultDelay){resultDelay.left-=dt;if(resultDelay.left<=0){const won=resultDelay.won;resultDelay=null;displayResult(won);}}
 if(now-lastHUD>65){updateHUD();lastHUD=now;}render(dt);raf=requestAnimationFrame(frame);
}
function circle(x,y,r,fill,stroke,line=1){ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function render(dt){
 const p=game.player,viewW=width/zoom,viewH=height/zoom;camX=Math.max(0,Math.min(WORLD.w-viewW,p.x-viewW*.5));camY=Math.max(0,Math.min(WORLD.h-viewH,p.y-viewH*.51));if(viewW>WORLD.w)camX=(WORLD.w-viewW)/2;if(viewH>WORLD.h)camY=(WORLD.h-viewH)/2;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0b2626';ctx.fillRect(0,0,width,height);ctx.save();shake*=Math.exp(-dt*9);const sx=Math.sin(game.time*120)*shake,sy=Math.cos(game.time*95)*shake;ctx.translate(sx,sy);ctx.scale(zoom,zoom);ctx.translate(-camX,-camY);ctx.drawImage(images.garden,0,0,WORLD.w,WORLD.h);ctx.fillStyle='#06352c19';ctx.fillRect(0,0,WORLD.w,WORLD.h);
 // A restrained combat boundary keeps movement away from the scenic perimeter.
 ctx.strokeStyle='#8bcfb325';ctx.lineWidth=2;ctx.setLineDash([6,22]);ctx.strokeRect(WORLD.pad-22,WORLD.pad-22,WORLD.w-WORLD.pad*2+44,WORLD.h-WORLD.pad*2+44);ctx.setLineDash([]);
 for(let i=0;i<24;i++){const x=(i*173+Math.sin(game.time*.4+i)*35)%WORLD.w,y=(i*137+Math.cos(game.time*.6+i)*22)%WORLD.h;circle(x,y,1.7,'#d4e9a54a');}
 for(const f of game.fields){ctx.save();ctx.globalAlpha=Math.min(1,f.life);const gr=ctx.createRadialGradient(f.x,f.y,5,f.x,f.y,f.r);gr.addColorStop(0,'#88ffcc05');gr.addColorStop(.8,'#78f9d11e');gr.addColorStop(1,'#b0fff033');circle(f.x,f.y,f.r,gr,'#9bf9d78c',2);ctx.translate(f.x,f.y);ctx.rotate(game.time*.45);ctx.strokeStyle='#9afce288';ctx.lineWidth=2;ctx.setLineDash([15,22]);ctx.beginPath();ctx.arc(0,0,f.r-12,0,TAU);ctx.stroke();ctx.setLineDash([]);for(let i=0;i<7;i++){ctx.rotate(TAU/7);ctx.beginPath();ctx.ellipse(f.r*.68,0,13,5,.7,0,TAU);ctx.fillStyle='#a0ffe19c';ctx.fill();}ctx.restore();}
 for(const d of game.drops){ctx.save();ctx.translate(d.x,d.y+Math.sin(game.time*3+d.seed)*2);ctx.shadowBlur=12;ctx.shadowColor=d.kind==='heal'?'#ffbaac':'#92ffc8';if(d.kind==='heal'){circle(0,0,8,'#e4d0ae','#fff3da',1);ctx.fillStyle='#346d49';ctx.fillRect(-4,-1,8,2);ctx.fillRect(-1,-4,2,8);}else{ctx.rotate(Math.PI/4);ctx.fillStyle='#97efc5';ctx.fillRect(-4,-4,8,8);ctx.fillStyle='#e3ffdd';ctx.fillRect(-2,-2,3,3);}ctx.restore();}
 for(const e of game.enemies){if(e.type==='boss'&&e.windup>0){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.atan2(e.chargeY,e.chargeX));ctx.fillStyle='#ea659536';ctx.strokeStyle='#ffa9c0aa';ctx.lineWidth=2;ctx.fillRect(0,-e.r,370,e.r*2);ctx.strokeRect(0,-e.r,370,e.r*2);ctx.restore();}}
 for(const trail of game.trails){ctx.save();ctx.translate(trail.x,trail.y);ctx.globalAlpha=trail.life/.2*.23;paintCharacter(ctx,game.hero,{frame:4+Math.floor(trail.stride)%4,flip:trail.facing,x:0,y:-4,rotation:.16*trail.facing,scaleX:1.05,scaleY:.96,alpha:1,glow:0},170);ctx.restore();}
 const ordered=[...game.enemies.map(e=>({kind:'enemy',item:e,y:e.y})),{kind:'player',item:p,y:p.y}].sort((a,b)=>a.y-b.y);for(const o of ordered){if(o.kind==='player')drawPlayer(p);else drawEnemy(o.item);}
 for(const b of game.bullets){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);ctx.shadowColor=b.enemy?'#db74be':'#b1ffe1';ctx.shadowBlur=b.enemy?10:15;if(b.enemy){circle(0,0,b.r,'#da80ba','#f9bfdb',1.5);circle(-1,-1,3,'#fff0ef');}else{ctx.fillStyle='#cbffdf';ctx.beginPath();ctx.ellipse(0,0,16,5,0,0,TAU);ctx.fill();ctx.strokeStyle='#62cf9c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(12,0);ctx.stroke();}ctx.restore();}
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
 if(e.x<camX-100||e.x>camX+width/zoom+100||e.y<camY-100||e.y>camY+height/zoom+100)return;
 ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(0,e.r*.8,e.r*.9,e.r*.35,0,0,TAU);ctx.fill();const bounce=Math.sin(game.time*(e.type==='fast'?10:5)+e.seed)*2;ctx.translate(0,bounce);const boss=e.type==='boss',heavy=e.type==='heavy',fast=e.type==='fast',base=e.flash>0?'#ecffd9':boss?'#45223f':heavy?'#37433c':fast?'#444368':'#243f48',edge=boss?'#e1a0c1':heavy?'#afa886':fast?'#b7a9f4':'#84bac2';
 ctx.shadowBlur=boss?18:8;ctx.shadowColor=boss?'#d364a166':'#45659255';
 ctx.beginPath();const n=boss?10:fast?5:heavy?8:7;for(let i=0;i<n;i++){const a=i/n*TAU-Math.PI/2,r=e.r*(i%2===0?1:.82),x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fillStyle=base;ctx.fill();ctx.strokeStyle=edge;ctx.lineWidth=boss?2.5:1.4;ctx.stroke();ctx.shadowBlur=0;
 circle(0,-e.r*.1,e.r*.58,boss?'#251629':heavy?'#283029':'#162831');
 const eye=boss?'#ffc1df':fast?'#ecdfff':'#bcf9d8';ctx.shadowColor=eye;ctx.shadowBlur=9;ctx.fillStyle=eye;ctx.save();ctx.translate(-e.r*.24,-e.r*.1);ctx.rotate(.2);ctx.fillRect(-e.r*.09,0,e.r*.22,e.r*.11);ctx.restore();ctx.save();ctx.translate(e.r*.2,-e.r*.1);ctx.rotate(-.2);ctx.fillRect(-e.r*.08,0,e.r*.22,e.r*.11);ctx.restore();ctx.shadowBlur=0;
 if(boss){ctx.strokeStyle='#cca2bd';ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-22+i*22,-e.r*.66);ctx.lineTo(-29+i*29,-e.r-15+(i===1?-8:0));ctx.stroke();}circle(0,19,7,'#d68caa','#f4c6d0');}
 if(e.hp<e.maxHp&&!boss){ctx.fillStyle='#041b21';ctx.fillRect(-e.r,-e.r-11,e.r*2,4);ctx.fillStyle='#cbba97';ctx.fillRect(-e.r,-e.r-11,e.r*2*Math.max(0,e.hp/e.maxHp),4);}
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
const stick=$('joystick');
function updateStick(event){const rect=stick.getBoundingClientRect(),dx=event.clientX-(rect.left+rect.width/2),dy=event.clientY-(rect.top+rect.height/2),dist=Math.hypot(dx,dy),max=rect.width*.33,k=dist>max?max/dist:1;move.x=dx*k/max;move.y=dy*k/max;$('joystick-knob').style.transform=`translate(${dx*k}px,${dy*k}px)`;}
stick.addEventListener('pointerdown',e=>{if(orientationBlocked||game?.state!=='playing'||joystickId!==null)return;e.preventDefault();joystickId=e.pointerId;stick.setPointerCapture(e.pointerId);updateStick(e);});
stick.addEventListener('pointermove',e=>{if(e.pointerId===joystickId){e.preventDefault();updateStick(e);}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(e.pointerId===joystickId){joystickId=null;move.x=move.y=0;$('joystick-knob').style.transform='';}});
for(const key of ['q','e']){$('skill-'+key).addEventListener('pointerdown',e=>{e.preventDefault();triggerSkill(key);});$('skill-'+key).addEventListener('click',()=>triggerSkill(key));}
window.addEventListener('keydown',e=>{if(orientationBlocked)return;const k=e.key.toLowerCase();if(k==='escape'){e.preventDefault();if(!$('help-screen').hidden){show('help-screen',false);$('help-open').focus();return;}if(game?.state==='playing')pause();else if(game?.state==='paused')resume();return;}if(game?.state!=='playing')return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','q','e',' '].includes(k)){e.preventDefault();keys.add(k);}if(!e.repeat){if(k==='q'||k===' ')triggerSkill('q');if(k==='e')triggerSkill('e');}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('resize',resize);
// Keep keyboard focus inside the currently visible dialog.
document.addEventListener('keydown',e=>{if(e.key!=='Tab')return;if(orientationBlocked){e.preventDefault();$('orientation-action').focus();return;}const modal=[...document.querySelectorAll('.modal-screen')].find(m=>!m.hidden);if(!modal)return;const focusable=[...modal.querySelectorAll('button:not([disabled])')];if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
document.querySelectorAll('.character-card').forEach(b=>b.addEventListener('click',()=>setHero(b.dataset.hero)));document.querySelectorAll('.sound-button').forEach(b=>b.addEventListener('click',soundToggle));$('start-button').addEventListener('click',startGame);$('pause-button').addEventListener('click',pause);$('resume-button').addEventListener('click',resume);$('quit-button').addEventListener('click',backToSelect);$('retry-button').addEventListener('click',startGame);$('choose-button').addEventListener('click',backToSelect);$('help-open').addEventListener('click',()=>{show('help-screen');$('help-close').focus();});for(const id of ['help-close','help-ready'])$(id).addEventListener('click',()=>{show('help-screen',false);$('help-open').focus();});
$('preview-action').addEventListener('click',()=>{previewManual++;previewAction={name:previewManual%2?'attack':'ultimate',elapsed:0,duration:previewManual%2?.6:.9,facing:1};tone('select');});
$('orientation-action').addEventListener('click',requestLandscape);window.matchMedia('(orientation: portrait)').addEventListener('change',resize);document.addEventListener('fullscreenchange',resize);
resize();loadAssets();requestAnimationFrame(previewFrame);
