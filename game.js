const { WORLD, createGame, step, boundsAt, sharkTeeth } = await import('./physics.js' + new URL(import.meta.url).search);
const canvas = document.querySelector('#ocean'), ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const joystick = $('joystick'), stick = $('stick'), boost = $('boost');
const input = { x: 0, y: 0, boost: false }, keys = new Set(), boostPointers = new Set();
let state = createGame(new URL(location.href).searchParams.get('mission') === '2' ? 2 : 1), width = 0, height = 0, dpr = 1, camera = { x: 855, y: 557, scale: 1 }, last = 0, accumulator = 0, stickPointer = null, previousPhase = '', previousHealth = -1, previousMission = 0, paused = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let bubbles = [];
function resize() {
  width = innerWidth; height = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  paused = height > width && width <= 1000;
  clearInput();
}
function clearInput() { keys.clear(); boostPointers.clear(); stickPointer = null; input.x = input.y = 0; input.boost = false; stick.style.transform = ''; boost.classList.remove('active'); }
function moveStick(e) {
  const r = joystick.getBoundingClientRect(), radius = r.width * .34;
  let x = (e.clientX - r.left - r.width / 2) / radius, y = (e.clientY - r.top - r.height / 2) / radius;
  const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
  input.x = x; input.y = y; stick.style.transform = `translate(${x * radius}px,${y * radius}px)`;
}
joystick.addEventListener('pointerdown', e => { if (stickPointer !== null) return; e.preventDefault(); stickPointer = e.pointerId; joystick.setPointerCapture(e.pointerId); moveStick(e); });
joystick.addEventListener('pointermove', e => { if (e.pointerId === stickPointer) moveStick(e); });
function releaseStick(e) { if (e.pointerId !== stickPointer) return; stickPointer = null; input.x = input.y = 0; stick.style.transform = ''; }
for (const type of ['pointerup','pointercancel','lostpointercapture']) joystick.addEventListener(type, releaseStick);
boost.addEventListener('pointerdown', e => { e.preventDefault(); boostPointers.add(e.pointerId); boost.setPointerCapture(e.pointerId); });
for (const type of ['pointerup','pointercancel','lostpointercapture']) boost.addEventListener(type, e => boostPointers.delete(e.pointerId));
window.addEventListener('keydown', e => { if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) { if (e.code !== 'Space' || e.target.tagName !== 'BUTTON') { e.preventDefault(); keys.add(e.code); } } });
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { clearInput(); last = 0; accumulator = 0; });
window.addEventListener('resize', resize);
window.addEventListener('contextmenu', e => e.preventDefault());
$('retry').addEventListener('click', () => { state = createGame(state.phase === 'won' ? (state.mission === 1 ? 2 : 1) : state.mission); camera.x = 855; camera.y = 557; camera.scale = height / Math.max(900,1750*height/width); bubbles = []; previousPhase = ''; clearInput(); $('result').hidden = true; $('controls').hidden = false; $('retry').blur(); last = 0; accumulator = 0; });
function ellipse(x,y,rx,ry,color) { ctx.fillStyle=color; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill(); }
function path(points,color,stroke,line=1) { ctx.beginPath(); points(ctx); if(color){ctx.fillStyle=color;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();} }
function glow(x,y,r,color) { const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ellipse(x,y,r,r,g); }
function background(t) {
  const g=ctx.createLinearGradient(0,0,0,height);g.addColorStop(0,'#103e4d');g.addColorStop(.5,'#082c3b');g.addColorStop(1,'#041923');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
  ctx.save();ctx.globalAlpha=.045;
  for(let i=0;i<5;i++){let x=(i*350-camera.x*.11)*height/800;path(p=>{p.moveTo(x,-20);p.lineTo(x+100,-20);p.lineTo(x+440,height);p.lineTo(x+160,height);p.closePath();},'#9aefdf');}ctx.restore();
  // Distant rock shelves move more slowly than the foreground.
  for(let layer=0;layer<2;layer++){const base=height*(.76+layer*.14);path(p=>{p.moveTo(0,height);for(let x=0;x<=width+30;x+=30){const wx=x+camera.x*(.12+layer*.06);p.lineTo(x,base+Math.sin(wx*.007+layer)*32+Math.sin(wx*.018)*13);}p.lineTo(width,height);p.closePath();},layer?'#07232b':'#0a303b');}
  for(let i=0;i<65;i++){let x=((i*173.91-camera.x*.19)%(width+40)+width+40)%(width+40)-20;let y=((i*97.73-t*(3+i%5))%(height+30)+height+30)%(height+30)-15;ellipse(x,y,i%7===0?1.6:.8,i%7===0?1.6:.8,'#98d5cd38');}
}
function fish(t) {
  const shark = state.mission === 2;
  // One fixed, enormous silhouette, with a cutaway mouth in the same world coordinates.
  path(p=>{p.moveTo(2920,520);p.bezierCurveTo(3160,280,3290,260,3240,470);p.quadraticCurveTo(3195,580,3260,760);p.quadraticCurveTo(3150,865,2910,650);p.closePath();},'#285963','#39717a',5);
  if (shark) path(p=>{p.moveTo(1670,125);p.lineTo(2000,-170);p.lineTo(2100,70);p.lineTo(2460,125);p.closePath();},'#566e7b','#77919c',4);
  else path(p=>{p.moveTo(1690,90);p.quadraticCurveTo(2180,-155,2610,100);p.lineTo(2400,230);p.closePath();},'#285560','#3a6b72',4);
  const body=ctx.createLinearGradient(1500,30,1900,1120);body.addColorStop(0,shark?'#788e9b':'#467979');body.addColorStop(.35,shark?'#4d677d':'#315f68');body.addColorStop(.75,shark?'#9bb3b8':'#234a58');body.addColorStop(1,shark?'#c1cfc9':'#153644');
  ellipse(2130,570,1050,550,body);
  ctx.save();ctx.beginPath();ctx.ellipse(2130,570,1046,545,0,0,Math.PI*2);ctx.clip();
  if (!shark) for(let row=0;row<9;row++)for(let col=0;col<16;col++){let x=1350+col*122+(row%2)*60,y=90+row*126;ctx.beginPath();ctx.arc(x,y,49,.1,2.8);ctx.strokeStyle='#98c4ad0c';ctx.lineWidth=3;ctx.stroke();}
  glow(1480,270,400,'#c3ddb817');ctx.restore();
  // Gills and a quiet pectoral fin establish the size of the creature.
  for(let i=0;i<(shark?5:3);i++)path(p=>{p.moveTo(2460+i*60,390);p.quadraticCurveTo(2540+i*65,590,2460+i*60,760);},null,'#132f3b66',13);
  if(shark) path(p=>{p.moveTo(2440,680);p.lineTo(2810,1050);p.lineTo(2520,920);p.lineTo(2350,710);p.closePath();},'#496477','#95acb655',4);
  else path(p=>{p.moveTo(2520,660);p.quadraticCurveTo(2900,720,2710,975);p.quadraticCurveTo(2520,900,2470,710);},'#275561','#48778055',4);
  const eyeX=1430,eyeY=218;
  if (shark) {
    ellipse(eyeX,eyeY,48,35,'#32485d');
    ellipse(eyeX-5,eyeY,30,26,'#101e30');
    ellipse(eyeX-14,eyeY-9,7,5,'#c6ebec');
    path(p=>{p.moveTo(1375,175);p.lineTo(1485,202);},null,'#364d61',12);
  } else {
    glow(eyeX,eyeY,100,'#c6dfa815');ellipse(eyeX,eyeY,63,60,'#224651');ellipse(eyeX,eyeY,44,44,'#c1c79b');ellipse(eyeX-8,eyeY+3,18,28,'#132e39');ellipse(eyeX-18,eyeY-13,7,7,'#f1edc8');
    path(p=>{p.moveTo(1365,160);p.quadraticCurveTo(1430,126,1498,165);},null,'#648983',13);
  }
  // Keep the entire cutaway inside the same silhouette used for the body.
  // The opening now follows the fish's curved face instead of drawing a
  // rectangular mouth in front of it. This also contains the closing jaws.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(2130,570,1050,550,0,0,Math.PI*2);
  ctx.clip();
  const a=boundsAt(1000,state.jaw),b=boundsAt(WORLD.back,state.jaw);
  const mouth=ctx.createLinearGradient(1000,530,2310,530);mouth.addColorStop(0,'#10252f');mouth.addColorStop(.3,'#252839');mouth.addColorStop(1,'#392334');
  path(p=>{p.moveTo(1005,a.top);p.bezierCurveTo(1440,boundsAt(1440,state.jaw).top,2070,b.top-26,WORLD.back,b.top);p.quadraticCurveTo(2380,520,WORLD.back,b.bottom);p.bezierCurveTo(1900,b.bottom+45,1450,boundsAt(1450,state.jaw).bottom,1005,a.bottom);p.quadraticCurveTo(1060,545,1005,a.top);p.closePath();},mouth,'#729288',12);
  // Interior ridges remain anchored as the camera follows the swimmer past them.
  for(let i=0;i<5;i++){const x=1460+i*170;const wall=boundsAt(x,state.jaw);path(p=>{p.moveTo(x,wall.top+17);p.quadraticCurveTo(x+110,525,x,wall.bottom-10);},null,'#84556718',10);}
  const tongue=ctx.createLinearGradient(0,580,0,760);tongue.addColorStop(0,'#ad6b7e');tongue.addColorStop(.3,'#80546c');tongue.addColorStop(1,'#49394f');
  path(p=>{p.moveTo(1110,boundsAt(1110,state.jaw).bottom-8);p.bezierCurveTo(1500,690,1810,585,2100,620);p.quadraticCurveTo(2260,604,2287,b.bottom-8);p.bezierCurveTo(1920,b.bottom+40,1450,boundsAt(1450,state.jaw).bottom-4,1110,boundsAt(1110,state.jaw).bottom-8);p.closePath();},tongue);
  path(p=>{p.moveTo(1440,688);p.quadraticCurveTo(1800,625,2040,634);},null,'#db96a04d',3);
  if (shark) {
    for (const tooth of sharkTeeth(state.jaw)) {
      path(p=>{p.moveTo(...tooth[0]);p.lineTo(...tooth[1]);p.lineTo(...tooth[2]);p.closePath();},'#edf2de','#9fb5ba',1.5);
    }
  } else for(let i=0;i<9;i++){const x=1105+i*115,wall=boundsAt(x,state.jaw),len= i<3?48:30;
    path(p=>{p.moveTo(x,wall.top+3);p.lineTo(x+20,wall.top+len);p.quadraticCurveTo(x+37,wall.top+25,x+40,wall.top+5);p.closePath();},'#b3c3ae');
    if(i<4)path(p=>{p.moveTo(x,wall.bottom-5);p.lineTo(x+22,wall.bottom-35);p.lineTo(x+41,wall.bottom-7);p.closePath();},'#91aa9f');
  }
  if(state.phase!=='escape'&&state.phase!=='won'&&state.phase!=='eaten')drawOrb(WORLD.orbX,WORLD.orbY,t,1);
  ctx.restore();
}
function drawOrb(x,y,t,scale) {ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);glow(0,0,125,'#dfef8b22');glow(0,0,55,'#e5f3a53a');ellipse(0,0,24,24,'#dcecb0');ellipse(-5,-7,10,8,'#f4f9d8');ctx.strokeStyle='#e7f0b74d';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,34+Math.sin(t*2)*3,0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++){const a=t*.6+i*Math.PI/2;ellipse(Math.cos(a)*43,Math.sin(a)*43,2,2,'#ecf6c6');}ctx.restore();}
function seabed(t) {
  path(p=>{p.moveTo(-200,1170);for(let x=-200;x<3600;x+=90)p.lineTo(x,1155+Math.sin(x*.009)*23);p.lineTo(3600,1500);p.lineTo(-200,1500);p.closePath();},'#0b2c31');
  for(let i=0;i<38;i++){const x=i*93+20, y=1150+Math.sin(x*.009)*23;path(p=>{p.moveTo(x,y+30);p.quadraticCurveTo(x-28,y-70,x+Math.sin(t*.7+i)*16,y-95-i%5*15);},null,i%2?'#23524d':'#174742',8);}
  for(let i=0;i<13;i++)ellipse(i*261,1175,80+(i%3)*30,30,'#10393d');
}
function swimmer(t) {
  const angle=Math.atan2(state.facingY,state.facingX), speed=Math.hypot(state.vx,state.vy);
  if(!paused&&!document.hidden&&state.phase!=='won'&&state.phase!=='eaten'&&!reducedMotion&&speed>50&&Math.random()<.35){bubbles.push({x:state.x-Math.cos(angle)*30,y:state.y-Math.sin(angle)*30,life:1,r:2+Math.random()*4});}
  ctx.save();
  if(state.hurtTime>0) ctx.globalAlpha=reducedMotion ? .65 : .45+.4*Math.abs(Math.sin(state.time*14));
  ctx.translate(state.x,state.y);ctx.rotate(angle);
  glow(6,0,75,'#b7e9d90d');
  const kick=Math.sin(t*(state.boosting?20:10))*(speed>30?7:2);
  path(p=>{p.moveTo(-15,-5);p.lineTo(-35,-8+kick);p.lineTo(-48,-15+kick);p.lineTo(-53,-5+kick);p.lineTo(-33,1);p.lineTo(-12,5);},'#e2c483');
  path(p=>{p.moveTo(-15,5);p.lineTo(-35,10-kick);p.lineTo(-49,16-kick);p.lineTo(-53,7-kick);p.lineTo(-33,-1);},'#baad76');
  ellipse(-4,0,23,10,'#e4a873');ellipse(-7,-8,15,5,'#adc7b7');
  path(p=>{p.moveTo(2,3);p.quadraticCurveTo(10,19,23,10);},null,'#f2c392',5);
  ellipse(20,-1,12,12,'#eac199');ellipse(25,-3,9,7,'#244952');ellipse(27,-5,5,3,'#a5dfd8');
  ctx.restore();
  if(state.phase==='escape'||state.phase==='won')drawOrb(state.x,state.y-34,t,.35);
}
function guide() {
  if(state.phase==='won'||state.phase==='eaten')return;
  const escape=state.phase==='escape',targetX=escape?WORLD.mouth-85:WORLD.orbX,targetY=escape?545:WORLD.orbY;
  let sx=(targetX-camera.x)*camera.scale+width/2,sy=(targetY-camera.y)*camera.scale+height/2;
  if(sx>width-75||sx<75){const right=sx>width-75;sx=right?width-52:52;sy=Math.max(height*.38,Math.min(height*.6,sy));ctx.save();ctx.translate(sx,sy);ctx.strokeStyle=escape?'#f2c19c':'#d3e8ab';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(right?-6:6,-6);ctx.lineTo(right?0:0,0);ctx.lineTo(right?-6:6,6);ctx.stroke();ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillStyle=escape?'#f2c19c':'#c1d9b6';ctx.fillText(escape?'OUT':'ORB',0,25);ctx.restore();}
}
function ui() {
  const shark = state.mission === 2;
  if (previousMission !== state.mission) {
    previousMission = state.mission;
    $('mission-name').textContent = shark ? 'MISSION 02 · THE SHARK' : 'MISSION 01 · THE GIANT FISH';
    $('health').hidden = !shark;
  }
  if (previousHealth !== state.health) {
    previousHealth = state.health;
    $('hearts').textContent = '♥'.repeat(state.health) + '♡'.repeat(3 - state.health);
    $('health-copy').textContent = state.health + ' / 3 health';
  }
  if(previousPhase!==state.phase){
    previousPhase=state.phase;
    const messages={approach:[shark?'Watch those teeth':'Find the light',shark?'Enter the shark’s mouth · teeth take 1 heart':'Swim into the giant fish’s mouth'],inside:['A little deeper',shark?'Stay between the teeth · touch the orb':'Touch the glowing orb on the tongue'],escape:['Time to get out!','Turn left + hold BOOST'],won:['Orb rescued','Safe in the open water'],eaten:['Gulp!','Give it another go']};
    $('objective').textContent=messages[state.phase][0];$('hint').textContent=messages[state.phase][1];$('escape').hidden=state.phase!=='escape';
    if(state.phase==='won'||state.phase==='eaten'){
      const won=state.phase==='won', teeth=state.deathReason==='teeth';
      $('result-symbol').textContent=won?'✦':teeth?'♡':'◉';
      $('result-eyebrow').textContent=won?(shark?'BOTH ORBS RESCUED':'MISSION 01 COMPLETE'):'GIVE IT ANOTHER GO';
      $('result-title').textContent=won?(shark?'Shark outsmarted!':'Orb rescued!'):teeth?'Out of health!':'You got eaten!';
      $('result-copy').textContent=won?(shark?'Sharp teeth. Even sharper swimming.':'Next up: a shark with a much sharper smile.'):teeth?'Those teeth are sharp. Try swimming through the middle.':'That fish was hungry. Give it another go.';
      $('retry').firstChild.textContent=won?(shark?'Play both again ':'Next: the shark '):'Try again ';
      $('result').hidden=false;$('controls').hidden=true;clearInput();$('retry').focus({preventScroll:true});
    }
  }
  $('seconds').textContent=state.remaining.toFixed(1);$('timer-fill').style.transform=`scaleX(${state.remaining/WORLD.escapeSeconds})`;boost.classList.toggle('active',state.boosting);
}
function frame(now) {
  const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  const playing=!paused&&!document.hidden;
  if(playing){const keyboardX=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));const keyboardY=Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'));input.boost=boostPointers.size>0||keys.has('Space');const movement={x:stickPointer!==null?input.x:keyboardX,y:stickPointer!==null?input.y:keyboardY,boost:input.boost};accumulator+=dt;while(accumulator>=1/120){step(state,movement,1/120);accumulator-=1/120;}}
  const depth=Math.max(0,Math.min(1,(state.x-900)/900));const targetScale=height/(Math.max(900,1750*height/width)-depth*175);const smoothing=1-Math.exp(-dt*3);
  camera.scale+=(targetScale-camera.scale)*smoothing;
  const lookAhead=state.phase==='escape'?-160:190;
  const targetX=Math.max(width/(2*camera.scale)-50,state.x+lookAhead);
  camera.x+=(targetX-camera.x)*smoothing;camera.y+=(state.y-camera.y)*(1-Math.exp(-dt*2.3));
  ctx.setTransform(dpr,0,0,dpr,0,0);background(state.time);ctx.save();ctx.translate(width/2,height/2);ctx.scale(camera.scale,camera.scale);ctx.translate(-camera.x,-camera.y);fish(state.time);seabed(state.time);
  bubbles=bubbles.filter(b=>b.life>0);for(const b of bubbles){if(playing){b.life-=dt*.85;b.y-=dt*25;}ctx.strokeStyle=`rgba(170,219,213,${Math.max(0,b.life)*.3})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.stroke();}swimmer(state.time);ctx.restore();guide();ui();requestAnimationFrame(frame);
}
resize();camera.scale=height/Math.max(900,1750*height/width);requestAnimationFrame(frame);
