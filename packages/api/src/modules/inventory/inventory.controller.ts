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
import { InventoryService } from './inventory.service';
import {
  CreateBinLocationDto,
  CreateWarehouseDto,
  UpdateBinLocationDto,
  UpdateWarehouseDto,
} from './dto/warehouse.dto';
import {
  CreateFabricInspectionDto,
  UpdateFabricInspectionDto,
} from './dto/fabric-inspection.dto';
import {
  CreateStockLotDto,
  CreateStockMovementDto,
  IssueFifoDto,
  UpdateStockLotDto,
} from './dto/stock.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  // Warehouses
  @Get('warehouses')
  listWarehouses() {
    return this.svc.listWarehouses();
  }
  @Get('warehouses/:id')
  findWarehouse(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findWarehouse(id);
  }
  @Post('warehouses')
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.svc.createWarehouse(dto);
  }
  @Patch('warehouses/:id')
  updateWarehouse(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseDto) {
    return this.svc.updateWarehouse(id, dto);
  }
  @Delete('warehouses/:id')
  @HttpCode(204)
  async removeWarehouse(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeWarehouse(id);
  }

  // Bins
  @Get('bins')
  listBins(@Query('warehouseId') warehouseId?: string) {
    return this.svc.listBins(warehouseId);
  }
  @Get('bins/:id')
  findBin(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findBin(id);
  }
  @Post('bins')
  createBin(@Body() dto: CreateBinLocationDto) {
    return this.svc.createBin(dto);
  }
  @Patch('bins/:id')
  updateBin(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBinLocationDto) {
    return this.svc.updateBin(id, dto);
  }
  @Delete('bins/:id')
  @HttpCode(204)
  async removeBin(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeBin(id);
  }

  // Fabric inspections
  @Get('inspections')
  listInspections() {
    return this.svc.listInspections();
  }
  @Get('inspections/:id')
  findInspection(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findInspection(id);
  }
  @Post('inspections')
  createInspection(@Body() dto: CreateFabricInspectionDto) {
    return this.svc.createInspection(dto);
  }
  @Patch('inspections/:id')
  updateInspection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFabricInspectionDto,
  ) {
    return this.svc.updateInspection(id, dto);
  }
  @Delete('inspections/:id')
  @HttpCode(204)
  async removeInspection(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeInspection(id);
  }

  // Stock lots
  @Get('lots')
  listLots() {
    return this.svc.listLots();
  }
  @Get('lots/:id')
  findLot(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findLot(id);
  }
  @Post('lots')
  createLot(@Body() dto: CreateStockLotDto) {
    return this.svc.createLot(dto);
  }
  @Patch('lots/:id')
  updateLot(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStockLotDto) {
    return this.svc.updateLot(id, dto);
  }
  @Delete('lots/:id')
  @HttpCode(204)
  async removeLot(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeLot(id);
  }

  // Stock movements
  @Get('movements')
  listMovements(@Query('lotId') lotId?: string) {
    return this.svc.listMovements(lotId);
  }
  @Post('movements')
  createMovement(@Body() dto: CreateStockMovementDto) {
    return this.svc.createMovement(dto);
  }
  @Post('movements/issue-fifo')
  issueFifo(@Body() dto: IssueFifoDto) {
    return this.svc.issueFifo(dto);
  }
}
