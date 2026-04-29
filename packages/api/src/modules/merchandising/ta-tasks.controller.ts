import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TaTasksService } from './ta-tasks.service';
import { CreateTaTaskDto, UpdateTaTaskDto } from './dto/ta-task.dto';

@ApiTags('merchandising')
@ApiBearerAuth()
@Controller('merchandising/ta-tasks')
export class TaTasksController {
  constructor(private readonly taTasks: TaTasksService) {}

  @Get()
  list(@Query('styleId', ParseUUIDPipe) styleId: string) {
    return this.taTasks.listForStyle(styleId);
  }

  @Post()
  create(@Body() dto: CreateTaTaskDto) {
    return this.taTasks.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaTaskDto) {
    return this.taTasks.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.taTasks.remove(id);
  }
}
