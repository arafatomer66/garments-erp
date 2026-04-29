-- Tenant schema template — applied to every tenant_<slug> schema on creation.
-- Schema name is interpolated by TenantSchemaService via {{SCHEMA}} placeholder,
-- which is validated against ^tenant_[a-z0-9_]+$ before substitution.

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL,
    name VARCHAR(160) NOT NULL,
    country VARCHAR(2),
    contact_person VARCHAR(120),
    email VARCHAR(160),
    phone VARCHAR(40),
    payment_terms VARCHAR(80),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT buyers_code_unique UNIQUE (code)
);
CREATE INDEX IF NOT EXISTS buyers_name_idx ON "{{SCHEMA}}".buyers (name);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL,
    name VARCHAR(160) NOT NULL,
    type VARCHAR(40) NOT NULL DEFAULT 'fabric',
    country VARCHAR(2),
    contact_person VARCHAR(120),
    email VARCHAR(160),
    phone VARCHAR(40),
    payment_terms VARCHAR(80),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT suppliers_code_unique UNIQUE (code),
    CONSTRAINT suppliers_type_chk CHECK (type IN ('fabric', 'trim', 'accessory', 'service', 'other'))
);
CREATE INDEX IF NOT EXISTS suppliers_name_idx ON "{{SCHEMA}}".suppliers (name);
CREATE INDEX IF NOT EXISTS suppliers_type_idx ON "{{SCHEMA}}".suppliers (type);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(48) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(40) NOT NULL DEFAULT 'fabric',
    uom VARCHAR(16) NOT NULL DEFAULT 'pcs',
    description TEXT,
    default_supplier_id UUID,
    standard_cost NUMERIC(14, 4),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    reorder_level NUMERIC(14, 4) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT items_code_unique UNIQUE (code),
    CONSTRAINT items_category_chk CHECK (category IN ('fabric', 'trim', 'accessory', 'packing', 'finished_good', 'other')),
    CONSTRAINT items_supplier_fk FOREIGN KEY (default_supplier_id) REFERENCES "{{SCHEMA}}".suppliers(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS items_name_idx ON "{{SCHEMA}}".items (name);
CREATE INDEX IF NOT EXISTS items_category_idx ON "{{SCHEMA}}".items (category);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(48) NOT NULL,
    name VARCHAR(200) NOT NULL,
    buyer_id UUID NOT NULL,
    season VARCHAR(40),
    product_type VARCHAR(60),
    fabric_summary TEXT,
    description TEXT,
    target_fob NUMERIC(14, 4),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(24) NOT NULL DEFAULT 'development',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT styles_code_unique UNIQUE (code),
    CONSTRAINT styles_buyer_fk FOREIGN KEY (buyer_id) REFERENCES "{{SCHEMA}}".buyers(id) ON DELETE RESTRICT,
    CONSTRAINT styles_status_chk CHECK (status IN ('development', 'sampling', 'approved', 'in_production', 'shipped', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS styles_buyer_idx ON "{{SCHEMA}}".styles (buyer_id);
CREATE INDEX IF NOT EXISTS styles_status_idx ON "{{SCHEMA}}".styles (status);
CREATE INDEX IF NOT EXISTS styles_name_idx ON "{{SCHEMA}}".styles (name);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".tech_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    style_id UUID NOT NULL,
    version INT NOT NULL DEFAULT 1,
    file_name VARCHAR(240) NOT NULL,
    storage_key VARCHAR(400) NOT NULL,
    content_type VARCHAR(120),
    size_bytes BIGINT,
    notes TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tech_packs_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE CASCADE,
    CONSTRAINT tech_packs_style_version_unique UNIQUE (style_id, version)
);
CREATE INDEX IF NOT EXISTS tech_packs_style_idx ON "{{SCHEMA}}".tech_packs (style_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".ta_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    style_id UUID NOT NULL,
    sequence INT NOT NULL DEFAULT 0,
    code VARCHAR(40) NOT NULL,
    name VARCHAR(160) NOT NULL,
    planned_start DATE,
    planned_end DATE NOT NULL,
    actual_start DATE,
    actual_end DATE,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    owner VARCHAR(120),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ta_tasks_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE CASCADE,
    CONSTRAINT ta_tasks_status_chk CHECK (status IN ('pending', 'in_progress', 'done', 'delayed', 'skipped')),
    CONSTRAINT ta_tasks_dates_chk CHECK (planned_start IS NULL OR planned_start <= planned_end)
);
CREATE INDEX IF NOT EXISTS ta_tasks_style_idx ON "{{SCHEMA}}".ta_tasks (style_id);
CREATE INDEX IF NOT EXISTS ta_tasks_planned_end_idx ON "{{SCHEMA}}".ta_tasks (planned_end);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".buyer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(60) NOT NULL,
    buyer_id UUID NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    incoterm VARCHAR(12),
    payment_terms VARCHAR(80),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(24) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT buyer_orders_po_unique UNIQUE (po_number),
    CONSTRAINT buyer_orders_buyer_fk FOREIGN KEY (buyer_id) REFERENCES "{{SCHEMA}}".buyers(id) ON DELETE RESTRICT,
    CONSTRAINT buyer_orders_status_chk CHECK (status IN ('draft', 'confirmed', 'in_production', 'shipped', 'closed', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS buyer_orders_buyer_idx ON "{{SCHEMA}}".buyer_orders (buyer_id);
CREATE INDEX IF NOT EXISTS buyer_orders_status_idx ON "{{SCHEMA}}".buyer_orders (status);
CREATE INDEX IF NOT EXISTS buyer_orders_delivery_idx ON "{{SCHEMA}}".buyer_orders (delivery_date);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    style_id UUID NOT NULL,
    color VARCHAR(60),
    quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
    unit_price NUMERIC(14, 4) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT order_lines_order_fk FOREIGN KEY (order_id) REFERENCES "{{SCHEMA}}".buyer_orders(id) ON DELETE CASCADE,
    CONSTRAINT order_lines_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE RESTRICT,
    CONSTRAINT order_lines_quantity_chk CHECK (quantity >= 0),
    CONSTRAINT order_lines_price_chk CHECK (unit_price >= 0)
);
CREATE INDEX IF NOT EXISTS order_lines_order_idx ON "{{SCHEMA}}".order_lines (order_id);
CREATE INDEX IF NOT EXISTS order_lines_style_idx ON "{{SCHEMA}}".order_lines (style_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".bom_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    style_id UUID NOT NULL,
    item_id UUID NOT NULL,
    quantity_per_unit NUMERIC(14, 6) NOT NULL DEFAULT 0,
    wastage_pct NUMERIC(6, 3) NOT NULL DEFAULT 0,
    uom VARCHAR(16) NOT NULL DEFAULT 'pcs',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT bom_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE CASCADE,
    CONSTRAINT bom_item_fk FOREIGN KEY (item_id) REFERENCES "{{SCHEMA}}".items(id) ON DELETE RESTRICT,
    CONSTRAINT bom_style_item_unique UNIQUE (style_id, item_id),
    CONSTRAINT bom_qty_chk CHECK (quantity_per_unit >= 0),
    CONSTRAINT bom_wastage_chk CHECK (wastage_pct >= 0 AND wastage_pct <= 100)
);
CREATE INDEX IF NOT EXISTS bom_style_idx ON "{{SCHEMA}}".bom_consumption (style_id);
CREATE INDEX IF NOT EXISTS bom_item_idx ON "{{SCHEMA}}".bom_consumption (item_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".costing_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    style_id UUID NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    cm_cost NUMERIC(14, 4) NOT NULL DEFAULT 0,
    overhead_cost NUMERIC(14, 4) NOT NULL DEFAULT 0,
    commercial_cost NUMERIC(14, 4) NOT NULL DEFAULT 0,
    profit_pct NUMERIC(6, 3) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT costing_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE CASCADE,
    CONSTRAINT costing_style_unique UNIQUE (style_id),
    CONSTRAINT costing_profit_chk CHECK (profit_pct >= 0 AND profit_pct <= 100)
);
CREATE INDEX IF NOT EXISTS costing_style_idx ON "{{SCHEMA}}".costing_sheets (style_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".order_size_breakdown (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_line_id UUID NOT NULL,
    size_label VARCHAR(24) NOT NULL,
    quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT order_size_line_fk FOREIGN KEY (order_line_id) REFERENCES "{{SCHEMA}}".order_lines(id) ON DELETE CASCADE,
    CONSTRAINT order_size_unique UNIQUE (order_line_id, size_label),
    CONSTRAINT order_size_quantity_chk CHECK (quantity >= 0)
);
CREATE INDEX IF NOT EXISTS order_size_line_idx ON "{{SCHEMA}}".order_size_breakdown (order_line_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_number VARCHAR(60) NOT NULL,
    requested_by VARCHAR(120),
    department VARCHAR(80),
    style_id UUID,
    buyer_order_id UUID,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    required_by DATE,
    status VARCHAR(24) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pr_number_unique UNIQUE (pr_number),
    CONSTRAINT pr_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE SET NULL,
    CONSTRAINT pr_order_fk FOREIGN KEY (buyer_order_id) REFERENCES "{{SCHEMA}}".buyer_orders(id) ON DELETE SET NULL,
    CONSTRAINT pr_status_chk CHECK (status IN ('draft', 'submitted', 'approved', 'converted', 'rejected', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS pr_status_idx ON "{{SCHEMA}}".purchase_requisitions (status);
CREATE INDEX IF NOT EXISTS pr_style_idx ON "{{SCHEMA}}".purchase_requisitions (style_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".purchase_requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_id UUID NOT NULL,
    item_id UUID NOT NULL,
    quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
    uom VARCHAR(16) NOT NULL DEFAULT 'pcs',
    estimated_cost NUMERIC(14, 4),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pr_items_pr_fk FOREIGN KEY (pr_id) REFERENCES "{{SCHEMA}}".purchase_requisitions(id) ON DELETE CASCADE,
    CONSTRAINT pr_items_item_fk FOREIGN KEY (item_id) REFERENCES "{{SCHEMA}}".items(id) ON DELETE RESTRICT,
    CONSTRAINT pr_items_qty_chk CHECK (quantity >= 0)
);
CREATE INDEX IF NOT EXISTS pr_items_pr_idx ON "{{SCHEMA}}".purchase_requisition_items (pr_id);
CREATE INDEX IF NOT EXISTS pr_items_item_idx ON "{{SCHEMA}}".purchase_requisition_items (item_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(60) NOT NULL,
    supplier_id UUID NOT NULL,
    pr_id UUID,
    style_id UUID,
    buyer_order_id UUID,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery DATE,
    incoterm VARCHAR(12),
    payment_terms VARCHAR(80),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(24) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT po_number_unique UNIQUE (po_number),
    CONSTRAINT po_supplier_fk FOREIGN KEY (supplier_id) REFERENCES "{{SCHEMA}}".suppliers(id) ON DELETE RESTRICT,
    CONSTRAINT po_pr_fk FOREIGN KEY (pr_id) REFERENCES "{{SCHEMA}}".purchase_requisitions(id) ON DELETE SET NULL,
    CONSTRAINT po_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE SET NULL,
    CONSTRAINT po_order_fk FOREIGN KEY (buyer_order_id) REFERENCES "{{SCHEMA}}".buyer_orders(id) ON DELETE SET NULL,
    CONSTRAINT po_status_chk CHECK (status IN ('draft', 'sent', 'partially_received', 'received', 'closed', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS po_supplier_idx ON "{{SCHEMA}}".purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS po_status_idx ON "{{SCHEMA}}".purchase_orders (status);
CREATE INDEX IF NOT EXISTS po_pr_idx ON "{{SCHEMA}}".purchase_orders (pr_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL,
    item_id UUID NOT NULL,
    quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
    received_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
    unit_price NUMERIC(14, 4) NOT NULL DEFAULT 0,
    uom VARCHAR(16) NOT NULL DEFAULT 'pcs',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT po_items_po_fk FOREIGN KEY (po_id) REFERENCES "{{SCHEMA}}".purchase_orders(id) ON DELETE CASCADE,
    CONSTRAINT po_items_item_fk FOREIGN KEY (item_id) REFERENCES "{{SCHEMA}}".items(id) ON DELETE RESTRICT,
    CONSTRAINT po_items_qty_chk CHECK (quantity >= 0),
    CONSTRAINT po_items_received_chk CHECK (received_quantity >= 0),
    CONSTRAINT po_items_price_chk CHECK (unit_price >= 0)
);
CREATE INDEX IF NOT EXISTS po_items_po_idx ON "{{SCHEMA}}".purchase_order_items (po_id);
CREATE INDEX IF NOT EXISTS po_items_item_idx ON "{{SCHEMA}}".purchase_order_items (item_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".goods_receipt_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_number VARCHAR(60) NOT NULL,
    po_id UUID NOT NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by VARCHAR(120),
    invoice_number VARCHAR(60),
    challan_number VARCHAR(60),
    status VARCHAR(24) NOT NULL DEFAULT 'received',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT grn_number_unique UNIQUE (grn_number),
    CONSTRAINT grn_po_fk FOREIGN KEY (po_id) REFERENCES "{{SCHEMA}}".purchase_orders(id) ON DELETE RESTRICT,
    CONSTRAINT grn_status_chk CHECK (status IN ('received', 'inspected', 'accepted', 'rejected', 'partial'))
);
CREATE INDEX IF NOT EXISTS grn_po_idx ON "{{SCHEMA}}".goods_receipt_notes (po_id);
CREATE INDEX IF NOT EXISTS grn_status_idx ON "{{SCHEMA}}".goods_receipt_notes (status);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id UUID NOT NULL,
    po_item_id UUID NOT NULL,
    item_id UUID NOT NULL,
    received_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
    accepted_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
    rejected_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT grn_items_grn_fk FOREIGN KEY (grn_id) REFERENCES "{{SCHEMA}}".goods_receipt_notes(id) ON DELETE CASCADE,
    CONSTRAINT grn_items_po_item_fk FOREIGN KEY (po_item_id) REFERENCES "{{SCHEMA}}".purchase_order_items(id) ON DELETE RESTRICT,
    CONSTRAINT grn_items_item_fk FOREIGN KEY (item_id) REFERENCES "{{SCHEMA}}".items(id) ON DELETE RESTRICT,
    CONSTRAINT grn_items_received_chk CHECK (received_quantity >= 0),
    CONSTRAINT grn_items_accepted_chk CHECK (accepted_quantity >= 0),
    CONSTRAINT grn_items_rejected_chk CHECK (rejected_quantity >= 0)
);
CREATE INDEX IF NOT EXISTS grn_items_grn_idx ON "{{SCHEMA}}".goods_receipt_items (grn_id);
CREATE INDEX IF NOT EXISTS grn_items_po_item_idx ON "{{SCHEMA}}".goods_receipt_items (po_item_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".letters_of_credit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lc_number VARCHAR(80) NOT NULL,
    lc_type VARCHAR(24) NOT NULL DEFAULT 'master',
    issuing_bank VARCHAR(160),
    advising_bank VARCHAR(160),
    beneficiary VARCHAR(160),
    applicant VARCHAR(160),
    parent_lc_id UUID,
    buyer_order_id UUID,
    po_id UUID,
    amount NUMERIC(16, 4) NOT NULL DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    issue_date DATE,
    expiry_date DATE,
    latest_shipment_date DATE,
    status VARCHAR(24) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT lc_number_unique UNIQUE (lc_number),
    CONSTRAINT lc_type_chk CHECK (lc_type IN ('master', 'back_to_back', 'transferable', 'sight', 'usance')),
    CONSTRAINT lc_status_chk CHECK (status IN ('draft', 'opened', 'amended', 'shipped', 'negotiated', 'paid', 'expired', 'cancelled')),
    CONSTRAINT lc_parent_fk FOREIGN KEY (parent_lc_id) REFERENCES "{{SCHEMA}}".letters_of_credit(id) ON DELETE SET NULL,
    CONSTRAINT lc_order_fk FOREIGN KEY (buyer_order_id) REFERENCES "{{SCHEMA}}".buyer_orders(id) ON DELETE SET NULL,
    CONSTRAINT lc_po_fk FOREIGN KEY (po_id) REFERENCES "{{SCHEMA}}".purchase_orders(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lc_status_idx ON "{{SCHEMA}}".letters_of_credit (status);
CREATE INDEX IF NOT EXISTS lc_order_idx ON "{{SCHEMA}}".letters_of_credit (buyer_order_id);
CREATE INDEX IF NOT EXISTS lc_po_idx ON "{{SCHEMA}}".letters_of_credit (po_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL,
    name VARCHAR(160) NOT NULL,
    type VARCHAR(40) NOT NULL DEFAULT 'fabric',
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT warehouses_code_unique UNIQUE (code),
    CONSTRAINT warehouses_type_chk CHECK (type IN ('fabric', 'trim', 'accessory', 'finished_goods', 'general'))
);
CREATE INDEX IF NOT EXISTS warehouses_type_idx ON "{{SCHEMA}}".warehouses (type);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".bin_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL,
    code VARCHAR(48) NOT NULL,
    name VARCHAR(120),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT bin_warehouse_fk FOREIGN KEY (warehouse_id) REFERENCES "{{SCHEMA}}".warehouses(id) ON DELETE CASCADE,
    CONSTRAINT bin_warehouse_code_unique UNIQUE (warehouse_id, code)
);
CREATE INDEX IF NOT EXISTS bin_warehouse_idx ON "{{SCHEMA}}".bin_locations (warehouse_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".fabric_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_number VARCHAR(60) NOT NULL,
    grn_id UUID,
    po_id UUID,
    item_id UUID NOT NULL,
    roll_number VARCHAR(60),
    lot_number VARCHAR(60),
    inspected_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
    inspected_uom VARCHAR(16) NOT NULL DEFAULT 'yd',
    width_inches NUMERIC(8, 2),
    points_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    points_per_100sqyd NUMERIC(10, 4) NOT NULL DEFAULT 0,
    threshold NUMERIC(10, 4) NOT NULL DEFAULT 40,
    result VARCHAR(16) NOT NULL DEFAULT 'pending',
    inspected_by VARCHAR(120),
    inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fab_insp_number_unique UNIQUE (inspection_number),
    CONSTRAINT fab_insp_grn_fk FOREIGN KEY (grn_id) REFERENCES "{{SCHEMA}}".goods_receipt_notes(id) ON DELETE SET NULL,
    CONSTRAINT fab_insp_po_fk FOREIGN KEY (po_id) REFERENCES "{{SCHEMA}}".purchase_orders(id) ON DELETE SET NULL,
    CONSTRAINT fab_insp_item_fk FOREIGN KEY (item_id) REFERENCES "{{SCHEMA}}".items(id) ON DELETE RESTRICT,
    CONSTRAINT fab_insp_result_chk CHECK (result IN ('pending', 'pass', 'fail', 'conditional'))
);
CREATE INDEX IF NOT EXISTS fab_insp_grn_idx ON "{{SCHEMA}}".fabric_inspections (grn_id);
CREATE INDEX IF NOT EXISTS fab_insp_item_idx ON "{{SCHEMA}}".fabric_inspections (item_id);
CREATE INDEX IF NOT EXISTS fab_insp_result_idx ON "{{SCHEMA}}".fabric_inspections (result);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".fabric_inspection_defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL,
    defect_size VARCHAR(16) NOT NULL,
    points NUMERIC(6, 2) NOT NULL DEFAULT 0,
    count INT NOT NULL DEFAULT 1,
    description VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fab_def_insp_fk FOREIGN KEY (inspection_id) REFERENCES "{{SCHEMA}}".fabric_inspections(id) ON DELETE CASCADE,
    CONSTRAINT fab_def_size_chk CHECK (defect_size IN ('upto_3in', '3_to_6in', '6_to_9in', 'over_9in', 'hole'))
);
CREATE INDEX IF NOT EXISTS fab_def_insp_idx ON "{{SCHEMA}}".fabric_inspection_defects (inspection_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".stock_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_number VARCHAR(60) NOT NULL,
    item_id UUID NOT NULL,
    warehouse_id UUID NOT NULL,
    bin_location_id UUID,
    grn_id UUID,
    po_id UUID,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date DATE,
    quantity_on_hand NUMERIC(14, 4) NOT NULL DEFAULT 0,
    received_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
    uom VARCHAR(16) NOT NULL DEFAULT 'pcs',
    unit_cost NUMERIC(14, 4) NOT NULL DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT lot_number_unique UNIQUE (lot_number),
    CONSTRAINT lot_item_fk FOREIGN KEY (item_id) REFERENCES "{{SCHEMA}}".items(id) ON DELETE RESTRICT,
    CONSTRAINT lot_wh_fk FOREIGN KEY (warehouse_id) REFERENCES "{{SCHEMA}}".warehouses(id) ON DELETE RESTRICT,
    CONSTRAINT lot_bin_fk FOREIGN KEY (bin_location_id) REFERENCES "{{SCHEMA}}".bin_locations(id) ON DELETE SET NULL,
    CONSTRAINT lot_grn_fk FOREIGN KEY (grn_id) REFERENCES "{{SCHEMA}}".goods_receipt_notes(id) ON DELETE SET NULL,
    CONSTRAINT lot_po_fk FOREIGN KEY (po_id) REFERENCES "{{SCHEMA}}".purchase_orders(id) ON DELETE SET NULL,
    CONSTRAINT lot_qty_chk CHECK (quantity_on_hand >= 0)
);
CREATE INDEX IF NOT EXISTS lot_item_idx ON "{{SCHEMA}}".stock_lots (item_id);
CREATE INDEX IF NOT EXISTS lot_wh_idx ON "{{SCHEMA}}".stock_lots (warehouse_id);
CREATE INDEX IF NOT EXISTS lot_received_idx ON "{{SCHEMA}}".stock_lots (received_at);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_number VARCHAR(60) NOT NULL,
    movement_type VARCHAR(24) NOT NULL,
    lot_id UUID NOT NULL,
    item_id UUID NOT NULL,
    warehouse_id UUID NOT NULL,
    quantity NUMERIC(14, 4) NOT NULL,
    reference_type VARCHAR(40),
    reference_id UUID,
    moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    moved_by VARCHAR(120),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT mv_number_unique UNIQUE (movement_number),
    CONSTRAINT mv_lot_fk FOREIGN KEY (lot_id) REFERENCES "{{SCHEMA}}".stock_lots(id) ON DELETE RESTRICT,
    CONSTRAINT mv_item_fk FOREIGN KEY (item_id) REFERENCES "{{SCHEMA}}".items(id) ON DELETE RESTRICT,
    CONSTRAINT mv_wh_fk FOREIGN KEY (warehouse_id) REFERENCES "{{SCHEMA}}".warehouses(id) ON DELETE RESTRICT,
    CONSTRAINT mv_type_chk CHECK (movement_type IN ('receipt', 'issue', 'adjustment', 'transfer_in', 'transfer_out', 'consumption', 'return'))
);
CREATE INDEX IF NOT EXISTS mv_lot_idx ON "{{SCHEMA}}".stock_movements (lot_id);
CREATE INDEX IF NOT EXISTS mv_item_idx ON "{{SCHEMA}}".stock_movements (item_id);
CREATE INDEX IF NOT EXISTS mv_type_idx ON "{{SCHEMA}}".stock_movements (movement_type);
CREATE INDEX IF NOT EXISTS mv_moved_idx ON "{{SCHEMA}}".stock_movements (moved_at);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION "{{SCHEMA}}".set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS buyers_updated_at ON "{{SCHEMA}}".buyers;
CREATE TRIGGER buyers_updated_at BEFORE UPDATE ON "{{SCHEMA}}".buyers
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS suppliers_updated_at ON "{{SCHEMA}}".suppliers;
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON "{{SCHEMA}}".suppliers
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS items_updated_at ON "{{SCHEMA}}".items;
CREATE TRIGGER items_updated_at BEFORE UPDATE ON "{{SCHEMA}}".items
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS styles_updated_at ON "{{SCHEMA}}".styles;
CREATE TRIGGER styles_updated_at BEFORE UPDATE ON "{{SCHEMA}}".styles
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS tech_packs_updated_at ON "{{SCHEMA}}".tech_packs;
CREATE TRIGGER tech_packs_updated_at BEFORE UPDATE ON "{{SCHEMA}}".tech_packs
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS ta_tasks_updated_at ON "{{SCHEMA}}".ta_tasks;
CREATE TRIGGER ta_tasks_updated_at BEFORE UPDATE ON "{{SCHEMA}}".ta_tasks
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS buyer_orders_updated_at ON "{{SCHEMA}}".buyer_orders;
CREATE TRIGGER buyer_orders_updated_at BEFORE UPDATE ON "{{SCHEMA}}".buyer_orders
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS order_lines_updated_at ON "{{SCHEMA}}".order_lines;
CREATE TRIGGER order_lines_updated_at BEFORE UPDATE ON "{{SCHEMA}}".order_lines
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS order_size_updated_at ON "{{SCHEMA}}".order_size_breakdown;
CREATE TRIGGER order_size_updated_at BEFORE UPDATE ON "{{SCHEMA}}".order_size_breakdown
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS bom_consumption_updated_at ON "{{SCHEMA}}".bom_consumption;
CREATE TRIGGER bom_consumption_updated_at BEFORE UPDATE ON "{{SCHEMA}}".bom_consumption
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS costing_sheets_updated_at ON "{{SCHEMA}}".costing_sheets;
CREATE TRIGGER costing_sheets_updated_at BEFORE UPDATE ON "{{SCHEMA}}".costing_sheets
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS pr_updated_at ON "{{SCHEMA}}".purchase_requisitions;
CREATE TRIGGER pr_updated_at BEFORE UPDATE ON "{{SCHEMA}}".purchase_requisitions
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS pr_items_updated_at ON "{{SCHEMA}}".purchase_requisition_items;
CREATE TRIGGER pr_items_updated_at BEFORE UPDATE ON "{{SCHEMA}}".purchase_requisition_items
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS po_updated_at ON "{{SCHEMA}}".purchase_orders;
CREATE TRIGGER po_updated_at BEFORE UPDATE ON "{{SCHEMA}}".purchase_orders
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS po_items_updated_at ON "{{SCHEMA}}".purchase_order_items;
CREATE TRIGGER po_items_updated_at BEFORE UPDATE ON "{{SCHEMA}}".purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS grn_updated_at ON "{{SCHEMA}}".goods_receipt_notes;
CREATE TRIGGER grn_updated_at BEFORE UPDATE ON "{{SCHEMA}}".goods_receipt_notes
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS grn_items_updated_at ON "{{SCHEMA}}".goods_receipt_items;
CREATE TRIGGER grn_items_updated_at BEFORE UPDATE ON "{{SCHEMA}}".goods_receipt_items
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS lc_updated_at ON "{{SCHEMA}}".letters_of_credit;
CREATE TRIGGER lc_updated_at BEFORE UPDATE ON "{{SCHEMA}}".letters_of_credit
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS warehouses_updated_at ON "{{SCHEMA}}".warehouses;
CREATE TRIGGER warehouses_updated_at BEFORE UPDATE ON "{{SCHEMA}}".warehouses
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS bin_locations_updated_at ON "{{SCHEMA}}".bin_locations;
CREATE TRIGGER bin_locations_updated_at BEFORE UPDATE ON "{{SCHEMA}}".bin_locations
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS fab_insp_updated_at ON "{{SCHEMA}}".fabric_inspections;
CREATE TRIGGER fab_insp_updated_at BEFORE UPDATE ON "{{SCHEMA}}".fabric_inspections
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS fab_def_updated_at ON "{{SCHEMA}}".fabric_inspection_defects;
CREATE TRIGGER fab_def_updated_at BEFORE UPDATE ON "{{SCHEMA}}".fabric_inspection_defects
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS stock_lots_updated_at ON "{{SCHEMA}}".stock_lots;
CREATE TRIGGER stock_lots_updated_at BEFORE UPDATE ON "{{SCHEMA}}".stock_lots
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS stock_movements_updated_at ON "{{SCHEMA}}".stock_movements;
CREATE TRIGGER stock_movements_updated_at BEFORE UPDATE ON "{{SCHEMA}}".stock_movements
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

-- =====================================================================
-- Production: cutting plans, sewing lines, bundles, hourly tracker
-- =====================================================================

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".cutting_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_number VARCHAR(60) NOT NULL UNIQUE,
    style_id UUID NOT NULL,
    buyer_order_id UUID,
    plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
    cut_quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
    fabric_lot_id UUID,
    marker_efficiency_pct NUMERIC(6,3),
    status VARCHAR(24) NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned','in_progress','completed','cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cp_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE CASCADE,
    CONSTRAINT cp_order_fk FOREIGN KEY (buyer_order_id) REFERENCES "{{SCHEMA}}".buyer_orders(id) ON DELETE SET NULL,
    CONSTRAINT cp_lot_fk FOREIGN KEY (fabric_lot_id) REFERENCES "{{SCHEMA}}".stock_lots(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS cp_style_idx ON "{{SCHEMA}}".cutting_plans (style_id);
CREATE INDEX IF NOT EXISTS cp_status_idx ON "{{SCHEMA}}".cutting_plans (status);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".cutting_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    size_label VARCHAR(20) NOT NULL,
    color VARCHAR(60),
    target_quantity NUMERIC(14,2) NOT NULL,
    cut_quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cpi_plan_fk FOREIGN KEY (plan_id) REFERENCES "{{SCHEMA}}".cutting_plans(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS cpi_plan_idx ON "{{SCHEMA}}".cutting_plan_items (plan_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".sewing_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    capacity_pcs_per_hour NUMERIC(10,2) NOT NULL DEFAULT 0,
    operator_count INT NOT NULL DEFAULT 0,
    helper_count INT NOT NULL DEFAULT 0,
    supervisor VARCHAR(120),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".line_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID NOT NULL,
    style_id UUID NOT NULL,
    buyer_order_id UUID,
    target_pcs_per_hour NUMERIC(10,2),
    sam NUMERIC(8,3),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    status VARCHAR(24) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','paused','completed','cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT la_line_fk FOREIGN KEY (line_id) REFERENCES "{{SCHEMA}}".sewing_lines(id) ON DELETE CASCADE,
    CONSTRAINT la_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE CASCADE,
    CONSTRAINT la_order_fk FOREIGN KEY (buyer_order_id) REFERENCES "{{SCHEMA}}".buyer_orders(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS la_line_idx ON "{{SCHEMA}}".line_assignments (line_id);
CREATE INDEX IF NOT EXISTS la_status_idx ON "{{SCHEMA}}".line_assignments (status);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_number VARCHAR(60) NOT NULL UNIQUE,
    qr_code VARCHAR(120) NOT NULL UNIQUE,
    cutting_plan_id UUID NOT NULL,
    line_id UUID,
    size_label VARCHAR(20) NOT NULL,
    color VARCHAR(60),
    quantity NUMERIC(10,2) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'cut'
        CHECK (status IN ('cut','in_sewing','sewn','rejected','packed')),
    cut_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sewing_started_at TIMESTAMPTZ,
    sewing_completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT b_plan_fk FOREIGN KEY (cutting_plan_id) REFERENCES "{{SCHEMA}}".cutting_plans(id) ON DELETE CASCADE,
    CONSTRAINT b_line_fk FOREIGN KEY (line_id) REFERENCES "{{SCHEMA}}".sewing_lines(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS b_plan_idx ON "{{SCHEMA}}".bundles (cutting_plan_id);
CREATE INDEX IF NOT EXISTS b_line_idx ON "{{SCHEMA}}".bundles (line_id);
CREATE INDEX IF NOT EXISTS b_status_idx ON "{{SCHEMA}}".bundles (status);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".hourly_production_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID NOT NULL,
    style_id UUID,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    hour_slot SMALLINT NOT NULL CHECK (hour_slot BETWEEN 0 AND 23),
    target_pcs NUMERIC(10,2) NOT NULL DEFAULT 0,
    produced_pcs NUMERIC(10,2) NOT NULL DEFAULT 0,
    rejected_pcs NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT hpl_line_fk FOREIGN KEY (line_id) REFERENCES "{{SCHEMA}}".sewing_lines(id) ON DELETE CASCADE,
    CONSTRAINT hpl_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE SET NULL,
    CONSTRAINT hpl_unique UNIQUE (line_id, log_date, hour_slot)
);
CREATE INDEX IF NOT EXISTS hpl_line_date_idx ON "{{SCHEMA}}".hourly_production_logs (line_id, log_date);

DROP TRIGGER IF EXISTS cp_updated_at ON "{{SCHEMA}}".cutting_plans;
CREATE TRIGGER cp_updated_at BEFORE UPDATE ON "{{SCHEMA}}".cutting_plans
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS cpi_updated_at ON "{{SCHEMA}}".cutting_plan_items;
CREATE TRIGGER cpi_updated_at BEFORE UPDATE ON "{{SCHEMA}}".cutting_plan_items
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS sewing_lines_updated_at ON "{{SCHEMA}}".sewing_lines;
CREATE TRIGGER sewing_lines_updated_at BEFORE UPDATE ON "{{SCHEMA}}".sewing_lines
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS line_assignments_updated_at ON "{{SCHEMA}}".line_assignments;
CREATE TRIGGER line_assignments_updated_at BEFORE UPDATE ON "{{SCHEMA}}".line_assignments
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS bundles_updated_at ON "{{SCHEMA}}".bundles;
CREATE TRIGGER bundles_updated_at BEFORE UPDATE ON "{{SCHEMA}}".bundles
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS hpl_updated_at ON "{{SCHEMA}}".hourly_production_logs;
CREATE TRIGGER hpl_updated_at BEFORE UPDATE ON "{{SCHEMA}}".hourly_production_logs
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

-- =====================================================================
-- QUALITY (defect codes, inline QC, end-line QC, AQL)
-- =====================================================================

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".defect_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('critical', 'major', 'minor')),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".inline_qc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_number TEXT NOT NULL UNIQUE,
    line_id UUID NOT NULL,
    style_id UUID,
    bundle_id UUID,
    operation TEXT,
    operator_name TEXT,
    inspected_quantity INTEGER NOT NULL CHECK (inspected_quantity >= 0),
    defect_code_id UUID,
    defect_quantity INTEGER NOT NULL DEFAULT 0 CHECK (defect_quantity >= 0),
    inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inspected_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT iqc_line_fk FOREIGN KEY (line_id) REFERENCES "{{SCHEMA}}".sewing_lines(id) ON DELETE CASCADE,
    CONSTRAINT iqc_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE SET NULL,
    CONSTRAINT iqc_bundle_fk FOREIGN KEY (bundle_id) REFERENCES "{{SCHEMA}}".bundles(id) ON DELETE SET NULL,
    CONSTRAINT iqc_defect_fk FOREIGN KEY (defect_code_id) REFERENCES "{{SCHEMA}}".defect_codes(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS iqc_line_date_idx ON "{{SCHEMA}}".inline_qc_records (line_id, inspected_at);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".end_line_qc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_number TEXT NOT NULL UNIQUE,
    line_id UUID NOT NULL,
    style_id UUID,
    bundle_id UUID,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    inspected_quantity INTEGER NOT NULL CHECK (inspected_quantity >= 0),
    defect_quantity INTEGER NOT NULL DEFAULT 0 CHECK (defect_quantity >= 0),
    rework_quantity INTEGER NOT NULL DEFAULT 0 CHECK (rework_quantity >= 0),
    reject_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reject_quantity >= 0),
    inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inspected_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT elqc_line_fk FOREIGN KEY (line_id) REFERENCES "{{SCHEMA}}".sewing_lines(id) ON DELETE CASCADE,
    CONSTRAINT elqc_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE SET NULL,
    CONSTRAINT elqc_bundle_fk FOREIGN KEY (bundle_id) REFERENCES "{{SCHEMA}}".bundles(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS elqc_line_date_idx ON "{{SCHEMA}}".end_line_qc_records (line_id, log_date);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".end_line_qc_defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL,
    defect_code_id UUID NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT elqd_record_fk FOREIGN KEY (record_id) REFERENCES "{{SCHEMA}}".end_line_qc_records(id) ON DELETE CASCADE,
    CONSTRAINT elqd_defect_fk FOREIGN KEY (defect_code_id) REFERENCES "{{SCHEMA}}".defect_codes(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS elqd_record_idx ON "{{SCHEMA}}".end_line_qc_defects (record_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".aql_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_number TEXT NOT NULL UNIQUE,
    cutting_plan_id UUID,
    style_id UUID,
    buyer_order_id UUID,
    inspection_stage TEXT NOT NULL DEFAULT 'final' CHECK (inspection_stage IN ('inline', 'final', 'pre_shipment')),
    aql_level NUMERIC(4,2) NOT NULL DEFAULT 2.5,
    lot_size INTEGER NOT NULL CHECK (lot_size > 0),
    sample_size INTEGER NOT NULL CHECK (sample_size > 0),
    accept_threshold INTEGER NOT NULL CHECK (accept_threshold >= 0),
    reject_threshold INTEGER NOT NULL CHECK (reject_threshold > accept_threshold),
    critical_defects INTEGER NOT NULL DEFAULT 0,
    major_defects INTEGER NOT NULL DEFAULT 0,
    minor_defects INTEGER NOT NULL DEFAULT 0,
    result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'pass', 'fail')),
    inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inspected_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT aql_plan_fk FOREIGN KEY (cutting_plan_id) REFERENCES "{{SCHEMA}}".cutting_plans(id) ON DELETE SET NULL,
    CONSTRAINT aql_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE SET NULL,
    CONSTRAINT aql_order_fk FOREIGN KEY (buyer_order_id) REFERENCES "{{SCHEMA}}".buyer_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".aql_inspection_defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL,
    defect_code_id UUID NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('critical', 'major', 'minor')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT aqld_inspection_fk FOREIGN KEY (inspection_id) REFERENCES "{{SCHEMA}}".aql_inspections(id) ON DELETE CASCADE,
    CONSTRAINT aqld_defect_fk FOREIGN KEY (defect_code_id) REFERENCES "{{SCHEMA}}".defect_codes(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS aqld_inspection_idx ON "{{SCHEMA}}".aql_inspection_defects (inspection_id);

DROP TRIGGER IF EXISTS defect_codes_updated_at ON "{{SCHEMA}}".defect_codes;
CREATE TRIGGER defect_codes_updated_at BEFORE UPDATE ON "{{SCHEMA}}".defect_codes
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS iqc_updated_at ON "{{SCHEMA}}".inline_qc_records;
CREATE TRIGGER iqc_updated_at BEFORE UPDATE ON "{{SCHEMA}}".inline_qc_records
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS elqc_updated_at ON "{{SCHEMA}}".end_line_qc_records;
CREATE TRIGGER elqc_updated_at BEFORE UPDATE ON "{{SCHEMA}}".end_line_qc_records
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS aql_updated_at ON "{{SCHEMA}}".aql_inspections;
CREATE TRIGGER aql_updated_at BEFORE UPDATE ON "{{SCHEMA}}".aql_inspections
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

-- =====================================================================
-- Shipment: packing lists, cartons, shipments, export documents
-- =====================================================================

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".packing_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pl_number TEXT NOT NULL UNIQUE,
    buyer_order_id UUID,
    style_id UUID,
    invoice_number TEXT,
    pack_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_cartons INTEGER NOT NULL DEFAULT 0,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    gross_weight_kg NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_weight_kg NUMERIC(12,2) NOT NULL DEFAULT 0,
    cbm NUMERIC(12,4) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'shipped')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pl_order_fk FOREIGN KEY (buyer_order_id) REFERENCES "{{SCHEMA}}".buyer_orders(id) ON DELETE SET NULL,
    CONSTRAINT pl_style_fk FOREIGN KEY (style_id) REFERENCES "{{SCHEMA}}".styles(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS packing_lists_order_idx ON "{{SCHEMA}}".packing_lists (buyer_order_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".packing_list_cartons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    packing_list_id UUID NOT NULL,
    carton_number TEXT NOT NULL,
    size_label TEXT,
    color TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    gross_weight_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
    net_weight_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
    length_cm NUMERIC(8,2),
    width_cm NUMERIC(8,2),
    height_cm NUMERIC(8,2),
    sort_order INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT plc_pl_fk FOREIGN KEY (packing_list_id) REFERENCES "{{SCHEMA}}".packing_lists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS packing_list_cartons_pl_idx ON "{{SCHEMA}}".packing_list_cartons (packing_list_id);
CREATE UNIQUE INDEX IF NOT EXISTS packing_list_cartons_pl_num_uk ON "{{SCHEMA}}".packing_list_cartons (packing_list_id, carton_number);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_number TEXT NOT NULL UNIQUE,
    buyer_order_id UUID,
    packing_list_id UUID,
    mode TEXT NOT NULL DEFAULT 'sea' CHECK (mode IN ('sea', 'air', 'road')),
    forwarder TEXT,
    bl_awb_number TEXT,
    container_number TEXT,
    port_of_loading TEXT,
    port_of_discharge TEXT,
    eta DATE,
    etd DATE,
    actual_ship_date DATE,
    invoice_number TEXT,
    invoice_value_usd NUMERIC(14,2),
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_transit', 'delivered', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ship_order_fk FOREIGN KEY (buyer_order_id) REFERENCES "{{SCHEMA}}".buyer_orders(id) ON DELETE SET NULL,
    CONSTRAINT ship_pl_fk FOREIGN KEY (packing_list_id) REFERENCES "{{SCHEMA}}".packing_lists(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS shipments_order_idx ON "{{SCHEMA}}".shipments (buyer_order_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".export_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_number TEXT NOT NULL UNIQUE,
    shipment_id UUID,
    buyer_order_id UUID,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('co', 'gsp', 'exp', 'commercial_invoice', 'packing_list_doc', 'bl_awb', 'other')),
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    issued_by TEXT,
    reference_number TEXT,
    expiry_date DATE,
    file_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT exdoc_ship_fk FOREIGN KEY (shipment_id) REFERENCES "{{SCHEMA}}".shipments(id) ON DELETE SET NULL,
    CONSTRAINT exdoc_order_fk FOREIGN KEY (buyer_order_id) REFERENCES "{{SCHEMA}}".buyer_orders(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS export_documents_ship_idx ON "{{SCHEMA}}".export_documents (shipment_id);

DROP TRIGGER IF EXISTS packing_lists_updated_at ON "{{SCHEMA}}".packing_lists;
CREATE TRIGGER packing_lists_updated_at BEFORE UPDATE ON "{{SCHEMA}}".packing_lists
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS shipments_updated_at ON "{{SCHEMA}}".shipments;
CREATE TRIGGER shipments_updated_at BEFORE UPDATE ON "{{SCHEMA}}".shipments
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS export_documents_updated_at ON "{{SCHEMA}}".export_documents;
CREATE TRIGGER export_documents_updated_at BEFORE UPDATE ON "{{SCHEMA}}".export_documents
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".hr_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    parent_id UUID,
    head_employee_id UUID,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT hrd_parent_fk FOREIGN KEY (parent_id) REFERENCES "{{SCHEMA}}".hr_departments(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS hr_departments_parent_idx ON "{{SCHEMA}}".hr_departments (parent_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    nid_number TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    phone TEXT,
    email TEXT,
    address TEXT,
    department_id UUID,
    designation TEXT,
    employment_type TEXT NOT NULL DEFAULT 'permanent' CHECK (employment_type IN ('permanent', 'contractual', 'casual', 'intern')),
    pay_type TEXT NOT NULL DEFAULT 'monthly' CHECK (pay_type IN ('monthly', 'piece_rate', 'daily', 'hourly')),
    skill_grade TEXT CHECK (skill_grade IS NULL OR skill_grade IN ('grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5', 'grade_6', 'grade_7')),
    base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    house_rent NUMERIC(12,2) NOT NULL DEFAULT 0,
    medical_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
    transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
    food_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leave_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated', 'resigned')),
    bank_name TEXT,
    bank_account TEXT,
    bkash_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT emp_dept_fk FOREIGN KEY (department_id) REFERENCES "{{SCHEMA}}".hr_departments(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS employees_dept_idx ON "{{SCHEMA}}".employees (department_id);
CREATE INDEX IF NOT EXISTS employees_status_idx ON "{{SCHEMA}}".employees (status);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    work_date DATE NOT NULL,
    in_time TIME,
    out_time TIME,
    hours_worked NUMERIC(5,2) NOT NULL DEFAULT 0,
    overtime_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave', 'holiday', 'weekoff')),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'biometric', 'import')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT att_emp_fk FOREIGN KEY (employee_id) REFERENCES "{{SCHEMA}}".employees(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_emp_date_uk ON "{{SCHEMA}}".attendance_records (employee_id, work_date);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON "{{SCHEMA}}".attendance_records (work_date);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'festival')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days NUMERIC(5,2) NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT lv_emp_fk FOREIGN KEY (employee_id) REFERENCES "{{SCHEMA}}".employees(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS leave_emp_idx ON "{{SCHEMA}}".leave_requests (employee_id);
CREATE INDEX IF NOT EXISTS leave_status_idx ON "{{SCHEMA}}".leave_requests (status);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_number TEXT NOT NULL UNIQUE,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_label TEXT NOT NULL,
    total_employees INTEGER NOT NULL DEFAULT 0,
    total_gross NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_net NUMERIC(14,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'computed', 'approved', 'paid')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payroll_runs_period_idx ON "{{SCHEMA}}".payroll_runs (period_year, period_month);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".payroll_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    days_worked NUMERIC(5,2) NOT NULL DEFAULT 0,
    days_absent NUMERIC(5,2) NOT NULL DEFAULT 0,
    overtime_hours NUMERIC(7,2) NOT NULL DEFAULT 0,
    pieces_completed INTEGER NOT NULL DEFAULT 0,
    basic NUMERIC(12,2) NOT NULL DEFAULT 0,
    house_rent NUMERIC(12,2) NOT NULL DEFAULT 0,
    medical_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
    transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
    food_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
    overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    piece_rate_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
    gross_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    advance NUMERIC(12,2) NOT NULL DEFAULT 0,
    pf_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
    other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT plne_run_fk FOREIGN KEY (payroll_run_id) REFERENCES "{{SCHEMA}}".payroll_runs(id) ON DELETE CASCADE,
    CONSTRAINT plne_emp_fk FOREIGN KEY (employee_id) REFERENCES "{{SCHEMA}}".employees(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS payroll_lines_run_idx ON "{{SCHEMA}}".payroll_lines (payroll_run_id);
CREATE INDEX IF NOT EXISTS payroll_lines_emp_idx ON "{{SCHEMA}}".payroll_lines (employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS payroll_lines_run_emp_uk ON "{{SCHEMA}}".payroll_lines (payroll_run_id, employee_id);

DROP TRIGGER IF EXISTS hr_departments_updated_at ON "{{SCHEMA}}".hr_departments;
CREATE TRIGGER hr_departments_updated_at BEFORE UPDATE ON "{{SCHEMA}}".hr_departments
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS employees_updated_at ON "{{SCHEMA}}".employees;
CREATE TRIGGER employees_updated_at BEFORE UPDATE ON "{{SCHEMA}}".employees
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS leave_requests_updated_at ON "{{SCHEMA}}".leave_requests;
CREATE TRIGGER leave_requests_updated_at BEFORE UPDATE ON "{{SCHEMA}}".leave_requests
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS payroll_runs_updated_at ON "{{SCHEMA}}".payroll_runs;
CREATE TRIGGER payroll_runs_updated_at BEFORE UPDATE ON "{{SCHEMA}}".payroll_runs
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".fin_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
    parent_id UUID,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fin_accounts_parent_fk FOREIGN KEY (parent_id) REFERENCES "{{SCHEMA}}".fin_accounts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS fin_accounts_type_idx ON "{{SCHEMA}}".fin_accounts (account_type);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".fin_tax_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    tax_type TEXT NOT NULL CHECK (tax_type IN ('vat', 'ait', 'source_tax', 'withholding', 'other')),
    rate_percent NUMERIC(7,4) NOT NULL DEFAULT 0,
    applies_to TEXT NOT NULL DEFAULT 'both' CHECK (applies_to IN ('sales', 'purchase', 'both')),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".fin_fx_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_date DATE NOT NULL,
    base_currency VARCHAR(3) NOT NULL,
    quote_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(14,6) NOT NULL,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS fin_fx_rates_unique ON "{{SCHEMA}}".fin_fx_rates (rate_date, base_currency, quote_currency);
CREATE INDEX IF NOT EXISTS fin_fx_rates_date_idx ON "{{SCHEMA}}".fin_fx_rates (rate_date);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".fin_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    bank_name TEXT NOT NULL,
    branch TEXT,
    account_number TEXT NOT NULL,
    account_holder TEXT,
    swift_code TEXT,
    routing_number TEXT,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'BDT',
    purpose TEXT NOT NULL DEFAULT 'operational' CHECK (purpose IN ('operational', 'export_proceeds', 'erq', 'back_to_back_lc', 'payroll', 'other')),
    opening_balance NUMERIC(16,2) NOT NULL DEFAULT 0,
    current_balance NUMERIC(16,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".fin_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    buyer_id UUID,
    buyer_order_id UUID,
    shipment_id UUID,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    fx_rate NUMERIC(14,6) NOT NULL DEFAULT 1,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    total NUMERIC(14,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
    amount_due NUMERIC(14,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fin_invoices_buyer_fk FOREIGN KEY (buyer_id) REFERENCES "{{SCHEMA}}".buyers(id) ON DELETE SET NULL,
    CONSTRAINT fin_invoices_order_fk FOREIGN KEY (buyer_order_id) REFERENCES "{{SCHEMA}}".buyer_orders(id) ON DELETE SET NULL,
    CONSTRAINT fin_invoices_ship_fk FOREIGN KEY (shipment_id) REFERENCES "{{SCHEMA}}".shipments(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS fin_invoices_buyer_idx ON "{{SCHEMA}}".fin_invoices (buyer_id);
CREATE INDEX IF NOT EXISTS fin_invoices_status_idx ON "{{SCHEMA}}".fin_invoices (status);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".fin_invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(14,4) NOT NULL DEFAULT 1,
    unit_price NUMERIC(14,4) NOT NULL DEFAULT 0,
    line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_code_id UUID,
    tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fin_invoice_lines_inv_fk FOREIGN KEY (invoice_id) REFERENCES "{{SCHEMA}}".fin_invoices(id) ON DELETE CASCADE,
    CONSTRAINT fin_invoice_lines_tax_fk FOREIGN KEY (tax_code_id) REFERENCES "{{SCHEMA}}".fin_tax_codes(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS fin_invoice_lines_inv_idx ON "{{SCHEMA}}".fin_invoice_lines (invoice_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".fin_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number TEXT NOT NULL UNIQUE,
    supplier_id UUID,
    purchase_order_id UUID,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'BDT',
    fx_rate NUMERIC(14,6) NOT NULL DEFAULT 1,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    total NUMERIC(14,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
    amount_due NUMERIC(14,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'received', 'partial', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fin_bills_supplier_fk FOREIGN KEY (supplier_id) REFERENCES "{{SCHEMA}}".suppliers(id) ON DELETE SET NULL,
    CONSTRAINT fin_bills_po_fk FOREIGN KEY (purchase_order_id) REFERENCES "{{SCHEMA}}".purchase_orders(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS fin_bills_supplier_idx ON "{{SCHEMA}}".fin_bills (supplier_id);
CREATE INDEX IF NOT EXISTS fin_bills_status_idx ON "{{SCHEMA}}".fin_bills (status);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".fin_bill_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(14,4) NOT NULL DEFAULT 1,
    unit_price NUMERIC(14,4) NOT NULL DEFAULT 0,
    line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_code_id UUID,
    tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fin_bill_lines_bill_fk FOREIGN KEY (bill_id) REFERENCES "{{SCHEMA}}".fin_bills(id) ON DELETE CASCADE,
    CONSTRAINT fin_bill_lines_tax_fk FOREIGN KEY (tax_code_id) REFERENCES "{{SCHEMA}}".fin_tax_codes(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS fin_bill_lines_bill_idx ON "{{SCHEMA}}".fin_bill_lines (bill_id);

CREATE TABLE IF NOT EXISTS "{{SCHEMA}}".fin_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT NOT NULL UNIQUE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    method TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (method IN ('bank_transfer', 'cheque', 'cash', 'lc', 'tt', 'mfs', 'other')),
    bank_account_id UUID,
    invoice_id UUID,
    bill_id UUID,
    party_name TEXT,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'BDT',
    fx_rate NUMERIC(14,6) NOT NULL DEFAULT 1,
    amount NUMERIC(14,2) NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fin_payments_bank_fk FOREIGN KEY (bank_account_id) REFERENCES "{{SCHEMA}}".fin_bank_accounts(id) ON DELETE SET NULL,
    CONSTRAINT fin_payments_inv_fk FOREIGN KEY (invoice_id) REFERENCES "{{SCHEMA}}".fin_invoices(id) ON DELETE SET NULL,
    CONSTRAINT fin_payments_bill_fk FOREIGN KEY (bill_id) REFERENCES "{{SCHEMA}}".fin_bills(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS fin_payments_inv_idx ON "{{SCHEMA}}".fin_payments (invoice_id);
CREATE INDEX IF NOT EXISTS fin_payments_bill_idx ON "{{SCHEMA}}".fin_payments (bill_id);
CREATE INDEX IF NOT EXISTS fin_payments_date_idx ON "{{SCHEMA}}".fin_payments (payment_date);

DROP TRIGGER IF EXISTS fin_accounts_updated_at ON "{{SCHEMA}}".fin_accounts;
CREATE TRIGGER fin_accounts_updated_at BEFORE UPDATE ON "{{SCHEMA}}".fin_accounts
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS fin_tax_codes_updated_at ON "{{SCHEMA}}".fin_tax_codes;
CREATE TRIGGER fin_tax_codes_updated_at BEFORE UPDATE ON "{{SCHEMA}}".fin_tax_codes
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS fin_bank_accounts_updated_at ON "{{SCHEMA}}".fin_bank_accounts;
CREATE TRIGGER fin_bank_accounts_updated_at BEFORE UPDATE ON "{{SCHEMA}}".fin_bank_accounts
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS fin_invoices_updated_at ON "{{SCHEMA}}".fin_invoices;
CREATE TRIGGER fin_invoices_updated_at BEFORE UPDATE ON "{{SCHEMA}}".fin_invoices
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS fin_bills_updated_at ON "{{SCHEMA}}".fin_bills;
CREATE TRIGGER fin_bills_updated_at BEFORE UPDATE ON "{{SCHEMA}}".fin_bills
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();

DROP TRIGGER IF EXISTS fin_payments_updated_at ON "{{SCHEMA}}".fin_payments;
CREATE TRIGGER fin_payments_updated_at BEFORE UPDATE ON "{{SCHEMA}}".fin_payments
    FOR EACH ROW EXECUTE FUNCTION "{{SCHEMA}}".set_updated_at();
