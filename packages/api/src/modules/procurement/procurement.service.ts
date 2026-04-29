import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  GoodsReceiptItem,
  GoodsReceiptNote,
  LetterOfCredit,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseRequisition,
  PurchaseRequisitionItem,
} from '@org/shared-types';
import { TenantRepository, TenantTx } from '../../core/database/tenant-repository';
import {
  CreatePurchaseRequisitionDto,
  CreatePurchaseRequisitionItemDto,
  UpdatePurchaseRequisitionDto,
} from './dto/purchase-requisition.dto';
import {
  ConvertPrToPoDto,
  CreatePurchaseOrderDto,
  CreatePurchaseOrderItemDto,
  UpdatePurchaseOrderDto,
} from './dto/purchase-order.dto';
import { CreateGrnDto, CreateGrnItemDto, UpdateGrnDto } from './dto/grn.dto';
import { CreateLetterOfCreditDto, UpdateLetterOfCreditDto } from './dto/lc.dto';
import { camelize } from '../masters/sql.util';

@Injectable()
export class ProcurementService extends TenantRepository {
  // ============= Purchase Requisitions =============

  async listPrs(): Promise<PurchaseRequisition[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM purchase_requisitions ORDER BY request_date DESC, created_at DESC`,
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r['id'] as string);
    const itemRows = await this.query<Record<string, unknown>>(
      `SELECT pr.*, i.code AS item_code, i.name AS item_name
         FROM purchase_requisition_items pr
         JOIN items i ON i.id = pr.item_id
        WHERE pr.pr_id = ANY($1::uuid[])
        ORDER BY pr.created_at`,
      [ids],
    );
    return rows.map((r) => this.assemblePr(r, itemRows));
  }

  async findPr(id: string): Promise<PurchaseRequisition> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM purchase_requisitions WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`PR ${id} not found`);
    const itemRows = await this.query<Record<string, unknown>>(
      `SELECT pr.*, i.code AS item_code, i.name AS item_name
         FROM purchase_requisition_items pr
         JOIN items i ON i.id = pr.item_id
        WHERE pr.pr_id = $1::uuid
        ORDER BY pr.created_at`,
      [id],
    );
    return this.assemblePr(rows[0], itemRows);
  }

  async createPr(dto: CreatePurchaseRequisitionDto): Promise<PurchaseRequisition> {
    const id = await this.withTx(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        `INSERT INTO purchase_requisitions (
          pr_number, requested_by, department, style_id, buyer_order_id,
          request_date, required_by, status, notes
         ) VALUES ($1, $2, $3, $4::uuid, $5::uuid, COALESCE($6::date, CURRENT_DATE), $7::date, $8, $9)
         RETURNING id`,
        [
          dto.prNumber,
          dto.requestedBy ?? null,
          dto.department ?? null,
          dto.styleId ?? null,
          dto.buyerOrderId ?? null,
          dto.requestDate ?? null,
          dto.requiredBy ?? null,
          dto.status ?? 'draft',
          dto.notes ?? null,
        ],
      );
      const prId = rows[0].id;
      for (const it of dto.items) await this.insertPrItem(tx, prId, it);
      return prId;
    });
    return this.findPr(id);
  }

  async updatePr(id: string, dto: UpdatePurchaseRequisitionDto): Promise<PurchaseRequisition> {
    await this.withTx(async (tx) => {
      const sets: string[] = [];
      const vals: unknown[] = [];
      const push = (col: string, val: unknown, cast?: string) => {
        vals.push(val);
        sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
      };
      if (dto.requestedBy !== undefined) push('requested_by', dto.requestedBy);
      if (dto.department !== undefined) push('department', dto.department);
      if (dto.styleId !== undefined) push('style_id', dto.styleId, 'uuid');
      if (dto.buyerOrderId !== undefined) push('buyer_order_id', dto.buyerOrderId, 'uuid');
      if (dto.requestDate !== undefined) push('request_date', dto.requestDate, 'date');
      if (dto.requiredBy !== undefined) push('required_by', dto.requiredBy, 'date');
      if (dto.status !== undefined) push('status', dto.status);
      if (dto.notes !== undefined) push('notes', dto.notes);
      if (sets.length > 0) {
        vals.push(id);
        const affected = await tx.exec(
          `UPDATE purchase_requisitions SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
          vals,
        );
        if (affected === 0) throw new NotFoundException(`PR ${id} not found`);
      } else {
        const e = await tx.query<{ id: string }>(
          `SELECT id FROM purchase_requisitions WHERE id = $1::uuid`,
          [id],
        );
        if (e.length === 0) throw new NotFoundException(`PR ${id} not found`);
      }
      if (dto.items !== undefined) {
        await tx.exec(`DELETE FROM purchase_requisition_items WHERE pr_id = $1::uuid`, [id]);
        for (const it of dto.items) await this.insertPrItem(tx, id, it);
      }
    });
    return this.findPr(id);
  }

  async removePr(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM purchase_requisitions WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`PR ${id} not found`);
  }

  private async insertPrItem(
    tx: TenantTx,
    prId: string,
    it: CreatePurchaseRequisitionItemDto,
  ): Promise<void> {
    await tx.exec(
      `INSERT INTO purchase_requisition_items (pr_id, item_id, quantity, uom, estimated_cost, notes)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)`,
      [
        prId,
        it.itemId,
        it.quantity,
        it.uom ?? 'pcs',
        it.estimatedCost ?? null,
        it.notes ?? null,
      ],
    );
  }

  // ============= Purchase Orders =============

  async listPos(): Promise<PurchaseOrder[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT po.*, s.name AS supplier_name
         FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
        ORDER BY po.order_date DESC, po.created_at DESC`,
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r['id'] as string);
    const itemRows = await this.query<Record<string, unknown>>(
      `SELECT poi.*, i.code AS item_code, i.name AS item_name
         FROM purchase_order_items poi
         JOIN items i ON i.id = poi.item_id
        WHERE poi.po_id = ANY($1::uuid[])
        ORDER BY poi.created_at`,
      [ids],
    );
    return rows.map((r) => this.assemblePo(r, itemRows));
  }

  async findPo(id: string): Promise<PurchaseOrder> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT po.*, s.name AS supplier_name
         FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`PO ${id} not found`);
    const itemRows = await this.query<Record<string, unknown>>(
      `SELECT poi.*, i.code AS item_code, i.name AS item_name
         FROM purchase_order_items poi
         JOIN items i ON i.id = poi.item_id
        WHERE poi.po_id = $1::uuid
        ORDER BY poi.created_at`,
      [id],
    );
    return this.assemblePo(rows[0], itemRows);
  }

  async createPo(dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const id = await this.withTx(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        `INSERT INTO purchase_orders (
          po_number, supplier_id, pr_id, style_id, buyer_order_id,
          order_date, expected_delivery, incoterm, payment_terms, currency_code, status, notes
         ) VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid,
                   COALESCE($6::date, CURRENT_DATE), $7::date, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          dto.poNumber,
          dto.supplierId,
          dto.prId ?? null,
          dto.styleId ?? null,
          dto.buyerOrderId ?? null,
          dto.orderDate ?? null,
          dto.expectedDelivery ?? null,
          dto.incoterm ?? null,
          dto.paymentTerms ?? null,
          dto.currencyCode ?? 'USD',
          dto.status ?? 'draft',
          dto.notes ?? null,
        ],
      );
      const poId = rows[0].id;
      for (const it of dto.items) await this.insertPoItem(tx, poId, it);
      if (dto.prId) {
        await tx.exec(
          `UPDATE purchase_requisitions SET status = 'converted' WHERE id = $1::uuid`,
          [dto.prId],
        );
      }
      return poId;
    });
    return this.findPo(id);
  }

  async updatePo(id: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    await this.withTx(async (tx) => {
      const sets: string[] = [];
      const vals: unknown[] = [];
      const push = (col: string, val: unknown, cast?: string) => {
        vals.push(val);
        sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
      };
      if (dto.supplierId !== undefined) push('supplier_id', dto.supplierId, 'uuid');
      if (dto.prId !== undefined) push('pr_id', dto.prId, 'uuid');
      if (dto.styleId !== undefined) push('style_id', dto.styleId, 'uuid');
      if (dto.buyerOrderId !== undefined) push('buyer_order_id', dto.buyerOrderId, 'uuid');
      if (dto.orderDate !== undefined) push('order_date', dto.orderDate, 'date');
      if (dto.expectedDelivery !== undefined) push('expected_delivery', dto.expectedDelivery, 'date');
      if (dto.incoterm !== undefined) push('incoterm', dto.incoterm);
      if (dto.paymentTerms !== undefined) push('payment_terms', dto.paymentTerms);
      if (dto.currencyCode !== undefined) push('currency_code', dto.currencyCode);
      if (dto.status !== undefined) push('status', dto.status);
      if (dto.notes !== undefined) push('notes', dto.notes);
      if (sets.length > 0) {
        vals.push(id);
        const affected = await tx.exec(
          `UPDATE purchase_orders SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
          vals,
        );
        if (affected === 0) throw new NotFoundException(`PO ${id} not found`);
      } else {
        const e = await tx.query<{ id: string }>(
          `SELECT id FROM purchase_orders WHERE id = $1::uuid`,
          [id],
        );
        if (e.length === 0) throw new NotFoundException(`PO ${id} not found`);
      }
      if (dto.items !== undefined) {
        await tx.exec(`DELETE FROM purchase_order_items WHERE po_id = $1::uuid`, [id]);
        for (const it of dto.items) await this.insertPoItem(tx, id, it);
      }
    });
    return this.findPo(id);
  }

  async removePo(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM purchase_orders WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`PO ${id} not found`);
  }

  async convertPrToPo(dto: ConvertPrToPoDto): Promise<PurchaseOrder> {
    const pr = await this.findPr(dto.prId);
    const id = await this.withTx(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        `INSERT INTO purchase_orders (
          po_number, supplier_id, pr_id, style_id, buyer_order_id,
          order_date, expected_delivery, incoterm, payment_terms, currency_code, status
         ) VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid,
                   COALESCE($6::date, CURRENT_DATE), $7::date, $8, $9, $10, 'draft')
         RETURNING id`,
        [
          dto.poNumber,
          dto.supplierId,
          dto.prId,
          pr.styleId ?? null,
          pr.buyerOrderId ?? null,
          dto.orderDate ?? null,
          dto.expectedDelivery ?? null,
          dto.incoterm ?? null,
          dto.paymentTerms ?? null,
          dto.currencyCode ?? 'USD',
        ],
      );
      const poId = rows[0].id;
      for (const it of pr.items) {
        await tx.exec(
          `INSERT INTO purchase_order_items (po_id, item_id, quantity, unit_price, uom, notes)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)`,
          [poId, it.itemId, it.quantity, it.estimatedCost ?? 0, it.uom, it.notes ?? null],
        );
      }
      await tx.exec(
        `UPDATE purchase_requisitions SET status = 'converted' WHERE id = $1::uuid`,
        [dto.prId],
      );
      return poId;
    });
    return this.findPo(id);
  }

  private async insertPoItem(
    tx: TenantTx,
    poId: string,
    it: CreatePurchaseOrderItemDto,
  ): Promise<void> {
    await tx.exec(
      `INSERT INTO purchase_order_items (po_id, item_id, quantity, unit_price, uom, notes)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)`,
      [poId, it.itemId, it.quantity, it.unitPrice, it.uom ?? 'pcs', it.notes ?? null],
    );
  }

  // ============= GRN =============

  async listGrns(): Promise<GoodsReceiptNote[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT g.*, po.po_number AS po_number
         FROM goods_receipt_notes g
         JOIN purchase_orders po ON po.id = g.po_id
        ORDER BY g.received_date DESC, g.created_at DESC`,
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r['id'] as string);
    const itemRows = await this.query<Record<string, unknown>>(
      `SELECT gi.*, i.code AS item_code, i.name AS item_name
         FROM goods_receipt_items gi
         JOIN items i ON i.id = gi.item_id
        WHERE gi.grn_id = ANY($1::uuid[])
        ORDER BY gi.created_at`,
      [ids],
    );
    return rows.map((r) => this.assembleGrn(r, itemRows));
  }

  async findGrn(id: string): Promise<GoodsReceiptNote> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT g.*, po.po_number AS po_number
         FROM goods_receipt_notes g
         JOIN purchase_orders po ON po.id = g.po_id
        WHERE g.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`GRN ${id} not found`);
    const itemRows = await this.query<Record<string, unknown>>(
      `SELECT gi.*, i.code AS item_code, i.name AS item_name
         FROM goods_receipt_items gi
         JOIN items i ON i.id = gi.item_id
        WHERE gi.grn_id = $1::uuid
        ORDER BY gi.created_at`,
      [id],
    );
    return this.assembleGrn(rows[0], itemRows);
  }

  async createGrn(dto: CreateGrnDto): Promise<GoodsReceiptNote> {
    const id = await this.withTx(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        `INSERT INTO goods_receipt_notes (
          grn_number, po_id, received_date, received_by, invoice_number, challan_number, status, notes
         ) VALUES ($1, $2::uuid, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          dto.grnNumber,
          dto.poId,
          dto.receivedDate ?? null,
          dto.receivedBy ?? null,
          dto.invoiceNumber ?? null,
          dto.challanNumber ?? null,
          dto.status ?? 'received',
          dto.notes ?? null,
        ],
      );
      const grnId = rows[0].id;
      for (const it of dto.items) await this.insertGrnItem(tx, grnId, it);
      await this.recomputePoReceivedStatus(tx, dto.poId);
      return grnId;
    });
    return this.findGrn(id);
  }

  async updateGrn(id: string, dto: UpdateGrnDto): Promise<GoodsReceiptNote> {
    const existing = await this.query<{ po_id: string }>(
      `SELECT po_id FROM goods_receipt_notes WHERE id = $1::uuid`,
      [id],
    );
    if (existing.length === 0) throw new NotFoundException(`GRN ${id} not found`);
    const poId = existing[0].po_id;
    await this.withTx(async (tx) => {
      const sets: string[] = [];
      const vals: unknown[] = [];
      const push = (col: string, val: unknown, cast?: string) => {
        vals.push(val);
        sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
      };
      if (dto.receivedDate !== undefined) push('received_date', dto.receivedDate, 'date');
      if (dto.receivedBy !== undefined) push('received_by', dto.receivedBy);
      if (dto.invoiceNumber !== undefined) push('invoice_number', dto.invoiceNumber);
      if (dto.challanNumber !== undefined) push('challan_number', dto.challanNumber);
      if (dto.status !== undefined) push('status', dto.status);
      if (dto.notes !== undefined) push('notes', dto.notes);
      if (sets.length > 0) {
        vals.push(id);
        await tx.exec(
          `UPDATE goods_receipt_notes SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
          vals,
        );
      }
      if (dto.items !== undefined) {
        await tx.exec(`DELETE FROM goods_receipt_items WHERE grn_id = $1::uuid`, [id]);
        for (const it of dto.items) await this.insertGrnItem(tx, id, it);
        await this.recomputePoReceivedStatus(tx, poId);
      }
    });
    return this.findGrn(id);
  }

  async removeGrn(id: string): Promise<void> {
    const existing = await this.query<{ po_id: string }>(
      `SELECT po_id FROM goods_receipt_notes WHERE id = $1::uuid`,
      [id],
    );
    if (existing.length === 0) throw new NotFoundException(`GRN ${id} not found`);
    const poId = existing[0].po_id;
    await this.withTx(async (tx) => {
      await tx.exec(`DELETE FROM goods_receipt_notes WHERE id = $1::uuid`, [id]);
      await this.recomputePoReceivedStatus(tx, poId);
    });
  }

  private async insertGrnItem(tx: TenantTx, grnId: string, it: CreateGrnItemDto): Promise<void> {
    const accepted = it.acceptedQuantity ?? it.receivedQuantity;
    const rejected = it.rejectedQuantity ?? 0;
    await tx.exec(
      `INSERT INTO goods_receipt_items
         (grn_id, po_item_id, item_id, received_quantity, accepted_quantity, rejected_quantity, notes)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7)`,
      [grnId, it.poItemId, it.itemId, it.receivedQuantity, accepted, rejected, it.notes ?? null],
    );
    await tx.exec(
      `UPDATE purchase_order_items
          SET received_quantity = COALESCE((
            SELECT SUM(accepted_quantity) FROM goods_receipt_items WHERE po_item_id = $1::uuid
          ), 0)
        WHERE id = $1::uuid`,
      [it.poItemId],
    );
  }

  private async recomputePoReceivedStatus(tx: TenantTx, poId: string): Promise<void> {
    const rows = await tx.query<{ ordered: string; received: string }>(
      `SELECT COALESCE(SUM(quantity),0)::text AS ordered,
              COALESCE(SUM(received_quantity),0)::text AS received
         FROM purchase_order_items WHERE po_id = $1::uuid`,
      [poId],
    );
    const ordered = Number(rows[0]?.ordered ?? 0);
    const received = Number(rows[0]?.received ?? 0);
    let status: 'draft' | 'sent' | 'partially_received' | 'received' = 'sent';
    if (ordered === 0) status = 'sent';
    else if (received === 0) status = 'sent';
    else if (received >= ordered) status = 'received';
    else status = 'partially_received';
    await tx.exec(
      `UPDATE purchase_orders SET status = $1
        WHERE id = $2::uuid AND status NOT IN ('closed','cancelled')`,
      [status, poId],
    );
  }

  // ============= LC =============

  async listLcs(): Promise<LetterOfCredit[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM letters_of_credit ORDER BY issue_date DESC NULLS LAST, created_at DESC`,
    );
    return rows.map((r) => camelize(r) as unknown as LetterOfCredit);
  }

  async findLc(id: string): Promise<LetterOfCredit> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM letters_of_credit WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`LC ${id} not found`);
    return camelize(rows[0]) as unknown as LetterOfCredit;
  }

  async createLc(dto: CreateLetterOfCreditDto): Promise<LetterOfCredit> {
    const rows = await this.query<{ id: string }>(
      `INSERT INTO letters_of_credit (
        lc_number, lc_type, issuing_bank, advising_bank, beneficiary, applicant,
        parent_lc_id, buyer_order_id, po_id, amount, currency_code,
        issue_date, expiry_date, latest_shipment_date, status, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::uuid, $8::uuid, $9::uuid, $10, $11,
                 $12::date, $13::date, $14::date, $15, $16) RETURNING id`,
      [
        dto.lcNumber,
        dto.lcType ?? 'master',
        dto.issuingBank ?? null,
        dto.advisingBank ?? null,
        dto.beneficiary ?? null,
        dto.applicant ?? null,
        dto.parentLcId ?? null,
        dto.buyerOrderId ?? null,
        dto.poId ?? null,
        dto.amount ?? 0,
        dto.currencyCode ?? 'USD',
        dto.issueDate ?? null,
        dto.expiryDate ?? null,
        dto.latestShipmentDate ?? null,
        dto.status ?? 'draft',
        dto.notes ?? null,
      ],
    );
    return this.findLc(rows[0].id);
  }

  async updateLc(id: string, dto: UpdateLetterOfCreditDto): Promise<LetterOfCredit> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown, cast?: string) => {
      vals.push(val);
      sets.push(cast ? `${col} = $${vals.length}::${cast}` : `${col} = $${vals.length}`);
    };
    if (dto.lcType !== undefined) push('lc_type', dto.lcType);
    if (dto.issuingBank !== undefined) push('issuing_bank', dto.issuingBank);
    if (dto.advisingBank !== undefined) push('advising_bank', dto.advisingBank);
    if (dto.beneficiary !== undefined) push('beneficiary', dto.beneficiary);
    if (dto.applicant !== undefined) push('applicant', dto.applicant);
    if (dto.parentLcId !== undefined) push('parent_lc_id', dto.parentLcId, 'uuid');
    if (dto.buyerOrderId !== undefined) push('buyer_order_id', dto.buyerOrderId, 'uuid');
    if (dto.poId !== undefined) push('po_id', dto.poId, 'uuid');
    if (dto.amount !== undefined) push('amount', dto.amount);
    if (dto.currencyCode !== undefined) push('currency_code', dto.currencyCode);
    if (dto.issueDate !== undefined) push('issue_date', dto.issueDate, 'date');
    if (dto.expiryDate !== undefined) push('expiry_date', dto.expiryDate, 'date');
    if (dto.latestShipmentDate !== undefined)
      push('latest_shipment_date', dto.latestShipmentDate, 'date');
    if (dto.status !== undefined) push('status', dto.status);
    if (dto.notes !== undefined) push('notes', dto.notes);
    if (sets.length === 0) return this.findLc(id);
    vals.push(id);
    const affected = await this.exec(
      `UPDATE letters_of_credit SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    if (affected === 0) throw new NotFoundException(`LC ${id} not found`);
    return this.findLc(id);
  }

  async removeLc(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM letters_of_credit WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`LC ${id} not found`);
  }

  // ============= Assemble helpers =============

  private assemblePr(
    row: Record<string, unknown>,
    allItems: Record<string, unknown>[],
  ): PurchaseRequisition {
    const head = camelize(row) as unknown as Omit<
      PurchaseRequisition,
      'items' | 'totalEstimatedCost'
    >;
    const items: PurchaseRequisitionItem[] = allItems
      .filter((it) => it['pr_id'] === row['id'])
      .map((it) => {
        const c = camelize(it) as Record<string, unknown>;
        const qty = Number(c['quantity'] ?? 0);
        const est = c['estimatedCost'] != null ? Number(c['estimatedCost']) : null;
        return {
          ...(c as unknown as PurchaseRequisitionItem),
          quantity: qty,
          estimatedCost: est,
        };
      });
    const totalEstimatedCost = items.reduce(
      (s, it) => s + Number(it.quantity ?? 0) * Number(it.estimatedCost ?? 0),
      0,
    );
    return { ...head, items, totalEstimatedCost: Number(totalEstimatedCost.toFixed(4)) };
  }

  private assemblePo(
    row: Record<string, unknown>,
    allItems: Record<string, unknown>[],
  ): PurchaseOrder {
    const head = camelize(row) as unknown as Omit<PurchaseOrder, 'items' | 'totalValue'>;
    const items: PurchaseOrderItem[] = allItems
      .filter((it) => it['po_id'] === row['id'])
      .map((it) => {
        const c = camelize(it) as Record<string, unknown>;
        const qty = Number(c['quantity'] ?? 0);
        const price = Number(c['unitPrice'] ?? 0);
        return {
          ...(c as unknown as PurchaseOrderItem),
          quantity: qty,
          unitPrice: price,
          receivedQuantity: Number(c['receivedQuantity'] ?? 0),
          lineTotal: Number((qty * price).toFixed(4)),
        };
      });
    const totalValue = items.reduce((s, it) => s + (it.lineTotal ?? 0), 0);
    return { ...head, items, totalValue: Number(totalValue.toFixed(4)) };
  }

  private assembleGrn(
    row: Record<string, unknown>,
    allItems: Record<string, unknown>[],
  ): GoodsReceiptNote {
    const head = camelize(row) as unknown as Omit<GoodsReceiptNote, 'items'>;
    const items: GoodsReceiptItem[] = allItems
      .filter((it) => it['grn_id'] === row['id'])
      .map((it) => camelize(it) as unknown as GoodsReceiptItem);
    return { ...head, items };
  }
}
