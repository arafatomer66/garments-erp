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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { currentTenant } from '../../core/tenancy/tenant-context';
import { PrismaService } from '../../core/prisma/prisma.service';
import { IamService } from './iam.service';
import { UpdateTenantSettingsDto } from './dto/tenant-settings.dto';
import { CreateTenantUserDto, UpdateTenantUserDto } from './dto/tenant-user.dto';

@ApiTags('iam')
@ApiBearerAuth()
@Controller('iam')
export class IamController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly svc: IamService,
  ) {}

  @Get('me')
  async me() {
    const ctx = currentTenant();
    if (!ctx) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: ctx.userId },
      include: {
        memberships: {
          where: { tenantId: ctx.tenantId },
          include: { tenant: true },
        },
      },
    });
    return user;
  }

  @Get('tenant') getTenant() { return this.svc.getTenant(); }
  @Patch('tenant') updateTenant(@Body() dto: UpdateTenantSettingsDto) { return this.svc.updateTenant(dto); }

  @Get('roles') listRoles() { return this.svc.listRoles(); }

  @Get('users') listUsers() { return this.svc.listUsers(); }
  @Post('users') createUser(@Body() dto: CreateTenantUserDto) { return this.svc.createUser(dto); }
  @Patch('users/:id') updateUser(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantUserDto) { return this.svc.updateUser(id, dto); }
  @Delete('users/:id') @HttpCode(HttpStatus.NO_CONTENT) removeUser(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removeUser(id); }
}
