import { Injectable, NotFoundException } from '@nestjs/common';
import type { Style } from '@org/shared-types';
import { TenantRepository } from '../../core/database/tenant-repository';
import { CreateStyleDto, UpdateStyleDto } from './dto/style.dto';
import { buildUpdate, camelize } from '../masters/sql.util';

const STYLE_FIELDS = [
  'code',
  'name',
  'buyerId',
  'season',
  'productType',
  'fabricSummary',
  'description',
  'targetFob',
  'currencyCode',
  'status',
] as const;

@Injectable()
export class StylesService extends TenantRepository {
  async list(buyerId?: string): Promise<Style[]> {
    const rows = buyerId
      ? await this.query<Record<string, unknown>>(
          `SELECT * FROM styles WHERE buyer_id = $1::uuid ORDER BY created_at DESC`,
          [buyerId],
        )
      : await this.query<Record<string, unknown>>(
          `SELECT * FROM styles ORDER BY created_at DESC`,
        );
    return rows.map((r) => camelize(r) as unknown as Style);
  }

  async findOne(id: string): Promise<Style> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM styles WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Style ${id} not found`);
    return camelize(rows[0]) as unknown as Style;
  }

  async create(dto: CreateStyleDto): Promise<Style> {
    const rows = await this.query<Record<string, unknown>>(
      `INSERT INTO styles (
        code, name, buyer_id, season, product_type, fabric_summary,
        description, target_fob, currency_code, status
       ) VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        dto.code,
        dto.name,
        dto.buyerId,
        dto.season ?? null,
        dto.productType ?? null,
        dto.fabricSummary ?? null,
        dto.description ?? null,
        dto.targetFob ?? null,
        dto.currencyCode ?? 'USD',
        dto.status ?? 'development',
      ],
    );
    return camelize(rows[0]) as unknown as Style;
  }

  async update(id: string, dto: UpdateStyleDto): Promise<Style> {
    const { setClause, values } = buildUpdate(STYLE_FIELDS, dto as Record<string, unknown>);
    if (!setClause) return this.findOne(id);
    const finalSet = setClause.replace(/buyer_id = (\$\d+)/, 'buyer_id = $1::uuid');
    const rows = await this.query<Record<string, unknown>>(
      `UPDATE styles SET ${finalSet} WHERE id = $${values.length + 1}::uuid RETURNING *`,
      [...values, id],
    );
    if (rows.length === 0) throw new NotFoundException(`Style ${id} not found`);
    return camelize(rows[0]) as unknown as Style;
  }

  async remove(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM styles WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Style ${id} not found`);
  }
}
