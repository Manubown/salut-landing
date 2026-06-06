import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * Plays a one-shot "pop" on click/tap: adds `.pop` for the animation's duration.
 * The CSS keyframes live with the host (e.g. the cocktail card). Motion-safe.
 */
@Directive({
  selector: '[salutClickPop]',
  standalone: true,
})
export class ClickPopDirective {
  private readonly el = inject(ElementRef<HTMLElement>);
  private timer = 0;

  @HostListener('click')
  pop(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const node = this.el.nativeElement;
    node.classList.remove('pop');
    void node.offsetWidth; // reflow → restart the animation on rapid clicks
    node.classList.add('pop');
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => node.classList.remove('pop'), 700);
  }
}
