// Source regions follow the artwork's silhouettes, including the boss's tall crown.
const SOURCE_SIZE=1254;
export const MONSTERS={
 shade:{name:'枯叶灵',crop:[50,0,565,611],height:83,color:'#8bdfbd',pace:3.2,sway:.025,bob:2.2},
 fast:{name:'荆棘疾兽',crop:[627,0,627,643],mask:[[627,0],[1254,0],[1254,643],[1020,643],[998,573],[627,573]],height:72,color:'#c2a2f0',pace:6,sway:.035,bob:2.6},
 heavy:{name:'苔岩卫',crop:[0,615,645,639],height:113,color:'#b9c987',pace:2.5,sway:.025,bob:1.1},
 boss:{name:'茶魇',crop:[647,584,607,670],mask:[[647,584],[995,584],[1030,648],[1254,648],[1254,1254],[647,1254]],height:191,color:'#ea9ac8',pace:2.1,sway:.018,bob:1.6}
};

export function monsterPose(enemy,time){
 const art=MONSTERS[enemy.type],phase=time*art.pace+enemy.seed;
 const facing=Math.abs(Math.cos(enemy.angle))>.16?(Math.cos(enemy.angle)>0?1:-1):(enemy.facing||1);
 const impact=Math.max(0,Math.min(1,enemy.flash/.12));
 const charging=enemy.charge>0,windup=enemy.windup>0;
 return {facing,y:-Math.abs(Math.sin(phase))*art.bob,rotation:charging?.12:Math.sin(phase)*art.sway,
  scaleX:1+Math.sin(phase)*.012+(windup?.035:0)-impact*.035,
  scaleY:1-Math.sin(phase)*.008-(windup?.035:0)+impact*.02,impact};
}

export function prepareMonsters(image,makeCanvas){
 const scaleX=image.width/SOURCE_SIZE,scaleY=image.height/SOURCE_SIZE,result={};
 for(const [kind,art] of Object.entries(MONSTERS)){
  const [x,y,w,h]=art.crop,c=makeCanvas();c.width=Math.ceil(w*scaleX);c.height=Math.ceil(h*scaleY);
  const t=c.getContext('2d');t.save();
  if(art.mask){t.beginPath();art.mask.forEach(([px,py],i)=>t[i?'lineTo':'moveTo']((px-x)*scaleX,(py-y)*scaleY));t.closePath();t.clip();}
  t.drawImage(image,x*scaleX,y*scaleY,w*scaleX,h*scaleY,0,0,c.width,c.height);t.restore();
  // Cache a silhouette once so hit flashes don't recolor pixels every frame.
  const flash=makeCanvas();flash.width=c.width;flash.height=c.height;const ft=flash.getContext('2d');
  ft.drawImage(c,0,0);ft.globalCompositeOperation='source-in';ft.fillStyle='#f1ffe1';ft.fillRect(0,0,c.width,c.height);
  result[kind]={image:c,flash};
 }
 return result;
}
