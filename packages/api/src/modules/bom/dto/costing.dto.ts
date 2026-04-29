import { IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';
import type { UpsertCostingSheetDto as IUpsertCostingSheetDto } from '@org/shared-types';

export class UpsertCostingSheetDto implements IUpsertCostingSheetDto {
  @IsUUID() styleId!: string;
  @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsNumber() @Min(0) cmCost?: number;
  @IsOptional() @IsNumber() @Min(0) overheadCost?: number;
  @IsOptional() @IsNumber() @Min(0) commercialCost?: number;
  @IsOptional() @IsNumber() @Min(0) profitPct?: number;
  @IsOptional() @IsString() notes?: string;
}
