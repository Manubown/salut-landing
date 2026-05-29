import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { SubscribeService } from '../../core/api/subscribe.service';
import { AnalyticsService } from '../../core/analytics/analytics.service';

type Status = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'salut-notify-form',
  imports: [ReactiveFormsModule],
  templateUrl: './notify-form.html',
  styleUrl: './notify-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotifyForm {
  private readonly subscribeService = inject(SubscribeService);
  private readonly analytics = inject(AnalyticsService);

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  protected readonly status = signal<Status>('idle');
  protected readonly position = signal<number | null>(null);
  protected readonly errorMsg = signal('');

  submit(): void {
    if (this.status() === 'loading') {
      return;
    }
    this.email.markAsTouched();
    if (this.email.invalid) {
      return;
    }

    this.status.set('loading');
    this.errorMsg.set('');

    this.subscribeService.subscribe(this.email.value.trim()).subscribe({
      next: (res) => {
        this.position.set(res.position ?? null);
        this.status.set('success');
        this.analytics.track('waitlist-signup', {
          alreadySubscribed: res.alreadySubscribed ?? false,
        });
      },
      error: () => {
        this.errorMsg.set('Something went wrong on our end. Please try again.');
        this.status.set('error');
      },
    });
  }
}
