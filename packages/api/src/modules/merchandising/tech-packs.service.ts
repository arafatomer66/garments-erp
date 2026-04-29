import { Injectable, NotFoundException } from '@nestjs/common';
import type { TechPack } from '@org/shared-types';
import { TenantRepository } from '../../core/database/tenant-repository';
import { CreateTechPackDto } from './dto/tech-pack.dto';
import { camelize } from '../masters/sql.util';

@Injectable()
export class TechPacksService extends TenantRepository {
  async listForStyle(styleId: string): Promise<TechPack[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM tech_packs WHERE style_id = $1::uuid ORDER BY version DESC`,
      [styleId],
    );
    return rows.map((r) => camelize(r) as unknown as TechPack);
  }

  async create(dto: CreateTechPackDto): Promise<TechPack> {
    return this.withTx(async (tx) => {
      const versionRows = await tx.query<{ next: number }>(
        `SELECT COALESCE(MAX(version), 0) + 1 AS next FROM tech_packs WHERE style_id = $1::uuid`,
        [dto.styleId],
      );
      const nextVersion = Number(versionRows[0]?.next ?? 1);
      const rows = await tx.query<Record<string, unknown>>(
        `INSERT INTO tech_packs (style_id, version, file_name, storage_key, content_type, size_bytes, notes)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          dto.styleId,
          nextVersion,
          dto.fileName,
          dto.storageKey,
          dto.contentType ?? null,
          dto.sizeBytes ?? null,
          dto.notes ?? null,
        ],
      );
      return camelize(rows[0]) as unknown as TechPack;
    });
  }

  async remove(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM tech_packs WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`TechPack ${id} not found`);
  }
}
