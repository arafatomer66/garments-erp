import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import type { CreateTechPackDto as ICreateTechPackDto } from '@org/shared-types';

export class CreateTechPackDto implements ICreateTechPackDto {
  @IsUUID() styleId!: string;
  @IsString() @MaxLength(240) fileName!: string;
  @IsString() @MaxLength(400) storageKey!: string;
  @IsOptional() @IsString() @MaxLength(120) contentType?: string;
  @IsOptional() @IsInt() @Min(0) sizeBytes?: number;
  @IsOptional() @IsString() notes?: string;
}
