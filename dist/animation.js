const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CLIPS={idle:[0,1,2,3,2,1],run:[4,5,6,7],attack:[8,9,10,11],ultimate:[12,13,14,15]};
export function poseFor(player,time,hero){
 const action=player.action,pose={frame:0,flip:player.facing||1,x:0,y:0,rotation:0,scaleX:1,scaleY:1,alpha:1,glow:0};
 const stride=player.stride||0,move=player.moveBlend||0;
 pose.frame=move>.18?CLIPS.run[Math.floor(stride)%4]:CLIPS.idle[Math.floor(time*2.4)%6];
 pose.y=move>.18?-Math.abs(Math.sin(stride*Math.PI/2))*3:-Math.sin(time*2.6)*.7;
 if(!action)return pose;
 const t=clamp(action.elapsed/action.duration,0,1);pose.flip=action.facing;
 if(action.name==='attack'){
  pose.frame=CLIPS.attack[Math.min(3,Math.floor(t*4))];
  const strike=Math.sin(clamp((t-.2)/.65,0,1)*Math.PI);
  pose.x=strike*(hero==='qingfeng'?9:3)*pose.flip;pose.y-=strike*2;
 }else if(action.name==='ultimate'){
  pose.frame=CLIPS.ultimate[Math.min(3,Math.floor(t*4))];pose.y-=Math.sin(t*Math.PI)*(hero==='lingye'?13:4);pose.glow=Math.sin(t*Math.PI);
 }else if(action.name==='dash'){
  pose.frame=CLIPS.run[t<.5?0:2];pose.rotation=.16*pose.flip;pose.scaleX=1.06;pose.scaleY=.96;pose.y-=5;
 }else if(action.name==='hurt'){
  pose.frame=CLIPS.idle[0];pose.rotation=-Math.sin(t*Math.PI)*.19*pose.flip;pose.x=-Math.sin(t*Math.PI)*7*pose.flip;pose.scaleY=1-Math.sin(t*Math.PI)*.06;
 }else if(action.name==='defeat'){
  pose.frame=CLIPS.idle[2];pose.rotation=t*1.35*pose.flip;pose.y=t*27;pose.alpha=1-t*.5;
 }else if(action.name==='victory'){
  pose.frame=CLIPS.ultimate[t<.3?1:2];pose.y=-Math.sin(t*Math.PI)*14;pose.glow=.7;
 }
 return pose;
}
// Boundaries follow the actual artwork: the raised sword occupies extra vertical space.
const ROW_EDGES={qingfeng:[[0,.25,.5,.745,1],[0,.25,.495,.7145,1],[0,.25,.497,.732,1],[0,.25,.497,.725,1]],lingye:Array.from({length:4},()=>[0,.255,.5,.75,1])};
export function atlasCell(frame,image,hero){const col=frame%4,row=Math.floor(frame/4),edges=ROW_EDGES[hero]?.[col]||[0,.25,.5,.75,1],w=image.width/4;return {x:col*w,y:edges[row]*image.height,w,h:(edges[row+1]-edges[row])*image.height};}
