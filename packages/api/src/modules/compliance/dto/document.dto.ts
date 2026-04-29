import {
  IsBoolean,
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
  ComplianceDocumentType,
  CreateComplianceDocumentDto as ICreate,
  UpdateComplianceDocumentDto as IUpdate,
} from '@org/shared-types';

const TYPES: ComplianceDocumentType[] = [
  'certificate',
  'report',
  'policy',
  'sop',
  'training_record',
  'permit',
  'license',
  'other',
];

export class CreateComplianceDocumentDto implements ICreate {
  @IsString() @Length(1, 64) documentNumber!: string;
  @IsOptional() @IsUUID() standardId?: string | null;
  @IsOptional() @IsUUID() auditId?: string | null;
  @IsString() @Length(1, 200) title!: string;
  @IsIn(TYPES) documentType!: ComplianceDocumentType;
  @IsOptional() @IsDateString() issuedDate?: string | null;
  @IsOptional() @IsDateString() expiryDate?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) fileUrl?: string | null;
  @IsOptional() @IsNumber() @Min(0) fileSizeBytes?: number | null;
  @IsOptional() @IsString() @MaxLength(120) mimeType?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
  @IsOptional() @IsBoolean() isArchived?: boolean;
}

export class UpdateComplianceDocumentDto implements IUpdate {
  @IsOptional() @IsString() @Length(1, 64) documentNumber?: string;
  @IsOptional() @IsUUID() standardId?: string | null;
  @IsOptional() @IsUUID() auditId?: string | null;
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional() @IsIn(TYPES) documentType?: ComplianceDocumentType;
  @IsOptional() @IsDateString() issuedDate?: string | null;
  @IsOptional() @IsDateString() expiryDate?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) fileUrl?: string | null;
  @IsOptional() @IsNumber() @Min(0) fileSizeBytes?: number | null;
  @IsOptional() @IsString() @MaxLength(120) mimeType?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
  @IsOptional() @IsBoolean() isArchived?: boolean;
}
