import { Injectable, NotFoundException } from '@nestjs/common';
import type { Buyer } from '@org/shared-types';
import { TenantRepository } from '../../core/database/tenant-repository';
import { CreateBuyerDto, UpdateBuyerDto } from './dto/buyer.dto';
import { buildUpdate, camelize } from './sql.util';

const BUYER_FIELDS = [
  'code',
  'name',
  'country',
  'contactPerson',
  'email',
  'phone',
  'paymentTerms',
  'notes',
  'isActive',
] as const;

@Injectable()
export class BuyersService extends TenantRepository {
  async list(): Promise<Buyer[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM buyers ORDER BY created_at DESC`,
    );
    return rows.map((r) => camelize(r) as unknown as Buyer);
  }

  async findOne(id: string): Promise<Buyer> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM buyers WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Buyer ${id} not found`);
    return camelize(rows[0]) as unknown as Buyer;
  }

  async create(dto: CreateBuyerDto): Promise<Buyer> {
    const rows = await this.query<Record<string, unknown>>(
      `INSERT INTO buyers (code, name, country, contact_person, email, phone, payment_terms, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        dto.code,
        dto.name,
        dto.country ?? null,
        dto.contactPerson ?? null,
        dto.email ?? null,
        dto.phone ?? null,
        dto.paymentTerms ?? null,
        dto.notes ?? null,
      ],
    );
    return camelize(rows[0]) as unknown as Buyer;
  }

  async update(id: string, dto: UpdateBuyerDto): Promise<Buyer> {
    const { setClause, values } = buildUpdate(BUYER_FIELDS, dto as Record<string, unknown>);
    if (!setClause) return this.findOne(id);
    const rows = await this.query<Record<string, unknown>>(
      `UPDATE buyers SET ${setClause} WHERE id = $${values.length + 1}::uuid RETURNING *`,
      [...values, id],
    );
    if (rows.length === 0) throw new NotFoundException(`Buyer ${id} not found`);
    return camelize(rows[0]) as unknown as Buyer;
  }

  async remove(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM buyers WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Buyer ${id} not found`);
  }
}
