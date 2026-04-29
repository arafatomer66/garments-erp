import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  BuyerPortalSummary,
  BuyerPortalUser,
  CreateBuyerPortalUserDto,
  UpdateBuyerPortalUserDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BuyerPortalApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/buyer-portal`;

  getSummary(): Observable<BuyerPortalSummary> {
    return this.http.get<BuyerPortalSummary>(`${this.base}/summary`);
  }

  listUsers(): Observable<BuyerPortalUser[]> {
    return this.http.get<BuyerPortalUser[]>(`${this.base}/users`);
  }
  createUser(dto: CreateBuyerPortalUserDto) {
    return this.http.post<BuyerPortalUser>(`${this.base}/users`, dto);
  }
  updateUser(id: string, dto: UpdateBuyerPortalUserDto) {
    return this.http.patch<BuyerPortalUser>(`${this.base}/users/${id}`, dto);
  }
  deleteUser(id: string) {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }
  resendInvite(id: string) {
    return this.http.post<BuyerPortalUser>(`${this.base}/users/${id}/resend-invite`, {});
  }
}
