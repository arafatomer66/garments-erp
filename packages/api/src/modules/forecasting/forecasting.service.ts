import { Injectable } from '@nestjs/common';
import type {
  BuyerDemandForecast,
  CapacityUtilizationRow,
  DemandForecastPoint,
  ForecastingOverview,
  OrderBacklogRow,
} from '@org/shared-types';
import { TenantRepository } from '../../core/database/tenant-repository';
import { camelize } from '../masters/sql.util';

interface BuyerHistoryRow {
  buyer_code: string;
  buyer_name: string;
  month_label: string;
  total_qty: number;
  total_value_usd: number;
}

@Injectable()
export class ForecastingService extends TenantRepository {
  async getBuyerForecasts(): Promise<BuyerDemandForecast[]> {
    const rows = await this.query<BuyerHistoryRow>(
      `SELECT b.code AS buyer_code,
              b.name AS buyer_name,
              TO_CHAR(date_trunc('month', bo.order_date), 'YYYY-MM') AS month_label,
              SUM(ol.quantity)::float AS total_qty,
              SUM(ol.quantity * ol.unit_price)::float AS total_value_usd
         FROM buyer_orders bo
         JOIN order_lines ol ON ol.order_id = bo.id
         JOIN buyers b ON b.id = bo.buyer_id
        WHERE bo.status NOT IN ('cancelled')
          AND bo.order_date >= (CURRENT_DATE - INTERVAL '12 months')
        GROUP BY b.code, b.name, date_trunc('month', bo.order_date)
        ORDER BY b.code, date_trunc('month', bo.order_date)`,
    );

    const byBuyer = new Map<string, { name: string; history: DemandForecastPoint[] }>();
    for (const r of rows) {
      const cur = byBuyer.get(r.buyer_code) ?? { name: r.buyer_name, history: [] };
      cur.history.push({
        monthLabel: r.month_label,
        totalQty: Number(r.total_qty),
        totalValueUsd: Number(r.total_value_usd),
        isForecast: false,
      });
      byBuyer.set(r.buyer_code, cur);
    }

    const result: BuyerDemandForecast[] = [];
    for (const [code, { name, history }] of byBuyer.entries()) {
      const { slope, intercept } = this.linearRegression(history.map((h) => h.totalQty));
      const avg = history.reduce((s, h) => s + h.totalQty, 0) / Math.max(1, history.length);
      const forecast: DemandForecastPoint[] = [];
      const last = history[history.length - 1]?.monthLabel ?? this.currentMonthLabel();
      for (let i = 1; i <= 3; i++) {
        const projectedQty = Math.max(0, slope * (history.length + i - 1) + intercept);
        forecast.push({
          monthLabel: this.addMonths(last, i),
          totalQty: Math.round(projectedQty),
          totalValueUsd: 0,
          isForecast: true,
        });
      }
      result.push({
        buyerCode: code,
        buyerName: name,
        history,
        forecast,
        trendSlope: Math.round(slope * 100) / 100,
        monthlyAverage: Math.round(avg),
        nextMonthForecastQty: forecast[0]?.totalQty ?? 0,
      });
    }
    result.sort((a, b) => b.nextMonthForecastQty - a.nextMonthForecastQty);
    return result;
  }

  async getCapacityUtilization(): Promise<CapacityUtilizationRow[]> {
    const rows = await this.query<Record<string, unknown>>(
      `WITH booked AS (
         SELECT la.line_id,
                SUM(ol.quantity)::float AS qty
           FROM line_assignments la
           JOIN buyer_orders bo ON bo.id = la.buyer_order_id
           JOIN order_lines ol ON ol.order_id = bo.id AND ol.style_id = la.style_id
          WHERE la.status IN ('active', 'paused')
            AND bo.delivery_date IS NOT NULL
            AND bo.delivery_date >= CURRENT_DATE
            AND bo.delivery_date <= CURRENT_DATE + INTERVAL '30 days'
            AND bo.status NOT IN ('cancelled', 'closed')
          GROUP BY la.line_id
       )
       SELECT sl.code AS line_code,
              sl.name AS line_name,
              sl.capacity_pcs_per_hour::float AS capacity_pcs_per_hour,
              (sl.capacity_pcs_per_hour * 10)::float AS daily_capacity_pcs,
              (sl.capacity_pcs_per_hour * 10 * 26)::float AS monthly_capacity_pcs,
              COALESCE(bk.qty, 0)::float AS booked_pcs_next30d,
              CASE WHEN sl.capacity_pcs_per_hour > 0
                   THEN ROUND((COALESCE(bk.qty, 0) / NULLIF(sl.capacity_pcs_per_hour * 10 * 26, 0) * 100)::numeric, 2)::float
                   ELSE 0 END AS utilization_percent
         FROM sewing_lines sl
         LEFT JOIN booked bk ON bk.line_id = sl.id
        WHERE sl.is_active = TRUE
        ORDER BY sl.code`,
    );
    return rows.map((r) => {
      const camelRow = camelize(r) as unknown as Omit<CapacityUtilizationRow, 'status'>;
      const util = camelRow.utilizationPercent;
      const status: CapacityUtilizationRow['status'] =
        util >= 100 ? 'overbooked' : util >= 30 ? 'healthy' : 'idle';
      return { ...camelRow, status };
    });
  }

  async getBacklog(): Promise<OrderBacklogRow[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT b.code AS buyer_code,
              b.name AS buyer_name,
              bo.po_number,
              s.code AS style_code,
              s.name AS style_name,
              SUM(ol.quantity)::float AS order_qty,
              bo.delivery_date,
              CASE WHEN bo.delivery_date IS NOT NULL
                   THEN (bo.delivery_date - CURRENT_DATE)
                   ELSE NULL END AS days_to_delivery
         FROM buyer_orders bo
         JOIN buyers b ON b.id = bo.buyer_id
         JOIN order_lines ol ON ol.order_id = bo.id
         JOIN styles s ON s.id = ol.style_id
        WHERE bo.status IN ('confirmed', 'in_production')
        GROUP BY b.code, b.name, bo.po_number, s.code, s.name, bo.delivery_date
        ORDER BY bo.delivery_date NULLS LAST
        LIMIT 30`,
    );
    return rows.map((r) => {
      const camelRow = camelize(r) as unknown as Omit<OrderBacklogRow, 'riskLevel'>;
      const days = camelRow.daysToDelivery;
      const riskLevel: OrderBacklogRow['riskLevel'] =
        days === null ? 'tight' : days < 0 ? 'late' : days <= 14 ? 'tight' : 'on_track';
      return {
        ...camelRow,
        deliveryDate: camelRow.deliveryDate ? String(camelRow.deliveryDate) : null,
        riskLevel,
      };
    });
  }

  async getOverview(): Promise<ForecastingOverview> {
    const [buyerForecasts, capacity, backlog] = await Promise.all([
      this.getBuyerForecasts(),
      this.getCapacityUtilization(),
      this.getBacklog(),
    ]);
    const totalMonthlyCapacityPcs = capacity.reduce((s, c) => s + c.monthlyCapacityPcs, 0);
    const totalBookedNext30dPcs = capacity.reduce((s, c) => s + c.bookedPcsNext30d, 0);
    const overallUtilizationPercent =
      totalMonthlyCapacityPcs > 0
        ? Math.round((totalBookedNext30dPcs / totalMonthlyCapacityPcs) * 1000) / 10
        : 0;
    return {
      buyerForecasts,
      capacity,
      backlog,
      totalMonthlyCapacityPcs,
      totalBookedNext30dPcs,
      overallUtilizationPercent,
    };
  }

  private linearRegression(values: number[]): { slope: number; intercept: number } {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((s, v) => s + v, 0);
    const sumXY = values.reduce((s, v, i) => s + i * v, 0);
    const sumX2 = values.reduce((s, _v, i) => s + i * i, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: sumY / n };
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  }

  private currentMonthLabel(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private addMonths(label: string, offset: number): string {
    const [y, m] = label.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + offset, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}
