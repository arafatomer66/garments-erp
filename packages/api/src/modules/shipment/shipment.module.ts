import { Module } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { ShipmentController } from './shipment.controller';

@Module({
  providers: [ShipmentService],
  controllers: [ShipmentController],
})
export class ShipmentModule {}
