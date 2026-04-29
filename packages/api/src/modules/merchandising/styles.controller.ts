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
import { StylesService } from './styles.service';
import { CreateStyleDto, UpdateStyleDto } from './dto/style.dto';

@ApiTags('merchandising')
@ApiBearerAuth()
@Controller('merchandising/styles')
export class StylesController {
  constructor(private readonly styles: StylesService) {}

  @Get()
  list(@Query('buyerId') buyerId?: string) {
    return this.styles.list(buyerId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.styles.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateStyleDto) {
    return this.styles.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStyleDto) {
    return this.styles.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.styles.remove(id);
  }
}
