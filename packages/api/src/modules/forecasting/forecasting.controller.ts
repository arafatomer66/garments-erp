import { Controller, Get } from '@nestjs/common';
import { ForecastingService } from './forecasting.service';

@Controller('forecasting')
export class ForecastingController {
  constructor(private readonly svc: ForecastingService) {}

  @Get('overview') overview() { return this.svc.getOverview(); }
  @Get('demand') demand() { return this.svc.getBuyerForecasts(); }
  @Get('capacity') capacity() { return this.svc.getCapacityUtilization(); }
  @Get('backlog') backlog() { return this.svc.getBacklog(); }
}
