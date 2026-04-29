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
import { ProcurementService } from './procurement.service';
import {
  CreatePurchaseRequisitionDto,
  UpdatePurchaseRequisitionDto,
} from './dto/purchase-requisition.dto';
import {
  ConvertPrToPoDto,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto/purchase-order.dto';
import { CreateGrnDto, UpdateGrnDto } from './dto/grn.dto';
import { CreateLetterOfCreditDto, UpdateLetterOfCreditDto } from './dto/lc.dto';

@ApiTags('procurement')
@ApiBearerAuth()
@Controller('procurement')
export class ProcurementController {
  constructor(private readonly svc: ProcurementService) {}

  // PR
  @Get('prs')
  listPrs() {
    return this.svc.listPrs();
  }
  @Get('prs/:id')
  findPr(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findPr(id);
  }
  @Post('prs')
  createPr(@Body() dto: CreatePurchaseRequisitionDto) {
    return this.svc.createPr(dto);
  }
  @Patch('prs/:id')
  updatePr(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePurchaseRequisitionDto) {
    return this.svc.updatePr(id, dto);
  }
  @Delete('prs/:id')
  @HttpCode(204)
  async removePr(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removePr(id);
  }

  // PO
  @Get('pos')
  listPos() {
    return this.svc.listPos();
  }
  @Get('pos/:id')
  findPo(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findPo(id);
  }
  @Post('pos')
  createPo(@Body() dto: CreatePurchaseOrderDto) {
    return this.svc.createPo(dto);
  }
  @Patch('pos/:id')
  updatePo(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.svc.updatePo(id, dto);
  }
  @Delete('pos/:id')
  @HttpCode(204)
  async removePo(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removePo(id);
  }
  @Post('pos/convert')
  convertPrToPo(@Body() dto: ConvertPrToPoDto) {
    return this.svc.convertPrToPo(dto);
  }

  // GRN
  @Get('grns')
  listGrns() {
    return this.svc.listGrns();
  }
  @Get('grns/:id')
  findGrn(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findGrn(id);
  }
  @Post('grns')
  createGrn(@Body() dto: CreateGrnDto) {
    return this.svc.createGrn(dto);
  }
  @Patch('grns/:id')
  updateGrn(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGrnDto) {
    return this.svc.updateGrn(id, dto);
  }
  @Delete('grns/:id')
  @HttpCode(204)
  async removeGrn(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeGrn(id);
  }

  // LC
  @Get('lcs')
  listLcs() {
    return this.svc.listLcs();
  }
  @Get('lcs/:id')
  findLc(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findLc(id);
  }
  @Post('lcs')
  createLc(@Body() dto: CreateLetterOfCreditDto) {
    return this.svc.createLc(dto);
  }
  @Patch('lcs/:id')
  updateLc(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLetterOfCreditDto) {
    return this.svc.updateLc(id, dto);
  }
  @Delete('lcs/:id')
  @HttpCode(204)
  async removeLc(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.removeLc(id);
  }
}
