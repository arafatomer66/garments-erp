import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import {
  CreateComplianceStandardDto,
  UpdateComplianceStandardDto,
} from './dto/standard.dto';
import {
  CreateComplianceAuditDto,
  UpdateComplianceAuditDto,
} from './dto/audit.dto';
import {
  CreateComplianceDocumentDto,
  UpdateComplianceDocumentDto,
} from './dto/document.dto';
import {
  CreateComplianceFindingDto,
  UpdateComplianceFindingDto,
} from './dto/finding.dto';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly svc: ComplianceService) {}

  @Get('summary')
  summary() {
    return this.svc.getSummary();
  }

  // Standards
  @Get('standards') listStandards() { return this.svc.listStandards(); }
  @Post('standards') createStandard(@Body() dto: CreateComplianceStandardDto) { return this.svc.createStandard(dto); }
  @Get('standards/:id') findStandard(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findStandard(id); }
  @Patch('standards/:id') updateStandard(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateComplianceStandardDto) { return this.svc.updateStandard(id, dto); }
  @Delete('standards/:id') @HttpCode(HttpStatus.NO_CONTENT) removeStandard(@Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteStandard(id); }

  // Audits
  @Get('audits') listAudits() { return this.svc.listAudits(); }
  @Post('audits') createAudit(@Body() dto: CreateComplianceAuditDto) { return this.svc.createAudit(dto); }
  @Get('audits/:id') findAudit(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findAudit(id); }
  @Patch('audits/:id') updateAudit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateComplianceAuditDto) { return this.svc.updateAudit(id, dto); }
  @Delete('audits/:id') @HttpCode(HttpStatus.NO_CONTENT) removeAudit(@Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteAudit(id); }

  // Documents
  @Get('documents') listDocuments() { return this.svc.listDocuments(); }
  @Post('documents') createDocument(@Body() dto: CreateComplianceDocumentDto) { return this.svc.createDocument(dto); }
  @Get('documents/:id') findDocument(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findDocument(id); }
  @Patch('documents/:id') updateDocument(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateComplianceDocumentDto) { return this.svc.updateDocument(id, dto); }
  @Delete('documents/:id') @HttpCode(HttpStatus.NO_CONTENT) removeDocument(@Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteDocument(id); }

  // Findings (CAPA)
  @Get('findings') listFindings() { return this.svc.listFindings(); }
  @Post('findings') createFinding(@Body() dto: CreateComplianceFindingDto) { return this.svc.createFinding(dto); }
  @Get('findings/:id') findFinding(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findFinding(id); }
  @Patch('findings/:id') updateFinding(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateComplianceFindingDto) { return this.svc.updateFinding(id, dto); }
  @Delete('findings/:id') @HttpCode(HttpStatus.NO_CONTENT) removeFinding(@Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteFinding(id); }
}
