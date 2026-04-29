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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShipmentService } from './shipment.service';
import { CreatePackingListDto, UpdatePackingListDto } from './dto/packing-list.dto';
import { CreateShipmentDto, UpdateShipmentDto } from './dto/shipment.dto';
import {
  CreateExportDocumentDto,
  UpdateExportDocumentDto,
} from './dto/export-document.dto';

@ApiTags('shipment')
@ApiBearerAuth()
@Controller('shipment')
export class ShipmentController {
  constructor(private readonly svc: ShipmentService) {}

  // Packing lists
  @Get('packing-lists')
  listPackingLists() {
    return this.svc.listPackingLists();
  }
  @Get('packing-lists/:id')
  getPackingList(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findPackingList(id);
  }
  @Post('packing-lists')
  createPackingList(@Body() dto: CreatePackingListDto) {
    return this.svc.createPackingList(dto);
  }
  @Patch('packing-lists/:id')
  updatePackingList(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePackingListDto) {
    return this.svc.updatePackingList(id, dto);
  }
  @Delete('packing-lists/:id')
  @HttpCode(204)
  async removePackingList(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removePackingList(id);
  }

  // Shipments
  @Get('shipments')
  listShipments() {
    return this.svc.listShipments();
  }
  @Post('shipments')
  createShipment(@Body() dto: CreateShipmentDto) {
    return this.svc.createShipment(dto);
  }
  @Patch('shipments/:id')
  updateShipment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateShipmentDto) {
    return this.svc.updateShipment(id, dto);
  }
  @Delete('shipments/:id')
  @HttpCode(204)
  async removeShipment(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeShipment(id);
  }

  // Export documents
  @Get('export-documents')
  listExportDocuments() {
    return this.svc.listExportDocuments();
  }
  @Post('export-documents')
  createExportDocument(@Body() dto: CreateExportDocumentDto) {
    return this.svc.createExportDocument(dto);
  }
  @Patch('export-documents/:id')
  updateExportDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExportDocumentDto,
  ) {
    return this.svc.updateExportDocument(id, dto);
  }
  @Delete('export-documents/:id')
  @HttpCode(204)
  async removeExportDocument(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeExportDocument(id);
  }
}
