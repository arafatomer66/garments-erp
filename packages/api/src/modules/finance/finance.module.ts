import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';

@Module({
  providers: [FinanceService],
  controllers: [FinanceController],
})
export class FinanceModule {}
