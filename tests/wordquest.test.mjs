import assert from 'node:assert/strict';
import {WORDS,WORD_MAP,THEMES} from '../dist/wordquest/words.js';
import {fresh,sanitize,makeSession,current,answer,advance,complete,eligible,stats,chooseSkin,maskSentence,optionsFor,DAY} from '../dist/wordquest/core.js';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
assert.equal(WORDS.length,120);assert.equal(new Set(WORDS.map(w=>w.id)).size,120);
for(const theme of THEMES)assert.equal(WORDS.filter(w=>w.theme===theme.id).length,20);
for(const w of WORDS){assert.ok(w.translation&&w.meaning&&w.pos);assert.ok(maskSentence(w).includes('________'),w.id+' must occur in its example');assert.equal((w.sentence.match(new RegExp('\\b'+w.word+'\\b','gi'))||[]).length,1);for(const kind of ['meaning','reverse','context']){const opts=optionsFor({id:w.id,kind},()=>.5);assert.equal(opts.length,4);assert.equal(new Set(opts.map(x=>x.id)).size,4);assert.equal(new Set(opts.map(x=>x.label)).size,4);assert.ok(opts.some(x=>x.id===w.id));}}
assert.ok(!optionsFor({id:'approach',kind:'meaning'},()=>.5).some(x=>x.id==='method'));
let now=new Date(2026,8,6,12).getTime();const state=fresh();assert.equal(makeSession(state,'review','all',now),false);assert.equal(makeSession(state,'wrong','all',now),false);
assert.equal(makeSession(state,'new','study',now,()=>.5),true);assert.equal(makeSession(state,'new'),false);assert.equal(state.active.ids.length,8);
const ids=[...state.active.ids];assert.equal(state.active.queue.length,32);assert.equal(advance(state),true);
const restored=sanitize(JSON.parse(JSON.stringify(state)));assert.equal(restored.active.cursor,1,'resume preserves exact progress');
while(current(state)){const q=current(state);if(q.kind!=='learn'){assert.equal(advance(state),false,'must answer before advancing');const f=answer(state,q.id.toUpperCase()+' ');assert.equal(f.correct,true);assert.equal(answer(state,'bad'),null,'duplicate submissions do not add results');}advance(state);}
const result=complete(state,now);assert.equal(result.correct,24);assert.equal(result.reward,24);assert.equal(complete(state,now),null);assert.equal(state.coins,24);assert.equal(stats(state,now).learned,8);assert.equal(stats(state,now).mastered,0);assert.equal(eligible(state,'review','all',now).length,0);
for(const delay of [DAY+1,4*DAY+2]){now=new Date(2026,8,6,12).getTime()+delay;assert.equal(makeSession(state,'review','all',now,()=>.5),true);while(current(state)){answer(state,current(state).id);advance(state);}complete(state,now);}
assert.equal(stats(state,now).mastered,8,'mastery requires three different days');assert.equal(state.coins,72);assert.equal(chooseSkin(state,'ember'),true);assert.equal(state.coins,12);assert.equal(chooseSkin(state,'ember'),true);assert.equal(state.coins,12,'owned appearance is free to equip again');assert.equal(chooseSkin(state,'frost'),false);
const wrong=fresh();makeSession(wrong,'new','daily',now,()=>.5);while(current(wrong)?.kind==='learn')advance(wrong);const failed=current(wrong).id;const cursor=wrong.active.cursor;assert.equal(answer(wrong,'not-the-word').correct,false);assert.equal(wrong.active.queue[cursor+4].id,failed,'wrong word returns after three intervening prompts');advance(wrong);
while(current(wrong)){answer(wrong,current(wrong).id);advance(wrong);}complete(wrong,now);assert.equal(wrong.words[failed].trouble,true);assert.equal(wrong.words[failed].due,now+600000);assert.equal(eligible(wrong,'wrong').length,1);assert.equal(wrong.coins>=0,true);
const hinted=fresh();makeSession(hinted,'new','work',now,()=>.5);while(current(hinted)){const q=current(hinted);if(q.kind!=='learn'){if(q.kind==='spell')hinted.active.hinted=true;answer(hinted,q.id);}advance(hinted);}complete(hinted,now);assert.equal(stats(hinted,now).mastered,0);assert.equal(eligible(hinted,'wrong').length,8,'hints alone cannot certify spelling recall');
assert.equal(sanitize({version:1,active:{ids:['invalid']},words:{bogus:{}}}).active,null);
const html=readFileSync('dist/wordquest/index.html','utf8'),app=readFileSync('dist/wordquest/app.js','utf8');const htmlIDs=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(htmlIDs).size,htmlIDs.length);
for(const m of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(htmlIDs.includes(m[1]),'missing UI control '+m[1]);
for(const m of html.matchAll(/(?:href|src)="(\.\.?\/[^"?]*)(?:\?[^\"]*)?"/g))assert.ok(existsSync(resolve('dist/wordquest',m[1])),m[1]);
console.log('PASS: 120 examples, unique choices, synonyms, resume, wrong-word delay, hint handling, three-day mastery, nonrepeatable rewards and UI controls.');
