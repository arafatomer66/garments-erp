import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BuyersService } from './buyers.service';
import { CreateBuyerDto, UpdateBuyerDto } from './dto/buyer.dto';

@ApiTags('masters')
@ApiBearerAuth()
@Controller('masters/buyers')
export class BuyersController {
  constructor(private readonly buyers: BuyersService) {}

  @Get()
  list() {
    return this.buyers.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.buyers.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBuyerDto) {
    return this.buyers.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBuyerDto) {
    return this.buyers.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.buyers.remove(id);
  }
}
