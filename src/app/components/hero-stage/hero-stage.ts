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
import { HeroNote, UiMode, UiPainter, paintNotification } from '../../three/ui-painter';
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
import { IntroBus } from '../../core/intro/intro.bus';

/**
 * The hero — a self-playing WebGL stage (no scroll-jacking).
 *
 * Once the intro curtain lifts it auto-plays one sequence, then loops a
 * swipeable app showcase:
 *   reveal — a party light show fills the screen, then the camera pulls back to
 *            show it was a 3D phone all along (glass shards drift in);
 *   cycle  — the app opens and the screen cycles through install → bac →
 *            drinks. It auto-advances on a cooldown, and the user can flick the
 *            glass cards horizontally to advance/loop (a continuous carousel,
 *            `scenePos`). Each scene cut is masked by a quick screen dim.
 *
 * Vertical drags are never captured (`touch-action: pan-y`), so the user can
 * scroll past to the cocktails section at any moment — the stage scrolls away
 * and the render loop pauses off-screen.
 *
 * Caption layers are projected from the parent (`slot="reveal|install|bac|
 * drinks"`); the scene cards ride the carousel. Progressive enhancement:
 * without JS / reduced motion / no WebGL the captions stack as normal static
 * sections — `is-anim` switches on the choreography.
 */
@Component({
  selector: 'salut-hero-stage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hstage" #wrap>
      <div class="hstage__stage" #stage>
        <canvas class="hstage__gl" #canvas aria-hidden="true"></canvas>
        <div class="hstage__cap hstage__cap--reveal" #capReveal>
          <ng-content select="[slot=reveal]" />
        </div>
        <div class="hstage__cap hstage__cap--scene" #capInstall>
          <ng-content select="[slot=install]" />
        </div>
        <div class="hstage__cap hstage__cap--scene" #capBac><ng-content select="[slot=bac]" /></div>
        <div class="hstage__cap hstage__cap--scene" #capDrinks>
          <ng-content select="[slot=drinks]" />
        </div>
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
  private readonly capReveal = viewChild.required<ElementRef<HTMLElement>>('capReveal');
  private readonly capInstall = viewChild.required<ElementRef<HTMLElement>>('capInstall');
  private readonly capBac = viewChild.required<ElementRef<HTMLElement>>('capBac');
  private readonly capDrinks = viewChild.required<ElementRef<HTMLElement>>('capDrinks');
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly introBus = inject(IntroBus);

  constructor() {
    afterNextRender(() => void this.init());
  }

  private async init(): Promise<void> {
    const hostEl = this.host.nativeElement as HTMLElement;
    const canvas = this.canvas().nativeElement;
    const stageEl = this.stage().nativeElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    // Switch to the overlay layout BEFORE the heavy async work. On a cold cache
    // the three.js chunk can take longer than the intro overlay — without this
    // the stacked no-JS fallback flashed through. Reverted on failure.
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
    painter.draw('install', 0, 0);
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
    }
    const noteMeshes: NoteMesh[] = [];
    const noteSlots = [
      { x: 0.27, y: 0.6, z: 0.16, rz: -0.03 },
      { x: -0.26, y: 0.08, z: 0.2, rz: 0.025 },
      { x: 0.24, y: -0.44, z: 0.24, rz: -0.02 },
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
        noteMeshes.push({ mesh });
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
    let spacing = 1; // px a scene card travels per carousel step (set in layout)
    const layout = () => {
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
      spacing = w * 0.62;
    };
    layout();
    const ro = new ResizeObserver(() => {
      layout();
      if (staticMode) renderStatic();
    });
    ro.observe(stageEl);

    // ── pointer (device tilt) ───────────────────────────────────────────
    let tx = 0;
    let ty = 0;
    const onPointer = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    // ── captions ────────────────────────────────────────────────────────
    const capReveal = this.capReveal().nativeElement;
    const sceneCaps = [
      this.capInstall().nativeElement,
      this.capBac().nativeElement,
      this.capDrinks().nativeElement,
    ];
    // The reveal headline fades up as the app opens.
    const setReveal = (o: number, y: number) => {
      capReveal.style.opacity = o.toFixed(3);
      capReveal.style.transform = `translateY(${y.toFixed(1)}px)`;
      capReveal.style.visibility = o <= 0.001 ? 'hidden' : 'visible';
      capReveal.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
    };
    // Scene cards ride the carousel horizontally.
    const setCard = (el: HTMLElement, x: number, o: number) => {
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateX(${x.toFixed(1)}px)`;
      el.style.visibility = o <= 0.001 ? 'hidden' : 'visible';
      el.style.pointerEvents = o > 0.6 && Math.abs(x) < 40 ? 'auto' : 'none';
    };

    // ── auto sequence + swipeable scene carousel ────────────────────────
    const SCENES: UiMode[] = ['install', 'bac', 'drinks'];
    const N = SCENES.length;
    const modN = (n: number) => ((n % N) + N) % N;
    const HOLD = 0.35; // seconds on the rave before the dolly-out begins
    const REVEAL_RUN = 2.1; // seconds the pull-back takes
    const OPEN = 0.6; // seconds the screen takes to boot into the app
    const SCENE_DUR = 4.2; // seconds each app scene holds before auto-advancing
    const REVEAL_END = HOLD + REVEAL_RUN;

    let time = 0;
    let last = performance.now();
    const px = { x: 0, y: 0 }; // lerped pointer
    let autoEnabled = false;
    let autoT0 = 0;
    const startAuto = () => {
      if (!autoEnabled) {
        autoEnabled = true;
        autoT0 = time;
      }
    };

    // carousel state
    let scenePos = 0; // continuous index; integers = settled
    let targetPos = 0; // spring target
    let autoTimer = 0; // cooldown accrued while settled on a scene
    let lastIdx = -1;
    let sceneBuildT = 0; // seconds the current scene has been on screen (builds it)
    let dragging = false;

    // horizontal flick (vertical stays page-scroll via touch-action: pan-y)
    let down = false;
    let committed = false;
    let sawVertical = false;
    let sx = 0;
    let sy = 0;
    let dragBase = 0;
    let ddx = 0;
    let lastPX = 0;
    let lastPT = 0;
    let vel = 0;
    const SWIPE_MIN = 8;
    const cyclingNow = () => autoEnabled && time - autoT0 >= REVEAL_END;
    const onSwipeDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!cyclingNow()) return;
      down = true;
      committed = false;
      sawVertical = false;
      sx = e.clientX;
      sy = e.clientY;
      lastPX = e.clientX;
      lastPT = performance.now();
      vel = 0;
      dragBase = Math.round(scenePos);
    };
    const onSwipeMove = (e: PointerEvent) => {
      if (!down || sawVertical) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!committed) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SWIPE_MIN) {
          sawVertical = true; // it's a scroll — let the page have it
          return;
        }
        if (Math.abs(dx) > SWIPE_MIN) {
          committed = true;
          dragging = true;
          try {
            stageEl.setPointerCapture(e.pointerId);
          } catch {
            /* capture is best-effort */
          }
        } else {
          return;
        }
      }
      ddx = e.clientX - sx;
      const now = performance.now();
      if (now > lastPT) vel = (e.clientX - lastPX) / (now - lastPT);
      lastPX = e.clientX;
      lastPT = now;
      scenePos = dragBase - ddx / spacing;
      autoTimer = 0;
    };
    const endSwipe = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      if (committed) {
        try {
          stageEl.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        dragging = false;
        const moved = ddx / spacing; // <0 = swiped left = next
        const flick = Math.abs(vel) > 0.45; // px/ms
        let step = 0;
        if (moved < -0.22 || (flick && vel < 0)) step = 1;
        else if (moved > 0.22 || (flick && vel > 0)) step = -1;
        targetPos = dragBase + step;
        autoTimer = 0; // manual advance resets the cooldown
      }
      committed = false;
    };
    const onSwipeCancel = () => {
      down = false;
      committed = false;
      dragging = false;
    };

    const apply = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      px.x += (tx - px.x) * Math.min(1, dt * 4);
      px.y += (ty - px.y) * Math.min(1, dt * 4);
      const at = autoEnabled ? Math.max(0, time - autoT0) : 0;

      const beat = 0.5 + 0.5 * Math.sin(time * 3.4);
      su.uTime.value = time;
      su.uPointer.value.set(px.x, px.y);
      rig.glassUniforms.uTime.value = time;
      rig.glassUniforms.uStreak.value.set(px.x, px.y);
      punch.intensity = 4.5 + 3 * beat;
      grape.intensity = 4 + 2.5 * (1 - beat);

      // reveal — dolly out and reveal the phone; the glass reflections fade in
      // WITH the pull-back (full-screen they'd wash the party white)
      const zoom = easeInOutCubic(Math.min(1, Math.max(0, at - HOLD) / REVEAL_RUN));
      rig.glassUniforms.uReveal.value = smooth(remap(zoom, 0.25, 0.85));
      camera.position.z = lerp(zNear, zFar, zoom);
      const sideShift = portrait ? 0 : 0.52;
      rig.group.position.x = zoom * sideShift;
      rig.group.position.y = zoom * (portrait ? 0.14 : 0.05) + Math.sin(time * 0.5) * 0.02 * zoom;
      rig.group.rotation.y = zoom * -0.34 + px.x * 0.13 * zoom + Math.sin(time * 0.4) * 0.03 * zoom;
      rig.group.rotation.x = zoom * 0.05 + px.y * -0.09 * zoom;
      camera.lookAt(rig.group.position.x * 0.85, rig.group.position.y * 0.6, 0);

      // app opens as the reveal completes, then the scene carousel runs
      const open = smooth(Math.min(1, Math.max(0, at - (REVEAL_END - 0.3)) / OPEN));
      su.uMix.value = open;

      let mode: UiMode = SCENES[0];
      let sceneP = 0;
      let dim = 0;
      const cycling = at >= REVEAL_END;
      if (cycling) {
        if (!dragging) {
          scenePos += (targetPos - scenePos) * Math.min(1, dt * 6);
          if (Math.abs(scenePos - targetPos) < 0.01) {
            scenePos = targetPos;
            autoTimer += dt;
            if (autoTimer >= SCENE_DUR) {
              targetPos += 1; // auto-advance to the next scene
              autoTimer = 0;
            }
          }
        }
        const idx = modN(Math.round(scenePos));
        if (idx !== lastIdx) {
          lastIdx = idx;
          sceneBuildT = 0;
        }
        sceneBuildT += dt;
        sceneP = smooth(Math.min(1, sceneBuildT / 1.4)); // the scene builds itself
        const f = scenePos - Math.floor(scenePos);
        dim = Math.sin(Math.PI * f); // peaks mid-transition, masking the scene cut
        mode = SCENES[idx];
      }
      if (painter.draw(mode, sceneP, open, '#ff2e63', dim)) appTex.needsUpdate = true;

      // notifications spill off the phone during the BAC scene
      for (let i = 0; i < noteMeshes.length; i++) {
        const n = noteMeshes[i];
        const active = cycling && mode === 'bac';
        const pop = active ? easeOutBack(Math.min(1, (sceneP - i * 0.16) / 0.18)) : 0;
        const vis = pop > 0.01 && 1 - dim > 0.01;
        n.mesh.visible = vis;
        if (!vis) continue;
        n.mesh.scale.setScalar(Math.max(0.001, pop));
        (n.mesh.material as import('three').MeshBasicMaterial).opacity = (1 - dim) * Math.min(1, pop * 1.4);
        n.mesh.position.y += Math.sin(time * 1.1 + i * 20) * 0.0006;
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

      // captions — reveal headline fades as the app opens; scene cards ride the
      // carousel (one centred, neighbours sliding off to the sides)
      setReveal(1 - open, open * -40);
      const cycleIn = smooth(Math.min(1, Math.max(0, at - REVEAL_END) / 0.4));
      for (let i = 0; i < sceneCaps.length; i++) {
        let rel = i - scenePos;
        rel = rel - N * Math.round(rel / N); // nearest wrapped position
        const o = cycling ? Math.max(0, 1 - Math.abs(rel) * 1.5) * cycleIn : 0;
        setCard(sceneCaps[i], rel * spacing, o);
      }

      renderer.render(scene, camera);
    };

    // ── static fallback (reduced motion / WebGL failure) ────────────────
    let staticMode = false;
    const renderStatic = () => {
      time = 4.2;
      su.uTime.value = time;
      su.uMix.value = 1;
      painter.draw('bac', 0.7, 1);
      appTex.needsUpdate = true;
      camera.position.z = zFar;
      camera.lookAt(0, 0, 0);
      rig.group.rotation.set(0.04, -0.26, 0);
      rig.group.position.set(0, 0, 0);
      for (const s of shards) s.scale.setScalar(1);
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
      window.addEventListener('pointermove', onPointer, { passive: true });
      stageEl.addEventListener('pointerdown', onSwipeDown);
      stageEl.addEventListener('pointermove', onSwipeMove);
      stageEl.addEventListener('pointerup', endSwipe);
      stageEl.addEventListener('pointercancel', onSwipeCancel);

      // run while on screen, pause otherwise (so the loop stops once the user
      // scrolls past to the cocktails section)
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

      // Start the auto-sequence when the intro curtain lifts. The fallback
      // timer is only a safety net for the case where lift() never fires — it
      // sits well past the full intro so it never pre-empts the curtain.
      void this.introBus.lifted.then(startAuto);
      const autoFallback = window.setTimeout(startAuto, 9000);

      this.destroyRef.onDestroy(() => {
        clearTimeout(autoFallback);
        io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('pointermove', onPointer);
        stageEl.removeEventListener('pointerdown', onSwipeDown);
        stageEl.removeEventListener('pointermove', onSwipeMove);
        stageEl.removeEventListener('pointerup', endSwipe);
        stageEl.removeEventListener('pointercancel', onSwipeCancel);
        teardownBase();
      });
    } catch {
      fail();
      staticMode = true;
      renderStatic();
      this.destroyRef.onDestroy(teardownBase);
    }
  }
}
