import { Module } from '@nestjs/common';
import { BuyersService } from './buyers.service';
import { BuyersController } from './buyers.controller';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';

@Module({
  providers: [BuyersService, SuppliersService, ItemsService],
  controllers: [BuyersController, SuppliersController, ItemsController],
})
export class MastersModule {}
