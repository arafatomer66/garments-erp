import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import type {
  CreateExportDocumentDto as ICreateExportDocumentDto,
  ExportDocStatus,
  ExportDocType,
  UpdateExportDocumentDto as IUpdateExportDocumentDto,
} from '@org/shared-types';

const TYPES: ExportDocType[] = [
  'co',
  'gsp',
  'exp',
  'commercial_invoice',
  'packing_list_doc',
  'bl_awb',
  'other',
];
const STATUSES: ExportDocStatus[] = ['draft', 'submitted', 'approved', 'rejected'];

export class CreateExportDocumentDto implements ICreateExportDocumentDto {
  @IsString() @Length(1, 60) docNumber!: string;
  @IsOptional() @IsUUID() shipmentId?: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsIn(TYPES) docType!: ExportDocType;
  @IsOptional() @IsDateString() issuedDate?: string;
  @IsOptional() @IsString() @MaxLength(120) issuedBy?: string;
  @IsOptional() @IsString() @MaxLength(120) referenceNumber?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsString() @MaxLength(500) fileUrl?: string;
  @IsOptional() @IsIn(STATUSES) status?: ExportDocStatus;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateExportDocumentDto implements IUpdateExportDocumentDto {
  @IsOptional() @IsUUID() shipmentId?: string;
  @IsOptional() @IsUUID() buyerOrderId?: string;
  @IsOptional() @IsIn(TYPES) docType?: ExportDocType;
  @IsOptional() @IsDateString() issuedDate?: string;
  @IsOptional() @IsString() @MaxLength(120) issuedBy?: string;
  @IsOptional() @IsString() @MaxLength(120) referenceNumber?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsString() @MaxLength(500) fileUrl?: string;
  @IsOptional() @IsIn(STATUSES) status?: ExportDocStatus;
  @IsOptional() @IsString() notes?: string;
}
