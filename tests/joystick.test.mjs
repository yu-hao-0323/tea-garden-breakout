import assert from 'node:assert/strict';
import {floatingStick} from '../dist/joystick.js';
const b={left:48,right:300,top:48,bottom:200};
let r=floatingStick({x:100,y:100},{x:100,y:100},32,b);assert.equal(r.x,0);assert.equal(r.y,0);
r=floatingStick({x:100,y:100},{x:116,y:100},32,b);assert.equal(r.x,.5);assert.equal(r.center.x,100);
r=floatingStick({x:100,y:100},{x:220,y:100},32,b);assert.equal(r.center.x,188);assert.equal(r.x,1);
r=floatingStick(r.center,{x:170,y:100},32,b);assert.ok(r.x<0,'reversing the thumb reverses movement immediately');
r=floatingStick({x:100,y:100},{x:900,y:800},32,b);assert.ok(r.center.x<=300&&r.center.y<=200);assert.ok(Math.hypot(r.x,r.y)<=1.000001);
console.log('PASS: floating origin, follow, reversal and bounds');
