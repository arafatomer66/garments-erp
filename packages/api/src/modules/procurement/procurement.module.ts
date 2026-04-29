import { Module } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { ProcurementController } from './procurement.controller';

@Module({
  providers: [ProcurementService],
  controllers: [ProcurementController],
})
export class ProcurementModule {}
