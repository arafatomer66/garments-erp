import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import type {
  AuthSession,
  AuthTokens,
  JwtPayload,
  LoginDto,
  SignupDto,
} from '@org/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { TenantSchemaService } from '../tenancy/tenant-schema.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly tenantSchemas: TenantSchemaService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthSession> {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (existingTenant) {
      throw new ConflictException('Tenant slug already taken');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.ownerEmail },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const schemaName = this.tenantSchemas.buildSchemaName(dto.tenantSlug);
    const passwordHash = await bcrypt.hash(dto.ownerPassword, BCRYPT_ROUNDS);

    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { slug: dto.tenantSlug, name: dto.tenantName, schemaName },
      });
      const user = await tx.user.create({
        data: {
          email: dto.ownerEmail,
          fullName: dto.ownerFullName,
          passwordHash,
        },
      });
      await tx.userMembership.create({
        data: { userId: user.id, tenantId: tenant.id, roles: ['tenant_owner'] },
      });
      return { tenant, user };
    });

    await this.tenantSchemas.createTenantSchema(schemaName);

    const tokens = await this.issueTokens(user.id, tenant.id, tenant.slug, schemaName, [
      'tenant_owner',
    ]);

    return {
      user: this.serializeUser(user),
      tenant: this.serializeTenant(tenant),
      roles: ['tenant_owner'],
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { memberships: { include: { tenant: true } } },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = dto.tenantSlug
      ? user.memberships.find((m) => m.tenant.slug === dto.tenantSlug)
      : user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('No tenant membership for this user');
    }

    const tokens = await this.issueTokens(
      user.id,
      membership.tenant.id,
      membership.tenant.slug,
      membership.tenant.schemaName,
      membership.roles,
    );

    return {
      user: this.serializeUser(user),
      tenant: this.serializeTenant(membership.tenant),
      roles: membership.roles,
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      include: { memberships: { where: { tenantId: stored.tenantId }, include: { tenant: true } } },
    });
    const membership = user?.memberships[0];
    if (!user || !membership) {
      throw new UnauthorizedException('User or membership not found');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      user.id,
      membership.tenant.id,
      membership.tenant.slug,
      membership.tenant.schemaName,
      membership.roles,
    );
  }

  private async issueTokens(
    userId: string,
    tenantId: string,
    tenantSlug: string,
    schemaName: string,
    roles: JwtPayload['roles'],
  ): Promise<AuthTokens> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL') ?? '30d';
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email: user.email,
      tenantId,
      tenantSlug,
      schemaName,
      roles,
    };

    const accessToken = await this.jwt.signAsync(payload, { expiresIn: accessTtl });
    const refreshTokenRaw = randomBytes(48).toString('hex');
    const refreshTokenSigned = await this.jwt.signAsync(
      { sub: userId, jti: refreshTokenRaw },
      { secret: refreshSecret, expiresIn: refreshTtl },
    );

    const expiresAt = new Date(Date.now() + this.parseTtlMs(refreshTtl));
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tenantId,
        tokenHash: this.hashToken(refreshTokenSigned),
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenSigned,
      expiresIn: this.parseTtlMs(accessTtl) / 1000,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 15 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return value * multipliers[unit as keyof typeof multipliers];
  }

  private serializeUser(user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone ?? undefined,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private serializeTenant(tenant: {
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
  }) {
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      schemaName: tenant.schemaName,
      status: tenant.status as AuthSession['tenant']['status'],
      country: tenant.country,
      currencyCode: tenant.currencyCode,
      timezone: tenant.timezone,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }
}
