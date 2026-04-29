import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CreateStyleDto,
  CreateTaTaskDto,
  CreateTechPackDto,
  Style,
  TaTask,
  TechPack,
  UpdateStyleDto,
  UpdateTaTaskDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MerchandisingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/merchandising`;

  listStyles(buyerId?: string): Observable<Style[]> {
    let params = new HttpParams();
    if (buyerId) params = params.set('buyerId', buyerId);
    return this.http.get<Style[]>(`${this.base}/styles`, { params });
  }
  createStyle(dto: CreateStyleDto): Observable<Style> {
    return this.http.post<Style>(`${this.base}/styles`, dto);
  }
  updateStyle(id: string, dto: UpdateStyleDto): Observable<Style> {
    return this.http.patch<Style>(`${this.base}/styles/${id}`, dto);
  }
  deleteStyle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/styles/${id}`);
  }

  listTechPacks(styleId: string): Observable<TechPack[]> {
    return this.http.get<TechPack[]>(`${this.base}/tech-packs`, {
      params: new HttpParams().set('styleId', styleId),
    });
  }
  createTechPack(dto: CreateTechPackDto): Observable<TechPack> {
    return this.http.post<TechPack>(`${this.base}/tech-packs`, dto);
  }
  deleteTechPack(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/tech-packs/${id}`);
  }

  listTaTasks(styleId: string): Observable<TaTask[]> {
    return this.http.get<TaTask[]>(`${this.base}/ta-tasks`, {
      params: new HttpParams().set('styleId', styleId),
    });
  }
  createTaTask(dto: CreateTaTaskDto): Observable<TaTask> {
    return this.http.post<TaTask>(`${this.base}/ta-tasks`, dto);
  }
  updateTaTask(id: string, dto: UpdateTaTaskDto): Observable<TaTask> {
    return this.http.patch<TaTask>(`${this.base}/ta-tasks/${id}`, dto);
  }
  deleteTaTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/ta-tasks/${id}`);
  }
}
