import {WORDS,WORD_MAP} from './words.js';
export const DAY=86400000;
export function dayKey(now=Date.now()){const d=new Date(now);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function fresh(){return {version:1,revision:0,words:{},coins:0,rounds:0,days:[],skin:'forest',owned:['forest'],active:null};}
export function sanitize(raw){
 const base=fresh();if(!raw||raw.version!==1)return base;
 base.revision=Math.max(0,Number(raw.revision)||0);base.coins=Math.max(0,Math.min(1e7,Number(raw.coins)||0));base.rounds=Math.max(0,Number(raw.rounds)||0);base.days=Array.isArray(raw.days)?raw.days.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).slice(-366):[];
 const skins=['forest','frost','ember'];base.owned=[...new Set(['forest',...(Array.isArray(raw.owned)?raw.owned.filter(s=>skins.includes(s)):[])])];base.skin=base.owned.includes(raw.skin)?raw.skin:'forest';
 for(const [id,r] of Object.entries(raw.words||{})){if(!WORD_MAP[id]||!r||typeof r!=='object')continue;base.words[id]={level:Math.max(0,Math.min(5,Number(r.level)||0)),due:Math.max(0,Number(r.due)||0),mistakes:Math.max(0,Number(r.mistakes)||0),trouble:!!r.trouble,lastDay:typeof r.lastDay==='string'?r.lastDay:'',attempts:Math.max(0,Number(r.attempts)||0)};}
 const a=raw.active;if(a&&['new','review','wrong'].includes(a.mode)&&Array.isArray(a.ids)&&a.ids.length>0&&a.ids.length<=8&&a.ids.every(id=>WORD_MAP[id])&&Array.isArray(a.queue)&&a.queue.length>0&&a.queue.length<=80&&a.queue.every(q=>q&&a.ids.includes(q.id)&&WORD_MAP[q.id]&&['learn','meaning','reverse','spell','context'].includes(q.kind))&&Number.isInteger(a.cursor)&&a.cursor>=0&&a.cursor<a.queue.length&&a.results&&typeof a.results==='object'&&a.ids.every(id=>a.results[id]&&Number.isFinite(a.results[id].right)&&Number.isFinite(a.results[id].wrong)&&Array.isArray(a.results[id].kinds)&&Number.isFinite(a.results[id].retry))){base.active=a;}
 return base;
}
export function shuffle(list,random=Math.random){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function eligible(state,mode,theme='all',now=Date.now()){
 let list=WORDS.filter(w=>theme==='all'||w.theme===theme);
 if(mode==='new')return list.filter(w=>!state.words[w.id]);
 if(mode==='wrong')return list.filter(w=>state.words[w.id]?.trouble).sort((a,b)=>(state.words[b.id].mistakes||0)-(state.words[a.id].mistakes||0));
 return list.filter(w=>state.words[w.id]&&state.words[w.id].due<=now).sort((a,b)=>state.words[a.id].due-state.words[b.id].due);
}
export function makeSession(state,mode,theme='all',now=Date.now(),random=Math.random){
 if(state.active)return false;const candidates=eligible(state,mode,theme,now);const ids=(mode==='new'?shuffle(candidates,random):candidates).slice(0,8).map(w=>w.id);if(!ids.length)return false;
 const queue=[];if(mode==='new')for(const id of ids)queue.push({id,kind:'learn'});
 for(const kind of (mode==='new'?['meaning','spell','context']:['reverse','spell','context']))for(const id of shuffle(ids,random))queue.push({id,kind});
 state.active={id:String(now)+'-'+Math.floor(random()*1e6),mode,ids,queue,cursor:0,feedback:null,hinted:false,results:Object.fromEntries(ids.map(id=>[id,{right:0,wrong:0,kinds:[],retry:0}]))};return true;
}
export function current(state){const s=state.active;return s?s.queue[s.cursor]||null:null;}
const SYNONYMS=[['ability','skill'],['approach','method'],['impact','influence'],['preserve','conserve'],['achieve','accomplish']];
export function optionsFor(q,random=Math.random){const word=WORD_MAP[q.id],similar=SYNONYMS.find(g=>g.includes(q.id))||[];let candidates=WORDS.filter(w=>w.id!==q.id&&w.pos===word.pos&&!similar.includes(w.id)&&!w.meaning.split('；').some(m=>word.meaning.split('；').includes(m)));candidates=shuffle(candidates,random);return shuffle([word,...candidates.slice(0,3)],random).map(w=>({id:w.id,label:q.kind==='meaning'?w.meaning:w.word}));}
export function normalize(text){return String(text).trim().toLowerCase();}
export function maskSentence(word){return word.sentence.replace(new RegExp('\\b'+word.word+'\\b','i'),'________');}
export function answer(state,value){
 const s=state.active,q=current(state);if(!s||!q||q.kind==='learn'||s.feedback)return null;
 const correct=normalize(value)===q.id,r=s.results[q.id];if(correct){r.right++;if(!s.hinted&&!r.kinds.includes(q.kind))r.kinds.push(q.kind);}else r.wrong++;
 const assisted=s.hinted;s.feedback={correct,value:String(value),assisted};s.hinted=false;
 if((!correct||assisted)&&r.retry<2){r.retry++;s.queue.splice(Math.min(s.queue.length,s.cursor+4),0,{id:q.id,kind:!correct?'spell':q.kind,remedial:true});}
 return s.feedback;
}
export function advance(state){const s=state.active,q=current(state);if(!s||!q)return false;if(q.kind!=='learn'&&!s.feedback)return false;s.cursor++;s.feedback=null;s.hinted=false;return true;}
export function complete(state,now=Date.now()){
 const s=state.active;if(!s||s.cursor<s.queue.length)return null;const today=dayKey(now);let correct=0,wrong=0,newCount=0;
 for(const id of s.ids){const r=s.results[id];correct+=r.right;wrong+=r.wrong;const old=state.words[id];if(!old)newCount++;
  const p=old||{level:0,mistakes:0,trouble:false,attempts:0,lastDay:''};const strong=r.wrong===0&&r.kinds.includes('spell')&&r.kinds.includes('context');
  p.mistakes+=r.wrong;p.attempts+=r.right+r.wrong;
  if(strong){if(p.lastDay!==today)p.level=Math.min(5,p.level+1);p.due=now+[1,3,7,14,30][Math.max(0,p.level-1)]*DAY;p.trouble=false;}
  else {p.level=Math.max(0,p.level-1);p.due=now+10*60000;p.trouble=true;}
  p.lastDay=today;state.words[id]=p;
 }
 const reward=s.ids.length+Math.min(s.ids.length*2,correct);state.coins+=reward;state.rounds++;if(!state.days.includes(today))state.days.push(today);state.days=state.days.slice(-366);state.active=null;
 return {ids:s.ids,correct,wrong,newCount,reward,mode:s.mode,results:s.results};
}
export function stats(state,now=Date.now()){return {learned:Object.keys(state.words).length,mastered:Object.values(state.words).filter(w=>w.level>=3&&!w.trouble).length,due:eligible(state,'review','all',now).length,wrong:eligible(state,'wrong').length,days:state.days.length};}
export const SKINS=[{id:'forest',name:'青绿营地',cost:0},{id:'frost',name:'雪境营地',cost:30},{id:'ember',name:'赤焰营地',cost:60}];
export function chooseSkin(state,id){const skin=SKINS.find(s=>s.id===id);if(!skin)return false;if(!state.owned.includes(id)){if(state.coins<skin.cost)return false;state.coins-=skin.cost;state.owned.push(id);}state.skin=id;return true;}
