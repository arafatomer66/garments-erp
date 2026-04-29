import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type {
  CreateItemDto as ICreateItemDto,
  UpdateItemDto as IUpdateItemDto,
  ItemCategory,
} from '@org/shared-types';

const ITEM_CATEGORIES: ItemCategory[] = [
  'fabric',
  'trim',
  'accessory',
  'packing',
  'finished_good',
  'other',
];

export class CreateItemDto implements ICreateItemDto {
  @IsString()
  @Length(1, 48)
  code!: string;

  @IsString()
  @Length(1, 200)
  name!: string;

  @IsIn(ITEM_CATEGORIES)
  category!: ItemCategory;

  @IsString()
  @Length(1, 16)
  uom!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  defaultSupplierId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  standardCost?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  reorderLevel?: number;
}

export class UpdateItemDto implements IUpdateItemDto {
  @IsOptional()
  @IsString()
  @Length(1, 48)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @IsIn(ITEM_CATEGORIES)
  category?: ItemCategory;

  @IsOptional()
  @IsString()
  @Length(1, 16)
  uom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  defaultSupplierId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  standardCost?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
