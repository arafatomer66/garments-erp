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
import { ProductionService } from './production.service';
import {
  CreateCuttingPlanDto,
  UpdateCuttingPlanDto,
} from './dto/cutting-plan.dto';
import {
  CreateLineAssignmentDto,
  CreateSewingLineDto,
  UpdateLineAssignmentDto,
  UpdateSewingLineDto,
} from './dto/sewing-line.dto';
import { CreateBundleDto, ScanBundleDto, UpdateBundleDto } from './dto/bundle.dto';
import { UpsertHourlyLogDto } from './dto/hourly-log.dto';

@ApiTags('production')
@ApiBearerAuth()
@Controller('production')
export class ProductionController {
  constructor(private readonly svc: ProductionService) {}

  // Cutting plans
  @Get('plans')
  listPlans() {
    return this.svc.listPlans();
  }
  @Get('plans/:id')
  findPlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findPlan(id);
  }
  @Post('plans')
  createPlan(@Body() dto: CreateCuttingPlanDto) {
    return this.svc.createPlan(dto);
  }
  @Patch('plans/:id')
  updatePlan(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCuttingPlanDto) {
    return this.svc.updatePlan(id, dto);
  }
  @Delete('plans/:id')
  @HttpCode(204)
  async removePlan(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removePlan(id);
  }

  // Sewing lines
  @Get('lines')
  listLines() {
    return this.svc.listLines();
  }
  @Post('lines')
  createLine(@Body() dto: CreateSewingLineDto) {
    return this.svc.createLine(dto);
  }
  @Patch('lines/:id')
  updateLine(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSewingLineDto) {
    return this.svc.updateLine(id, dto);
  }
  @Delete('lines/:id')
  @HttpCode(204)
  async removeLine(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeLine(id);
  }

  // Line assignments
  @Get('assignments')
  listAssignments() {
    return this.svc.listAssignments();
  }
  @Post('assignments')
  createAssignment(@Body() dto: CreateLineAssignmentDto) {
    return this.svc.createAssignment(dto);
  }
  @Patch('assignments/:id')
  updateAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLineAssignmentDto,
  ) {
    return this.svc.updateAssignment(id, dto);
  }
  @Delete('assignments/:id')
  @HttpCode(204)
  async removeAssignment(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeAssignment(id);
  }

  // Bundles
  @Get('bundles')
  listBundles(@Query('planId') planId?: string) {
    return this.svc.listBundles(planId);
  }
  @Post('bundles')
  createBundle(@Body() dto: CreateBundleDto) {
    return this.svc.createBundle(dto);
  }
  @Patch('bundles/:id')
  updateBundle(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBundleDto) {
    return this.svc.updateBundle(id, dto);
  }
  @Delete('bundles/:id')
  @HttpCode(204)
  async removeBundle(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeBundle(id);
  }
  @Post('bundles/scan')
  scanBundle(@Body() dto: ScanBundleDto) {
    return this.svc.scanBundle(dto);
  }

  // Hourly logs + live board
  @Get('hourly-board')
  hourlyBoard(@Query('date') date?: string) {
    return this.svc.hourlyBoard(date);
  }
  @Get('hourly-logs')
  listLogs(@Query('lineId', ParseUUIDPipe) lineId: string, @Query('date') date?: string) {
    return this.svc.listLogs(lineId, date);
  }
  @Post('hourly-logs')
  upsertLog(@Body() dto: UpsertHourlyLogDto) {
    return this.svc.upsertHourlyLog(dto);
  }
}
