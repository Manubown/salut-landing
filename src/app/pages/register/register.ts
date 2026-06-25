import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SeoService, SITE_URL } from '../../core/seo/seo.service';
import { DEFAULT_LOCALE, Locale } from '../../core/i18n/locale';
import { PreregisterService } from '../../core/api/preregister.service';
import { APP_URL } from '../../core/app-links';

type Status = 'idle' | 'loading' | 'success' | 'error';

const eaPath = (l: Locale): string => (l === 'de' ? '/early-access' : '/en/early-access');

interface Copy {
  seoTitle: string; seoDescription: string;
  title: string; sub: string;
  name: string; username: string; email: string; age: string;
  consentPre: string; consentLink: string; consentPost: string;
  submit: string; sending: string;
  success: string; error: string; invalid: string;
  back: string; haveInvite: string; openApp: string;
}

const COPY: Record<Locale, Copy> = {
  de: {
    seoTitle: 'Early Access — Salut',
    seoDescription: 'Sichere dir frühen Zugang zur Salut-Alpha. Trag dich vor — wir laden dich per E-Mail ein.',
    title: 'Early Access sichern',
    sub: 'Salut ist gerade in einer geschlossenen Alpha. Trag dich vor — wir laden dich ein, sobald wir bereit sind.',
    name: 'Name', username: 'Benutzername', email: 'E-Mail', age: 'Alter',
    consentPre: 'Ich bin 18 oder älter und akzeptiere die ',
    consentLink: 'Datenschutzerklärung',
    consentPost: '.',
    submit: 'Vormerken', sending: 'Wird gesendet…',
    success: 'Danke! Du stehst auf der Liste — wir melden uns per E-Mail.',
    error: 'Etwas ist schiefgelaufen. Bitte versuch es erneut.',
    invalid: 'Bitte fülle alle Felder korrekt aus (Mindestalter 18).',
    back: '← Zur Startseite',
    haveInvite: 'Schon eingeladen?', openApp: 'App öffnen',
  },
  en: {
    seoTitle: 'Early access — Salut',
    seoDescription: 'Get early access to the Salut alpha. Pre-register and we’ll invite you by email.',
    title: 'Get early access',
    sub: 'Salut is in a closed alpha right now. Pre-register and we’ll invite you as soon as we’re ready.',
    name: 'Name', username: 'Username', email: 'Email', age: 'Age',
    consentPre: 'I am 18 or older and accept the ',
    consentLink: 'privacy policy',
    consentPost: '.',
    submit: 'Pre-register', sending: 'Sending…',
    success: 'Thanks! You’re on the list — we’ll reach out by email.',
    error: 'Something went wrong. Please try again.',
    invalid: 'Please fill in every field correctly (must be 18+).',
    back: '← Back to home',
    haveInvite: 'Already invited?', openApp: 'Open the app',
  },
};

@Component({
  selector: 'salut-register',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; min-height: 100vh;
      background:
        radial-gradient(120% 80% at 50% -10%, #2a1a55 0%, transparent 58%),
        linear-gradient(180deg, #160d28, #0b0714);
      color: #fff; font-family: inherit; }
    .ea { max-width: 520px; margin: 0 auto; padding: 40px 22px 72px; }
    .ea__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
    .ea__brand { display: flex; align-items: center; gap: 9px; font-weight: 800; color: #fff; text-decoration: none; }
    .ea__mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
      background: linear-gradient(145deg, #8b6bff, #3a1f86); font-weight: 800; }
    .ea__lang { color: #c9c0e0; text-decoration: none; font-weight: 800; font-size: 13px;
      border: 1px solid rgba(255,255,255,.16); border-radius: 999px; padding: 5px 12px; }

    h1 { font-size: 34px; font-weight: 800; line-height: 1.1; margin: 6px 0 10px; letter-spacing: -.5px; }
    .ea__sub { color: #c9c0e0; font-size: 16px; line-height: 1.55; margin: 0 0 26px; }

    .ea__card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1);
      border-radius: 20px; padding: 22px; }
    .ea__field { margin-bottom: 14px; }
    label { display: block; font-size: 12.5px; font-weight: 700; color: #8b8398;
      text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
    input[type=text], input[type=email], input[type=number] {
      width: 100%; box-sizing: border-box; background: rgba(0,0,0,.25);
      border: 1px solid rgba(255,255,255,.14); border-radius: 12px; padding: 13px 15px;
      color: #fff; font-size: 15px; font-family: inherit; outline: none; transition: border-color .15s, box-shadow .15s; }
    input::placeholder { color: #6f6880; }
    input:focus { border-color: rgba(124,92,255,.6); box-shadow: 0 0 0 3px rgba(124,92,255,.12); }
    input.bad { border-color: rgba(255,111,94,.55); }

    .ea__consent { display: flex; gap: 10px; align-items: flex-start; margin: 6px 0 18px; font-size: 13.5px; color: #c9c0e0; line-height: 1.5; }
    .ea__consent input { margin-top: 2px; width: 18px; height: 18px; accent-color: #7C5CFF; flex-shrink: 0; }
    .ea__consent a { color: #b9a3ff; }

    button[type=submit] { width: 100%; border: none; background: #7C5CFF; color: #fff; font-family: inherit;
      font-weight: 800; font-size: 16px; padding: 15px; border-radius: 13px; cursor: pointer; transition: filter .15s, transform .14s; }
    button[type=submit]:hover:not(:disabled) { filter: brightness(1.07); }
    button[type=submit]:active:not(:disabled) { transform: scale(.99); }
    button[type=submit]:disabled { opacity: .55; cursor: not-allowed; }

    .ea__msg { margin-top: 14px; font-size: 14px; border-radius: 12px; padding: 12px 14px; line-height: 1.5; }
    .ea__msg.err { background: rgba(255,111,94,.1); border: 1px solid rgba(255,111,94,.25); color: #ff9985; }
    .ea__ok { text-align: center; padding: 18px 6px; }
    .ea__ok-i { font-size: 42px; margin-bottom: 8px; }
    .ea__ok p { color: #4dd6a8; font-size: 16px; font-weight: 700; margin: 0; }

    .ea__foot { margin-top: 24px; display: flex; align-items: center; justify-content: space-between; font-size: 14px; }
    .ea__foot a { color: #b9a3ff; text-decoration: none; font-weight: 700; }
    .ea__invite { color: #8b8398; }
    .ea__invite a { margin-left: 6px; }
  `],
  template: `
    <div class="ea">
      <div class="ea__top">
        <a class="ea__brand" [routerLink]="homeHref"><span class="ea__mark">S</span> Salut</a>
        <a class="ea__lang" [routerLink]="otherPath">{{ otherLocale.toUpperCase() }}</a>
      </div>

      <h1>{{ c.title }}</h1>
      <p class="ea__sub">{{ c.sub }}</p>

      <div class="ea__card">
        @if (status() === 'success') {
          <div class="ea__ok">
            <div class="ea__ok-i">🎉</div>
            <p>{{ c.success }}</p>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="ea__field">
              <label for="ea-name">{{ c.name }}</label>
              <input id="ea-name" type="text" formControlName="name" autocomplete="name"
                     [class.bad]="invalid('name')" />
            </div>
            <div class="ea__field">
              <label for="ea-username">{{ c.username }}</label>
              <input id="ea-username" type="text" formControlName="username" autocomplete="nickname"
                     [class.bad]="invalid('username')" />
            </div>
            <div class="ea__field">
              <label for="ea-email">{{ c.email }}</label>
              <input id="ea-email" type="email" formControlName="email" autocomplete="email"
                     [class.bad]="invalid('email')" />
            </div>
            <div class="ea__field">
              <label for="ea-age">{{ c.age }}</label>
              <input id="ea-age" type="number" formControlName="age" inputmode="numeric" min="18" max="120"
                     [class.bad]="invalid('age')" />
            </div>

            <label class="ea__consent">
              <input type="checkbox" formControlName="consent" />
              <span>{{ c.consentPre }}<a [routerLink]="privacyHref">{{ c.consentLink }}</a>{{ c.consentPost }}</span>
            </label>

            <button type="submit" [disabled]="status() === 'loading'">
              {{ status() === 'loading' ? c.sending : c.submit }}
            </button>

            @if (showInvalid()) { <div class="ea__msg err">{{ c.invalid }}</div> }
            @if (status() === 'error') { <div class="ea__msg err">{{ c.error }}</div> }
          </form>
        }
      </div>

      <div class="ea__foot">
        <a [routerLink]="homeHref">{{ c.back }}</a>
        <span class="ea__invite">{{ c.haveInvite }}<a [href]="appUrl">{{ c.openApp }}</a></span>
      </div>
    </div>
  `,
})
export class Register implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly prereg = inject(PreregisterService);

  protected readonly locale: Locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];
  protected readonly otherLocale: Locale = this.locale === 'de' ? 'en' : 'de';
  protected readonly otherPath = eaPath(this.otherLocale);
  protected readonly homeHref = this.locale === 'de' ? '/' : '/en';
  protected readonly privacyHref = '/datenschutz';
  protected readonly appUrl = APP_URL;

  protected readonly status = signal<Status>('idle');
  protected readonly showInvalid = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    username: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(40)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    age: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(18), Validators.max(120)] }),
    consent: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  ngOnInit(): void {
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path: eaPath(this.locale),
      locale: this.locale,
      alternates: [
        { hreflang: 'de', href: `${SITE_URL}/early-access` },
        { hreflang: 'en', href: `${SITE_URL}/en/early-access` },
        { hreflang: 'x-default', href: `${SITE_URL}/en/early-access` },
      ],
    });
  }

  protected invalid(name: string): boolean {
    const ctrl = this.form.get(name);
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.showInvalid());
  }

  protected submit(): void {
    if (this.status() === 'loading') return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showInvalid.set(true);
      return;
    }
    this.showInvalid.set(false);
    this.status.set('loading');

    const v = this.form.getRawValue();
    this.prereg.submit({
      name: v.name.trim(),
      username: v.username.trim(),
      email: v.email.trim(),
      age: Number(v.age),
    }).subscribe({
      next: () => this.status.set('success'),
      error: () => this.status.set('error'),
    });
  }
}
