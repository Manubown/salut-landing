import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'salut-impressum',
  imports: [RouterLink],
  templateUrl: './impressum.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Impressum implements OnInit {
  private readonly seo = inject(SeoService);
  protected readonly stand = '28.05.2026';

  ngOnInit(): void {
    this.seo.apply({
      title: 'Impressum — Salut',
      description: 'Impressum und Offenlegung gemäß § 5 ECG, § 14 UGB und § 25 MedienG.',
      path: '/impressum',
      robots: 'noindex, follow',
    });
  }
}
