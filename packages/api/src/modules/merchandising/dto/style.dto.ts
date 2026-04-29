import {
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
  CreateStyleDto as ICreateStyleDto,
  StyleStatus,
  UpdateStyleDto as IUpdateStyleDto,
} from '@org/shared-types';

const STATUSES: StyleStatus[] = [
  'development',
  'sampling',
  'approved',
  'in_production',
  'shipped',
  'cancelled',
];

export class CreateStyleDto implements ICreateStyleDto {
  @IsString() @Length(1, 48) code!: string;
  @IsString() @Length(1, 200) name!: string;
  @IsUUID() buyerId!: string;

  @IsOptional() @IsString() @MaxLength(40) season?: string;
  @IsOptional() @IsString() @MaxLength(60) productType?: string;
  @IsOptional() @IsString() fabricSummary?: string;
  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsNumber() @Min(0) targetFob?: number;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsIn(STATUSES) status?: StyleStatus;
}

export class UpdateStyleDto implements IUpdateStyleDto {
  @IsOptional() @IsString() @Length(1, 48) code?: string;
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsUUID() buyerId?: string;
  @IsOptional() @IsString() @MaxLength(40) season?: string;
  @IsOptional() @IsString() @MaxLength(60) productType?: string;
  @IsOptional() @IsString() fabricSummary?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) targetFob?: number;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsIn(STATUSES) status?: StyleStatus;
}
