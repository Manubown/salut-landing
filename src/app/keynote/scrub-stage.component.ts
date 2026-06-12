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
import { UiPainter, UiMode } from '../three/ui-painter';
import { makeScreenMaterial } from '../three/screen-shader';
import { PHONE, buildPhone, lerp, makeEnvironment, remap, smooth } from '../three/phone-rig';

/** Which app scene plays on the phone screen. */
export type ScrubMotion = 'bar' | 'fly';

/**
 * Apple-keynote-style scroll-scrub stage — now a real 3D phone.
 *
 * Pins a full-viewport WebGL stage and choreographs a procedural 3D phone
 * (liquid-glass screen, clearcoat reflections) as the user scrolls:
 * the device rises and turns in, then its UI plays through the act —
 * the BAC dial climbing ('bar') or the app icon landing on the home
 * screen ('fly'). The phone also leans toward the pointer.
 *
 * SSR-safe: three.js and GSAP are dynamically imported in `afterNextRender`
 * and stay out of the server bundle. The heavy init is deferred until the
 * stage approaches the viewport. `prefers-reduced-motion` renders one
 * static frame with no pin. No WebGL → the styled section with its caption
 * remains.
 */
@Component({
  selector: 'salut-scrub-stage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrub" #host>
      <div class="scrub__stage" #stage>
        <canvas class="scrub__canvas" #canvas aria-hidden="true"></canvas>
        @if (label()) {
          <span class="scrub__label">{{ label() }}</span>
        }
        <div class="scrub__caption">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styleUrl: './scrub-stage.component.scss',
})
export class ScrubStage {
  /** App scene on the screen: 'bar' = BAC dial, 'fly' = home-screen install. */
  readonly motion = input<ScrubMotion>('bar');
  /** How long the pin lasts, in multiples of the viewport height. */
  readonly scrollLength = input(2.2);
  /** Accent colour (FAB, flying icon, rim light). */
  readonly accent = input('#ff6f5e');
  /** Small caption under the device. */
  readonly label = input('');

  private readonly hostRef = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      // Defer the WebGL context + three.js work until the act draws near.
      const host = this.hostRef().nativeElement;
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
          (entries, obs) => {
            if (entries.some((e) => e.isIntersecting)) {
              obs.disconnect();
              void this.init();
            }
          },
          { rootMargin: '120% 0px' },
        );
        io.observe(host);
        this.destroyRef.onDestroy(() => io.disconnect());
      } else {
        void this.init();
      }
    });
  }

  private async init(): Promise<void> {
    const canvas = this.canvas().nativeElement;
    const stageEl = this.stage().nativeElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const mode: UiMode = this.motion() === 'fly' ? 'install' : 'track';
    const accent = this.accent();

    let THREE: typeof import('three');
    try {
      THREE = await import('three');
    } catch {
      return;
    }
    let renderer: import('three').WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
    scene.environment = await makeEnvironment(THREE, renderer);

    const painter = new UiPainter();
    const appTex = new THREE.CanvasTexture(painter.canvas);
    painter.draw(mode, 0, 1, accent);
    appTex.needsUpdate = true;
    const { material: screenMat, uniforms: su } = makeScreenMaterial(THREE, appTex);
    su.uMix.value = 1; // scrub stages show the app directly, no party scene
    const rig = await buildPhone(THREE, screenMat);
    scene.add(rig.group);
    void document.fonts?.ready.then(() => painter.invalidate());

    scene.add(new THREE.AmbientLight(0x8a7fb0, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(-2.5, 3, 4);
    scene.add(key);
    const rim = new THREE.PointLight(new THREE.Color(accent), 5, 12);
    rim.position.set(2.4, -0.6, 2.4);
    scene.add(rim);

    let zCam = 5;
    const layout = () => {
      const w = stageEl.clientWidth || 1;
      const h = stageEl.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const tanV = Math.tan((camera.fov * Math.PI) / 360);
      const tanH = tanV * camera.aspect;
      zCam = Math.max((PHONE.H * 1.45) / 2 / tanV, (PHONE.W * 2.6) / 2 / tanH);
      camera.position.set(0, 0, zCam);
      camera.lookAt(0, 0, 0);
    };
    layout();
    const ro = new ResizeObserver(() => {
      layout();
      if (staticMode) renderOnce(0.55);
    });
    ro.observe(stageEl);

    // pointer tilt (listener on the stage so it only reacts in-act)
    let tx = 0;
    let ty = 0;
    const onPointer = (e: PointerEvent) => {
      const r = stageEl.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    stageEl.addEventListener('pointermove', onPointer, { passive: true });

    let progress = 0;
    let pr = 0;
    let time = 0;
    let last = performance.now();
    const px = { x: 0, y: 0 };

    const apply = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      pr += (progress - pr) * Math.min(1, dt * 8);
      px.x += (tx - px.x) * Math.min(1, dt * 4);
      px.y += (ty - px.y) * Math.min(1, dt * 4);

      su.uTime.value = time;
      rig.glassUniforms.uTime.value = time;
      rig.glassUniforms.uStreak.value.set(px.x, px.y);

      // entrance — the device rises and turns to face the room
      const entry = smooth(remap(pr, 0, 0.24));
      rig.glassUniforms.uReveal.value = entry;
      rig.group.position.y = lerp(-2.6, 0, entry) + Math.sin(time * 0.55) * 0.025 * entry;
      rig.group.rotation.y = lerp(0.85, -0.16, entry) + px.x * 0.16 * entry + Math.sin(time * 0.4) * 0.03;
      rig.group.rotation.x = lerp(0.12, 0.03, entry) + px.y * -0.1 * entry;

      // the act itself plays on the screen
      const uiP = remap(pr, 0.22, 0.92);
      if (painter.draw(mode, uiP, 1, accent)) appTex.needsUpdate = true;

      // settle/exit — a touch of presence before the pin releases
      rig.group.scale.setScalar(1 + smooth(remap(pr, 0.92, 1)) * 0.03);

      renderer.render(scene, camera);
    };

    let staticMode = false;
    const renderOnce = (p: number) => {
      su.uTime.value = 3;
      rig.glassUniforms.uTime.value = 3;
      painter.draw(mode, p, 1, accent);
      appTex.needsUpdate = true;
      rig.group.position.set(0, 0, 0);
      rig.group.rotation.set(0.03, -0.16, 0);
      renderer.render(scene, camera);
    };

    let dead = false;
    const teardown = () => {
      dead = true;
      ro.disconnect();
      stageEl.removeEventListener('pointermove', onPointer);
      renderer.setAnimationLoop(null);
      rig.dispose();
      screenMat.dispose();
      appTex.dispose();
      renderer.dispose();
    };

    if (reduced) {
      staticMode = true;
      renderOnce(0.55);
      // re-render once webfonts land (the loop isn't running to pick it up)
      void document.fonts?.ready.then(() => {
        if (!dead) renderOnce(0.55);
      });
      this.destroyRef.onDestroy(teardown);
      return;
    }

    try {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      gsap.registerPlugin(ScrollTrigger);

      const trigger = ScrollTrigger.create({
        trigger: this.hostRef().nativeElement,
        pin: stageEl,
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
        },
        onRefresh: () => layout(),
      });

      // The hero pin (created in parallel) inserts a multi-viewport spacer
      // above this act; re-measure all triggers so start/end stay correct
      // regardless of which stage finished init first.
      ScrollTrigger.refresh();

      let inView = true;
      let visible = !document.hidden;
      const loop = () => {
        last = performance.now();
        renderer.setAnimationLoop(inView && visible ? apply : null);
      };
      const io = new IntersectionObserver((entries) => {
        inView = entries.some((e) => e.isIntersecting);
        loop();
      });
      io.observe(this.hostRef().nativeElement);
      const onVis = () => {
        visible = !document.hidden;
        loop();
      };
      document.addEventListener('visibilitychange', onVis);
      loop();

      this.destroyRef.onDestroy(() => {
        trigger.kill();
        io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        teardown();
      });
    } catch {
      staticMode = true;
      renderOnce(0.55);
      this.destroyRef.onDestroy(teardown);
    }
  }
}
