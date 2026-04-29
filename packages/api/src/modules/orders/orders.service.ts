import { Injectable, NotFoundException } from '@nestjs/common';
import type { BuyerOrder, OrderLine, OrderSizeRow } from '@org/shared-types';
import { TenantRepository, TenantTx } from '../../core/database/tenant-repository';
import {
  CreateBuyerOrderDto,
  CreateOrderLineDto,
  UpdateBuyerOrderDto,
} from './dto/buyer-order.dto';
import { camelize } from '../masters/sql.util';

@Injectable()
export class OrdersService extends TenantRepository {
  async list(): Promise<BuyerOrder[]> {
    const orders = await this.query<Record<string, unknown>>(
      `SELECT * FROM buyer_orders ORDER BY order_date DESC, created_at DESC`,
    );
    if (orders.length === 0) return [];

    const ids = orders.map((o) => o['id'] as string);
    const linesRows = await this.query<Record<string, unknown>>(
      `SELECT * FROM order_lines WHERE order_id = ANY($1::uuid[]) ORDER BY created_at`,
      [ids],
    );
    const sizeRows = await this.query<Record<string, unknown>>(
      `SELECT s.* FROM order_size_breakdown s
        JOIN order_lines l ON l.id = s.order_line_id
        WHERE l.order_id = ANY($1::uuid[])
        ORDER BY s.sort_order, s.size_label`,
      [ids],
    );
    return orders.map((o) => this.assemble(o, linesRows, sizeRows));
  }

  async findOne(id: string): Promise<BuyerOrder> {
    const orderRows = await this.query<Record<string, unknown>>(
      `SELECT * FROM buyer_orders WHERE id = $1::uuid`,
      [id],
    );
    if (orderRows.length === 0) throw new NotFoundException(`Order ${id} not found`);
    const lines = await this.query<Record<string, unknown>>(
      `SELECT * FROM order_lines WHERE order_id = $1::uuid ORDER BY created_at`,
      [id],
    );
    const sizes = await this.query<Record<string, unknown>>(
      `SELECT s.* FROM order_size_breakdown s
        JOIN order_lines l ON l.id = s.order_line_id
        WHERE l.order_id = $1::uuid
        ORDER BY s.sort_order, s.size_label`,
      [id],
    );
    return this.assemble(orderRows[0], lines, sizes);
  }

  async create(dto: CreateBuyerOrderDto): Promise<BuyerOrder> {
    const orderId = await this.withTx(async (tx) => {
      const orderRows = await tx.query<{ id: string }>(
        `INSERT INTO buyer_orders (
          po_number, buyer_id, order_date, delivery_date, incoterm,
          payment_terms, currency_code, status, notes
         ) VALUES ($1, $2::uuid, COALESCE($3::date, CURRENT_DATE), $4::date, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          dto.poNumber,
          dto.buyerId,
          dto.orderDate ?? null,
          dto.deliveryDate ?? null,
          dto.incoterm ?? null,
          dto.paymentTerms ?? null,
          dto.currencyCode ?? 'USD',
          dto.status ?? 'draft',
          dto.notes ?? null,
        ],
      );
      const id = orderRows[0].id;
      for (const line of dto.lines) await this.insertLine(tx, id, line);
      return id;
    });
    return this.findOne(orderId);
  }

  async update(id: string, dto: UpdateBuyerOrderDto): Promise<BuyerOrder> {
    await this.withTx(async (tx) => {
      const headerFields: Array<[string, unknown]> = [];
      if (dto.poNumber !== undefined) headerFields.push(['po_number', dto.poNumber]);
      if (dto.buyerId !== undefined) headerFields.push(['buyer_id_uuid', dto.buyerId]);
      if (dto.orderDate !== undefined) headerFields.push(['order_date_date', dto.orderDate]);
      if (dto.deliveryDate !== undefined)
        headerFields.push(['delivery_date_date', dto.deliveryDate]);
      if (dto.incoterm !== undefined) headerFields.push(['incoterm', dto.incoterm]);
      if (dto.paymentTerms !== undefined) headerFields.push(['payment_terms', dto.paymentTerms]);
      if (dto.currencyCode !== undefined) headerFields.push(['currency_code', dto.currencyCode]);
      if (dto.status !== undefined) headerFields.push(['status', dto.status]);
      if (dto.notes !== undefined) headerFields.push(['notes', dto.notes]);

      if (headerFields.length > 0) {
        const setParts: string[] = [];
        const values: unknown[] = [];
        for (const [colTag, val] of headerFields) {
          const idx = values.length + 1;
          if (colTag === 'buyer_id_uuid') setParts.push(`buyer_id = $${idx}::uuid`);
          else if (colTag === 'order_date_date') setParts.push(`order_date = $${idx}::date`);
          else if (colTag === 'delivery_date_date')
            setParts.push(`delivery_date = $${idx}::date`);
          else setParts.push(`${colTag} = $${idx}`);
          values.push(val);
        }
        const affected = await tx.exec(
          `UPDATE buyer_orders SET ${setParts.join(', ')} WHERE id = $${values.length + 1}::uuid`,
          [...values, id],
        );
        if (affected === 0) throw new NotFoundException(`Order ${id} not found`);
      } else {
        const exists = await tx.query<{ id: string }>(
          `SELECT id FROM buyer_orders WHERE id = $1::uuid`,
          [id],
        );
        if (exists.length === 0) throw new NotFoundException(`Order ${id} not found`);
      }

      if (dto.lines !== undefined) {
        await tx.exec(`DELETE FROM order_lines WHERE order_id = $1::uuid`, [id]);
        for (const line of dto.lines) await this.insertLine(tx, id, line);
      }
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM buyer_orders WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Order ${id} not found`);
  }

  private async insertLine(
    tx: TenantTx,
    orderId: string,
    line: CreateOrderLineDto,
  ): Promise<void> {
    const lineRows = await tx.query<{ id: string }>(
      `INSERT INTO order_lines (order_id, style_id, color, quantity, unit_price, notes)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6) RETURNING id`,
      [
        orderId,
        line.styleId,
        line.color ?? null,
        line.quantity,
        line.unitPrice,
        line.notes ?? null,
      ],
    );
    const lineId = lineRows[0].id;
    if (line.sizes && line.sizes.length > 0) {
      for (let idx = 0; idx < line.sizes.length; idx++) {
        const s = line.sizes[idx];
        await tx.exec(
          `INSERT INTO order_size_breakdown (order_line_id, size_label, quantity, sort_order)
           VALUES ($1::uuid, $2, $3, $4)`,
          [lineId, s.sizeLabel, s.quantity, s.sortOrder ?? idx],
        );
      }
    }
  }

  private assemble(
    orderRow: Record<string, unknown>,
    allLines: Record<string, unknown>[],
    allSizes: Record<string, unknown>[],
  ): BuyerOrder {
    const order = camelize(orderRow) as unknown as Omit<BuyerOrder, 'lines' | 'totalQuantity' | 'totalValue'>;
    const lines: OrderLine[] = allLines
      .filter((l) => l['order_id'] === orderRow['id'])
      .map((l) => {
        const lineId = l['id'] as string;
        const sizes: OrderSizeRow[] = allSizes
          .filter((s) => s['order_line_id'] === lineId)
          .map((s) => camelize(s) as unknown as OrderSizeRow);
        return { ...(camelize(l) as unknown as Omit<OrderLine, 'sizes'>), sizes };
      });
    let totalQty = 0;
    let totalValue = 0;
    for (const ln of lines) {
      const q = Number(ln.quantity ?? 0);
      const p = Number(ln.unitPrice ?? 0);
      totalQty += q;
      totalValue += q * p;
    }
    return { ...order, lines, totalQuantity: totalQty, totalValue };
  }
}
