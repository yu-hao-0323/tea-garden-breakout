import {rawDb} from '../db/raw';
import {digest,secret} from './credentials';
import {advance,applyAction,type Save} from './game';
export class RequestError extends Error{constructor(message:string,public status=400){super(message);}}
export const COOKIE='__Host-courtyard-session';
export const now=()=>Date.now();
export function json(data:unknown,status=200,cookie?:string){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});}
export function cookieHeader(token:string,clear=false){return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${clear?0:30*86400}`;}
export function requireOrigin(request:Request){
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)throw new RequestError('请求来源不正确，请重新打开游戏。',403);
 if(!request.headers.get('content-type')?.includes('application/json'))throw new RequestError('请求格式不正确。',415);
}
export async function body(request:Request){if(Number(request.headers.get('content-length'))>8192)throw new RequestError('这次请求太大了。',413);const text=await request.text();if(text.length>8192)throw new RequestError('这次请求太大了。',413);try{return JSON.parse(text) as Record<string,unknown>;}catch{throw new RequestError('请求格式不正确。');}}
export async function session(request:Request){
 const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 return await rawDb().prepare('SELECT a.id,a.name FROM sessions s JOIN accounts a ON a.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),now()).first<{id:string;name:string}>();
}
export async function requireSession(request:Request){const user=await session(request);if(!user)throw new RequestError('请先登录你的小院。',401);return user;}
export async function newSession(userId:string){const token=secret(),hash=await digest(token);return {token,statement:rawDb().prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(hash,userId,now()+30*86400000)};}
export async function rateLimit(scope:string,max:number,windowMs:number){
 const time=now(),row=await rawDb().prepare('INSERT INTO auth_limits(scope,count,reset_at) VALUES(?,1,?) ON CONFLICT(scope) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING count').bind(scope,time+windowMs,time,time,time+windowMs).first<{count:number}>();
 if(!row||row.count>max)throw new RequestError('尝试得有些频繁，请稍后再试。',429);
}
export async function cleanup(){await rawDb().batch([rawDb().prepare('DELETE FROM sessions WHERE expires_at<?').bind(now()),rawDb().prepare('DELETE FROM auth_limits WHERE reset_at<?').bind(now()-86400000)]);}
export async function gameState(userId:string,action?:Record<string,unknown>){
 const db=rawDb();
 for(let attempt=0;attempt<5;attempt++){
  const row=await db.prepare('SELECT state,revision FROM game_saves WHERE user_id=?').bind(userId).first<{state:string;revision:number}>();
  if(!row)throw new RequestError('暂时未能读取小院存档，请稍后重试。',503);
  const previous=JSON.parse(row.state) as Save;
  let state:Save,message='';
  if(action){const requestId=String(action.requestId||'');if(!/^[a-f0-9-]{36}$/.test(requestId))throw new RequestError('请求标记不正确，请重试。');
   if(previous.receipts.includes(requestId))return {state:previous,revision:row.revision,serverNow:now(),message:'操作已完成'};
   try{({state,message}=applyAction(previous,action,now()));}catch(error){throw new RequestError(error instanceof Error?error.message:'操作暂时未完成。');}
   state.receipts=[...state.receipts,requestId].slice(-100);
  }else state=advance(previous,now());
  const updated=await db.prepare('UPDATE game_saves SET state=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=? RETURNING revision').bind(JSON.stringify(state),now(),userId,row.revision).first<{revision:number}>();
  if(updated)return {state,revision:updated.revision,serverNow:now(),message};
 }
 throw new RequestError('小院正在同步另一台设备的操作，请重试。',409);
}
export function errorResponse(error:unknown){if(error instanceof RequestError)return json({error:error.message},error.status);console.error('Courtyard request failed',error instanceof Error?error.message:'unknown');return json({error:'小院暂时连不上，请稍后重试。你的存档会保留。'},503);}
