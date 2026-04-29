import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type {
  BuyerPortalSummary,
  BuyerPortalUser,
} from '@org/shared-types';
import { TenantRepository } from '../../core/database/tenant-repository';
import { camelize } from '../masters/sql.util';
import {
  CreateBuyerPortalUserDto,
  UpdateBuyerPortalUserDto,
} from './dto/portal-user.dto';

@Injectable()
export class BuyerPortalService extends TenantRepository {
  async listUsers(): Promise<BuyerPortalUser[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT u.*, b.code AS buyer_code, b.name AS buyer_name,
              i.invite_token AS pending_invite_token,
              i.expires_at  AS pending_invite_expires_at
         FROM buyer_portal_users u
         LEFT JOIN buyers b ON b.id = u.buyer_id
         LEFT JOIN LATERAL (
           SELECT invite_token, expires_at
             FROM buyer_portal_invites
            WHERE portal_user_id = u.id AND accepted_at IS NULL
            ORDER BY created_at DESC LIMIT 1
         ) i ON TRUE
        ORDER BY u.created_at DESC`,
    );
    return rows.map((r) => camelize(r) as unknown as BuyerPortalUser);
  }

  async findUser(id: string): Promise<BuyerPortalUser> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT u.*, b.code AS buyer_code, b.name AS buyer_name,
              i.invite_token AS pending_invite_token,
              i.expires_at  AS pending_invite_expires_at
         FROM buyer_portal_users u
         LEFT JOIN buyers b ON b.id = u.buyer_id
         LEFT JOIN LATERAL (
           SELECT invite_token, expires_at
             FROM buyer_portal_invites
            WHERE portal_user_id = u.id AND accepted_at IS NULL
            ORDER BY created_at DESC LIMIT 1
         ) i ON TRUE
        WHERE u.id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException(`Portal user ${id} not found`);
    return camelize(rows[0]) as unknown as BuyerPortalUser;
  }

  async createUser(dto: CreateBuyerPortalUserDto): Promise<BuyerPortalUser> {
    return this.withTx(async (tx) => {
      const userRows = await tx.query<{ id: string }>(
        `INSERT INTO buyer_portal_users
           (buyer_id, full_name, email, designation, phone,
            can_view_orders, can_view_samples, can_view_production,
            can_view_quality, can_view_shipments, can_view_invoices, is_active)
         VALUES ($1::uuid, $2, $3, $4, $5,
                 COALESCE($6, TRUE), COALESCE($7, TRUE), COALESCE($8, TRUE),
                 COALESCE($9, FALSE), COALESCE($10, TRUE), COALESCE($11, FALSE),
                 COALESCE($12, TRUE))
         RETURNING id`,
        [
          dto.buyerId,
          dto.fullName,
          dto.email,
          dto.designation ?? null,
          dto.phone ?? null,
          dto.canViewOrders ?? null,
          dto.canViewSamples ?? null,
          dto.canViewProduction ?? null,
          dto.canViewQuality ?? null,
          dto.canViewShipments ?? null,
          dto.canViewInvoices ?? null,
          dto.isActive ?? null,
        ],
      );
      const userId = userRows[0].id;

      const token = randomBytes(24).toString('hex');
      await tx.exec(
        `INSERT INTO buyer_portal_invites (portal_user_id, invite_token, expires_at)
         VALUES ($1::uuid, $2, NOW() + INTERVAL '14 days')`,
        [userId, token],
      );
      return this.findUser(userId);
    });
  }

  async updateUser(id: string, dto: UpdateBuyerPortalUserDto): Promise<BuyerPortalUser> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const push = (col: string, val: unknown) => {
      vals.push(val);
      sets.push(`${col} = $${vals.length}`);
    };
    if (dto.fullName !== undefined) push('full_name', dto.fullName);
    if (dto.designation !== undefined) push('designation', dto.designation);
    if (dto.phone !== undefined) push('phone', dto.phone);
    if (dto.canViewOrders !== undefined) push('can_view_orders', dto.canViewOrders);
    if (dto.canViewSamples !== undefined) push('can_view_samples', dto.canViewSamples);
    if (dto.canViewProduction !== undefined) push('can_view_production', dto.canViewProduction);
    if (dto.canViewQuality !== undefined) push('can_view_quality', dto.canViewQuality);
    if (dto.canViewShipments !== undefined) push('can_view_shipments', dto.canViewShipments);
    if (dto.canViewInvoices !== undefined) push('can_view_invoices', dto.canViewInvoices);
    if (dto.isActive !== undefined) push('is_active', dto.isActive);
    if (sets.length === 0) return this.findUser(id);
    vals.push(id);
    await this.exec(
      `UPDATE buyer_portal_users SET ${sets.join(', ')} WHERE id = $${vals.length}::uuid`,
      vals,
    );
    return this.findUser(id);
  }

  async deleteUser(id: string): Promise<void> {
    await this.exec(`DELETE FROM buyer_portal_users WHERE id = $1::uuid`, [id]);
  }

  async resendInvite(id: string): Promise<BuyerPortalUser> {
    const token = randomBytes(24).toString('hex');
    await this.exec(
      `INSERT INTO buyer_portal_invites (portal_user_id, invite_token, expires_at)
       VALUES ($1::uuid, $2, NOW() + INTERVAL '14 days')`,
      [id, token],
    );
    return this.findUser(id);
  }

  async getSummary(): Promise<BuyerPortalSummary> {
    const [counts] = await this.query<Record<string, string>>(
      `SELECT
         (SELECT COUNT(*) FROM buyer_portal_users)::text AS total_users,
         (SELECT COUNT(*) FROM buyer_portal_users WHERE is_active)::text AS active_users,
         (SELECT COUNT(*) FROM buyer_portal_invites
            WHERE accepted_at IS NULL AND expires_at > NOW())::text AS pending_invites,
         (SELECT COUNT(DISTINCT buyer_id) FROM buyer_portal_users WHERE is_active)::text AS buyers_with_access`,
    );
    return {
      totalUsers: Number(counts?.total_users ?? 0),
      activeUsers: Number(counts?.active_users ?? 0),
      pendingInvites: Number(counts?.pending_invites ?? 0),
      buyersWithAccess: Number(counts?.buyers_with_access ?? 0),
    };
  }
}
