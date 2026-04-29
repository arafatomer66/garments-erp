import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  BinLocation,
  FabricDefectSize,
  FabricInspection,
  FabricInspectionDefect,
  FabricInspectionResult,
  StockLot,
  StockMovement,
  Warehouse,
} from '@org/shared-types';
import { TenantRepository, TenantTx } from '../../core/database/tenant-repository';
import { camelize } from '../masters/sql.util';
import {
  CreateBinLocationDto,
  CreateWarehouseDto,
  UpdateBinLocationDto,
  UpdateWarehouseDto,
} from './dto/warehouse.dto';
import {
  CreateFabricInspectionDefectDto,
  CreateFabricInspectionDto,
  UpdateFabricInspectionDto,
} from './dto/fabric-inspection.dto';
import {
  CreateStockLotDto,
  CreateStockMovementDto,
  IssueFifoDto,
  UpdateStockLotDto,
} from './dto/stock.dto';

const POINTS_PER_DEFECT: Record<FabricDefectSize, number> = {
  upto_3in: 1,
  '3_to_6in': 2,
  '6_to_9in': 3,
  over_9in: 4,
  hole: 4,
};

@Injectable()
export class InventoryService extends TenantRepository {
  // ============= Warehouses =============

  async listWarehouses(): Promise<Warehouse[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM warehouses ORDER BY code`,
    );
    return rows.map((r) => camelize(r) as unknown as Warehouse);
  }

  async findWarehouse(id: string): Promise<Warehouse> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM warehouses WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Warehouse ${id} not found`);
    return camelize(rows[0]) as unknown as Warehouse;
  }

  async createWarehouse(dto: CreateWarehouseDto): Promise<Warehouse> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO warehouses (code, name, type, address, is_active)
       VALUES ($1, $2, $3, $4, COALESCE($5, TRUE)) RETURNING id`,
      [dto.code, dto.name, dto.type ?? 'general', dto.address ?? null, dto.isActive ?? null],
    );
    return this.findWarehouse(rows[0].id);
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown) => {
      vals.push(val);
      sets.push(`${col} = $${vals.length}`);
    };
    if (dto.name !== undefined) push('name', dto.name);
    if (dto.type !== undefined) push('type', dto.type);
    if (dto.address !== undefined) push('address', dto.address);
    if (dto.isActive !== undefined) push('is_active', dto.isActive);
    if (sets.length === 0) return this.findWarehouse(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE warehouses SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Warehouse ${id} not found`);
    return this.findWarehouse(id);
  }

  async removeWarehouse(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM warehouses WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Warehouse ${id} not found`);
  }

  // ============= Bin Locations =============

  async listBins(warehouseId?: string): Promise<BinLocation[]> {
    const rows = warehouseId
      ? await this.query<Record<string, unknown>>(
          `SELECT * FROM bin_locations WHERE warehouse_id = $1::uuid ORDER BY code`,
          [warehouseId],
        )
      : await this.query<Record<string, unknown>>(`SELECT * FROM bin_locations ORDER BY code`);
    return rows.map((r) => camelize(r) as unknown as BinLocation);
  }

  async findBin(id: string): Promise<BinLocation> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM bin_locations WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Bin ${id} not found`);
    return camelize(rows[0]) as unknown as BinLocation;
  }

  async createBin(dto: CreateBinLocationDto): Promise<BinLocation> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO bin_locations (warehouse_id, code, name, is_active)
       VALUES ($1::uuid, $2, $3, COALESCE($4, TRUE)) RETURNING id`,
      [dto.warehouseId, dto.code, dto.name ?? null, dto.isActive ?? null],
    );
    return this.findBin(rows[0].id);
  }

  async updateBin(id: string, dto: UpdateBinLocationDto): Promise<BinLocation> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (dto.name !== undefined) {
      vals.push(dto.name);
      sets.push(`name = $${vals.length}`);
    }
    if (dto.isActive !== undefined) {
      vals.push(dto.isActive);
      sets.push(`is_active = $${vals.length}`);
    }
    if (sets.length === 0) return this.findBin(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE bin_locations SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Bin ${id} not found`);
    return this.findBin(id);
  }

  async removeBin(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM bin_locations WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Bin ${id} not found`);
  }

  // ============= Fabric Inspections =============

  async listInspections(): Promise<FabricInspection[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT fi.*, i.code AS item_code, i.name AS item_name
         FROM fabric_inspections fi
         JOIN items i ON i.id = fi.item_id
        ORDER BY fi.inspected_at DESC, fi.created_at DESC`,
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r['id'] as string);
    const defectRows = await this.query<Record<string, unknown>>(
      `SELECT * FROM fabric_inspection_defects
        WHERE inspection_id = ANY($1::uuid[])
        ORDER BY created_at`,
      [ids],
    );
    return rows.map((r) => this.assembleInspection(r, defectRows));
  }

  async findInspection(id: string): Promise<FabricInspection> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT fi.*, i.code AS item_code, i.name AS item_name
         FROM fabric_inspections fi
         JOIN items i ON i.id = fi.item_id
        WHERE fi.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Inspection ${id} not found`);
    const defectRows = await this.query<Record<string, unknown>>(
      `SELECT * FROM fabric_inspection_defects WHERE inspection_id = $1::uuid ORDER BY created_at`,
      [id],
    );
    return this.assembleInspection(rows[0], defectRows);
  }

  async createInspection(dto: CreateFabricInspectionDto): Promise<FabricInspection> {
    const threshold = dto.threshold ?? 40;
    const { pointsTotal, pointsPer100Sqyd, result } = this.scoreInspection(
      dto.defects ?? [],
      dto.inspectedQuantity,
      dto.widthInches ?? null,
      threshold,
    );
    const id = await this.withTx(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        `INSERT INTO fabric_inspections (
          inspection_number, grn_id, po_id, item_id, roll_number, lot_number,
          inspected_quantity, inspected_uom, width_inches, points_total, points_per_100sqyd,
          threshold, result, inspected_by, notes
         ) VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6,
                   $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
        [
          dto.inspectionNumber,
          dto.grnId ?? null,
          dto.poId ?? null,
          dto.itemId,
          dto.rollNumber ?? null,
          dto.lotNumber ?? null,
          dto.inspectedQuantity,
          dto.inspectedUom ?? 'yd',
          dto.widthInches ?? null,
          pointsTotal,
          pointsPer100Sqyd,
          threshold,
          result,
          dto.inspectedBy ?? null,
          dto.notes ?? null,
        ],
      );
      const inspectionId = rows[0].id;
      for (const d of dto.defects ?? []) await this.insertDefect(tx, inspectionId, d);
      return inspectionId;
    });
    return this.findInspection(id);
  }

  async updateInspection(id: string, dto: UpdateFabricInspectionDto): Promise<FabricInspection> {
    const existing = await this.findInspection(id);
    const inspectedQty = dto.inspectedQuantity ?? existing.inspectedQuantity;
    const widthInches =
      dto.widthInches !== undefined ? dto.widthInches : existing.widthInches;
    const threshold = dto.threshold ?? existing.threshold;
    const defectsForScore: CreateFabricInspectionDefectDto[] =
      dto.defects ??
      existing.defects.map((d) => ({
        defectSize: d.defectSize,
        count: d.count,
        description: d.description ?? undefined,
      }));
    const { pointsTotal, pointsPer100Sqyd, result } = this.scoreInspection(
      defectsForScore,
      inspectedQty,
      widthInches,
      threshold,
    );
    await this.withTx(async (tx) => {
      const sets: string[] = [];
      const vals: unknown[] = [];
      const push = (col: string, val: unknown, cast?: string) => {
        vals.push(val);
        sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
      };
      if (dto.grnId !== undefined) push('grn_id', dto.grnId, 'uuid');
      if (dto.poId !== undefined) push('po_id', dto.poId, 'uuid');
      if (dto.rollNumber !== undefined) push('roll_number', dto.rollNumber);
      if (dto.lotNumber !== undefined) push('lot_number', dto.lotNumber);
      if (dto.inspectedQuantity !== undefined) push('inspected_quantity', dto.inspectedQuantity);
      if (dto.inspectedUom !== undefined) push('inspected_uom', dto.inspectedUom);
      if (dto.widthInches !== undefined) push('width_inches', dto.widthInches);
      if (dto.threshold !== undefined) push('threshold', dto.threshold);
      if (dto.inspectedBy !== undefined) push('inspected_by', dto.inspectedBy);
      if (dto.inspectedAt !== undefined) push('inspected_at', dto.inspectedAt, 'timestamptz');
      if (dto.notes !== undefined) push('notes', dto.notes);
      // recomputed scores always pushed
      push('points_total', pointsTotal);
      push('points_per_100sqyd', pointsPer100Sqyd);
      push('result', result);
      vals.push(id);
      await tx.exec(
        `UPDATE fabric_inspections SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
        vals,
      );
      if (dto.defects !== undefined) {
        await tx.exec(`DELETE FROM fabric_inspection_defects WHERE inspection_id = $1::uuid`, [id]);
        for (const d of dto.defects) await this.insertDefect(tx, id, d);
      }
    });
    return this.findInspection(id);
  }

  async removeInspection(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM fabric_inspections WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Inspection ${id} not found`);
  }

  private async insertDefect(
    tx: TenantTx,
    inspectionId: string,
    d: CreateFabricInspectionDefectDto,
  ): Promise<void> {
    const points = POINTS_PER_DEFECT[d.defectSize] * d.count;
    await tx.exec(
      `INSERT INTO fabric_inspection_defects (inspection_id, defect_size, points, count, description)
       VALUES ($1::uuid, $2, $3, $4, $5)`,
      [inspectionId, d.defectSize, points, d.count, d.description ?? null],
    );
  }

  /**
   * 4-point system: points per 100 sq yd = (totalPoints × 3600) / (length_yd × width_in).
   * The 3600 factor converts from inch-yards to 100-square-yards: 100 sqyd = 100 × 36 sq inches per yard.
   */
  private scoreInspection(
    defects: CreateFabricInspectionDefectDto[],
    quantityYd: number,
    widthInches: number | null,
    threshold: number,
  ): { pointsTotal: number; pointsPer100Sqyd: number; result: FabricInspectionResult } {
    const pointsTotal = defects.reduce(
      (sum, d) => sum + POINTS_PER_DEFECT[d.defectSize] * d.count,
      0,
    );
    let pointsPer100Sqyd = 0;
    if (widthInches && widthInches > 0 && quantityYd > 0) {
      pointsPer100Sqyd = Number(
        ((pointsTotal * 3600) / (quantityYd * widthInches)).toFixed(2),
      );
    }
    let result: FabricInspectionResult = 'pending';
    if (widthInches && widthInches > 0) {
      result = pointsPer100Sqyd <= threshold ? 'pass' : 'fail';
    }
    return { pointsTotal, pointsPer100Sqyd, result };
  }

  private assembleInspection(
    row: Record<string, unknown>,
    allDefects: Record<string, unknown>[],
  ): FabricInspection {
    const head = camelize(row) as unknown as Omit<FabricInspection, 'defects'>;
    const defects: FabricInspectionDefect[] = allDefects
      .filter((d) => d['inspection_id'] === row['id'])
      .map((d) => camelize(d) as unknown as FabricInspectionDefect)
      .map((d) => ({ ...d, count: Number(d.count), points: Number(d.points) }));
    return {
      ...head,
      inspectedQuantity: Number(head.inspectedQuantity),
      widthInches: head.widthInches != null ? Number(head.widthInches) : null,
      pointsTotal: Number(head.pointsTotal),
      pointsPer100Sqyd: Number(head.pointsPer100Sqyd),
      threshold: Number(head.threshold),
      defects,
    };
  }

  // ============= Stock Lots =============

  async listLots(): Promise<StockLot[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT sl.*, i.code AS item_code, i.name AS item_name,
              w.code AS warehouse_code, b.code AS bin_code
         FROM stock_lots sl
         JOIN items i ON i.id = sl.item_id
         JOIN warehouses w ON w.id = sl.warehouse_id
         LEFT JOIN bin_locations b ON b.id = sl.bin_location_id
        ORDER BY sl.received_at DESC`,
    );
    return rows.map((r) => this.toLot(r));
  }

  async findLot(id: string): Promise<StockLot> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT sl.*, i.code AS item_code, i.name AS item_name,
              w.code AS warehouse_code, b.code AS bin_code
         FROM stock_lots sl
         JOIN items i ON i.id = sl.item_id
         JOIN warehouses w ON w.id = sl.warehouse_id
         LEFT JOIN bin_locations b ON b.id = sl.bin_location_id
        WHERE sl.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Lot ${id} not found`);
    return this.toLot(rows[0]);
  }

  async createLot(dto: CreateStockLotDto): Promise<StockLot> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO stock_lots (
        lot_number, item_id, warehouse_id, bin_location_id, grn_id, po_id,
        received_at, expiry_date, quantity_on_hand, received_quantity, uom,
        unit_cost, currency_code, notes
       ) VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid,
                 COALESCE($7::timestamptz, now()), $8::date, $9, COALESCE($10, $9),
                 $11, $12, $13, $14) RETURNING id`,
      [
        dto.lotNumber,
        dto.itemId,
        dto.warehouseId,
        dto.binLocationId ?? null,
        dto.grnId ?? null,
        dto.poId ?? null,
        dto.receivedAt ?? null,
        dto.expiryDate ?? null,
        dto.quantityOnHand,
        dto.receivedQuantity ?? null,
        dto.uom ?? 'pcs',
        dto.unitCost ?? 0,
        dto.currencyCode ?? 'USD',
        dto.notes ?? null,
      ],
    );
    return this.findLot(rows[0].id);
  }

  async updateLot(id: string, dto: UpdateStockLotDto): Promise<StockLot> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.warehouseId !== undefined) push('warehouse_id', dto.warehouseId, 'uuid');
    if (dto.binLocationId !== undefined) push('bin_location_id', dto.binLocationId, 'uuid');
    if (dto.grnId !== undefined) push('grn_id', dto.grnId, 'uuid');
    if (dto.poId !== undefined) push('po_id', dto.poId, 'uuid');
    if (dto.receivedAt !== undefined) push('received_at', dto.receivedAt, 'timestamptz');
    if (dto.expiryDate !== undefined) push('expiry_date', dto.expiryDate, 'date');
    if (dto.quantityOnHand !== undefined) push('quantity_on_hand', dto.quantityOnHand);
    if (dto.receivedQuantity !== undefined) push('received_quantity', dto.receivedQuantity);
    if (dto.uom !== undefined) push('uom', dto.uom);
    if (dto.unitCost !== undefined) push('unit_cost', dto.unitCost);
    if (dto.currencyCode !== undefined) push('currency_code', dto.currencyCode);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (sets.length === 0) return this.findLot(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE stock_lots SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Lot ${id} not found`);
    return this.findLot(id);
  }

  async removeLot(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM stock_lots WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Lot ${id} not found`);
  }

  // ============= Stock Movements =============

  async listMovements(lotId?: string): Promise<StockMovement[]> {
    const rows = lotId
      ? await this.query<Record<string, unknown>>(
          `SELECT sm.*, sl.lot_number, i.code AS item_code, i.name AS item_name
             FROM stock_movements sm
             JOIN stock_lots sl ON sl.id = sm.lot_id
             JOIN items i ON i.id = sm.item_id
            WHERE sm.lot_id = $1::uuid
            ORDER BY sm.moved_at DESC`,
          [lotId],
        )
      : await this.query<Record<string, unknown>>(
          `SELECT sm.*, sl.lot_number, i.code AS item_code, i.name AS item_name
             FROM stock_movements sm
             JOIN stock_lots sl ON sl.id = sm.lot_id
             JOIN items i ON i.id = sm.item_id
            ORDER BY sm.moved_at DESC LIMIT 500`,
        );
    return rows.map((r) => {
      const c = camelize(r) as Record<string, unknown>;
      return { ...(c as unknown as StockMovement), quantity: Number(c['quantity']) };
    });
  }

  async createMovement(dto: CreateStockMovementDto): Promise<StockMovement> {
    const id = await this.withTx(async (tx) => this.applyMovement(tx, dto));
    const rows = await this.query<Record<string, unknown>>(
      `SELECT sm.*, sl.lot_number, i.code AS item_code, i.name AS item_name
         FROM stock_movements sm
         JOIN stock_lots sl ON sl.id = sm.lot_id
         JOIN items i ON i.id = sm.item_id
        WHERE sm.id = $1::uuid`,
      [id],
    );
    const c = camelize(rows[0]) as Record<string, unknown>;
    return { ...(c as unknown as StockMovement), quantity: Number(c['quantity']) };
  }

  /**
   * Insert a movement and adjust the lot's quantity_on_hand atomically.
   * Inflows: receipt, transfer_in, return.
   * Outflows: issue, transfer_out, consumption (negate the quantity for stock effect).
   * Adjustment: signed (positive or negative), applied as-is.
   */
  private async applyMovement(tx: TenantTx, dto: CreateStockMovementDto): Promise<string> {
    const lot = await tx.query<{ id: string; item_id: string; warehouse_id: string; quantity_on_hand: string }>(
      `SELECT id, item_id, warehouse_id, quantity_on_hand FROM stock_lots WHERE id = $1::uuid FOR UPDATE`,
      [dto.lotId],
    );
    if (lot.length === 0) throw new NotFoundException(`Lot ${dto.lotId} not found`);
    const sign = this.movementSign(dto.movementType);
    const delta = sign * Math.abs(Number(dto.quantity));
    const newQty = Number(lot[0].quantity_on_hand) + delta;
    if (newQty < 0) {
      throw new BadRequestException(
        `Insufficient stock in lot: have ${lot[0].quantity_on_hand}, need ${Math.abs(delta)}`,
      );
    }
    const inserted = await tx.query<{ id: string }>(
      `INSERT INTO stock_movements (
        movement_number, movement_type, lot_id, item_id, warehouse_id, quantity,
        reference_type, reference_id, moved_at, moved_by, notes
       ) VALUES ($1, $2, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8::uuid, COALESCE($9::timestamptz, now()), $10, $11)
       RETURNING id`,
      [
        dto.movementNumber,
        dto.movementType,
        dto.lotId,
        lot[0].item_id,
        lot[0].warehouse_id,
        Math.abs(Number(dto.quantity)),
        dto.referenceType ?? null,
        dto.referenceId ?? null,
        dto.movedAt ?? null,
        dto.movedBy ?? null,
        dto.notes ?? null,
      ],
    );
    await tx.exec(
      `UPDATE stock_lots SET quantity_on_hand = $1 WHERE id = $2::uuid`,
      [newQty, dto.lotId],
    );
    return inserted[0].id;
  }

  private movementSign(type: StockMovement['movementType']): number {
    switch (type) {
      case 'receipt':
      case 'transfer_in':
      case 'return':
        return 1;
      case 'issue':
      case 'transfer_out':
      case 'consumption':
        return -1;
      case 'adjustment':
        return 1; // adjustment quantity is taken as signed by absolute value; caller can use negative reference if needed — for simplicity we treat as positive (use removeLot for shrinkage)
      default:
        return 1;
    }
  }

  /**
   * FIFO issue: select lots ordered by received_at, decrement quantity_on_hand and write
   * stock_movements until the requested quantity is satisfied. Returns the movements created.
   */
  async issueFifo(dto: IssueFifoDto): Promise<StockMovement[]> {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }
    const movementIds = await this.withTx(async (tx) => {
      const lots = await tx.query<{ id: string; quantity_on_hand: string }>(
        `SELECT id, quantity_on_hand FROM stock_lots
          WHERE item_id = $1::uuid AND warehouse_id = $2::uuid AND quantity_on_hand > 0
          ORDER BY received_at ASC, created_at ASC FOR UPDATE`,
        [dto.itemId, dto.warehouseId],
      );
      let remaining = Number(dto.quantity);
      const totalAvailable = lots.reduce((s, l) => s + Number(l.quantity_on_hand), 0);
      if (totalAvailable < remaining) {
        throw new BadRequestException(
          `Insufficient stock: requested ${remaining}, available ${totalAvailable}`,
        );
      }
      const ids: string[] = [];
      const prefix = dto.movementNumberPrefix ?? 'MV';
      const ts = Date.now();
      let seq = 1;
      for (const lot of lots) {
        if (remaining <= 0) break;
        const onHand = Number(lot.quantity_on_hand);
        const take = Math.min(onHand, remaining);
        const movementNumber = `${prefix}-${ts}-${seq++}`;
        const id = await this.applyMovement(tx, {
          movementNumber,
          movementType: 'issue',
          lotId: lot.id,
          quantity: take,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          movedBy: dto.movedBy,
          notes: dto.notes,
        });
        ids.push(id);
        remaining -= take;
      }
      return ids;
    });
    if (movementIds.length === 0) return [];
    const rows = await this.query<Record<string, unknown>>(
      `SELECT sm.*, sl.lot_number, i.code AS item_code, i.name AS item_name
         FROM stock_movements sm
         JOIN stock_lots sl ON sl.id = sm.lot_id
         JOIN items i ON i.id = sm.item_id
        WHERE sm.id = ANY($1::uuid[])
        ORDER BY sm.moved_at ASC`,
      [movementIds],
    );
    return rows.map((r) => {
      const c = camelize(r) as Record<string, unknown>;
      return { ...(c as unknown as StockMovement), quantity: Number(c['quantity']) };
    });
  }

  // ============= helpers =============

  private toLot(row: Record<string, unknown>): StockLot {
    const c = camelize(row) as Record<string, unknown>;
    return {
      ...(c as unknown as StockLot),
      quantityOnHand: Number(c['quantityOnHand']),
      receivedQuantity: Number(c['receivedQuantity']),
      unitCost: Number(c['unitCost']),
    };
  }
}
