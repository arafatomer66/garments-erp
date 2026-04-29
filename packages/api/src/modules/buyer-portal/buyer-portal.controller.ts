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
import { BuyerPortalService } from './buyer-portal.service';
import {
  CreateBuyerPortalUserDto,
  UpdateBuyerPortalUserDto,
} from './dto/portal-user.dto';

@Controller('buyer-portal')
export class BuyerPortalController {
  constructor(private readonly svc: BuyerPortalService) {}

  @Get('summary') summary() { return this.svc.getSummary(); }

  @Get('users') listUsers() { return this.svc.listUsers(); }
  @Post('users') createUser(@Body() dto: CreateBuyerPortalUserDto) { return this.svc.createUser(dto); }
  @Get('users/:id') findUser(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findUser(id); }
  @Patch('users/:id') updateUser(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBuyerPortalUserDto) { return this.svc.updateUser(id, dto); }
  @Delete('users/:id') @HttpCode(HttpStatus.NO_CONTENT) removeUser(@Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteUser(id); }

  @Post('users/:id/resend-invite') resendInvite(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.resendInvite(id);
  }
}
