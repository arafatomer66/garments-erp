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
import { BomService } from './bom.service';
import { CreateBomLineDto, UpdateBomLineDto } from './dto/bom-line.dto';
import { UpsertCostingSheetDto } from './dto/costing.dto';

@ApiTags('bom')
@ApiBearerAuth()
@Controller('bom')
export class BomController {
  constructor(private readonly bom: BomService) {}

  @Get('lines')
  list(@Query('styleId', ParseUUIDPipe) styleId: string) {
    return this.bom.listForStyle(styleId);
  }

  @Post('lines')
  createLine(@Body() dto: CreateBomLineDto) {
    return this.bom.createLine(dto);
  }

  @Patch('lines/:id')
  updateLine(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBomLineDto) {
    return this.bom.updateLine(id, dto);
  }

  @Delete('lines/:id')
  @HttpCode(204)
  async removeLine(@Param('id', ParseUUIDPipe) id: string) {
    await this.bom.removeLine(id);
  }

  @Get('costing/:styleId')
  getCosting(@Param('styleId', ParseUUIDPipe) styleId: string) {
    return this.bom.getCosting(styleId);
  }

  @Post('costing')
  upsertCosting(@Body() dto: UpsertCostingSheetDto) {
    return this.bom.upsertCosting(dto);
  }
}
