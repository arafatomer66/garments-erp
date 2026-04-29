import { Module } from '@nestjs/common';
import { StylesService } from './styles.service';
import { StylesController } from './styles.controller';
import { TechPacksService } from './tech-packs.service';
import { TechPacksController } from './tech-packs.controller';
import { TaTasksService } from './ta-tasks.service';
import { TaTasksController } from './ta-tasks.controller';

@Module({
  providers: [StylesService, TechPacksService, TaTasksService],
  controllers: [StylesController, TechPacksController, TaTasksController],
})
export class MerchandisingModule {}
