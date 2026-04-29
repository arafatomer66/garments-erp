import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ComplianceAudit,
  ComplianceDocument,
  ComplianceFinding,
  ComplianceStandard,
  ComplianceSummary,
} from '@org/shared-types';
import { TenantRepository } from '../../core/database/tenant-repository';
import { camelize } from '../masters/sql.util';
import {
  CreateComplianceStandardDto,
  UpdateComplianceStandardDto,
} from './dto/standard.dto';
import {
  CreateComplianceAuditDto,
  UpdateComplianceAuditDto,
} from './dto/audit.dto';
import {
  CreateComplianceDocumentDto,
  UpdateComplianceDocumentDto,
} from './dto/document.dto';
import {
  CreateComplianceFindingDto,
  UpdateComplianceFindingDto,
} from './dto/finding.dto';

@Injectable()
export class ComplianceService extends TenantRepository {
  // ============= Standards =============

  async listStandards(): Promise<ComplianceStandard[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM compliance_standards ORDER BY code`,
    );
    return rows.map((r) => camelize(r) as unknown as ComplianceStandard);
  }

  async createStandard(dto: CreateComplianceStandardDto): Promise<ComplianceStandard> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO compliance_standards (code, name, category, issuing_body, description, is_active)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, TRUE))
       RETURNING id`,
      [dto.code, dto.name, dto.category, dto.issuingBody ?? null, dto.description ?? null, dto.isActive ?? null],
    );
    return this.findStandard(rows[0].id);
  }

  async findStandard(id: string): Promise<ComplianceStandard> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM compliance_standards WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Standard ${id} not found`);
    return camelize(rows[0]) as unknown as ComplianceStandard;
  }

  async updateStandard(id: string, dto: UpdateComplianceStandardDto): Promise<ComplianceStandard> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown) => {
      vals.push(val);
      sets.push(`${col} = $${vals.length}`);
    };
    if (dto.code !== undefined) push('code', dto.code);
    if (dto.name !== undefined) push('name', dto.name);
    if (dto.category !== undefined) push('category', dto.category);
    if (dto.issuingBody !== undefined) push('issuing_body', dto.issuingBody);
    if (dto.description !== undefined) push('description', dto.description);
    if (dto.isActive !== undefined) push('is_active', dto.isActive);
    if (sets.length === 0) return this.findStandard(id);
    vals.push(id);
    await this.exec(
      `UPDATE compliance_standards SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    return this.findStandard(id);
  }

  async deleteStandard(id: string): Promise<void> {
    await this.exec(`DELETE FROM compliance_standards WHERE id = $1::uuid`, [id]);
  }

  // ============= Audits =============

  async listAudits(): Promise<ComplianceAudit[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT a.*, s.code AS standard_code, s.name AS standard_name,
              CASE WHEN a.valid_until IS NOT NULL
                   THEN (a.valid_until - CURRENT_DATE)
                   ELSE NULL END AS days_to_expiry
         FROM compliance_audits a
         LEFT JOIN compliance_standards s ON s.id = a.standard_id
        ORDER BY a.audit_date DESC`,
    );
    return rows.map((r) => camelize(r) as unknown as ComplianceAudit);
  }

  async createAudit(dto: CreateComplianceAuditDto): Promise<ComplianceAudit> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO compliance_audits
        (audit_number, standard_id, audit_type, auditor_name, audit_firm,
         audit_date, valid_until, status, rating, score, summary, next_audit_due)
       VALUES ($1, $2::uuid, $3, $4, $5, $6::date, $7::date,
               COALESCE($8, 'scheduled'), $9, $10, $11, $12::date)
       RETURNING id`,
      [
        dto.auditNumber,
        dto.standardId,
        dto.auditType,
        dto.auditorName ?? null,
        dto.auditFirm ?? null,
        dto.auditDate,
        dto.validUntil ?? null,
        dto.status ?? null,
        dto.rating ?? null,
        dto.score ?? null,
        dto.summary ?? null,
        dto.nextAuditDue ?? null,
      ],
    );
    return this.findAudit(rows[0].id);
  }

  async findAudit(id: string): Promise<ComplianceAudit> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT a.*, s.code AS standard_code, s.name AS standard_name,
              CASE WHEN a.valid_until IS NOT NULL
                   THEN (a.valid_until - CURRENT_DATE)
                   ELSE NULL END AS days_to_expiry
         FROM compliance_audits a
         LEFT JOIN compliance_standards s ON s.id = a.standard_id
        WHERE a.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Audit ${id} not found`);
    return camelize(rows[0]) as unknown as ComplianceAudit;
  }

  async updateAudit(id: string, dto: UpdateComplianceAuditDto): Promise<ComplianceAudit> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.auditNumber !== undefined) push('audit_number', dto.auditNumber);
    if (dto.standardId !== undefined) push('standard_id', dto.standardId, 'uuid');
    if (dto.auditType !== undefined) push('audit_type', dto.auditType);
    if (dto.auditorName !== undefined) push('auditor_name', dto.auditorName);
    if (dto.auditFirm !== undefined) push('audit_firm', dto.auditFirm);
    if (dto.auditDate !== undefined) push('audit_date', dto.auditDate, 'date');
    if (dto.validUntil !== undefined) push('valid_until', dto.validUntil, 'date');
    if (dto.status !== undefined) push('status', dto.status);
    if (dto.rating !== undefined) push('rating', dto.rating);
    if (dto.score !== undefined) push('score', dto.score);
    if (dto.summary !== undefined) push('summary', dto.summary);
    if (dto.nextAuditDue !== undefined) push('next_audit_due', dto.nextAuditDue, 'date');
    if (sets.length === 0) return this.findAudit(id);
    vals.push(id);
    await this.exec(
      `UPDATE compliance_audits SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    return this.findAudit(id);
  }

  async deleteAudit(id: string): Promise<void> {
    await this.exec(`DELETE FROM compliance_audits WHERE id = $1::uuid`, [id]);
  }

  // ============= Documents =============

  async listDocuments(): Promise<ComplianceDocument[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT d.*, s.code AS standard_code, a.audit_number AS audit_number,
              CASE WHEN d.expiry_date IS NOT NULL
                   THEN (d.expiry_date - CURRENT_DATE)
                   ELSE NULL END AS days_to_expiry
         FROM compliance_documents d
         LEFT JOIN compliance_standards s ON s.id = d.standard_id
         LEFT JOIN compliance_audits a ON a.id = d.audit_id
        ORDER BY d.created_at DESC`,
    );
    return rows.map((r) => camelize(r) as unknown as ComplianceDocument);
  }

  async createDocument(dto: CreateComplianceDocumentDto): Promise<ComplianceDocument> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO compliance_documents
        (document_number, standard_id, audit_id, title, document_type,
         issued_date, expiry_date, file_url, file_size_bytes, mime_type, notes, is_archived)
       VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6::date, $7::date, $8, $9, $10, $11, COALESCE($12, FALSE))
       RETURNING id`,
      [
        dto.documentNumber,
        dto.standardId ?? null,
        dto.auditId ?? null,
        dto.title,
        dto.documentType,
        dto.issuedDate ?? null,
        dto.expiryDate ?? null,
        dto.fileUrl ?? null,
        dto.fileSizeBytes ?? null,
        dto.mimeType ?? null,
        dto.notes ?? null,
        dto.isArchived ?? null,
      ],
    );
    return this.findDocument(rows[0].id);
  }

  async findDocument(id: string): Promise<ComplianceDocument> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT d.*, s.code AS standard_code, a.audit_number AS audit_number,
              CASE WHEN d.expiry_date IS NOT NULL
                   THEN (d.expiry_date - CURRENT_DATE)
                   ELSE NULL END AS days_to_expiry
         FROM compliance_documents d
         LEFT JOIN compliance_standards s ON s.id = d.standard_id
         LEFT JOIN compliance_audits a ON a.id = d.audit_id
        WHERE d.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Document ${id} not found`);
    return camelize(rows[0]) as unknown as ComplianceDocument;
  }

  async updateDocument(id: string, dto: UpdateComplianceDocumentDto): Promise<ComplianceDocument> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.documentNumber !== undefined) push('document_number', dto.documentNumber);
    if (dto.standardId !== undefined) push('standard_id', dto.standardId, 'uuid');
    if (dto.auditId !== undefined) push('audit_id', dto.auditId, 'uuid');
    if (dto.title !== undefined) push('title', dto.title);
    if (dto.documentType !== undefined) push('document_type', dto.documentType);
    if (dto.issuedDate !== undefined) push('issued_date', dto.issuedDate, 'date');
    if (dto.expiryDate !== undefined) push('expiry_date', dto.expiryDate, 'date');
    if (dto.fileUrl !== undefined) push('file_url', dto.fileUrl);
    if (dto.fileSizeBytes !== undefined) push('file_size_bytes', dto.fileSizeBytes);
    if (dto.mimeType !== undefined) push('mime_type', dto.mimeType);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (dto.isArchived !== undefined) push('is_archived', dto.isArchived);
    if (sets.length === 0) return this.findDocument(id);
    vals.push(id);
    await this.exec(
      `UPDATE compliance_documents SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    return this.findDocument(id);
  }

  async deleteDocument(id: string): Promise<void> {
    await this.exec(`DELETE FROM compliance_documents WHERE id = $1::uuid`, [id]);
  }

  // ============= Findings =============

  async listFindings(): Promise<ComplianceFinding[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT f.*, a.audit_number AS audit_number
         FROM compliance_findings f
         LEFT JOIN compliance_audits a ON a.id = f.audit_id
        ORDER BY
          CASE f.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'overdue' THEN 0 ELSE 9 END,
          CASE f.severity WHEN 'critical' THEN 0 WHEN 'major' THEN 1 WHEN 'minor' THEN 2 ELSE 3 END,
          f.target_close_date NULLS LAST`,
    );
    return rows.map((r) => camelize(r) as unknown as ComplianceFinding);
  }

  async createFinding(dto: CreateComplianceFindingDto): Promise<ComplianceFinding> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO compliance_findings
        (finding_number, audit_id, severity, category, description,
         root_cause, corrective_action, responsible_person,
         target_close_date, actual_close_date, status, evidence_url)
       VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8,
               $9::date, $10::date, COALESCE($11, 'open'), $12)
       RETURNING id`,
      [
        dto.findingNumber,
        dto.auditId,
        dto.severity,
        dto.category ?? null,
        dto.description,
        dto.rootCause ?? null,
        dto.correctiveAction ?? null,
        dto.responsiblePerson ?? null,
        dto.targetCloseDate ?? null,
        dto.actualCloseDate ?? null,
        dto.status ?? null,
        dto.evidenceUrl ?? null,
      ],
    );
    return this.findFinding(rows[0].id);
  }

  async findFinding(id: string): Promise<ComplianceFinding> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT f.*, a.audit_number AS audit_number
         FROM compliance_findings f
         LEFT JOIN compliance_audits a ON a.id = f.audit_id
        WHERE f.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Finding ${id} not found`);
    return camelize(rows[0]) as unknown as ComplianceFinding;
  }

  async updateFinding(id: string, dto: UpdateComplianceFindingDto): Promise<ComplianceFinding> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.findingNumber !== undefined) push('finding_number', dto.findingNumber);
    if (dto.auditId !== undefined) push('audit_id', dto.auditId, 'uuid');
    if (dto.severity !== undefined) push('severity', dto.severity);
    if (dto.category !== undefined) push('category', dto.category);
    if (dto.description !== undefined) push('description', dto.description);
    if (dto.rootCause !== undefined) push('root_cause', dto.rootCause);
    if (dto.correctiveAction !== undefined) push('corrective_action', dto.correctiveAction);
    if (dto.responsiblePerson !== undefined) push('responsible_person', dto.responsiblePerson);
    if (dto.targetCloseDate !== undefined) push('target_close_date', dto.targetCloseDate, 'date');
    if (dto.actualCloseDate !== undefined) push('actual_close_date', dto.actualCloseDate, 'date');
    if (dto.status !== undefined) push('status', dto.status);
    if (dto.evidenceUrl !== undefined) push('evidence_url', dto.evidenceUrl);
    if (sets.length === 0) return this.findFinding(id);
    vals.push(id);
    await this.exec(
      `UPDATE compliance_findings SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    return this.findFinding(id);
  }

  async deleteFinding(id: string): Promise<void> {
    await this.exec(`DELETE FROM compliance_findings WHERE id = $1::uuid`, [id]);
  }

  // ============= Summary / Dashboard =============

  async getSummary(): Promise<ComplianceSummary> {
    const [counts] = await this.query<Record<string, string>>(
      `SELECT
         (SELECT COUNT(*) FROM compliance_standards WHERE is_active)::text AS total_standards,
         (SELECT COUNT(*) FROM compliance_audits WHERE status IN ('passed','conditional','in_progress'))::text AS active_audits,
         (SELECT COUNT(*) FROM compliance_audits
            WHERE valid_until IS NOT NULL
              AND valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
              AND status IN ('passed','conditional'))::text AS expiring_soon,
         (SELECT COUNT(*) FROM compliance_audits
            WHERE valid_until IS NOT NULL
              AND valid_until < CURRENT_DATE)::text AS expired,
         (SELECT COUNT(*) FROM compliance_findings WHERE status IN ('open','in_progress'))::text AS open_findings,
         (SELECT COUNT(*) FROM compliance_findings
            WHERE status IN ('open','in_progress')
              AND target_close_date IS NOT NULL
              AND target_close_date < CURRENT_DATE)::text AS overdue_findings`,
    );

    const upcomingRows = await this.query<Record<string, unknown>>(
      `SELECT a.*, s.code AS standard_code, s.name AS standard_name,
              (a.valid_until - CURRENT_DATE) AS days_to_expiry
         FROM compliance_audits a
         LEFT JOIN compliance_standards s ON s.id = a.standard_id
        WHERE a.valid_until IS NOT NULL
          AND a.valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
        ORDER BY a.valid_until
        LIMIT 10`,
    );

    const expiringDocs = await this.query<Record<string, unknown>>(
      `SELECT d.*, s.code AS standard_code, a.audit_number AS audit_number,
              (d.expiry_date - CURRENT_DATE) AS days_to_expiry
         FROM compliance_documents d
         LEFT JOIN compliance_standards s ON s.id = d.standard_id
         LEFT JOIN compliance_audits a ON a.id = d.audit_id
        WHERE d.expiry_date IS NOT NULL
          AND d.is_archived = FALSE
          AND d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
        ORDER BY d.expiry_date
        LIMIT 10`,
    );

    return {
      totalStandards: Number(counts?.total_standards ?? 0),
      activeAudits: Number(counts?.active_audits ?? 0),
      expiringSoon: Number(counts?.expiring_soon ?? 0),
      expired: Number(counts?.expired ?? 0),
      openFindings: Number(counts?.open_findings ?? 0),
      overdueFindings: Number(counts?.overdue_findings ?? 0),
      upcomingAudits: upcomingRows.map((r) => camelize(r) as unknown as ComplianceAudit),
      expiringDocuments: expiringDocs.map((r) => camelize(r) as unknown as ComplianceDocument),
    };
  }
}
