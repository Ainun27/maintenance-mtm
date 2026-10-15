-- ====================================================================
-- PT MENARA TERUS MAKMUR - ASTRA OTOPARTS GROUP
-- DATABASE SCHEMA: timescale_db (Time-Series & Telemetry Storage)
-- Mesin Jingduan Forging - High-Frequency IoT Telemetry Data
-- ====================================================================

-- 1. Pastikan Ekstensi TimescaleDB aktif jika tersedia
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb'
    ) THEN
        CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
    END IF;
END $$;

-- 2. TABEL UTAMA: iot_telemetry (Hypertable Time-Series)
-- Menyimpan seluruh pembacaan sensor mesin Jingduan Forging secara real-time
CREATE TABLE IF NOT EXISTS iot_telemetry (
    id BIGSERIAL,
    device_id VARCHAR(100) NOT NULL,
    machine_id VARCHAR(50) DEFAULT 'JINGDUAN-FORGING-01',
    temperature DOUBLE PRECISION,
    vibration_rms DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    status VARCHAR(50) DEFAULT 'NORMAL',
    raw_payload JSONB,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (recorded_at, id)
);

-- Indeks komposit performa tinggi untuk pencarian filter per sensor & waktu
CREATE INDEX IF NOT EXISTS idx_telemetry_device_time 
ON iot_telemetry (device_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_status_time 
ON iot_telemetry (status, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_machine_time 
ON iot_telemetry (machine_id, recorded_at DESC);

-- Indeks JSONB GIN untuk query payload fleksibel
CREATE INDEX IF NOT EXISTS idx_telemetry_payload_gin 
ON iot_telemetry USING GIN (raw_payload);

-- 3. Konversi ke Hypertable TimescaleDB (Chunk interval: 1 Hari)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
    ) THEN
        PERFORM create_hypertable(
            'iot_telemetry', 
            'recorded_at', 
            chunk_time_interval => INTERVAL '1 day',
            if_not_exists => TRUE
        );
    END IF;
END $$;

-- 4. TABEL AGREGASI PER JAM: telemetry_hourly_summary
-- Digunakan untuk query dashboard analitik grafik jangka menengah tanpa scan jutaan row
CREATE TABLE IF NOT EXISTS telemetry_hourly_summary (
    bucket TIMESTAMPTZ NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    machine_id VARCHAR(50) DEFAULT 'JINGDUAN-FORGING-01',
    avg_temperature DOUBLE PRECISION,
    max_temperature DOUBLE PRECISION,
    min_temperature DOUBLE PRECISION,
    avg_vibration DOUBLE PRECISION,
    max_vibration DOUBLE PRECISION,
    sample_count INT DEFAULT 1,
    PRIMARY KEY (bucket, device_id)
);

CREATE INDEX IF NOT EXISTS idx_hourly_summary_device_bucket 
ON telemetry_hourly_summary (device_id, bucket DESC);

-- 5. TABEL CATATAN ANOMALI SENSOR: sensor_anomaly_records
-- Menyimpan rekaman saat model MPC / threshold mendeteksi kondisi abnormal
CREATE TABLE IF NOT EXISTS sensor_anomaly_records (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    machine_id VARCHAR(50) DEFAULT 'JINGDUAN-FORGING-01',
    metric_type VARCHAR(50) NOT NULL,         -- 'TEMPERATURE', 'VIBRATION', 'PRESSURE'
    detected_value DOUBLE PRECISION NOT NULL,
    threshold_limit DOUBLE PRECISION NOT NULL,
    severity VARCHAR(20) DEFAULT 'WARNING',   -- 'WARNING', 'CRITICAL'
    description TEXT,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_anomaly_device_time 
ON sensor_anomaly_records (device_id, recorded_at DESC);

-- 6. KEBIJAKAN OTOMATIS TIMESCALEDB (Jika Didukung)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
    ) THEN
        -- Aktifkan kompresi otomatis untuk chunk data lebih lama dari 7 hari
        BEGIN
            ALTER TABLE iot_telemetry SET (
                timescaledb.compress,
                timescaledb.compress_segmentby = 'device_id, machine_id',
                timescaledb.compress_orderby = 'recorded_at DESC'
            );
            PERFORM add_compression_policy('iot_telemetry', INTERVAL '7 days', if_not_exists => TRUE);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Kebijakan kompresi dilewati atau sudah ada: %', SQLERRM;
        END;

        -- Kebijakan retensi: simpan data raw mentah selama 90 hari
        BEGIN
            PERFORM add_retention_policy('iot_telemetry', INTERVAL '90 days', if_not_exists => TRUE);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Kebijakan retensi dilewati atau sudah ada: %', SQLERRM;
        END;
    END IF;
END $$;

-- 7. SEED DATA AWAL: Baseline Snapshot Sensor Jingduan Forging
INSERT INTO iot_telemetry (device_id, machine_id, temperature, vibration_rms, status, recorded_at, raw_payload)
VALUES 
    ('link-temperature', 'JINGDUAN-FORGING-01', 36.5, NULL, 'NORMAL', CURRENT_TIMESTAMP - INTERVAL '5 minutes', '{"PV": 36.5, "DP": 0}'::jsonb),
    ('right-eccentric-bush', 'JINGDUAN-FORGING-01', 48.2, NULL, 'NORMAL', CURRENT_TIMESTAMP - INTERVAL '4 minutes', '{"PV": 48.2, "DP": 0}'::jsonb),
    ('left-eccentric-bush', 'JINGDUAN-FORGING-01', 46.8, NULL, 'NORMAL', CURRENT_TIMESTAMP - INTERVAL '3 minutes', '{"PV": 46.8, "DP": 0}'::jsonb),
    ('right-transmission-bearing', 'JINGDUAN-FORGING-01', 44.1, NULL, 'NORMAL', CURRENT_TIMESTAMP - INTERVAL '2 minutes', '{"PV": 44.1, "DP": 0}'::jsonb),
    ('left-transmission-bearing', 'JINGDUAN-FORGING-01', 43.5, NULL, 'NORMAL', CURRENT_TIMESTAMP - INTERVAL '1 minute', '{"PV": 43.5, "DP": 0}'::jsonb),
    ('vibration', 'JINGDUAN-FORGING-01', NULL, 0.042, 'NORMAL', CURRENT_TIMESTAMP, '{"Z_RMS_Vel_in": 0.042}'::jsonb)
ON CONFLICT DO NOTHING;
