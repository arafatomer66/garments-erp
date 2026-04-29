import type { ISODateString } from './common.types.js';

export type DefectSeverity = 'critical' | 'major' | 'minor';

export interface DefectCode {
  id: string;
  code: string;
  name: string;
  category: string;
  severity: DefectSeverity;
  description: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateDefectCodeDto {
  code: string;
  name: string;
  category?: string;
  severity?: DefectSeverity;
  description?: string;
  isActive?: boolean;
}

export type UpdateDefectCodeDto = Partial<Omit<CreateDefectCodeDto, 'code'>>;

export interface InlineQcRecord {
  id: string;
  recordNumber: string;
  lineId: string;
  lineCode?: string;
  styleId: string | null;
  styleCode?: string;
  bundleId: string | null;
  bundleNumber?: string;
  operation: string | null;
  operatorName: string | null;
  inspectedQuantity: number;
  defectCodeId: string | null;
  defectCode?: string;
  defectName?: string;
  defectQuantity: number;
  inspectedAt: ISODateString;
  inspectedBy: string | null;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateInlineQcRecordDto {
  recordNumber: string;
  lineId: string;
  styleId?: string;
  bundleId?: string;
  operation?: string;
  operatorName?: string;
  inspectedQuantity: number;
  defectCodeId?: string;
  defectQuantity?: number;
  inspectedAt?: string;
  inspectedBy?: string;
  notes?: string;
}

export type UpdateInlineQcRecordDto = Partial<
  Omit<CreateInlineQcRecordDto, 'recordNumber' | 'lineId'>
>;

export interface EndLineQcDefect {
  id: string;
  recordId: string;
  defectCodeId: string;
  defectCode?: string;
  defectName?: string;
  severity?: DefectSeverity;
  quantity: number;
  notes: string | null;
  createdAt: ISODateString;
}

export interface EndLineQcRecord {
  id: string;
  recordNumber: string;
  lineId: string;
  lineCode?: string;
  styleId: string | null;
  styleCode?: string;
  bundleId: string | null;
  bundleNumber?: string;
  logDate: ISODateString;
  inspectedQuantity: number;
  defectQuantity: number;
  reworkQuantity: number;
  rejectQuantity: number;
  inspectedAt: ISODateString;
  inspectedBy: string | null;
  notes: string | null;
  defects: EndLineQcDefect[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateEndLineQcDefectDto {
  defectCodeId: string;
  quantity: number;
  notes?: string;
}

export interface CreateEndLineQcRecordDto {
  recordNumber: string;
  lineId: string;
  styleId?: string;
  bundleId?: string;
  logDate?: string;
  inspectedQuantity: number;
  reworkQuantity?: number;
  rejectQuantity?: number;
  inspectedAt?: string;
  inspectedBy?: string;
  notes?: string;
  defects: CreateEndLineQcDefectDto[];
}

export type UpdateEndLineQcRecordDto = Partial<
  Omit<CreateEndLineQcRecordDto, 'recordNumber' | 'lineId'>
>;

export type AqlStage = 'inline' | 'final' | 'pre_shipment';
export type AqlResult = 'pending' | 'pass' | 'fail';

export interface AqlInspectionDefect {
  id: string;
  inspectionId: string;
  defectCodeId: string;
  defectCode?: string;
  defectName?: string;
  quantity: number;
  severity: DefectSeverity;
  notes: string | null;
  createdAt: ISODateString;
}

export interface AqlInspection {
  id: string;
  inspectionNumber: string;
  cuttingPlanId: string | null;
  cuttingPlanNumber?: string;
  styleId: string | null;
  styleCode?: string;
  buyerOrderId: string | null;
  buyerOrderNumber?: string;
  inspectionStage: AqlStage;
  aqlLevel: number;
  lotSize: number;
  sampleSize: number;
  acceptThreshold: number;
  rejectThreshold: number;
  criticalDefects: number;
  majorDefects: number;
  minorDefects: number;
  result: AqlResult;
  inspectedAt: ISODateString;
  inspectedBy: string | null;
  notes: string | null;
  defects: AqlInspectionDefect[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateAqlInspectionDefectDto {
  defectCodeId: string;
  quantity: number;
  severity?: DefectSeverity;
  notes?: string;
}

export interface CreateAqlInspectionDto {
  inspectionNumber: string;
  cuttingPlanId?: string;
  styleId?: string;
  buyerOrderId?: string;
  inspectionStage?: AqlStage;
  aqlLevel?: number;
  lotSize: number;
  sampleSize?: number;
  acceptThreshold?: number;
  rejectThreshold?: number;
  inspectedAt?: string;
  inspectedBy?: string;
  notes?: string;
  defects: CreateAqlInspectionDefectDto[];
}

export type UpdateAqlInspectionDto = Partial<
  Omit<CreateAqlInspectionDto, 'inspectionNumber'>
>;

export interface DhuLineSummary {
  lineId: string;
  lineCode: string;
  lineName: string;
  inspectedQuantity: number;
  defectQuantity: number;
  reworkQuantity: number;
  rejectQuantity: number;
  dhu: number;
  defectRatePct: number;
}
