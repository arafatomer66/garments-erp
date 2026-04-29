import { IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import type {
  CreateBinLocationDto as ICreateBinDto,
  CreateWarehouseDto as ICreateWarehouseDto,
  UpdateBinLocationDto as IUpdateBinDto,
  UpdateWarehouseDto as IUpdateWarehouseDto,
  WarehouseType,
} from '@org/shared-types';
import { IsUUID } from 'class-validator';

const WAREHOUSE_TYPES: WarehouseType[] = [
  'fabric',
  'trim',
  'accessory',
  'finished_goods',
  'general',
];

export class CreateWarehouseDto implements ICreateWarehouseDto {
  @IsString() @Length(1, 40) code!: string;
  @IsString() @Length(1, 160) name!: string;
  @IsOptional() @IsIn(WAREHOUSE_TYPES) type?: WarehouseType;
  @IsOptional() @IsString() @MaxLength(400) address?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateWarehouseDto implements IUpdateWarehouseDto {
  @IsOptional() @IsString() @Length(1, 160) name?: string;
  @IsOptional() @IsIn(WAREHOUSE_TYPES) type?: WarehouseType;
  @IsOptional() @IsString() @MaxLength(400) address?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateBinLocationDto implements ICreateBinDto {
  @IsUUID() warehouseId!: string;
  @IsString() @Length(1, 40) code!: string;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateBinLocationDto implements IUpdateBinDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
