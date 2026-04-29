import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenant } from '../tenancy/tenant-context';
import type { Prisma } from '@prisma/client';

const SCHEMA_NAME_PATTERN = /^tenant_[a-z0-9_]+$/;

export type TenantTx = {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string, params?: unknown[]): Promise<number>;
};

/**
 * Base helper for tenant-scoped queries. Each call validates the schema name
 * against a strict regex before interpolating it into the SQL — this is
 * required because Prisma cannot parameterize identifiers.
 *
 * Inside the callback, the connection has `search_path` pinned to the tenant
 * schema, so unqualified table names resolve correctly. The transaction scope
 * keeps the search_path setting on the same physical connection.
 */
@Injectable()
export class TenantRepository {
  constructor(protected readonly prisma: PrismaService) {}

  protected schema(): string {
    const ctx = requireTenant();
    if (!SCHEMA_NAME_PATTERN.test(ctx.schemaName)) {
      throw new Error(`Invalid tenant schema name: ${ctx.schemaName}`);
    }
    return ctx.schemaName;
  }

  protected async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const schema = this.schema();
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}", public`);
      return (await tx.$queryRawUnsafe(sql, ...params)) as T[];
    });
  }

  protected async exec(sql: string, params: unknown[] = []): Promise<number> {
    const schema = this.schema();
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}", public`);
      return tx.$executeRawUnsafe(sql, ...params);
    });
  }

  protected async withTx<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    const schema = this.schema();
    return this.prisma.$transaction(async (rawTx: Prisma.TransactionClient) => {
      await rawTx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}", public`);
      const tx: TenantTx = {
        query: async <U>(sql: string, params: unknown[] = []) =>
          (await rawTx.$queryRawUnsafe(sql, ...params)) as U[],
        exec: async (sql: string, params: unknown[] = []) =>
          rawTx.$executeRawUnsafe(sql, ...params),
      };
      return fn(tx);
    });
  }
}
