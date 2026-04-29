import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ExportDocument,
  PackingList,
  PackingListCarton,
  Shipment,
} from '@org/shared-types';
import { TenantRepository, TenantTx } from '../../core/database/tenant-repository';
import { camelize } from '../masters/sql.util';
import {
  CreatePackingListCartonDto,
  CreatePackingListDto,
  UpdatePackingListDto,
} from './dto/packing-list.dto';
import { CreateShipmentDto, UpdateShipmentDto } from './dto/shipment.dto';
import {
  CreateExportDocumentDto,
  UpdateExportDocumentDto,
} from './dto/export-document.dto';

function recomputeTotals(cartons: CreatePackingListCartonDto[]): {
  totalCartons: number;
  totalQuantity: number;
  grossWeightKg: number;
  netWeightKg: number;
  cbm: number;
} {
  let totalQuantity = 0;
  let grossWeightKg = 0;
  let netWeightKg = 0;
  let cbm = 0;
  for (const c of cartons) {
    totalQuantity += Number(c.quantity || 0);
    grossWeightKg += Number(c.grossWeightKg || 0);
    netWeightKg += Number(c.netWeightKg || 0);
    if (c.lengthCm && c.widthCm && c.heightCm) {
      cbm += (Number(c.lengthCm) * Number(c.widthCm) * Number(c.heightCm)) / 1_000_000;
    }
  }
  return {
    totalCartons: cartons.length,
    totalQuantity,
    grossWeightKg: Number(grossWeightKg.toFixed(2)),
    netWeightKg: Number(netWeightKg.toFixed(2)),
    cbm: Number(cbm.toFixed(4)),
  };
}

@Injectable()
export class ShipmentService extends TenantRepository {
  // ============= Packing Lists =============

  async listPackingLists(): Promise<PackingList[]> {
    const lists = await this.query<Record<string, unknown>>(
      `SELECT pl.*, bo.po_number AS buyer_order_number, st.code AS style_code
         FROM packing_lists pl
         LEFT JOIN buyer_orders bo ON bo.id = pl.buyer_order_id
         LEFT JOIN styles st ON st.id = pl.style_id
        ORDER BY pl.pack_date DESC, pl.pl_number DESC`,
    );
    if (lists.length === 0) return [];
    const ids = lists.map((l) => l['id'] as string);
    const cartons = await this.queryCartonsByPackingListIds(ids);
    const grouped = new Map<string, PackingListCarton[]>();
    for (const c of cartons) {
      const arr = grouped.get(c.packingListId) ?? [];
      arr.push(c);
      grouped.set(c.packingListId, arr);
    }
    return lists.map((row) => this.toPackingList(row, grouped.get(row['id'] as string) ?? []));
  }

  async createPackingList(dto: CreatePackingListDto): Promise<PackingList> {
    const totals = recomputeTotals(dto.cartons);
    return this.withTx(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        `INSERT INTO packing_lists (
            pl_number, buyer_order_id, style_id, invoice_number,
            pack_date, total_cartons, total_quantity,
            gross_weight_kg, net_weight_kg, cbm, status, notes)
         VALUES ($1, $2::uuid, $3::uuid, $4,
            COALESCE($5::date, CURRENT_DATE), $6, $7,
            $8, $9, $10, COALESCE($11, 'draft'), $12)
         RETURNING id`,
        [
          dto.plNumber,
          dto.buyerOrderId ?? null,
          dto.styleId ?? null,
          dto.invoiceNumber ?? null,
          dto.packDate ?? null,
          totals.totalCartons,
          totals.totalQuantity,
          totals.grossWeightKg,
          totals.netWeightKg,
          totals.cbm,
          dto.status ?? null,
          dto.notes ?? null,
        ],
      );
      const id = rows[0].id;
      await this.insertCartons(tx, id, dto.cartons);
      return this.loadPackingListInTx(tx, id);
    });
  }

  async findPackingList(id: string): Promise<PackingList> {
    return this.withTx((tx) => this.loadPackingListInTx(tx, id));
  }

  async updatePackingList(id: string, dto: UpdatePackingListDto): Promise<PackingList> {
    return this.withTx(async (tx) => {
      const sets: string[] = [];
      const vals: unknown[] = [];
      const push = (col: string, val: unknown, cast?: string) => {
        vals.push(val);
        sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
      };
      if (dto.buyerOrderId !== undefined) push('buyer_order_id', dto.buyerOrderId, 'uuid');
      if (dto.styleId !== undefined) push('style_id', dto.styleId, 'uuid');
      if (dto.invoiceNumber !== undefined) push('invoice_number', dto.invoiceNumber);
      if (dto.packDate !== undefined) push('pack_date', dto.packDate, 'date');
      if (dto.status !== undefined) push('status', dto.status);
      if (dto.notes !== undefined) push('notes', dto.notes);

      if (dto.cartons) {
        const totals = recomputeTotals(dto.cartons);
        push('total_cartons', totals.totalCartons);
        push('total_quantity', totals.totalQuantity);
        push('gross_weight_kg', totals.grossWeightKg);
        push('net_weight_kg', totals.netWeightKg);
        push('cbm', totals.cbm);
        await tx.exec(`DELETE FROM packing_list_cartons WHERE packing_list_id = $1::uuid`, [id]);
        await this.insertCartons(tx, id, dto.cartons);
      }

      if (sets.length > 0) {
        vals.push(id);
        const affected = await tx.exec(
          `UPDATE packing_lists SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
          vals,
        );
        if (affected === 0) throw new NotFoundException(`Packing list ${id} not found`);
      }
      return this.loadPackingListInTx(tx, id);
    });
  }

  async removePackingList(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM packing_lists WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Packing list ${id} not found`);
  }

  private async insertCartons(
    tx: TenantTx,
    packingListId: string,
    cartons: CreatePackingListCartonDto[],
  ): Promise<void> {
    for (let i = 0; i < cartons.length; i++) {
      const c = cartons[i];
      await tx.exec(
        `INSERT INTO packing_list_cartons (
            packing_list_id, carton_number, size_label, color, quantity,
            gross_weight_kg, net_weight_kg, length_cm, width_cm, height_cm, sort_order, notes)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          packingListId,
          c.cartonNumber,
          c.sizeLabel ?? null,
          c.color ?? null,
          c.quantity,
          c.grossWeightKg ?? 0,
          c.netWeightKg ?? 0,
          c.lengthCm ?? null,
          c.widthCm ?? null,
          c.heightCm ?? null,
          c.sortOrder ?? i + 1,
          c.notes ?? null,
        ],
      );
    }
  }

  private async loadPackingListInTx(tx: TenantTx, id: string): Promise<PackingList> {
    const rows = await tx.query<Record<string, unknown>>(
      `SELECT pl.*, bo.po_number AS buyer_order_number, st.code AS style_code
         FROM packing_lists pl
         LEFT JOIN buyer_orders bo ON bo.id = pl.buyer_order_id
         LEFT JOIN styles st ON st.id = pl.style_id
        WHERE pl.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Packing list ${id} not found`);
    const cartonRows = await tx.query<Record<string, unknown>>(
      `SELECT * FROM packing_list_cartons WHERE packing_list_id = $1::uuid
        ORDER BY sort_order, carton_number`,
      [id],
    );
    const cartons = cartonRows.map((r) => this.toCarton(r));
    return this.toPackingList(rows[0], cartons);
  }

  private async queryCartonsByPackingListIds(ids: string[]): Promise<PackingListCarton[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM packing_list_cartons
        WHERE packing_list_id = ANY($1::uuid[])
        ORDER BY sort_order, carton_number`,
      [ids],
    );
    return rows.map((r) => this.toCarton(r));
  }

  private toPackingList(row: Record<string, unknown>, cartons: PackingListCarton[]): PackingList {
    const c = camelize(row) as Record<string, unknown>;
    return {
      ...(c as unknown as PackingList),
      totalCartons: Number(c['totalCartons']),
      totalQuantity: Number(c['totalQuantity']),
      grossWeightKg: Number(c['grossWeightKg']),
      netWeightKg: Number(c['netWeightKg']),
      cbm: Number(c['cbm']),
      cartons,
    };
  }

  private toCarton(row: Record<string, unknown>): PackingListCarton {
    const c = camelize(row) as Record<string, unknown>;
    return {
      ...(c as unknown as PackingListCarton),
      quantity: Number(c['quantity']),
      grossWeightKg: Number(c['grossWeightKg']),
      netWeightKg: Number(c['netWeightKg']),
      sortOrder: Number(c['sortOrder']),
      lengthCm: c['lengthCm'] !== null ? Number(c['lengthCm']) : null,
      widthCm: c['widthCm'] !== null ? Number(c['widthCm']) : null,
      heightCm: c['heightCm'] !== null ? Number(c['heightCm']) : null,
    };
  }

  // ============= Shipments =============

  async listShipments(): Promise<Shipment[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT s.*, bo.po_number AS buyer_order_number, pl.pl_number AS packing_list_number
         FROM shipments s
         LEFT JOIN buyer_orders bo ON bo.id = s.buyer_order_id
         LEFT JOIN packing_lists pl ON pl.id = s.packing_list_id
        ORDER BY COALESCE(s.actual_ship_date, s.etd, s.eta) DESC NULLS LAST, s.shipment_number DESC`,
    );
    return rows.map((r) => this.toShipment(r));
  }

  async createShipment(dto: CreateShipmentDto): Promise<Shipment> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO shipments (
          shipment_number, buyer_order_id, packing_list_id, mode, forwarder,
          bl_awb_number, container_number, port_of_loading, port_of_discharge,
          eta, etd, actual_ship_date, invoice_number, invoice_value_usd, status, notes)
       VALUES ($1, $2::uuid, $3::uuid, COALESCE($4, 'sea'), $5,
          $6, $7, $8, $9, $10::date, $11::date, $12::date, $13, $14, COALESCE($15, 'planned'), $16)
       RETURNING id`,
      [
        dto.shipmentNumber,
        dto.buyerOrderId ?? null,
        dto.packingListId ?? null,
        dto.mode ?? null,
        dto.forwarder ?? null,
        dto.blAwbNumber ?? null,
        dto.containerNumber ?? null,
        dto.portOfLoading ?? null,
        dto.portOfDischarge ?? null,
        dto.eta ?? null,
        dto.etd ?? null,
        dto.actualShipDate ?? null,
        dto.invoiceNumber ?? null,
        dto.invoiceValueUsd ?? null,
        dto.status ?? null,
        dto.notes ?? null,
      ],
    );
    return this.findShipment(rows[0].id);
  }

  async findShipment(id: string): Promise<Shipment> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT s.*, bo.po_number AS buyer_order_number, pl.pl_number AS packing_list_number
         FROM shipments s
         LEFT JOIN buyer_orders bo ON bo.id = s.buyer_order_id
         LEFT JOIN packing_lists pl ON pl.id = s.packing_list_id
        WHERE s.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Shipment ${id} not found`);
    return this.toShipment(rows[0]);
  }

  async updateShipment(id: string, dto: UpdateShipmentDto): Promise<Shipment> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.buyerOrderId !== undefined) push('buyer_order_id', dto.buyerOrderId, 'uuid');
    if (dto.packingListId !== undefined) push('packing_list_id', dto.packingListId, 'uuid');
    if (dto.mode !== undefined) push('mode', dto.mode);
    if (dto.forwarder !== undefined) push('forwarder', dto.forwarder);
    if (dto.blAwbNumber !== undefined) push('bl_awb_number', dto.blAwbNumber);
    if (dto.containerNumber !== undefined) push('container_number', dto.containerNumber);
    if (dto.portOfLoading !== undefined) push('port_of_loading', dto.portOfLoading);
    if (dto.portOfDischarge !== undefined) push('port_of_discharge', dto.portOfDischarge);
    if (dto.eta !== undefined) push('eta', dto.eta, 'date');
    if (dto.etd !== undefined) push('etd', dto.etd, 'date');
    if (dto.actualShipDate !== undefined) push('actual_ship_date', dto.actualShipDate, 'date');
    if (dto.invoiceNumber !== undefined) push('invoice_number', dto.invoiceNumber);
    if (dto.invoiceValueUsd !== undefined) push('invoice_value_usd', dto.invoiceValueUsd);
    if (dto.status !== undefined) push('status', dto.status);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (sets.length === 0) return this.findShipment(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE shipments SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Shipment ${id} not found`);
    return this.findShipment(id);
  }

  async removeShipment(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM shipments WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Shipment ${id} not found`);
  }

  private toShipment(row: Record<string, unknown>): Shipment {
    const c = camelize(row) as Record<string, unknown>;
    return {
      ...(c as unknown as Shipment),
      invoiceValueUsd: c['invoiceValueUsd'] !== null ? Number(c['invoiceValueUsd']) : null,
    };
  }

  // ============= Export Documents =============

  async listExportDocuments(): Promise<ExportDocument[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT ed.*, s.shipment_number AS shipment_number_join, bo.po_number AS buyer_order_number
         FROM export_documents ed
         LEFT JOIN shipments s ON s.id = ed.shipment_id
         LEFT JOIN buyer_orders bo ON bo.id = ed.buyer_order_id
        ORDER BY ed.issued_date DESC, ed.doc_number DESC`,
    );
    return rows.map((r) => this.toDocument(r));
  }

  async createExportDocument(dto: CreateExportDocumentDto): Promise<ExportDocument> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO export_documents (
          doc_number, shipment_id, buyer_order_id, doc_type,
          issued_date, issued_by, reference_number, expiry_date,
          file_url, status, notes)
       VALUES ($1, $2::uuid, $3::uuid, $4,
          COALESCE($5::date, CURRENT_DATE), $6, $7, $8::date,
          $9, COALESCE($10, 'draft'), $11)
       RETURNING id`,
      [
        dto.docNumber,
        dto.shipmentId ?? null,
        dto.buyerOrderId ?? null,
        dto.docType,
        dto.issuedDate ?? null,
        dto.issuedBy ?? null,
        dto.referenceNumber ?? null,
        dto.expiryDate ?? null,
        dto.fileUrl ?? null,
        dto.status ?? null,
        dto.notes ?? null,
      ],
    );
    return this.findExportDocument(rows[0].id);
  }

  async findExportDocument(id: string): Promise<ExportDocument> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT ed.*, s.shipment_number AS shipment_number_join, bo.po_number AS buyer_order_number
         FROM export_documents ed
         LEFT JOIN shipments s ON s.id = ed.shipment_id
         LEFT JOIN buyer_orders bo ON bo.id = ed.buyer_order_id
        WHERE ed.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Export document ${id} not found`);
    return this.toDocument(rows[0]);
  }

  async updateExportDocument(id: string, dto: UpdateExportDocumentDto): Promise<ExportDocument> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.shipmentId !== undefined) push('shipment_id', dto.shipmentId, 'uuid');
    if (dto.buyerOrderId !== undefined) push('buyer_order_id', dto.buyerOrderId, 'uuid');
    if (dto.docType !== undefined) push('doc_type', dto.docType);
    if (dto.issuedDate !== undefined) push('issued_date', dto.issuedDate, 'date');
    if (dto.issuedBy !== undefined) push('issued_by', dto.issuedBy);
    if (dto.referenceNumber !== undefined) push('reference_number', dto.referenceNumber);
    if (dto.expiryDate !== undefined) push('expiry_date', dto.expiryDate, 'date');
    if (dto.fileUrl !== undefined) push('file_url', dto.fileUrl);
    if (dto.status !== undefined) push('status', dto.status);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (sets.length === 0) return this.findExportDocument(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE export_documents SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`Export document ${id} not found`);
    return this.findExportDocument(id);
  }

  async removeExportDocument(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM export_documents WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Export document ${id} not found`);
  }

  private toDocument(row: Record<string, unknown>): ExportDocument {
    const c = camelize(row) as Record<string, unknown>;
    if (c['shipmentNumberJoin']) {
      c['shipmentNumber'] = c['shipmentNumberJoin'];
    }
    delete c['shipmentNumberJoin'];
    return c as unknown as ExportDocument;
  }
}
