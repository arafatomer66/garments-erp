import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import type {
  ComplianceFindingSeverity,
  ComplianceFindingStatus,
  CreateComplianceFindingDto as ICreate,
  UpdateComplianceFindingDto as IUpdate,
} from '@org/shared-types';

const SEVERITIES: ComplianceFindingSeverity[] = [
  'critical',
  'major',
  'minor',
  'observation',
  'opportunity',
];
const STATUSES: ComplianceFindingStatus[] = [
  'open',
  'in_progress',
  'closed',
  'verified',
  'overdue',
];

export class CreateComplianceFindingDto implements ICreate {
  @IsString() @Length(1, 64) findingNumber!: string;
  @IsUUID() auditId!: string;
  @IsIn(SEVERITIES) severity!: ComplianceFindingSeverity;
  @IsOptional() @IsString() @MaxLength(120) category?: string | null;
  @IsString() @Length(1, 2000) description!: string;
  @IsOptional() @IsString() @MaxLength(2000) rootCause?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) correctiveAction?: string | null;
  @IsOptional() @IsString() @MaxLength(120) responsiblePerson?: string | null;
  @IsOptional() @IsDateString() targetCloseDate?: string | null;
  @IsOptional() @IsDateString() actualCloseDate?: string | null;
  @IsOptional() @IsIn(STATUSES) status?: ComplianceFindingStatus;
  @IsOptional() @IsString() @MaxLength(1000) evidenceUrl?: string | null;
}

export class UpdateComplianceFindingDto implements IUpdate {
  @IsOptional() @IsString() @Length(1, 64) findingNumber?: string;
  @IsOptional() @IsUUID() auditId?: string;
  @IsOptional() @IsIn(SEVERITIES) severity?: ComplianceFindingSeverity;
  @IsOptional() @IsString() @MaxLength(120) category?: string | null;
  @IsOptional() @IsString() @Length(1, 2000) description?: string;
  @IsOptional() @IsString() @MaxLength(2000) rootCause?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) correctiveAction?: string | null;
  @IsOptional() @IsString() @MaxLength(120) responsiblePerson?: string | null;
  @IsOptional() @IsDateString() targetCloseDate?: string | null;
  @IsOptional() @IsDateString() actualCloseDate?: string | null;
  @IsOptional() @IsIn(STATUSES) status?: ComplianceFindingStatus;
  @IsOptional() @IsString() @MaxLength(1000) evidenceUrl?: string | null;
}
