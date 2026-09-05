export const CROPS={
 tea:{name:'青山茶',seed:3,seconds:35,yield:3,xp:3,sprite:0,color:'#508251'},
 berry:{name:'草莓',seed:5,seconds:55,yield:3,xp:4,sprite:1,color:'#cf6a67'},
 jasmine:{name:'茉莉',seed:4,seconds:70,yield:3,xp:4,sprite:2,color:'#a8a667'},
 wheat:{name:'小麦',seed:3,seconds:45,yield:4,xp:3,sprite:3,color:'#c5a553'}
} as const;
export type Crop=keyof typeof CROPS;
export const RECIPES={
 milkTea:{name:'山野奶茶',ingredients:{tea:2},cost:4,price:24,seconds:8,xp:4,level:1,icon:'milk',description:'新鲜茶叶与醇香牛乳，一杯暖到心里。'},
 fruitTea:{name:'莓莓果茶',ingredients:{tea:1,berry:2},cost:3,price:38,seconds:12,xp:6,level:1,icon:'berry',description:'手捣草莓，加入清甜的山间新茶。'},
 jasmineTea:{name:'茉莉清茶',ingredients:{tea:1,jasmine:2},cost:2,price:32,seconds:10,xp:5,level:2,icon:'flower',description:'茉莉花香慢慢舒展，茶汤清透回甘。'},
 teaCake:{name:'青茶小酥',ingredients:{tea:1,wheat:2},cost:5,price:46,seconds:16,xp:7,level:2,icon:'cake',description:'酥香的麦饼里，藏着一抹淡淡茶香。'}
} as const;
export type Recipe=keyof typeof RECIPES;
export const DECOR={
 table:{name:'竹影茶席',cost:75,sprite:4,level:1,description:'坐下来，慢慢喝一杯茶。'},
 lantern:{name:'一盏暖灯',cost:55,sprite:5,level:1,description:'入夜后，小院也有温柔的光。'},
 path:{name:'青石小径',cost:35,sprite:6,level:1,description:'把喜欢的角落用小路连起来。'},
 pond:{name:'一池荷色',cost:140,sprite:7,level:2,description:'水声轻轻，荷叶摇摇。'},
 cat:{name:'三花阿团',cost:100,sprite:8,level:2,description:'一位喜欢晒太阳的小院居民。'},
 dog:{name:'柴犬阿福',cost:100,sprite:9,level:2,description:'每天都在门口等你回来。'},
 fence:{name:'竹篱笆',cost:45,sprite:13,level:1,description:'围住一小片属于自己的天地。'},
 flower:{name:'四时花盆',cost:45,sprite:14,level:1,description:'把花开留在你想要的位置。'},
 bench:{name:'木长椅',cost:65,sprite:15,level:1,description:'留一张椅子，等一场日落。'}
} as const;
export type Decor=keyof typeof DECOR;
export const EXPANSIONS=[
 {name:'庭院茶馆',cost:220,level:2,sprite:4,description:'多开两块田，解锁茉莉茶与小酥。'},
 {name:'山居客房',cost:450,level:3,sprite:10,description:'客房每 3 分钟迎来一位住客，可领取 36 金币。'},
 {name:'山泉温汤',cost:750,level:4,sprite:11,description:'温泉每 4 分钟积累 55 金币，让来客歇歇脚。'},
 {name:'灯火夜市',cost:1100,level:5,sprite:12,description:'解锁夜市营业，售出茶点获得额外 15% 收入。'}
] as const;
export const STAFF=[
 {id:'lin',name:'阿林',title:'种植好帮手',cost:180,level:2,role:'farmer',color:'#779862'},
 {id:'tao',name:'小桃',title:'厨房小能手',cost:280,level:3,role:'cook',color:'#c77f73'},
 {id:'he',name:'阿禾',title:'热心招待员',cost:240,level:3,role:'server',color:'#b49d60'}
] as const;
export type Role='farmer'|'cook'|'server'|'rest';
export type Plot={crop:Crop|null;plantedAt:number;readyAt:number};
export type Order={id:string;guest:string;recipe:Recipe;quantity:number;payment:number};
export type Save={
 version:1;coins:number;xp:number;hero:'qingfeng'|'lingye';plots:Plot[];inventory:Record<Crop,number>;goods:Record<Recipe,number>;
 jobs:{id:string;recipe:Recipe;readyAt:number}[];orders:Order[];menu:Recipe[];price:'kind'|'normal'|'premium';open:boolean;
 tier:number;equipment:number;decor:{id:string;kind:Decor;slot:number}[];staff:{id:string;role:Role}[];autoCrop:Crop;autoRecipe:Recipe;
 lastAt:number;nextOrderAt:number;staffAt:number;roomAt:number;springAt:number;serviceBank:number;
 sold:number;revenue:number;harvested:number;crafted:number;gifts:number;claimed:number[];seenHelp:boolean;
 offline:{seconds:number;coins:number;harvested:number;crafted:number;served:number}|null;recent:{id:string;text:string;at:number}[];
 receipts:string[];
};
const HOUR=3600000;
const names=['采茶阿婆','赶集的小满','旅人阿远','山里的邮差','画画的小鹿','隔壁陈叔','散步的阿宁','读书的阿岚'];
const uid=()=>crypto.randomUUID();
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export const levelOf=(xp:number)=>Math.min(20,1+Math.floor(Math.sqrt(xp/24)));
export const levelProgress=(xp:number)=>{const l=levelOf(xp);return {level:l,current:xp-(l-1)**2*24,total:(2*l-1)*24};};
export const timeLeft=(at:number,now:number)=>Math.max(0,Math.ceil((at-now)/1000));
export function newGame(now=Date.now()):Save{return {
 version:1,coins:360,xp:0,hero:'qingfeng',plots:[{crop:'tea',plantedAt:now-35000,readyAt:now},{crop:'berry',plantedAt:now-55000,readyAt:now},...Array.from({length:4},()=>({crop:null,plantedAt:0,readyAt:0}))],
 inventory:{tea:6,berry:4,jasmine:2,wheat:4},goods:{milkTea:0,fruitTea:0,jasmineTea:0,teaCake:0},jobs:[],orders:[{id:uid(),guest:'采茶阿婆',recipe:'milkTea',quantity:1,payment:24}],menu:['milkTea','fruitTea'],price:'normal',open:true,tier:0,equipment:0,
 decor:[{id:uid(),kind:'table',slot:7}],staff:[],autoCrop:'tea',autoRecipe:'milkTea',lastAt:now,nextOrderAt:now+45000,staffAt:now,roomAt:now,springAt:now,serviceBank:0,
 sold:0,revenue:0,harvested:0,crafted:0,gifts:0,claimed:[],seenHelp:false,offline:null,recent:[],receipts:[]
};}
export function availableRecipes(s:Save){return (Object.keys(RECIPES) as Recipe[]).filter(k=>RECIPES[k].level<=levelOf(s.xp));}
export function plotCount(s:Save){return s.tier>=1?6:4;}
export function craftCost(s:Save,k:Recipe){const r=RECIPES[k];return Object.entries(r.ingredients).every(([c,n])=>s.inventory[c as Crop]>=n)&&s.coins>=r.cost;}
export function sellPrice(s:Save,k:Recipe){return Math.round(RECIPES[k].price*(s.price==='kind'?.85:s.price==='premium'?1.25:1)*(s.tier>=4?1.15:1));}
export function note(s:Save,text:string,now:number){s.recent.unshift({id:uid(),text,at:now});s.recent=s.recent.slice(0,12);}
function spend(s:Save,amount:number){if(s.coins<amount)throw new Error('金币还不够，再完成几份订单吧。');s.coins-=amount;}
function harvest(s:Save,i:number,now:number){const p=s.plots[i];if(i>=plotCount(s)||!p?.crop||p.readyAt>now)return false;const c=CROPS[p.crop];s.inventory[p.crop]+=c.yield;s.harvested+=c.yield;s.xp+=c.xp;p.crop=null;p.readyAt=0;p.plantedAt=0;return true;}
function plant(s:Save,i:number,crop:Crop,now:number){const p=s.plots[i];if(i>=plotCount(s)||!p||p.crop)throw new Error('这块田暂时不能播种。');const c=CROPS[crop];spend(s,c.seed);p.crop=crop;p.plantedAt=now;p.readyAt=now+c.seconds*1000;}
function cook(s:Save,k:Recipe,now:number){if(!availableRecipes(s).includes(k))throw new Error('再经营一阵子，就能解锁这份配方。');if(s.jobs.length>=2+s.equipment)throw new Error('灶台正忙，稍等片刻就好。');if(!craftCost(s,k))throw new Error('材料或金币不足，去田里收获一些吧。');const r=RECIPES[k];spend(s,r.cost);for(const [c,n] of Object.entries(r.ingredients))s.inventory[c as Crop]-=n;s.jobs.push({id:uid(),recipe:k,readyAt:now+r.seconds*1000*(1-s.equipment*.12)});}
function serve(s:Save,id:string){const i=s.orders.findIndex(o=>o.id===id),o=s.orders[i];if(!o)throw new Error('这份订单已经完成了。');if(s.goods[o.recipe]<o.quantity)throw new Error('成品还没备好，先去厨房制作吧。');s.goods[o.recipe]-=o.quantity;s.coins+=o.payment;s.revenue+=o.payment;s.sold+=o.quantity;s.xp+=RECIPES[o.recipe].xp*o.quantity;s.orders.splice(i,1);return o;}
function makeOrder(s:Save){const menu=s.menu.filter(k=>availableRecipes(s).includes(k));if(!menu.length)return;const k=menu[Math.floor(Math.random()*menu.length)];s.orders.push({id:uid(),guest:names[Math.floor(Math.random()*names.length)],recipe:k,quantity:1,payment:sellPrice(s,k)});}
function tick(s:Save,now:number){
 const ready=s.jobs.filter(j=>j.readyAt<=now);for(const j of ready){s.goods[j.recipe]++;s.crafted++;s.xp++;}s.jobs=s.jobs.filter(j=>j.readyAt>now);
 if(s.open&&s.orders.length<3&&now>=s.nextOrderAt){makeOrder(s);s.nextOrderAt=now+(s.price==='premium'?65000:s.price==='kind'?25000:40000);}else if(!s.open){s.nextOrderAt=now+15000;}
 if(now-s.staffAt>=20000){s.staffAt=now;const roles=new Set(s.staff.map(p=>p.role));
  if(roles.has('farmer'))for(let i=0;i<plotCount(s);i++){harvest(s,i,now);if(!s.plots[i].crop&&s.coins>=25+CROPS[s.autoCrop].seed)plant(s,i,s.autoCrop,now);}
  if(roles.has('cook')&&s.jobs.length<2+s.equipment&&s.coins>25&&s.goods[s.autoRecipe]<20&&craftCost(s,s.autoRecipe))cook(s,s.autoRecipe,now);
  if(roles.has('server')&&s.open){const order=s.orders.find(o=>s.goods[o.recipe]>=o.quantity);if(order)serve(s,order.id);}
 }
 if(s.tier>=2){const n=Math.floor((now-s.roomAt)/180000);if(n>0){s.serviceBank=Math.min(3000,s.serviceBank+n*36);s.roomAt+=n*180000;}}
 if(s.tier>=3){const n=Math.floor((now-s.springAt)/240000);if(n>0){s.serviceBank=Math.min(3000,s.serviceBank+n*55);s.springAt+=n*240000;}}
}
export function advance(input:Save,now=Date.now()):Save{
 const s=structuredClone(input),elapsed=Math.max(0,now-s.lastAt),seconds=Math.floor(Math.min(elapsed,8*HOUR)/1000);
 const before={coins:s.coins,harvested:s.harvested,crafted:s.crafted,sold:s.sold};
 // One shared timeline for online and offline play; server time owns every timer.
 const start=Math.max(s.lastAt,now-8*HOUR);
 if(elapsed>8*HOUR){s.staffAt=Math.max(s.staffAt,start);s.roomAt=Math.max(s.roomAt,start);s.springAt=Math.max(s.springAt,start);s.nextOrderAt=Math.max(s.nextOrderAt,start);}
 for(let t=start+20000;t<now;t+=20000)tick(s,t);tick(s,now);s.lastAt=now;
 if(elapsed>=120000&&!s.offline)s.offline={seconds,coins:s.coins-before.coins,harvested:s.harvested-before.harvested,crafted:s.crafted-before.crafted,served:s.sold-before.sold};
 return s;
}
export const QUESTS=[
 {title:'第一份收获',description:'采收一次成熟作物',reward:35,goal:3,key:'harvested'},
 {title:'茶香刚刚好',description:'完成两份茶点制作',reward:45,goal:2,key:'crafted'},
 {title:'山间第一位客人',description:'售出三份茶点',reward:65,goal:3,key:'sold'},
 {title:'小院换新装',description:'把小茶摊扩建为庭院茶馆',reward:90,goal:1,key:'tier'},
 {title:'有朋自远方来',description:'累计售出十五份茶点',reward:150,goal:15,key:'sold'}
] as const;
export function applyAction(input:Save,action:Record<string,unknown>,now=Date.now()):{state:Save;message:string}{
 const s=advance(input,now);let message='已保存';const type=action.type;
 const crop=action.crop as Crop,recipe=action.recipe as Recipe;
 switch(type){
  case 'plant': if(!Object.hasOwn(CROPS,crop))throw new Error('请选择要种的作物。');plant(s,Number(action.index),crop,now);message='种下了'+CROPS[crop].name;break;
  case 'harvest':if(!harvest(s,Number(action.index),now))throw new Error('作物还在长，再等一会儿。');message='收获已放进仓库';break;
  case 'harvestAll':{let count=0;for(let i=0;i<plotCount(s);i++)if(harvest(s,i,now))count++;if(!count)throw new Error('还没有成熟的作物。');message='采收了 '+count+' 块田';break;}
  case 'cook':if(!Object.hasOwn(RECIPES,recipe))throw new Error('请选择配方。');cook(s,recipe,now);message=RECIPES[recipe].name+' 正在制作';break;
  case 'serve':{const o=serve(s,String(action.id));message='谢谢招待，收入 +'+o.payment+' 金币';break;}
  case 'open':s.open=!s.open;if(s.open)s.nextOrderAt=now+5000;message=s.open?'茶馆开门啦':'今日歇一歇，客人会耐心等你';break;
  case 'menu':{const menu=action.menu;if(!Array.isArray(menu)||!menu.length||menu.length>4||!menu.every(k=>typeof k==='string'&&availableRecipes(s).includes(k as Recipe)))throw new Error('至少选一道已解锁的茶点。');if(!['kind','normal','premium'].includes(String(action.price)))throw new Error('请选择售价。');s.menu=[...new Set(menu)] as Recipe[];s.price=action.price as Save['price'];message='菜单已挂好，新客人会按新价格点单';break;}
  case 'expand':{const next=EXPANSIONS[s.tier];if(!next)throw new Error('小院已完成全部扩建。');if(levelOf(s.xp)<next.level)throw new Error('经营等级还没达到，先招待几位客人吧。');spend(s,next.cost);s.tier++;s.xp+=16;s.roomAt=now;s.springAt=now;message='欢迎来到'+next.name;break;}
  case 'equipment':if(s.equipment>=2)throw new Error('灶台已升至最高级。');spend(s,180+s.equipment*220);s.equipment++;message='厨房升级，多一口灶，出品也更快';break;
  case 'decorate':{const kind=action.kind as Decor,slot=Number(action.slot);if(!Object.hasOwn(DECOR,kind)||!Number.isInteger(slot)||slot<0||slot>11)throw new Error('请选择院子里的摆放位置。');if(s.decor.some(d=>d.slot===slot))throw new Error('这里已经有摆设了，先挪到空位吧。');if(levelOf(s.xp)<DECOR[kind].level)throw new Error('这件摆设还没解锁。');spend(s,DECOR[kind].cost);s.decor.push({id:uid(),kind,slot});message=DECOR[kind].name+' 已放进小院';break;}
  case 'moveDecor':{const d=s.decor.find(x=>x.id===action.id),slot=Number(action.slot);if(!d||!Number.isInteger(slot)||slot<0||slot>11||s.decor.some(x=>x.slot===slot&&x.id!==d.id))throw new Error('请选择一个空位置。');d.slot=slot;message='摆设换了个位置';break;}
  case 'sellDecor':{const i=s.decor.findIndex(d=>d.id===action.id);if(i<0)throw new Error('这件摆设已不在院里。');const [d]=s.decor.splice(i,1);const refund=Math.floor(DECOR[d.kind].cost*.7);s.coins+=refund;message='收起摆设，返还 '+refund+' 金币';break;}
  case 'hire':{const person=STAFF.find(p=>p.id===action.id);if(!person||s.staff.some(p=>p.id===person.id))throw new Error('这位伙伴已经在小院里了。');if(levelOf(s.xp)<person.level)throw new Error('再提升一点经营等级，伙伴就会来。');spend(s,person.cost);s.staff.push({id:person.id,role:s.staff.some(p=>p.role===person.role)?'rest':person.role});message=person.name+' 加入了小院';break;}
  case 'assign':{const p=s.staff.find(p=>p.id===action.id),role=String(action.role) as Role;if(!p||!['farmer','cook','server','rest'].includes(role))throw new Error('请选择伙伴的岗位。');if(role!=='rest'&&s.staff.some(x=>x.id!==p.id&&x.role===role))throw new Error('这个岗位已经有人啦。');p.role=role;message='岗位安排好了';break;}
  case 'automation':if(!Object.hasOwn(CROPS,crop)||!availableRecipes(s).includes(recipe))throw new Error('请选择已解锁的作物和配方。');s.autoCrop=crop;s.autoRecipe=recipe;message='伙伴记住你的安排了';break;
  case 'claimService':if(!s.serviceBank)throw new Error('客房和温泉还在积累收入。');message='领取了 '+s.serviceBank+' 金币';s.coins+=s.serviceBank;s.revenue+=s.serviceBank;s.serviceBank=0;break;
  case 'quest':{const i=Number(action.index),q=QUESTS[i];if(!q||s.claimed.includes(i)||s[q.key]<q.goal)throw new Error('这件小事还没完成。');s.claimed.push(i);s.coins+=q.reward;s.xp+=8;message='小事完成，奖励 +'+q.reward+' 金币';break;}
  case 'hero':if(!['qingfeng','lingye'].includes(String(action.hero)))throw new Error('请选择店主。');s.hero=action.hero as Save['hero'];message='店主换好衣服啦';break;
  case 'help':s.seenHelp=true;break;
  case 'offline':s.offline=null;break;
  case 'gift':if(s.coins>=15)throw new Error('金币够用时，把援助留给需要的时候吧。');if(s.gifts>=Math.floor(now/86400000))throw new Error('今天的邻里援助已领取，先把成熟作物做成茶点吧。');s.coins+=30;s.inventory.tea+=4;s.gifts=Math.floor(now/86400000);message='邻居送来 30 金币和 4 份茶叶';break;
  default:throw new Error('小院没认出这个操作，请刷新后重试。');
 }
 s.coins=Math.max(0,Math.round(s.coins));note(s,message,now);return {state:s,message};
}
