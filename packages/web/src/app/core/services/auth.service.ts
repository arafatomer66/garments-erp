import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import type {
  AuthSession,
  AuthTokens,
  LoginDto,
  SignupDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'garments_erp_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _session = signal<AuthSession | null>(this.loadFromStorage());

  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly accessToken = computed(() => this._session()?.tokens.accessToken ?? null);
  readonly currentTenant = computed(() => this._session()?.tenant ?? null);
  readonly currentUser = computed(() => this._session()?.user ?? null);

  signup(dto: SignupDto): Observable<AuthSession> {
    return this.http
      .post<AuthSession>(`${environment.apiBaseUrl}/auth/signup`, dto)
      .pipe(tap((session) => this.setSession(session)));
  }

  login(dto: LoginDto): Observable<AuthSession> {
    return this.http
      .post<AuthSession>(`${environment.apiBaseUrl}/auth/login`, dto)
      .pipe(tap((session) => this.setSession(session)));
  }

  refresh(): Observable<AuthTokens> {
    const refreshToken = this._session()?.tokens.refreshToken;
    return this.http
      .post<AuthTokens>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((tokens) => {
          const current = this._session();
          if (current) {
            this.setSession({ ...current, tokens });
          }
        }),
      );
  }

  logout(): void {
    this._session.set(null);
    localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/auth/login']);
  }

  private setSession(session: AuthSession): void {
    this._session.set(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private loadFromStorage(): AuthSession | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }
}
