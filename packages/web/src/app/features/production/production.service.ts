import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  Bundle,
  CreateBundleDto,
  CreateCuttingPlanDto,
  CreateLineAssignmentDto,
  CreateSewingLineDto,
  CuttingPlan,
  HourlyBoardLineSummary,
  HourlyProductionLog,
  LineAssignment,
  ScanBundleDto,
  SewingLine,
  UpdateBundleDto,
  UpdateCuttingPlanDto,
  UpdateLineAssignmentDto,
  UpdateSewingLineDto,
  UpsertHourlyLogDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/production`;

  listPlans(): Observable<CuttingPlan[]> {
    return this.http.get<CuttingPlan[]>(`${this.base}/plans`);
  }
  createPlan(dto: CreateCuttingPlanDto): Observable<CuttingPlan> {
    return this.http.post<CuttingPlan>(`${this.base}/plans`, dto);
  }
  updatePlan(id: string, dto: UpdateCuttingPlanDto): Observable<CuttingPlan> {
    return this.http.patch<CuttingPlan>(`${this.base}/plans/${id}`, dto);
  }
  deletePlan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/plans/${id}`);
  }

  listLines(): Observable<SewingLine[]> {
    return this.http.get<SewingLine[]>(`${this.base}/lines`);
  }
  createLine(dto: CreateSewingLineDto): Observable<SewingLine> {
    return this.http.post<SewingLine>(`${this.base}/lines`, dto);
  }
  updateLine(id: string, dto: UpdateSewingLineDto): Observable<SewingLine> {
    return this.http.patch<SewingLine>(`${this.base}/lines/${id}`, dto);
  }
  deleteLine(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/lines/${id}`);
  }

  listAssignments(): Observable<LineAssignment[]> {
    return this.http.get<LineAssignment[]>(`${this.base}/assignments`);
  }
  createAssignment(dto: CreateLineAssignmentDto): Observable<LineAssignment> {
    return this.http.post<LineAssignment>(`${this.base}/assignments`, dto);
  }
  updateAssignment(id: string, dto: UpdateLineAssignmentDto): Observable<LineAssignment> {
    return this.http.patch<LineAssignment>(`${this.base}/assignments/${id}`, dto);
  }
  deleteAssignment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/assignments/${id}`);
  }

  listBundles(planId?: string): Observable<Bundle[]> {
    const url = planId
      ? `${this.base}/bundles?planId=${encodeURIComponent(planId)}`
      : `${this.base}/bundles`;
    return this.http.get<Bundle[]>(url);
  }
  createBundle(dto: CreateBundleDto): Observable<Bundle> {
    return this.http.post<Bundle>(`${this.base}/bundles`, dto);
  }
  updateBundle(id: string, dto: UpdateBundleDto): Observable<Bundle> {
    return this.http.patch<Bundle>(`${this.base}/bundles/${id}`, dto);
  }
  deleteBundle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/bundles/${id}`);
  }
  scanBundle(dto: ScanBundleDto): Observable<Bundle> {
    return this.http.post<Bundle>(`${this.base}/bundles/scan`, dto);
  }

  hourlyBoard(date?: string): Observable<HourlyBoardLineSummary[]> {
    const url = date
      ? `${this.base}/hourly-board?date=${encodeURIComponent(date)}`
      : `${this.base}/hourly-board`;
    return this.http.get<HourlyBoardLineSummary[]>(url);
  }
  upsertLog(dto: UpsertHourlyLogDto): Observable<HourlyProductionLog> {
    return this.http.post<HourlyProductionLog>(`${this.base}/hourly-logs`, dto);
  }
}
