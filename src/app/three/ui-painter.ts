/**
 * Paints Salut app screens onto an offscreen canvas — used as the texture on
 * the 3D phone's display. Pure 2D canvas, no DOM. Each mode is a small
 * scripted scene driven by a 0..1 progress value:
 *
 * - 'track':   the live BAC dial — gauge sweeps, promille counts up, drinks
 *              pop into the log, the status line escalates.
 * - 'install': a home screen — the Salut icon flies into its slot and a
 *              confirmation toast slides up.
 * - 'bac':     the BAC story as a horizontal progress bar that fills, with the
 *              promille readout and a 0.5 limit marker (hero auto-sequence).
 * - 'drinks':  a cocktail showcase — a featured drink with its glass, then
 *              recipe rows slide in (hero auto-sequence).
 *
 * `open` (0..1) crossfades the boot splash away (the hero's "app opens" beat;
 * scrub stages pass 1). `dim` (0..1) darkens the whole screen — the hero uses
 * it to mask the cut between auto-cycled scenes.
 */
export type UiMode = 'track' | 'install' | 'bac' | 'drinks';

const W = 512;
const H = 1144;

/** One push notification (textured onto a plane that overflows the phone). */
export interface HeroNote {
  title: string;
  body: string;
  time: string;
}

/**
 * Paints an iOS-style glass push notification ("Mara tracked a drink…").
 * Returned canvas is 768×168 — map it onto a plane wider than the phone so
 * the card visibly spills over the device edge.
 */
export function paintNotification(note: HeroNote): HTMLCanvasElement {
  const w = 768;
  const h = 168;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const inset = 14;

  const card = (r: number) => {
    ctx.beginPath();
    ctx.moveTo(inset + r, inset);
    ctx.arcTo(w - inset, inset, w - inset, h - inset, r);
    ctx.arcTo(w - inset, h - inset, inset, h - inset, r);
    ctx.arcTo(inset, h - inset, inset, inset, r);
    ctx.arcTo(inset, inset, w - inset, inset, r);
    ctx.closePath();
  };

  // glass card with a soft drop shadow baked in
  ctx.save();
  ctx.shadowColor = 'rgba(4,2,10,.6)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  card(34);
  ctx.fillStyle = 'rgba(24,16,42,.94)';
  ctx.fill();
  ctx.restore();
  card(34);
  ctx.strokeStyle = 'rgba(255,255,255,.17)';
  ctx.lineWidth = 2;
  ctx.stroke();
  const sheen = ctx.createLinearGradient(0, inset, 0, h * 0.5);
  sheen.addColorStop(0, 'rgba(255,255,255,.10)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  card(34);
  ctx.fillStyle = sheen;
  ctx.fill();

  // app icon
  const is = 92;
  const ix = 38;
  const iy = (h - is) / 2;
  const g = ctx.createLinearGradient(ix, iy, ix + is, iy + is);
  g.addColorStop(0, '#ff2e63');
  g.addColorStop(1, '#6c2bd9');
  ctx.beginPath();
  ctx.roundRect(ix, iy, is, is, 24);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = `700 46px 'Space Grotesk', system-ui, sans-serif`;
  ctx.fillText('S', ix + is / 2, iy + is / 2 + 17);

  // texts
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f4f1fb';
  ctx.font = `700 33px 'Space Grotesk', system-ui, sans-serif`;
  ctx.fillText(note.title, 158, 74, w - 270);
  ctx.fillStyle = 'rgba(245,242,251,.62)';
  ctx.font = `27px system-ui, sans-serif`;
  ctx.fillText(note.body, 158, 118, w - 230);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(245,242,251,.45)';
  ctx.font = `25px system-ui, sans-serif`;
  ctx.fillText(note.time, w - 40, 74);

  return c;
}

export class UiPainter {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private last = { mode: '' as string, p: -1, open: -1, dim: -1 };

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d')!;
  }

  /** Force the next draw() to repaint (e.g. after webfonts finish loading). */
  invalidate(): void {
    this.last.p = -1;
  }

  /** Returns true if the canvas changed (caller flips `texture.needsUpdate`). */
  draw(mode: UiMode, p: number, open = 1, accent = '#ff2e63', dim = 0): boolean {
    const l = this.last;
    if (
      l.mode === mode &&
      Math.abs(l.p - p) < 0.0025 &&
      Math.abs(l.open - open) < 0.0025 &&
      Math.abs(l.dim - dim) < 0.0025
    ) {
      return false;
    }
    this.last = { mode, p, open, dim };

    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    if (mode === 'track') this.drawTrack(ctx, p, accent);
    else if (mode === 'bac') this.drawBac(ctx, p, accent);
    else if (mode === 'drinks') this.drawDrinks(ctx, p, accent);
    else this.drawInstall(ctx, p, accent);
    if (open < 1) this.drawSplash(ctx, 1 - open);
    if (dim > 0) {
      ctx.fillStyle = `rgba(8,4,18,${Math.min(1, dim).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
    return true;
  }

  // ── shared chrome ────────────────────────────────────────────────────────

  private u(n: number): number {
    return (H / 100) * n;
  }

  private chrome(ctx: CanvasRenderingContext2D): void {
    const u = this.u.bind(this);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(245,242,251,.85)';
    ctx.font = `600 ${u(1.7)}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText('23:47', u(3.4), u(3.6));
    // status cluster (signal / battery as minimal shapes)
    ctx.fillStyle = 'rgba(245,242,251,.6)';
    for (let i = 0; i < 4; i++) {
      const bh = u(0.5) + i * u(0.32);
      this.rrect(ctx, W - u(11) + i * u(1), u(3.7) - bh, u(0.6), bh, u(0.2));
      ctx.fill();
    }
    this.rrect(ctx, W - u(5.6), u(2.3), u(3.6), u(1.6), u(0.5));
    ctx.strokeStyle = 'rgba(245,242,251,.6)';
    ctx.lineWidth = u(0.16);
    ctx.stroke();
    ctx.fillStyle = 'rgba(245,242,251,.6)';
    this.rrect(ctx, W - u(5.3), u(2.6), u(2.2), u(1), u(0.3));
    ctx.fill();
  }

  private tabbar(ctx: CanvasRenderingContext2D, accent: string): void {
    const u = this.u.bind(this);
    const bw = W * 0.74;
    const bh = u(5.4);
    const bx = (W - bw) / 2;
    const by = H - u(8.2);
    ctx.fillStyle = 'rgba(26,17,48,.85)';
    this.rrect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(245,242,251,.45)';
    ctx.font = `${u(2.2)}px system-ui, sans-serif`;
    const slots = [0.14, 0.32, 0.68, 0.86];
    const icons = ['⌂', '☰', '▦', '◍'];
    for (let i = 0; i < 4; i++) ctx.fillText(icons[i], bx + bw * slots[i], by + bh * 0.66);

    // centre FAB
    const fr = bh * 0.62;
    const g = ctx.createLinearGradient(W / 2 - fr, by, W / 2 + fr, by + bh);
    g.addColorStop(0, accent);
    g.addColorStop(1, '#6c2bd9');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(W / 2, by + bh / 2, fr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `600 ${u(3)}px system-ui, sans-serif`;
    ctx.fillText('＋', W / 2, by + bh / 2 + u(1));
  }

  /** Frosted "liquid glass" panel. */
  private glass(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    this.rrect(ctx, x, y, w, h, r);
    ctx.fillStyle = 'rgba(255,255,255,.055)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.10)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // top sheen
    const g = ctx.createLinearGradient(0, y, 0, y + h * 0.3);
    g.addColorStop(0, 'rgba(255,255,255,.10)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    this.rrect(ctx, x, y, w, h * 0.3, r);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // ── 'track' — live BAC dial ─────────────────────────────────────────────

  private drawTrack(ctx: CanvasRenderingContext2D, p: number, accent: string): void {
    const u = this.u.bind(this);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1c1235');
    bg.addColorStop(0.5, '#140d22');
    bg.addColorStop(1, '#0d0817');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    this.chrome(ctx);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4f1fb';
    ctx.font = `700 ${u(2.6)}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText('Salut', W / 2, u(8.2));

    // gauge card
    this.glass(ctx, u(3.4), u(11), W - u(6.8), u(44), u(3));

    const level = Math.min(1, Math.pow(Math.max(0, p), 0.82));
    const promille = level * 1.4;
    const cx = W / 2;
    const cy = u(29);
    const R = W * 0.27;
    const lw = R * 0.18;
    const a0 = Math.PI * 0.75;
    const sweep = Math.PI * 1.5;
    const col = this.ramp(level);

    // glow
    ctx.save();
    ctx.globalAlpha = 0.10 + 0.16 * level;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // segmented arc
    ctx.lineWidth = lw;
    ctx.lineCap = 'butt';
    const segs = 56;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs;
      const t1 = (s + 1) / segs;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0 + sweep * t0, a0 + sweep * t1 + 0.008);
      ctx.strokeStyle = t1 <= level ? this.ramp(t1) : 'rgba(255,255,255,0.08)';
      ctx.stroke();
    }

    // needle + hub
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a0 + sweep * level);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -lw * 0.22);
    ctx.lineTo(R * 0.92, 0);
    ctx.lineTo(0, lw * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, lw * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, lw * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // readout
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 8 + 22 * level;
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${u(8.6)}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText(promille.toFixed(2), cx, cy + R * 0.62);
    ctx.restore();
    ctx.fillStyle = 'rgba(245,242,251,.55)';
    ctx.font = `700 ${u(1.8)}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText('‰  P R O M I L L E', cx, cy + R * 0.62 + u(3.2));

    // status line inside the card
    let status = 'Tracking your night…';
    let warn = false;
    if (level > 0.82) { status = '⚠  Over the limit · sober ~02:40'; warn = true; }
    else if (level > 0.55) status = 'Pace yourself';
    else if (level > 0.22) status = 'Feeling it';
    ctx.fillStyle = warn ? '#ff8a7a' : 'rgba(245,242,251,.6)';
    ctx.font = `600 ${u(1.9)}px system-ui, sans-serif`;
    ctx.fillText(status, cx, u(52.4));

    // drink log — rows pop in as the night goes on
    const drinks = [
      ['🍺', 'Lager · 0.5 L', '23:14'],
      ['🍸', 'Negroni', '23:46'],
      ['🥃', 'Tequila · Shot', '00:12'],
    ];
    const thr = [0.18, 0.45, 0.72];
    for (let i = 0; i < drinks.length; i++) {
      const raw = (p - thr[i]) / 0.1;
      if (raw <= 0) continue;
      const pop = this.easeOutBack(Math.min(1, raw));
      const ry = u(58) + i * u(8.4);
      ctx.save();
      ctx.globalAlpha = Math.min(1, raw * 1.4);
      ctx.translate(W / 2, ry + u(3.4));
      ctx.scale(0.94 + 0.06 * pop, 0.94 + 0.06 * pop);
      ctx.translate(-W / 2, -(ry + u(3.4)));
      this.glass(ctx, u(3.4), ry, W - u(6.8), u(6.8), u(2));
      ctx.textAlign = 'left';
      ctx.font = `${u(2.6)}px serif`;
      ctx.fillText(drinks[i][0], u(6), ry + u(4.5));
      ctx.fillStyle = '#f4f1fb';
      ctx.font = `600 ${u(2)}px system-ui, sans-serif`;
      ctx.fillText(drinks[i][1], u(11), ry + u(4.3));
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(245,242,251,.4)';
      ctx.fillText(drinks[i][2], W - u(6), ry + u(4.3));
      ctx.restore();
      ctx.textAlign = 'center';
    }

    this.tabbar(ctx, accent);
  }

  // ── 'install' — icon flies onto the home screen ─────────────────────────

  private drawInstall(ctx: CanvasRenderingContext2D, p: number, accent: string): void {
    const u = this.u.bind(this);

    // wallpaper
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1b1133');
    bg.addColorStop(1, '#0b0713');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.7, H * 0.25, 0, W * 0.7, H * 0.25, W * 0.9);
    glow.addColorStop(0, 'rgba(255,46,99,.18)');
    glow.addColorStop(1, 'rgba(255,46,99,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    this.chrome(ctx);

    // app grid (muted neighbours)
    const cols = 4;
    const gap = W * 0.06;
    const cell = (W - gap * (cols + 1)) / cols;
    const top = u(12);
    const rowH = cell + u(4.6);
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0 && c === 0) continue; // Salut's slot
        this.rrect(ctx, gap + c * (cell + gap), top + r * rowH, cell, cell, cell * 0.24);
        ctx.fill();
      }
    }

    // dock
    this.glass(ctx, gap, H - u(13), W - gap * 2, cell + u(2.4), u(3));
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    for (let c = 0; c < cols; c++) {
      this.rrect(ctx, gap * 1.6 + c * (cell + gap * 0.86), H - u(11.9), cell * 0.86, cell * 0.86, cell * 0.2);
      ctx.fill();
    }

    // the Salut icon flies home
    const ease = this.smooth(Math.min(1, Math.max(0, (p - 0.08) / 0.62)));
    const startX = W / 2 - cell / 2;
    const startY = H / 2 - cell / 2;
    const tX = gap;
    const tY = top;
    const x = startX + (tX - startX) * ease;
    const y = startY + (tY - startY) * ease;
    const scale = 1.8 - 0.8 * ease;
    const size = cell * scale;
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, accent);
    g.addColorStop(1, '#6c2bd9');
    ctx.save();
    ctx.shadowColor = 'rgba(255,46,99,.5)';
    ctx.shadowBlur = 30 * (1 - ease) + 8;
    ctx.fillStyle = g;
    this.rrect(ctx, x + (cell - size) / 2, y + (cell - size) / 2, size, size, size * 0.24);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `700 ${size * 0.42}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText('S', x + cell / 2, y + cell / 2 + size * 0.15);

    if (ease > 0.75) {
      ctx.globalAlpha = (ease - 0.75) / 0.25;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = `600 ${u(1.7)}px system-ui, sans-serif`;
      ctx.fillText('Salut', tX + cell / 2, tY + cell + u(2.4));
      ctx.globalAlpha = 1;
    }

    // confirmation toast
    const toast = this.smooth(Math.min(1, Math.max(0, (p - 0.82) / 0.14)));
    if (toast > 0) {
      const tw = W * 0.62;
      const th = u(5);
      const ty2 = H - u(20) + (1 - toast) * u(4);
      ctx.globalAlpha = toast;
      this.glass(ctx, (W - tw) / 2, ty2, tw, th, th / 2);
      ctx.fillStyle = '#7be0ad';
      ctx.font = `600 ${u(2)}px system-ui, sans-serif`;
      ctx.fillText('✓  On your home screen', W / 2, ty2 + th * 0.66);
      ctx.globalAlpha = 1;
    }
  }

  // ── 'bac' — promille as a filling progress bar ──────────────────────────

  private drawBac(ctx: CanvasRenderingContext2D, p: number, accent: string): void {
    const u = this.u.bind(this);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1c1235');
    bg.addColorStop(0.5, '#140d22');
    bg.addColorStop(1, '#0d0817');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    this.chrome(ctx);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(245,242,251,.5)';
    ctx.font = `700 ${u(1.7)}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText('Y O U R   N I G H T,   M E A S U R E D', W / 2, u(9));

    const level = Math.min(1, Math.pow(Math.max(0, p), 0.82));
    const promille = level * 1.4;
    const col = this.ramp(level);

    // big readout
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 10 + 26 * level;
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${u(13)}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText(promille.toFixed(2), W / 2, u(26));
    ctx.restore();
    ctx.fillStyle = 'rgba(245,242,251,.5)';
    ctx.font = `700 ${u(2)}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText('‰  P R O M I L L E', W / 2, u(30));

    // the progress bar fills with the ramp colours
    const bx = u(7);
    const bw = W - u(14);
    const by = u(35);
    const bh = u(4.4);
    this.rrect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fill();
    const fw = Math.max(bh, bw * level);
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, this.ramp(0.1));
    grad.addColorStop(0.5, this.ramp(0.5));
    grad.addColorStop(1, this.ramp(0.95));
    ctx.save();
    this.rrect(ctx, bx, by, fw, bh, bh / 2);
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, bw, bh);
    ctx.restore();

    // 0.5‰ limit marker
    const lx = bx + bw * (0.5 / 1.4);
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = u(0.3);
    ctx.beginPath();
    ctx.moveTo(lx, by - u(1));
    ctx.lineTo(lx, by + bh + u(1));
    ctx.stroke();
    ctx.fillStyle = 'rgba(245,242,251,.5)';
    ctx.font = `600 ${u(1.5)}px system-ui, sans-serif`;
    ctx.fillText('0.5 limit', lx, by + bh + u(3));

    // status + time-till-sober
    let status = 'Tracking your night…';
    let warn = false;
    if (level > 0.82) { status = 'Over the limit'; warn = true; }
    else if (level > 0.55) status = 'Pace yourself';
    else if (level > 0.22) status = 'Feeling it';
    ctx.textAlign = 'left';
    ctx.fillStyle = warn ? '#ff8a7a' : 'rgba(245,242,251,.72)';
    ctx.font = `600 ${u(2.1)}px system-ui, sans-serif`;
    ctx.fillText(status, bx, by + u(10.5));
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(245,242,251,.5)';
    ctx.fillText('sober ~02:40', bx + bw, by + u(10.5));

    // drink log rows pop in
    const drinks = [
      ['🍺', 'Lager · 0.5 L', '23:14'],
      ['🍸', 'Negroni', '23:46'],
      ['🥃', 'Tequila · Shot', '00:12'],
    ];
    const thr = [0.16, 0.45, 0.72];
    for (let i = 0; i < drinks.length; i++) {
      const raw = (p - thr[i]) / 0.1;
      if (raw <= 0) continue;
      const pop = this.easeOutBack(Math.min(1, raw));
      const ry = u(53) + i * u(8.4);
      ctx.save();
      ctx.globalAlpha = Math.min(1, raw * 1.4);
      ctx.translate(W / 2, ry + u(3.4));
      ctx.scale(0.94 + 0.06 * pop, 0.94 + 0.06 * pop);
      ctx.translate(-W / 2, -(ry + u(3.4)));
      this.glass(ctx, u(3.4), ry, W - u(6.8), u(6.8), u(2));
      ctx.textAlign = 'left';
      ctx.font = `${u(2.6)}px serif`;
      ctx.fillText(drinks[i][0], u(6), ry + u(4.5));
      ctx.fillStyle = '#f4f1fb';
      ctx.font = `600 ${u(2)}px system-ui, sans-serif`;
      ctx.fillText(drinks[i][1], u(11), ry + u(4.3));
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(245,242,251,.4)';
      ctx.fillText(drinks[i][2], W - u(6), ry + u(4.3));
      ctx.restore();
      ctx.textAlign = 'center';
    }

    this.tabbar(ctx, accent);
  }

  // ── 'drinks' — cocktail showcase ────────────────────────────────────────

  private drawDrinks(ctx: CanvasRenderingContext2D, p: number, accent: string): void {
    const u = this.u.bind(this);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1d1338');
    bg.addColorStop(1, '#0c0717');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    this.chrome(ctx);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4f1fb';
    ctx.font = `700 ${u(2.6)}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText('Cocktails', W / 2, u(8.2));
    ctx.fillStyle = 'rgba(245,242,251,.5)';
    ctx.font = `600 ${u(1.7)}px system-ui, sans-serif`;
    ctx.fillText('15 recipes · filter by spirit', W / 2, u(11.6));

    // featured drink
    this.glass(ctx, u(3.4), u(14), W - u(6.8), u(40), u(3));
    const reveal = this.smooth(Math.min(1, p / 0.4));
    this.drawGlass(ctx, W / 2, u(26), u(11) * reveal, '#E0533C');
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `700 ${u(3.2)}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText('Negroni', W / 2, u(45));
    ctx.fillStyle = 'rgba(245,242,251,.55)';
    ctx.font = `${u(1.9)}px system-ui, sans-serif`;
    ctx.fillText('Gin · Campari · Vermouth', W / 2, u(49.5));

    // recipe rows slide in
    const items = [
      ['🍊', 'Aperol Spritz', 'Bright & bubbly'],
      ['🍋', 'Margarita', 'Salt & lime'],
      ['🌿', 'Mojito', 'Mint & lime'],
    ];
    for (let i = 0; i < items.length; i++) {
      const raw = (p - (0.25 + i * 0.18)) / 0.12;
      if (raw <= 0) continue;
      const slide = this.smooth(Math.min(1, raw));
      const ry = u(58) + i * u(8.4);
      ctx.save();
      ctx.globalAlpha = Math.min(1, raw * 1.4);
      ctx.translate((1 - slide) * u(10), 0);
      this.glass(ctx, u(3.4), ry, W - u(6.8), u(6.8), u(2));
      ctx.textAlign = 'left';
      ctx.font = `${u(2.6)}px serif`;
      ctx.fillText(items[i][0], u(6), ry + u(4.4));
      ctx.fillStyle = '#f4f1fb';
      ctx.font = `600 ${u(2)}px system-ui, sans-serif`;
      ctx.fillText(items[i][1], u(11), ry + u(3.9));
      ctx.fillStyle = 'rgba(245,242,251,.5)';
      ctx.font = `${u(1.6)}px system-ui, sans-serif`;
      ctx.fillText(items[i][2], u(11), ry + u(6));
      ctx.restore();
    }

    ctx.textAlign = 'center';
    this.tabbar(ctx, accent);
  }

  /** A stylised coupe glass with liquid, centred at (cx, cy), bowl radius s. */
  private drawGlass(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string): void {
    if (s < 1) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = Math.max(1, s * 0.06);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // liquid
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.82, cy - s * 0.5);
    ctx.quadraticCurveTo(cx, cy + s * 0.34, cx + s * 0.82, cy - s * 0.5);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    // bowl
    ctx.beginPath();
    ctx.moveTo(cx - s, cy - s * 0.8);
    ctx.quadraticCurveTo(cx, cy + s * 0.55, cx + s, cy - s * 0.8);
    ctx.stroke();
    // stem + base
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.18);
    ctx.lineTo(cx, cy + s * 1.15);
    ctx.moveTo(cx - s * 0.5, cy + s * 1.15);
    ctx.lineTo(cx + s * 0.5, cy + s * 1.15);
    ctx.stroke();
    ctx.restore();
  }

  // ── splash (hero "app opens" beat) ───────────────────────────────────────

  private drawSplash(ctx: CanvasRenderingContext2D, a: number): void {
    const u = this.u.bind(this);
    ctx.save();
    ctx.globalAlpha = Math.min(1, a * 1.2);
    ctx.fillStyle = '#0c0717';
    ctx.fillRect(0, 0, W, H);
    const s = u(11) * (1 + 0.18 * (1 - a));
    const g = ctx.createLinearGradient(W / 2 - s, H / 2 - s, W / 2 + s, H / 2 + s);
    g.addColorStop(0, '#ff2e63');
    g.addColorStop(1, '#6c2bd9');
    ctx.fillStyle = g;
    this.rrect(ctx, W / 2 - s / 2, H / 2 - s * 0.72, s, s, s * 0.26);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `700 ${s * 0.46}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText('S', W / 2, H / 2 - s * 0.06);
    ctx.font = `700 ${u(2.6)}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.fillText('Salut', W / 2, H / 2 + s * 0.78);
    ctx.restore();
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /** Blue → green → amber → red ramp for the BAC dial. */
  private ramp(t: number): string {
    const stops: [number, number[]][] = [
      [0.0, [47, 128, 237]],
      [0.35, [111, 207, 151]],
      [0.6, [255, 210, 63]],
      [0.8, [255, 122, 47]],
      [1.0, [235, 47, 75]],
    ];
    const x = Math.max(0, Math.min(1, t));
    for (let i = 1; i < stops.length; i++) {
      if (x <= stops[i][0]) {
        const [t0, c0] = stops[i - 1];
        const [t1, c1] = stops[i];
        const f = (x - t0) / (t1 - t0);
        return `rgb(${Math.round(c0[0] + (c1[0] - c0[0]) * f)},${Math.round(
          c0[1] + (c1[1] - c0[1]) * f,
        )},${Math.round(c0[2] + (c1[2] - c0[2]) * f)})`;
      }
    }
    return 'rgb(235,47,75)';
  }

  private smooth(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}
