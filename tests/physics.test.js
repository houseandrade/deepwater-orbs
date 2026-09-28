import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, solid, WORLD } from '../physics.js';
function run(s,input,seconds,hz=120){for(let i=0;i<Math.round(seconds*hz);i++)step(s,input,1/hz);}
test('analog input controls speed; release glides and eventually settles',()=>{const full=createGame(),half=createGame();run(full,{x:1},1);run(half,{x:.5},1);assert.ok(full.vx>half.vx*1.9);const x=full.x;run(full,{},.2);assert.ok(full.x>x&&full.vx>0);run(full,{},5);assert.ok(full.vx<1);});
test('diagonal input does not exceed cardinal speed',()=>{const a=createGame(),b=createGame();run(a,{x:1},1);run(b,{x:1,y:1},1);assert.ok(Math.abs(Math.hypot(b.vx,b.vy)-a.vx)<.001);});
test('swims continuously through mouth and collects tongue orb',()=>{const s=createGame();run(s,{x:1},7.6);assert.equal(s.phase,'escape');assert.ok(s.x>2000);});
test('boost lets swimmer turn and clear the lips before closure',()=>{const s=createGame();run(s,{x:1},7.6);run(s,{x:-1,boost:true},3.5);assert.equal(s.phase,'won');assert.ok(s.x<WORLD.mouth-48);});
test('failure to escape gets eaten; retry restores orb and jaws',()=>{const s=createGame();run(s,{x:1},7.6);run(s,{},5);assert.equal(s.phase,'eaten');const retry=createGame();assert.equal(retry.phase,'approach');assert.equal(retry.jaw,0);assert.equal(retry.remaining,WORLD.escapeSeconds);});
test('fish body blocks entry from above and sides even at boost speed',()=>{assert.equal(solid(1700,250),true);assert.equal(solid(1700,530),false);const s=createGame();s.x=1700;s.y=530;run(s,{y:-1,boost:true},1);assert.ok(s.y>390);assert.ok(!solid(s.x,s.y));});
test('swim is consistent across frame rates',()=>{const a=createGame(),b=createGame();run(a,{x:1},1,60);run(b,{x:1},1,120);assert.ok(Math.abs(a.x-b.x)<4);});
