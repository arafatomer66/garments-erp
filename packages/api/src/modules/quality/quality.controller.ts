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
import { QualityService } from './quality.service';
import { CreateDefectCodeDto, UpdateDefectCodeDto } from './dto/defect-code.dto';
import { CreateInlineQcRecordDto, UpdateInlineQcRecordDto } from './dto/inline-qc.dto';
import {
  CreateEndLineQcRecordDto,
  UpdateEndLineQcRecordDto,
} from './dto/end-line-qc.dto';
import { CreateAqlInspectionDto, UpdateAqlInspectionDto } from './dto/aql.dto';

@ApiTags('quality')
@ApiBearerAuth()
@Controller('quality')
export class QualityController {
  constructor(private readonly svc: QualityService) {}

  // Defect codes
  @Get('defect-codes')
  listDefectCodes() {
    return this.svc.listDefectCodes();
  }
  @Post('defect-codes')
  createDefectCode(@Body() dto: CreateDefectCodeDto) {
    return this.svc.createDefectCode(dto);
  }
  @Patch('defect-codes/:id')
  updateDefectCode(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDefectCodeDto) {
    return this.svc.updateDefectCode(id, dto);
  }
  @Delete('defect-codes/:id')
  @HttpCode(204)
  async removeDefectCode(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeDefectCode(id);
  }

  // Inline QC
  @Get('inline-qc')
  listInlineQc(@Query('lineId') lineId?: string, @Query('date') date?: string) {
    return this.svc.listInlineQc(lineId, date);
  }
  @Post('inline-qc')
  createInlineQc(@Body() dto: CreateInlineQcRecordDto) {
    return this.svc.createInlineQc(dto);
  }
  @Patch('inline-qc/:id')
  updateInlineQc(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInlineQcRecordDto) {
    return this.svc.updateInlineQc(id, dto);
  }
  @Delete('inline-qc/:id')
  @HttpCode(204)
  async removeInlineQc(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeInlineQc(id);
  }

  // End-line QC
  @Get('end-line-qc')
  listEndLineQc(@Query('lineId') lineId?: string, @Query('date') date?: string) {
    return this.svc.listEndLineQc(lineId, date);
  }
  @Post('end-line-qc')
  createEndLineQc(@Body() dto: CreateEndLineQcRecordDto) {
    return this.svc.createEndLineQc(dto);
  }
  @Patch('end-line-qc/:id')
  updateEndLineQc(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEndLineQcRecordDto) {
    return this.svc.updateEndLineQc(id, dto);
  }
  @Delete('end-line-qc/:id')
  @HttpCode(204)
  async removeEndLineQc(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeEndLineQc(id);
  }

  // AQL
  @Get('aql')
  listAqlInspections() {
    return this.svc.listAqlInspections();
  }
  @Get('aql/quote')
  quoteAql(@Query('lotSize') lotSize: string, @Query('aqlLevel') aqlLevel?: string) {
    return this.svc.quoteAqlPlan(Number(lotSize), aqlLevel ? Number(aqlLevel) : undefined);
  }
  @Post('aql')
  createAql(@Body() dto: CreateAqlInspectionDto) {
    return this.svc.createAqlInspection(dto);
  }
  @Patch('aql/:id')
  updateAql(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAqlInspectionDto) {
    return this.svc.updateAqlInspection(id, dto);
  }
  @Delete('aql/:id')
  @HttpCode(204)
  async removeAql(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeAqlInspection(id);
  }

  // DHU Dashboard
  @Get('dhu-board')
  dhuBoard(@Query('date') date?: string) {
    return this.svc.dhuBoard(date);
  }
}
