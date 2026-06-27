"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════
   ORBITAL ROXA — Intro Loader (HUD Tático CS2)
   Crosshair que "assenta", radar com sweep, tracers de bala (Three.js),
   scanlines, log tático e recuo + clarão de disparo no fim.
   Mostra 1x por sessão · trava o scroll · respeita prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════════ */

const SESSION_KEY = "orbital_intro_seen";

const CSS = `
.il-root{position:fixed;inset:0;z-index:9999;background:#040305;font-family:var(--font-jetbrains),monospace;
  transition:opacity .8s ease, filter .8s ease}
.il-root.gone{opacity:0;filter:blur(6px);pointer-events:none}
.il-cv{position:absolute;inset:0;width:100%;height:100%}
.il-hud{position:absolute;inset:0;pointer-events:none;text-transform:uppercase}
.il-vig{position:absolute;inset:0;background:radial-gradient(120% 120% at 50% 50%,transparent 55%,rgba(0,0,0,.7) 100%)}
.il-scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}
.il-flash{position:absolute;inset:0;background:#fff;opacity:0}
.il-radar{position:absolute;left:50%;top:50%;width:260px;height:260px;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(124,92,255,.22)}
.il-radar::after{content:'';position:absolute;inset:18%;border-radius:50%;border:1px solid rgba(124,92,255,.14)}
.il-sweep{position:absolute;inset:0;border-radius:50%;background:conic-gradient(rgba(124,92,255,.4),transparent 28%);animation:il-spin 2.2s linear infinite}
@keyframes il-spin{to{transform:rotate(360deg)}}
.il-cross{position:absolute;left:50%;top:50%}
.il-cross i{position:absolute;background:#A892FF;box-shadow:0 0 8px rgba(124,92,255,.9)}
.il-cross .t,.il-cross .b{width:3px;height:22px;left:-1.5px}
.il-cross .le,.il-cross .r{height:3px;width:22px;top:-1.5px}
.il-cross .t{transform:translateY(calc(-100% - var(--g,40px)))}
.il-cross .b{transform:translateY(var(--g,40px))}
.il-cross .le{transform:translateX(calc(-100% - var(--g,40px)))}
.il-cross .r{transform:translateX(var(--g,40px))}
.il-cross .dot{width:3px;height:3px;left:-1.5px;top:-1.5px;border-radius:50%}
.il-corner{position:absolute;color:#A892FF;font-size:12px;letter-spacing:.18em;opacity:.85}
.il-tl{top:22px;left:24px}
.il-tr{top:22px;right:24px;color:#86838F}
.il-bl{bottom:30px;left:24px;max-width:60vw}
.il-br{bottom:26px;right:24px;text-align:right}
.il-log div{opacity:.25;transition:opacity .3s;color:#86838F;line-height:1.7}
.il-log div.on{opacity:1;color:#A892FF}
.il-log div.on::before{content:'▸ '}
.il-bigpct{font-family:var(--font-russo),sans-serif;font-size:clamp(2.4rem,6vw,4rem);line-height:1;color:#fff}
.il-bigpct b{color:#A892FF;font-size:.5em;vertical-align:super}
.il-barwrap{position:absolute;left:24px;right:24px;bottom:0;height:4px;background:rgba(255,255,255,.08)}
.il-barwrap i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7C5CFF,#A892FF,#F5C542);box-shadow:0 0 12px rgba(124,92,255,.7)}
@media (max-width:640px){.il-radar{width:200px;height:200px}.il-bl{font-size:11px}}
`;

export function IntroLoader() {
  const [mounted, setMounted] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // pula em navegações dentro da mesma sessão ou com movimento reduzido
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (sessionStorage.getItem(SESSION_KEY) || reduce) {
      setMounted(false);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "1");

    const root = rootRef.current;
    const cv = canvasRef.current;
    if (!root || !cv) return;

    // trava o scroll durante a intro
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const q = <T extends Element>(s: string) => root.querySelector(s) as T | null;
    const cross = q<HTMLElement>(".il-cross")!;
    const pEl = q<HTMLElement>(".il-p")!;
    const bar = q<HTMLElement>(".il-bar")!;
    const flash = q<HTMLElement>(".il-flash")!;
    const logs = Array.from(root.querySelectorAll<HTMLElement>(".il-log div"));

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    cam.position.z = 5;
    const rd = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
    rd.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rd.setSize(window.innerWidth, window.innerHeight);

    function streakTex(rgb: string) {
      const c = document.createElement("canvas");
      c.width = 128; c.height = 24;
      const g = c.getContext("2d")!;
      const gr = g.createLinearGradient(0, 0, 128, 0);
      gr.addColorStop(0, `rgba(${rgb},0)`);
      gr.addColorStop(0.5, `rgba(${rgb},1)`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(0, 9, 128, 6);
      const t = new THREE.Texture(c); t.needsUpdate = true; return t;
    }

    type Sys = { g: THREE.BufferGeometry; m: THREE.PointsMaterial; sp: Float32Array; N: number };
    function tracerSys(count: number, rgb: string, speed: number, sz: number): Sys {
      const tex = streakTex(rgb), N = count, p = new Float32Array(N * 3), sp = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        p[i * 3] = Math.random() * 20 - 4;
        p[i * 3 + 1] = (Math.random() - 0.5) * 7;
        p[i * 3 + 2] = (Math.random() - 0.5) * 5;
        sp[i] = speed * (0.6 + Math.random() * 0.9);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(p, 3));
      const m = new THREE.PointsMaterial({ size: sz, map: tex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      scene.add(new THREE.Points(g, m));
      return { g, m, sp, N };
    }
    const tv = tracerSys(180, "168,146,255", 0.16, 1.5);
    const tg = tracerSys(40, "245,197,66", 0.2, 1.4);

    const dustN = 600, dp = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN * 3; i++) dp[i] = (Math.random() - 0.5) * 16;
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.04, color: 0x6a5a9a, transparent: true, opacity: 0.5, depthWrite: false }));
    scene.add(dust);

    // loader simulado 0 -> 1 + burst
    const t0 = performance.now();
    let progress = 0, done = false, finishedAt = 0, burst = 0, shake = 0;
    function tick(now: number) {
      if (progress < 1) {
        const el = (now - t0) / 1000;
        const want = Math.min(1, el / 2.9);
        progress += (want - progress) * 0.08 + 0.0016;
        if (el > 3.05) progress = 1;
        progress = Math.min(progress, 1);
      }
      if (progress >= 1 && !done) { done = true; finishedAt = now; }
      if (done) { const s = (now - finishedAt) / 1000; if (s > 0.35) burst = Math.min(1, (s - 0.35) / 0.5); }
    }
    function updTracers(sys: Sys, mult: number) {
      const a = sys.g.attributes.position.array as Float32Array;
      for (let i = 0; i < sys.N; i++) {
        a[i * 3] -= sys.sp[i] * mult;
        if (a[i * 3] < -10) {
          a[i * 3] = 16 + Math.random() * 4;
          a[i * 3 + 1] = (Math.random() - 0.5) * 7;
          a[i * 3 + 2] = (Math.random() - 0.5) * 5;
        }
      }
      sys.g.attributes.position.needsUpdate = true;
    }

    let raf = 0;
    let revealed = false;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    function loop(now: number) {
      tick(now);
      const e = progress, p = Math.round(e * 100);
      pEl.textContent = String(p);
      bar.style.width = e * 100 + "%";
      cross.style.setProperty("--g", 60 - 53 * e + "px");
      logs.forEach((d) => d.classList.toggle("on", p >= +(d.dataset.at || 0)));
      const mult = 1 + e * 3 + burst * 30;
      updTracers(tv, mult); updTracers(tg, mult);
      tv.m.opacity = (0.3 + 0.6 * e) * (1 - burst);
      tg.m.opacity = (0.4 + 0.5 * e) * (1 - burst);
      dust.rotation.y += 0.0006;
      (dust.material as THREE.PointsMaterial).opacity = 0.5 * (1 - burst);
      if (burst > 0) {
        flash.style.opacity = String(burst < 0.5 ? burst * 2 : (1 - burst) * 2);
        cross.style.setProperty("--g", 7 + burst * 80 + "px");
        shake = (1 - burst) * 10;
      }
      cam.position.x = (Math.random() - 0.5) * shake * 0.01;
      cam.position.y = (Math.random() - 0.5) * shake * 0.01;
      rd.render(scene, cam);

      if (burst >= 0.5 && !revealed) {
        revealed = true;
        root!.classList.add("gone");
        document.body.style.overflow = prevOverflow;
        finishTimer = setTimeout(() => setMounted(false), 850);
      }
      if (burst >= 1) { cancelAnimationFrame(raf); return; }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    function onResize() {
      cam.aspect = window.innerWidth / window.innerHeight;
      cam.updateProjectionMatrix();
      rd.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      if (finishTimer) clearTimeout(finishTimer);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = prevOverflow;
      rd.dispose();
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="il-root" ref={rootRef} aria-hidden>
      <style>{CSS}</style>
      <canvas className="il-cv" ref={canvasRef} />
      <div className="il-hud">
        <div className="il-radar"><div className="il-sweep" /></div>
        <div className="il-cross">
          <i className="t" /><i className="b" /><i className="le" /><i className="r" /><i className="dot" />
        </div>
        <div className="il-corner il-tl">de_orbital · competitivo</div>
        <div className="il-corner il-tr">tickrate 64 · vac</div>
        <div className="il-corner il-bl il-log">
          <div data-at="5">conectando ao servidor</div>
          <div data-at="22">sincronizando netcode</div>
          <div data-at="44">compilando shaders</div>
          <div data-at="66">carregando de_orbital</div>
          <div data-at="85">verificando vac</div>
          <div data-at="99">pronto pra entrar</div>
        </div>
        <div className="il-corner il-br">
          <div className="il-bigpct"><span className="il-p">0</span><b>%</b></div>
        </div>
        <div className="il-scan" />
        <div className="il-vig" />
        <div className="il-barwrap"><i className="il-bar" /></div>
        <div className="il-flash" />
      </div>
    </div>
  );
}
