import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Magnetic hover — the element leans a few pixels toward the pointer and
 * springs back on leave (relies on the host's own `transform` transition,
 * e.g. the global `.btn`). Pointer-fine devices only; motion-safe.
 */
@Directive({ selector: '[salutMagnetic]', standalone: true })
export class MagneticDirective {
  constructor() {
    const el = inject(ElementRef).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

      const strength = 0.3;
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${(x * strength).toFixed(1)}px, ${(y * strength).toFixed(1)}px)`;
      };
      const onLeave = () => {
        el.style.transform = '';
      };

      el.addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('pointerleave', onLeave, { passive: true });
      destroyRef.onDestroy(() => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
      });
    });
  }
}
