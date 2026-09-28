// Run the actual game input handlers and animation loop against a minimal DOM.
// No test-only hooks or dependencies are shipped to players.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { WORLD, createGame, step, boundsAt, sharkTeeth, squidTentacles } from '../physics.js';
const source=readFileSync(new URL('../game.js',import.meta.url),'utf8').replace(/^const .*await import.*\n/,'');
function harness(mission = 1){
  const gradient={addColorStop(){}};
  const ctx=new Proxy({}, {get:(o,k)=>o[k]??(()=>gradient),set:(o,k,v)=>(o[k]=v,true)});
  class Element {
    constructor(){this.open=false;this.handlers={};this.style={};this.hidden=false;this.textContent='';this.firstChild={textContent:''};this.classList={toggle(){},remove(){}};this.tagName='DIV';}
    addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
    emit(type,data={}){for(const fn of this.handlers[type]??[])fn({preventDefault(){},target:this,...data});}
    setAttribute(){}
    showModal(){this.open=true;}close(){this.open=false;this.emit('close');}
    setPointerCapture(){} getBoundingClientRect(){return {left:30,top:240,width:104,height:104};}focus(){}blur(){}getContext(){return ctx;}
  }
  const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const doc=new Element();doc.hidden=false;doc.getElementById=get;doc.querySelector=selector=>get(selector.slice(1));
  const win=new Element();let callback;let now=100;
  vm.runInNewContext(source,{history:{replaceState(){}},URL,location:{href:'https://example.test/?mission='+mission},WORLD,createGame,step,boundsAt,sharkTeeth,squidTentacles,document:doc,window:win,innerWidth:844,innerHeight:390,devicePixelRatio:1,matchMedia:()=>({matches:true}),requestAnimationFrame:fn=>callback=fn,Math,Set});
  function advance(seconds){for(let i=0;i<seconds*120;i++){now+=1000/120;callback(now);}}
  advance(.05);
  return {get,doc,win,advance,key:(code,type='keydown')=>win.emit(type,{code})};
}
test('actual two-pointer joystick and boost controls complete the entire loop',()=>{
  const h=harness(),joy=h.get('joystick'),boost=h.get('boost');
  joy.emit('pointerdown',{pointerId:1,clientX:118,clientY:292});
  h.advance(7.7);assert.equal(h.get('objective').textContent,'Time to get out!');
  joy.emit('pointermove',{pointerId:1,clientX:46,clientY:292});
  boost.emit('pointerdown',{pointerId:2});h.advance(3.6);
  assert.equal(h.get('result-title').textContent,'Orb rescued!');
  h.get('next-mission').emit('click');h.advance(.1);assert.equal(h.get('objective').textContent,'Watch those teeth');assert.equal(h.get('stick').style.transform,'');assert.equal(h.get('result').hidden,true);
});
test('pointer cancellation releases joystick and boost; idle escape ends in retry',()=>{
  const h=harness(),joy=h.get('joystick'),boost=h.get('boost');
  joy.emit('pointerdown',{pointerId:1,clientX:118,clientY:292});h.advance(7.7);
  joy.emit('pointercancel',{pointerId:1});boost.emit('pointerdown',{pointerId:2});boost.emit('pointercancel',{pointerId:2});h.advance(5);
  assert.equal(h.get('stick').style.transform,'');assert.equal(h.get('result-title').textContent,'You got eaten!');
});
test('backgrounding pauses the escape clock and releases held input',()=>{
  const h=harness();h.key('ArrowRight');h.advance(7.7);h.key('ArrowRight','keyup');
  h.doc.hidden=true;h.doc.emit('visibilitychange');const before=h.get('seconds').textContent;h.advance(12);assert.equal(h.get('seconds').textContent,before);
  h.doc.hidden=false;h.doc.emit('visibilitychange');h.advance(5);assert.equal(h.get('result-title').textContent,'You got eaten!');
});

test('shark mission can be completed and Play Again replays the shark',()=>{
  const h=harness(2);h.key('ArrowRight');h.advance(7.7);h.key('ArrowRight','keyup');
  assert.equal(h.get('objective').textContent,'Time to get out!');
  h.key('ArrowLeft');h.key('Space');h.advance(3.6);
  assert.equal(h.get('result-title').textContent,'Shark outsmarted!');
  h.get('retry').emit('click');h.advance(.1);
  assert.equal(h.get('objective').textContent,'Watch those teeth');
});
test('failed shark escape retries the shark with full health',()=>{
  const h=harness(2);h.key('ArrowRight');h.advance(7.7);h.key('ArrowRight','keyup');h.advance(5);
  assert.equal(h.get('result').hidden,false);
  h.get('retry').emit('click');h.advance(.1);
  assert.equal(h.get('objective').textContent,'Watch those teeth');
  assert.equal(h.get('health-copy').textContent,'3 / 3 health');
});

test('pause and mission browsing freeze the escape clock, then resume continues it',()=>{
  const h=harness(2);h.key('ArrowRight');h.advance(7.9);h.key('ArrowRight','keyup');
  h.get('pause').emit('click');const before=h.get('seconds').textContent;
  h.advance(8);assert.equal(h.get('seconds').textContent,before);
  h.get('choose-mission').emit('click');h.advance(8);assert.equal(h.get('seconds').textContent,before);
  h.get('menu-back').emit('click');h.get('resume').emit('click');h.advance(.3);
  assert.ok(Number(h.get('seconds').textContent)<Number(before));
});
test('mission select immediately starts either mission with a fresh state',()=>{
  const h=harness();h.get('pause').emit('click');h.get('choose-mission').emit('click');
  h.get('mission-2').emit('click');h.advance(.1);assert.equal(h.get('objective').textContent,'Watch those teeth');
  assert.equal(h.get('menu').open,false);assert.equal(h.get('health-copy').textContent,'3 / 3 health');
  h.get('pause').emit('click');h.get('choose-mission').emit('click');h.get('mission-1').emit('click');h.advance(.1);
  assert.equal(h.get('objective').textContent,'Find the light');assert.equal(h.get('health').hidden,true);
});
test('Play Again keeps the first mission while Next Mission remains separate',()=>{
  const h=harness();h.key('ArrowRight');h.advance(7.7);h.key('ArrowRight','keyup');h.key('ArrowLeft');h.key('Space');h.advance(3.6);
  assert.equal(h.get('next-mission').hidden,false);h.get('retry').emit('click');h.advance(.1);
  assert.equal(h.get('objective').textContent,'Find the light');
});

test('squid can be selected directly and restart stays on the squid',()=>{
  const h=harness();h.get('pause').emit('click');h.get('choose-mission').emit('click');h.get('mission-3').emit('click');h.advance(.1);
  assert.equal(h.get('objective').textContent,'Watch the tentacles');assert.equal(h.get('seconds').textContent,'6.5');
  h.get('pause').emit('click');h.get('restart').emit('click');h.advance(.1);
  assert.equal(h.get('mission-name').textContent,'MISSION 03 · THE GIANT SQUID');assert.equal(h.get('health-copy').textContent,'3 / 3 health');
});
test('next mission after beating shark starts the squid',()=>{
  const h=harness(2);h.key('ArrowRight');h.advance(7.7);h.key('ArrowRight','keyup');h.key('ArrowLeft');h.key('Space');h.advance(3.6);
  assert.equal(h.get('next-mission').hidden,false);h.get('next-mission').emit('click');h.advance(.1);
  assert.equal(h.get('objective').textContent,'Watch the tentacles');
});
