import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../core/prisma/prisma.module';
import { TenancyModule } from '../core/tenancy/tenancy.module';
import { DatabaseModule } from '../core/database/database.module';
import { AuthModule } from '../core/auth/auth.module';
import { IamModule } from '../modules/iam/iam.module';
import { HealthModule } from '../modules/health/health.module';
import { MastersModule } from '../modules/masters/masters.module';
import { MerchandisingModule } from '../modules/merchandising/merchandising.module';
import { OrdersModule } from '../modules/orders/orders.module';
import { BomModule } from '../modules/bom/bom.module';
import { ProcurementModule } from '../modules/procurement/procurement.module';
import { InventoryModule } from '../modules/inventory/inventory.module';
import { ProductionModule } from '../modules/production/production.module';
import { QualityModule } from '../modules/quality/quality.module';
import { ShipmentModule } from '../modules/shipment/shipment.module';
import { HrModule } from '../modules/hr/hr.module';
import { FinanceModule } from '../modules/finance/finance.module';
import { ComplianceModule } from '../modules/compliance/compliance.module';
import { BuyerPortalModule } from '../modules/buyer-portal/buyer-portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    PrismaModule,
    DatabaseModule,
    TenancyModule,
    AuthModule,
    IamModule,
    HealthModule,
    MastersModule,
    MerchandisingModule,
    OrdersModule,
    BomModule,
    ProcurementModule,
    InventoryModule,
    ProductionModule,
    QualityModule,
    ShipmentModule,
    HrModule,
    FinanceModule,
    ComplianceModule,
    BuyerPortalModule,
  ],
})
export class AppModule {}
