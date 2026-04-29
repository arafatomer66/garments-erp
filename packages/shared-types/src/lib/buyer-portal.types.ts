export interface BuyerPortalUser {
  id: string;
  buyerId: string;
  buyerName?: string | null;
  buyerCode?: string | null;
  fullName: string;
  email: string;
  designation?: string | null;
  phone?: string | null;
  canViewOrders: boolean;
  canViewSamples: boolean;
  canViewProduction: boolean;
  canViewQuality: boolean;
  canViewShipments: boolean;
  canViewInvoices: boolean;
  isActive: boolean;
  lastLoginAt?: string | null;
  pendingInviteToken?: string | null;
  pendingInviteExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BuyerPortalInvite {
  id: string;
  portalUserId: string;
  inviteToken: string;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
}

export interface CreateBuyerPortalUserDto {
  buyerId: string;
  fullName: string;
  email: string;
  designation?: string | null;
  phone?: string | null;
  canViewOrders?: boolean;
  canViewSamples?: boolean;
  canViewProduction?: boolean;
  canViewQuality?: boolean;
  canViewShipments?: boolean;
  canViewInvoices?: boolean;
  isActive?: boolean;
}

export interface UpdateBuyerPortalUserDto extends Partial<Omit<CreateBuyerPortalUserDto, 'buyerId' | 'email'>> {}

export interface BuyerPortalSummary {
  totalUsers: number;
  activeUsers: number;
  pendingInvites: number;
  buyersWithAccess: number;
}
