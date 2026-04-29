import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import type {
  CreateBomLineDto as ICreateBomLineDto,
  UpdateBomLineDto as IUpdateBomLineDto,
} from '@org/shared-types';

export class CreateBomLineDto implements ICreateBomLineDto {
  @IsUUID() styleId!: string;
  @IsUUID() itemId!: string;
  @IsNumber() @Min(0) quantityPerUnit!: number;
  @IsOptional() @IsNumber() @Min(0) wastagePct?: number;
  @IsOptional() @IsString() @MaxLength(16) uom?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateBomLineDto implements IUpdateBomLineDto {
  @IsOptional() @IsNumber() @Min(0) quantityPerUnit?: number;
  @IsOptional() @IsNumber() @Min(0) wastagePct?: number;
  @IsOptional() @IsString() @MaxLength(16) uom?: string;
  @IsOptional() @IsString() notes?: string;
}
