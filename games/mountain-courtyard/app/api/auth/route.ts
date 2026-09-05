import {rawDb} from '../../../db/raw';
import {newGame} from '../../../lib/game';
import {digest,equal,hashPassword,normalizeName,normalizeRecovery,recoveryCode,validName,verifyPassword} from '../../../lib/credentials';
import {body,cleanup,cookieHeader,errorResponse,gameState,json,newSession,now,rateLimit,requireOrigin,session,RequestError,COOKIE} from '../../../lib/server';
export async function GET(request:Request){try{const user=await session(request);if(!user)return json({user:null});return json({user,...await gameState(user.id)});}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{
 requireOrigin(request);const data=await body(request),type=String(data.type||'');
 if(type==='logout'){const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(token)await rawDb().prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();return json({ok:true},200,cookieHeader('',true));}
 if(!['register','login','recover'].includes(type))throw new RequestError('请选择登录方式。');
 const name=typeof data.name==='string'?data.name.normalize('NFKC').trim():'',username=normalizeName(name),password=typeof data.password==='string'?data.password:'';
 if(!validName(name))throw new RequestError('名字需要 2–20 个字，可用中文、字母、数字、下划线。');
 if(password.length<8||password.length>72)throw new RequestError('密码需要 8–72 个字符。');
 const ip=await digest(request.headers.get('cf-connecting-ip')||'shared');
 await rateLimit('ip:'+ip,type==='register'?12:60,15*60000);await rateLimit(type+':name:'+username,10,10*60000);
 const db=rawDb();let user:{id:string;name:string};let recovery:string|undefined;let authSession:Awaited<ReturnType<typeof newSession>>;
 if(type==='register'){
  const existing=await db.prepare('SELECT id FROM accounts WHERE username=?').bind(username).first();if(existing)throw new RequestError('这个名字已有小院主人使用，换一个吧。',409);
  user={id:crypto.randomUUID(),name};recovery=recoveryCode();const passwordHash=await hashPassword(password);authSession=await newSession(user.id);
  try{await db.batch([db.prepare('INSERT INTO accounts(id,username,name,password_hash,recovery_hash,created_at) VALUES(?,?,?,?,?,?)').bind(user.id,username,name,passwordHash,await digest(normalizeRecovery(recovery)),now()),db.prepare('INSERT INTO game_saves(user_id,state,revision,updated_at) VALUES(?,?,0,?)').bind(user.id,JSON.stringify(newGame(now())),now()),authSession.statement]);}catch(error){if(error instanceof Error&&/UNIQUE/.test(error.message))throw new RequestError('这个名字刚被使用了，换一个吧。',409);throw error;}
 }else{
  const account=await db.prepare('SELECT id,name,password_hash,recovery_hash FROM accounts WHERE username=?').bind(username).first<{id:string;name:string;password_hash:string;recovery_hash:string}>();
  if(type==='login'){
   // Derive even for missing names so authentication cannot cheaply enumerate accounts.
   const valid=account?await verifyPassword(password,account.password_hash):(await hashPassword(password),false);
   if(!valid||!account)throw new RequestError('名字或密码不正确。',401);user={id:account.id,name:account.name};authSession=await newSession(user.id);await authSession.statement.run();
  }else{
   const code=normalizeRecovery(typeof data.recovery==='string'?data.recovery:'');if(!/^[A-F0-9]{32}$/.test(code)||!account||!equal(await digest(code),account.recovery_hash))throw new RequestError('名字或找回码不正确。',401);
   user={id:account.id,name:account.name};recovery=recoveryCode();authSession=await newSession(user.id);
   // Only one concurrent use can rotate a recovery code. Old sessions are revoked.
   const rotatedHash=await digest(normalizeRecovery(recovery));
   const results=await db.batch([
    db.prepare('UPDATE accounts SET password_hash=?,recovery_hash=? WHERE id=? AND recovery_hash=?').bind(await hashPassword(password),rotatedHash,user.id,account.recovery_hash),
    db.prepare('DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND recovery_hash=?)').bind(user.id,user.id,rotatedHash),
    db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) SELECT ?,id,? FROM accounts WHERE id=? AND recovery_hash=?').bind(await digest(authSession.token),now()+30*86400000,user.id,rotatedHash)
   ]);
   if(results[0].meta.changes!==1)throw new RequestError('找回码已使用，请使用最新的找回码。',409);
  }
 }
 await cleanup().catch(()=>console.warn("Expired session cleanup deferred"));
 return json({user,...await gameState(user.id),...(recovery?{recovery}: {})},200,cookieHeader(authSession.token));
 }catch(error){return errorResponse(error);}}
