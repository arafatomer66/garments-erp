import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  BomLine,
  CostingSheet,
  CreateBomLineDto,
  UpdateBomLineDto,
  UpsertCostingSheetDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BomService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/bom`;

  listLines(styleId: string): Observable<BomLine[]> {
    return this.http.get<BomLine[]>(`${this.base}/lines`, {
      params: new HttpParams().set('styleId', styleId),
    });
  }
  createLine(dto: CreateBomLineDto): Observable<BomLine> {
    return this.http.post<BomLine>(`${this.base}/lines`, dto);
  }
  updateLine(id: string, dto: UpdateBomLineDto): Observable<BomLine> {
    return this.http.patch<BomLine>(`${this.base}/lines/${id}`, dto);
  }
  deleteLine(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/lines/${id}`);
  }
  getCosting(styleId: string): Observable<CostingSheet> {
    return this.http.get<CostingSheet>(`${this.base}/costing/${styleId}`);
  }
  upsertCosting(dto: UpsertCostingSheetDto): Observable<CostingSheet> {
    return this.http.post<CostingSheet>(`${this.base}/costing`, dto);
  }
}
