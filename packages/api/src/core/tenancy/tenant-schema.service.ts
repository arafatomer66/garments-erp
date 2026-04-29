import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { splitSqlStatements } from '../database/sql-statements';

const SCHEMA_NAME_PATTERN = /^tenant_[a-z0-9_]+$/;
const SCHEMA_PLACEHOLDER = '{{SCHEMA}}';

/**
 * Provisions and tears down per-tenant Postgres schemas, then applies the
 * tenant DDL template (`prisma/tenant-schema.sql`) to materialize the Phase 1
 * business tables (buyers, suppliers, items).
 *
 * Migrations beyond the initial DDL will land in Phase 1.5 once a proper
 * tenant migration runner with pg_advisory_lock is built.
 */
@Injectable()
export class TenantSchemaService {
  private readonly logger = new Logger(TenantSchemaService.name);
  private readonly tenantDdl: string;

  constructor(private readonly prisma: PrismaService) {
    const ddlPath = join(process.cwd(), 'packages/api/prisma/tenant-schema.sql');
    this.tenantDdl = readFileSync(ddlPath, 'utf8');
  }

  buildSchemaName(tenantSlug: string): string {
    const slug = tenantSlug.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `tenant_${slug}`;
  }

  async createTenantSchema(schemaName: string): Promise<void> {
    this.assertValidSchemaName(schemaName);
    await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await this.applyTenantDdl(schemaName);
    this.logger.log(`Provisioned tenant schema: ${schemaName}`);
  }

  async dropTenantSchema(schemaName: string): Promise<void> {
    this.assertValidSchemaName(schemaName);
    await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    this.logger.warn(`Dropped tenant schema: ${schemaName}`);
  }

  async applyTenantDdl(schemaName: string): Promise<void> {
    this.assertValidSchemaName(schemaName);
    const sql = this.tenantDdl.replaceAll(SCHEMA_PLACEHOLDER, schemaName);
    for (const stmt of splitSqlStatements(sql)) {
      await this.prisma.$executeRawUnsafe(stmt);
    }
  }

  private assertValidSchemaName(schemaName: string): void {
    if (!SCHEMA_NAME_PATTERN.test(schemaName)) {
      throw new Error(`Invalid schema name: ${schemaName}`);
    }
  }
}
