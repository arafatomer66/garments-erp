import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TechPacksService } from './tech-packs.service';
import { CreateTechPackDto } from './dto/tech-pack.dto';

@ApiTags('merchandising')
@ApiBearerAuth()
@Controller('merchandising/tech-packs')
export class TechPacksController {
  constructor(private readonly techPacks: TechPacksService) {}

  @Get()
  list(@Query('styleId', ParseUUIDPipe) styleId: string) {
    return this.techPacks.listForStyle(styleId);
  }

  @Post()
  create(@Body() dto: CreateTechPackDto) {
    return this.techPacks.create(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.techPacks.remove(id);
  }
}
