import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('overview') overview() { return this.svc.getOverview(); }
  @Get('pipeline') pipeline() { return this.svc.getPipeline(); }
  @Get('efficiency') efficiency() { return this.svc.getLineEfficiency(); }
  @Get('on-time') onTime() { return this.svc.getOnTimeShipment(); }
  @Get('buyer-profitability') buyerProfitability() { return this.svc.getBuyerProfitability(); }
  @Get('dhu-trend') dhuTrend() { return this.svc.getDhuTrend(); }
  @Get('wip') wip() { return this.svc.getWipByStage(); }
  @Get('top-styles') topStyles() { return this.svc.getTopStyles(); }
}
