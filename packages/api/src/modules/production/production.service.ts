import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Bundle,
  CuttingPlan,
  CuttingPlanItem,
  HourlyBoardLineSummary,
  HourlyProductionLog,
  LineAssignment,
  SewingLine,
} from '@org/shared-types';
import { TenantRepository, TenantTx } from '../../core/database/tenant-repository';
import { camelize } from '../masters/sql.util';
import {
  CreateCuttingPlanDto,
  CreateCuttingPlanItemDto,
  UpdateCuttingPlanDto,
} from './dto/cutting-plan.dto';
import {
  CreateLineAssignmentDto,
  CreateSewingLineDto,
  UpdateLineAssignmentDto,
  UpdateSewingLineDto,
} from './dto/sewing-line.dto';
import { CreateBundleDto, ScanBundleDto, UpdateBundleDto } from './dto/bundle.dto';
import { UpsertHourlyLogDto } from './dto/hourly-log.dto';

@Injectable()
export class ProductionService extends TenantRepository {
  // ============= Cutting Plans =============

  async listPlans(): Promise<CuttingPlan[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT cp.*, s.code AS style_code, s.name AS style_name,
              bo.order_number AS buyer_order_number, sl.lot_number AS fabric_lot_number
         FROM cutting_plans cp
         JOIN styles s ON s.id = cp.style_id
         LEFT JOIN buyer_orders bo ON bo.id = cp.buyer_order_id
         LEFT JOIN stock_lots sl ON sl.id = cp.fabric_lot_id
        ORDER BY cp.plan_date DESC, cp.created_at DESC`,
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r['id'] as string);
    const itemRows = await this.query<Record<string, unknown>>(
      `SELECT * FROM cutting_plan_items WHERE plan_id = ANY($1::uuid[]) ORDER BY sort_order, created_at`,
      [ids],
    );
    return rows.map((r) => this.assemblePlan(r, itemRows));
  }

  async findPlan(id: string): Promise<CuttingPlan> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT cp.*, s.code AS style_code, s.name AS style_name,
              bo.order_number AS buyer_order_number, sl.lot_number AS fabric_lot_number
         FROM cutting_plans cp
         JOIN styles s ON s.id = cp.style_id
         LEFT JOIN buyer_orders bo ON bo.id = cp.buyer_order_id
         LEFT JOIN stock_lots sl ON sl.id = cp.fabric_lot_id
        WHERE cp.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Cutting plan ${id} not found`);
    const itemRows = await this.query<Record<string, unknown>>(
      `SELECT * FROM cutting_plan_items WHERE plan_id = $1::uuid ORDER BY sort_order, created_at`,
      [id],
    );
    return this.assemblePlan(rows[0], itemRows);
  }

  async createPlan(dto: CreateCuttingPlanDto): Promise<CuttingPlan> {
    const target = dto.targetQuantity ?? dto.items.reduce((s, i) => s + Number(i.targetQuantity), 0);
    const id = await this.withTx(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        `INSERT INTO cutting_plans (plan_number, style_id, buyer_order_id, plan_date,
            target_quantity, fabric_lot_id, marker_efficiency_pct, status, notes)
         VALUES ($1, $2::uuid, $3::uuid, COALESCE($4::date, CURRENT_DATE),
            $5, $6::uuid, $7, $8, $9) RETURNING id`,
        [
          dto.planNumber,
          dto.styleId,
          dto.buyerOrderId ?? null,
          dto.planDate ?? null,
          target,
          dto.fabricLotId ?? null,
          dto.markerEfficiencyPct ?? null,
          dto.status ?? 'planned',
          dto.notes ?? null,
        ],
      );
      const planId = rows[0].id;
      for (const it of dto.items) await this.insertPlanItem(tx, planId, it);
      return planId;
    });
    return this.findPlan(id);
  }

  async updatePlan(id: string, dto: UpdateCuttingPlanDto): Promise<CuttingPlan> {
    await this.withTx(async (tx) => {
      const sets: string[] = [];
      const vals: unknown[] = [];
      const push = (col: string, val: unknown, cast?: string) => {
        vals.push(val);
        sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
      };
      if (dto.buyerOrderId !== undefined) push('buyer_order_id', dto.buyerOrderId, 'uuid');
      if (dto.planDate !== undefined) push('plan_date', dto.planDate, 'date');
      if (dto.targetQuantity !== undefined) push('target_quantity', dto.targetQuantity);
      if (dto.fabricLotId !== undefined) push('fabric_lot_id', dto.fabricLotId, 'uuid');
      if (dto.markerEfficiencyPct !== undefined)
        push('marker_efficiency_pct', dto.markerEfficiencyPct);
      if (dto.status !== undefined) push('status', dto.status);
      if (dto.notes !== undefined) push('notes', dto.notes);
      if (sets.length > 0) {
        vals.push(id);
        const affected = await tx.exec(
          `UPDATE cutting_plans SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
          vals,
        );
        if (affected === 0) throw new NotFoundException(`Cutting plan ${id} not found`);
      } else {
        const e = await tx.query<{ id: string }>(
          `SELECT id FROM cutting_plans WHERE id = $1::uuid`,
          [id],
        );
        if (e.length === 0) throw new NotFoundException(`Cutting plan ${id} not found`);
      }
      if (dto.items !== undefined) {
        await tx.exec(`DELETE FROM cutting_plan_items WHERE plan_id = $1::uuid`, [id]);
        for (const it of dto.items) await this.insertPlanItem(tx, id, it);
      }
    });
    return this.findPlan(id);
  }

  async removePlan(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM cutting_plans WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Cutting plan ${id} not found`);
  }

  private async insertPlanItem(
    tx: TenantTx,
    planId: string,
    it: CreateCuttingPlanItemDto,
  ): Promise<void> {
    await tx.exec(
      `INSERT INTO cutting_plan_items (plan_id, size_label, color, target_quantity, cut_quantity, sort_order)
       VALUES ($1::uuid, $2, $3, $4, $5, $6)`,
      [
        planId,
        it.sizeLabel,
        it.color ?? null,
        it.targetQuantity,
        it.cutQuantity ?? 0,
        it.sortOrder ?? 0,
      ],
    );
  }

  private assemblePlan(
    row: Record<string, unknown>,
    allItems: Record<string, unknown>[],
  ): CuttingPlan {
    const head = camelize(row) as unknown as Omit<CuttingPlan, 'items'>;
    const items: CuttingPlanItem[] = allItems
      .filter((it) => it['plan_id'] === row['id'])
      .map((it) => {
        const c = camelize(it) as Record<string, unknown>;
        return {
          ...(c as unknown as CuttingPlanItem),
          targetQuantity: Number(c['targetQuantity']),
          cutQuantity: Number(c['cutQuantity']),
        };
      });
    return {
      ...head,
      targetQuantity: Number(head.targetQuantity),
      cutQuantity: Number(head.cutQuantity),
      markerEfficiencyPct:
        head.markerEfficiencyPct != null ? Number(head.markerEfficiencyPct) : null,
      items,
    };
  }

  // ============= Sewing Lines =============

  async listLines(): Promise<SewingLine[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM sewing_lines ORDER BY code`,
    );
    return rows.map((r) => {
      const c = camelize(r) as Record<string, unknown>;
      return {
        ...(c as unknown as SewingLine),
        capacityPcsPerHour: Number(c['capacityPcsPerHour']),
      };
    });
  }

  async findLine(id: string): Promise<SewingLine> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM sewing_lines WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Line ${id} not found`);
    const c = camelize(rows[0]) as Record<string, unknown>;
    return {
      ...(c as unknown as SewingLine),
      capacityPcsPerHour: Number(c['capacityPcsPerHour']),
    };
  }

  async createLine(dto: CreateSewingLineDto): Promise<SewingLine> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO sewing_lines (code, name, capacity_pcs_per_hour, operator_count, helper_count, supervisor, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE)) RETURNING id`,
      [
        dto.code,
        dto.name,
        dto.capacityPcsPerHour ?? 0,
        dto.operatorCount ?? 0,
        dto.helperCount ?? 0,
        dto.supervisor ?? null,
        dto.isActive ?? null,
      ],
    );
    return this.findLine(rows[0].id);
  }

  async updateLine(id: string, dto: UpdateSewingLineDto): Promise<SewingLine> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown) => {
      vals.push(val);
      sets.push(`${col} = $${vals.length}`);
    };
    if (dto.name !== undefined) push('name', dto.name);
    if (dto.capacityPcsPerHour !== undefined) push('capacity_pcs_per_hour', dto.capacityPcsPerHour);
    if (dto.operatorCount !== undefined) push('operator_count', dto.operatorCount);
    if (dto.helperCount !== undefined) push('helper_count', dto.helperCount);
    if (dto.supervisor !== undefined) push('supervisor', dto.supervisor);
    if (dto.isActive !== undefined) push('is_active', dto.isActive);
    if (sets.length === 0) return this.findLine(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE sewing_lines SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Line ${id} not found`);
    return this.findLine(id);
  }

  async removeLine(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM sewing_lines WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Line ${id} not found`);
  }

  // ============= Line Assignments =============

  async listAssignments(): Promise<LineAssignment[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT la.*, sl.code AS line_code, st.code AS style_code, st.name AS style_name
         FROM line_assignments la
         JOIN sewing_lines sl ON sl.id = la.line_id
         JOIN styles st ON st.id = la.style_id
        ORDER BY la.started_at DESC`,
    );
    return rows.map((r) => {
      const c = camelize(r) as Record<string, unknown>;
      return {
        ...(c as unknown as LineAssignment),
        targetPcsPerHour: c['targetPcsPerHour'] != null ? Number(c['targetPcsPerHour']) : null,
        sam: c['sam'] != null ? Number(c['sam']) : null,
      };
    });
  }

  async createAssignment(dto: CreateLineAssignmentDto): Promise<LineAssignment> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO line_assignments (line_id, style_id, buyer_order_id, target_pcs_per_hour, sam, started_at, status, notes)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, COALESCE($6::timestamptz, now()), $7, $8) RETURNING id`,
      [
        dto.lineId,
        dto.styleId,
        dto.buyerOrderId ?? null,
        dto.targetPcsPerHour ?? null,
        dto.sam ?? null,
        dto.startedAt ?? null,
        dto.status ?? 'active',
        dto.notes ?? null,
      ],
    );
    return (await this.listAssignments()).find((a) => a.id === rows[0].id)!;
  }

  async updateAssignment(id: string, dto: UpdateLineAssignmentDto): Promise<LineAssignment> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.buyerOrderId !== undefined) push('buyer_order_id', dto.buyerOrderId, 'uuid');
    if (dto.targetPcsPerHour !== undefined) push('target_pcs_per_hour', dto.targetPcsPerHour);
    if (dto.sam !== undefined) push('sam', dto.sam);
    if (dto.startedAt !== undefined) push('started_at', dto.startedAt, 'timestamptz');
    if (dto.endedAt !== undefined) push('ended_at', dto.endedAt, 'timestamptz');
    if (dto.status !== undefined) push('status', dto.status);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (sets.length === 0) {
      const list = await this.listAssignments();
      const found = list.find((a) => a.id === id);
      if (!found) throw new NotFoundException(`Assignment ${id} not found`);
      return found;
    }
    vals.push(id);
    const affected = await this.exec(
      `UPDATE line_assignments SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Assignment ${id} not found`);
    const list = await this.listAssignments();
    return list.find((a) => a.id === id)!;
  }

  async removeAssignment(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM line_assignments WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Assignment ${id} not found`);
  }

  // ============= Bundles =============

  async listBundles(planId?: string): Promise<Bundle[]> {
    const rows = planId
      ? await this.query<Record<string, unknown>>(
          `SELECT b.*, cp.plan_number AS cutting_plan_number, sl.code AS line_code
             FROM bundles b
             JOIN cutting_plans cp ON cp.id = b.cutting_plan_id
             LEFT JOIN sewing_lines sl ON sl.id = b.line_id
            WHERE b.cutting_plan_id = $1::uuid
            ORDER BY b.cut_at DESC`,
          [planId],
        )
      : await this.query<Record<string, unknown>>(
          `SELECT b.*, cp.plan_number AS cutting_plan_number, sl.code AS line_code
             FROM bundles b
             JOIN cutting_plans cp ON cp.id = b.cutting_plan_id
             LEFT JOIN sewing_lines sl ON sl.id = b.line_id
            ORDER BY b.cut_at DESC LIMIT 500`,
        );
    return rows.map((r) => this.toBundle(r));
  }

  async createBundle(dto: CreateBundleDto): Promise<Bundle> {
    const qrCode = dto.qrCode ?? `BDL:${dto.bundleNumber}`;
    const rows = await this.query<{ id: string }>(
      `INSERT INTO bundles (bundle_number, qr_code, cutting_plan_id, line_id, size_label, color, quantity, status, notes)
       VALUES ($1, $2, $3::uuid, $4::uuid, $5, $6, $7, $8, $9) RETURNING id`,
      [
        dto.bundleNumber,
        qrCode,
        dto.cuttingPlanId,
        dto.lineId ?? null,
        dto.sizeLabel,
        dto.color ?? null,
        dto.quantity,
        dto.status ?? 'cut',
        dto.notes ?? null,
      ],
    );
    return this.findBundle(rows[0].id);
  }

  async findBundle(id: string): Promise<Bundle> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT b.*, cp.plan_number AS cutting_plan_number, sl.code AS line_code
         FROM bundles b
         JOIN cutting_plans cp ON cp.id = b.cutting_plan_id
         LEFT JOIN sewing_lines sl ON sl.id = b.line_id
        WHERE b.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Bundle ${id} not found`);
    return this.toBundle(rows[0]);
  }

  async updateBundle(id: string, dto: UpdateBundleDto): Promise<Bundle> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.qrCode !== undefined) push('qr_code', dto.qrCode);
    if (dto.lineId !== undefined) push('line_id', dto.lineId, 'uuid');
    if (dto.sizeLabel !== undefined) push('size_label', dto.sizeLabel);
    if (dto.color !== undefined) push('color', dto.color);
    if (dto.quantity !== undefined) push('quantity', dto.quantity);
    if (dto.status !== undefined) {
      push('status', dto.status);
      if (dto.status === 'in_sewing') push('sewing_started_at', new Date().toISOString(), 'timestamptz');
      if (dto.status === 'sewn') push('sewing_completed_at', new Date().toISOString(), 'timestamptz');
    }
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (sets.length === 0) return this.findBundle(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE bundles SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Bundle ${id} not found`);
    return this.findBundle(id);
  }

  async removeBundle(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM bundles WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Bundle ${id} not found`);
  }

  /**
   * Scan a QR code → mark bundle as in_sewing/sewn/etc., optionally bind to a sewing line.
   */
  async scanBundle(dto: ScanBundleDto): Promise<Bundle> {
    const found = await this.query<{ id: string }>(
      `SELECT id FROM bundles WHERE qr_code = $1 LIMIT 1`,
      [dto.qrCode],
    );
    if (found.length === 0) throw new NotFoundException(`Bundle for QR "${dto.qrCode}" not found`);
    return this.updateBundle(found[0].id, { status: dto.status, lineId: dto.lineId });
  }

  private toBundle(row: Record<string, unknown>): Bundle {
    const c = camelize(row) as Record<string, unknown>;
    return {
      ...(c as unknown as Bundle),
      quantity: Number(c['quantity']),
    };
  }

  // ============= Hourly Logs =============

  async upsertHourlyLog(dto: UpsertHourlyLogDto): Promise<HourlyProductionLog> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO hourly_production_logs (line_id, style_id, log_date, hour_slot, target_pcs, produced_pcs, rejected_pcs, notes)
       VALUES ($1::uuid, $2::uuid, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7, $8)
       ON CONFLICT (line_id, log_date, hour_slot) DO UPDATE SET
         style_id = COALESCE(EXCLUDED.style_id, hourly_production_logs.style_id),
         target_pcs = EXCLUDED.target_pcs,
         produced_pcs = EXCLUDED.produced_pcs,
         rejected_pcs = EXCLUDED.rejected_pcs,
         notes = EXCLUDED.notes
       RETURNING id`,
      [
        dto.lineId,
        dto.styleId ?? null,
        dto.logDate ?? null,
        dto.hourSlot,
        dto.targetPcs ?? 0,
        dto.producedPcs,
        dto.rejectedPcs ?? 0,
        dto.notes ?? null,
      ],
    );
    return this.findLog(rows[0].id);
  }

  private async findLog(id: string): Promise<HourlyProductionLog> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT hpl.*, sl.code AS line_code, st.code AS style_code
         FROM hourly_production_logs hpl
         JOIN sewing_lines sl ON sl.id = hpl.line_id
         LEFT JOIN styles st ON st.id = hpl.style_id
        WHERE hpl.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Log ${id} not found`);
    return this.toLog(rows[0]);
  }

  async listLogs(lineId: string, logDate?: string): Promise<HourlyProductionLog[]> {
    const date = logDate ?? new Date().toISOString().slice(0, 10);
    const rows = await this.query<Record<string, unknown>>(
      `SELECT hpl.*, sl.code AS line_code, st.code AS style_code
         FROM hourly_production_logs hpl
         JOIN sewing_lines sl ON sl.id = hpl.line_id
         LEFT JOIN styles st ON st.id = hpl.style_id
        WHERE hpl.line_id = $1::uuid AND hpl.log_date = $2::date
        ORDER BY hpl.hour_slot`,
      [lineId, date],
    );
    return rows.map((r) => this.toLog(r));
  }

  /**
   * Returns aggregated per-line summary for the given date (default: today).
   * Used by the live hourly board UI.
   */
  async hourlyBoard(date?: string): Promise<HourlyBoardLineSummary[]> {
    const logDate = date ?? new Date().toISOString().slice(0, 10);
    const lineRows = await this.query<Record<string, unknown>>(
      `SELECT id, code, name FROM sewing_lines WHERE is_active = TRUE ORDER BY code`,
    );
    const summaries: HourlyBoardLineSummary[] = [];
    for (const lr of lineRows) {
      const lineId = lr['id'] as string;
      const logs = await this.listLogs(lineId, logDate);
      const totalTarget = logs.reduce((s, l) => s + Number(l.targetPcs), 0);
      const totalProduced = logs.reduce((s, l) => s + Number(l.producedPcs), 0);
      const totalRejected = logs.reduce((s, l) => s + Number(l.rejectedPcs), 0);
      const efficiencyPct = totalTarget > 0 ? Number(((totalProduced / totalTarget) * 100).toFixed(2)) : 0;
      const styleCode = logs.find((l) => l.styleCode)?.styleCode;
      summaries.push({
        lineId,
        lineCode: lr['code'] as string,
        lineName: lr['name'] as string,
        styleCode,
        totalTarget,
        totalProduced,
        totalRejected,
        efficiencyPct,
        hours: logs,
      });
    }
    return summaries;
  }

  private toLog(row: Record<string, unknown>): HourlyProductionLog {
    const c = camelize(row) as Record<string, unknown>;
    return {
      ...(c as unknown as HourlyProductionLog),
      hourSlot: Number(c['hourSlot']),
      targetPcs: Number(c['targetPcs']),
      producedPcs: Number(c['producedPcs']),
      rejectedPcs: Number(c['rejectedPcs']),
    };
  }
}
