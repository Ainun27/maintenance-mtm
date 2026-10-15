import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Menjalankan Prisma Seed PT Menara Terus Makmur (MTM)...");

  // 1. Seed Pengguna & Hak Akses
  console.log("  -> Seeding Users...");
  const users = [
    {
      npk: "MTM-001",
      username: "admin",
      displayName: "PIC Maintenance",
      role: "Admin / PIC Maintenance",
      passwordHash: "admin123",
      dept: "Maintenance Machining",
    },
    {
      npk: "MTM-014",
      username: "section_head",
      displayName: "Section Head Machining",
      role: "Section Head / Machining",
      passwordHash: "admin123",
      dept: "Machining Division",
    },
    {
      npk: "MTM-008",
      username: "dept_head",
      displayName: "Dept Head Production",
      role: "Department Head / MTM",
      passwordHash: "admin123",
      dept: "Production Department",
    },
    {
      npk: "MTM-GUEST",
      username: "guest_visitor",
      displayName: "Guest Observer",
      role: "Guest / Read-Only",
      passwordHash: "admin123",
      dept: "Visitor",
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: u,
    });
  }

  // 2. Seed 6 Titik Komponen Kritis PdM MPC
  console.log("  -> Seeding 6 Titik Kritis PdM MPC Mesin Jingduan Forging...");
  const pdmComponents = [
    {
      componentKey: "link_temp",
      componentName: "Link Mechanism Temperature (#0)",
      sensorType: "Suhu (°C)",
      unit: "°C",
      currentValue: 38.2,
      baselineValue: 35.0,
      thresholdWarning: 50.0,
      thresholdCritical: 60.0,
      healthScore: 99.4,
      status: "OPTIMAL",
    },
    {
      componentKey: "eccentric_r",
      componentName: "Right Eccentric Bushing (#3)",
      sensorType: "Suhu (°C)",
      unit: "°C",
      currentValue: 48.5,
      baselineValue: 45.0,
      thresholdWarning: 55.0,
      thresholdCritical: 65.0,
      healthScore: 99.1,
      status: "OPTIMAL",
    },
    {
      componentKey: "eccentric_l",
      componentName: "Left Eccentric Bushing (#4)",
      sensorType: "Suhu (°C)",
      unit: "°C",
      currentValue: 47.1,
      baselineValue: 44.0,
      thresholdWarning: 55.0,
      thresholdCritical: 65.0,
      healthScore: 99.3,
      status: "OPTIMAL",
    },
    {
      componentKey: "trans_bearing_r",
      componentName: "Right Transmission Bearing (#5)",
      sensorType: "Suhu (°C)",
      unit: "°C",
      currentValue: 44.8,
      baselineValue: 42.0,
      thresholdWarning: 52.0,
      thresholdCritical: 62.0,
      healthScore: 99.2,
      status: "OPTIMAL",
    },
    {
      componentKey: "trans_bearing_l",
      componentName: "Left Transmission Bearing (#6)",
      sensorType: "Suhu (°C)",
      unit: "°C",
      currentValue: 43.6,
      baselineValue: 41.0,
      thresholdWarning: 52.0,
      thresholdCritical: 62.0,
      healthScore: 99.5,
      status: "OPTIMAL",
    },
    {
      componentKey: "vibration_main",
      componentName: "Main Crank & Slide Vibration (#1)",
      sensorType: "Getaran (RMS)",
      unit: "in/s",
      currentValue: 0.045,
      baselineValue: 0.030,
      thresholdWarning: 0.075,
      thresholdCritical: 0.095,
      healthScore: 98.8,
      status: "OPTIMAL",
    },
  ];

  for (const c of pdmComponents) {
    await prisma.pdmMpcComponent.upsert({
      where: { componentKey: c.componentKey },
      update: {},
      create: c,
    });
  }

  // 3. Seed Status Device Monitoring
  console.log("  -> Seeding Device Monitoring...");
  const devices = [
    {
      deviceId: "link-temperature",
      componentName: "Link Mechanism (#0)",
      temperature: 38.2,
      status: "OPTIMAL",
      totalMessages: BigInt(1240),
      lastSeen: new Date(),
    },
    {
      deviceId: "right-eccentric-bush",
      componentName: "Right Eccentric Bushing (#3)",
      temperature: 48.5,
      status: "OPTIMAL",
      totalMessages: BigInt(1240),
      lastSeen: new Date(),
    },
    {
      deviceId: "left-eccentric-bush",
      componentName: "Left Eccentric Bushing (#4)",
      temperature: 47.1,
      status: "OPTIMAL",
      totalMessages: BigInt(1240),
      lastSeen: new Date(),
    },
    {
      deviceId: "right-transmission-bearing",
      componentName: "Right Transmission Bearing (#5)",
      temperature: 44.8,
      status: "OPTIMAL",
      totalMessages: BigInt(1240),
      lastSeen: new Date(),
    },
    {
      deviceId: "left-transmission-bearing",
      componentName: "Left Transmission Bearing (#6)",
      temperature: 43.6,
      status: "OPTIMAL",
      totalMessages: BigInt(1240),
      lastSeen: new Date(),
    },
    {
      deviceId: "vibration",
      componentName: "Vibration Sensor (#1)",
      vibrationRms: 0.045,
      status: "OPTIMAL",
      totalMessages: BigInt(1240),
      lastSeen: new Date(),
    },
  ];

  for (const d of devices) {
    await prisma.deviceMonitoring.upsert({
      where: { deviceId: d.deviceId },
      update: {},
      create: d,
    });
  }

  // 4. Seed Pilar 1: CM Tickets
  console.log("  -> Seeding CM Tickets...");
  const cmTickets = [
    {
      ticketNo: "CM-2026-001",
      problemTitle: "Overheat Ringan Bushing Eksentrik Kanan",
      description: "Sensor #3 mendeteksi kenaikan suhu mencapai 48.5°C, periksa jalur lubrikasi otomatis",
      reportedByNpk: "MTM-PROD-02",
      reportedByName: "Budi Santoso",
      priority: "High",
      status: "waiting",
      assignedPic: "Ahmad Fauzi",
      mttrTargetMinutes: 30,
      responseTimeMinutes: 4,
    },
    {
      ticketNo: "CM-2026-002",
      problemTitle: "Tekanan Oli Hidrolik Penjepit Fluktuatif",
      description: "Fluktuasi tekanan oli clamping pada unit hidrolik sekunder",
      reportedByNpk: "MTM-PROD-05",
      reportedByName: "Hendra Gunawan",
      priority: "Medium",
      status: "in_progress",
      assignedPic: "Rudi Hartono",
      mttrTargetMinutes: 45,
      responseTimeMinutes: 3,
    },
  ];

  for (const cm of cmTickets) {
    await prisma.cmTicket.upsert({
      where: { ticketNo: cm.ticketNo },
      update: {},
      create: cm,
    });
  }

  // 5. Seed Pilar 2: PM Tasks
  console.log("  -> Seeding PM Tasks...");
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const plus14d = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const plus22d = new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000);
  const minus2d = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const pmTasks = [
    {
      taskCode: "PM-JING-001",
      partName: "TXMACH-IZGSHFDR00",
      taskDescription: "Kalibrasi Flatness Base Plate & Pelumasan Pin Guide",
      cycleStrokeTarget: 500,
      currentStroke: 480,
      targetDate: tomorrow,
      picMaintenance: "Ahmad Fauzi",
      status: "Mendatang",
    },
    {
      taskCode: "PM-JING-002",
      partName: "TXMACH-WLDMIG02",
      taskDescription: "Pembersihan Spatter & Pengencangan Clamping Arm",
      cycleStrokeTarget: 1000,
      currentStroke: 120,
      targetDate: plus14d,
      picMaintenance: "Siti Rahma",
      status: "Mendatang",
    },
    {
      taskCode: "PM-JING-003",
      partName: "TXMACH-STMPST01",
      taskDescription: "Inspeksi Die Clearance & Penggantian Bushing Aus",
      cycleStrokeTarget: 500,
      currentStroke: 350,
      targetDate: plus22d,
      picMaintenance: "Bambang S.",
      status: "Mendatang",
    },
    {
      taskCode: "PM-JING-004",
      partName: "TXMACH-CNCML007",
      taskDescription: "Penggantian Stopper Aus & Alignment Zero Point",
      cycleStrokeTarget: 500,
      currentStroke: 495,
      targetDate: minus2d,
      picMaintenance: "Rudi Hartono",
      status: "Overdue",
    },
  ];

  for (const pm of pmTasks) {
    await prisma.pmTask.upsert({
      where: { taskCode: pm.taskCode },
      update: {},
      create: pm,
    });
  }

  // 6. Seed Master Jigs (TPM)
  console.log("  -> Seeding Master Jigs...");
  const masterJigs = [
    {
      jigCode: "TXMACH-IZGSHFDR00",
      jigName: "Assy Drill Stem Line C",
      lineLocation: "Machining Line C",
      currentCycles: 480,
      maxCycles: 500,
      rackLocation: "Rak A-02",
      status: "Operating",
      lastInspectedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      jigCode: "TXMACH-WLDMIG02",
      jigName: "Jig Welding Sub-Frame B",
      lineLocation: "Welding Line B",
      currentCycles: 120,
      maxCycles: 1000,
      rackLocation: "Rak W-01",
      status: "Operating",
      lastInspectedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
    },
    {
      jigCode: "TXMACH-STMPST01",
      jigName: "Jig Stamping Bracket LH",
      lineLocation: "Stamping Line A",
      currentCycles: 350,
      maxCycles: 500,
      rackLocation: "Rak S-04",
      status: "Operating",
      lastInspectedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    },
    {
      jigCode: "TXMACH-ASSYCV03",
      jigName: "Jig Assembly Cover RR",
      lineLocation: "Assembly Line 1",
      currentCycles: 15,
      maxCycles: 500,
      rackLocation: "Rak ASSY-01",
      status: "Standby",
      lastInspectedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      jigCode: "TXMACH-CNCML007",
      jigName: "Jig Milling Crankcase RH",
      lineLocation: "CNC Machining",
      currentCycles: 495,
      maxCycles: 500,
      rackLocation: "Rak C-05",
      status: "Maintenance",
      lastInspectedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const jig of masterJigs) {
    await prisma.masterJig.upsert({
      where: { jigCode: jig.jigCode },
      update: {},
      create: jig,
    });
  }

  // 7. Seed Initial Telemetry
  console.log("  -> Seeding Initial Telemetry Records...");
  const telemetrySample = [
    {
      deviceId: "link-temperature",
      temperature: 36.5,
      status: "NORMAL",
      rawPayload: { PV: 36.5, DP: 0 },
      recordedAt: new Date(now.getTime() - 5 * 60 * 1000),
    },
    {
      deviceId: "right-eccentric-bush",
      temperature: 48.2,
      status: "NORMAL",
      rawPayload: { PV: 48.2, DP: 0 },
      recordedAt: new Date(now.getTime() - 4 * 60 * 1000),
    },
    {
      deviceId: "left-eccentric-bush",
      temperature: 46.8,
      status: "NORMAL",
      rawPayload: { PV: 46.8, DP: 0 },
      recordedAt: new Date(now.getTime() - 3 * 60 * 1000),
    },
    {
      deviceId: "right-transmission-bearing",
      temperature: 44.1,
      status: "NORMAL",
      rawPayload: { PV: 44.1, DP: 0 },
      recordedAt: new Date(now.getTime() - 2 * 60 * 1000),
    },
    {
      deviceId: "left-transmission-bearing",
      temperature: 43.5,
      status: "NORMAL",
      rawPayload: { PV: 43.5, DP: 0 },
      recordedAt: new Date(now.getTime() - 1 * 60 * 1000),
    },
    {
      deviceId: "vibration",
      vibrationRms: 0.042,
      status: "NORMAL",
      rawPayload: { Z_RMS_Vel_in: 0.042 },
      recordedAt: now,
    },
  ];

  for (const t of telemetrySample) {
    await prisma.iotTelemetry.create({
      data: t,
    });
  }

  // 8. Seed Alert Notifications
  console.log("  -> Seeding Alert Notifications...");
  await prisma.alertNotification.createMany({
    data: [
      {
        alertTitle: "Stroke Warning: TXMACH-IZGSHFDR00",
        alertMessage: "Siklus telah mencapai 480/500 stroke. Jadwal Preventive Maintenance segera dieksekusi.",
        sourceDevice: "TXMACH-IZGSHFDR00",
        severity: "WARNING",
      },
      {
        alertTitle: "Pemeriksaan Prediktif MPC Optimal",
        alertMessage: "Seluruh 6 sensor kritis Mesin Jingduan Forging beroperasi dalam toleransi optimal (Health Score 99.2%).",
        sourceDevice: "JINGDUAN-FORGING-01",
        severity: "INFO",
      },
    ],
  });

  console.log("✅ Prisma Seeding Selesai Berhasil!");
}

main()
  .catch((e) => {
    console.error("❌ Error saat Prisma Seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
