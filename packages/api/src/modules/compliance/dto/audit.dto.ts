import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  ComplianceAuditStatus,
  ComplianceAuditType,
  CreateComplianceAuditDto as ICreate,
  UpdateComplianceAuditDto as IUpdate,
} from '@org/shared-types';

const TYPES: ComplianceAuditType[] = [
  'initial',
  'follow_up',
  'surveillance',
  'recertification',
  'unannounced',
];
const STATUSES: ComplianceAuditStatus[] = [
  'scheduled',
  'in_progress',
  'passed',
  'conditional',
  'failed',
  'expired',
  'cancelled',
];

export class CreateComplianceAuditDto implements ICreate {
  @IsString() @Length(1, 64) auditNumber!: string;
  @IsUUID() standardId!: string;
  @IsIn(TYPES) auditType!: ComplianceAuditType;
  @IsOptional() @IsString() @MaxLength(120) auditorName?: string | null;
  @IsOptional() @IsString() @MaxLength(160) auditFirm?: string | null;
  @IsDateString() auditDate!: string;
  @IsOptional() @IsDateString() validUntil?: string | null;
  @IsOptional() @IsIn(STATUSES) status?: ComplianceAuditStatus;
  @IsOptional() @IsString() @MaxLength(64) rating?: string | null;
  @IsOptional() @IsNumber() @Min(0) score?: number | null;
  @IsOptional() @IsString() @MaxLength(2000) summary?: string | null;
  @IsOptional() @IsDateString() nextAuditDue?: string | null;
}

export class UpdateComplianceAuditDto implements IUpdate {
  @IsOptional() @IsString() @Length(1, 64) auditNumber?: string;
  @IsOptional() @IsUUID() standardId?: string;
  @IsOptional() @IsIn(TYPES) auditType?: ComplianceAuditType;
  @IsOptional() @IsString() @MaxLength(120) auditorName?: string | null;
  @IsOptional() @IsString() @MaxLength(160) auditFirm?: string | null;
  @IsOptional() @IsDateString() auditDate?: string;
  @IsOptional() @IsDateString() validUntil?: string | null;
  @IsOptional() @IsIn(STATUSES) status?: ComplianceAuditStatus;
  @IsOptional() @IsString() @MaxLength(64) rating?: string | null;
  @IsOptional() @IsNumber() @Min(0) score?: number | null;
  @IsOptional() @IsString() @MaxLength(2000) summary?: string | null;
  @IsOptional() @IsDateString() nextAuditDue?: string | null;
}
