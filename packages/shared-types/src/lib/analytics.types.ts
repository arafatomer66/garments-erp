export interface OrderPipelineStat {
  status: string;
  count: number;
  totalValueUsd: number;
  totalQty: number;
}

export interface LineEfficiencyPoint {
  logDate: string;
  lineCode: string;
  lineName: string;
  targetPcs: number;
  producedPcs: number;
  efficiencyPercent: number;
}

export interface OnTimeShipmentStat {
  totalShipped: number;
  onTime: number;
  late: number;
  onTimePercent: number;
  averageDelayDays: number;
}

export interface BuyerProfitabilityRow {
  buyerCode: string;
  buyerName: string;
  totalOrders: number;
  totalQty: number;
  totalRevenueUsd: number;
  totalCostUsd: number;
  marginUsd: number;
  marginPercent: number;
}

export interface DhuTrendPoint {
  logDate: string;
  inspected: number;
  defects: number;
  dhu: number;
}

export interface WipValueByStage {
  stage: string;
  qty: number;
  estimatedValueUsd: number;
}

export interface TopStyleRow {
  styleCode: string;
  styleName: string;
  totalQty: number;
  totalValueUsd: number;
  buyerName?: string | null;
}

export interface AnalyticsOverview {
  pipeline: OrderPipelineStat[];
  efficiency: LineEfficiencyPoint[];
  onTimeShipment: OnTimeShipmentStat;
  buyerProfitability: BuyerProfitabilityRow[];
  dhuTrend: DhuTrendPoint[];
  wipByStage: WipValueByStage[];
  topStyles: TopStyleRow[];
}
