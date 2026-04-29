import { Module } from '@nestjs/common';
import { BuyerPortalService } from './buyer-portal.service';
import { BuyerPortalController } from './buyer-portal.controller';

@Module({
  providers: [BuyerPortalService],
  controllers: [BuyerPortalController],
})
export class BuyerPortalModule {}
