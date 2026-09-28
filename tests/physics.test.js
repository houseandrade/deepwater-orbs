import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, solid, WORLD, sharkTeeth, touchesTooth } from '../physics.js';
function run(s,input,seconds,hz=120){for(let i=0;i<Math.round(seconds*hz);i++)step(s,input,1/hz);}
test('analog input controls speed; release glides and eventually settles',()=>{const full=createGame(),half=createGame();run(full,{x:1},1);run(half,{x:.5},1);assert.ok(full.vx>half.vx*1.9);const x=full.x;run(full,{},.2);assert.ok(full.x>x&&full.vx>0);run(full,{},5);assert.ok(full.vx<1);});
test('diagonal input does not exceed cardinal speed',()=>{const a=createGame(),b=createGame();run(a,{x:1},1);run(b,{x:1,y:1},1);assert.ok(Math.abs(Math.hypot(b.vx,b.vy)-a.vx)<.001);});
test('swims continuously through mouth and collects tongue orb',()=>{const s=createGame();run(s,{x:1},7.6);assert.equal(s.phase,'escape');assert.ok(s.x>2000);});
test('boost lets swimmer turn and clear the lips before closure',()=>{const s=createGame();run(s,{x:1},7.6);run(s,{x:-1,boost:true},3.5);assert.equal(s.phase,'won');assert.ok(s.x<WORLD.mouth-48);});
test('failure to escape gets eaten; retry restores orb and jaws',()=>{const s=createGame();run(s,{x:1},7.6);run(s,{},5);assert.equal(s.phase,'eaten');const retry=createGame();assert.equal(retry.phase,'approach');assert.equal(retry.jaw,0);assert.equal(retry.remaining,WORLD.escapeSeconds);});
test('fish body blocks entry from above and sides even at boost speed',()=>{assert.equal(solid(1700,250),true);assert.equal(solid(1700,530),false);const s=createGame();s.x=1700;s.y=530;run(s,{y:-1,boost:true},1);assert.ok(s.y>390);assert.ok(!solid(s.x,s.y));});
test('swim is consistent across frame rates',()=>{const a=createGame(),b=createGame();run(a,{x:1},1,60);run(b,{x:1},1,120);assert.ok(Math.abs(a.x-b.x)<4);});

test('shark tooth triangles hit at their point but not in surrounding water',()=>{
  const triangle=sharkTeeth()[0], tip=triangle[1];
  assert.ok(touchesTooth(tip[0],tip[1]+10,triangle));
  assert.ok(!touchesTooth(tip[0]+65,tip[1]+10,triangle));
});
test('tooth hit costs one heart with brief protection and eventual health failure',()=>{
  const s=createGame(2),tip=sharkTeeth()[2][1];
  s.x=tip[0];s.y=tip[1]+18;s.phase='inside';
  run(s,{y:-1},.2);assert.equal(s.health,2);assert.ok(s.hurtTime>0);
  run(s,{y:-1},.5);assert.equal(s.health,2);
  run(s,{y:-1},3);assert.equal(s.health,0);assert.equal(s.phase,'eaten');assert.equal(s.deathReason,'teeth');
});
test('boost cannot tunnel through shark teeth',()=>{
  const s=createGame(2),tip=sharkTeeth()[2][1];
  s.x=tip[0];s.y=tip[1]+80;s.vy=-1000;s.phase='inside';
  step(s,{y:-1,boost:true},.1);assert.equal(s.health,2);assert.ok(s.y>tip[1]);
});
test('first fish remains harmless on contact with its teeth',()=>{
  const s=createGame(),tip=sharkTeeth()[2][1];s.x=tip[0];s.y=tip[1]+18;
  run(s,{y:-1},3);assert.equal(s.health,3);
});
test('shark has a clear route to the orb and a successful boosted escape',()=>{
  const s=createGame(2);run(s,{x:1},7.6);assert.equal(s.phase,'escape');
  run(s,{x:-1,boost:true},3.5);assert.equal(s.phase,'won');assert.equal(s.health,3);
});
