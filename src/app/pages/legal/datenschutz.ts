import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'salut-datenschutz',
  imports: [RouterLink],
  templateUrl: './datenschutz.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Datenschutz implements OnInit {
  private readonly seo = inject(SeoService);
  protected readonly stand = '29.05.2026';

  ngOnInit(): void {
    this.seo.apply({
      title: 'Datenschutzerklärung — Salut',
      description:
        'Datenschutzerklärung gemäß DSGVO und österreichischem Datenschutzgesetz (DSG).',
      path: '/datenschutz',
      robots: 'noindex, follow',
    });
  }
}
