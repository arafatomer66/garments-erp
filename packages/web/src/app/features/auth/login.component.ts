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
  selector: 'app-login',
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
            <h1 class="text-2xl font-semibold text-slate-900">Sign in</h1>
            <p class="mt-1 text-sm text-slate-600">Garments ERP — multi-tenant SaaS</p>
          </div>
        </ng-template>
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div class="flex flex-col gap-1">
            <label for="email" class="text-sm font-medium text-slate-700">Email</label>
            <input pInputText id="email" type="email" formControlName="email" autocomplete="email" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="password" class="text-sm font-medium text-slate-700">Password</label>
            <p-password
              inputId="password"
              formControlName="password"
              [toggleMask]="true"
              [feedback]="false"
              styleClass="w-full"
              [inputStyle]="{ width: '100%' }"
            />
          </div>
          <p-message *ngIf="error()" severity="error" [text]="error()!" />
          <p-button
            type="submit"
            label="Sign in"
            styleClass="w-full"
            [loading]="loading()"
            [disabled]="form.invalid || loading()"
          />
        </form>
        <div class="mt-4 text-center text-sm text-slate-600">
          New factory? <a routerLink="/auth/signup" class="text-brand-600 hover:underline">Create an account</a>
        </div>
      </p-card>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Login failed');
      },
    });
  }
}
