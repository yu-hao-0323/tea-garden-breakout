import assert from 'node:assert/strict';
import {requiresLandscape} from '../dist/orientation.js';
assert.equal(requiresLandscape({width:390,height:844,coarse:true}),true,'phone portrait is blocked');
assert.equal(requiresLandscape({width:844,height:390,coarse:true}),false,'phone landscape is playable');
assert.equal(requiresLandscape({width:768,height:1024,coarse:true}),true,'touch portrait is blocked');
assert.equal(requiresLandscape({width:1024,height:768,coarse:true}),false,'touch landscape is playable');
assert.equal(requiresLandscape({width:600,height:900,coarse:false}),false,'narrow desktop windows remain usable');
console.log('PASS: phone/tablet portrait gate, landscape play, desktop compatibility.');
