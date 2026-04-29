import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type {
  CreateTenantUserDto,
  Tenant,
  TenantUser,
  UpdateTenantSettingsDto,
  UpdateTenantUserDto,
  UserRole,
} from '@org/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { requireTenant } from '../../core/tenancy/tenant-context';

const BCRYPT_ROUNDS = 12;

const ALL_ROLES: UserRole[] = [
  'platform_admin',
  'tenant_owner',
  'tenant_admin',
  'merchandiser',
  'production_manager',
  'qc_manager',
  'store_keeper',
  'finance',
  'hr',
  'floor_supervisor',
  'viewer',
];

@Injectable()
export class IamService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenant(): Promise<Tenant> {
    const ctx = requireTenant();
    const t = await this.prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } });
    return this.serializeTenant(t);
  }

  async updateTenant(dto: UpdateTenantSettingsDto): Promise<Tenant> {
    const ctx = requireTenant();
    const t = await this.prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: {
        name: dto.name,
        country: dto.country,
        currencyCode: dto.currencyCode,
        timezone: dto.timezone,
      },
    });
    return this.serializeTenant(t);
  }

  listRoles(): UserRole[] {
    return ALL_ROLES;
  }

  async listUsers(): Promise<TenantUser[]> {
    const ctx = requireTenant();
    const memberships = await this.prisma.userMembership.findMany({
      where: { tenantId: ctx.tenantId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => this.serializeMembership(m));
  }

  async createUser(dto: CreateTenantUserDto): Promise<TenantUser> {
    const ctx = requireTenant();
    if (!dto.roles || dto.roles.length === 0) {
      throw new BadRequestException('At least one role is required');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

    const result = await this.prisma.$transaction(async (tx) => {
      let userId: string;
      if (existing) {
        const dup = await tx.userMembership.findUnique({
          where: { userId_tenantId: { userId: existing.id, tenantId: ctx.tenantId } },
        });
        if (dup) {
          throw new ConflictException('User already a member of this tenant');
        }
        userId = existing.id;
      } else {
        const u = await tx.user.create({
          data: {
            email: dto.email,
            fullName: dto.fullName,
            phone: dto.phone,
            passwordHash,
          },
        });
        userId = u.id;
      }
      const membership = await tx.userMembership.create({
        data: { userId, tenantId: ctx.tenantId, roles: dto.roles },
        include: { user: true },
      });
      return membership;
    });

    return this.serializeMembership(result);
  }

  async updateUser(userId: string, dto: UpdateTenantUserDto): Promise<TenantUser> {
    const ctx = requireTenant();
    const membership = await this.prisma.userMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId: ctx.tenantId } },
    });
    if (!membership) throw new NotFoundException('Membership not found');

    if (dto.fullName !== undefined || dto.phone !== undefined || dto.isActive !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          fullName: dto.fullName,
          phone: dto.phone,
          isActive: dto.isActive,
        },
      });
    }
    if (dto.roles && dto.roles.length > 0) {
      await this.prisma.userMembership.update({
        where: { id: membership.id },
        data: { roles: dto.roles },
      });
    }

    const updated = await this.prisma.userMembership.findUnique({
      where: { id: membership.id },
      include: { user: true },
    });
    return this.serializeMembership(updated!);
  }

  async removeUser(userId: string): Promise<void> {
    const ctx = requireTenant();
    if (userId === ctx.userId) {
      throw new BadRequestException('You cannot remove yourself from the tenant');
    }
    const membership = await this.prisma.userMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId: ctx.tenantId } },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    await this.prisma.userMembership.delete({ where: { id: membership.id } });
  }

  private serializeTenant(t: {
    id: string;
    slug: string;
    name: string;
    schemaName: string;
    status: string;
    country: string;
    currencyCode: string;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
  }): Tenant {
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      schemaName: t.schemaName,
      status: t.status as Tenant['status'],
      country: t.country,
      currencyCode: t.currencyCode,
      timezone: t.timezone,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private serializeMembership(m: {
    id: string;
    userId: string;
    tenantId: string;
    roles: UserRole[];
    createdAt: Date;
    user: {
      id: string;
      email: string;
      fullName: string;
      phone: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
  }): TenantUser {
    return {
      userId: m.userId,
      email: m.user.email,
      fullName: m.user.fullName,
      phone: m.user.phone ?? undefined,
      isActive: m.user.isActive,
      roles: m.roles,
      joinedAt: m.createdAt.toISOString(),
    };
  }
}
