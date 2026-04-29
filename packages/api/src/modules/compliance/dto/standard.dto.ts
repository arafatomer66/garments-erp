import { IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import type {
  ComplianceCategory,
  CreateComplianceStandardDto as ICreate,
  UpdateComplianceStandardDto as IUpdate,
} from '@org/shared-types';

const CATEGORIES: ComplianceCategory[] = [
  'social',
  'safety',
  'environmental',
  'quality',
  'security',
  'other',
];

export class CreateComplianceStandardDto implements ICreate {
  @IsString() @Length(1, 32) code!: string;
  @IsString() @Length(1, 120) name!: string;
  @IsIn(CATEGORIES) category!: ComplianceCategory;
  @IsOptional() @IsString() @MaxLength(120) issuingBody?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) description?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateComplianceStandardDto implements IUpdate {
  @IsOptional() @IsString() @Length(1, 32) code?: string;
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsIn(CATEGORIES) category?: ComplianceCategory;
  @IsOptional() @IsString() @MaxLength(120) issuingBody?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) description?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
