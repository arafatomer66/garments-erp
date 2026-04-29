import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AnalyticsOverview } from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/analytics`;

  getOverview(): Observable<AnalyticsOverview> {
    return this.http.get<AnalyticsOverview>(`${this.base}/overview`);
  }
}
