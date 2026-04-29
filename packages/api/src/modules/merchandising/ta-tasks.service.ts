import { Injectable, NotFoundException } from '@nestjs/common';
import type { TaTask } from '@org/shared-types';
import { TenantRepository } from '../../core/database/tenant-repository';
import { CreateTaTaskDto, UpdateTaTaskDto } from './dto/ta-task.dto';
import { buildUpdate, camelize } from '../masters/sql.util';

const TA_FIELDS = [
  'styleId',
  'sequence',
  'code',
  'name',
  'plannedStart',
  'plannedEnd',
  'actualStart',
  'actualEnd',
  'status',
  'owner',
  'remarks',
] as const;

@Injectable()
export class TaTasksService extends TenantRepository {
  async listForStyle(styleId: string): Promise<TaTask[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT * FROM ta_tasks WHERE style_id = $1::uuid ORDER BY sequence, planned_end`,
      [styleId],
    );
    return rows.map((r) => camelize(r) as unknown as TaTask);
  }

  async create(dto: CreateTaTaskDto): Promise<TaTask> {
    const rows = await this.query<Record<string, unknown>>(
      `INSERT INTO ta_tasks (
        style_id, sequence, code, name,
        planned_start, planned_end, actual_start, actual_end,
        status, owner, remarks
       ) VALUES ($1::uuid, $2, $3, $4, $5::date, $6::date, $7::date, $8::date, $9, $10, $11)
       RETURNING *`,
      [
        dto.styleId,
        dto.sequence ?? 0,
        dto.code,
        dto.name,
        dto.plannedStart ?? null,
        dto.plannedEnd,
        dto.actualStart ?? null,
        dto.actualEnd ?? null,
        dto.status ?? 'pending',
        dto.owner ?? null,
        dto.remarks ?? null,
      ],
    );
    return camelize(rows[0]) as unknown as TaTask;
  }

  async update(id: string, dto: UpdateTaTaskDto): Promise<TaTask> {
    const { setClause, values } = buildUpdate(TA_FIELDS, dto as Record<string, unknown>);
    if (!setClause) {
      const rows = await this.query<Record<string, unknown>>(
        `SELECT * FROM ta_tasks WHERE id = $1::uuid`,
        [id],
      );
      if (rows.length === 0) throw new NotFoundException(`TaTask ${id} not found`);
      return camelize(rows[0]) as unknown as TaTask;
    }
    let finalSet = setClause.replace(/style_id = (\$\d+)/, 'style_id = $1::uuid');
    finalSet = finalSet
      .replace(/planned_start = (\$\d+)/, 'planned_start = $1::date')
      .replace(/planned_end = (\$\d+)/, 'planned_end = $1::date')
      .replace(/actual_start = (\$\d+)/, 'actual_start = $1::date')
      .replace(/actual_end = (\$\d+)/, 'actual_end = $1::date');
    const rows = await this.query<Record<string, unknown>>(
      `UPDATE ta_tasks SET ${finalSet} WHERE id = $${values.length + 1}::uuid RETURNING *`,
      [...values, id],
    );
    if (rows.length === 0) throw new NotFoundException(`TaTask ${id} not found`);
    return camelize(rows[0]) as unknown as TaTask;
  }

  async remove(id: string): Promise<void> {
    const affected = await this.exec(`DELETE FROM ta_tasks WHERE id = $1::uuid`, [id]);
    if (affected === 0) throw new NotFoundException(`TaTask ${id} not found`);
  }
}
