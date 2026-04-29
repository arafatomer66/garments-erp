import { IsDateString, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import type { CreateFinFxRateDto as ICreateFinFxRateDto } from '@org/shared-types';

export class CreateFinFxRateDto implements ICreateFinFxRateDto {
  @IsDateString() rateDate!: string;
  @IsString() @Length(3, 3) baseCurrency!: string;
  @IsString() @Length(3, 3) quoteCurrency!: string;
  @IsNumber() @Min(0) rate!: number;
  @IsOptional() @IsString() source?: string | null;
}
