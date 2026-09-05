import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const html=readFileSync(resolve(root,'index.html'),'utf8'),script=readFileSync(resolve(root,'game.js'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'HTML IDs must be unique');
for(const m of script.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(m[1]),'missing control: '+m[1]);
for(const m of html.matchAll(/(?:src|href)="(\.\/[^"?]+)(?:\?[^"]*)?"/g))assert.ok(existsSync(resolve(root,m[1])),'missing local asset: '+m[1]);
for(const name of ['qingfeng','lingye','garden','qingfeng-motion','lingye-motion']){
 const p=resolve(root,`assets/${name}.png`);assert.ok(existsSync(p));const data=readFileSync(p);assert.equal(data.subarray(1,4).toString(),'PNG');
 if(name.endsWith('motion')){assert.equal(data.readUInt32BE(16),data.readUInt32BE(20),'square animation atlas');assert.ok(data.length>100000);}
}
assert.ok(html.includes('orientation-screen'));assert.ok(html.includes('hero-preview'));assert.ok(script.includes("orientationBlocked||game?.state!=="),'joystick has an orientation guard');
console.log('PASS: controls, relative paths, both motion atlases, and portrait input guards.');
