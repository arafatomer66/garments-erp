import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as bcrypt from 'bcrypt';
import { splitSqlStatements } from '../src/core/database/sql-statements';

const SCHEMA_NAME_PATTERN = /^tenant_[a-z0-9_]+$/;
const TENANT_SLUG = 'demo';
const TENANT_NAME = 'Demo Garments Ltd.';
const OWNER_EMAIL = 'owner@demo.local';
const OWNER_PASSWORD = 'demo-owner-pw1';
const OWNER_NAME = 'Demo Owner';

const prisma = new PrismaClient();

async function applyTenantDdl(schemaName: string): Promise<void> {
  if (!SCHEMA_NAME_PATTERN.test(schemaName)) throw new Error(`Invalid schema: ${schemaName}`);
  const ddlPath = join(process.cwd(), 'packages/api/prisma/tenant-schema.sql');
  const sql = readFileSync(ddlPath, 'utf8').replaceAll('{{SCHEMA}}', schemaName);
  for (const stmt of splitSqlStatements(sql)) {
    await prisma.$executeRawUnsafe(stmt);
  }
}

async function seedTenantData(schemaName: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schemaName}", public`);

    await tx.$executeRawUnsafe(`
      INSERT INTO buyers (code, name, country, contact_person, email, payment_terms)
      VALUES
        ('BUY-001', 'H&M', 'SE', 'Anders Lindqvist', 'po@hm.example', 'Net 60'),
        ('BUY-002', 'Walmart', 'US', 'Janet Reeves', 'po@walmart.example', 'Net 75'),
        ('BUY-003', 'Zara (Inditex)', 'ES', 'Carlos Mendez', 'po@inditex.example', 'Net 30')
      ON CONFLICT (code) DO NOTHING
    `);

    await tx.$executeRawUnsafe(`
      INSERT INTO suppliers (code, name, type, country, contact_person, email, payment_terms)
      VALUES
        ('SUP-F-001', 'Square Textiles', 'fabric', 'BD', 'Rashed Khan', 'sales@square.example', 'LC at sight'),
        ('SUP-F-002', 'Pacific Jeans Fabric', 'fabric', 'BD', 'Salma Akter', 'sales@pacific.example', 'LC 60 days'),
        ('SUP-T-001', 'YKK Bangladesh', 'trim', 'BD', 'Hiroshi Tanaka', 'orders@ykk.example', 'Net 30'),
        ('SUP-T-002', 'Coats Threads', 'trim', 'BD', 'Megan Foster', 'sales@coats.example', 'Net 30'),
        ('SUP-A-001', 'Avery Dennison Labels', 'accessory', 'BD', 'Imran Hossain', 'sales@avery.example', 'Net 45')
      ON CONFLICT (code) DO NOTHING
    `);

    const fabricSup = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM suppliers WHERE code = 'SUP-F-001' LIMIT 1`,
    );
    const trimSup = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM suppliers WHERE code = 'SUP-T-001' LIMIT 1`,
    );
    const labelSup = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM suppliers WHERE code = 'SUP-A-001' LIMIT 1`,
    );

    await tx.$executeRawUnsafe(
      `
      INSERT INTO items (code, name, category, uom, default_supplier_id, standard_cost, currency_code, reorder_level)
      VALUES
        ('FAB-COT-180', '100% Cotton Single Jersey 180 GSM', 'fabric', 'kg', $1::uuid, 4.20, 'USD', 500),
        ('FAB-PE-220',  '65/35 Poly-Cotton Pique 220 GSM',   'fabric', 'kg', $1::uuid, 5.10, 'USD', 300),
        ('TRM-ZIP-7',   'YKK 7" Coil Zipper',                'trim',   'pcs', $2::uuid, 0.18, 'USD', 5000),
        ('TRM-THR-40',  'Coats Polyester Thread 40/2',       'trim',   'cone', $2::uuid, 1.85, 'USD', 200),
        ('ACC-LBL-001', 'Woven Care Label',                  'accessory', 'pcs', $3::uuid, 0.04, 'USD', 10000),
        ('PKG-POLY-001','Poly Bag 12x15',                    'packing', 'pcs', NULL, 0.02, 'USD', 20000)
      ON CONFLICT (code) DO NOTHING
    `,
      fabricSup[0]?.id,
      trimSup[0]?.id,
      labelSup[0]?.id,
    );

    // Styles for H&M
    const hmRows = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM buyers WHERE code = 'BUY-001' LIMIT 1`,
    );
    const walmartRows = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM buyers WHERE code = 'BUY-002' LIMIT 1`,
    );
    const hmId = hmRows[0]?.id;
    const walmartId = walmartRows[0]?.id;

    if (hmId) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO styles (code, name, buyer_id, season, product_type, fabric_summary, target_fob, currency_code, status)
        VALUES
          ('STY-HM-TEE-001', 'Mens Crew Neck Tee — Slim', $1::uuid, 'SS26', 'T-shirt', '100% combed cotton 160 GSM', 4.85, 'USD', 'in_production'),
          ('STY-HM-POLO-002','Mens Pique Polo — Classic', $1::uuid, 'SS26', 'Polo',    '65/35 Poly-cotton pique 220 GSM', 7.25, 'USD', 'sampling')
        ON CONFLICT (code) DO NOTHING
      `,
        hmId,
      );
    }
    if (walmartId) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO styles (code, name, buyer_id, season, product_type, fabric_summary, target_fob, currency_code, status)
        VALUES
          ('STY-WM-DEN-001', 'Boys Denim Jeans — 5 Pocket', $1::uuid, 'FW26', 'Denim', '12 oz indigo denim, ring spun', 9.10, 'USD', 'development')
        ON CONFLICT (code) DO NOTHING
      `,
        walmartId,
      );
    }

    // T&A schedule for the lead H&M tee style
    const teeStyle = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM styles WHERE code = 'STY-HM-TEE-001' LIMIT 1`,
    );
    if (teeStyle[0]) {
      await tx.$executeRawUnsafe(
        `
        INSERT INTO ta_tasks (style_id, sequence, code, name, planned_start, planned_end, status, owner)
        VALUES
          ($1::uuid, 1, 'TP',     'Tech-pack received',          DATE '2026-04-01', DATE '2026-04-03', 'done',        'Merchandiser A'),
          ($1::uuid, 2, 'PP',     'Pre-production sample',       DATE '2026-04-05', DATE '2026-04-15', 'done',        'Sample room'),
          ($1::uuid, 3, 'FAB-LD', 'Lab-dip approval',            DATE '2026-04-10', DATE '2026-04-22', 'in_progress', 'Fabric team'),
          ($1::uuid, 4, 'FAB-IN', 'Bulk fabric in-house',        DATE '2026-04-25', DATE '2026-05-08', 'pending',     'Procurement'),
          ($1::uuid, 5, 'CUT',    'Cutting starts',              DATE '2026-05-09', DATE '2026-05-12', 'pending',     'Cutting line'),
          ($1::uuid, 6, 'SEW',    'Sewing in progress',          DATE '2026-05-13', DATE '2026-05-25', 'pending',     'Sewing line 3'),
          ($1::uuid, 7, 'QA',     'Final inspection (AQL 2.5)',  DATE '2026-05-26', DATE '2026-05-28', 'pending',     'QA team'),
          ($1::uuid, 8, 'EXF',    'Ex-factory shipment',         DATE '2026-05-30', DATE '2026-05-30', 'pending',     'Shipping')
        ON CONFLICT DO NOTHING
      `,
        teeStyle[0].id,
      );
    }

    // Sample buyer order
    if (hmId && teeStyle[0]) {
      const polo = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM styles WHERE code = 'STY-HM-POLO-002' LIMIT 1`,
      );
      const existingOrder = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM buyer_orders WHERE po_number = 'PO-HM-2026-0001' LIMIT 1`,
      );
      if (existingOrder.length === 0) {
        const orderRows = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO buyer_orders (po_number, buyer_id, order_date, delivery_date, incoterm, payment_terms, currency_code, status)
           VALUES ('PO-HM-2026-0001', $1::uuid, DATE '2026-04-01', DATE '2026-06-15', 'FOB', 'Net 60', 'USD', 'confirmed')
           RETURNING id`,
          hmId,
        );
        const orderId = orderRows[0].id;

        const teeLine = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO order_lines (order_id, style_id, color, quantity, unit_price)
           VALUES ($1::uuid, $2::uuid, 'White', 12000, 4.85) RETURNING id`,
          orderId,
          teeStyle[0].id,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO order_size_breakdown (order_line_id, size_label, quantity, sort_order)
           VALUES
             ($1::uuid, 'S', 2400, 0),
             ($1::uuid, 'M', 3600, 1),
             ($1::uuid, 'L', 3600, 2),
             ($1::uuid, 'XL', 2400, 3)`,
          teeLine[0].id,
        );

        if (polo[0]) {
          const poloLine = await tx.$queryRawUnsafe<{ id: string }[]>(
            `INSERT INTO order_lines (order_id, style_id, color, quantity, unit_price)
             VALUES ($1::uuid, $2::uuid, 'Navy', 6000, 7.25) RETURNING id`,
            orderId,
            polo[0].id,
          );
          await tx.$executeRawUnsafe(
            `INSERT INTO order_size_breakdown (order_line_id, size_label, quantity, sort_order)
             VALUES
               ($1::uuid, 'M', 2000, 0),
               ($1::uuid, 'L', 2400, 1),
               ($1::uuid, 'XL', 1600, 2)`,
            poloLine[0].id,
          );
        }
      }
    }

    // Procurement: PR → PO → partial GRN, plus a master LC
    if (teeStyle[0]) {
      const fabricItem = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM items WHERE code = 'FAB-COT-180' LIMIT 1`,
      );
      const threadItem = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM items WHERE code = 'TRM-THR-40' LIMIT 1`,
      );
      const fabricSupplier = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM suppliers WHERE code = 'SUP-F-001' LIMIT 1`,
      );

      const existingPr = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM purchase_requisitions WHERE pr_number = 'PR-2026-0001' LIMIT 1`,
      );
      let prId: string | undefined = existingPr[0]?.id;
      if (!prId && fabricItem[0] && threadItem[0]) {
        const prRows = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO purchase_requisitions (pr_number, requested_by, department, style_id,
              request_date, required_by, status, notes)
           VALUES ('PR-2026-0001', 'Merchandiser A', 'Merchandising', $1::uuid,
              DATE '2026-04-08', DATE '2026-04-22', 'approved', 'Bulk fabric for STY-HM-TEE-001')
           RETURNING id`,
          teeStyle[0].id,
        );
        prId = prRows[0].id;
        await tx.$executeRawUnsafe(
          `INSERT INTO purchase_requisition_items (pr_id, item_id, quantity, uom, estimated_cost, notes)
           VALUES
             ($1::uuid, $2::uuid, 2800, 'kg', 4.20, 'Body fabric — bulk'),
             ($1::uuid, $3::uuid, 60,   'cone', 1.85, 'Sewing thread')`,
          prId,
          fabricItem[0].id,
          threadItem[0].id,
        );
      }

      const existingPo = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM purchase_orders WHERE po_number = 'POO-2026-0001' LIMIT 1`,
      );
      let poId: string | undefined = existingPo[0]?.id;
      if (!poId && prId && fabricSupplier[0] && fabricItem[0] && threadItem[0]) {
        const poRows = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO purchase_orders (po_number, supplier_id, pr_id, style_id,
              order_date, expected_delivery, incoterm, payment_terms, currency_code, status, notes)
           VALUES ('POO-2026-0001', $1::uuid, $2::uuid, $3::uuid,
              DATE '2026-04-10', DATE '2026-05-05', 'FOB', 'LC at sight', 'USD', 'partially_received',
              'Issued against PR-2026-0001')
           RETURNING id`,
          fabricSupplier[0].id,
          prId,
          teeStyle[0].id,
        );
        poId = poRows[0].id;
        await tx.$executeRawUnsafe(
          `INSERT INTO purchase_order_items (po_id, item_id, quantity, unit_price, uom, notes)
           VALUES
             ($1::uuid, $2::uuid, 2800, 4.20, 'kg', 'Body fabric'),
             ($1::uuid, $3::uuid, 60,   1.85, 'cone', 'Sewing thread')`,
          poId,
          fabricItem[0].id,
          threadItem[0].id,
        );
        await tx.$executeRawUnsafe(
          `UPDATE purchase_requisitions SET status = 'converted' WHERE id = $1::uuid`,
          prId,
        );
      }

      const existingGrn = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM goods_receipt_notes WHERE grn_number = 'GRN-2026-0001' LIMIT 1`,
      );
      if (!existingGrn[0] && poId) {
        const grnRows = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO goods_receipt_notes (grn_number, po_id, received_date, received_by,
              invoice_number, challan_number, status, notes)
           VALUES ('GRN-2026-0001', $1::uuid, DATE '2026-04-28', 'Store Keeper',
              'INV-SQ-9001', 'CHL-001', 'partial', 'Partial receipt — 70% of fabric')
           RETURNING id`,
          poId,
        );
        const grnId = grnRows[0].id;
        const poItems = await tx.$queryRawUnsafe<{ id: string; item_id: string; quantity: string }[]>(
          `SELECT id, item_id, quantity::text AS quantity FROM purchase_order_items WHERE po_id = $1::uuid`,
          poId,
        );
        for (const it of poItems) {
          const ordered = Number(it.quantity);
          const recv = Math.round(ordered * 0.7 * 100) / 100;
          const accepted = Math.round(recv * 0.98 * 100) / 100;
          const rejected = Math.round((recv - accepted) * 100) / 100;
          await tx.$executeRawUnsafe(
            `INSERT INTO goods_receipt_items
               (grn_id, po_item_id, item_id, received_quantity, accepted_quantity, rejected_quantity)
             VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)`,
            grnId,
            it.id,
            it.item_id,
            recv,
            accepted,
            rejected,
          );
          await tx.$executeRawUnsafe(
            `UPDATE purchase_order_items SET received_quantity = $1 WHERE id = $2::uuid`,
            accepted,
            it.id,
          );
        }
      }

      const existingLc = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM letters_of_credit WHERE lc_number = 'LC-MASTER-2026-0001' LIMIT 1`,
      );
      if (!existingLc[0] && poId) {
        await tx.$executeRawUnsafe(
          `INSERT INTO letters_of_credit (lc_number, lc_type, issuing_bank, advising_bank,
              beneficiary, applicant, po_id, amount, currency_code,
              issue_date, expiry_date, latest_shipment_date, status, notes)
           VALUES ('LC-MASTER-2026-0001', 'master', 'HSBC Dhaka', 'Sonali Bank',
              'Demo Garments Ltd.', 'H&M', $1::uuid, 58200, 'USD',
              DATE '2026-04-12', DATE '2026-06-30', DATE '2026-06-15', 'opened',
              'Master LC against PO POO-2026-0001')`,
          poId,
        );
      }
    }

    // BOM consumption for STY-HM-TEE-001
    if (teeStyle[0]) {
      const itemMap: Record<string, string> = {};
      const itemRows = await tx.$queryRawUnsafe<{ id: string; code: string }[]>(
        `SELECT id, code FROM items WHERE code IN
          ('FAB-COT-180','TRM-THR-40','ACC-LBL-001','PKG-POLY-001')`,
      );
      for (const r of itemRows) itemMap[r.code] = r.id;

      const bomRows: Array<[string, number, number, string, string]> = [
        ['FAB-COT-180', 0.22, 6, 'kg', 'Body fabric — main cotton single jersey'],
        ['TRM-THR-40', 0.012, 5, 'cone', 'Sewing thread allocation per piece'],
        ['ACC-LBL-001', 1, 1, 'pcs', 'Care label — neck'],
        ['PKG-POLY-001', 1, 0, 'pcs', 'Individual poly bag'],
      ];
      for (const [code, qty, waste, uom, notes] of bomRows) {
        const itemId = itemMap[code];
        if (!itemId) continue;
        await tx.$executeRawUnsafe(
          `INSERT INTO bom_consumption (style_id, item_id, quantity_per_unit, wastage_pct, uom, notes)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
           ON CONFLICT (style_id, item_id) DO NOTHING`,
          teeStyle[0].id,
          itemId,
          qty,
          waste,
          uom,
          notes,
        );
      }

      await tx.$executeRawUnsafe(
        `INSERT INTO costing_sheets (style_id, currency_code, cm_cost, overhead_cost, commercial_cost, profit_pct, notes)
         VALUES ($1::uuid, 'USD', 0.85, 0.12, 0.08, 12, 'Target FOB ~$4.85')
         ON CONFLICT (style_id) DO NOTHING`,
        teeStyle[0].id,
      );
    }

    // Inventory: warehouse, bins, fabric inspection, stock lot from GRN-2026-0001
    let fabricWhId: string;
    const existingWh = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM warehouses WHERE code = 'WH-FAB-01' LIMIT 1`,
    );
    if (existingWh[0]) {
      fabricWhId = existingWh[0].id;
    } else {
      const whRows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO warehouses (code, name, type, address)
         VALUES ('WH-FAB-01', 'Fabric Store — Main', 'fabric', 'Plot 12, Savar EPZ')
         RETURNING id`,
      );
      fabricWhId = whRows[0].id;
    }

    let binId: string | null = null;
    const existingBin = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM bin_locations WHERE warehouse_id = $1::uuid AND code = 'A-01-01' LIMIT 1`,
      fabricWhId,
    );
    if (existingBin[0]) {
      binId = existingBin[0].id;
    } else {
      const binRows = await tx.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO bin_locations (warehouse_id, code, name)
         VALUES ($1::uuid, 'A-01-01', 'Aisle A • Rack 1 • Shelf 1')
         RETURNING id`,
        fabricWhId,
      );
      binId = binRows[0].id;
    }
    await tx.$executeRawUnsafe(
      `INSERT INTO bin_locations (warehouse_id, code, name)
       VALUES ($1::uuid, 'A-01-02', 'Aisle A • Rack 1 • Shelf 2')
       ON CONFLICT (warehouse_id, code) DO NOTHING`,
      fabricWhId,
    );

    // Stock lot for fabric receipt — link to GRN-2026-0001 if it exists
    const fabricItem = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM items WHERE code = 'FAB-COT-180' LIMIT 1`,
    );
    const grnRow = await tx.$queryRawUnsafe<{ id: string; po_id: string }[]>(
      `SELECT id, po_id FROM goods_receipt_notes WHERE grn_number = 'GRN-2026-0001' LIMIT 1`,
    );
    if (fabricItem[0] && grnRow[0]) {
      const existingLot = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM stock_lots WHERE lot_number = 'LOT-FAB-2026-0001' LIMIT 1`,
      );
      if (!existingLot[0]) {
        // Pull accepted qty from goods_receipt_items for the fabric line
        const accepted = await tx.$queryRawUnsafe<{ qty: string }[]>(
          `SELECT COALESCE(SUM(accepted_quantity),0)::text AS qty
             FROM goods_receipt_items
            WHERE grn_id = $1::uuid AND item_id = $2::uuid`,
          grnRow[0].id,
          fabricItem[0].id,
        );
        const qty = Number(accepted[0]?.qty ?? 0);
        if (qty > 0) {
          const lotRows = await tx.$queryRawUnsafe<{ id: string }[]>(
            `INSERT INTO stock_lots (lot_number, item_id, warehouse_id, bin_location_id,
                grn_id, po_id, received_at, quantity_on_hand, received_quantity,
                uom, unit_cost, currency_code, notes)
             VALUES ('LOT-FAB-2026-0001', $1::uuid, $2::uuid, $3::uuid,
                $4::uuid, $5::uuid, TIMESTAMPTZ '2026-04-28 09:30:00+06', $6, $6,
                'kg', 4.20, 'USD', 'Cotton single jersey 180gsm — partial receipt')
             RETURNING id`,
            fabricItem[0].id,
            fabricWhId,
            binId,
            grnRow[0].id,
            grnRow[0].po_id,
            qty,
          );
          await tx.$executeRawUnsafe(
            `INSERT INTO stock_movements (movement_number, movement_type, lot_id, item_id, warehouse_id,
                quantity, reference_type, reference_id, moved_at, moved_by, notes)
             VALUES ('MV-2026-0001', 'receipt', $1::uuid, $2::uuid, $3::uuid,
                $4, 'goods_receipt_note', $5::uuid, TIMESTAMPTZ '2026-04-28 09:30:00+06',
                'Store Keeper', 'Initial receipt from GRN-2026-0001')`,
            lotRows[0].id,
            fabricItem[0].id,
            fabricWhId,
            qty,
            grnRow[0].id,
          );
        }
      }
    }

    // Fabric inspection — pass result on first roll
    if (fabricItem[0]) {
      const existingInsp = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM fabric_inspections WHERE inspection_number = 'INS-2026-0001' LIMIT 1`,
      );
      if (!existingInsp[0]) {
        // 200 yd × 60 in roll, 8 small + 2 medium = 8×1 + 2×2 = 12 points
        // points/100sqyd = 12 × 3600 / (200 × 60) = 43200 / 12000 = 3.6  (well under threshold 40 → pass)
        const inspRows = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO fabric_inspections (
              inspection_number, grn_id, po_id, item_id, roll_number,
              inspected_quantity, inspected_uom, width_inches,
              points_total, points_per_100sqyd, threshold, result, inspected_by, notes)
           VALUES ('INS-2026-0001', $1::uuid, $2::uuid, $3::uuid, 'R-001',
              200, 'yd', 60, 12, 3.60, 40, 'pass', 'QC Inspector A',
              '4-point inspection — first roll of GRN-2026-0001')
           RETURNING id`,
          grnRow[0]?.id ?? null,
          grnRow[0]?.po_id ?? null,
          fabricItem[0].id,
        );
        const inspId = inspRows[0].id;
        await tx.$executeRawUnsafe(
          `INSERT INTO fabric_inspection_defects (inspection_id, defect_size, points, count, description)
           VALUES
             ($1::uuid, 'upto_3in', 8, 8, 'Minor slubs along selvedge'),
             ($1::uuid, '3_to_6in', 4, 2, 'Knot defects')`,
          inspId,
        );
      }
    }

    // ============= Production: cutting plan + lines + bundles + hourly logs =============
    const teeStyleProd = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM styles WHERE code = 'STY-HM-TEE-001' LIMIT 1`,
    );
    if (teeStyleProd[0]) {
      const styleId = teeStyleProd[0].id;
      const fabricLot = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM stock_lots WHERE lot_number = 'LOT-FAB-2026-0001' LIMIT 1`,
      );
      const buyerOrder = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM buyer_orders WHERE order_number = 'PO-HM-2026-001' LIMIT 1`,
      );

      // Cutting plan + items
      const existingPlan = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM cutting_plans WHERE plan_number = 'CP-2026-0001' LIMIT 1`,
      );
      let planId: string;
      if (existingPlan[0]) {
        planId = existingPlan[0].id;
      } else {
        const planRows = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO cutting_plans (
              plan_number, style_id, buyer_order_id, plan_date,
              target_quantity, fabric_lot_id, marker_efficiency_pct, status, notes)
           VALUES ('CP-2026-0001', $1::uuid, $2::uuid, DATE '2026-04-29',
              1500, $3::uuid, 87.50, 'in_progress',
              'Pilot lay for H&M tee — 3 sizes × Navy/White')
           RETURNING id`,
          styleId,
          buyerOrder[0]?.id ?? null,
          fabricLot[0]?.id ?? null,
        );
        planId = planRows[0].id;

        await tx.$executeRawUnsafe(
          `INSERT INTO cutting_plan_items (plan_id, size_label, color, target_quantity, cut_quantity, sort_order)
           VALUES
             ($1::uuid, 'S', 'Navy', 200, 200, 1),
             ($1::uuid, 'M', 'Navy', 300, 300, 2),
             ($1::uuid, 'L', 'Navy', 250, 250, 3),
             ($1::uuid, 'S', 'White', 200, 150, 4),
             ($1::uuid, 'M', 'White', 300, 200, 5),
             ($1::uuid, 'L', 'White', 250, 100, 6)`,
          planId,
        );
      }

      // Sewing lines
      const lineCodes: { code: string; name: string; cap: number; ops: number; helpers: number; sup: string }[] = [
        { code: 'LINE-A', name: 'Sewing Line A — Knit', cap: 60, ops: 28, helpers: 6, sup: 'Mr. Karim' },
        { code: 'LINE-B', name: 'Sewing Line B — Knit', cap: 55, ops: 26, helpers: 6, sup: 'Mr. Hossain' },
      ];
      const lineIds: Record<string, string> = {};
      for (const l of lineCodes) {
        const existing = await tx.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM sewing_lines WHERE code = $1 LIMIT 1`,
          l.code,
        );
        if (existing[0]) {
          lineIds[l.code] = existing[0].id;
          continue;
        }
        const created = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO sewing_lines (code, name, capacity_pcs_per_hour, operator_count, helper_count, supervisor, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)
           RETURNING id`,
          l.code, l.name, l.cap, l.ops, l.helpers, l.sup,
        );
        lineIds[l.code] = created[0].id;
      }

      // Line assignments
      for (const code of ['LINE-A', 'LINE-B']) {
        const existing = await tx.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM line_assignments WHERE line_id = $1::uuid AND style_id = $2::uuid AND status = 'active' LIMIT 1`,
          lineIds[code], styleId,
        );
        if (existing[0]) continue;
        await tx.$executeRawUnsafe(
          `INSERT INTO line_assignments (line_id, style_id, buyer_order_id, target_pcs_per_hour, sam, started_at, status, notes)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, TIMESTAMPTZ '2026-04-29 08:00:00+06', 'active', $6)`,
          lineIds[code],
          styleId,
          buyerOrder[0]?.id ?? null,
          code === 'LINE-A' ? 60 : 55,
          15.5,
          `${code} — H&M Crew Tee assignment`,
        );
      }

      // Bundles — 4 example bundles, mixed status
      const bundles: { num: string; line: string | null; size: string; color: string; qty: number; status: string }[] = [
        { num: 'BDL-2026-0001', line: 'LINE-A', size: 'S', color: 'Navy', qty: 50, status: 'sewn' },
        { num: 'BDL-2026-0002', line: 'LINE-A', size: 'M', color: 'Navy', qty: 60, status: 'in_sewing' },
        { num: 'BDL-2026-0003', line: 'LINE-B', size: 'L', color: 'Navy', qty: 50, status: 'in_sewing' },
        { num: 'BDL-2026-0004', line: null, size: 'M', color: 'White', qty: 60, status: 'cut' },
      ];
      for (const b of bundles) {
        const existing = await tx.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM bundles WHERE bundle_number = $1 LIMIT 1`,
          b.num,
        );
        if (existing[0]) continue;
        const sewingStartedAt =
          b.status === 'in_sewing' || b.status === 'sewn' ? `'2026-04-29 09:30:00+06'::timestamptz` : 'NULL';
        const sewingCompletedAt =
          b.status === 'sewn' ? `'2026-04-29 12:45:00+06'::timestamptz` : 'NULL';
        await tx.$executeRawUnsafe(
          `INSERT INTO bundles (
              bundle_number, qr_code, cutting_plan_id, line_id,
              size_label, color, quantity, status, sewing_started_at, sewing_completed_at)
           VALUES ($1, $2, $3::uuid, $4::uuid, $5, $6, $7, $8, ${sewingStartedAt}, ${sewingCompletedAt})`,
          b.num,
          `BDL:${b.num}`,
          planId,
          b.line ? lineIds[b.line] : null,
          b.size,
          b.color,
          b.qty,
          b.status,
        );
      }

      // Hourly production logs — first 5 hours of 2026-04-29 for both lines
      const logs: { line: string; hour: number; target: number; produced: number; rejected: number }[] = [
        { line: 'LINE-A', hour: 8,  target: 60, produced: 52, rejected: 1 },
        { line: 'LINE-A', hour: 9,  target: 60, produced: 58, rejected: 0 },
        { line: 'LINE-A', hour: 10, target: 60, produced: 61, rejected: 1 },
        { line: 'LINE-A', hour: 11, target: 60, produced: 55, rejected: 2 },
        { line: 'LINE-A', hour: 12, target: 60, produced: 59, rejected: 0 },
        { line: 'LINE-B', hour: 8,  target: 55, produced: 40, rejected: 0 },
        { line: 'LINE-B', hour: 9,  target: 55, produced: 48, rejected: 1 },
        { line: 'LINE-B', hour: 10, target: 55, produced: 52, rejected: 0 },
        { line: 'LINE-B', hour: 11, target: 55, produced: 50, rejected: 1 },
        { line: 'LINE-B', hour: 12, target: 55, produced: 53, rejected: 0 },
      ];
      for (const lg of logs) {
        await tx.$executeRawUnsafe(
          `INSERT INTO hourly_production_logs (line_id, style_id, log_date, hour_slot, target_pcs, produced_pcs, rejected_pcs)
           VALUES ($1::uuid, $2::uuid, DATE '2026-04-29', $3, $4, $5, $6)
           ON CONFLICT (line_id, log_date, hour_slot) DO NOTHING`,
          lineIds[lg.line], styleId, lg.hour, lg.target, lg.produced, lg.rejected,
        );
      }

      // ============= Quality: defect codes + inline + end-line + AQL =============
      const defectCodes: { code: string; name: string; category: string; severity: string; description: string }[] = [
        { code: 'DC-SKIP-STITCH', name: 'Skipped Stitch', category: 'stitching', severity: 'major', description: 'Stitch missing from seam line' },
        { code: 'DC-BROK-STITCH', name: 'Broken Stitch', category: 'stitching', severity: 'major', description: 'Stitch broken during sewing or wash' },
        { code: 'DC-OPEN-SEAM', name: 'Open Seam', category: 'stitching', severity: 'critical', description: 'Seam fully open — garment unwearable' },
        { code: 'DC-OIL-STAIN', name: 'Oil Stain', category: 'finishing', severity: 'major', description: 'Machine oil mark on fabric' },
        { code: 'DC-FABRIC-HOLE', name: 'Fabric Hole', category: 'fabric', severity: 'critical', description: 'Hole or tear in fabric' },
        { code: 'DC-SHADE-VAR', name: 'Shade Variation', category: 'fabric', severity: 'minor', description: 'Color shade differs across panels' },
        { code: 'DC-LOOSE-THR', name: 'Loose Thread', category: 'finishing', severity: 'minor', description: 'Untrimmed or loose thread tail' },
        { code: 'DC-PUCKER', name: 'Seam Puckering', category: 'stitching', severity: 'minor', description: 'Wavy or wrinkled seam appearance' },
      ];
      const defectIds: Record<string, string> = {};
      for (const d of defectCodes) {
        const existing = await tx.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM defect_codes WHERE code = $1 LIMIT 1`,
          d.code,
        );
        if (existing[0]) {
          defectIds[d.code] = existing[0].id;
          continue;
        }
        const created = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO defect_codes (code, name, category, severity, description, is_active)
           VALUES ($1, $2, $3, $4, $5, TRUE)
           RETURNING id`,
          d.code, d.name, d.category, d.severity, d.description,
        );
        defectIds[d.code] = created[0].id;
      }

      // Inline QC — 2 sample records on LINE-A
      const inlineRecords: { num: string; line: string; op: string; insp: number; defectCode: string | null; defectQty: number }[] = [
        { num: 'IL-2026-001', line: 'LINE-A', op: 'Side seam', insp: 50, defectCode: 'DC-SKIP-STITCH', defectQty: 2 },
        { num: 'IL-2026-002', line: 'LINE-B', op: 'Hem', insp: 40, defectCode: 'DC-PUCKER', defectQty: 1 },
      ];
      for (const r of inlineRecords) {
        const existing = await tx.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM inline_qc_records WHERE record_number = $1 LIMIT 1`,
          r.num,
        );
        if (existing[0]) continue;
        await tx.$executeRawUnsafe(
          `INSERT INTO inline_qc_records (
              record_number, line_id, style_id, operation, operator_name,
              inspected_quantity, defect_code_id, defect_quantity, inspected_at, inspected_by, notes)
           VALUES ($1, $2::uuid, $3::uuid, $4, 'Operator A', $5, $6::uuid, $7,
              TIMESTAMPTZ '2026-04-29 10:30:00+06', 'QC Inspector', 'Mid-shift inline check')`,
          r.num, lineIds[r.line], styleId, r.op, r.insp,
          r.defectCode ? defectIds[r.defectCode] : null, r.defectQty,
        );
      }

      // End-line QC — 1 record per line for 2026-04-29 with multiple defects
      const endLineRecords: {
        num: string; line: string; insp: number; rework: number; reject: number;
        defects: { code: string; qty: number }[];
      }[] = [
        {
          num: 'EL-2026-001', line: 'LINE-A', insp: 250, rework: 8, reject: 2,
          defects: [
            { code: 'DC-SKIP-STITCH', qty: 4 },
            { code: 'DC-LOOSE-THR', qty: 5 },
            { code: 'DC-OIL-STAIN', qty: 1 },
          ],
        },
        {
          num: 'EL-2026-002', line: 'LINE-B', insp: 200, rework: 12, reject: 4,
          defects: [
            { code: 'DC-BROK-STITCH', qty: 6 },
            { code: 'DC-PUCKER', qty: 5 },
            { code: 'DC-SHADE-VAR', qty: 5 },
          ],
        },
      ];
      for (const r of endLineRecords) {
        const existing = await tx.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM end_line_qc_records WHERE record_number = $1 LIMIT 1`,
          r.num,
        );
        if (existing[0]) continue;
        const totalDef = r.defects.reduce((s, d) => s + d.qty, 0);
        const recRows = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO end_line_qc_records (
              record_number, line_id, style_id, log_date,
              inspected_quantity, defect_quantity, rework_quantity, reject_quantity,
              inspected_at, inspected_by, notes)
           VALUES ($1, $2::uuid, $3::uuid, DATE '2026-04-29', $4, $5, $6, $7,
              TIMESTAMPTZ '2026-04-29 13:00:00+06', 'End-line QC', 'End-of-shift sample inspection')
           RETURNING id`,
          r.num, lineIds[r.line], styleId, r.insp, totalDef, r.rework, r.reject,
        );
        const recId = recRows[0].id;
        for (const d of r.defects) {
          await tx.$executeRawUnsafe(
            `INSERT INTO end_line_qc_defects (record_id, defect_code_id, quantity)
             VALUES ($1::uuid, $2::uuid, $3)`,
            recId, defectIds[d.code], d.qty,
          );
        }
      }

      // AQL — 1 final inspection on the cutting plan, lot 1500 → sample 125 (Z1.4 Level II)
      const aqlExisting = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM aql_inspections WHERE inspection_number = 'AQL-2026-001' LIMIT 1`,
      );
      if (!aqlExisting[0]) {
        const totals = { critical: 0, major: 3, minor: 4 };
        const aqlRows = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO aql_inspections (
              inspection_number, cutting_plan_id, style_id, buyer_order_id,
              inspection_stage, aql_level, lot_size, sample_size,
              accept_threshold, reject_threshold,
              critical_defects, major_defects, minor_defects, result,
              inspected_at, inspected_by, notes)
           VALUES ('AQL-2026-001', $1::uuid, $2::uuid, $3::uuid,
              'final', 2.5, 1500, 125,
              7, 8, $4, $5, $6, 'pass',
              TIMESTAMPTZ '2026-04-29 14:30:00+06', 'AQL Inspector',
              'Final AQL — pass (7 ≤ accept threshold)')
           RETURNING id`,
          planId, styleId, buyerOrder[0]?.id ?? null,
          totals.critical, totals.major, totals.minor,
        );
        const aqlId = aqlRows[0].id;
        const aqlDefects: { code: string; qty: number; severity: string }[] = [
          { code: 'DC-SKIP-STITCH', qty: 2, severity: 'major' },
          { code: 'DC-BROK-STITCH', qty: 1, severity: 'major' },
          { code: 'DC-LOOSE-THR', qty: 3, severity: 'minor' },
          { code: 'DC-PUCKER', qty: 1, severity: 'minor' },
        ];
        for (const d of aqlDefects) {
          await tx.$executeRawUnsafe(
            `INSERT INTO aql_inspection_defects (inspection_id, defect_code_id, quantity, severity)
             VALUES ($1::uuid, $2::uuid, $3, $4)`,
            aqlId, defectIds[d.code], d.qty, d.severity,
          );
        }
      }

      // ============= Shipment: packing list + cartons + shipment + export docs =============
      const plExisting = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM packing_lists WHERE pl_number = 'PL-2026-001' LIMIT 1`,
      );
      let packingListId: string | null = plExisting[0]?.id ?? null;
      if (!packingListId) {
        const cartonRows: { num: string; size: string; color: string; qty: number; gross: number; net: number; l: number; w: number; h: number }[] = [
          { num: 'CTN-001', size: 'S', color: 'Navy', qty: 30, gross: 12, net: 11, l: 60, w: 40, h: 30 },
          { num: 'CTN-002', size: 'M', color: 'Navy', qty: 30, gross: 12, net: 11, l: 60, w: 40, h: 30 },
          { num: 'CTN-003', size: 'L', color: 'Navy', qty: 30, gross: 13, net: 12, l: 60, w: 40, h: 30 },
          { num: 'CTN-004', size: 'M', color: 'White', qty: 30, gross: 12, net: 11, l: 60, w: 40, h: 30 },
        ];
        const totalQty = cartonRows.reduce((s, c) => s + c.qty, 0);
        const totalGross = cartonRows.reduce((s, c) => s + c.gross, 0);
        const totalNet = cartonRows.reduce((s, c) => s + c.net, 0);
        const totalCbm = cartonRows.reduce((s, c) => s + (c.l * c.w * c.h) / 1_000_000, 0);
        const plRows = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO packing_lists (
              pl_number, buyer_order_id, style_id, invoice_number, pack_date,
              total_cartons, total_quantity, gross_weight_kg, net_weight_kg, cbm,
              status, notes)
           VALUES ('PL-2026-001', $1::uuid, $2::uuid, 'INV-HM-2026-001', DATE '2026-04-29',
              $3, $4, $5, $6, $7, 'finalized',
              'H&M Crew Tee — first shipment, sea freight via Chittagong')
           RETURNING id`,
          buyerOrder[0]?.id ?? null,
          styleId,
          cartonRows.length,
          totalQty,
          totalGross,
          totalNet,
          Number(totalCbm.toFixed(4)),
        );
        packingListId = plRows[0].id;
        let order = 1;
        for (const c of cartonRows) {
          await tx.$executeRawUnsafe(
            `INSERT INTO packing_list_cartons (
                packing_list_id, carton_number, size_label, color, quantity,
                gross_weight_kg, net_weight_kg, length_cm, width_cm, height_cm, sort_order)
             VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            packingListId, c.num, c.size, c.color, c.qty,
            c.gross, c.net, c.l, c.w, c.h, order++,
          );
        }
      }

      // Shipment
      const shipExisting = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM shipments WHERE shipment_number = 'SHP-2026-001' LIMIT 1`,
      );
      let shipmentId: string | null = shipExisting[0]?.id ?? null;
      if (!shipmentId) {
        const shipRows = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO shipments (
              shipment_number, buyer_order_id, packing_list_id, mode, forwarder,
              bl_awb_number, container_number, port_of_loading, port_of_discharge,
              etd, eta, invoice_number, invoice_value_usd, status, notes)
           VALUES ('SHP-2026-001', $1::uuid, $2::uuid, 'sea', 'DHL Global Forwarding',
              'BLNO-2026-CH-44218', 'MSCU7821044', 'Chittagong, BD', 'Hamburg, DE',
              DATE '2026-05-10', DATE '2026-06-08', 'INV-HM-2026-001', 14600.00, 'planned',
              'First sea shipment for H&M PO — 120 pcs container booking')
           RETURNING id`,
          buyerOrder[0]?.id ?? null,
          packingListId,
        );
        shipmentId = shipRows[0].id;
      }

      // Export documents — CO, GSP, EXP, Commercial Invoice
      const exportDocs: { num: string; type: string; issuedBy: string; ref: string; status: string; expiry?: string; notes: string }[] = [
        { num: 'CO-2026-001', type: 'co', issuedBy: 'BGMEA', ref: 'BG/CO/26/8821', status: 'approved', expiry: '2026-10-29',
          notes: 'Certificate of Origin for H&M PO' },
        { num: 'GSP-2026-001', type: 'gsp', issuedBy: 'EPB', ref: 'GSP-FA-26-3104', status: 'submitted', expiry: '2026-10-29',
          notes: 'GSP Form A — preferential tariff to EU' },
        { num: 'EXP-2026-001', type: 'exp', issuedBy: 'Standard Chartered Bank', ref: 'SCB-EXP-26-77519', status: 'approved',
          notes: 'EXP form — BD Bank export proceeds' },
        { num: 'CI-2026-001', type: 'commercial_invoice', issuedBy: 'Demo Garments Ltd.', ref: 'INV-HM-2026-001', status: 'approved',
          notes: 'Commercial invoice — USD 14,600.00 FOB Chittagong' },
      ];
      for (const d of exportDocs) {
        const existing = await tx.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM export_documents WHERE doc_number = $1 LIMIT 1`,
          d.num,
        );
        if (existing[0]) continue;
        const expiry = d.expiry ? `DATE '${d.expiry}'` : 'NULL';
        await tx.$executeRawUnsafe(
          `INSERT INTO export_documents (
              doc_number, shipment_id, buyer_order_id, doc_type, issued_date,
              issued_by, reference_number, expiry_date, status, notes)
           VALUES ($1, $2::uuid, $3::uuid, $4, DATE '2026-04-29',
              $5, $6, ${expiry}, $7, $8)`,
          d.num, shipmentId, buyerOrder[0]?.id ?? null, d.type,
          d.issuedBy, d.ref, d.status, d.notes,
        );
      }
    }

    // ============= HR & Payroll =============
    const departments: { code: string; name: string; description: string }[] = [
      { code: 'DEPT-CUT', name: 'Cutting', description: 'Cutting floor — fabric to bundles' },
      { code: 'DEPT-SEW', name: 'Sewing', description: 'Sewing lines and operators' },
      { code: 'DEPT-FIN', name: 'Finishing', description: 'Iron, fold, pack' },
      { code: 'DEPT-QC', name: 'Quality Control', description: 'Inline & end-line inspection' },
      { code: 'DEPT-STR', name: 'Store', description: 'Fabric & trim store, GRN' },
      { code: 'DEPT-MER', name: 'Merchandising', description: 'Buyer communication & T&A' },
      { code: 'DEPT-ADM', name: 'Admin & HR', description: 'HR, accounts, compliance' },
    ];
    for (const d of departments) {
      await tx.$executeRawUnsafe(
        `INSERT INTO hr_departments (code, name, description, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (code) DO NOTHING`,
        d.code, d.name, d.description,
      );
    }

    const sewDept = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM hr_departments WHERE code = 'DEPT-SEW' LIMIT 1`,
    );
    const cutDept = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM hr_departments WHERE code = 'DEPT-CUT' LIMIT 1`,
    );
    const qcDept = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM hr_departments WHERE code = 'DEPT-QC' LIMIT 1`,
    );
    const finDept = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM hr_departments WHERE code = 'DEPT-FIN' LIMIT 1`,
    );
    const merDept = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM hr_departments WHERE code = 'DEPT-MER' LIMIT 1`,
    );
    const admDept = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM hr_departments WHERE code = 'DEPT-ADM' LIMIT 1`,
    );

    const employees: {
      code: string; name: string; designation: string; deptId: string | null;
      payType: string; grade: string | null; basic: number; rent: number; med: number; trans: number; food: number;
      gender: string; phone: string; bkash: string;
    }[] = [
      { code: 'EMP-0001', name: 'Mst. Ayesha Begum', designation: 'Sewing Operator', deptId: sewDept[0]?.id ?? null,
        payType: 'piece_rate', grade: 'grade_4', basic: 8200, rent: 4100, med: 800, trans: 600, food: 1100,
        gender: 'female', phone: '+8801711234001', bkash: '01711234001' },
      { code: 'EMP-0002', name: 'Md. Karim Hossain', designation: 'Senior Sewing Operator', deptId: sewDept[0]?.id ?? null,
        payType: 'monthly', grade: 'grade_3', basic: 9800, rent: 4900, med: 800, trans: 600, food: 1100,
        gender: 'male', phone: '+8801711234002', bkash: '01711234002' },
      { code: 'EMP-0003', name: 'Mst. Salma Khatun', designation: 'Sewing Operator', deptId: sewDept[0]?.id ?? null,
        payType: 'piece_rate', grade: 'grade_5', basic: 7500, rent: 3750, med: 800, trans: 600, food: 1100,
        gender: 'female', phone: '+8801711234003', bkash: '01711234003' },
      { code: 'EMP-0004', name: 'Md. Rafiq Mia', designation: 'Cutting Operator', deptId: cutDept[0]?.id ?? null,
        payType: 'monthly', grade: 'grade_3', basic: 10500, rent: 5250, med: 800, trans: 800, food: 1100,
        gender: 'male', phone: '+8801711234004', bkash: '01711234004' },
      { code: 'EMP-0005', name: 'Mst. Rina Akter', designation: 'QC Inspector', deptId: qcDept[0]?.id ?? null,
        payType: 'monthly', grade: 'grade_2', basic: 12000, rent: 6000, med: 1000, trans: 800, food: 1100,
        gender: 'female', phone: '+8801711234005', bkash: '01711234005' },
      { code: 'EMP-0006', name: 'Md. Hasan Ali', designation: 'Line Supervisor', deptId: sewDept[0]?.id ?? null,
        payType: 'monthly', grade: 'grade_2', basic: 16000, rent: 8000, med: 1200, trans: 1200, food: 1500,
        gender: 'male', phone: '+8801711234006', bkash: '01711234006' },
      { code: 'EMP-0007', name: 'Md. Jamal Uddin', designation: 'Cutting Master', deptId: cutDept[0]?.id ?? null,
        payType: 'monthly', grade: 'grade_1', basic: 22000, rent: 11000, med: 1500, trans: 1500, food: 1500,
        gender: 'male', phone: '+8801711234007', bkash: '01711234007' },
      { code: 'EMP-0008', name: 'Mst. Fatema Begum', designation: 'Finishing Operator', deptId: finDept[0]?.id ?? null,
        payType: 'piece_rate', grade: 'grade_5', basic: 7800, rent: 3900, med: 800, trans: 600, food: 1100,
        gender: 'female', phone: '+8801711234008', bkash: '01711234008' },
      { code: 'EMP-0009', name: 'Md. Tariqul Islam', designation: 'Merchandiser', deptId: merDept[0]?.id ?? null,
        payType: 'monthly', grade: 'grade_1', basic: 35000, rent: 17500, med: 2000, trans: 2500, food: 2000,
        gender: 'male', phone: '+8801711234009', bkash: '01711234009' },
      { code: 'EMP-0010', name: 'Mst. Nasrin Akter', designation: 'HR Officer', deptId: admDept[0]?.id ?? null,
        payType: 'monthly', grade: 'grade_2', basic: 20000, rent: 10000, med: 1500, trans: 1500, food: 1500,
        gender: 'female', phone: '+8801711234010', bkash: '01711234010' },
    ];

    for (const e of employees) {
      const exists = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM employees WHERE employee_code = $1 LIMIT 1`,
        e.code,
      );
      if (exists[0]) continue;
      await tx.$executeRawUnsafe(
        `INSERT INTO employees (
            employee_code, full_name, gender, phone, department_id, designation,
            employment_type, pay_type, skill_grade,
            base_salary, house_rent, medical_allowance, transport_allowance, food_allowance,
            join_date, status, bank_name, bkash_number)
         VALUES ($1, $2, $3, $4, $5::uuid, $6,
            'permanent', $7, $8,
            $9, $10, $11, $12, $13,
            DATE '2024-01-15', 'active', 'BRAC Bank', $14)`,
        e.code, e.name, e.gender, e.phone, e.deptId, e.designation,
        e.payType, e.grade,
        e.basic, e.rent, e.med, e.trans, e.food,
        e.bkash,
      );
    }

    // Sample attendance for April 2026 — 25 working days (excluding Fridays)
    const empRows = await tx.$queryRawUnsafe<{ id: string; employee_code: string }[]>(
      `SELECT id, employee_code FROM employees ORDER BY employee_code`,
    );
    if (empRows.length > 0) {
      const existingAtt = await tx.$queryRawUnsafe<{ c: string }[]>(
        `SELECT COUNT(*)::text AS c FROM attendance_records WHERE work_date BETWEEN DATE '2026-04-01' AND DATE '2026-04-30'`,
      );
      if (Number(existingAtt[0]?.c || 0) === 0) {
        for (const emp of empRows) {
          for (let day = 1; day <= 30; day++) {
            const date = new Date(Date.UTC(2026, 3, day));
            const dow = date.getUTCDay();
            if (dow === 5) continue; // Friday off
            const dateStr = `2026-04-${String(day).padStart(2, '0')}`;
            const code = emp.employee_code;
            const isAbsent = (code === 'EMP-0003' && day === 14) || (code === 'EMP-0008' && day === 22);
            const isLate = code === 'EMP-0001' && (day === 7 || day === 21);
            let status = 'present';
            let inTime = '08:00';
            let outTime = '17:00';
            let hours = 8;
            let ot = 0;
            if (isAbsent) {
              status = 'absent';
              hours = 0;
              inTime = '00:00';
              outTime = '00:00';
            } else if (isLate) {
              status = 'late';
              inTime = '08:35';
            }
            // OT on 6 random days, 2 hours
            if (!isAbsent && [3, 8, 12, 17, 24, 28].includes(day)) {
              ot = 2;
              outTime = '19:00';
            }
            await tx.$executeRawUnsafe(
              `INSERT INTO attendance_records (
                  employee_id, work_date, in_time, out_time, hours_worked, overtime_hours, status, source)
               VALUES ($1::uuid, $2::date, $3::time, $4::time, $5, $6, $7, 'biometric')
               ON CONFLICT (employee_id, work_date) DO NOTHING`,
              emp.id, dateStr, inTime, outTime, hours, ot, status,
            );
          }
        }
      }

      // Sample leave requests
      const leaveExists = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM leave_requests WHERE employee_id = $1::uuid AND start_date = DATE '2026-04-14' LIMIT 1`,
        empRows[2].id,
      );
      if (!leaveExists[0]) {
        await tx.$executeRawUnsafe(
          `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days, reason, status, approved_by, approved_at)
           VALUES ($1::uuid, 'sick', DATE '2026-04-14', DATE '2026-04-14', 1, 'Fever — doctor advised rest', 'approved', 'HR Manager', NOW())`,
          empRows[2].id,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days, reason, status)
           VALUES ($1::uuid, 'casual', DATE '2026-05-04', DATE '2026-05-05', 2, 'Family event', 'pending')`,
          empRows[5].id,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days, reason, status, approved_by, approved_at)
           VALUES ($1::uuid, 'festival', DATE '2026-04-10', DATE '2026-04-12', 3, 'Eid-ul-Fitr', 'approved', 'HR Manager', NOW())`,
          empRows[8].id,
        );
      }

      // Sample payroll run for April 2026
      const runExists = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM payroll_runs WHERE run_number = 'PAY-2026-04' LIMIT 1`,
      );
      if (!runExists[0]) {
        await tx.$executeRawUnsafe(
          `INSERT INTO payroll_runs (run_number, period_year, period_month, period_label, status, notes)
           VALUES ('PAY-2026-04', 2026, 4, 'April 2026', 'draft', 'Sample payroll — click Compute to auto-generate lines from attendance')`,
        );
      }
    }
  });
}

async function main() {
  console.log('🌱 Seeding…');

  const schemaName = `tenant_${TENANT_SLUG}`;

  // 1. Public-schema records
  let tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { slug: TENANT_SLUG, name: TENANT_NAME, schemaName, status: 'active' },
    });
    console.log(`  ✓ Tenant created: ${TENANT_SLUG}`);
  } else {
    console.log(`  → Tenant exists: ${TENANT_SLUG}`);
  }

  let owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) {
    const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 12);
    owner = await prisma.user.create({
      data: { email: OWNER_EMAIL, fullName: OWNER_NAME, passwordHash },
    });
    console.log(`  ✓ Owner created: ${OWNER_EMAIL}`);
  } else {
    console.log(`  → Owner exists: ${OWNER_EMAIL}`);
  }

  await prisma.userMembership.upsert({
    where: { userId_tenantId: { userId: owner.id, tenantId: tenant.id } },
    update: { roles: ['tenant_owner'] },
    create: { userId: owner.id, tenantId: tenant.id, roles: ['tenant_owner'] },
  });

  // 2. Tenant schema + DDL
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  await applyTenantDdl(schemaName);
  console.log(`  ✓ Tenant schema "${schemaName}" provisioned`);

  // 3. Tenant data
  await seedTenantData(schemaName);
  console.log(`  ✓ Sample masters, styles, T&A schedule, and buyer order inserted`);

  console.log('\n✅ Seed complete.\n');
  console.log('   Login at http://localhost:4200/auth/login');
  console.log(`   Email:    ${OWNER_EMAIL}`);
  console.log(`   Password: ${OWNER_PASSWORD}\n`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
