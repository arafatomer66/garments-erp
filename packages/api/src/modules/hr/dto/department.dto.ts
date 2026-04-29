import { IsBoolean, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import type {
  CreateHrDepartmentDto as ICreateHrDepartmentDto,
  UpdateHrDepartmentDto as IUpdateHrDepartmentDto,
} from '@org/shared-types';

export class CreateHrDepartmentDto implements ICreateHrDepartmentDto {
  @IsString() @Length(1, 30) code!: string;
  @IsString() @Length(1, 80) name!: string;
  @IsOptional() @IsUUID() parentId?: string | null;
  @IsOptional() @IsUUID() headEmployeeId?: string | null;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateHrDepartmentDto implements IUpdateHrDepartmentDto {
  @IsOptional() @IsString() @Length(1, 30) code?: string;
  @IsOptional() @IsString() @Length(1, 80) name?: string;
  @IsOptional() @IsUUID() parentId?: string | null;
  @IsOptional() @IsUUID() headEmployeeId?: string | null;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
