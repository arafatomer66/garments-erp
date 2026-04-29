export type ComplianceCategory =
  | 'social'
  | 'safety'
  | 'environmental'
  | 'quality'
  | 'security'
  | 'other';

export type ComplianceAuditType =
  | 'initial'
  | 'follow_up'
  | 'surveillance'
  | 'recertification'
  | 'unannounced';

export type ComplianceAuditStatus =
  | 'scheduled'
  | 'in_progress'
  | 'passed'
  | 'conditional'
  | 'failed'
  | 'expired'
  | 'cancelled';

export type ComplianceDocumentType =
  | 'certificate'
  | 'report'
  | 'policy'
  | 'sop'
  | 'training_record'
  | 'permit'
  | 'license'
  | 'other';

export type ComplianceFindingSeverity =
  | 'critical'
  | 'major'
  | 'minor'
  | 'observation'
  | 'opportunity';

export type ComplianceFindingStatus =
  | 'open'
  | 'in_progress'
  | 'closed'
  | 'verified'
  | 'overdue';

export interface ComplianceStandard {
  id: string;
  code: string;
  name: string;
  category: ComplianceCategory;
  issuingBody?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceAudit {
  id: string;
  auditNumber: string;
  standardId: string;
  standardCode?: string | null;
  standardName?: string | null;
  auditType: ComplianceAuditType;
  auditorName?: string | null;
  auditFirm?: string | null;
  auditDate: string;
  validUntil?: string | null;
  status: ComplianceAuditStatus;
  rating?: string | null;
  score?: number | string | null;
  summary?: string | null;
  nextAuditDue?: string | null;
  daysToExpiry?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceDocument {
  id: string;
  documentNumber: string;
  standardId?: string | null;
  standardCode?: string | null;
  auditId?: string | null;
  auditNumber?: string | null;
  title: string;
  documentType: ComplianceDocumentType;
  issuedDate?: string | null;
  expiryDate?: string | null;
  fileUrl?: string | null;
  fileSizeBytes?: number | string | null;
  mimeType?: string | null;
  notes?: string | null;
  isArchived: boolean;
  daysToExpiry?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceFinding {
  id: string;
  findingNumber: string;
  auditId: string;
  auditNumber?: string | null;
  severity: ComplianceFindingSeverity;
  category?: string | null;
  description: string;
  rootCause?: string | null;
  correctiveAction?: string | null;
  responsiblePerson?: string | null;
  targetCloseDate?: string | null;
  actualCloseDate?: string | null;
  status: ComplianceFindingStatus;
  evidenceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceSummary {
  totalStandards: number;
  activeAudits: number;
  expiringSoon: number;
  expired: number;
  openFindings: number;
  overdueFindings: number;
  upcomingAudits: ComplianceAudit[];
  expiringDocuments: ComplianceDocument[];
}

export interface CreateComplianceStandardDto {
  code: string;
  name: string;
  category: ComplianceCategory;
  issuingBody?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateComplianceStandardDto extends Partial<CreateComplianceStandardDto> {}

export interface CreateComplianceAuditDto {
  auditNumber: string;
  standardId: string;
  auditType: ComplianceAuditType;
  auditorName?: string | null;
  auditFirm?: string | null;
  auditDate: string;
  validUntil?: string | null;
  status?: ComplianceAuditStatus;
  rating?: string | null;
  score?: number | null;
  summary?: string | null;
  nextAuditDue?: string | null;
}

export interface UpdateComplianceAuditDto extends Partial<CreateComplianceAuditDto> {}

export interface CreateComplianceDocumentDto {
  documentNumber: string;
  standardId?: string | null;
  auditId?: string | null;
  title: string;
  documentType: ComplianceDocumentType;
  issuedDate?: string | null;
  expiryDate?: string | null;
  fileUrl?: string | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  notes?: string | null;
  isArchived?: boolean;
}

export interface UpdateComplianceDocumentDto extends Partial<CreateComplianceDocumentDto> {}

export interface CreateComplianceFindingDto {
  findingNumber: string;
  auditId: string;
  severity: ComplianceFindingSeverity;
  category?: string | null;
  description: string;
  rootCause?: string | null;
  correctiveAction?: string | null;
  responsiblePerson?: string | null;
  targetCloseDate?: string | null;
  actualCloseDate?: string | null;
  status?: ComplianceFindingStatus;
  evidenceUrl?: string | null;
}

export interface UpdateComplianceFindingDto extends Partial<CreateComplianceFindingDto> {}
