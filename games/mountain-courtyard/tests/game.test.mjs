import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
const sql=new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys=ON');
for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')))sql.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
class Statement {
 constructor(query,args=[]){this.query=query;this.args=args;}
 bind(...args){return new Statement(this.query,args);}
 async first(){return sql.prepare(this.query).get(...this.args)||null;}
 async run(){const r=sql.prepare(this.query).run(...this.args);return {success:true,meta:{changes:Number(r.changes)},results:[]};}
}
globalThis.__courtyardTestEnv={DB:{prepare:q=>new Statement(q),async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
async function compile(file){const result=await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'test-db',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'db',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const env=globalThis.__courtyardTestEnv;'}));}}]});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const auth=await compile('app/api/auth/route.ts'),game=await compile('app/api/game/route.ts'),model=await compile('lib/game.ts');
const origin='https://courtyard.example';
async function call(route,data,cookie='',requestOrigin=origin){const request=new Request(origin+(route===auth?'/api/auth':'/api/game'),{method:data?'POST':'GET',headers:{origin:requestOrigin,'Content-Type':'application/json',cookie,'cf-connecting-ip':'192.0.2.1'},...(data?{body:JSON.stringify(data)}:{})});const response=await route[data?'POST':'GET'](request);return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
test('real SQL account isolation, cloud resume, idempotency, and one-use password recovery',async()=>{
 const a=await call(auth,{type:'register',name:'小院甲',password:'password123'});assert.equal(a.status,200,JSON.stringify(a.data));assert.ok(a.data.recovery);assert.match(a.cookie,/^__Host-/);
 const b=await call(auth,{type:'register',name:'小院乙',password:'password456'});assert.equal(b.status,200);
 assert.equal((await call(auth,{type:'register',name:'小院甲',password:'password123'})).status,409);
 assert.equal((await call(game)).status,401);
 assert.equal((await call(game,{type:'harvestAll',requestId:crypto.randomUUID()},a.cookie,'https://other.example')).status,403);
 const action={type:'harvestAll',requestId:crypto.randomUUID()};const harvest=await call(game,action,a.cookie);assert.equal(harvest.status,200);assert.equal(harvest.data.state.harvested,6);
 const retry=await call(game,action,a.cookie);assert.equal(retry.data.state.harvested,6);assert.equal(retry.data.revision,harvest.data.revision);
 const other=await call(game,null,b.cookie);assert.equal(other.data.state.harvested,0);
 const resume=await call(auth,{type:'login',name:'小院甲',password:'password123'});assert.equal(resume.data.state.harvested,6);
 assert.equal((await call(auth,{type:'login',name:'小院甲',password:'wrongpass'})).status,401);
 const recovered=await call(auth,{type:'recover',name:'小院甲',password:'newpassword',recovery:a.data.recovery});assert.equal(recovered.status,200);assert.notEqual(recovered.data.recovery,a.data.recovery);
 assert.equal((await call(game,null,a.cookie)).status,401);assert.equal((await call(game,null,resume.cookie)).status,401);
 assert.equal((await call(game,null,recovered.cookie)).data.state.harvested,6);
 assert.equal((await call(auth,{type:'recover',name:'小院甲',password:'otherpassword',recovery:a.data.recovery})).status,401);
 assert.equal((await call(auth,{type:'login',name:'小院甲',password:'newpassword'})).status,200);
 const row=sql.prepare('SELECT password_hash,recovery_hash FROM accounts WHERE name=?').get('小院甲');assert.ok(!row.password_hash.includes('newpassword'));assert.notEqual(row.recovery_hash,recovered.data.recovery);
});
test('plant → harvest → cook → serve; offline cap and no mutation on errors',()=>{
 const t=1800000000000;let s=model.newGame(t);const initial=structuredClone(s);
 s=model.applyAction(s,{type:'harvestAll'},t).state;assert.equal(initial.harvested,0);
 s=model.applyAction(s,{type:'plant',index:0,crop:'tea'},t).state;
 assert.throws(()=>model.applyAction(s,{type:'harvest',index:0},t+1000));
 s=model.applyAction(s,{type:'harvest',index:0},t+35000).state;
 s=model.applyAction(s,{type:'cook',recipe:'milkTea'},t+35000).state;
 s=model.advance(s,t+43000);assert.equal(s.goods.milkTea,1);
 const before=s.coins;s=model.applyAction(s,{type:'serve',id:s.orders[0].id},t+43000).state;assert.equal(s.coins,before+24);assert.equal(s.sold,1);
 assert.throws(()=>model.applyAction(s,{type:'plant',index:0,crop:'__proto__'},t+43000));
 s.tier=3;s.roomAt=s.springAt=s.lastAt=t; s=model.advance(s,t+48*3600000);assert.equal(s.offline.seconds,8*3600);assert.ok(s.serviceBank<=3000);
 const bank=s.serviceBank;s=model.advance(s,t+48*3600000);assert.equal(s.serviceBank,bank);
});
test('GitHub Pages signs in with a revocable bearer token, without third-party cookies',async()=>{
 const user=await call(auth,{type:'register',name:'网页店主',password:'pagespassword'},'','https://yu-hao-0323.github.io');
 assert.equal(user.status,200);assert.match(user.data.sessionToken,/^[a-f0-9]{64}$/);
 const req=new Request(origin+'/api/game',{headers:{Authorization:'Bearer '+user.data.sessionToken,Origin:'https://yu-hao-0323.github.io'}});
 const response=await game.GET(req);assert.equal(response.status,200);assert.equal((await response.json()).user.name,'网页店主');
 assert.equal((await call(auth,{type:'login',name:'网页店主',password:'pagespassword'},'','https://evil.example')).status,403);
});
