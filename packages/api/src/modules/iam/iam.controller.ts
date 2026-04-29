import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { currentTenant } from '../../core/tenancy/tenant-context';
import { PrismaService } from '../../core/prisma/prisma.service';

@ApiTags('iam')
@ApiBearerAuth()
@Controller('iam')
export class IamController {
  constructor(private readonly prisma: PrismaService) {}

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
}
