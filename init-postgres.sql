-- Inisialisasi Tabel IoT Telemetry di PostgreSQL
CREATE TABLE IF NOT EXISTS iot_telemetry (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    status VARCHAR(50),
    raw_payload JSONB,
    recorded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indeks untuk pencarian cepat berdasarkan device dan rentang waktu
CREATE INDEX IF NOT EXISTS idx_telemetry_device_time 
ON iot_telemetry (device_id, created_at DESC);
