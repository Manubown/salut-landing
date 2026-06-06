import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Glass silhouettes for the cocktail cards. */
export type GlassType = 'Coupe' | 'Highball' | 'Rocks' | 'Wine';

/**
 * A small, tasteful SVG illustration of a cocktail glass. The liquid is tinted
 * per drink via the `color` input (exposed as the `--liquid` custom property),
 * so one component covers the whole menu.
 */
@Component({
  selector: 'salut-drink-glass',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--liquid]': 'color()' },
  template: `
    @switch (glass()) {
      @case ('Highball') {
        <svg viewBox="0 0 64 88" class="dg" aria-hidden="true">
          <rect class="gl" x="21" y="10" width="22" height="68" rx="5" />
          <rect class="liquid" x="23.2" y="36" width="17.6" height="39.5" rx="3" />
          <ellipse class="shine" cx="32" cy="36" rx="8.8" ry="1.8" />
          <line class="gl" x1="40" y1="6" x2="36" y2="42" />
          <circle class="garnish garnish--lime" cx="39" cy="16" r="3.2" />
        </svg>
      }
      @case ('Rocks') {
        <svg viewBox="0 0 64 88" class="dg" aria-hidden="true">
          <path class="gl" d="M16 42 H48 V70 C48 74 44 76 40 76 H24 C20 76 16 74 16 70 Z" />
          <path class="liquid" d="M18.5 54 H45.5 V69 C45.5 72 43 73.5 40 73.5 H24 C21 73.5 18.5 72 18.5 69 Z" />
          <rect class="ice" x="24" y="49" width="11" height="11" rx="2" transform="rotate(8 29.5 54.5)" />
          <rect class="ice" x="33" y="55" width="9" height="9" rx="2" transform="rotate(-10 37.5 59.5)" />
        </svg>
      }
      @case ('Wine') {
        <svg viewBox="0 0 64 88" class="dg" aria-hidden="true">
          <ellipse class="gl-solid" cx="32" cy="82" rx="13" ry="2.6" />
          <rect class="gl-solid" x="30.8" y="52" width="2.4" height="28" />
          <path class="gl" d="M18 18 C18 46 46 46 46 18" />
          <line class="gl" x1="18" y1="18" x2="46" y2="18" />
          <path class="liquid" d="M21 29 C22 43 42 43 43 29 Z" />
          <circle class="bubble" cx="28" cy="38" r="1" />
          <circle class="bubble" cx="34" cy="40" r="0.8" />
          <circle class="bubble" cx="31" cy="34" r="0.7" />
          <circle class="garnish garnish--orange" cx="42" cy="22" r="3" />
        </svg>
      }
      @default {
        <!-- Coupe -->
        <svg viewBox="0 0 64 88" class="dg" aria-hidden="true">
          <ellipse class="gl-solid" cx="32" cy="82" rx="13" ry="2.6" />
          <rect class="gl-solid" x="30.8" y="50" width="2.4" height="30" />
          <path class="gl" d="M13 33 H51 C49 49 15 49 13 33 Z" />
          <path class="liquid" d="M17.5 34.5 H46.5 C45 45 19 45 17.5 34.5 Z" />
          <ellipse class="shine" cx="32" cy="34.4" rx="14.2" ry="2" />
          <line class="gl" x1="43" y1="31" x2="44.5" y2="24" />
          <circle class="garnish garnish--cherry" cx="44.8" cy="23" r="2.4" />
        </svg>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .dg { width: 100%; height: 100%; overflow: visible; }
    .gl { fill: none; stroke: rgba(255, 255, 255, 0.5); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
    .gl-solid { fill: rgba(255, 255, 255, 0.42); }
    .liquid { fill: var(--liquid, #888); }
    .shine { fill: rgba(255, 255, 255, 0.3); }
    .ice { fill: rgba(255, 255, 255, 0.22); stroke: rgba(255, 255, 255, 0.4); stroke-width: 1; }
    .bubble { fill: rgba(255, 255, 255, 0.55); }
    .garnish--cherry { fill: #ff4d5e; }
    .garnish--lime { fill: #7be0ad; }
    .garnish--orange { fill: #ffae34; }
  `,
})
export class DrinkGlass {
  readonly glass = input<GlassType>('Coupe');
  readonly color = input<string>('#888');
}
