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
import { HeroNote, UiPainter, paintNotification } from '../../three/ui-painter';
import { makeScreenMaterial } from '../../three/screen-shader';
import {
  PHONE,
  buildPhone,
  easeInOutCubic,
  easeOutBack,
  lerp,
  makeEnvironment,
  remap,
  smooth,
} from '../../three/phone-rig';

/**
 * The hero "reveal" sequence (à la meetcleo.com's clouds-to-phone opener).
 *
 * A pinned, scroll-scrubbed WebGL stage in three beats:
 *   A — a party light show fills the whole viewport (it's actually the
 *       phone's screen with the camera right up against it);
 *   B — the camera pulls back: the rave was on a 3D phone all along,
 *       floating glass shards drift in around it;
 *   C — the screen irises into Salut and the first round gets logged,
 *       the BAC dial climbing live.
 *
 * Caption layers are projected from the parent (`slot="phase-a|b|c"`), so
 * copy/SEO stay in the page component. Progressive enhancement: without JS
 * (or with reduced motion / no WebGL) the captions simply stack as normal
 * static sections — `is-anim` switches on the choreography.
 */
@Component({
  selector: 'salut-hero-stage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hstage" #wrap>
      <div class="hstage__stage" #stage>
        <canvas class="hstage__gl" #canvas aria-hidden="true"></canvas>
        <div class="hstage__cap hstage__cap--a" #capA><ng-content select="[slot=phase-a]" /></div>
        <div class="hstage__cap hstage__cap--b" #capB><ng-content select="[slot=phase-b]" /></div>
        <div class="hstage__cap hstage__cap--c" #capC><ng-content select="[slot=phase-c]" /></div>
      </div>
    </div>
  `,
  styleUrl: './hero-stage.scss',
})
export class HeroStage {
  /** Push notifications that pop off the device (friends tracking drinks). */
  readonly notes = input<readonly HeroNote[]>([]);

  private readonly wrap = viewChild.required<ElementRef<HTMLElement>>('wrap');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly capA = viewChild.required<ElementRef<HTMLElement>>('capA');
  private readonly capB = viewChild.required<ElementRef<HTMLElement>>('capB');
  private readonly capC = viewChild.required<ElementRef<HTMLElement>>('capC');
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => void this.init());
  }

  private async init(): Promise<void> {
    const hostEl = this.host.nativeElement as HTMLElement;
    const canvas = this.canvas().nativeElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    // Switch to the pinned overlay layout BEFORE the heavy async work. On a
    // cold cache the three.js/GSAP chunks can take longer than the intro
    // overlay — without this the stacked no-JS fallback flashed through and
    // the page reflowed mid-view once init finished. Reverted on failure.
    if (!reduced) hostEl.classList.add('is-anim');
    const fail = () => {
      hostEl.classList.remove('is-anim');
      hostEl.classList.add('is-flat');
    };

    let THREE: typeof import('three');
    try {
      THREE = await import('three');
    } catch {
      fail();
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
      fail();
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // ── scene ───────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
    scene.environment = await makeEnvironment(THREE, renderer);

    const painter = new UiPainter();
    const appTex = new THREE.CanvasTexture(painter.canvas);
    painter.draw('track', 0, 0);
    appTex.needsUpdate = true;
    const { material: screenMat, uniforms: su } = makeScreenMaterial(THREE, appTex);
    const rig = await buildPhone(THREE, screenMat);
    scene.add(rig.group);

    // repaint once the display font is in
    void document.fonts?.ready.then(() => painter.invalidate());

    scene.add(new THREE.AmbientLight(0x8a7fb0, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-2.5, 3, 4);
    scene.add(key);
    const punch = new THREE.PointLight(0xff2e63, 6, 12);
    punch.position.set(2.2, -1, 2.5);
    scene.add(punch);
    const grape = new THREE.PointLight(0x6c2bd9, 5, 12);
    grape.position.set(-2.4, 1.6, 2);
    scene.add(grape);

    // push notifications popping off the device — planes wider than the
    // phone body, so the cards visibly spill over its edges
    interface NoteMesh {
      mesh: import('three').Mesh;
      from: number; // progress where it pops in
      until: number; // progress where it fades (>1 = stays)
    }
    const noteMeshes: NoteMesh[] = [];
    const noteSlots = [
      { x: 0.27, y: 0.6, z: 0.16, rz: -0.03, from: 0.34, until: 0.55 },
      { x: -0.26, y: 0.08, z: 0.2, rz: 0.025, from: 0.78, until: 2 },
      { x: 0.24, y: -0.44, z: 0.24, rz: -0.02, from: 0.86, until: 2 },
    ];
    this.notes()
      .slice(0, 3)
      .forEach((note, i) => {
        const slot = noteSlots[i];
        const tex = new THREE.CanvasTexture(paintNotification(note));
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3 * (168 / 768)), mat);
        mesh.position.set(slot.x, slot.y, slot.z);
        mesh.rotation.z = slot.rz;
        mesh.renderOrder = 3;
        mesh.visible = false;
        rig.group.add(mesh);
        noteMeshes.push({ mesh, from: slot.from, until: slot.until });
      });

    // floating glass shards (appear as the camera pulls back)
    const shardGeo = new THREE.PlaneGeometry(0.34, 0.5);
    const shardMat = new THREE.MeshPhysicalMaterial({
      color: 0xbfa9ff,
      metalness: 0.9,
      roughness: 0.08,
      transparent: true,
      opacity: 0.16,
      envMapIntensity: 2,
      side: THREE.DoubleSide,
    });
    const shards: import('three').Mesh[] = [];
    const shardSeeds = [
      [-1.5, 0.9, -0.6, 0.4],
      [1.6, 0.4, -1.0, 1.7],
      [-1.2, -1.1, -0.4, 3.1],
      [1.3, -0.8, -1.2, 4.4],
      [0.2, 1.4, -1.5, 5.6],
    ];
    for (const [sx, sy, sz, ph] of shardSeeds) {
      const m = new THREE.Mesh(shardGeo, shardMat);
      m.position.set(sx, sy, sz);
      m.rotation.set(ph, ph * 0.7, ph * 0.3);
      m.userData['phase'] = ph;
      shards.push(m);
      scene.add(m);
    }

    // ── layout / camera distances ───────────────────────────────────────
    let zNear = 1;
    let zFar = 5;
    let portrait = false;
    const layout = () => {
      const stageEl = this.stage().nativeElement;
      const w = stageEl.clientWidth || 1;
      const h = stageEl.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const tanV = Math.tan((camera.fov * Math.PI) / 360);
      const tanH = tanV * camera.aspect;
      // camera close enough that the screen plane overfills the viewport
      zNear = Math.min((PHONE.SW / 2) / tanH, (PHONE.SH / 2) / tanV) * 0.96;
      // far enough to frame the whole phone with breathing room
      zFar = Math.max((PHONE.H * 1.4) / 2 / tanV, (PHONE.W * 2.4) / 2 / tanH);
      portrait = camera.aspect < 0.9;
    };
    layout();
    const ro = new ResizeObserver(() => {
      layout();
      if (staticMode) renderStatic();
    });
    ro.observe(this.stage().nativeElement);

    // ── pointer ─────────────────────────────────────────────────────────
    let tx = 0;
    let ty = 0;
    const onPointer = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    // ── choreography ────────────────────────────────────────────────────
    const capA = this.capA().nativeElement;
    const capB = this.capB().nativeElement;
    const capC = this.capC().nativeElement;
    const setCap = (el: HTMLElement, o: number, y: number) => {
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${y.toFixed(1)}px)`;
      el.style.visibility = o <= 0.001 ? 'hidden' : 'visible';
      // Projected content can't be re-enabled from this component's scoped
      // CSS (encapsulation attrs differ), so toggle clickability here.
      el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
    };

    let progress = 0; // raw from ScrollTrigger
    let pr = 0; // smoothed
    let time = 0;
    let last = performance.now();
    const px = { x: 0, y: 0 }; // lerped pointer

    const apply = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      pr += (progress - pr) * Math.min(1, dt * 7);
      px.x += (tx - px.x) * Math.min(1, dt * 4);
      px.y += (ty - px.y) * Math.min(1, dt * 4);

      const beat = 0.5 + 0.5 * Math.sin(time * 3.4);
      su.uTime.value = time;
      su.uPointer.value.set(px.x, px.y);
      rig.glassUniforms.uTime.value = time;
      rig.glassUniforms.uStreak.value.set(px.x, px.y);
      punch.intensity = 4.5 + 3 * beat;
      grape.intensity = 4 + 2.5 * (1 - beat);

      // beat B — dolly out and reveal the phone; the glass reflections fade
      // in WITH the pull-back (full-screen they'd wash the party white)
      const zoom = easeInOutCubic(remap(pr, 0.08, 0.52));
      rig.glassUniforms.uReveal.value = smooth(remap(zoom, 0.25, 0.85));
      camera.position.z = lerp(zNear, zFar, zoom);
      const sideShift = portrait ? 0 : 0.52;
      rig.group.position.x = zoom * sideShift;
      rig.group.position.y = zoom * (portrait ? 0.14 : 0.05) + Math.sin(time * 0.5) * 0.02 * zoom;
      rig.group.rotation.y = zoom * -0.34 + px.x * 0.13 * zoom + Math.sin(time * 0.4) * 0.03 * zoom;
      rig.group.rotation.x = zoom * 0.05 + px.y * -0.09 * zoom;
      camera.lookAt(rig.group.position.x * 0.85, rig.group.position.y * 0.6, 0);

      // beat C — app opens, first round gets logged
      const open = smooth(remap(pr, 0.56, 0.7));
      su.uMix.value = open;
      const uiP = remap(pr, 0.7, 0.97);
      if (painter.draw('track', uiP, smooth(remap(pr, 0.58, 0.68)))) appTex.needsUpdate = true;

      // notifications — a friend tracks before the app opens, then points
      // and leaderboard pings roll in while the promille climbs
      for (const n of noteMeshes) {
        const pop = easeOutBack(remap(pr, n.from, n.from + 0.05));
        const fade = 1 - smooth(remap(pr, n.until - 0.05, n.until));
        const vis = pop > 0.001 && fade > 0.001;
        n.mesh.visible = vis;
        if (!vis) continue;
        n.mesh.scale.setScalar(Math.max(0.001, pop));
        (n.mesh.material as import('three').MeshBasicMaterial).opacity = fade;
        n.mesh.position.y += Math.sin(time * 1.1 + n.from * 20) * 0.0006;
      }

      // shards drift in with the reveal
      for (const s of shards) {
        const ph = s.userData['phase'] as number;
        const vis = smooth(remap(zoom, 0.35, 0.9));
        s.scale.setScalar(Math.max(0.001, vis));
        s.position.y += Math.sin(time * 0.6 + ph) * 0.0008;
        s.rotation.y += dt * 0.15;
        s.rotation.z += dt * 0.05;
      }

      // caption layers
      setCap(capA, 1 - smooth(remap(pr, 0.05, 0.16)), pr * -90);
      const bIn = smooth(remap(pr, 0.3, 0.4));
      const bOut = smooth(remap(pr, 0.55, 0.63));
      setCap(capB, bIn * (1 - bOut), (1 - bIn) * 36 - bOut * 30);
      const cIn = smooth(remap(pr, 0.7, 0.8));
      setCap(capC, cIn, (1 - cIn) * 36);

      renderer.render(scene, camera);
    };

    // ── static fallback (reduced motion / ScrollTrigger failure) ────────
    let staticMode = false;
    const renderStatic = () => {
      time = 4.2;
      su.uTime.value = time;
      su.uMix.value = 1;
      painter.draw('track', 0.62, 1);
      appTex.needsUpdate = true;
      camera.position.z = zFar;
      camera.lookAt(0, 0, 0);
      rig.group.rotation.set(0.04, -0.26, 0);
      rig.group.position.set(0, 0, 0);
      for (const s of shards) s.scale.setScalar(1);
      // one friend ping for flavour in the static composition
      const n = noteMeshes[1] ?? noteMeshes[0];
      if (n) {
        n.mesh.visible = true;
        n.mesh.scale.setScalar(1);
      }
      renderer.render(scene, camera);
    };

    let dead = false;
    const teardownBase = () => {
      dead = true;
      ro.disconnect();
      renderer.setAnimationLoop(null);
      rig.dispose();
      for (const n of noteMeshes) {
        n.mesh.geometry.dispose();
        const m = n.mesh.material as import('three').MeshBasicMaterial;
        m.map?.dispose();
        m.dispose();
      }
      shardGeo.dispose();
      shardMat.dispose();
      screenMat.dispose();
      appTex.dispose();
      renderer.dispose();
    };

    if (reduced) {
      staticMode = true;
      renderStatic();
      // re-render once webfonts land (the loop isn't running to pick it up)
      void document.fonts?.ready.then(() => {
        if (!dead) renderStatic();
      });
      this.destroyRef.onDestroy(teardownBase);
      return;
    }

    try {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      gsap.registerPlugin(ScrollTrigger);
      // Mobile URL-bar show/hide fires resize events that would re-measure
      // (and visibly jump) the pinned stages — ignore pure-height resizes.
      ScrollTrigger.config({ ignoreMobileResize: true });

      window.addEventListener('pointermove', onPointer, { passive: true });

      const trigger = ScrollTrigger.create({
        trigger: this.wrap().nativeElement,
        pin: this.stage().nativeElement,
        start: 'top top',
        end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < 768 ? 2.2 : 3.2))}`,
        scrub: 0.5,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          progress = self.progress;
        },
        onRefresh: () => layout(),
      });

      // The stages init asynchronously in arbitrary order, after the window
      // `load` refresh has usually already happened — and this pin inserts a
      // multi-viewport spacer that shifts everything measured before it.
      // Re-measure every trigger now, and again once webfonts settle layout.
      ScrollTrigger.refresh();
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());

      // run while on screen, pause otherwise
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
      io.observe(this.wrap().nativeElement);
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
        window.removeEventListener('pointermove', onPointer);
        teardownBase();
      });
    } catch {
      // GSAP failed — fall back to the static stacked layout
      hostEl.classList.remove('is-anim');
      staticMode = true;
      renderStatic();
      this.destroyRef.onDestroy(teardownBase);
    }
  }
}
