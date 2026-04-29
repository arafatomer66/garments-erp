export interface DemandForecastPoint {
  monthLabel: string;
  totalQty: number;
  totalValueUsd: number;
  isForecast: boolean;
}

export interface BuyerDemandForecast {
  buyerCode: string;
  buyerName: string;
  history: DemandForecastPoint[];
  forecast: DemandForecastPoint[];
  trendSlope: number;
  monthlyAverage: number;
  nextMonthForecastQty: number;
}

export interface CapacityUtilizationRow {
  lineCode: string;
  lineName: string;
  capacityPcsPerHour: number;
  dailyCapacityPcs: number;
  monthlyCapacityPcs: number;
  bookedPcsNext30d: number;
  utilizationPercent: number;
  status: 'idle' | 'healthy' | 'overbooked';
}

export interface OrderBacklogRow {
  buyerCode: string;
  buyerName: string;
  poNumber: string;
  styleCode: string;
  styleName: string;
  orderQty: number;
  deliveryDate: string | null;
  daysToDelivery: number | null;
  riskLevel: 'on_track' | 'tight' | 'late';
}

export interface ForecastingOverview {
  buyerForecasts: BuyerDemandForecast[];
  capacity: CapacityUtilizationRow[];
  backlog: OrderBacklogRow[];
  totalMonthlyCapacityPcs: number;
  totalBookedNext30dPcs: number;
  overallUtilizationPercent: number;
}
