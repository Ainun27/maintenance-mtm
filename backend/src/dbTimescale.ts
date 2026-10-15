import { Pool, PoolClient } from "pg";
import { config } from "./config";

export interface TelemetryData {
  device_id: string;
  temperature?: number | null;
  humidity?: number | null;
  pressure?: number | null;
  status?: string | null;
  recorded_at?: Date | null;
  raw_payload?: Record<string, unknown> | null;
}

export class TimescaleManager {
  private pool: Pool | null = null;
  private connected = false;
  private isHypertableEnabled = false;

  constructor() {
    this.initPool();
  }

  private async ensureDatabaseExists(): Promise<void> {
    try {
      const adminPool = new Pool({
        host: config.timescale.host,
        port: config.timescale.port,
        database: "postgres",
        user: config.timescale.user,
        password: config.timescale.password,
        connectionTimeoutMillis: 4000,
      });

      const client = await adminPool.connect();
      try {
        const check = await client.query(
          "SELECT 1 FROM pg_database WHERE datname = $1",
          [config.timescale.database]
        );
        if (check.rowCount === 0) {
          console.log(`[Timescale] Membuat database '${config.timescale.database}'...`);
          await client.query(`CREATE DATABASE "${config.timescale.database}"`);
        }
      } finally {
        client.release();
        await adminPool.end();
      }
    } catch {
      // Abaikan jika tidak punya akses create db
    }
  }

  private async initPool(): Promise<void> {
    try {
      await this.ensureDatabaseExists();

      this.pool = new Pool({
        host: config.timescale.host,
        port: config.timescale.port,
        database: config.timescale.database,
        user: config.timescale.user,
        password: config.timescale.password,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      this.pool.on("error", (err) => {
        console.error("[Timescale Pool Error]:", err.message);
        this.connected = false;
      });

      await this.initSchema();
    } catch (error: any) {
      console.error("[Timescale] Gagal inisialisasi pool:", error.message);
      this.connected = false;
    }
  }

  private async initSchema(): Promise<void> {
    if (!this.pool) return;
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();

      // Buat tabel iot_telemetry untuk time-series data
      await client.query(`
        CREATE TABLE IF NOT EXISTS iot_telemetry (
            id BIGSERIAL,
            device_id VARCHAR(100) NOT NULL,
            temperature DOUBLE PRECISION,
            humidity DOUBLE PRECISION,
            pressure DOUBLE PRECISION,
            status VARCHAR(50),
            raw_payload JSONB,
            recorded_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, recorded_at)
        );
        CREATE INDEX IF NOT EXISTS idx_timescale_device_time 
        ON iot_telemetry (device_id, recorded_at DESC);
      `);

      // Coba aktifkan ekstensi timescaledb & buat hypertable jika didukung
      try {
        await client.query(`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`);
        await client.query(`
          SELECT create_hypertable('iot_telemetry', 'recorded_at', if_not_exists => TRUE);
        `);
        this.isHypertableEnabled = true;
        console.log("[Timescale] Hypertable TimescaleDB 'iot_telemetry' aktif!");
      } catch {
        this.isHypertableEnabled = false;
        console.log("[Timescale] Standard PostgreSQL time-series table 'iot_telemetry' aktif.");
      }

      this.connected = true;
    } catch (err: any) {
      console.error("[Timescale] Gagal inisialisasi schema:", err.message);
      this.connected = false;
    } finally {
      client?.release();
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public isHypertable(): boolean {
    return this.isHypertableEnabled;
  }

  public async insertTelemetry(data: TelemetryData): Promise<boolean> {
    if (!this.pool) {
      await this.initPool();
      if (!this.pool) return false;
    }

    const query = `
      INSERT INTO iot_telemetry 
      (device_id, temperature, humidity, pressure, status, recorded_at, raw_payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    const values = [
      data.device_id,
      data.temperature ?? null,
      data.humidity ?? null,
      data.pressure ?? null,
      data.status ?? "NORMAL",
      data.recorded_at ?? new Date(),
      data.raw_payload ? JSON.stringify(data.raw_payload) : null,
    ];

    try {
      await this.pool.query(query, values);
      this.connected = true;
      return true;
    } catch (error: any) {
      console.error("[Timescale] Insert error:", error.message);
      return false;
    }
  }

  public async getRecentTelemetry(limit = 20, deviceId?: string): Promise<any[]> {
    if (!this.pool) return [];
    try {
      let query = `
        SELECT id, device_id, temperature, humidity, pressure, status, recorded_at, created_at
        FROM iot_telemetry
      `;
      const values: any[] = [];

      if (deviceId) {
        query += ` WHERE device_id = $1 ORDER BY recorded_at DESC LIMIT $2`;
        values.push(deviceId, limit);
      } else {
        query += ` ORDER BY recorded_at DESC LIMIT $1`;
        values.push(limit);
      }

      const res = await this.pool.query(query, values);
      this.connected = true;
      return res.rows;
    } catch (err: any) {
      console.error("[Timescale] Query recent error:", err.message);
      return [];
    }
  }

  public async getStats(): Promise<{ totalRows: number; activeDevices: number }> {
    if (!this.pool) return { totalRows: 0, activeDevices: 0 };
    try {
      const res = await this.pool.query(`
        SELECT 
          COUNT(*)::int AS total_rows,
          COUNT(DISTINCT device_id)::int AS active_devices
        FROM iot_telemetry
      `);
      this.connected = true;
      return {
        totalRows: res.rows[0]?.total_rows || 0,
        activeDevices: res.rows[0]?.active_devices || 0,
      };
    } catch {
      return { totalRows: 0, activeDevices: 0 };
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
      console.log("[Timescale] Pool connection ditutup.");
    }
  }
}
