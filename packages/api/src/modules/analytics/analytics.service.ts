import { Injectable } from '@nestjs/common';
import type {
  AnalyticsOverview,
  BuyerProfitabilityRow,
  DhuTrendPoint,
  LineEfficiencyPoint,
  OnTimeShipmentStat,
  OrderPipelineStat,
  TopStyleRow,
  WipValueByStage,
} from '@org/shared-types';
import { TenantRepository } from '../../core/database/tenant-repository';
import { camelize } from '../masters/sql.util';

@Injectable()
export class AnalyticsService extends TenantRepository {
  async getPipeline(): Promise<OrderPipelineStat[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT bo.status,
              COUNT(*)::int AS count,
              COALESCE(SUM(ol.quantity * ol.unit_price), 0)::float AS total_value_usd,
              COALESCE(SUM(ol.quantity), 0)::float AS total_qty
         FROM buyer_orders bo
         LEFT JOIN order_lines ol ON ol.order_id = bo.id
        GROUP BY bo.status
        ORDER BY
          CASE bo.status
            WHEN 'draft' THEN 0
            WHEN 'confirmed' THEN 1
            WHEN 'in_production' THEN 2
            WHEN 'shipped' THEN 3
            WHEN 'closed' THEN 4
            WHEN 'cancelled' THEN 5
          END`,
    );
    return rows.map((r) => camelize(r) as unknown as OrderPipelineStat);
  }

  async getLineEfficiency(): Promise<LineEfficiencyPoint[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT h.log_date,
              sl.code AS line_code,
              sl.name AS line_name,
              SUM(h.target_pcs)::float AS target_pcs,
              SUM(h.produced_pcs)::float AS produced_pcs,
              CASE WHEN SUM(h.target_pcs) > 0
                   THEN ROUND((SUM(h.produced_pcs) / SUM(h.target_pcs) * 100)::numeric, 2)::float
                   ELSE 0 END AS efficiency_percent
         FROM hourly_production_logs h
         JOIN sewing_lines sl ON sl.id = h.line_id
        WHERE h.log_date >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY h.log_date, sl.code, sl.name
        ORDER BY h.log_date, sl.code`,
    );
    return rows.map((r) => camelize(r) as unknown as LineEfficiencyPoint);
  }

  async getOnTimeShipment(): Promise<OnTimeShipmentStat> {
    const [row] = await this.query<Record<string, unknown>>(
      `SELECT
         COUNT(*)::int AS total_shipped,
         COUNT(*) FILTER (
           WHERE bo.delivery_date IS NOT NULL
             AND s.actual_ship_date IS NOT NULL
             AND s.actual_ship_date <= bo.delivery_date
         )::int AS on_time,
         COUNT(*) FILTER (
           WHERE bo.delivery_date IS NOT NULL
             AND s.actual_ship_date IS NOT NULL
             AND s.actual_ship_date > bo.delivery_date
         )::int AS late,
         COALESCE(AVG(
           CASE WHEN s.actual_ship_date IS NOT NULL AND bo.delivery_date IS NOT NULL
                THEN GREATEST(0, (s.actual_ship_date - bo.delivery_date))
                ELSE NULL END
         ), 0)::float AS average_delay_days
       FROM shipments s
       LEFT JOIN buyer_orders bo ON bo.id = s.buyer_order_id
       WHERE s.status IN ('in_transit', 'delivered')
         AND s.actual_ship_date IS NOT NULL`,
    );
    const total = Number(row?.['total_shipped'] ?? 0);
    const onTime = Number(row?.['on_time'] ?? 0);
    return {
      totalShipped: total,
      onTime,
      late: Number(row?.['late'] ?? 0),
      onTimePercent: total > 0 ? Math.round((onTime / total) * 1000) / 10 : 0,
      averageDelayDays: Number(row?.['average_delay_days'] ?? 0),
    };
  }

  async getBuyerProfitability(): Promise<BuyerProfitabilityRow[]> {
    const rows = await this.query<Record<string, unknown>>(
      `WITH order_revenue AS (
         SELECT bo.buyer_id,
                COUNT(DISTINCT bo.id) AS total_orders,
                SUM(ol.quantity)               AS total_qty,
                SUM(ol.quantity * ol.unit_price) AS total_revenue
           FROM buyer_orders bo
           JOIN order_lines ol ON ol.order_id = bo.id
          WHERE bo.status NOT IN ('cancelled')
          GROUP BY bo.buyer_id
       ),
       order_cost AS (
         SELECT s.buyer_id,
                SUM((cs.cm_cost + cs.overhead_cost + cs.commercial_cost) * ol.quantity) AS total_cost
           FROM costing_sheets cs
           JOIN styles s ON s.id = cs.style_id
           JOIN order_lines ol ON ol.style_id = s.id
           JOIN buyer_orders bo ON bo.id = ol.order_id AND bo.status NOT IN ('cancelled')
          GROUP BY s.buyer_id
       )
       SELECT b.code AS buyer_code,
              b.name AS buyer_name,
              COALESCE(orev.total_orders, 0)::int AS total_orders,
              COALESCE(orev.total_qty, 0)::float AS total_qty,
              COALESCE(orev.total_revenue, 0)::float AS total_revenue_usd,
              COALESCE(ocost.total_cost, 0)::float AS total_cost_usd,
              (COALESCE(orev.total_revenue, 0) - COALESCE(ocost.total_cost, 0))::float AS margin_usd,
              CASE WHEN COALESCE(orev.total_revenue, 0) > 0
                   THEN ROUND(((COALESCE(orev.total_revenue, 0) - COALESCE(ocost.total_cost, 0)) / orev.total_revenue * 100)::numeric, 2)::float
                   ELSE 0 END AS margin_percent
         FROM buyers b
         LEFT JOIN order_revenue orev ON orev.buyer_id = b.id
         LEFT JOIN order_cost ocost ON ocost.buyer_id = b.id
        WHERE COALESCE(orev.total_orders, 0) > 0
        ORDER BY total_revenue_usd DESC
        LIMIT 20`,
    );
    return rows.map((r) => camelize(r) as unknown as BuyerProfitabilityRow);
  }

  async getDhuTrend(): Promise<DhuTrendPoint[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT log_date,
              SUM(inspected_quantity)::float AS inspected,
              SUM(defect_quantity)::float AS defects,
              CASE WHEN SUM(inspected_quantity) > 0
                   THEN ROUND((SUM(defect_quantity)::numeric / SUM(inspected_quantity) * 100)::numeric, 2)::float
                   ELSE 0 END AS dhu
         FROM end_line_qc_records
        WHERE log_date >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY log_date
        ORDER BY log_date`,
    );
    return rows.map((r) => camelize(r) as unknown as DhuTrendPoint);
  }

  async getWipByStage(): Promise<WipValueByStage[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT 'cut'::text AS stage,
              COALESCE(SUM(cpi.target_quantity), 0)::float AS qty,
              COALESCE(SUM(cpi.target_quantity * (cs.cm_cost + cs.overhead_cost + cs.commercial_cost)), 0)::float AS estimated_value_usd
         FROM cutting_plan_items cpi
         JOIN cutting_plans cp ON cp.id = cpi.plan_id
         LEFT JOIN costing_sheets cs ON cs.style_id = cp.style_id
        WHERE cp.status IN ('planned', 'in_progress')
       UNION ALL
       SELECT 'sewing'::text AS stage,
              COALESCE(SUM(h.produced_pcs), 0)::float AS qty,
              0::float AS estimated_value_usd
         FROM hourly_production_logs h
        WHERE h.log_date >= CURRENT_DATE - INTERVAL '7 days'
       UNION ALL
       SELECT 'finishing'::text AS stage,
              COALESCE(SUM(elqc.inspected_quantity - elqc.reject_quantity), 0)::float AS qty,
              0::float AS estimated_value_usd
         FROM end_line_qc_records elqc
        WHERE elqc.log_date >= CURRENT_DATE - INTERVAL '7 days'
       UNION ALL
       SELECT 'packed'::text AS stage,
              COALESCE(SUM(plc.quantity), 0)::float AS qty,
              0::float AS estimated_value_usd
         FROM packing_list_cartons plc
         JOIN packing_lists pl ON pl.id = plc.packing_list_id
        WHERE pl.status IN ('finalized', 'shipped')`,
    );
    return rows.map((r) => camelize(r) as unknown as WipValueByStage);
  }

  async getTopStyles(): Promise<TopStyleRow[]> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT s.code AS style_code,
              s.name AS style_name,
              b.name AS buyer_name,
              SUM(ol.quantity)::float AS total_qty,
              SUM(ol.quantity * ol.unit_price)::float AS total_value_usd
         FROM order_lines ol
         JOIN styles s ON s.id = ol.style_id
         JOIN buyer_orders bo ON bo.id = ol.order_id
         JOIN buyers b ON b.id = bo.buyer_id
        WHERE bo.status NOT IN ('cancelled')
        GROUP BY s.code, s.name, b.name
        ORDER BY total_value_usd DESC
        LIMIT 10`,
    );
    return rows.map((r) => camelize(r) as unknown as TopStyleRow);
  }

  async getOverview(): Promise<AnalyticsOverview> {
    const [pipeline, efficiency, onTimeShipment, buyerProfitability, dhuTrend, wipByStage, topStyles] =
      await Promise.all([
        this.getPipeline(),
        this.getLineEfficiency(),
        this.getOnTimeShipment(),
        this.getBuyerProfitability(),
        this.getDhuTrend(),
        this.getWipByStage(),
        this.getTopStyles(),
      ]);
    return { pipeline, efficiency, onTimeShipment, buyerProfitability, dhuTrend, wipByStage, topStyles };
  }
}
