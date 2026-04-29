import { Injectable, NotFoundException } from '@nestjs/common';
import type { Supplier } from '@org/shared-types';
import { TenantRepository } from '../../core/database/tenant-repository';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { buildUpdate, camelize } from './sql.util';

const SUPPLIER_FIELDS = [
  'code',
  'name',
  'type',
  'country',
  'contactPerson',
  'email',
  'phone',
  'paymentTerms',
  'notes',
  'isActive',
] as const;

@Injectable()
export class SuppliersService extends TenantRepository {
  async list(): Promise<Supplier[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM suppliers ORDER BY created_at DESC`,
    );
    return rows.map((r) => camelize(r) as unknown as Supplier);
  }

  async findOne(id: string): Promise<Supplier> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM suppliers WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Supplier ${id} not found`);
    return camelize(rows[0]) as unknown as Supplier;
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const rows = await this.query<Record<string, unknown>>(
      `INSERT INTO suppliers (code, name, type, country, contact_person, email, phone, payment_terms, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        dto.code,
        dto.name,
        dto.type,
        dto.country ?? null,
        dto.contactPerson ?? null,
        dto.email ?? null,
        dto.phone ?? null,
        dto.paymentTerms ?? null,
        dto.notes ?? null,
      ],
    );
    return camelize(rows[0]) as unknown as Supplier;
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const { setClause, values } = buildUpdate(SUPPLIER_FIELDS, dto as Record<string, unknown>);
    if (!setClause) return this.findOne(id);
    const rows = await this.query<Record<string, unknown>>(
      `UPDATE suppliers SET ${setClause} WHERE id = $${values.length + 1}::uuid RETURNING *`,
      [...values, id],
    );
    if (rows.length === 0) throw new NotFoundException(`Supplier ${id} not found`);
    return camelize(rows[0]) as unknown as Supplier;
  }

  async remove(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM suppliers WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`Supplier ${id} not found`);
  }
}
