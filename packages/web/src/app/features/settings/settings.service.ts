import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CreateTenantUserDto,
  Tenant,
  TenantUser,
  UpdateTenantSettingsDto,
  UpdateTenantUserDto,
  UserRole,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/iam`;

  getTenant(): Observable<Tenant> { return this.http.get<Tenant>(`${this.base}/tenant`); }
  updateTenant(dto: UpdateTenantSettingsDto): Observable<Tenant> { return this.http.patch<Tenant>(`${this.base}/tenant`, dto); }

  listRoles(): Observable<UserRole[]> { return this.http.get<UserRole[]>(`${this.base}/roles`); }

  listUsers(): Observable<TenantUser[]> { return this.http.get<TenantUser[]>(`${this.base}/users`); }
  createUser(dto: CreateTenantUserDto): Observable<TenantUser> { return this.http.post<TenantUser>(`${this.base}/users`, dto); }
  updateUser(id: string, dto: UpdateTenantUserDto): Observable<TenantUser> { return this.http.patch<TenantUser>(`${this.base}/users/${id}`, dto); }
  deleteUser(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/users/${id}`); }
}
