-- ====================================================================
-- PT MENARA TERUS MAKMUR - ASTRA OTOPARTS GROUP
-- DATABASE SCHEMA: monitoring_db (State Management, CM, PM, PdM & Audit)
-- Mesin Jingduan Forging & Maintenance Operations Management
-- ====================================================================

-- 1. TABEL PENGGUNA & AUTENTIKASI: users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    npk VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    dept VARCHAR(100) DEFAULT 'Maintenance',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL STATUS PEMANTAUAN PERANGKAT TERKINI: device_monitoring
-- Menyimpan status snapshot terakhir per komponen mesin Jingduan Forging
CREATE TABLE IF NOT EXISTS device_monitoring (
    device_id VARCHAR(100) PRIMARY KEY,
    machine_id VARCHAR(50) DEFAULT 'JINGDUAN-FORGING-01',
    component_name VARCHAR(150),
    last_seen TIMESTAMPTZ NOT NULL,
    temperature DOUBLE PRECISION,
    vibration_rms DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    status VARCHAR(50) DEFAULT 'OPTIMAL',    -- 'OPTIMAL', 'WASPADA', 'PERIKSA', 'OFFLINE'
    total_messages BIGINT DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_monitoring_status 
ON device_monitoring (status, last_seen DESC);

-- 3. TABEL 6 TITIK KOMPONEN KRITIS PREDICTIVE MAINTENANCE: pdm_mpc_components
-- Model Predictive Control (MPC) Mesin Jingduan Forging
CREATE TABLE IF NOT EXISTS pdm_mpc_components (
    id SERIAL PRIMARY KEY,
    component_key VARCHAR(50) UNIQUE NOT NULL,
    component_name VARCHAR(150) NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    current_value DOUBLE PRECISION DEFAULT 0.0,
    baseline_value DOUBLE PRECISION NOT NULL,
    threshold_warning DOUBLE PRECISION NOT NULL,
    threshold_critical DOUBLE PRECISION NOT NULL,
    health_score DOUBLE PRECISION DEFAULT 100.0,
    status VARCHAR(50) DEFAULT 'OPTIMAL',    -- 'OPTIMAL', 'WASPADA', 'PERIKSA'
    last_diagnostic_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABEL PILAR 1: CORRECTIVE MAINTENANCE (CM) - TRIGGER: PRODUKSI
CREATE TABLE IF NOT EXISTS cm_tickets (
    id SERIAL PRIMARY KEY,
    ticket_no VARCHAR(50) UNIQUE NOT NULL,
    machine_id VARCHAR(50) DEFAULT 'JINGDUAN-FORGING-01',
    problem_title VARCHAR(200) NOT NULL,
    description TEXT,
    reported_by_npk VARCHAR(50) NOT NULL,
    reported_by_name VARCHAR(100),
    reporter_dept VARCHAR(100) DEFAULT 'Produksi Machining',
    priority VARCHAR(20) DEFAULT 'High',     -- 'Low', 'Medium', 'High', 'Urgent'
    status VARCHAR(30) DEFAULT 'waiting',    -- 'waiting', 'in_progress', 'resolved', 'closed'
    assigned_pic VARCHAR(100),
    mttr_target_minutes INT DEFAULT 30,
    response_time_minutes INT,
    actual_mttr_minutes INT,
    action_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cm_tickets_status 
ON cm_tickets (status, created_at DESC);

-- 5. TABEL PILAR 2: PREVENTIVE MAINTENANCE (PM) - TRIGGER: MAINTENANCE
CREATE TABLE IF NOT EXISTS pm_tasks (
    id SERIAL PRIMARY KEY,
    task_code VARCHAR(50) UNIQUE NOT NULL,
    machine_id VARCHAR(50) DEFAULT 'JINGDUAN-FORGING-01',
    part_name VARCHAR(150) NOT NULL,
    task_description TEXT NOT NULL,
    cycle_interval_type VARCHAR(50) DEFAULT 'Stroke', -- 'Stroke', 'Monthly', 'Hours'
    cycle_stroke_target INT DEFAULT 500,
    current_stroke INT DEFAULT 0,
    target_date DATE NOT NULL,
    pic_maintenance VARCHAR(100) NOT NULL,
    status VARCHAR(30) DEFAULT 'Mendatang',           -- 'Mendatang', 'Selesai', 'Overdue'
    completion_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_tasks_status 
ON pm_tasks (status, target_date ASC);

-- 6. TABEL MASTER JIG & FIXTURE CONTROL (TPM)
CREATE TABLE IF NOT EXISTS master_jigs (
    id SERIAL PRIMARY KEY,
    jig_code VARCHAR(100) UNIQUE NOT NULL,
    jig_name VARCHAR(200) NOT NULL,
    line_location VARCHAR(100) NOT NULL,
    current_cycles INT DEFAULT 0,
    max_cycles INT DEFAULT 500,
    rack_location VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Operating',           -- 'Operating', 'Standby', 'Maintenance'
    last_inspected_at DATE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABEL AUDIT LOG & AKTIVITAS SISTEM: system_monitoring_logs
CREATE TABLE IF NOT EXISTS system_monitoring_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(100),
    event_type VARCHAR(50) DEFAULT 'TELEMETRY_INGEST',
    severity VARCHAR(20) DEFAULT 'INFO',              -- 'INFO', 'WARN', 'ERROR', 'CRITICAL'
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monitoring_logs_device_time 
ON system_monitoring_logs (device_id, created_at DESC);

-- 8. TABEL RIWAYAT PERINGATAN: alert_notifications
CREATE TABLE IF NOT EXISTS alert_notifications (
    id BIGSERIAL PRIMARY KEY,
    alert_title VARCHAR(200) NOT NULL,
    alert_message TEXT NOT NULL,
    source_device VARCHAR(100),
    severity VARCHAR(20) DEFAULT 'WARNING',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- SEED DATA AWAL (PT Menara Terus Makmur - Mesin Jingduan Forging)
-- ====================================================================

-- Seed Akun Pengguna Resmi
INSERT INTO users (npk, username, display_name, role, password_hash, dept)
VALUES 
    ('MTM-001', 'admin', 'PIC Maintenance', 'Admin / PIC Maintenance', 'admin123', 'Maintenance Machining'),
    ('MTM-014', 'section_head', 'Section Head Machining', 'Section Head / Machining', 'admin123', 'Machining Division'),
    ('MTM-008', 'dept_head', 'Dept Head Production', 'Department Head / MTM', 'admin123', 'Production Department'),
    ('MTM-GUEST', 'guest_visitor', 'Guest Observer', 'Guest / Read-Only', 'admin123', 'Visitor')
ON CONFLICT (username) DO NOTHING;

-- Seed 6 Titik Komponen Kritis MPC Mesin Jingduan Forging
INSERT INTO pdm_mpc_components 
    (component_key, component_name, sensor_type, unit, current_value, baseline_value, threshold_warning, threshold_critical, health_score, status)
VALUES
    ('link_temp', 'Link Mechanism Temperature (#0)', 'Suhu (°C)', '°C', 38.2, 35.0, 50.0, 60.0, 99.4, 'OPTIMAL'),
    ('eccentric_r', 'Right Eccentric Bushing (#3)', 'Suhu (°C)', '°C', 48.5, 45.0, 55.0, 65.0, 99.1, 'OPTIMAL'),
    ('eccentric_l', 'Left Eccentric Bushing (#4)', 'Suhu (°C)', '°C', 47.1, 44.0, 55.0, 65.0, 99.3, 'OPTIMAL'),
    ('trans_bearing_r', 'Right Transmission Bearing (#5)', 'Suhu (°C)', '°C', 44.8, 42.0, 52.0, 62.0, 99.2, 'OPTIMAL'),
    ('trans_bearing_l', 'Left Transmission Bearing (#6)', 'Suhu (°C)', '°C', 43.6, 41.0, 52.0, 62.0, 99.5, 'OPTIMAL'),
    ('vibration_main', 'Main Crank & Slide Vibration (#1)', 'Getaran (RMS)', 'in/s', 0.045, 0.030, 0.075, 0.095, 98.8, 'OPTIMAL')
ON CONFLICT (component_key) DO NOTHING;

-- Seed Data Status Perangkat Real-time
INSERT INTO device_monitoring (device_id, component_name, last_seen, temperature, vibration_rms, status, total_messages)
VALUES
    ('link-temperature', 'Link Mechanism (#0)', CURRENT_TIMESTAMP, 38.2, NULL, 'OPTIMAL', 1240),
    ('right-eccentric-bush', 'Right Eccentric Bushing (#3)', CURRENT_TIMESTAMP, 48.5, NULL, 'OPTIMAL', 1240),
    ('left-eccentric-bush', 'Left Eccentric Bushing (#4)', CURRENT_TIMESTAMP, 47.1, NULL, 'OPTIMAL', 1240),
    ('right-transmission-bearing', 'Right Transmission Bearing (#5)', CURRENT_TIMESTAMP, 44.8, NULL, 'OPTIMAL', 1240),
    ('left-transmission-bearing', 'Left Transmission Bearing (#6)', CURRENT_TIMESTAMP, 43.6, NULL, 'OPTIMAL', 1240),
    ('vibration', 'Vibration Sensor (#1)', CURRENT_TIMESTAMP, NULL, 0.045, 'OPTIMAL', 1240)
ON CONFLICT (device_id) DO NOTHING;

-- Seed Tiket Corrective Maintenance (CM)
INSERT INTO cm_tickets (ticket_no, problem_title, description, reported_by_npk, reported_by_name, priority, status, assigned_pic, mttr_target_minutes, response_time_minutes)
VALUES
    ('CM-2026-001', 'Overheat Ringan Bushing Eksentrik Kanan', 'Sensor #3 mendeteksi kenaikan suhu mencapai 48.5°C, periksa jalur lubrikasi otomatis', 'MTM-PROD-02', 'Budi Santoso', 'High', 'waiting', 'Ahmad Fauzi', 30, 4),
    ('CM-2026-002', 'Tekanan Oli Hidrolik Penjepit Fluktuatif', 'Fluktuasi tekanan oli clamping pada unit hidrolik sekunder', 'MTM-PROD-05', 'Hendra Gunawan', 'Medium', 'in_progress', 'Rudi Hartono', 45, 3)
ON CONFLICT (ticket_no) DO NOTHING;

-- Seed Task Preventive Maintenance (PM)
INSERT INTO pm_tasks (task_code, part_name, task_description, cycle_stroke_target, current_stroke, target_date, pic_maintenance, status)
VALUES
    ('PM-JING-001', 'TXMACH-IZGSHFDR00', 'Kalibrasi Flatness Base Plate & Pelumasan Pin Guide', 500, 480, CURRENT_DATE + INTERVAL '1 day', 'Ahmad Fauzi', 'Mendatang'),
    ('PM-JING-002', 'TXMACH-WLDMIG02', 'Pembersihan Spatter & Pengencangan Clamping Arm', 1000, 120, CURRENT_DATE + INTERVAL '14 days', 'Siti Rahma', 'Mendatang'),
    ('PM-JING-003', 'TXMACH-STMPST01', 'Inspeksi Die Clearance & Penggantian Bushing Aus', 500, 350, CURRENT_DATE + INTERVAL '22 days', 'Bambang S.', 'Mendatang'),
    ('PM-JING-004', 'TXMACH-CNCML007', 'Penggantian Stopper Aus & Alignment Zero Point', 500, 495, CURRENT_DATE - INTERVAL '2 days', 'Rudi Hartono', 'Overdue')
ON CONFLICT (task_code) DO NOTHING;

-- Seed Master Jig & Fixture (TPM)
INSERT INTO master_jigs (jig_code, jig_name, line_location, current_cycles, max_cycles, rack_location, status, last_inspected_at)
VALUES
    ('TXMACH-IZGSHFDR00', 'Assy Drill Stem Line C', 'Machining Line C', 480, 500, 'Rak A-02', 'Operating', CURRENT_DATE - INTERVAL '5 days'),
    ('TXMACH-WLDMIG02', 'Jig Welding Sub-Frame B', 'Welding Line B', 120, 1000, 'Rak W-01', 'Operating', CURRENT_DATE - INTERVAL '12 days'),
    ('TXMACH-STMPST01', 'Jig Stamping Bracket LH', 'Stamping Line A', 350, 500, 'Rak S-04', 'Operating', CURRENT_DATE - INTERVAL '20 days'),
    ('TXMACH-ASSYCV03', 'Jig Assembly Cover RR', 'Assembly Line 1', 15, 500, 'Rak ASSY-01', 'Standby', CURRENT_DATE - INTERVAL '30 days'),
    ('TXMACH-CNCML007', 'Jig Milling Crankcase RH', 'CNC Machining', 495, 500, 'Rak C-05', 'Maintenance', CURRENT_DATE - INTERVAL '2 days')
ON CONFLICT (jig_code) DO NOTHING;

-- Seed Alert Notifications
INSERT INTO alert_notifications (alert_title, alert_message, source_device, severity)
VALUES
    ('Stroke Warning: TXMACH-IZGSHFDR00', 'Siklus telah mencapai 480/500 stroke. Jadwal Preventive Maintenance segera dieksekusi.', 'TXMACH-IZGSHFDR00', 'WARNING'),
    ('Pemeriksaan Prediktif MPC Optimal', 'Seluruh 6 sensor kritis Mesin Jingduan Forging beroperasi dalam toleransi optimal (Health Score 99.2%).', 'JINGDUAN-FORGING-01', 'INFO');
