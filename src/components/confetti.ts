// Not a component: a plain module so it can be called from any event handler
// without mounting anything. One canvas, one animation loop, reused across
// calls so a second fire while the first is still falling adds particles to
// the same run instead of stacking a second full-viewport canvas.

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
  color: string;
  born: number;
};

const COLORS = ["#3dd6c4", "#ff7a45", "#6d7bd8", "#d9a441"];
const PARTICLE_COUNT = 70;
const DURATION_MS = 1400;
const GRAVITY = 0.28;
const DRAG = 0.985;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let frameHandle: number | null = null;

function teardown() {
  if (frameHandle !== null) {
    cancelAnimationFrame(frameHandle);
    frameHandle = null;
  }
  if (canvas) {
    canvas.remove();
  }
  canvas = null;
  ctx = null;
  particles = [];
}

function ensureCanvas(): boolean {
  if (canvas && ctx) return true;

  const dpr = window.devicePixelRatio || 1;
  const el = document.createElement("canvas");
  el.style.position = "fixed";
  el.style.inset = "0";
  el.style.width = "100vw";
  el.style.height = "100vh";
  el.style.zIndex = "9999";
  el.style.pointerEvents = "none";
  el.width = window.innerWidth * dpr;
  el.height = window.innerHeight * dpr;

  const c = el.getContext("2d");
  if (!c) return false;
  c.scale(dpr, dpr);

  document.body.appendChild(el);
  canvas = el;
  ctx = c;
  return true;
}

function step(now: number) {
  if (!ctx || !canvas) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.clearRect(0, 0, width, height);

  particles = particles.filter((p) => now - p.born < DURATION_MS);

  for (const p of particles) {
    p.vy += GRAVITY;
    p.vx *= DRAG;
    p.vy *= DRAG;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.vr;

    const age = now - p.born;
    const alpha = Math.max(0, 1 - age / DURATION_MS);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  }

  if (particles.length > 0) {
    frameHandle = requestAnimationFrame(step);
  } else {
    teardown();
  }
}

export function fireConfetti(originX: number, originY: number): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  if (!ensureCanvas()) return;

  const now = performance.now();
  const spray: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.7); // upward spray
    const speed = 4 + Math.random() * 6;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      size: 4 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      born: now,
    };
  });
  particles = particles.concat(spray);

  if (frameHandle === null) {
    frameHandle = requestAnimationFrame(step);
  }
}
