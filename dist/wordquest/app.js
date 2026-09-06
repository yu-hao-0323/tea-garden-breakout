import {WORDS,WORD_MAP,THEMES} from './words.js';
import {fresh,sanitize,stats,eligible,makeSession,current,optionsFor,maskSentence,answer,advance,complete,SKINS,chooseSkin,dayKey} from './core.js';
const $=id=>document.getElementById(id),KEY='wordquest-cet4-v1';let state=fresh(),storageOK=true,screen='home',timer;
try{const data=localStorage.getItem(KEY);if(data)state=sanitize(JSON.parse(data));}catch{storageOK=false;}
function warn(){const box=$('storage-alert');box.hidden=storageOK;box.textContent='当前浏览器无法可靠保存进度。你仍可试玩，但关闭页面后可能丢失本次学习记录。';}
function save(){try{state.revision++;localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}warn();}
function sync(){try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&raw.revision>state.revision){state=sanitize(raw);toast('已同步另一页面的学习进度');return true;}}catch{}return false;}
function act(fn){if(sync()){go('home');return;}fn();save();}
function toast(text){clearTimeout(timer);$('toast').textContent=text;$('toast').hidden=false;timer=setTimeout(()=>$('toast').hidden=true,3500);}
function go(name){screen=name;for(const id of ['home','adventure','summary','book'])$(id).hidden=id!==name;document.body.dataset.skin=state.skin;$('coin-count').textContent='✦ '+state.coins;if(name==='home')renderHome();if(name==='adventure')renderQuestion();if(name==='book')renderBook();window.scrollTo({top:0,behavior:'instant'});}
function renderHome(){
 const s=stats(state),theme=$('theme').value||'all';$('stat-learned').textContent=s.learned;$('stat-mastered').textContent=s.mastered;$('stat-due').textContent=s.due;$('stat-days').textContent=s.days;
 $('camp-progress').textContent=`已认识 ${s.learned} / ${WORDS.length} · 已收服 ${s.mastered}`;$('camp-fill').style.width=s.learned/WORDS.length*100+'%';$('camp-name').textContent=SKINS.find(s=>s.id===state.skin).name;
 $('day-badge').textContent=state.days.includes(dayKey())?'今日已有收获，再走一程？':'今天也向前一步';
 const freshCount=eligible(state,'new',theme).length,review=eligible(state,'review',theme).length,wrong=eligible(state,'wrong',theme).length;
 $('new-count').textContent=freshCount?`本主题剩余 ${freshCount} 词 · 本轮 ${Math.min(8,freshCount)} 词`:'这个主题的新词已经学完';$('review-count').textContent=review?`${review} 个词等你重逢`:'暂时没有到期词，稍后再来';$('wrong-count').textContent=wrong?`${wrong} 只遗忘怪等待收服`:'还没有错词，先开始一次冒险';
 $('resume').hidden=!state.active;if(state.active)$('resume').textContent=`继续上次冒险 · ${Math.min(state.active.cursor+1,state.active.queue.length)} / ${state.active.queue.length} →`;
 for(const b of document.querySelectorAll('.mission')){const count={new:freshCount,review,wrong}[b.dataset.mode];b.disabled=!count||!!state.active;}
 $('skin-options').replaceChildren();for(const skin of SKINS){const b=document.createElement('button');b.className='skin-button '+skin.id;b.setAttribute('aria-pressed',String(state.skin===skin.id));const owned=state.owned.includes(skin.id);b.innerHTML=`<strong>${skin.name}</strong><small>${state.skin===skin.id?'已装备':owned?'点击切换':'✦ '+skin.cost+' 解锁'}</small>`;b.disabled=!owned&&state.coins<skin.cost;b.addEventListener('click',()=>act(()=>{chooseSkin(state,skin.id);go('home');}));$('skin-options').append(b);}
}
for(const t of THEMES){const option=document.createElement('option');option.value=t.id;option.textContent=t.icon+' '+t.name+' · 20 词';$('theme').append(option);}
$('theme').addEventListener('change',renderHome);
for(const b of document.querySelectorAll('.mission'))b.addEventListener('click',()=>act(()=>{if(makeSession(state,b.dataset.mode,$('theme').value))go('adventure');else toast('这个任务暂时没有可练习的单词。');}));
$('resume').addEventListener('click',()=>{sync();if(state.active)go('adventure');else go('home');});
$('leave').addEventListener('click',()=>{window.speechSynthesis?.cancel();go('home');toast('冒险已暂停，下次可以继续。');});
$('open-book').addEventListener('click',()=>go('book'));$('book-close').addEventListener('click',()=>go('home'));$('search').addEventListener('input',renderBook);
$('summary-home').addEventListener('click',()=>go('home'));
function randomFor(key){let seed=0;for(const ch of key)seed=(Math.imul(seed,31)+ch.charCodeAt(0))>>>0;return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const titles={learn:'初遇 · 结识新伙伴',meaning:'辨认 · 词义小径',reverse:'回忆 · 找到英文',spell:'拼写 · 修复石阵',context:'首领 · 回到语境'};
function renderQuestion(){
 const q=current(state),s=state.active;if(!q||!s){go('home');return;}const w=WORD_MAP[q.id],f=s.feedback;
 $('quest-counter').textContent=`${s.cursor+1} / ${s.queue.length}`;$('quest-stage').textContent=q.remedial?'遗忘怪回来了':titles[q.kind].split(' · ')[1];$('journey-fill').style.width=s.cursor/s.queue.length*100+'%';
 for(const step of document.querySelectorAll('[data-step]'))step.classList.toggle('active',step.dataset.step===(q.kind==='reverse'?'meaning':q.kind));
 $('question-type').textContent=(q.remedial?'再练一次 · ':titles[q.kind]+' · ')+THEMES.find(t=>t.id===w.theme).name;
 $('question-title').textContent=q.kind==='learn'||q.kind==='meaning'?w.word:q.kind==='context'?maskSentence(w):w.meaning;
 $('question-detail').textContent=q.kind==='learn'?w.pos+' '+w.meaning:q.kind==='meaning'?'选择这个词最合适的中文意思':q.kind==='reverse'?'根据这个意思，找出英文单词':q.kind==='spell'?w.pos+' · 输入完整单词，大小写不影响判断':'句意：'+w.translation;
 $('learn-content').replaceChildren();$('answer-options').replaceChildren();$('spelling-form').hidden=q.kind!=='spell'||!!f;$('spelling').value='';$('hint-text').textContent=s.hinted?'首字母 '+w.word[0].toUpperCase()+' · 共 '+w.word.length+' 个字母':'';
 $('learn-content').hidden=q.kind!=='learn';if(q.kind==='learn'){$('learn-content').innerHTML=`<blockquote>${w.sentence}<small>${w.translation}</small></blockquote><div class="learn-tip">试着读一遍，再想象句子中的场景。</div>`;}
 if(['meaning','reverse','context'].includes(q.kind))for(const item of optionsFor(q,randomFor(s.id+':'+s.cursor))){const b=document.createElement('button');b.className='answer-option';b.textContent=item.label;b.disabled=!!f;if(f&&item.id===q.id)b.classList.add('correct');if(f&&!f.correct&&item.id===f.value)b.classList.add('incorrect');b.addEventListener('click',()=>submit(item.id));$('answer-options').append(b);}
 $('feedback').hidden=!f;if(f){$('feedback').className='feedback '+(f.correct?'good':'retry');$('feedback').replaceChildren();const strong=document.createElement('strong');strong.textContent=f.correct?(f.assisted?'答对了，下次试试不看提示':'答对了，继续发光！'):'还差一点，我们再认识它一次';const p=document.createElement('p');p.textContent=w.word+' · '+w.pos+' '+w.meaning;const en=document.createElement('p');en.className='feedback-example';en.textContent=w.sentence;const zh=document.createElement('small');zh.textContent=w.translation;$('feedback').append(strong,p,en,zh);}
 $('next').hidden=q.kind!=='learn'&&!f;$('next').textContent=q.kind==='learn'?'认识了，继续探索 →':s.cursor===s.queue.length-1?'完成冒险，返回营地 →':'继续前行 →';
 $('question-note').textContent=q.kind==='spell'?'可以用首字母提示；提示后的答对不会算作独立掌握。':q.kind==='context'?'不用赶时间，先理解句子再作答。':'答错不会扣星光，难词会隔几题再来。';
 $('companion-tag').textContent=q.remedial?'遗忘怪 · 友好重逢':q.kind==='context'?'语境首领 · 最后一段路':'冒险进行中';$('companion-title').innerHTML=q.kind==='context'?'能放进句子，<br>才真正属于你。':q.remedial?'忘记并不可怕，<br>重逢就是进步。':'每一个新词，<br>都是一束光。';$('companion-copy').textContent=q.kind==='context'?'选对词，让整句话重新亮起来。':'不必一次记住，带着理解慢慢前进。';
 $('word-roster').replaceChildren();for(const id of s.ids){const chip=document.createElement('span');chip.className='word-chip';chip.textContent=s.results[id].kinds.length>=2?'✦':'◇';chip.setAttribute('aria-label','伙伴 '+(s.ids.indexOf(id)+1));if(id===q.id)chip.classList.add('current');$('word-roster').append(chip);}
 $('speak').hidden=(q.kind==='reverse'||q.kind==='context')&&!f;$('speak').disabled=!('speechSynthesis' in window);$('speak').textContent='speechSynthesis' in window?'♪ 朗读':'本机不支持朗读';
 if(q.kind==='spell'&&!f)$('spelling').focus();else $('question-title').focus({preventScroll:true});
}
function submit(value){if(!String(value).trim()){toast('先输入一个单词再确认。');return;}act(()=>{if(answer(state,value))renderQuestion();});}
$('spelling-form').addEventListener('submit',e=>{e.preventDefault();submit($('spelling').value);});
$('hint').addEventListener('click',()=>act(()=>{const s=state.active,q=current(state);if(!s||q?.kind!=='spell'||s.feedback)return;s.hinted=true;$('hint-text').textContent=`首字母 ${q.id[0].toUpperCase()} · 共 ${q.id.length} 个字母`;$('spelling').focus();}));
$('next').addEventListener('click',()=>act(()=>{if(!advance(state))return;if(!current(state)){const result=complete(state);renderSummary(result);go('summary');}else renderQuestion();}));
$('speak').addEventListener('click',()=>{const q=current(state);if(!q||!('speechSynthesis' in window))return;const synth=window.speechSynthesis;synth.cancel();const utterance=new SpeechSynthesisUtterance(WORD_MAP[q.id].word);utterance.lang='en-US';utterance.rate=.82;const voice=synth.getVoices().find(v=>v.lang.startsWith('en'));if(voice)utterance.voice=voice;utterance.onerror=()=>toast('朗读暂时不可用，请检查设备语音设置。');synth.speak(utterance);});
function renderSummary(r){if(!r)return;$('summary-lead').textContent=`完成 ${r.ids.length} 个单词的探索，获得 ${r.reward} 点星光。`;$('summary-stats').innerHTML=`<div><strong>${r.correct}</strong><small>答对题数</small></div><div><strong>${r.wrong}</strong><small>需要再练</small></div><div><strong>+${r.reward}</strong><small>营地星光</small></div>`;$('summary-words').replaceChildren();for(const id of r.ids){const w=WORD_MAP[id],p=state.words[id],row=document.createElement('div');row.className='summary-word';row.innerHTML=`<strong>${w.word}</strong><span>${w.meaning}</span><small>${p.trouble?'10 分钟后复习 · 也可进入错词挑战':p.level>=3?'已收服 · 继续安排复习':'已认识 · '+Math.round((p.due-Date.now())/86400000)+' 天后重逢'}</small>`;$('summary-words').append(row);}}
function renderBook(){const query=$('search').value.trim().toLowerCase(),words=WORDS.filter(w=>w.word.includes(query)||w.meaning.includes(query));$('book-list').replaceChildren();if(!words.length){$('book-list').textContent='暂时没有找到这个词。';return;}for(const w of words){const p=state.words[w.id],row=document.createElement('article');row.className='book-word';let label='尚未结识';if(p)label=p.trouble?'遗忘怪 · 待巩固':p.level>=3?'已收服':'已认识';row.innerHTML=`<div><h2>${w.word} <small>${w.pos}</small></h2><p>${w.meaning}</p><span class="book-status">${label}${p?' · '+(p.due<=Date.now()?'现在可复习':new Date(p.due).toLocaleDateString('zh-CN')+' 复习'):''}</span></div><div class="book-example"><p>${w.sentence}</p><small>${w.translation}</small></div>`;$('book-list').append(row);}}
window.addEventListener('storage',e=>{if(e.key===KEY&&sync()){go('home');toast('另一页面更新了进度，已回到营地同步。');}});
window.addEventListener('pagehide',()=>window.speechSynthesis?.cancel());
warn();go('home');
