import { Module } from '@nestjs/common';
import { BomService } from './bom.service';
import { BomController } from './bom.controller';

@Module({
  providers: [BomService],
  controllers: [BomController],
})
export class BomModule {}
