import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, solid, WORLD, sharkTeeth, touchesTooth, squidTentacles, touchesTentacle } from '../physics.js';
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

test('shark suction is a short inward pulse that an outward boost overcomes',()=>{
  const shark=createGame(2),fish=createGame(1);
  for(const s of [shark,fish]){s.x=1900;s.phase='escape';s.remaining=4;}
  step(shark,{x:-1},1/120);step(fish,{x:-1},1/120);
  assert.equal(shark.suction,1);assert.ok(shark.vx>0);assert.ok(fish.vx<0);
  step(shark,{x:-1,boost:true},1/120);assert.ok(shark.vx<0);
  shark.remaining=2.7;step(shark,{x:-1},1/120);assert.equal(shark.suction,0);
});

test('squid tentacles move and collision matches their rounded tips',()=>{
  const a=squidTentacles(0)[0], b=squidTentacles(1)[0];
  assert.notEqual(a.b[1],b.b[1]);assert.ok(touchesTentacle(...a.b,a));
  assert.ok(!touchesTentacle(a.b[0]+60,a.b[1],a));
});
test('tentacle contact costs a heart, protects briefly, and can exhaust health',()=>{
  const s=createGame(3);s.phase='inside';
  const contact=()=>{const arm=squidTentacles(s.time+1/120)[0];s.x=arm.b[0];s.y=arm.b[1];step(s,{},1/120);};
  contact();assert.equal(s.health,2);contact();assert.equal(s.health,2);
  s.hurtTime=0;contact();s.hurtTime=0;contact();assert.equal(s.health,0);assert.equal(s.deathReason,'tentacles');
  const retry=createGame(3);assert.equal(retry.health,3);assert.equal(retry.ink,0);assert.equal(retry.remaining,6.5);
});
test('squid ink is temporary and does not reuse shark suction',()=>{
  const s=createGame(3);s.phase='escape';s.x=2020;s.remaining=5.3;
  step(s,{},1/120);assert.ok(s.ink>0);assert.equal(s.suction,0);
  s.remaining=3;step(s,{},1/120);assert.equal(s.ink,0);
});
test('steering through moving gaps permits a full-health squid escape',()=>{
  for(const initialTime of [0,3,6]){
    const s=createGame(3);s.time=initialTime;
    for(let i=0;i<3600&&!['eaten','won'].includes(s.phase);i++){
      const out=s.phase==='escape',dir=out?-1:1;
      const gate=out?(s.x>1730?1:s.x>1370?0:null):(s.x<1500?0:s.x<1850?1:null);
      let target=out?545:583;
      if(gate!==null){const x=1430+gate*350,look=Math.max(0,Math.abs(x-s.x)/(out?460:215));target=540+Math.sin((s.time+look)*.9+gate*2)*70;}
      step(s,{x:dir,y:Math.max(-.65,Math.min(.65,(target-s.y)/65-s.vy/350)),boost:out},1/120);
    }
    assert.equal(s.phase,'won');assert.equal(s.health,3);
  }
});

test('shark collision follows its projecting snout and leaves the mouth open',()=>{
  assert.equal(solid(1020,210,0,17,2),true);
  assert.equal(solid(950,540,0,17,2),false);
  assert.equal(solid(1150,555,0,17,2),false);
  const s=createGame(2);s.x=850;s.y=210;
  run(s,{x:1,boost:true},1);
  assert.ok(s.x<1020);assert.ok(!solid(s.x,s.y,s.jaw,17,2));
});
