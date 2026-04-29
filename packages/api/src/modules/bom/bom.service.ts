import { Injectable, NotFoundException } from '@nestjs/common';
import type { BomLine, CostingSheet } from '@org/shared-types';
import { TenantRepository } from '../../core/database/tenant-repository';
import { CreateBomLineDto, UpdateBomLineDto } from './dto/bom-line.dto';
import { UpsertCostingSheetDto } from './dto/costing.dto';
import { camelize } from '../masters/sql.util';

@Injectable()
export class BomService extends TenantRepository {
  async listForStyle(styleId: string): Promise<BomLine[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT b.*, i.code AS item_code, i.name AS item_name, i.category AS item_category,
              i.standard_cost AS item_standard_cost, i.currency_code AS item_currency_code
         FROM bom_consumption b
         JOIN items i ON i.id = b.item_id
        WHERE b.style_id = $1::uuid
        ORDER BY i.category, i.name`,
      [styleId],
    );
    return rows.map((r) => this.decorateLine(r));
  }

  async createLine(dto: CreateBomLineDto): Promise<BomLine> {
    const rows = await this.query<Record<string, unknown>>(
      `INSERT INTO bom_consumption (style_id, item_id, quantity_per_unit, wastage_pct, uom, notes)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
       ON CONFLICT (style_id, item_id) DO UPDATE
         SET quantity_per_unit = EXCLUDED.quantity_per_unit,
             wastage_pct = EXCLUDED.wastage_pct,
             uom = EXCLUDED.uom,
             notes = EXCLUDED.notes
       RETURNING *`,
      [
        dto.styleId,
        dto.itemId,
        dto.quantityPerUnit,
        dto.wastagePct ?? 0,
        dto.uom ?? 'pcs',
        dto.notes ?? null,
      ],
    );
    return this.findOne(rows[0]['id'] as string);
  }

  async updateLine(id: string, dto: UpdateBomLineDto): Promise<BomLine> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (dto.quantityPerUnit !== undefined) {
      vals.push(dto.quantityPerUnit);
      sets.push(`quantity_per_unit = $${vals.length}`);
    }
    if (dto.wastagePct !== undefined) {
      vals.push(dto.wastagePct);
      sets.push(`wastage_pct = $${vals.length}`);
    }
    if (dto.uom !== undefined) {
      vals.push(dto.uom);
      sets.push(`uom = $${vals.length}`);
    }
    if (dto.notes !== undefined) {
      vals.push(dto.notes);
      sets.push(`notes = $${vals.length}`);
    }
    if (sets.length === 0) return this.findOne(id);
    vals.push(id);
    const rows = await this.query<Record<string, unknown>>(
      `UPDATE bom_consumption SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid RETURNING id`,
      vals,
    );
    if (rows.length === 0) throw new NotFoundException(`BOM line ${id} not found`);
    return this.findOne(id);
  }

  async removeLine(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM bom_consumption WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`BOM line ${id} not found`);
  }

  async findOne(id: string): Promise<BomLine> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT b.*, i.code AS item_code, i.name AS item_name, i.category AS item_category,
              i.standard_cost AS item_standard_cost, i.currency_code AS item_currency_code
         FROM bom_consumption b
         JOIN items i ON i.id = b.item_id
        WHERE b.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`BOM line ${id} not found`);
    return this.decorateLine(rows[0]);
  }

  async getCosting(styleId: string): Promise<CostingSheet> {
    const sheets = await this.query<Record<string, unknown>>(
      `SELECT * FROM costing_sheets WHERE style_id = $1::uuid`,
      [styleId],
    );
    const lines = await this.listForStyle(styleId);
    const materialCost = lines.reduce((s, l) => s + (l.lineCost ?? 0), 0);

    let sheet: Omit<CostingSheet, 'bomLines' | 'materialCost' | 'subtotal' | 'fobPrice'>;
    if (sheets.length === 0) {
      const created = await this.query<Record<string, unknown>>(
        `INSERT INTO costing_sheets (style_id) VALUES ($1::uuid) RETURNING *`,
        [styleId],
      );
      sheet = camelize(created[0]) as unknown as typeof sheet;
    } else {
      sheet = camelize(sheets[0]) as unknown as typeof sheet;
    }
    return this.assembleCosting(sheet, lines, materialCost);
  }

  async upsertCosting(dto: UpsertCostingSheetDto): Promise<CostingSheet> {
    await this.query(
      `INSERT INTO costing_sheets (style_id, currency_code, cm_cost, overhead_cost, commercial_cost, profit_pct, notes)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (style_id) DO UPDATE
         SET currency_code = EXCLUDED.currency_code,
             cm_cost = EXCLUDED.cm_cost,
             overhead_cost = EXCLUDED.overhead_cost,
             commercial_cost = EXCLUDED.commercial_cost,
             profit_pct = EXCLUDED.profit_pct,
             notes = EXCLUDED.notes
       RETURNING id`,
      [
        dto.styleId,
        dto.currencyCode ?? 'USD',
        dto.cmCost ?? 0,
        dto.overheadCost ?? 0,
        dto.commercialCost ?? 0,
        dto.profitPct ?? 0,
        dto.notes ?? null,
      ],
    );
    return this.getCosting(dto.styleId);
  }

  private decorateLine(row: Record<string, unknown>): BomLine {
    const camel = camelize(row) as Record<string, unknown> & {
      itemStandardCost?: unknown;
      quantityPerUnit?: unknown;
      wastagePct?: unknown;
    };
    const qty = Number(camel['quantityPerUnit'] ?? 0);
    const waste = Number(camel['wastagePct'] ?? 0);
    const stdCost = camel['itemStandardCost'] != null ? Number(camel['itemStandardCost']) : 0;
    const effective = qty * (1 + waste / 100);
    const lineCost = effective * stdCost;
    return {
      ...(camel as unknown as BomLine),
      effectiveQuantity: Number(effective.toFixed(6)),
      lineCost: Number(lineCost.toFixed(4)),
    };
  }

  private assembleCosting(
    sheet: Omit<CostingSheet, 'bomLines' | 'materialCost' | 'subtotal' | 'fobPrice'>,
    lines: BomLine[],
    materialCost: number,
  ): CostingSheet {
    const cm = Number(sheet.cmCost ?? 0);
    const overhead = Number(sheet.overheadCost ?? 0);
    const commercial = Number(sheet.commercialCost ?? 0);
    const profit = Number(sheet.profitPct ?? 0);
    const subtotal = materialCost + cm + overhead + commercial;
    const fob = subtotal * (1 + profit / 100);
    return {
      ...sheet,
      cmCost: cm,
      overheadCost: overhead,
      commercialCost: commercial,
      profitPct: profit,
      bomLines: lines,
      materialCost: Number(materialCost.toFixed(4)),
      subtotal: Number(subtotal.toFixed(4)),
      fobPrice: Number(fob.toFixed(4)),
    };
  }
}
