const apiOrigin=import.meta.env.VITE_GAME_API_URL||'';
const sessionKey='mountain-courtyard-session';
export function assetPath(name:string){return (import.meta.env.BASE_URL||'/')+name;}
export async function apiFetch(path:string,init:RequestInit={}){
 const headers=new Headers(init.headers);
 const token=apiOrigin?sessionStorage.getItem(sessionKey):null;
 if(token)headers.set('Authorization','Bearer '+token);
 const response=await fetch(apiOrigin+path,{...init,headers,credentials:apiOrigin?'omit':'same-origin'});
 if(apiOrigin&&path==='/api/auth'&&response.ok){const data=await response.clone().json() as {sessionToken?:string;ok?:boolean};if(data.sessionToken)sessionStorage.setItem(sessionKey,data.sessionToken);if(data.ok)sessionStorage.removeItem(sessionKey);}
 return response;
}
