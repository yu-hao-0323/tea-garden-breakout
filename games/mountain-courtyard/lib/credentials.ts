const encoder=new TextEncoder();
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export function secret(bytes=32){return hex(crypto.getRandomValues(new Uint8Array(bytes)));}
export async function digest(value:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));}
function bytes(value:string){return Uint8Array.from(value.match(/.{2}/g)||[],v=>parseInt(v,16));}
export function equal(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
export async function hashPassword(password:string,salt=secret(16)){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(salt),iterations:100000},key,256);
 return `pbkdf2-sha256$100000$${salt}$${hex(new Uint8Array(bits))}`;
}
export async function verifyPassword(password:string,stored:string){const fields=stored.split('$');if(fields.length!==4||fields[0]!=='pbkdf2-sha256'||fields[1]!=='100000')return false;return equal(await hashPassword(password,fields[2]),stored);}
export function normalizeName(value:string){return value.normalize('NFKC').trim().toLowerCase();}
export function validName(value:string){return /^[\p{L}\p{N}_-]{2,20}$/u.test(value.normalize('NFKC').trim());}
export function recoveryCode(){return secret(16).toUpperCase().match(/.{4}/g)!.join('-');}
export function normalizeRecovery(value:string){return value.replace(/[\s-]/g,'').toUpperCase();}
