import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  viewChild,
} from '@angular/core';

/** Placeholder motion style used until a real frame sequence is supplied. */
export type ScrubMotion = 'bar' | 'spin' | 'fly';

/**
 * Apple-keynote-style scroll-scrub stage.
 *
 * Pins a full-viewport canvas and advances it frame-by-frame as the user
 * scrolls (GSAP ScrollTrigger). Apple's product pages do this with image
 * sequences — not `<video>` — because iOS Safari can't seek a video smoothly;
 * we follow the same approach.
 *
 * - `frames` empty  → draws on-brand *synthetic* placeholder frames so the
 *   mechanic is demoable before any recording exists.
 * - `frames` set    → preloads the sequence (frame-0001.webp …) and scrubs it.
 *
 * SSR-safe: all browser work runs in `afterNextRender`, and GSAP is
 * dynamically imported so it never enters the server bundle. Honors
 * `prefers-reduced-motion` by painting one static frame with no pin/scrub.
 */
@Component({
  selector: 'salut-scrub-stage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrub" #host>
      <div class="scrub__stage" #stage>
        @if (poster()) {
          <img class="scrub__poster" [src]="poster()" alt="" aria-hidden="true" />
        }
        <canvas class="scrub__canvas" #canvas aria-hidden="true"></canvas>
        <div class="scrub__caption">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styleUrl: './scrub-stage.component.scss',
})
export class ScrubStage {
  /** Real frame URLs (e.g. seq/bac/frame-0001.webp …). Empty → synthetic. */
  readonly frames = input<readonly string[]>([]);
  /** Frame count used in synthetic mode. */
  readonly frameCount = input(90);
  /** How long the pin lasts, in multiples of the viewport height. */
  readonly scrollLength = input(2.2);
  /** Accent colour for synthetic placeholder frames. */
  readonly accent = input('#ff6f5e');
  /** Caption drawn under the device in synthetic mode. */
  readonly label = input('');
  /** Placeholder motion style. */
  readonly motion = input<ScrubMotion>('bar');
  /** Poster image shown for SSR / first paint / reduced-motion. */
  readonly poster = input<string | null>(null);

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => void this.init());
  }

  private async init(): Promise<void> {
    const canvas = this.canvas().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const host = this.host().nativeElement;
    const urls = this.frames();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };

    let images: HTMLImageElement[] = [];
    let progress = 0;
    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (images.length) {
        const i = Math.max(0, Math.min(images.length - 1, Math.round(progress * (images.length - 1))));
        this.drawCover(ctx, images[i], w, h);
        host.classList.add('is-painted');
      } else if (!urls.length) {
        this.drawSynthetic(ctx, w, h, progress);
        host.classList.add('is-painted');
      }
      // Real frames not yet loaded → leave transparent so the poster shows.
    };

    sizeCanvas();
    render();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const activate = async () => {
      if (reduced) {
        // Static: synthetic mid-frame, or (real mode) just keep the poster.
        if (!urls.length) {
          progress = 0.5;
          render();
        }
        const onResize = () => {
          sizeCanvas();
          render();
        };
        window.addEventListener('resize', onResize, { passive: true });
        this.destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
        return;
      }

      if (urls.length) {
        images = await this.preload(urls);
        render();
      }

      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      gsap.registerPlugin(ScrollTrigger);

      const trigger = ScrollTrigger.create({
        trigger: host,
        pin: this.stage().nativeElement,
        start: 'top top',
        // Shorter pin on phones so the act doesn't drag (recomputed on refresh).
        end: () =>
          `+=${Math.round(
            window.innerHeight * this.scrollLength() * (window.innerWidth < 768 ? 0.6 : 1),
          )}`,
        scrub: 0.4,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          progress = self.progress;
          render();
        },
        onRefresh: () => {
          sizeCanvas();
          render();
        },
      });
      this.destroyRef.onDestroy(() => trigger.kill());
    };

    // Defer the heavy frame preload until the stage nears the viewport.
    // Synthetic mode is cheap, so it activates immediately.
    if (urls.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          if (entries.some((e) => e.isIntersecting)) {
            obs.disconnect();
            void activate();
          }
        },
        { rootMargin: '150% 0px' },
      );
      io.observe(host);
      this.destroyRef.onDestroy(() => io.disconnect());
    } else {
      void activate();
    }
  }

  private preload(urls: readonly string[]): Promise<HTMLImageElement[]> {
    return Promise.all(
      urls.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img); // keep index alignment if one 404s
            img.src = src;
          }),
      ),
    );
  }

  /** Draw an image to cover the canvas (object-fit: cover). */
  private drawCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
  ): void {
    if (!img.naturalWidth) return;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  // ── Synthetic placeholder frames (on-brand, swap out once recordings land) ──

  private drawSynthetic(ctx: CanvasRenderingContext2D, w: number, h: number, p: number): void {
    const u = h / 100; // layout unit
    const accent = this.accent();

    // Backdrop
    const bg = ctx.createRadialGradient(w / 2, h * 0.12, 0, w / 2, h * 0.12, h);
    bg.addColorStop(0, '#221645');
    bg.addColorStop(0.55, '#140d22');
    bg.addColorStop(1, '#0c0717');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Device
    const ph = h * 0.72;
    const pw = (ph * 9) / 19;
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    const pad = pw * 0.045;
    const sx = px + pad;
    const sy = py + pad;
    const sw = pw - 2 * pad;
    const sh = ph - 2 * pad;

    ctx.fillStyle = '#05030c';
    this.path(ctx, px, py, pw, ph, pw * 0.12);
    ctx.fill();

    ctx.save();
    this.path(ctx, sx, sy, sw, sh, pw * 0.09);
    ctx.fillStyle = '#171029';
    ctx.fill();
    ctx.clip();

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(245,242,251,0.92)';
    ctx.font = `700 ${5 * u}px "Space Grotesk", system-ui, sans-serif`;
    ctx.fillText('Salut', sx + sw / 2, sy + 9 * u);

    if (this.motion() === 'bar') this.drawBar(ctx, sx, sy, sw, sh, u, p);
    else if (this.motion() === 'spin') this.drawSpin(ctx, sx, sy, sw, sh, p);
    else this.drawFly(ctx, sx, sy, sw, sh, u, p, accent);

    ctx.restore();

    if (this.label()) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(245,242,251,0.5)';
      ctx.font = `600 ${3.4 * u}px system-ui, sans-serif`;
      ctx.fillText(this.label(), w / 2, py + ph + 7 * u);
    }

    // Scroll progress hint
    ctx.fillStyle = accent;
    ctx.fillRect(w / 2 - 18 * u, h - 6 * u, 36 * u * p, 0.7 * u);
  }

  /** BAC act — an animated dial: the needle sweeps, the arc climbs blue→red,
   *  the promille glows and counts up, drinks pop in, and the status escalates. */
  private drawBar(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    u: number,
    p: number,
  ): void {
    const level = Math.min(1, Math.pow(p, 0.8)); // climbs fast, then eases
    const promille = level * 1.4;
    const cx = sx + sw / 2;
    const cy = sy + sh * 0.43;
    const R = Math.min(sw * 0.36, sh * 0.2);
    const lw = R * 0.2;
    const a0 = Math.PI * 0.75;
    const sweep = Math.PI * 1.5;
    const col = this.ramp(level);

    // Warm the room as the level rises
    ctx.fillStyle = `rgba(235,47,75,${(0.06 * level).toFixed(3)})`;
    ctx.fillRect(sx, sy, sw, sh);

    // Pulsing glow behind the dial
    const pulse = 0.5 + 0.5 * Math.sin(p * Math.PI * 6);
    ctx.save();
    ctx.globalAlpha = 0.08 + 0.14 * level;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, R * (1 + 0.08 * pulse), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Segmented arc: faint track + multi-colour value sweep
    ctx.lineWidth = lw;
    ctx.lineCap = 'butt';
    const segs = 60;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs;
      const t1 = (s + 1) / segs;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0 + sweep * t0, a0 + sweep * t1 + 0.006);
      ctx.strokeStyle = t1 <= level ? this.ramp(t1) : 'rgba(255,255,255,0.07)';
      ctx.stroke();
    }

    // Needle + hub
    const ang = a0 + sweep * level;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -lw * 0.2);
    ctx.lineTo(R * 0.94, 0);
    ctx.lineTo(0, lw * 0.2);
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

    // Promille readout (glow intensifies with level)
    ctx.textAlign = 'center';
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 10 + 26 * level;
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${12 * u}px "Space Grotesk", system-ui, sans-serif`;
    ctx.fillText(promille.toFixed(2), cx, cy + R * 0.46);
    ctx.restore();
    ctx.fillStyle = 'rgba(245,242,251,0.55)';
    ctx.font = `700 ${2.7 * u}px "Space Grotesk", system-ui, sans-serif`;
    ctx.fillText('‰  P R O M I L L E', cx, cy + R * 0.46 + 4.2 * u);

    // Drinks popping in as the night goes on
    const icons = ['🍺', '🍸', '🥃', '🍷'];
    const thr = [0.1, 0.36, 0.6, 0.84];
    const spread = sw * 0.6;
    const x0 = cx - spread / 2;
    const iy = sy + sh * 0.8;
    for (let i = 0; i < icons.length; i++) {
      const raw = (p - thr[i]) / 0.09;
      if (raw <= 0) continue;
      const pop = this.easeOutBack(Math.min(1, raw));
      const size = 5.4 * u * pop;
      ctx.save();
      ctx.globalAlpha = Math.min(1, raw * 1.5);
      ctx.font = `${size}px serif`;
      ctx.fillText(icons[i], x0 + spread * (i / (icons.length - 1)), iy + size * 0.35);
      ctx.restore();
    }

    // Escalating status
    let status = 'Tracking your night…';
    let warn = false;
    if (level > 0.82) {
      status = '⚠  Over the limit · sober ~02:40';
      warn = true;
    } else if (level > 0.55) {
      status = 'Pace yourself';
    } else if (level > 0.22) {
      status = 'Feeling it';
    }
    ctx.fillStyle = warn ? '#ff8a7a' : 'rgba(245,242,251,0.6)';
    ctx.font = `600 ${3 * u}px system-ui, sans-serif`;
    ctx.fillText(status, cx, sy + sh * 0.92);
  }

  /** Games act — a lucky wheel spinning ~2 turns across the scroll. */
  private drawSpin(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    p: number,
  ): void {
    const cx = sx + sw / 2;
    const cy = sy + sh * 0.52;
    const rad = sw * 0.34;
    const cols = ['#ff6f5e', '#7c5cff', '#ffd23f', '#7be0ad', '#ff2e63', '#56ccf2'];
    const seg = cols.length;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p * Math.PI * 4);
    for (let s = 0; s < seg; s++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, rad, (s / seg) * 2 * Math.PI, ((s + 1) / seg) * 2 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = cols[s];
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - rad - sw * 0.03);
    ctx.lineTo(cx - sw * 0.03, cy - rad + sw * 0.02);
    ctx.lineTo(cx + sw * 0.03, cy - rad + sw * 0.02);
    ctx.closePath();
    ctx.fill();
  }

  /** Home-screen act — the app icon flies onto a home-screen grid. */
  private drawFly(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    u: number,
    p: number,
    accent: string,
  ): void {
    const cols = 3;
    const gap = sw * 0.08;
    const cell = (sw - gap * (cols + 1)) / cols;
    const gridTop = sy + sh * 0.2;
    const rowH = cell + gap * 0.7;

    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#fff';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < cols; c++) {
        this.path(ctx, sx + gap + c * (cell + gap), gridTop + r * rowH, cell, cell, cell * 0.26);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    const ease = p * p * (3 - 2 * p); // smoothstep
    const startX = sx + sw / 2 - cell / 2;
    const startY = sy + sh / 2 - cell / 2;
    const targetX = sx + gap; // row 0, col 0
    const targetY = gridTop;
    const x = startX + (targetX - startX) * ease;
    const y = startY + (targetY - startY) * ease;
    const scale = 1.6 - 0.6 * ease;
    const size = cell * scale;

    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, accent);
    g.addColorStop(1, '#7c5cff');
    ctx.fillStyle = g;
    this.path(ctx, x + (cell - size) / 2, y + (cell - size) / 2, size, size, size * 0.26);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `700 ${size * 0.4}px "Space Grotesk", system-ui, sans-serif`;
    ctx.fillText('S', x + cell / 2, y + cell / 2 + size * 0.14);

    if (ease > 0.7) {
      ctx.globalAlpha = (ease - 0.7) / 0.3;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `600 ${2.6 * u}px system-ui, sans-serif`;
      ctx.fillText('Salut', targetX + cell / 2, targetY + cell + 3.4 * u);
      ctx.globalAlpha = 1;
    }
  }

  /** Rounded-rect path (manual; avoids CanvasRenderingContext2D.roundRect typing gaps). */
  private path(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
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

  /** Overshooting ease for the drink "pop-in". */
  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}
