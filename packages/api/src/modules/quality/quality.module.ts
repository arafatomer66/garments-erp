import { Module } from '@nestjs/common';
import { QualityService } from './quality.service';
import { QualityController } from './quality.controller';

@Module({
  providers: [QualityService],
  controllers: [QualityController],
})
export class QualityModule {}
