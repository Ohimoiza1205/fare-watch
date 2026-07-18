"use client";

import { useEffect, useRef } from "react";

// Ambient backdrop for the dark tracker canvas: three slow aurora blobs plus a
// light particle field with cursor repulsion. Purely decorative, so it never
// starts under reduced motion and pauses whenever the tab is hidden.
type Particle = { x: number; y: number; vx: number; vy: number; r: number };

const PARTICLE_COUNT = 36;
const REPEL_RADIUS = 120;

const COOL_BLOBS = [
  { top: "-10%", left: "-8%", size: "52vw", colour: "rgba(61, 214, 196, 0.5)", anim: "aurora-a 26s var(--ease-inout) infinite" },
  { top: "20%", left: "55%", size: "58vw", colour: "rgba(109, 123, 216, 0.45)", anim: "aurora-b 32s var(--ease-inout) infinite" },
  { top: "60%", left: "5%", size: "44vw", colour: "rgba(255, 122, 69, 0.3)", anim: "aurora-c 38s var(--ease-inout) infinite" },
];

const WARM_BLOBS = [
  { top: "-10%", left: "-8%", size: "52vw", colour: "rgba(255, 122, 69, 0.5)", anim: "aurora-a 26s var(--ease-inout) infinite" },
  { top: "20%", left: "55%", size: "58vw", colour: "rgba(217, 164, 65, 0.45)", anim: "aurora-b 32s var(--ease-inout) infinite" },
  { top: "60%", left: "5%", size: "44vw", colour: "rgba(61, 214, 196, 0.22)", anim: "aurora-c 38s var(--ease-inout) infinite" },
];

export function Atmosphere({ warm = false }: { warm?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    // Rebind to a definitely-non-null const: TS control-flow narrowing does
    // not carry the null check into the nested closures defined below.
    const ctx: CanvasRenderingContext2D = ctx2d;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    const pointer = { x: -9999, y: -9999 };

    function seed() {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: 0.6 + Math.random() * 1.4,
      }));
    }

    function resize() {
      const c = canvasRef.current;
      if (!c) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      c.width = width * dpr;
      c.height = height * dpr;
      c.style.width = `${width}px`;
      c.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function onMove(e: MouseEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }

    let raf = 0;
    function step() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(61, 214, 196, 0.35)";
      for (const p of particles) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL_RADIUS && dist > 0.001) {
          const force = (1 - dist / REPEL_RADIUS) * 0.6;
          p.vx += (dx / dist) * force * 0.06;
          p.vy += (dy / dist) * force * 0.06;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;

        if (p.x < -5) p.x = width + 5;
        if (p.x > width + 5) p.x = -5;
        if (p.y < -5) p.y = height + 5;
        if (p.y > height + 5) p.y = -5;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(step);
    }

    function start() {
      if (!raf) raf = requestAnimationFrame(step);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    resize();
    start();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const blobs = warm ? WARM_BLOBS : COOL_BLOBS;

  return (
    <div className="atmosphere fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            background: `radial-gradient(circle, ${b.colour} 0%, transparent 70%)`,
            filter: "blur(90px)",
            opacity: 0.16,
            animation: b.anim,
          }}
        />
      ))}
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="grain absolute inset-0" />
    </div>
  );
}
