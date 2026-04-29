import type { ISODateString } from './common.types.js';

export type StyleStatus =
  | 'development'
  | 'sampling'
  | 'approved'
  | 'in_production'
  | 'shipped'
  | 'cancelled';

export type TaTaskStatus = 'pending' | 'in_progress' | 'done' | 'delayed' | 'skipped';

export interface Style {
  id: string;
  code: string;
  name: string;
  buyerId: string;
  season: string | null;
  productType: string | null;
  fabricSummary: string | null;
  description: string | null;
  targetFob: number | null;
  currencyCode: string;
  status: StyleStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateStyleDto {
  code: string;
  name: string;
  buyerId: string;
  season?: string;
  productType?: string;
  fabricSummary?: string;
  description?: string;
  targetFob?: number;
  currencyCode?: string;
  status?: StyleStatus;
}

export type UpdateStyleDto = Partial<CreateStyleDto>;

export interface TechPack {
  id: string;
  styleId: string;
  version: number;
  fileName: string;
  storageKey: string;
  contentType: string | null;
  sizeBytes: number | null;
  notes: string | null;
  uploadedAt: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateTechPackDto {
  styleId: string;
  fileName: string;
  storageKey: string;
  contentType?: string;
  sizeBytes?: number;
  notes?: string;
}

export interface TaTask {
  id: string;
  styleId: string;
  sequence: number;
  code: string;
  name: string;
  plannedStart: ISODateString | null;
  plannedEnd: ISODateString;
  actualStart: ISODateString | null;
  actualEnd: ISODateString | null;
  status: TaTaskStatus;
  owner: string | null;
  remarks: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateTaTaskDto {
  styleId: string;
  sequence?: number;
  code: string;
  name: string;
  plannedStart?: ISODateString | null;
  plannedEnd: ISODateString;
  actualStart?: ISODateString | null;
  actualEnd?: ISODateString | null;
  status?: TaTaskStatus;
  owner?: string;
  remarks?: string;
}

export type UpdateTaTaskDto = Partial<CreateTaTaskDto>;
