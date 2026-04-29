import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    MessageModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <p-card styleClass="w-full max-w-md">
        <ng-template pTemplate="header">
          <div class="px-6 pt-6">
            <h1 class="text-2xl font-semibold text-slate-900">Create your factory account</h1>
            <p class="mt-1 text-sm text-slate-600">Sets up your tenant + owner login</p>
          </div>
        </ng-template>
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-700">Factory name</label>
            <input pInputText formControlName="tenantName" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-700">Workspace slug (URL-friendly)</label>
            <input pInputText formControlName="tenantSlug" placeholder="acme-textiles" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-700">Your name</label>
            <input pInputText formControlName="ownerFullName" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-700">Email</label>
            <input pInputText type="email" formControlName="ownerEmail" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-700">Password (min 10 chars)</label>
            <p-password
              formControlName="ownerPassword"
              [toggleMask]="true"
              styleClass="w-full"
              [inputStyle]="{ width: '100%' }"
            />
          </div>
          <p-message *ngIf="error()" severity="error" [text]="error()!" />
          <p-button
            type="submit"
            label="Create account"
            styleClass="w-full"
            [loading]="loading()"
            [disabled]="form.invalid || loading()"
          />
        </form>
        <div class="mt-4 text-center text-sm text-slate-600">
          Already have an account? <a routerLink="/auth/login" class="text-brand-600 hover:underline">Sign in</a>
        </div>
      </p-card>
    </div>
  `,
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    tenantName: ['', [Validators.required, Validators.minLength(2)]],
    tenantSlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    ownerFullName: ['', [Validators.required, Validators.minLength(2)]],
    ownerEmail: ['', [Validators.required, Validators.email]],
    ownerPassword: ['', [Validators.required, Validators.minLength(10)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.signup(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Signup failed');
      },
    });
  }
}
