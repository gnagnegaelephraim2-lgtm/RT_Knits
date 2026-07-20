-- ============================================================
-- NITA — SUPABASE / POSTGRES DATABASE SCHEMA & INITIAL SEED DATA
-- Run this script in the Supabase SQL Editor.
-- ============================================================

-- Enable pgcrypto extension for random UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS work_order_feedback CASCADE;
DROP TABLE IF EXISTS message_log CASCADE;
DROP TABLE IF EXISTS conversation_state CASCADE;
DROP TABLE IF EXISTS work_order_technician CASCADE;
DROP TABLE IF EXISTS work_order CASCADE;
DROP TABLE IF EXISTS task_request CASCADE;
DROP TABLE IF EXISTS asset CASCADE;
DROP TABLE IF EXISTS technician CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;
DROP TABLE IF EXISTS department CASCADE;

-- ============================================================
-- 1. DEPARTMENT
-- ============================================================
CREATE TABLE department (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. APP USER
-- ============================================================
CREATE TABLE app_user (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES department(department_id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('operator', 'technician', 'coordinator', 'admin')),
    phone_number TEXT UNIQUE NOT NULL,
    pin_hash TEXT, -- Storing SHA-256 password hash securely
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. TECHNICIAN
-- ============================================================
CREATE TABLE technician (
    technician_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES app_user(user_id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    trade TEXT NOT NULL CHECK (trade IN ('mechanic', 'electrician', 'welder', 'plumber', 'hvac', 'general')),
    active BOOLEAN DEFAULT true,
    workload INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. ASSET
-- ============================================================
CREATE TABLE asset (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('in_use', 'down', 'maintenance', 'retired')),
    location TEXT NOT NULL,
    dept_id UUID REFERENCES department(department_id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    serial TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. TASK REQUEST
-- ============================================================
CREATE TABLE task_request (
    task_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES asset(asset_id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES app_user(user_id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('pending_approval', 'approved', 'rejected', 'in_progress', 'completed', 'deleted')),
    priority INTEGER NOT NULL CHECK (priority IN (0, 1, 2)), -- 0=Critical (P0), 1=Urgent (P1), 2=Non-urgent (P2)
    requested_at TIMESTAMPTZ DEFAULT now(),
    description TEXT NOT NULL,
    task_type TEXT NOT NULL DEFAULT 'repair',
    approved_by_user_id UUID REFERENCES app_user(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    media_urls TEXT[] DEFAULT '{}',
    planned_start_date DATE,
    planned_finish_date DATE,
    due_date DATE
);

-- ============================================================
-- 6. WORK ORDER
-- ============================================================
CREATE TABLE work_order (
    work_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_request_id UUID REFERENCES task_request(task_request_id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority INTEGER NOT NULL CHECK (priority IN (0, 1, 2)),
    scheduled_start TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_mins INTEGER DEFAULT 60,
    person_in_charge TEXT,
    person_in_charge2 TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. WORK ORDER TECHNICIAN (N:M Assignment Mapping)
-- ============================================================
CREATE TABLE work_order_technician (
    work_order_id UUID REFERENCES work_order(work_order_id) ON DELETE CASCADE,
    technician_id UUID REFERENCES technician(technician_id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    status TEXT NOT NULL CHECK (status IN ('assigned', 'accepted', 'declined')),
    PRIMARY KEY (work_order_id, technician_id)
);

-- ============================================================
-- 8. CONVERSATION STATE (WhatsApp Flow Router context)
-- ============================================================
CREATE TABLE conversation_state (
    phone_number TEXT PRIMARY KEY,
    state TEXT NOT NULL DEFAULT 'idle',
    last_context JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. MESSAGE LOG
-- ============================================================
CREATE TABLE message_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    message_direction TEXT NOT NULL CHECK (message_direction IN ('inbound', 'outbound')),
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'audio')),
    message_content TEXT NOT NULL,
    translated_content TEXT,
    meta_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. WORK ORDER FEEDBACK
-- ============================================================
CREATE TABLE work_order_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_order(work_order_id) ON DELETE CASCADE,
    rated_by_phone TEXT NOT NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('text', 'voice')),
    feedback_text TEXT NOT NULL,
    derived_sentiment TEXT CHECK (derived_sentiment IN ('positive', 'neutral', 'negative')),
    derived_rating INTEGER CHECK (derived_rating BETWEEN 1 AND 5),
    key_issues TEXT[] DEFAULT '{}',
    flagged_for_review BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PERFORMANCE OPTIMIZING INDEXES
-- ============================================================
CREATE INDEX idx_task_request_status ON task_request(status);
CREATE INDEX idx_asset_code ON asset(asset_code);
CREATE INDEX idx_user_phone ON app_user(phone_number);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables and define access rules.
-- The anon key allows read access; writes require authenticated users.
-- ============================================================

ALTER TABLE department ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_technician ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_feedback ENABLE ROW LEVEL SECURITY;

-- Read policies: authenticated users can read all rows
CREATE POLICY "dept_read" ON department FOR SELECT USING (true);
CREATE POLICY "user_read" ON app_user FOR SELECT USING (true);
CREATE POLICY "tech_read" ON technician FOR SELECT USING (true);
CREATE POLICY "asset_read" ON asset FOR SELECT USING (true);
CREATE POLICY "task_read" ON task_request FOR SELECT USING (true);
CREATE POLICY "wo_read" ON work_order FOR SELECT USING (true);
CREATE POLICY "wo_tech_read" ON work_order_technician FOR SELECT USING (true);
CREATE POLICY "conv_read" ON conversation_state FOR SELECT USING (true);
CREATE POLICY "msg_read" ON message_log FOR SELECT USING (true);
CREATE POLICY "feedback_read" ON work_order_feedback FOR SELECT USING (true);

-- Write policies: only authenticated users (service_role or authenticated role) can write (with public user signup allowed)
CREATE POLICY "user_insert" ON app_user FOR INSERT WITH CHECK (true);
CREATE POLICY "tech_insert" ON technician FOR INSERT WITH CHECK (true);

CREATE POLICY "task_insert" ON task_request FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "task_update" ON task_request FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "task_delete" ON task_request FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "wo_insert" ON work_order FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "wo_update" ON work_order FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "wo_delete" ON work_order FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "wo_tech_insert" ON work_order_technician FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "wo_tech_update" ON work_order_technician FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "wo_tech_delete" ON work_order_technician FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "conv_insert" ON conversation_state FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "conv_update" ON conversation_state FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "msg_insert" ON message_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "feedback_insert" ON work_order_feedback FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "feedback_update" ON work_order_feedback FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA SETS
-- ============================================================

-- Insert Departments
INSERT INTO department (department_id, name, location) VALUES
('f83b190a-dbca-49d7-84fe-19a9dcf18f29', 'Knitting Floor', 'Knitting Floor, Row 3'),
('d27a1921-9922-4a0b-8cf2-ab9964a2b91c', 'Cutting Department', 'Cutting Department, Row 1'),
('e12a95c9-ca5e-436e-bcfc-843de9c1629d', 'Engineering Division', 'Building B, Ground Floor'),
('a56c4d7f-22a0-47bf-b30f-b28098c4f9a0', 'Canteen & Admin Area', 'Main Administration Block'),
('b28c03e8-55fa-4c4f-9efd-a9121aef42f0', 'Central Stores', 'Warehouse Area, Row 2');

-- Insert App Users (PIN hashes: 1111 -> 0f7d0d088b6ea936fb20647c2e283cf26b63d82afe85eefc0da23d5635f7e61b, 2222 -> edee29f883e43b895b6c3c57ebaf746e382d5a3ef2c1598f86f345d2f6236b28, 1234 -> 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4)
INSERT INTO app_user (user_id, department_id, full_name, role, phone_number, pin_hash) VALUES
('aa3a190a-dbca-49d7-84fe-19a9dcf18f01', 'f83b190a-dbca-49d7-84fe-19a9dcf18f29', 'Priya Singh', 'operator', '+23052000101', '0f7d0d088b6ea936fb20647c2e283cf26b63d82afe85eefc0da23d5635f7e61b'),
('aa3a190a-dbca-49d7-84fe-19a9dcf18f02', 'e12a95c9-ca5e-436e-bcfc-843de9c1629d', 'Jean-Marc Rughoo', 'technician', '+23057551012', 'edee29f883e43b895b6c3c57ebaf746e382d5a3ef2c1598f86f345d2f6236b28'),
('aa3a190a-dbca-49d7-84fe-19a9dcf18f03', 'e12a95c9-ca5e-436e-bcfc-843de9c1629d', 'Nelson Fodjo', 'coordinator', '+23054737266', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');

-- Insert Technicians
INSERT INTO technician (technician_id, user_id, full_name, trade, active, workload) VALUES
('b03a190a-dbca-49d7-84fe-19a9dcf18f91', 'aa3a190a-dbca-49d7-84fe-19a9dcf18f02', 'Jean-Marc Rughoo', 'mechanic', true, 0);

-- Insert Assets
INSERT INTO asset (asset_id, asset_code, name, status, location, dept_id, type, serial) VALUES
('c03a190a-dbca-49d7-84fe-19a9dcf18fa1', '39', 'Circular Knitter — Brother CK-8', 'down', 'Knitting Floor, Row 3', 'f83b190a-dbca-49d7-84fe-19a9dcf18f29', 'Production Loom', 'SN-9983-CK'),
('c03a190a-dbca-49d7-84fe-19a9dcf18fa2', '175', 'Cutting Machine — Gerber Z1', 'in_use', 'Cutting Department, Row 1', 'd27a1921-9922-4a0b-8cf2-ab9964a2b91c', 'Gerber Precision', 'SN-8822-GZ'),
('c03a190a-dbca-49d7-84fe-19a9dcf18fa3', '42', 'Sewing Machine — Juki DDL-9000', 'in_use', 'Knitting Floor, Row 1', 'f83b190a-dbca-49d7-84fe-19a9dcf18f29', 'Utility Equipment', 'SN-1022-JK');
