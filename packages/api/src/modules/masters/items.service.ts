import { Injectable, NotFoundException } from '@nestjs/common';
import type { Item } from '@org/shared-types';
import { TenantRepository } from '../../core/database/tenant-repository';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { buildUpdate, camelize } from './sql.util';

const ITEM_FIELDS = [
  'code',
  'name',
  'category',
  'uom',
  'description',
  'defaultSupplierId',
  'standardCost',
  'currencyCode',
  'reorderLevel',
  'isActive',
] as const;

function normalize(row: Record<string, unknown>): Item {
  const c = camelize(row) as unknown as Item & { standardCost: unknown; reorderLevel: unknown };
  return {
    ...c,
    standardCost: c.standardCost == null ? undefined : Number(c.standardCost),
    reorderLevel: c.reorderLevel == null ? 0 : Number(c.reorderLevel),
  };
}

@Injectable()
export class ItemsService extends TenantRepository {
  async list(): Promise<Item[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM items ORDER BY created_at DESC`,
    );
    return rows.map(normalize);
  }

  async findOne(id: string): Promise<Item> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM items WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Item ${id} not found`);
    return normalize(rows[0]);
  }

  async create(dto: CreateItemDto): Promise<Item> {
    const rows = await this.query<Record<string, unknown>>(
      `INSERT INTO items (
         code, name, category, uom, description, default_supplier_id,
         standard_cost, currency_code, reorder_level
       ) VALUES ($1, $2, $3, $4, $5, $6::uuid, $7, $8, $9) RETURNING *`,
      [
        dto.code,
        dto.name,
        dto.category,
        dto.uom,
        dto.description ?? null,
        dto.defaultSupplierId ?? null,
        dto.standardCost ?? null,
        dto.currencyCode ?? 'USD',
        dto.reorderLevel ?? 0,
      ],
    );
    return normalize(rows[0]);
  }

  async update(id: string, dto: UpdateItemDto): Promise<Item> {
    const { setClause, values } = buildUpdate(ITEM_FIELDS, dto as Record<string, unknown>);
    if (!setClause) return this.findOne(id);
    const rows = await this.query<Record<string, unknown>>(
      `UPDATE items SET ${setClause} WHERE id = $${values.length + 1}::uuid RETURNING *`,
      [...values, id],
    );
    if (rows.length === 0) throw new NotFoundException(`Item ${id} not found`);
    return normalize(rows[0]);
  }

  async remove(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM items WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Item ${id} not found`);
  }
}
