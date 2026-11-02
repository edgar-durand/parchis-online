import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { Application, Container, Graphics } from 'pixi.js';

type Props = { size: number; quarter: number; reduceMotion: boolean };
type Pixi = typeof import('pixi.js');

const SKY_TOP = 0x5cb8ec;
const SKY_LOW = 0xdff4fb;
const SEA_TOP = 0x23a0c4;
const SEA_LOW = 0x08466e;

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Updater = (t: number, dt: number) => void;

function buildStage(P: Pixi, app: Application, S: number, quarter: number): Updater[] {
  const u = S / 100;
  const ups: Updater[] = [];
  const stage = app.stage;
  const horizon = 18 * u;
  const rnd = seeded(7 + quarter);

  const layer = (): Container => {
    const c = new P.Container();
    stage.addChild(c);
    return c;
  };

  // Sky and sea bands
  const bg = layer();
  const sky = new P.Graphics();
  const bands = 14;
  for (let i = 0; i < bands; i++) {
    sky.rect(0, (horizon / bands) * i, S, horizon / bands + 1).fill({ color: lerpColor(SKY_TOP, SKY_LOW, i / (bands - 1)) });
  }
  const sea = new P.Graphics();
  const sb = 22;
  for (let i = 0; i < sb; i++) {
    const y = horizon + ((S - horizon) / sb) * i;
    sea.rect(0, y, S, (S - horizon) / sb + 1).fill({ color: lerpColor(SEA_TOP, SEA_LOW, i / (sb - 1)) });
  }
  bg.addChild(sky, sea);

  // Sun with pulsing halo
  const sun = new P.Container();
  sun.position.set(83 * u, 8 * u);
  const halos: Graphics[] = [];
  for (let i = 3; i >= 1; i--) {
    const h = new P.Graphics();
    h.circle(0, 0, 4 * u + i * 2.6 * u).fill({ color: 0xfff1b0, alpha: 0.16 });
    sun.addChild(h);
    halos.push(h);
  }
  const disc = new P.Graphics();
  disc.circle(0, 0, 4 * u).fill({ color: 0xffe28a });
  disc.circle(-1 * u, -1 * u, 2.4 * u).fill({ color: 0xfff7cf, alpha: 0.8 });
  sun.addChild(disc);
  stage.addChild(sun);
  ups.push((t) => {
    halos.forEach((h, i) => {
      h.scale.set(1 + 0.06 * Math.sin(t * 0.8 + i));
    });
  });

  // Far layer: island silhouettes and lighthouse (slowest parallax)
  const far = layer();
  const isl = new P.Graphics();
  isl.moveTo(-2 * u, horizon + 1)
    .quadraticCurveTo(10 * u, horizon - 7 * u, 24 * u, horizon + 1)
    .closePath()
    .fill({ color: 0x5f8fae, alpha: 0.7 });
  isl.moveTo(52 * u, horizon + 1)
    .quadraticCurveTo(62 * u, horizon - 5 * u, 74 * u, horizon + 1)
    .closePath()
    .fill({ color: 0x7aa6c0, alpha: 0.7 });
  far.addChild(isl);
  const lx = quarter % 2 === 0 ? 90 * u : 14 * u;
  const lh = new P.Graphics();
  lh.moveTo(lx - 2.2 * u, horizon + 1)
    .lineTo(lx - 1.3 * u, horizon - 11 * u)
    .lineTo(lx + 1.3 * u, horizon - 11 * u)
    .lineTo(lx + 2.2 * u, horizon + 1)
    .closePath()
    .fill({ color: 0xf6efe0 });
  for (let i = 0; i < 3; i++) {
    lh.rect(lx - 2 * u + i * 0.1 * u, horizon - (3 + i * 3.4) * u, 4 * u - i * 0.2 * u, 1.3 * u).fill({ color: 0xc8483c });
  }
  lh.rect(lx - 1.8 * u, horizon - 13.2 * u, 3.6 * u, 2.2 * u).fill({ color: 0xffd45a });
  lh.moveTo(lx - 2.2 * u, horizon - 13.4 * u).lineTo(lx, horizon - 16 * u).lineTo(lx + 2.2 * u, horizon - 13.4 * u).closePath().fill({ color: 0x3a3f58 });
  const beam = new P.Graphics();
  beam.moveTo(lx, horizon - 12 * u).lineTo(lx + (quarter % 2 === 0 ? -24 : 24) * u, horizon - 16 * u).lineTo(lx + (quarter % 2 === 0 ? -24 : 24) * u, horizon - 7 * u).closePath().fill({ color: 0xfff3b0, alpha: 0.22 });
  far.addChild(lh, beam);
  ups.push((t) => {
    far.x = Math.sin(t * 0.25) * 0.8 * u;
    beam.alpha = 0.5 + 0.5 * Math.sin(t * 1.6);
  });

  // Clouds (drift + parallax)
  const clouds = layer();
  const cloudList: { c: Container; v: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const c = new P.Container();
    const g = new P.Graphics();
    const w = (7 + rnd() * 6) * u;
    g.ellipse(0, 0, w, w * 0.32).fill({ color: 0xffffff, alpha: 0.92 });
    g.circle(-w * 0.35, -w * 0.18, w * 0.34).fill({ color: 0xffffff, alpha: 0.95 });
    g.circle(w * 0.1, -w * 0.3, w * 0.42).fill({ color: 0xffffff, alpha: 0.95 });
    g.ellipse(0, w * 0.12, w * 0.9, w * 0.14).fill({ color: 0xc9dff0, alpha: 0.55 });
    c.addChild(g);
    c.position.set(rnd() * S, (2 + rnd() * 11) * u);
    clouds.addChild(c);
    cloudList.push({ c, v: (0.35 + rnd() * 0.6) * u });
  }
  ups.push((_t, dt) => {
    cloudList.forEach((o) => {
      o.c.x += o.v * dt;
      if (o.c.x > S + 14 * u) o.c.x = -14 * u;
    });
  });

  // Waves: three layers of seamless sine crests
  const waveLayers: { g: Container; period: number; speed: number; amp: number; baseY: number }[] = [];
  const addWave = (y: number, amp: number, period: number, color: number, alpha: number, speed: number) => {
    const cont = new P.Container();
    const fill = new P.Graphics();
    const foam = new P.Graphics();
    const h = period / 2;
    const m = Math.ceil((S + 2 * period) / h) + 2;
    const path = (g: Graphics) => {
      g.moveTo(-period, y);
      for (let i = 0; i < m; i++) {
        const x1 = -period + (i + 1) * h;
        g.quadraticCurveTo(x1 - h / 2, y + (i % 2 ? 2 * amp : -2 * amp), x1, y);
      }
    };
    path(fill);
    fill.lineTo(-period + m * h, S + 4 * u).lineTo(-period, S + 4 * u).closePath().fill({ color, alpha });
    path(foam);
    foam.stroke({ width: 0.5 * u, color: 0xffffff, alpha: 0.45 });
    cont.addChild(fill, foam);
    stage.addChild(cont);
    waveLayers.push({ g: cont, period, speed, amp, baseY: 0 });
  };
  addWave(horizon + 6 * u, 0.5 * u, 9 * u, 0x2ab0cf, 0.35, 0.8 * u);
  addWave(horizon + 20 * u, 0.9 * u, 13 * u, 0x1b88b3, 0.4, -1.2 * u);
  addWave(horizon + 44 * u, 1.3 * u, 18 * u, 0x0f6a98, 0.45, 1.6 * u);
  addWave(horizon + 70 * u, 1.6 * u, 22 * u, 0x0a5380, 0.5, -2 * u);
  ups.push((t) => {
    waveLayers.forEach((w, i) => {
      w.g.x = (((t * w.speed) % w.period) + w.period) % w.period;
      w.g.y = Math.sin(t * 0.9 + i * 1.3) * 0.6 * u;
    });
  });

  // Sparkles on the water
  const spark = new P.Graphics();
  const sp: { x: number; y: number; ph: number }[] = [];
  for (let i = 0; i < 18; i++) sp.push({ x: rnd() * S, y: horizon + 3 * u + rnd() * (S - horizon - 3 * u), ph: rnd() * 6 });
  stage.addChild(spark);
  const drawSpark = (t: number) => {
    spark.clear();
    sp.forEach((s) => {
      const a = 0.15 + 0.5 * Math.max(0, Math.sin(t * 2 + s.ph));
      spark.ellipse(s.x, s.y, 1.2 * u, 0.3 * u).fill({ color: 0xffffff, alpha: a });
    });
  };
  drawSpark(0);
  ups.push((t) => drawSpark(t));

  // Corner ships (behind the dock)
  const ships = layer();
  const corners: [number, number, number][] = [
    [7 * u, 7 * u, 1],
    [93 * u, 7 * u, -1],
    [7 * u, 93 * u, 1],
    [93 * u, 93 * u, -1],
  ];
  const shipObjs: Container[] = [];
  corners.forEach(([cx, cy, dir], i) => {
    const s = new P.Container();
    s.position.set(cx, cy);
    const g = new P.Graphics();
    g.ellipse(0, 6 * u, 9 * u, 1.8 * u).fill({ color: 0x03253f, alpha: 0.35 });
    g.moveTo(-8 * u * dir, 0).quadraticCurveTo(-6 * u * dir, 6 * u, 0, 6 * u).quadraticCurveTo(7 * u * dir, 6 * u, 9 * u * dir, -1 * u).lineTo(-8 * u * dir, 0).closePath().fill({ color: 0x6b3f1d });
    g.moveTo(-8 * u * dir, 0).lineTo(9 * u * dir, -1 * u).stroke({ width: 0.7 * u, color: 0xd6a85c });
    g.rect(-0.5 * u, -12 * u, 1 * u, 12 * u).fill({ color: 0x4a2a12 });
    g.moveTo(0, -11 * u).quadraticCurveTo(5 * u * dir, -7 * u, 0, -2 * u).closePath().fill({ color: 0xf4ead2 });
    g.circle(1.6 * u * dir, -6.6 * u, 0.9 * u).fill({ color: 0x2a2230 });
    g.rect(0, -13.5 * u, 3 * u * dir, 1.6 * u).fill({ color: 0x1d1a26 });
    s.addChild(g);
    ships.addChild(s);
    shipObjs.push(s);
    s.rotation = 0;
    void i;
  });
  ups.push((t) => {
    shipObjs.forEach((s, i) => {
      s.y = corners[i][1] + Math.sin(t * 1.1 + i * 1.7) * 0.7 * u;
      s.rotation = Math.sin(t * 0.9 + i) * 0.04;
    });
  });

  // Wooden dock
  const inset = 6 * u;
  const dock = layer();
  const dg = new P.Graphics();
  dg.roundRect(inset + 0.8 * u, inset + 1.6 * u, S - 2 * inset, S - 2 * inset, 2 * u).fill({ color: 0x021c30, alpha: 0.35 });
  dg.roundRect(inset, inset, S - 2 * inset, S - 2 * inset, 2 * u).fill({ color: 0x7a4a22 });
  let row = 0;
  for (let y = inset + 0.6 * u; y < S - inset - 1 * u; y += 3.2 * u) {
    dg.rect(inset + 0.6 * u, y, S - 2 * inset - 1.2 * u, 2.9 * u).fill({ color: row % 2 ? 0x9a6430 : 0x8b5828 });
    dg.rect(inset + 0.6 * u, y + 2.9 * u, S - 2 * inset - 1.2 * u, 0.3 * u).fill({ color: 0x4a2a12, alpha: 0.7 });
    for (let k = 0; k < 3; k++) {
      const sx = inset + (4 + rnd() * (S / u - 20)) * u;
      dg.rect(sx, y, 0.25 * u, 2.9 * u).fill({ color: 0x4a2a12, alpha: 0.5 });
    }
    row++;
  }
  dg.roundRect(inset, inset, S - 2 * inset, S - 2 * inset, 2 * u).stroke({ width: 0.9 * u, color: 0x3d230e });
  dock.addChild(dg);

  // Rails: posts + sagging ropes
  const rail = new P.Graphics();
  const n = 8;
  const span = (S - 2 * inset) / n;
  const post = (x: number, y: number) => {
    rail.rect(x - 0.7 * u, y - 2.4 * u, 1.4 * u, 2.8 * u).fill({ color: 0x4a2a12 });
    rail.circle(x, y - 2.5 * u, 0.9 * u).fill({ color: 0xc89a4c });
  };
  for (let e = 0; e < 4; e++) {
    for (let i = 0; i <= n; i++) {
      const p = inset + i * span;
      const pt: [number, number] = e === 0 ? [p, inset] : e === 1 ? [S - inset, p] : e === 2 ? [p, S - inset] : [inset, p];
      post(pt[0], pt[1]);
      if (i < n) {
        const q = p + span;
        const a: [number, number] = e === 0 ? [p, inset - 2 * u] : e === 1 ? [S - inset, p - 2 * u] : e === 2 ? [p, S - inset - 2 * u] : [inset, p - 2 * u];
        const b: [number, number] = e === 0 ? [q, inset - 2 * u] : e === 1 ? [S - inset, q - 2 * u] : e === 2 ? [q, S - inset - 2 * u] : [inset, q - 2 * u];
        rail.moveTo(a[0], a[1]).quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1.4 * u, b[0], b[1]).stroke({ width: 0.55 * u, color: 0xe3c88a });
      }
    }
  }
  dock.addChild(rail);

  // Barrels and lanterns on the lip
  const props = new P.Graphics();
  const barrel = (x: number, y: number) => {
    props.ellipse(x, y + 2.4 * u, 2.2 * u, 0.7 * u).fill({ color: 0x000000, alpha: 0.3 });
    props.roundRect(x - 1.8 * u, y - 2 * u, 3.6 * u, 4.4 * u, 1 * u).fill({ color: 0x8a5524 });
    props.rect(x - 1.8 * u, y - 1 * u, 3.6 * u, 0.5 * u).fill({ color: 0x3a3a46 });
    props.rect(x - 1.8 * u, y + 0.9 * u, 3.6 * u, 0.5 * u).fill({ color: 0x3a3a46 });
    props.ellipse(x, y - 2 * u, 1.8 * u, 0.6 * u).fill({ color: 0xb98348 });
  };
  barrel(S * 0.3, inset - 1.4 * u);
  barrel(S - inset + 1.4 * u, S * 0.7);
  barrel(S * 0.66, S - inset + 1.4 * u);
  barrel(inset - 1.4 * u, S * 0.36);
  dock.addChild(props);

  const lamps: Graphics[] = [];
  [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]].forEach(([fx, fy]) => {
    const l = new P.Graphics();
    const lx2 = inset + fx * (S - 2 * inset);
    const ly = inset + fy * (S - 2 * inset);
    l.circle(lx2, ly - 4 * u, 2.6 * u).fill({ color: 0xffd45a, alpha: 0.2 });
    l.roundRect(lx2 - 0.8 * u, ly - 5.2 * u, 1.6 * u, 2.2 * u, 0.5 * u).fill({ color: 0xffc94a });
    l.rect(lx2 - 1 * u, ly - 5.6 * u, 2 * u, 0.5 * u).fill({ color: 0x2a2230 });
    dock.addChild(l);
    lamps.push(l);
  });
  ups.push((t) => {
    lamps.forEach((l, i) => {
      l.alpha = 0.8 + 0.2 * Math.sin(t * 3 + i * 2);
    });
  });

  // Pirate flags on corner poles
  const flags: Container[] = [];
  corners.forEach(([cx, cy, dir], i) => {
    const px = cx + (dir > 0 ? 3 : -3) * u * 0;
    const fx = i < 2 ? (dir > 0 ? inset + 2 * u : S - inset - 2 * u) : dir > 0 ? inset + 2 * u : S - inset - 2 * u;
    const fy = i < 2 ? inset + 1 * u : S - inset + 1 * u;
    void px;
    const pole = new P.Graphics();
    pole.rect(fx - 0.4 * u, fy - 11 * u, 0.8 * u, 11 * u).fill({ color: 0x3d230e });
    pole.circle(fx, fy - 11.2 * u, 0.9 * u).fill({ color: 0xd6a85c });
    dock.addChild(pole);
    const f = new P.Container();
    f.position.set(fx + 0.4 * u, fy - 10.4 * u);
    const fg = new P.Graphics();
    fg.moveTo(0, 0).lineTo(5.6 * u * dir, 0.5 * u).lineTo(5 * u * dir, 3.4 * u).lineTo(0, 3.6 * u).closePath().fill({ color: 0x1d1a26 });
    fg.circle(2.5 * u * dir, 1.5 * u, 0.8 * u).fill({ color: 0xf4ead2 });
    fg.rect(1.3 * u * dir - (dir < 0 ? 2.4 * u : 0), 2.5 * u, 2.4 * u, 0.3 * u).fill({ color: 0xf4ead2 });
    f.addChild(fg);
    dock.addChild(f);
    flags.push(f);
  });
  ups.push((t) => {
    flags.forEach((f, i) => {
      f.skew.y = Math.sin(t * 4 + i) * 0.1;
      f.scale.x = 1 + Math.sin(t * 5 + i) * 0.04;
    });
  });

  // Soft vignette on the water outside the dock (depth)
  const vig = new P.Graphics();
  vig.rect(0, S - 3 * u, S, 3 * u).fill({ color: 0x021c30, alpha: 0.25 });
  stage.addChild(vig);

  return ups;
}

function SvgFallback({ size }: { size: number }) {
  const u = size / 100;
  const inset = 6 * u;
  const planks: number[] = [];
  for (let y = inset + 0.6 * u, i = 0; y < size - inset - u; y += 3.2 * u, i++) planks.push(y);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="stSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5cb8ec" />
          <Stop offset="1" stopColor="#dff4fb" />
        </LinearGradient>
        <LinearGradient id="stSea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#23a0c4" />
          <Stop offset="1" stopColor="#08466e" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={size} height={18 * u} fill="url(#stSky)" />
      <Rect x={0} y={18 * u} width={size} height={size - 18 * u} fill="url(#stSea)" />
      <Circle cx={83 * u} cy={8 * u} r={4 * u} fill="#ffe28a" />
      <Ellipse cx={22 * u} cy={7 * u} rx={8 * u} ry={2.4 * u} fill="#ffffff" opacity={0.9} />
      <Path d={`M ${-2 * u} ${18 * u} Q ${10 * u} ${11 * u} ${24 * u} ${18 * u} Z`} fill="#5f8fae" opacity={0.7} />
      <Rect x={inset + 0.8 * u} y={inset + 1.6 * u} width={size - 2 * inset} height={size - 2 * inset} rx={2 * u} fill="#021c30" opacity={0.35} />
      <Rect x={inset} y={inset} width={size - 2 * inset} height={size - 2 * inset} rx={2 * u} fill="#7a4a22" />
      {planks.map((y, i) => (
        <Rect key={y} x={inset + 0.6 * u} y={y} width={size - 2 * inset - 1.2 * u} height={2.9 * u} fill={i % 2 ? '#9a6430' : '#8b5828'} />
      ))}
      <Rect x={inset} y={inset} width={size - 2 * inset} height={size - 2 * inset} rx={2 * u} fill="none" stroke="#3d230e" strokeWidth={0.9 * u} />
    </Svg>
  );
}

export default function StageScene({ size, quarter, reduceMotion }: Props): JSX.Element {
  const hostRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || size <= 0) return;
    let disposed = false;
    let app: Application | null = null;
    let ready = false;
    const onVis = () => {
      if (!app || !ready) return;
      if (document.hidden) app.ticker.stop();
      else if (!reduceMotion) app.ticker.start();
    };
    (async () => {
      try {
        const P = await import('pixi.js');
        const host = hostRef.current as unknown as HTMLElement | null;
        if (disposed || !host || typeof host.appendChild !== 'function') return;
        const a = new P.Application();
        await a.init({
          width: size,
          height: size,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2),
        });
        if (disposed) {
          a.destroy(true, { children: true });
          return;
        }
        app = a;
        const canvas = a.canvas as HTMLCanvasElement;
        canvas.style.display = 'block';
        canvas.style.pointerEvents = 'none';
        host.appendChild(canvas);
        const ups = buildStage(P, a, size, quarter);
        let t = 0;
        const run = (dt: number) => ups.forEach((f) => f(t, dt));
        run(0);
        ready = true;
        if (reduceMotion) {
          a.render();
          a.ticker.stop();
        } else {
          a.ticker.add((tk) => {
            const dt = Math.min(tk.deltaMS / 1000, 0.1);
            t += dt;
            run(dt);
          });
          document.addEventListener('visibilitychange', onVis);
        }
      } catch {
        // pixi unavailable: the SVG scene underneath stays visible
      }
    })();
    return () => {
      disposed = true;
      try {
        document.removeEventListener('visibilitychange', onVis);
      } catch {
        // ignore
      }
      try {
        app?.destroy(true, { children: true });
      } catch {
        // ignore
      }
      app = null;
    };
  }, [size, quarter, reduceMotion]);

  return (
    <View pointerEvents="none" style={[styles.fill, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgFallback size={size} />
      <View ref={hostRef} pointerEvents="none" style={[styles.fill, { width: size, height: size }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, overflow: 'hidden' },
});
