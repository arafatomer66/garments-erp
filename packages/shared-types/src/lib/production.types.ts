import type { ISODateString } from './common.types.js';

export type CuttingPlanStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface CuttingPlanItem {
  id: string;
  planId: string;
  sizeLabel: string;
  color: string | null;
  targetQuantity: number;
  cutQuantity: number;
  sortOrder: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CuttingPlan {
  id: string;
  planNumber: string;
  styleId: string;
  styleCode?: string;
  styleName?: string;
  buyerOrderId: string | null;
  buyerOrderNumber?: string;
  planDate: ISODateString;
  targetQuantity: number;
  cutQuantity: number;
  fabricLotId: string | null;
  fabricLotNumber?: string;
  markerEfficiencyPct: number | null;
  status: CuttingPlanStatus;
  notes: string | null;
  items: CuttingPlanItem[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateCuttingPlanItemDto {
  sizeLabel: string;
  color?: string;
  targetQuantity: number;
  cutQuantity?: number;
  sortOrder?: number;
}

export interface CreateCuttingPlanDto {
  planNumber: string;
  styleId: string;
  buyerOrderId?: string;
  planDate?: string;
  targetQuantity?: number;
  fabricLotId?: string;
  markerEfficiencyPct?: number;
  status?: CuttingPlanStatus;
  notes?: string;
  items: CreateCuttingPlanItemDto[];
}

export type UpdateCuttingPlanDto = Partial<Omit<CreateCuttingPlanDto, 'planNumber' | 'styleId'>>;

export interface SewingLine {
  id: string;
  code: string;
  name: string;
  capacityPcsPerHour: number;
  operatorCount: number;
  helperCount: number;
  supervisor: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateSewingLineDto {
  code: string;
  name: string;
  capacityPcsPerHour?: number;
  operatorCount?: number;
  helperCount?: number;
  supervisor?: string;
  isActive?: boolean;
}

export type UpdateSewingLineDto = Partial<Omit<CreateSewingLineDto, 'code'>>;

export type LineAssignmentStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface LineAssignment {
  id: string;
  lineId: string;
  lineCode?: string;
  styleId: string;
  styleCode?: string;
  styleName?: string;
  buyerOrderId: string | null;
  targetPcsPerHour: number | null;
  sam: number | null;
  startedAt: ISODateString;
  endedAt: ISODateString | null;
  status: LineAssignmentStatus;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateLineAssignmentDto {
  lineId: string;
  styleId: string;
  buyerOrderId?: string;
  targetPcsPerHour?: number;
  sam?: number;
  startedAt?: string;
  status?: LineAssignmentStatus;
  notes?: string;
}

export type UpdateLineAssignmentDto = Partial<
  Omit<CreateLineAssignmentDto, 'lineId' | 'styleId'>
> & { endedAt?: string | null };

export type BundleStatus = 'cut' | 'in_sewing' | 'sewn' | 'rejected' | 'packed';

export interface Bundle {
  id: string;
  bundleNumber: string;
  qrCode: string;
  cuttingPlanId: string;
  cuttingPlanNumber?: string;
  lineId: string | null;
  lineCode?: string;
  sizeLabel: string;
  color: string | null;
  quantity: number;
  status: BundleStatus;
  cutAt: ISODateString;
  sewingStartedAt: ISODateString | null;
  sewingCompletedAt: ISODateString | null;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateBundleDto {
  bundleNumber: string;
  qrCode?: string;
  cuttingPlanId: string;
  lineId?: string;
  sizeLabel: string;
  color?: string;
  quantity: number;
  status?: BundleStatus;
  notes?: string;
}

export type UpdateBundleDto = Partial<Omit<CreateBundleDto, 'bundleNumber' | 'cuttingPlanId'>>;

export interface ScanBundleDto {
  qrCode: string;
  lineId?: string;
  status: BundleStatus;
}

export interface HourlyProductionLog {
  id: string;
  lineId: string;
  lineCode?: string;
  styleId: string | null;
  styleCode?: string;
  logDate: ISODateString;
  hourSlot: number;
  targetPcs: number;
  producedPcs: number;
  rejectedPcs: number;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface UpsertHourlyLogDto {
  lineId: string;
  styleId?: string;
  logDate?: string;
  hourSlot: number;
  targetPcs?: number;
  producedPcs: number;
  rejectedPcs?: number;
  notes?: string;
}

export interface HourlyBoardLineSummary {
  lineId: string;
  lineCode: string;
  lineName: string;
  styleCode?: string;
  totalTarget: number;
  totalProduced: number;
  totalRejected: number;
  efficiencyPct: number;
  hours: HourlyProductionLog[];
}
