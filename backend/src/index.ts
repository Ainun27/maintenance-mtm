import express from "express";
import cors from "cors";
import path from "path";
import { config } from "./config";
import { MqttSubscriberService } from "./subscriber";

const app = express();
app.use(cors());
app.use(express.json());

// Serve Frontend Static Files
const frontendPath = path.resolve(__dirname, "../../frontend");
app.use(express.static(frontendPath));

// Inisialisasi Service MQTT
const subscriberService = new MqttSubscriberService();
subscriberService.start();

// ==========================================
// REST API ENDPOINTS UNTUK FRONTEND
// ==========================================

// 1. Status Kesehatan & Konektivitas
app.get("/api/health", async (req, res) => {
  const timescaleConnected = subscriberService.timescaleManager
    ? subscriberService.timescaleManager.isConnected()
    : false;
  const isHypertable = subscriberService.timescaleManager
    ? subscriberService.timescaleManager.isHypertable()
    : false;
  const monitoringConnected = subscriberService.monitoringManager
    ? subscriberService.monitoringManager.isConnected()
    : false;

  const mqttDetails = subscriberService.getMqttDetails();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    connections: {
      mqtt: mqttDetails,
      timescale: {
        enabled: config.timescale.enabled,
        connected: timescaleConnected,
        database: config.timescale.database,
        host: `${config.timescale.host}:${config.timescale.port}`,
        hypertable: isHypertable,
      },
      monitoring: {
        enabled: config.monitoring.enabled,
        connected: monitoringConnected,
        database: config.monitoring.database,
        host: `${config.monitoring.host}:${config.monitoring.port}`,
      },
    },
  });
});

// Helper: Pastikan hanya data Mesin Jingduan Forging yang diloloskan
const isJingduan = (id: string = "") => {
  const s = String(id || "").toLowerCase();
  return (
    s.includes("jingduan") ||
    s.includes("eccentric") ||
    s.includes("bearing") ||
    s.includes("link-temperature") ||
    s.includes("vibration")
  );
};

// 2. Data Terbaru per Device (Live Cache + Fallback Database) - EKSKLUSIF JINGDUAN
app.get("/api/devices", async (req, res) => {
  // Ambil data real-time live dari memori subscriber MQTT
  const liveDevices = subscriberService.getLiveDevices().filter((d) => isJingduan(d.device_id));

  if (liveDevices.length > 0) {
    return res.json(liveDevices);
  }

  // Jika live cache masih kosong (misal baru start), baca dari Monitoring DB
  if (subscriberService.monitoringManager && subscriberService.monitoringManager.isConnected()) {
    try {
      const dbDevices = await subscriberService.monitoringManager.getLatestPerDevice();
      const filteredDb = (dbDevices || []).filter((d: any) => isJingduan(d.device_id));
      if (filteredDb.length > 0) return res.json(filteredDb);
    } catch {}
  }

  // Fallback ke Timescale jika belum ada data di monitoring
  if (subscriberService.timescaleManager && subscriberService.timescaleManager.isConnected()) {
    try {
      const fallback = await subscriberService.timescaleManager.getRecentTelemetry(20);
      const filteredFallback = (fallback || []).filter((d: any) => isJingduan(d.device_id));
      if (filteredFallback.length > 0) return res.json(filteredFallback);
    } catch {}
  }

  res.json([]);
});

// 3. Detail Lengkap Koneksi & Ingestion MQTT
app.get("/api/mqtt-info", (req, res) => {
  res.json(subscriberService.getMqttDetails());
});

// 4. Riwayat Telemetri dari PostgreSQL Timescale - EKSKLUSIF JINGDUAN
app.get("/api/telemetry", async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 1000);
  const deviceId = req.query.device as string | undefined;
  const shift = req.query.shift as string | undefined;
  const date = req.query.date as string | undefined;

  if (subscriberService.timescaleManager && subscriberService.timescaleManager.isConnected()) {
    try {
      const data = await subscriberService.timescaleManager.getRecentTelemetry(limit, deviceId, shift, date);
      const filtered = (data || []).filter((r: any) => isJingduan(r.device_id));
      if (filtered.length > 0) return res.json(filtered);
    } catch {}
  }

  // Fallback 1: Ambil dari riwayat in-memory telemetry subscriber MQTT
  const inMemory = subscriberService.getRecentTelemetryHistory(limit, deviceId).filter((r) => isJingduan(r.device_id));
  if (inMemory.length > 0) {
    return res.json(inMemory);
  }

  // Fallback 2: Jika DB offline/belum sinkron, tampilkan snapshot perangkat live di tabel riwayat
  const live = subscriberService.getLiveDevices().filter((d) => isJingduan(d.device_id));
  const fallbackRows = live.map((d, idx) => ({
    id: idx + 1,
    device_id: d.device_id,
    temperature: d.temperature,
    humidity: d.humidity,
    pressure: d.pressure,
    status: d.status,
    raw_payload: d.raw_payload,
    created_at: d.recorded_at,
  }));
  res.json(fallbackRows);
});

// 4B. Riwayat Telemetri Terkelompok Per Shift - Tidak Hilang Saat Pergantian Shift
app.get("/api/telemetry/shifts", async (req, res) => {
  const date = (req.query.date as string) || undefined;
  if (subscriberService.timescaleManager && subscriberService.timescaleManager.isConnected()) {
    try {
      const data = await subscriberService.timescaleManager.getShiftTelemetry(date);
      if (data) return res.json(data);
    } catch (err: any) {
      console.error("[API] getShiftTelemetry error:", err.message);
    }
  }

  // Fallback ke in-memory subscriber buffers
  const fallback = subscriberService.getShiftTelemetry(date);
  res.json(fallback);
});

// 5. Log Real-time Ingestion - EKSKLUSIF JINGDUAN
app.get("/api/logs", (req, res) => {
  const logs = subscriberService.getRecentLogs().filter((l) => isJingduan(l.deviceId) || isJingduan(l.topic));
  res.json(logs);
});

// 6. Statistik Database (Khusus Mesin Jingduan Forging)
app.get("/api/stats", async (req, res) => {
  let totalRows = 0;
  let activeDevices = subscriberService.getLiveDevices().filter((d) => isJingduan(d.device_id)).length;
  let totalAlerts = 0;

  if (subscriberService.timescaleManager) {
    const tStats = await subscriberService.timescaleManager.getStats();
    totalRows = tStats.totalRows;
    if (tStats.activeDevices > activeDevices && tStats.activeDevices <= 6) {
      activeDevices = tStats.activeDevices;
    }
  }

  if (subscriberService.monitoringManager) {
    const mStats = await subscriberService.monitoringManager.getStats();
    totalAlerts = mStats.totalAlerts;
  }

  res.json({
    totalRows,
    activeDevices,
    totalAlerts,
    totalMqttMessages: subscriberService.getMqttDetails().totalMessagesReceived,
  });
});

// Fallback route to frontend index.html for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Jalankan Server HTTP
const server = app.listen(config.server.port, () => {
  console.log(`[Server] Dashboard & API berjalan pada http://localhost:${config.server.port}`);
});

// Tangani shutdown graceful
const shutdown = async () => {
  console.log("\n[Shutdown] Mematikan server...");
  server.close();
  await subscriberService.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
