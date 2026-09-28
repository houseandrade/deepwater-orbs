// World units and seconds. The fish never changes position; only its jaws close.
export const WORLD = { width: 3400, height: 1280, mouth: 1080, back: 2290, orbX: 2080, orbY: 583, escapeSeconds: 4.5 };
export function createGame(mission = 1) {
  return { mission: [1,2,3].includes(mission) ? mission : 1, escapeDuration: mission === 3 ? 6.5 : WORLD.escapeSeconds, ink: 0, health: 3, hurtTime: 0, suction: 0, deathReason: '', x: 460, y: 555, vx: 0, vy: 0, facingX: 1, facingY: 0, phase: 'approach', remaining: mission === 3 ? 6.5 : WORLD.escapeSeconds, time: 0, boosting: false, jaw: 0 };
}
export function boundsAt(x, jaw = 0) {
  const depth = Math.max(0, x - WORLD.mouth);
  const closure = jaw * Math.max(0, 1 - depth / 430) * 194;
  return { top: 325 + depth * .09 + closure, bottom: 755 - depth * .12 - closure };
}
// Drawing and collision use these exact triangles, including jaw movement.
export function sharkTeeth(jaw = 0) {
  const teeth = [];
  for (let i = 0; i < 9; i++) {
    const x = 1230 + i * 110;
    const upper = boundsAt(x, jaw).top;
    const length = i < 6 ? (i % 2 ? 96 : 78) : 44;
    teeth.push([[x, upper], [x + 30, upper + length], [x + 62, boundsAt(x + 62, jaw).top]]);
    if (i < 6) {
      const bx = x + 45, lower = boundsAt(bx, jaw).bottom;
      teeth.push([[bx, lower], [bx + 27, lower - (i % 2 ? 72 : 58)], [bx + 58, boundsAt(bx + 58, jaw).bottom]]);
    }
  }
  return teeth;
}
export function touchesTooth(x, y, triangle, radius = 17) {
  const cross = (a, b) => (x - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (y - b[1]);
  const signs = triangle.map((a, i) => cross(a, triangle[(i + 1) % 3]));
  if (signs.every(v => v >= 0) || signs.every(v => v <= 0)) return true;
  return triangle.some((a, i) => {
    const b = triangle[(i + 1) % 3], dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x-a[0])*dx + (y-a[1])*dy) / (dx*dx + dy*dy)));
    return (x-a[0]-t*dx)**2 + (y-a[1]-t*dy)**2 <= radius**2;
  });
}
// Each capsule is both the visible arm and its collision shape.
export function squidTentacles(time, jaw = 0) {
  const arms = [];
  for (let i = 0; i < 2; i++) {
    const x = 1430 + i * 350, wall = boundsAt(x, jaw);
    const center = 540 + Math.sin(time * .9 + i * 2) * 70;
    const sway = Math.sin(time * .7 + i) * 16;
    arms.push({a:[x,wall.top+6],b:[x+sway,center-100],radius:20});
    arms.push({a:[x+34,wall.bottom-6],b:[x+20+sway,center+100],radius:20});
  }
  return arms;
}
export function touchesTentacle(x, y, arm, radius = 17) {
  const dx=arm.b[0]-arm.a[0],dy=arm.b[1]-arm.a[1];
  const length=dx*dx+dy*dy;
  const t=length ? Math.max(0,Math.min(1,((x-arm.a[0])*dx+(y-arm.a[1])*dy)/length)) : 0;
  return (x-arm.a[0]-t*dx)**2+(y-arm.a[1]-t*dy)**2 <= (radius+arm.radius)**2;
}
function tentacleHit(s,x,y,arms) {
  if(!arms.some(arm=>touchesTentacle(x,y,arm))) return false;
  damage(s,'tentacles');
  return true;
}
function damage(s,reason) {
  if(s.hurtTime>0) return;
  s.health=Math.max(0,s.health-1);s.hurtTime=1.2;
  if(!s.health){s.phase='eaten';s.deathReason=reason;}
}
function toothHit(s, x, y, teeth) {
  const tooth = teeth.find(t => touchesTooth(x, y, t));
  if (!tooth) return false;
  damage(s,'teeth');
  return true;
}
export function solid(x, y, jaw = 0, radius = 17) {
  if (x < radius || x > WORLD.width - radius || y < radius + 75 || y > WORLD.height - radius - 40) return true;
  const ellipse = ((x - 2130) / (1050 + radius)) ** 2 + ((y - 570) / (550 + radius)) ** 2;
  if (ellipse > 1) return false;
  const b = boundsAt(x, jaw);
  return !(x < WORLD.back - radius && y > b.top + radius + 16 && y < b.bottom - radius);
}
export function step(s, input, dt) {
  if (s.phase === 'won' || s.phase === 'eaten') return;
  s.time += dt;
  s.hurtTime = Math.max(0, s.hurtTime - dt);
  const teeth = s.mission === 2 ? sharkTeeth(s.jaw) : [];
  const arms = s.mission === 3 ? squidTentacles(s.time,s.jaw) : [];
  // Moving arms can make contact even when the swimmer stays still.
  if(arms.length) tentacleHit(s,s.x,s.y,arms);
  if(s.phase==='eaten') return;
  let ix = input.x || 0, iy = input.y || 0;
  const magnitude = Math.hypot(ix, iy);
  if (magnitude > 1) { ix /= magnitude; iy /= magnitude; }
  const active = magnitude > .06;
  if (active) { const m = Math.hypot(ix, iy); s.facingX = ix / m; s.facingY = iy / m; }
  s.boosting = !!input.boost;
  // Linear drag leaves a readable glide, while acceleration makes direction changes soft.
  const drag = active || s.boosting ? 2.6 : 1.45;
  const acceleration = s.boosting ? 1410 : 590;
  const ax = s.boosting && !active ? s.facingX : ix;
  const ay = s.boosting && !active ? s.facingY : iy;
  // A short readable pulse pulls inward; a held outward boost overcomes it.
  const escapeAge = s.escapeDuration - s.remaining;
  s.ink = s.mission === 3 && s.phase === 'escape' && escapeAge > .35 && escapeAge < 2.75 ? Math.sin((escapeAge-.35)/2.4*Math.PI) : 0;
  s.suction = s.mission === 2 && s.phase === 'escape' && escapeAge >= .35 && escapeAge < 1.65 ? 1 : 0;
  s.vx = (s.vx + (ax * acceleration + s.suction * 650) * dt) * Math.exp(-drag * dt);
  s.vy = (s.vy + ay * acceleration * dt) * Math.exp(-drag * dt);
  // Small swept increments prevent a boost from tunnelling through the fish.
  const count = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vy) * dt / 7));
  for (let i = 0; i < count; i++) {
    const nx = s.x + s.vx * dt / count;
    if (!solid(nx, s.y, s.jaw) && !toothHit(s, nx, s.y, teeth) && !tentacleHit(s,nx,s.y,arms)) s.x = nx; else s.vx = 0;
    const ny = s.y + s.vy * dt / count;
    if (!solid(s.x, ny, s.jaw) && !toothHit(s, s.x, ny, teeth) && !tentacleHit(s,s.x,ny,arms)) s.y = ny; else s.vy = 0;
  }
  if (s.phase === 'eaten') return;
  if (s.phase === 'approach' && s.x > WORLD.mouth + 40) s.phase = 'inside';
  if (s.phase === 'inside' && s.x < WORLD.mouth - 40) s.phase = 'approach';
  if ((s.phase === 'inside' || s.phase === 'approach') && Math.hypot(s.x - WORLD.orbX, s.y - WORLD.orbY) < 49) {
    s.phase = 'escape'; s.remaining = s.escapeDuration;
  }
  if (s.phase === 'escape') {
    s.remaining = Math.max(0, s.remaining - dt);
    s.jaw = (1 - s.remaining / s.escapeDuration) ** 2;
    if (s.mission === 2) toothHit(s, s.x, s.y, sharkTeeth(s.jaw));
    if (s.phase === 'eaten') return;
    // Clearing the entire swimmer past the lips is an escape.
    if (s.x < WORLD.mouth - 48) s.phase = 'won';
    else if (s.remaining <= 0) { s.phase = 'eaten'; s.jaw = 1; }
  }
}
