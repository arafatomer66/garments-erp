import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AqlInspection,
  AqlInspectionDefect,
  DefectCode,
  DhuLineSummary,
  EndLineQcDefect,
  EndLineQcRecord,
  InlineQcRecord,
} from '@org/shared-types';
import { TenantRepository, TenantTx } from '../../core/database/tenant-repository';
import { camelize } from '../masters/sql.util';
import { CreateDefectCodeDto, UpdateDefectCodeDto } from './dto/defect-code.dto';
import { CreateInlineQcRecordDto, UpdateInlineQcRecordDto } from './dto/inline-qc.dto';
import {
  CreateEndLineQcDefectDto,
  CreateEndLineQcRecordDto,
  UpdateEndLineQcRecordDto,
} from './dto/end-line-qc.dto';
import {
  CreateAqlInspectionDefectDto,
  CreateAqlInspectionDto,
  UpdateAqlInspectionDto,
} from './dto/aql.dto';

/**
 * Compute AQL sample-size and accept/reject thresholds.
 * Simplified ANSI/ASQ Z1.4 General Inspection Level II for AQL 2.5.
 * For other AQL levels, scale Ac/Re proportionally — caller can override.
 */
function computeAqlPlan(lotSize: number, aql = 2.5): {
  sampleSize: number;
  accept: number;
  reject: number;
} {
  // Sample-size code letters → sample size (Level II)
  const codeBands: { upTo: number; sample: number }[] = [
    { upTo: 8, sample: 2 },
    { upTo: 15, sample: 3 },
    { upTo: 25, sample: 5 },
    { upTo: 50, sample: 8 },
    { upTo: 90, sample: 13 },
    { upTo: 150, sample: 20 },
    { upTo: 280, sample: 32 },
    { upTo: 500, sample: 50 },
    { upTo: 1200, sample: 80 },
    { upTo: 3200, sample: 125 },
    { upTo: 10000, sample: 200 },
    { upTo: 35000, sample: 315 },
    { upTo: 150000, sample: 500 },
    { upTo: 500000, sample: 800 },
    { upTo: Number.POSITIVE_INFINITY, sample: 1250 },
  ];
  const band = codeBands.find((b) => lotSize <= b.upTo)!;
  const sampleSize = band.sample;

  // Ac/Re for AQL 2.5 by sample size
  const ac25Map: Record<number, [number, number]> = {
    2: [0, 1],
    3: [0, 1],
    5: [0, 1],
    8: [0, 1],
    13: [1, 2],
    20: [1, 2],
    32: [2, 3],
    50: [3, 4],
    80: [5, 6],
    125: [7, 8],
    200: [10, 11],
    315: [14, 15],
    500: [21, 22],
    800: [21, 22],
    1250: [21, 22],
  };
  const base = ac25Map[sampleSize];
  const accept = Math.max(0, Math.round(base[0] * (aql / 2.5)));
  const reject = Math.max(accept + 1, Math.round(base[1] * (aql / 2.5)));
  return { sampleSize, accept, reject };
}

@Injectable()
export class QualityService extends TenantRepository {
  // ============= Defect codes =============

  async listDefectCodes(): Promise<DefectCode[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM defect_codes ORDER BY severity, code`,
    );
    return rows.map((r) => camelize(r) as unknown as DefectCode);
  }

  async createDefectCode(dto: CreateDefectCodeDto): Promise<DefectCode> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO defect_codes (code, name, category, severity, description, is_active)
       VALUES ($1, $2, COALESCE($3, 'general'), COALESCE($4, 'minor'), $5, COALESCE($6, TRUE))
       RETURNING id`,
      [
        dto.code,
        dto.name,
        dto.category ?? null,
        dto.severity ?? null,
        dto.description ?? null,
        dto.isActive ?? null,
      ],
    );
    return this.findDefectCode(rows[0].id);
  }

  async findDefectCode(id: string): Promise<DefectCode> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM defect_codes WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Defect code ${id} not found`);
    return camelize(rows[0]) as unknown as DefectCode;
  }

  async updateDefectCode(id: string, dto: UpdateDefectCodeDto): Promise<DefectCode> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown) => {
      vals.push(val);
      sets.push(`${col} = $${vals.length}`);
    };
    if (dto.name !== undefined) push('name', dto.name);
    if (dto.category !== undefined) push('category', dto.category);
    if (dto.severity !== undefined) push('severity', dto.severity);
    if (dto.description !== undefined) push('description', dto.description);
    if (dto.isActive !== undefined) push('is_active', dto.isActive);
    if (sets.length === 0) return this.findDefectCode(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE defect_codes SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Defect code ${id} not found`);
    return this.findDefectCode(id);
  }

  async removeDefectCode(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM defect_codes WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Defect code ${id} not found`);
  }

  // ============= Inline QC =============

  async listInlineQc(lineId?: string, date?: string): Promise<InlineQcRecord[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (lineId) {
      params.push(lineId);
      where.push(`iqc.line_id = $${params.length}::uuid`);
    }
    if (date) {
      params.push(date);
      where.push(`iqc.inspected_at::date = $${params.length}::date`);
    }
    const rows = await this.query<Record<string, unknown>>(
      `SELECT iqc.*, sl.code AS line_code, st.code AS style_code,
              b.bundle_number, dc.code AS defect_code, dc.name AS defect_name
         FROM inline_qc_records iqc
         JOIN sewing_lines sl ON sl.id = iqc.line_id
         LEFT JOIN styles st ON st.id = iqc.style_id
         LEFT JOIN bundles b ON b.id = iqc.bundle_id
         LEFT JOIN defect_codes dc ON dc.id = iqc.defect_code_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY iqc.inspected_at DESC LIMIT 500`,
      params,
    );
    return rows.map((r) => this.toInline(r));
  }

  async createInlineQc(dto: CreateInlineQcRecordDto): Promise<InlineQcRecord> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO inline_qc_records (
          record_number, line_id, style_id, bundle_id, operation, operator_name,
          inspected_quantity, defect_code_id, defect_quantity, inspected_at, inspected_by, notes)
       VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8::uuid, $9,
          COALESCE($10::timestamptz, now()), $11, $12)
       RETURNING id`,
      [
        dto.recordNumber,
        dto.lineId,
        dto.styleId ?? null,
        dto.bundleId ?? null,
        dto.operation ?? null,
        dto.operatorName ?? null,
        dto.inspectedQuantity,
        dto.defectCodeId ?? null,
        dto.defectQuantity ?? 0,
        dto.inspectedAt ?? null,
        dto.inspectedBy ?? null,
        dto.notes ?? null,
      ],
    );
    return this.findInlineQc(rows[0].id);
  }

  private async findInlineQc(id: string): Promise<InlineQcRecord> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT iqc.*, sl.code AS line_code, st.code AS style_code,
              b.bundle_number, dc.code AS defect_code, dc.name AS defect_name
         FROM inline_qc_records iqc
         JOIN sewing_lines sl ON sl.id = iqc.line_id
         LEFT JOIN styles st ON st.id = iqc.style_id
         LEFT JOIN bundles b ON b.id = iqc.bundle_id
         LEFT JOIN defect_codes dc ON dc.id = iqc.defect_code_id
        WHERE iqc.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Inline QC record ${id} not found`);
    return this.toInline(rows[0]);
  }

  async updateInlineQc(id: string, dto: UpdateInlineQcRecordDto): Promise<InlineQcRecord> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.styleId !== undefined) push('style_id', dto.styleId, 'uuid');
    if (dto.bundleId !== undefined) push('bundle_id', dto.bundleId, 'uuid');
    if (dto.operation !== undefined) push('operation', dto.operation);
    if (dto.operatorName !== undefined) push('operator_name', dto.operatorName);
    if (dto.inspectedQuantity !== undefined) push('inspected_quantity', dto.inspectedQuantity);
    if (dto.defectCodeId !== undefined) push('defect_code_id', dto.defectCodeId, 'uuid');
    if (dto.defectQuantity !== undefined) push('defect_quantity', dto.defectQuantity);
    if (dto.inspectedAt !== undefined) push('inspected_at', dto.inspectedAt, 'timestamptz');
    if (dto.inspectedBy !== undefined) push('inspected_by', dto.inspectedBy);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (sets.length === 0) return this.findInlineQc(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE inline_qc_records SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Inline QC record ${id} not found`);
    return this.findInlineQc(id);
  }

  async removeInlineQc(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM inline_qc_records WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Inline QC record ${id} not found`);
  }

  private toInline(row: Record<string, unknown>): InlineQcRecord {
    const c = camelize(row) as Record<string, unknown>;
    return {
      ...(c as unknown as InlineQcRecord),
      inspectedQuantity: Number(c['inspectedQuantity']),
      defectQuantity: Number(c['defectQuantity']),
    };
  }

  // ============= End-line QC =============

  async listEndLineQc(lineId?: string, date?: string): Promise<EndLineQcRecord[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (lineId) {
      params.push(lineId);
      where.push(`elqc.line_id = $${params.length}::uuid`);
    }
    if (date) {
      params.push(date);
      where.push(`elqc.log_date = $${params.length}::date`);
    }
    const rows = await this.query<Record<string, unknown>>(
      `SELECT elqc.*, sl.code AS line_code, st.code AS style_code, b.bundle_number
         FROM end_line_qc_records elqc
         JOIN sewing_lines sl ON sl.id = elqc.line_id
         LEFT JOIN styles st ON st.id = elqc.style_id
         LEFT JOIN bundles b ON b.id = elqc.bundle_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY elqc.log_date DESC, elqc.inspected_at DESC LIMIT 500`,
      params,
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r['id'] as string);
    const defectRows = await this.query<Record<string, unknown>>(
      `SELECT elqd.*, dc.code AS defect_code, dc.name AS defect_name, dc.severity
         FROM end_line_qc_defects elqd
         JOIN defect_codes dc ON dc.id = elqd.defect_code_id
        WHERE elqd.record_id = ANY($1::uuid[])`,
      [ids],
    );
    return rows.map((r) => this.assembleEndLine(r, defectRows));
  }

  async createEndLineQc(dto: CreateEndLineQcRecordDto): Promise<EndLineQcRecord> {
    const totalDefectQty = dto.defects.reduce((s, d) => s + Number(d.quantity), 0);
    const id = await this.withTx(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        `INSERT INTO end_line_qc_records (
            record_number, line_id, style_id, bundle_id, log_date,
            inspected_quantity, defect_quantity, rework_quantity, reject_quantity,
            inspected_at, inspected_by, notes)
         VALUES ($1, $2::uuid, $3::uuid, $4::uuid, COALESCE($5::date, CURRENT_DATE),
            $6, $7, $8, $9, COALESCE($10::timestamptz, now()), $11, $12)
         RETURNING id`,
        [
          dto.recordNumber,
          dto.lineId,
          dto.styleId ?? null,
          dto.bundleId ?? null,
          dto.logDate ?? null,
          dto.inspectedQuantity,
          totalDefectQty,
          dto.reworkQuantity ?? 0,
          dto.rejectQuantity ?? 0,
          dto.inspectedAt ?? null,
          dto.inspectedBy ?? null,
          dto.notes ?? null,
        ],
      );
      const recordId = rows[0].id;
      for (const d of dto.defects) await this.insertEndLineDefect(tx, recordId, d);
      return recordId;
    });
    return this.findEndLineQc(id);
  }

  async findEndLineQc(id: string): Promise<EndLineQcRecord> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT elqc.*, sl.code AS line_code, st.code AS style_code, b.bundle_number
         FROM end_line_qc_records elqc
         JOIN sewing_lines sl ON sl.id = elqc.line_id
         LEFT JOIN styles st ON st.id = elqc.style_id
         LEFT JOIN bundles b ON b.id = elqc.bundle_id
        WHERE elqc.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`End-line QC record ${id} not found`);
    const defectRows = await this.query<Record<string, unknown>>(
      `SELECT elqd.*, dc.code AS defect_code, dc.name AS defect_name, dc.severity
         FROM end_line_qc_defects elqd
         JOIN defect_codes dc ON dc.id = elqd.defect_code_id
        WHERE elqd.record_id = $1::uuid`,
      [id],
    );
    return this.assembleEndLine(rows[0], defectRows);
  }

  async updateEndLineQc(id: string, dto: UpdateEndLineQcRecordDto): Promise<EndLineQcRecord> {
    await this.withTx(async (tx) => {
      const sets: string[] = [];
      const vals: unknown[] = [];
      const push = (col: string, val: unknown, cast?: string) => {
        vals.push(val);
        sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
      };
      if (dto.styleId !== undefined) push('style_id', dto.styleId, 'uuid');
      if (dto.bundleId !== undefined) push('bundle_id', dto.bundleId, 'uuid');
      if (dto.logDate !== undefined) push('log_date', dto.logDate, 'date');
      if (dto.inspectedQuantity !== undefined) push('inspected_quantity', dto.inspectedQuantity);
      if (dto.reworkQuantity !== undefined) push('rework_quantity', dto.reworkQuantity);
      if (dto.rejectQuantity !== undefined) push('reject_quantity', dto.rejectQuantity);
      if (dto.inspectedAt !== undefined) push('inspected_at', dto.inspectedAt, 'timestamptz');
      if (dto.inspectedBy !== undefined) push('inspected_by', dto.inspectedBy);
      if (dto.notes !== undefined) push('notes', dto.notes);
      if (dto.defects !== undefined) {
        const total = dto.defects.reduce((s, d) => s + Number(d.quantity), 0);
        push('defect_quantity', total);
      }
      if (sets.length > 0) {
        vals.push(id);
        const affected = await tx.exec(
          `UPDATE end_line_qc_records SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
          vals,
        );
        if (affected === 0) throw new NotFoundException(`End-line QC record ${id} not found`);
      } else {
        const e = await tx.query<{ id: string }>(
          `SELECT id FROM end_line_qc_records WHERE id = $1::uuid`,
          [id],
        );
        if (e.length === 0) throw new NotFoundException(`End-line QC record ${id} not found`);
      }
      if (dto.defects !== undefined) {
        await tx.exec(`DELETE FROM end_line_qc_defects WHERE record_id = $1::uuid`, [id]);
        for (const d of dto.defects) await this.insertEndLineDefect(tx, id, d);
      }
    });
    return this.findEndLineQc(id);
  }

  async removeEndLineQc(id: string): Promise<void> {
    const affected = await this.exec(
      `DELETE FROM end_line_qc_records WHERE id = $1::uuid`,
      [id],
    );
    if (affected === 0) throw new NotFoundException(`End-line QC record ${id} not found`);
  }

  private async insertEndLineDefect(
    tx: TenantTx,
    recordId: string,
    d: CreateEndLineQcDefectDto,
  ): Promise<void> {
    await tx.exec(
      `INSERT INTO end_line_qc_defects (record_id, defect_code_id, quantity, notes)
       VALUES ($1::uuid, $2::uuid, $3, $4)`,
      [recordId, d.defectCodeId, d.quantity, d.notes ?? null],
    );
  }

  private assembleEndLine(
    row: Record<string, unknown>,
    allDefects: Record<string, unknown>[],
  ): EndLineQcRecord {
    const head = camelize(row) as unknown as Omit<EndLineQcRecord, 'defects'>;
    const defects: EndLineQcDefect[] = allDefects
      .filter((d) => d['record_id'] === row['id'])
      .map((d) => {
        const c = camelize(d) as Record<string, unknown>;
        return {
          ...(c as unknown as EndLineQcDefect),
          quantity: Number(c['quantity']),
        };
      });
    return {
      ...head,
      inspectedQuantity: Number(head.inspectedQuantity),
      defectQuantity: Number(head.defectQuantity),
      reworkQuantity: Number(head.reworkQuantity),
      rejectQuantity: Number(head.rejectQuantity),
      defects,
    };
  }

  // ============= AQL =============

  async listAqlInspections(): Promise<AqlInspection[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT aqi.*, cp.plan_number AS cutting_plan_number,
              st.code AS style_code, bo.order_number AS buyer_order_number
         FROM aql_inspections aqi
         LEFT JOIN cutting_plans cp ON cp.id = aqi.cutting_plan_id
         LEFT JOIN styles st ON st.id = aqi.style_id
         LEFT JOIN buyer_orders bo ON bo.id = aqi.buyer_order_id
        ORDER BY aqi.inspected_at DESC LIMIT 200`,
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r['id'] as string);
    const defectRows = await this.query<Record<string, unknown>>(
      `SELECT aqd.*, dc.code AS defect_code, dc.name AS defect_name
         FROM aql_inspection_defects aqd
         JOIN defect_codes dc ON dc.id = aqd.defect_code_id
        WHERE aqd.inspection_id = ANY($1::uuid[])`,
      [ids],
    );
    return rows.map((r) => this.assembleAql(r, defectRows));
  }

  async createAqlInspection(dto: CreateAqlInspectionDto): Promise<AqlInspection> {
    const aqlLevel = dto.aqlLevel ?? 2.5;
    const plan = computeAqlPlan(dto.lotSize, aqlLevel);
    const sampleSize = dto.sampleSize ?? plan.sampleSize;
    const accept = dto.acceptThreshold ?? plan.accept;
    const reject = dto.rejectThreshold ?? plan.reject;

    let critical = 0,
      major = 0,
      minor = 0;
    for (const d of dto.defects) {
      const sev = d.severity ?? 'minor';
      if (sev === 'critical') critical += d.quantity;
      else if (sev === 'major') major += d.quantity;
      else minor += d.quantity;
    }
    const totalDefective = critical + major + minor;
    const result: 'pass' | 'fail' = totalDefective <= accept ? 'pass' : 'fail';

    const id = await this.withTx(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        `INSERT INTO aql_inspections (
            inspection_number, cutting_plan_id, style_id, buyer_order_id,
            inspection_stage, aql_level, lot_size, sample_size,
            accept_threshold, reject_threshold,
            critical_defects, major_defects, minor_defects,
            result, inspected_at, inspected_by, notes)
         VALUES ($1, $2::uuid, $3::uuid, $4::uuid,
            COALESCE($5, 'final'), $6, $7, $8, $9, $10,
            $11, $12, $13, $14, COALESCE($15::timestamptz, now()), $16, $17)
         RETURNING id`,
        [
          dto.inspectionNumber,
          dto.cuttingPlanId ?? null,
          dto.styleId ?? null,
          dto.buyerOrderId ?? null,
          dto.inspectionStage ?? null,
          aqlLevel,
          dto.lotSize,
          sampleSize,
          accept,
          reject,
          critical,
          major,
          minor,
          result,
          dto.inspectedAt ?? null,
          dto.inspectedBy ?? null,
          dto.notes ?? null,
        ],
      );
      const inspectionId = rows[0].id;
      for (const d of dto.defects) {
        await tx.exec(
          `INSERT INTO aql_inspection_defects (inspection_id, defect_code_id, quantity, severity, notes)
           VALUES ($1::uuid, $2::uuid, $3, COALESCE($4, 'minor'), $5)`,
          [inspectionId, d.defectCodeId, d.quantity, d.severity ?? null, d.notes ?? null],
        );
      }
      return inspectionId;
    });
    return this.findAqlInspection(id);
  }

  async findAqlInspection(id: string): Promise<AqlInspection> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT aqi.*, cp.plan_number AS cutting_plan_number,
              st.code AS style_code, bo.order_number AS buyer_order_number
         FROM aql_inspections aqi
         LEFT JOIN cutting_plans cp ON cp.id = aqi.cutting_plan_id
         LEFT JOIN styles st ON st.id = aqi.style_id
         LEFT JOIN buyer_orders bo ON bo.id = aqi.buyer_order_id
        WHERE aqi.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`AQL inspection ${id} not found`);
    const defectRows = await this.query<Record<string, unknown>>(
      `SELECT aqd.*, dc.code AS defect_code, dc.name AS defect_name
         FROM aql_inspection_defects aqd
         JOIN defect_codes dc ON dc.id = aqd.defect_code_id
        WHERE aqd.inspection_id = $1::uuid`,
      [id],
    );
    return this.assembleAql(rows[0], defectRows);
  }

  async updateAqlInspection(id: string, dto: UpdateAqlInspectionDto): Promise<AqlInspection> {
    await this.withTx(async (tx) => {
      const sets: string[] = [];
      const vals: unknown[] = [];
      const push = (col: string, val: unknown, cast?: string) => {
        vals.push(val);
        sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
      };
      if (dto.cuttingPlanId !== undefined) push('cutting_plan_id', dto.cuttingPlanId, 'uuid');
      if (dto.styleId !== undefined) push('style_id', dto.styleId, 'uuid');
      if (dto.buyerOrderId !== undefined) push('buyer_order_id', dto.buyerOrderId, 'uuid');
      if (dto.inspectionStage !== undefined) push('inspection_stage', dto.inspectionStage);
      if (dto.aqlLevel !== undefined) push('aql_level', dto.aqlLevel);
      if (dto.lotSize !== undefined) push('lot_size', dto.lotSize);
      if (dto.sampleSize !== undefined) push('sample_size', dto.sampleSize);
      if (dto.acceptThreshold !== undefined) push('accept_threshold', dto.acceptThreshold);
      if (dto.rejectThreshold !== undefined) push('reject_threshold', dto.rejectThreshold);
      if (dto.inspectedAt !== undefined) push('inspected_at', dto.inspectedAt, 'timestamptz');
      if (dto.inspectedBy !== undefined) push('inspected_by', dto.inspectedBy);
      if (dto.notes !== undefined) push('notes', dto.notes);
      if (dto.defects !== undefined) {
        let critical = 0,
          major = 0,
          minor = 0;
        for (const d of dto.defects) {
          const sev = d.severity ?? 'minor';
          if (sev === 'critical') critical += d.quantity;
          else if (sev === 'major') major += d.quantity;
          else minor += d.quantity;
        }
        push('critical_defects', critical);
        push('major_defects', major);
        push('minor_defects', minor);
      }
      if (sets.length > 0) {
        vals.push(id);
        const affected = await tx.exec(
          `UPDATE aql_inspections SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
          vals,
        );
        if (affected === 0) throw new NotFoundException(`AQL inspection ${id} not found`);
      } else {
        const e = await tx.query<{ id: string }>(
          `SELECT id FROM aql_inspections WHERE id = $1::uuid`,
          [id],
        );
        if (e.length === 0) throw new NotFoundException(`AQL inspection ${id} not found`);
      }
      if (dto.defects !== undefined) {
        await tx.exec(`DELETE FROM aql_inspection_defects WHERE inspection_id = $1::uuid`, [id]);
        for (const d of dto.defects) {
          await tx.exec(
            `INSERT INTO aql_inspection_defects (inspection_id, defect_code_id, quantity, severity, notes)
             VALUES ($1::uuid, $2::uuid, $3, COALESCE($4, 'minor'), $5)`,
            [id, d.defectCodeId, d.quantity, d.severity ?? null, d.notes ?? null],
          );
        }
      }
      // Recompute result if defect total or thresholds changed
      const totals = await tx.query<{
        critical: string;
        major: string;
        minor: string;
        accept: string;
      }>(
        `SELECT critical_defects::text AS critical, major_defects::text AS major,
                minor_defects::text AS minor, accept_threshold::text AS accept
           FROM aql_inspections WHERE id = $1::uuid`,
        [id],
      );
      if (totals[0]) {
        const totalDefective =
          Number(totals[0].critical) + Number(totals[0].major) + Number(totals[0].minor);
        const accept = Number(totals[0].accept);
        const result = totalDefective <= accept ? 'pass' : 'fail';
        await tx.exec(`UPDATE aql_inspections SET result = $1 WHERE id = $2::uuid`, [result, id]);
      }
    });
    return this.findAqlInspection(id);
  }

  async removeAqlInspection(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM aql_inspections WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`AQL inspection ${id} not found`);
  }

  /**
   * Quote AQL accept/reject thresholds for a given lot size + AQL level
   * without persisting an inspection. Used by the Angular form to preview.
   */
  quoteAqlPlan(lotSize: number, aqlLevel = 2.5): {
    sampleSize: number;
    accept: number;
    reject: number;
  } {
    return computeAqlPlan(lotSize, aqlLevel);
  }

  private assembleAql(
    row: Record<string, unknown>,
    allDefects: Record<string, unknown>[],
  ): AqlInspection {
    const head = camelize(row) as unknown as Omit<AqlInspection, 'defects'>;
    const defects: AqlInspectionDefect[] = allDefects
      .filter((d) => d['inspection_id'] === row['id'])
      .map((d) => {
        const c = camelize(d) as Record<string, unknown>;
        return {
          ...(c as unknown as AqlInspectionDefect),
          quantity: Number(c['quantity']),
        };
      });
    return {
      ...head,
      aqlLevel: Number(head.aqlLevel),
      lotSize: Number(head.lotSize),
      sampleSize: Number(head.sampleSize),
      acceptThreshold: Number(head.acceptThreshold),
      rejectThreshold: Number(head.rejectThreshold),
      criticalDefects: Number(head.criticalDefects),
      majorDefects: Number(head.majorDefects),
      minorDefects: Number(head.minorDefects),
      defects,
    };
  }

  // ============= DHU Dashboard =============

  /**
   * Per-line DHU summary for a date.
   * DHU = (defectQuantity / inspectedQuantity) × 100
   */
  async dhuBoard(date?: string): Promise<DhuLineSummary[]> {
    const logDate = date ?? new Date().toISOString().slice(0, 10);
    const rows = await this.query<Record<string, unknown>>(
      `SELECT sl.id AS line_id, sl.code AS line_code, sl.name AS line_name,
              COALESCE(SUM(elqc.inspected_quantity), 0)::text AS inspected,
              COALESCE(SUM(elqc.defect_quantity), 0)::text AS defects,
              COALESCE(SUM(elqc.rework_quantity), 0)::text AS rework,
              COALESCE(SUM(elqc.reject_quantity), 0)::text AS reject
         FROM sewing_lines sl
         LEFT JOIN end_line_qc_records elqc
           ON elqc.line_id = sl.id AND elqc.log_date = $1::date
        WHERE sl.is_active = TRUE
        GROUP BY sl.id, sl.code, sl.name
        ORDER BY sl.code`,
      [logDate],
    );
    return rows.map((r) => {
      const inspected = Number(r['inspected']);
      const defects = Number(r['defects']);
      const dhu = inspected > 0 ? Number(((defects / inspected) * 100).toFixed(2)) : 0;
      const defectRatePct = dhu;
      return {
        lineId: r['line_id'] as string,
        lineCode: r['line_code'] as string,
        lineName: r['line_name'] as string,
        inspectedQuantity: inspected,
        defectQuantity: defects,
        reworkQuantity: Number(r['rework']),
        rejectQuantity: Number(r['reject']),
        dhu,
        defectRatePct,
      };
    });
  }
}
