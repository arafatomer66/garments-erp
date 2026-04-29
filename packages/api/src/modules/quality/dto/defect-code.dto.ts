import { IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import type {
  CreateDefectCodeDto as ICreateDefectCodeDto,
  DefectSeverity,
  UpdateDefectCodeDto as IUpdateDefectCodeDto,
} from '@org/shared-types';

const SEVERITIES: DefectSeverity[] = ['critical', 'major', 'minor'];

export class CreateDefectCodeDto implements ICreateDefectCodeDto {
  @IsString() @Length(1, 40) code!: string;
  @IsString() @Length(1, 160) name!: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsIn(SEVERITIES) severity?: DefectSeverity;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateDefectCodeDto implements IUpdateDefectCodeDto {
  @IsOptional() @IsString() @Length(1, 160) name?: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsIn(SEVERITIES) severity?: DefectSeverity;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
