import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ForecastingOverview } from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ForecastingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/forecasting`;

  getOverview(): Observable<ForecastingOverview> {
    return this.http.get<ForecastingOverview>(`${this.base}/overview`);
  }
}
