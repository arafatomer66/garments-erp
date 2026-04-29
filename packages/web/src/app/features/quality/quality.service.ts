import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  AqlInspection,
  CreateAqlInspectionDto,
  CreateDefectCodeDto,
  CreateEndLineQcRecordDto,
  CreateInlineQcRecordDto,
  DefectCode,
  DhuLineSummary,
  EndLineQcRecord,
  InlineQcRecord,
  UpdateAqlInspectionDto,
  UpdateDefectCodeDto,
  UpdateEndLineQcRecordDto,
  UpdateInlineQcRecordDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

export interface AqlPlanQuote {
  sampleSize: number;
  accept: number;
  reject: number;
}

@Injectable({ providedIn: 'root' })
export class QualityService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/quality`;

  listDefectCodes(): Observable<DefectCode[]> {
    return this.http.get<DefectCode[]>(`${this.base}/defect-codes`);
  }
  createDefectCode(dto: CreateDefectCodeDto): Observable<DefectCode> {
    return this.http.post<DefectCode>(`${this.base}/defect-codes`, dto);
  }
  updateDefectCode(id: string, dto: UpdateDefectCodeDto): Observable<DefectCode> {
    return this.http.patch<DefectCode>(`${this.base}/defect-codes/${id}`, dto);
  }
  deleteDefectCode(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/defect-codes/${id}`);
  }

  listInlineQc(lineId?: string, date?: string): Observable<InlineQcRecord[]> {
    let params = new HttpParams();
    if (lineId) params = params.set('lineId', lineId);
    if (date) params = params.set('date', date);
    return this.http.get<InlineQcRecord[]>(`${this.base}/inline-qc`, { params });
  }
  createInlineQc(dto: CreateInlineQcRecordDto): Observable<InlineQcRecord> {
    return this.http.post<InlineQcRecord>(`${this.base}/inline-qc`, dto);
  }
  updateInlineQc(id: string, dto: UpdateInlineQcRecordDto): Observable<InlineQcRecord> {
    return this.http.patch<InlineQcRecord>(`${this.base}/inline-qc/${id}`, dto);
  }
  deleteInlineQc(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/inline-qc/${id}`);
  }

  listEndLineQc(lineId?: string, date?: string): Observable<EndLineQcRecord[]> {
    let params = new HttpParams();
    if (lineId) params = params.set('lineId', lineId);
    if (date) params = params.set('date', date);
    return this.http.get<EndLineQcRecord[]>(`${this.base}/end-line-qc`, { params });
  }
  createEndLineQc(dto: CreateEndLineQcRecordDto): Observable<EndLineQcRecord> {
    return this.http.post<EndLineQcRecord>(`${this.base}/end-line-qc`, dto);
  }
  updateEndLineQc(id: string, dto: UpdateEndLineQcRecordDto): Observable<EndLineQcRecord> {
    return this.http.patch<EndLineQcRecord>(`${this.base}/end-line-qc/${id}`, dto);
  }
  deleteEndLineQc(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/end-line-qc/${id}`);
  }

  listAql(): Observable<AqlInspection[]> {
    return this.http.get<AqlInspection[]>(`${this.base}/aql`);
  }
  quoteAql(lotSize: number, aqlLevel = 2.5): Observable<AqlPlanQuote> {
    const params = new HttpParams()
      .set('lotSize', String(lotSize))
      .set('aqlLevel', String(aqlLevel));
    return this.http.get<AqlPlanQuote>(`${this.base}/aql/quote`, { params });
  }
  createAql(dto: CreateAqlInspectionDto): Observable<AqlInspection> {
    return this.http.post<AqlInspection>(`${this.base}/aql`, dto);
  }
  updateAql(id: string, dto: UpdateAqlInspectionDto): Observable<AqlInspection> {
    return this.http.patch<AqlInspection>(`${this.base}/aql/${id}`, dto);
  }
  deleteAql(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/aql/${id}`);
  }

  dhuBoard(date?: string): Observable<DhuLineSummary[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<DhuLineSummary[]>(`${this.base}/dhu-board`, { params });
  }
}
