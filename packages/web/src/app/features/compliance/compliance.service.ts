import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  ComplianceAudit,
  ComplianceDocument,
  ComplianceFinding,
  ComplianceStandard,
  ComplianceSummary,
  CreateComplianceAuditDto,
  CreateComplianceDocumentDto,
  CreateComplianceFindingDto,
  CreateComplianceStandardDto,
  UpdateComplianceAuditDto,
  UpdateComplianceDocumentDto,
  UpdateComplianceFindingDto,
  UpdateComplianceStandardDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ComplianceApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/compliance`;

  getSummary(): Observable<ComplianceSummary> {
    return this.http.get<ComplianceSummary>(`${this.base}/summary`);
  }

  // Standards
  listStandards(): Observable<ComplianceStandard[]> {
    return this.http.get<ComplianceStandard[]>(`${this.base}/standards`);
  }
  createStandard(dto: CreateComplianceStandardDto) {
    return this.http.post<ComplianceStandard>(`${this.base}/standards`, dto);
  }
  updateStandard(id: string, dto: UpdateComplianceStandardDto) {
    return this.http.patch<ComplianceStandard>(`${this.base}/standards/${id}`, dto);
  }
  deleteStandard(id: string) {
    return this.http.delete<void>(`${this.base}/standards/${id}`);
  }

  // Audits
  listAudits(): Observable<ComplianceAudit[]> {
    return this.http.get<ComplianceAudit[]>(`${this.base}/audits`);
  }
  createAudit(dto: CreateComplianceAuditDto) {
    return this.http.post<ComplianceAudit>(`${this.base}/audits`, dto);
  }
  updateAudit(id: string, dto: UpdateComplianceAuditDto) {
    return this.http.patch<ComplianceAudit>(`${this.base}/audits/${id}`, dto);
  }
  deleteAudit(id: string) {
    return this.http.delete<void>(`${this.base}/audits/${id}`);
  }

  // Documents
  listDocuments(): Observable<ComplianceDocument[]> {
    return this.http.get<ComplianceDocument[]>(`${this.base}/documents`);
  }
  createDocument(dto: CreateComplianceDocumentDto) {
    return this.http.post<ComplianceDocument>(`${this.base}/documents`, dto);
  }
  updateDocument(id: string, dto: UpdateComplianceDocumentDto) {
    return this.http.patch<ComplianceDocument>(`${this.base}/documents/${id}`, dto);
  }
  deleteDocument(id: string) {
    return this.http.delete<void>(`${this.base}/documents/${id}`);
  }

  // Findings
  listFindings(): Observable<ComplianceFinding[]> {
    return this.http.get<ComplianceFinding[]>(`${this.base}/findings`);
  }
  createFinding(dto: CreateComplianceFindingDto) {
    return this.http.post<ComplianceFinding>(`${this.base}/findings`, dto);
  }
  updateFinding(id: string, dto: UpdateComplianceFindingDto) {
    return this.http.patch<ComplianceFinding>(`${this.base}/findings/${id}`, dto);
  }
  deleteFinding(id: string) {
    return this.http.delete<void>(`${this.base}/findings/${id}`);
  }
}
