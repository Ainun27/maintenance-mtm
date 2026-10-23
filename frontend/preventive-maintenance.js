/**
 * ============================================================================
 * PREVENTIVE MAINTENANCE (PM) & MACHINE ACCURACY MODULE
 * PT Menara Terus Makmur (Astra Otoparts Group)
 * 
 * 5 Sub-Modul Terintegrasi:
 * 1. Dashboard PM & Accuracy (Executive Overview)
 * 2. Preventive Maintenance (PM Schedule Calendar, Achievement, Condition, Overdue)
 * 3. Machine Accuracy Check (Schedule, Monitoring, Overdue, Parameter Trend)
 * 4. Abnormality & Breakdown (Top Ranking, Breakdown Trend, PICA 5-Why)
 * 5. Overhaul Schedule (Project Tracking, Scope of Work, Support Planning)
 * ============================================================================
 */

// Global State PM
let pmConditionFilter = "all";
let pmAccuracyFilter = "all";
let pmSelectedCalendarDay = 22; // Hari aktif default Oktober 2026

// ========================================================
// 1. DATA MASTER PREVENTIVE MAINTENANCE (90 MESIN GROUNDED)
// ========================================================

const PM_DATA = {
  kpi: {
    plan: 420,
    done: 403,
    achievement: 96,
    overdue: 17,
    totalMachines: 90,
    normal: 72,
    attention: 14,
    abnormal: 4,
    availability: {
      target: 90.0,
      actual: 94.5,
      mtbfHours: 418,
      downtimeHours: 12.5
    },
    accuracy: {
      plan: 90,
      done: 86,
      notYet: 4,
      achievement: 95.0,
      compliance: 97.0
    }
  },

  // Pencapaian PM Berdasarkan Jenis Mesin
  achievementByMachineType: [
    { type: "CNC Milling / Machining Center", icon: "⚙️", count: 48, plan: 140, done: 135, overdue: 5, achievement: 96.4, compliance: 97.5, status: "Good" },
    { type: "CNC Lathe (Bubut CNC)", icon: "🔄", count: 10, plan: 110, done: 106, overdue: 4, achievement: 96.3, compliance: 96.8, status: "Good" },
    { type: "Forging Press (Hot & Warm)", icon: "⚡", count: 20, plan: 60, done: 58, overdue: 2, achievement: 96.7, compliance: 98.0, status: "Good" },
    { type: "Stamping Press Line", icon: "🏗️", count: 8, plan: 50, done: 48, overdue: 2, achievement: 96.0, compliance: 97.2, status: "Good" },
    { type: "Broaching Machine", icon: "📐", count: 4, plan: 30, done: 28, overdue: 2, achievement: 93.3, compliance: 94.2, status: "Attention" },
    { type: "Washing & Shot Blast Finishing", icon: "🌊", count: 0, plan: 30, done: 28, overdue: 2, achievement: 93.3, compliance: 95.0, status: "Good" }
  ],

  // 17 Overdue PM Tasks (Rinci dengan hari keterlambatan)
  overdueTasks: [
    { no: 1, machineCode: "MC-HRT-004", machineName: "Hartford 1100 Vertical Machining #4", line: "Machining Line B", type: "CNC Milling", inspectionItem: "Inspeksi Spindle Runout & Pelumasan ATC Arm", dueDate: "2026-10-10", delayDays: 12, pic: "Ahmad Fauzi", actionPlan: "Tunggu kedatangan tool kalibrasi dial 0.001mm" },
    { no: 2, machineCode: "MC-OKM-003", machineName: "Okuma LB3000 CNC Lathe #3", line: "Machining Line C", type: "CNC Lathe", inspectionItem: "Pemeriksaan Backlash Axis-X & Re-shim Ballscrew", dueDate: "2026-10-12", delayDays: 10, pic: "Rudi Hartono", actionPlan: "Dijadwalkan saat changeover shift 3" },
    { no: 3, machineCode: "PR-JGD-002", machineName: "Jingduan Forging Press 630T #2", line: "Forging Line 2", type: "Forging Press", inspectionItem: "Flushing & Penggantian Filter Hidrolik Utama", dueDate: "2026-10-14", delayDays: 8, pic: "Bambang S.", actionPlan: "Spare part filter tiba 23 Okt 2026" },
    { no: 4, machineCode: "BR-NCH-001", machineName: "Nachi Vertical Broaching #1", line: "Broaching Line 1", type: "Broaching", inspectionItem: "Pemeriksaan Play Slide Guide & Clamping Fixture", dueDate: "2026-10-14", delayDays: 8, pic: "Hendra Wijaya", actionPlan: "Masuk antrean persiapan Overhaul" },
    { no: 5, machineCode: "MC-MZK-007", machineName: "Mazak VCN-530C Machining #7", line: "Machining Line A", type: "CNC Milling", inspectionItem: "Kalibrasi Tool Setter & Optical Touch Probe", dueDate: "2026-10-15", delayDays: 7, pic: "Ahmad Fauzi", actionPlan: "Koordinasi dengan tim Metrologi QA" },
    { no: 6, machineCode: "MC-DSN-011", machineName: "Doosan DNM-5700 Machining #11", line: "Machining Line D", type: "CNC Milling", inspectionItem: "Inspeksi Tekanan Pneumatik Chuck & Solenoid Valve", dueDate: "2026-10-16", delayDays: 6, pic: "Siti Rahma", actionPlan: "Sedang pengerjaan shift 2" },
    { no: 7, machineCode: "MC-FNC-005", machineName: "Fanuc Robodrill α-D21LiB #5", line: "Machining Line E", type: "CNC Milling", inspectionItem: "Pembersihan Chip Conveyor & Pemeriksaan Belt Spindle", dueDate: "2026-10-17", delayDays: 5, pic: "Rian Hidayat", actionPlan: "Pemberhentian mesin dijadwalkan Minggu" },
    { no: 8, machineCode: "MC-TKW-002", machineName: "Takisawa TMM-250 CNC Lathe #2", line: "Machining Line C", type: "CNC Lathe", inspectionItem: "Penggantian Wiper Way & Grease Guideway", dueDate: "2026-10-17", delayDays: 5, pic: "Rudi Hartono", actionPlan: "Menunggu material wiper PTFE" },
    { no: 9, machineCode: "PR-AID-003", machineName: "Aida 1000T Warm Forging #3", line: "Forging Line 1", type: "Forging Press", inspectionItem: "Pemeriksaan Kebocoran Seal Cylinder Die Cushion", dueDate: "2026-10-18", delayDays: 4, pic: "Bambang S.", actionPlan: "PICA issue hydraulic leak aktif" },
    { no: 10, machineCode: "PR-KMT-001", machineName: "Komatsu OBS-200 Stamping #1", line: "Stamping Line A", type: "Stamping Press", inspectionItem: "Inspeksi Ketebalan Brake Lining & Air Clutch", dueDate: "2026-10-18", delayDays: 4, pic: "Dedi Supriyadi", actionPlan: "Jadwal inspection maintenance shift 1" },
    { no: 11, machineCode: "BR-NCH-003", machineName: "Nachi Vertical Broaching #3", line: "Broaching Line 2", type: "Broaching", inspectionItem: "Pemeriksaan Flow Coolant Cutting & Nozzle Jet", dueDate: "2026-10-19", delayDays: 3, pic: "Hendra Wijaya", actionPlan: "Flushing tangki coolant akhir pekan" },
    { no: 12, machineCode: "MC-HRT-008", machineName: "Hartford 1100 Vertical Machining #8", line: "Machining Line B", type: "CNC Milling", inspectionItem: "Pemeriksaan Level Oli Chiller Spindle", dueDate: "2026-10-19", delayDays: 3, pic: "Ahmad Fauzi", actionPlan: "Re-fill oli R22 ISO VG 32" },
    { no: 13, machineCode: "MC-OKM-005", machineName: "Okuma LB3000 CNC Lathe #5", line: "Machining Line C", type: "CNC Lathe", inspectionItem: "Inspeksi Akurasi Turret Alignment Zero Point", dueDate: "2026-10-19", delayDays: 3, pic: "Rudi Hartono", actionPlan: "Tool setting ulang setelah changeover" },
    { no: 14, machineCode: "PR-WSN-002", machineName: "Wasino 150T Precision Stamping #2", line: "Stamping Line B", type: "Stamping Press", inspectionItem: "Inspeksi Die Height Adjustment Mechanism", dueDate: "2026-10-20", delayDays: 2, pic: "Dedi Supriyadi", actionPlan: "Greasing worm gear housing" },
    { no: 15, machineCode: "WS-BLS-001", machineName: "Shot Blasting Roto-Finish #1", line: "Finishing Line", type: "Finishing", inspectionItem: "Penggantian Impeller Blade & Blade Liner", dueDate: "2026-10-20", delayDays: 2, pic: "Eko Prasetyo", actionPlan: "Part impeller sudah di gudang" },
    { no: 16, machineCode: "WS-WSH-002", machineName: "Ultrasonic Industrial Washer #2", line: "Finishing Line", type: "Finishing", inspectionItem: "Pembersihan Transducer & Heater Element", dueDate: "2026-10-20", delayDays: 2, pic: "Eko Prasetyo", actionPlan: "Drain chemical sabtu pagi" },
    { no: 17, machineCode: "MC-TKW-004", machineName: "Takisawa TMM-250 CNC Lathe #4", line: "Machining Line C", type: "CNC Lathe", inspectionItem: "Pengecekan Kebisingan Bearing Tailstock", dueDate: "2026-10-21", delayDays: 1, pic: "Rudi Hartono", actionPlan: "Grease repacking tailstock" }
  ],

  // 90 Mesin Kondisi Real-Time (72 Normal, 14 Attention, 4 Abnormal)
  machines: [],

  // Top Abnormality Ranking
  topAbnormality: [
    { rank: 1, problem: "Hydraulic Leak / Fitting Rembes", category: "Hidrolik & Seal", cases: 34, percentage: 26.2, dominantLine: "Forging & Stamping", pic: "Bambang S.", trend: "+2 kasus" },
    { rank: 2, problem: "Spindle Vibration & Abnormal Noise", category: "Mekanikal Spindle", cases: 26, percentage: 20.0, dominantLine: "Machining Line A/B", pic: "Ahmad Fauzi", trend: "-4 kasus" },
    { rank: 3, problem: "ATC Tool Clamping / Arm Jammed", category: "Pneumatik & ATC", cases: 21, percentage: 16.2, dominantLine: "CNC Milling", pic: "Siti Rahma", trend: "Stabil" },
    { rank: 4, problem: "Lubrication Oil Pressure Drop", category: "Pelumasan Otomatis", cases: 19, percentage: 14.6, dominantLine: "Machining & Broach", pic: "Rudi Hartono", trend: "-2 kasus" },
    { rank: 5, problem: "Pneumatic Cylinder Sticking / Slow", category: "Pneumatik", cases: 16, percentage: 12.3, dominantLine: "Jig & Fixture", pic: "Rian Hidayat", trend: "+1 kasus" },
    { rank: 6, problem: "Coolant Delivery Clogged / Low Flow", category: "Coolant & Filter", cases: 14, percentage: 10.8, dominantLine: "CNC Lathe & Milling", pic: "Dedi Supriyadi", trend: "-5 kasus" }
  ],

  // Top Accuracy Abnormality Ranking
  topAccuracyAbnormality: [
    { rank: 1, parameter: "Positioning Accuracy Error (Axis X/Y)", cases: 18, percentage: 38.3, impact: "Cpk Turun < 1.33 pada Diameter Dalam", dominantType: "CNC Milling" },
    { rank: 2, parameter: "Backlash Increase on Axis Ball Screw", cases: 12, percentage: 25.5, impact: "Dimensi Pitch Step & Roundness Deviasi", dominantType: "CNC Lathe & Milling" },
    { rank: 3, parameter: "Geometric Squareness Deviation (X-Y / Z)", cases: 9, percentage: 19.1, impact: "Ketegaklurusan Bidang Datum Part", dominantType: "Machining Center" },
    { rank: 4, parameter: "Spindle Taper Runout Exceeding Limit", cases: 8, percentage: 17.0, impact: "Surface Roughness Ra > 1.6 μm", dominantType: "CNC Milling & Broach" }
  ],

  // Breakdown Trend Bulanan (Januari - Oktober 2026)
  breakdownMonthly: [
    { month: "Jan", cases: 14, hours: 48.0, availability: 92.4 },
    { month: "Feb", cases: 12, hours: 38.5, availability: 93.1 },
    { month: "Mar", cases: 11, hours: 34.0, availability: 93.6 },
    { month: "Apr", cases: 13, hours: 42.5, availability: 92.8 },
    { month: "Mei", cases: 9,  hours: 28.0, availability: 94.2 },
    { month: "Jun", cases: 8,  hours: 24.5, availability: 94.8 },
    { month: "Jul", cases: 10, hours: 31.0, availability: 93.9 },
    { month: "Agu", cases: 7,  hours: 19.5, availability: 95.1 },
    { month: "Sep", cases: 6,  hours: 16.0, availability: 95.4 },
    { month: "Okt", cases: 4,  hours: 12.5, availability: 94.5 } // Target >= 90%, Actual 94.5%
  ],

  // Data PICA (Problem Identification & Corrective Action)
  picaRecords: [
    {
      id: "PICA-2026-0018",
      machine: "PR-JGD-002 • Jingduan 630T",
      problem: "Alarm suhu tinggi Bushing Kanan mencapai 68°C disertai kebocoran seal hidrolik",
      why1: "Debit oli pelumas otomatis drop dan oli bercampur partikel",
      why2: "Filter oli pelumas jenuh dan nozzle fitting tersumbat residu gram",
      why3: "Jadwal flushing tangki pelumas terlewat akibat beban produksi tinggi",
      why4: "Tidak ada sensor otomatis pemantau diferensial tekanan filter oli",
      rootCause: "Preventive maintenance pelumasan tidak memiliki visual warning indicator",
      correctiveAction: "Flushing total jalur sirkulasi oli dan ganti seal kit bushing",
      preventiveAction: "Pasang Differential Pressure Gauge & Interlock Alarm pada PLC",
      pic: "Ahmad Fauzi & Bambang S.",
      targetDate: "2026-10-28",
      status: "In Progress"
    },
    {
      id: "PICA-2026-0019",
      machine: "MC-HRT-004 • Hartford 1100 #4",
      problem: "Positioning Accuracy Axis-Y bergeser 0.016 mm melebihi batas toleransi 0.008 mm",
      why1: "Backlash pada mur ball screw Axis-Y meningkat menjadi 0.014 mm",
      why2: "Preload bearing support ujung fixed ballscrew mengalami keausan aksial",
      why3: "Wiper pelindung kotoran guideway robek sehingga gram halus masuk ke area ball nut",
      why4: "Inspeksi integritas wiper tidak tercantum eksplisit di lembar check PM harian",
      rootCause: "Standard Operation Procedure (SOP) PM harian operator belum mencakup visual check wiper",
      correctiveAction: "Re-preloading angular contact bearing NSK 7205 & ganti seal wiper Axis-Y",
      preventiveAction: "Revisi IK Pemeliharaan OPL (One Point Lesson) Inspeksi Wiper tiap ganti shift",
      pic: "Rudi Hartono (Leader PM)",
      targetDate: "2026-10-25",
      status: "Open"
    },
    {
      id: "PICA-2026-0017",
      machine: "BR-NCH-001 • Nachi Broaching #1",
      problem: "Vibrasi getaran slide pemakanan saat penarikan broach bar dimensi gear ring",
      why1: "Gib guide pelat kuningan mengalami keausan tidak merata (tirus 0.05 mm)",
      why2: "Kurang pelumasan sliding way akibat katup distributor blok B tersumbat",
      why3: "Oli sirkulasi terkontaminasi debu chip mikro dari proses pemesinan kering",
      why4: "Cover teleskopik bellows mengalami sobek kecil di sisi bawah",
      rootCause: "Usia pakai bellows teleskopik telah melampaui lifetime rekomendasi pabrik",
      correctiveAction: "Scraping ulang slide way & ganti bellows teleskopik baru",
      preventiveAction: "Masukkan jadwal Overhaul terencana dan ganti distributor grease",
      pic: "Hendra Wijaya",
      targetDate: "2026-11-05",
      status: "Scheduled"
    },
    {
      id: "PICA-2026-0016",
      machine: "MC-MZK-002 • Mazak VCN-530C",
      problem: "ATC Arm macet saat proses tool change posisi pocket nomor 14",
      why1: "Solenoid valve clamping arm tidak mencapai posisi batas sensor reed switch",
      why2: "Tekanan angin drop dari 0.6 MPa menjadi 0.42 MPa saat kompresor utama purging",
      why3: "Sub-regulator pneumatik unit mesin mengalami kebocoran internal diafragma",
      why4: "Unit FRL (Filter-Regulator-Lubricator) belum diganti selama 3 tahun",
      rootCause: "Preventive maintenance pneumatik berkala belum terjadwal otomatis di sistem",
      correctiveAction: "Ganti FRL regulator SMC 1/2 inch dan setel ulang timing ATC macro",
      preventiveAction: "Daftarkan part FRL ke dalam master lifetime replacement tiap 2 tahun",
      pic: "Siti Rahma",
      targetDate: "2026-10-15",
      status: "Closed / Verified"
    }
  ],

  // Overhaul Schedule Proyek Besar
  overhaulProjects: [
    {
      id: "OVH-2026-001",
      machineCode: "MC-HRT-001",
      machineName: "Hartford 1100 Vertical Machining Center #1",
      line: "Machining Line A",
      type: "CNC Milling",
      planMonth: "Oktober 2026",
      period: "15 Sep 2026 - 28 Okt 2026",
      scope: ["Spindle Rebuild & Balancing", "Penggantian Linear Guideway X/Y", "Overhaul ATC Tool Magazine", "Rewiring Electrical Cabinet & Fanuc Servo"],
      progress: 88,
      status: "Trial Run Stage",
      pic: "Ahmad Fauzi & Astra Otoparts Tech",
      notes: "Trial run pemesinan part test piece Cpk 1.67 sedang berlangsung."
    },
    {
      id: "OVH-2026-002",
      machineCode: "MC-OKM-002",
      machineName: "Okuma LB3000 CNC Lathe #2",
      line: "Machining Line C",
      type: "CNC Lathe",
      planMonth: "November 2026",
      period: "01 Nov 2026 - 15 Des 2026",
      scope: ["Spindle Bearings NSK P4 Class", "Turret Indexing Curvic Coupling Alignment", "Ballscrew Z-Axis Precision Replacement", "Hydraulic Chuck Actuator Overhaul"],
      progress: 25,
      status: "Preparation & Kitting",
      pic: "Rudi Hartono",
      notes: "Spare part bearing dan ballscrew telah lengkap di gudang karantina."
    },
    {
      id: "OVH-2026-003",
      machineCode: "PR-JGD-001",
      machineName: "Jingduan 630T Warm Forging Press #1",
      line: "Forging Line 1",
      type: "Forging Press",
      planMonth: "Desember 2026",
      period: "10 Nov 2026 - 20 Des 2026",
      scope: ["Main Eccentric Shaft Bronze Bushing", "Hydraulic Clamping & Cushion Pack", "Clutch & Brake Lining Renewal", "Lubrication Automatic Metering Manifold"],
      progress: 10,
      status: "Engineering Review",
      pic: "Bambang S. & Rigging Specialist",
      notes: "Koordinasi jadwal shutdown bersama Departemen PPIC dan Produksi."
    },
    {
      id: "OVH-2026-004",
      machineCode: "BR-NCH-001",
      machineName: "Nachi Vertical Broaching Machine #1",
      line: "Broaching Line 1",
      type: "Broaching",
      planMonth: "Januari 2027",
      period: "05 Des 2026 - 15 Jan 2027",
      scope: ["Slide Way Precision Re-scraping", "Main Hydraulic Ram Cylinder Re-seal", "Fixture Base Datum Plate Re-grinding", "Coolant High-Pressure Circuit Refurbish"],
      progress: 5,
      status: "Budget Approved",
      pic: "Hendra Wijaya",
      notes: "Vendor re-scraping spesialis dari Surabaya sudah terkonfirmasi."
    }
  ]
};

// ========================================================
// 2. GENERATE 90 MESIN GROUNDED (72 Normal, 14 Attention, 4 Abnormal)
// ========================================================

function initPmMasterMachines() {
  const machineDefs = [
    // 48 CNC Milling / Machining Center
    { prefix: "MC-HRT", name: "Hartford 1100 VMC", line: "Machining Line B", type: "CNC Milling", count: 12 },
    { prefix: "MC-MZK", name: "Mazak VCN-530C", line: "Machining Line A", type: "CNC Milling", count: 12 },
    { prefix: "MC-DSN", name: "Doosan DNM-5700", line: "Machining Line D", type: "CNC Milling", count: 14 },
    { prefix: "MC-FNC", name: "Fanuc Robodrill", line: "Machining Line E", type: "CNC Milling", count: 10 },
    // 10 CNC Lathe
    { prefix: "MC-OKM", name: "Okuma LB3000 Lathe", line: "Machining Line C", type: "CNC Lathe", count: 5 },
    { prefix: "MC-TKW", name: "Takisawa TMM-250", line: "Machining Line C", type: "CNC Lathe", count: 5 },
    // 20 Forging Press
    { prefix: "PR-JGD", name: "Jingduan 630T Forging", line: "Forging Line 2", type: "Forging Press", count: 8 },
    { prefix: "PR-AID", name: "Aida 1000T Forging", line: "Forging Line 1", type: "Forging Press", count: 8 },
    { prefix: "PR-KMT", name: "Komatsu 800T Forging", line: "Forging Line 3", type: "Forging Press", count: 4 },
    // 4 Broaching Machine
    { prefix: "BR-NCH", name: "Nachi Broach Vertical", line: "Broaching Line 1", type: "Broaching", count: 4 },
    // 8 Stamping Press
    { prefix: "PR-OBS", name: "Komatsu OBS-200 Stamping", line: "Stamping Line A", type: "Stamping Press", count: 4 },
    { prefix: "PR-WSN", name: "Wasino 150T Precision", line: "Stamping Line B", type: "Stamping Press", count: 4 }
  ];

  const result = [];
  let index = 1;

  // Tentukan 4 mesin abnormal spesifik
  const abnormalSet = new Set(["MC-HRT-004", "PR-JGD-002", "MC-OKM-003", "BR-NCH-001"]);

  // Tentukan 14 mesin attention spesifik
  const attentionSet = new Set([
    "MC-HRT-008", "MC-MZK-007", "MC-DSN-011", "MC-FNC-005", "MC-OKM-005",
    "MC-TKW-002", "MC-TKW-004", "PR-JGD-004", "PR-AID-003", "PR-AID-007",
    "PR-KMT-002", "BR-NCH-003", "PR-OBS-003", "PR-WSN-002"
  ]);

  machineDefs.forEach(def => {
    for (let i = 1; i <= def.count; i++) {
      const code = `${def.prefix}-${String(i).padStart(3, "0")}`;
      let status = "Normal";
      let remark = "Kondisi operasional normal dan terkendali.";

      if (abnormalSet.has(code)) {
        status = "Abnormal";
        if (code === "MC-HRT-004") remark = "Spindle Runout > 0.015 mm & ATC arm macet intermiten. PICA aktif.";
        else if (code === "PR-JGD-002") remark = "Kebocoran seal silinder hidrolik & suhu bushing 68°C. PICA aktif.";
        else if (code === "MC-OKM-003") remark = "Backlash Axis-X 0.038 mm melebihi batas 0.010 mm. Jadwal re-shim.";
        else if (code === "BR-NCH-001") remark = "Slide way aus tidak merata & getaran tinggi. Terjadwal Overhaul.";
      } else if (attentionSet.has(code)) {
        status = "Attention";
        remark = "Vibrasi mendekati ambang batas peringatan, perlu monitoring ekstra.";
      }

      // Hitung tanggal PM dan akurasi
      const dayOffset = (index % 28) + 1;
      const lastPmDate = `2026-09-${String(dayOffset).padStart(2, "0")}`;
      const nextPmDate = `2026-10-${String(dayOffset).padStart(2, "0")}`;

      result.push({
        no: index,
        code: code,
        name: `${def.name} #${i}`,
        line: def.line,
        type: def.type,
        status: status,
        lastPm: lastPmDate,
        nextPm: nextPmDate,
        accuracyStatus: status === "Abnormal" ? "Abnormal" : (status === "Attention" ? "Attention" : "Normal"),
        positioningAcc: status === "Abnormal" ? "0.016 mm" : (status === "Attention" ? "0.009 mm" : "0.004 mm"),
        backlash: status === "Abnormal" ? "0.024 mm" : (status === "Attention" ? "0.008 mm" : "0.003 mm"),
        spindleRunout: status === "Abnormal" ? "0.014 mm" : (status === "Attention" ? "0.006 mm" : "0.002 mm"),
        pic: ["Ahmad Fauzi", "Rudi Hartono", "Bambang S.", "Hendra Wijaya", "Siti Rahma"][index % 5],
        remark: remark
      });

      index++;
    }
  });

  PM_DATA.machines = result;
}

// Inisialisasi awal master 90 unit mesin
initPmMasterMachines();

// ========================================================
// 3. RENDER SUB-MODUL 1: DASHBOARD PM & ACCURACY (EXECUTIVE)
// ========================================================

function renderPmExecutiveDashboard() {
  // 1. Gambar Trend Machine Availability & Breakdown Canvas
  drawPmAvailTrendChart();

  // 2. Gambar Distribusi Kondisi Mesin Canvas
  drawPmConditionDistChart();
}

// ========================================================
// INTERACTIVE TRACKING & HUD TOOLTIP ENGINE FOR PM CHARTS
// ========================================================
let pmAvailHoverIdx = null;
let pmAvailListenersAttached = false;

let pmCondHoverRow = null;
let pmCondHoverSegment = null;
let pmCondListenersAttached = false;

let pmAccHoverIdx = null;
let pmAccListenersAttached = false;

let pmBdHoverIdx = null;
let pmBdListenersAttached = false;

function renderInteractiveChartTooltip(ctx, canvasW, canvasH, anchorX, anchorY, title, items) {
  ctx.save();
  ctx.font = "bold 10px 'Google Sans', sans-serif";
  let maxW = ctx.measureText(title).width;
  ctx.font = "9.5px 'Google Sans', sans-serif";
  items.forEach(it => {
    const textW = ctx.measureText(`${it.label}: ${it.val}`).width + 20;
    if (textW > maxW) maxW = textW;
  });

  const boxW = Math.max(160, maxW + 24);
  const rowH = 16;
  const boxH = 26 + items.length * rowH + 6;

  let boxX = anchorX + 14;
  if (boxX + boxW > canvasW - 8) {
    boxX = anchorX - boxW - 14;
  }
  if (boxX < 8) boxX = 8;

  let boxY = anchorY - boxH / 2;
  if (boxY < 6) boxY = 6;
  if (boxY + boxH > canvasH - 6) boxY = canvasH - boxH - 6;

  // Background Glassmorphism Box
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 1;

  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);
  }
  ctx.shadowColor = "transparent";

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px 'Google Sans', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, boxX + 12, boxY + 16);

  // Separator Line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.beginPath();
  ctx.moveTo(boxX + 10, boxY + 22);
  ctx.lineTo(boxX + boxW - 10, boxY + 22);
  ctx.stroke();

  // Rows
  let curY = boxY + 36;
  items.forEach(it => {
    // Dot indicator
    ctx.beginPath();
    ctx.arc(boxX + 14, curY - 3, 3, 0, Math.PI * 2);
    ctx.fillStyle = it.color || "#38bdf8";
    ctx.fill();

    // Label
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px 'Google Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(it.label, boxX + 22, curY);

    // Value
    ctx.fillStyle = it.color || "#ffffff";
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(it.val, boxX + boxW - 12, curY);

    curY += rowH;
  });

  ctx.restore();
}

function drawPmAvailTrendChart() {
  const canvas = document.getElementById("canvas-pm-avail-trend");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const container = canvas.parentElement;
  const rect = container ? container.getBoundingClientRect() : canvas.getBoundingClientRect();
  const width = Math.floor(rect.width) || 600;
  const height = Math.floor(rect.height) || 155;

  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const data = PM_DATA.breakdownMonthly;
  const padding = { top: 18, right: 38, bottom: 22, left: 38 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Background grid lines (3 steps = 4 clean grid lines)
  ctx.strokeStyle = "#f1f5f9";
  ctx.lineWidth = 1;
  const gridSteps = 3;
  for (let i = 0; i <= gridSteps; i++) {
    const y = padding.top + (chartH / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Sumbu Y Kiri: Availability % bulat (100%, 95%, 90%, 85%)
    const availVal = 100 - i * 5;
    ctx.fillStyle = "#64748b";
    ctx.font = "9px Google Sans, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${availVal}%`, padding.left - 6, y + 3);

    // Sumbu Y Kanan: Downtime Hours bulat (60h, 40h, 20h, 0h)
    const hoursVal = 60 - i * 20;
    ctx.textAlign = "left";
    ctx.fillText(`${hoursVal}h`, width - padding.right + 6, y + 3);
  }

  // Target Availability Line (90%) - Jatuh tepat di grid line i = 2
  const yTarget = padding.top + chartH * (1 - (90.0 - 85.0) / 15.0);
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(padding.left, yTarget);
  ctx.lineTo(width - padding.right, yTarget);
  ctx.stroke();
  ctx.setLineDash([]);

  // Target Label Badge
  const targetLabel = "Target ≥ 90%";
  ctx.font = "bold 8px Google Sans, sans-serif";
  const tw = ctx.measureText(targetLabel).width;
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillRect(padding.left + 6, yTarget - 10, tw + 6, 10);
  ctx.fillStyle = "#dc2626";
  ctx.textAlign = "left";
  ctx.fillText(targetLabel, padding.left + 9, yTarget - 2);

  // Titik garis Availability (%)
  const points = data.map((d, idx) => {
    const x = padding.left + (chartW / data.length) * (idx + 0.5);
    const y = padding.top + chartH * (1 - (d.availability - 85.0) / 15.0);
    return { x, y, val: d.availability, data: d, idx };
  });

  // Bars: Breakdown Hours (Downtime)
  const barW = (chartW / data.length) * 0.38;
  data.forEach((d, idx) => {
    const x = points[idx].x;
    const barH = (d.hours / 60) * chartH;
    const y = padding.top + chartH - barH;
    const isHovered = pmAvailHoverIdx === idx;

    // Gradient Bar
    const grad = ctx.createLinearGradient(0, y, 0, padding.top + chartH);
    if (isHovered) {
      grad.addColorStop(0, "rgba(239, 68, 68, 0.85)");
      grad.addColorStop(1, "rgba(239, 68, 68, 0.25)");
    } else {
      grad.addColorStop(0, "rgba(239, 68, 68, 0.45)");
      grad.addColorStop(1, "rgba(239, 68, 68, 0.08)");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x - barW / 2, y, barW, barH);

    if (isHovered) {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - barW / 2, y, barW, barH);
    }

    // Label Bulan
    ctx.fillStyle = isHovered ? "#0f172a" : "#475569";
    ctx.font = isHovered ? "bold 9.5px Google Sans, sans-serif" : "9px Google Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(d.month, x, height - padding.bottom + 14);
  });

  // Area under availability line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
  ctx.lineTo(points[0].x, padding.top + chartH);
  ctx.closePath();

  const areaGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
  areaGrad.addColorStop(0, "rgba(37, 99, 235, 0.18)");
  areaGrad.addColorStop(1, "rgba(37, 99, 235, 0.01)");
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Draw Availability Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Draw Bar Values (Jam)
  data.forEach((d, idx) => {
    const x = points[idx].x;
    const barH = (d.hours / 60) * chartH;
    const y = padding.top + chartH - barH;
    const lineY = points[idx].y;

    ctx.save();
    ctx.font = "bold 8px Google Sans, sans-serif";
    ctx.textAlign = "center";

    let textY = y - 3;
    let insideBar = false;

    if (Math.abs(lineY - textY) < 11 || (lineY >= y - 7 && lineY <= y + 7)) {
      if (barH >= 22) {
        textY = y + 11;
        insideBar = true;
      } else {
        textY = y - 9;
      }
    }

    if (insideBar) {
      const lbl = `${d.hours}h`;
      const lw = ctx.measureText(lbl).width;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillRect(x - lw / 2 - 2, textY - 7, lw + 4, 9);
      ctx.fillStyle = "#991b1b";
      ctx.fillText(lbl, x, textY);
    } else {
      ctx.fillStyle = "#991b1b";
      ctx.fillText(`${d.hours}h`, x, textY);
    }
    ctx.restore();
  });

  // Draw Dots & Actual Label on October (94.5%)
  points.forEach((p, idx) => {
    const isHovered = pmAvailHoverIdx === idx;
    ctx.beginPath();
    ctx.arc(p.x, p.y, isHovered ? 6 : (idx === points.length - 1 ? 4.5 : 3), 0, Math.PI * 2);
    ctx.fillStyle = idx === points.length - 1 ? "#10b981" : "#1d4ed8";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = isHovered ? 2.5 : 1.5;
    ctx.stroke();

    if (idx === points.length - 1 && pmAvailHoverIdx === null) {
      ctx.fillStyle = "#047857";
      ctx.font = "bold 9px Google Sans, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${p.val}% (Aktual)`, p.x + 2, p.y - 7);
    }
  });

  // Tracking Guide & Tooltip saat di-hover
  if (pmAvailHoverIdx !== null && points[pmAvailHoverIdx]) {
    const p = points[pmAvailHoverIdx];
    const d = p.data;

    // Vertical Tracking Guide Line
    ctx.save();
    ctx.strokeStyle = "rgba(37, 99, 235, 0.6)";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x, padding.top);
    ctx.lineTo(p.x, padding.top + chartH);
    ctx.stroke();

    // Beacon ring on active dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(37, 99, 235, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const isTargetMet = d.availability >= 90.0;
    renderInteractiveChartTooltip(
      ctx,
      width,
      height,
      p.x,
      p.y,
      `📅 Periode: ${d.month} 2026`,
      [
        { label: "Availability", val: `${d.availability}%`, color: isTargetMet ? "#10b981" : "#ef4444" },
        { label: "Total Downtime", val: `${d.hours} Jam`, color: "#f87171" },
        { label: "Kasus Breakdown", val: `${d.cases} Kasus`, color: "#38bdf8" },
        { label: "Target Operasional", val: isTargetMet ? "≥90% (MEMENUHI)" : "UNDER TARGET", color: isTargetMet ? "#34d399" : "#f87171" }
      ]
    );
  }

  // Pasang Listener Mouse Interaktif (Sekali Pasang)
  if (!pmAvailListenersAttached) {
    canvas.addEventListener("mousemove", (e) => {
      const cRect = canvas.getBoundingClientRect();
      const mx = e.clientX - cRect.left;
      let closestIdx = 0;
      let minDiff = Infinity;
      points.forEach((pt, i) => {
        const diff = Math.abs(mx - pt.x);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });
      if (mx >= padding.left - 20 && mx <= width - padding.right + 20) {
        if (pmAvailHoverIdx !== closestIdx) {
          pmAvailHoverIdx = closestIdx;
          canvas.style.cursor = "crosshair";
          drawPmAvailTrendChart();
        }
      } else if (pmAvailHoverIdx !== null) {
        pmAvailHoverIdx = null;
        canvas.style.cursor = "default";
        drawPmAvailTrendChart();
      }
    });

    canvas.addEventListener("mouseleave", () => {
      if (pmAvailHoverIdx !== null) {
        pmAvailHoverIdx = null;
        canvas.style.cursor = "default";
        drawPmAvailTrendChart();
      }
    });

    pmAvailListenersAttached = true;
  }
}

function drawPmConditionDistChart() {
  const canvas = document.getElementById("canvas-pm-condition-dist");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const container = canvas.parentElement;
  const rect = container ? container.getBoundingClientRect() : canvas.getBoundingClientRect();
  const width = Math.floor(rect.width) || 600;
  const height = Math.floor(rect.height) || 155;

  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  // Kategori Mesin dihitung DARI DATA AKTUAL PM_DATA.machines (90 Mesin Grounded)
  const catNames = [
    { name: "CNC Milling", filterKey: "CNC Milling" },
    { name: "CNC Lathe", filterKey: "CNC Lathe" },
    { name: "Forging Press", filterKey: "Forging Press" },
    { name: "Stamping Press", filterKey: "Stamping Press" },
    { name: "Broaching", filterKey: "Broaching" }
  ];

  const categories = catNames.map(cat => {
    const machines = (PM_DATA.machines || []).filter(m => (m.type || "").toLowerCase().includes(cat.filterKey.toLowerCase()));
    const total = machines.length || (cat.name === "CNC Milling" ? 48 : cat.name === "CNC Lathe" ? 10 : cat.name === "Forging Press" ? 20 : cat.name === "Stamping Press" ? 8 : 4);
    const normal = machines.filter(m => m.status === "Normal").length || Math.round(total * 0.8);
    const attention = machines.filter(m => m.status === "Attention").length || Math.round(total * 0.15);
    const abnormal = machines.filter(m => m.status === "Abnormal").length || Math.max(0, total - normal - attention);
    return { name: cat.name, total, normal, attention, abnormal, machines };
  });

  const padding = { top: 10, right: 15, bottom: 22, left: 85 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const rowH = chartH / categories.length;

  categories.forEach((cat, idx) => {
    const y = padding.top + idx * rowH;
    const barHeight = Math.min(rowH * 0.58, 14);
    const isRowHovered = pmCondHoverRow === idx;

    if (isRowHovered) {
      ctx.fillStyle = "rgba(37, 99, 235, 0.06)";
      ctx.fillRect(padding.left - 80, y - 2, chartW + 90, rowH);
    }

    // Label Jenis Mesin
    ctx.fillStyle = isRowHovered ? "#1d4ed8" : "#0f172a";
    ctx.font = isRowHovered ? "bold 10px Google Sans, sans-serif" : "bold 9.5px Google Sans, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(cat.name, padding.left - 8, y + barHeight / 2 + 3);

    // Multi-segment stacked horizontal bar
    const normW = (cat.normal / 50) * chartW;
    const attW = (cat.attention / 50) * chartW;
    const abnW = (cat.abnormal / 50) * chartW;

    let curX = padding.left;

    // Segment Normal (Green)
    if (normW > 0) {
      ctx.fillStyle = isRowHovered && pmCondHoverSegment === "Normal" ? "#059669" : "#10b981";
      ctx.fillRect(curX, y, normW, barHeight);
      if (normW > 16) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8.5px Google Sans, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(cat.normal, curX + normW / 2, y + barHeight / 2 + 3);
      }
      curX += normW;
    }

    // Segment Attention (Amber)
    if (attW > 0) {
      ctx.fillStyle = isRowHovered && pmCondHoverSegment === "Attention" ? "#d97706" : "#f59e0b";
      ctx.fillRect(curX, y, attW, barHeight);
      if (attW > 12) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8.5px Google Sans, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(cat.attention, curX + attW / 2, y + barHeight / 2 + 3);
      }
      curX += attW;
    }

    // Segment Abnormal (Red)
    if (abnW > 0) {
      ctx.fillStyle = isRowHovered && pmCondHoverSegment === "Abnormal" ? "#dc2626" : "#ef4444";
      ctx.fillRect(curX, y, abnW, barHeight);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8.5px Google Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(cat.abnormal, curX + abnW / 2, y + barHeight / 2 + 3);
      curX += abnW;
    }
  });

  // Legend at bottom berbasis data aktual
  const totalNormalAll = categories.reduce((a, b) => a + b.normal, 0);
  const totalAttAll = categories.reduce((a, b) => a + b.attention, 0);
  const totalAbnAll = categories.reduce((a, b) => a + b.abnormal, 0);
  const grandTotal = totalNormalAll + totalAttAll + totalAbnAll || 90;

  const legendY = height - 6;
  ctx.textAlign = "left";
  ctx.font = "9px Google Sans, sans-serif";

  // Green
  ctx.fillStyle = "#10b981";
  ctx.fillRect(padding.left, legendY - 7, 9, 8);
  ctx.fillStyle = "#334155";
  ctx.fillText(`Normal: ${totalNormalAll} (${Math.round((totalNormalAll/grandTotal)*100)}%)`, padding.left + 12, legendY);

  // Amber
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(padding.left + 120, legendY - 7, 9, 8);
  ctx.fillStyle = "#334155";
  ctx.fillText(`Attention: ${totalAttAll} (${Math.round((totalAttAll/grandTotal)*100)}%)`, padding.left + 132, legendY);

  // Red
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(padding.left + 240, legendY - 7, 9, 8);
  ctx.fillStyle = "#334155";
  ctx.fillText(`Abnormal: ${totalAbnAll} (${Math.round((totalAbnAll/grandTotal)*100)}%)`, padding.left + 252, legendY);

  // Tooltip Tracking saat kategori di-hover
  if (pmCondHoverRow !== null && categories[pmCondHoverRow]) {
    const cat = categories[pmCondHoverRow];
    const yRow = padding.top + pmCondHoverRow * rowH;
    const healthPct = ((cat.normal / cat.total) * 100).toFixed(1);

    renderInteractiveChartTooltip(
      ctx,
      width,
      height,
      padding.left + 100,
      yRow,
      `⚙️ Kategori: ${cat.name}`,
      [
        { label: "Total Armada", val: `${cat.total} Mesin`, color: "#ffffff" },
        { label: "🟢 Normal", val: `${cat.normal} (${((cat.normal / cat.total) * 100).toFixed(0)}%)`, color: "#34d399" },
        { label: "🟡 Attention", val: `${cat.attention} (${((cat.attention / cat.total) * 100).toFixed(0)}%)`, color: "#fbbf24" },
        { label: "🔴 Abnormal", val: `${cat.abnormal} (${((cat.abnormal / cat.total) * 100).toFixed(0)}%)`, color: "#f87171" },
        { label: "Kesehatan Armada", val: `${healthPct}% Siap`, color: "#38bdf8" }
      ]
    );
  }

  // Pasang Listener Mouse Interaktif (Sekali Pasang)
  if (!pmCondListenersAttached) {
    canvas.addEventListener("mousemove", (e) => {
      const cRect = canvas.getBoundingClientRect();
      const mx = e.clientX - cRect.left;
      const my = e.clientY - cRect.top;

      let hoveredRow = null;
      let hoveredSeg = null;

      categories.forEach((cat, idx) => {
        const y = padding.top + idx * rowH;
        if (my >= y - 3 && my <= y + rowH + 3 && mx >= padding.left - 80 && mx <= width) {
          hoveredRow = idx;
          const normW = (cat.normal / 50) * chartW;
          const attW = (cat.attention / 50) * chartW;
          if (mx <= padding.left + normW) hoveredSeg = "Normal";
          else if (mx <= padding.left + normW + attW) hoveredSeg = "Attention";
          else hoveredSeg = "Abnormal";
        }
      });

      if (pmCondHoverRow !== hoveredRow || pmCondHoverSegment !== hoveredSeg) {
        pmCondHoverRow = hoveredRow;
        pmCondHoverSegment = hoveredSeg;
        canvas.style.cursor = hoveredRow !== null ? "pointer" : "default";
        drawPmConditionDistChart();
      }
    });

    canvas.addEventListener("mouseleave", () => {
      if (pmCondHoverRow !== null) {
        pmCondHoverRow = null;
        pmCondHoverSegment = null;
        canvas.style.cursor = "default";
        drawPmConditionDistChart();
      }
    });

    canvas.addEventListener("click", () => {
      if (pmCondHoverRow !== null && categories[pmCondHoverRow]) {
        const cat = categories[pmCondHoverRow];
        const searchInput = document.getElementById("search-condition-input");
        if (searchInput) {
          searchInput.value = cat.name;
          searchConditionTable();
        }
      }
    });

    pmCondListenersAttached = true;
  }
}

// ========================================================
// 4. RENDER SUB-MODUL 2: PREVENTIVE MAINTENANCE SCHEDULE
// ========================================================

function renderPmScheduleView() {
  renderPmCalendarGrid();
  renderPmCalendarDayDetail(pmSelectedCalendarDay);
  renderPmMachinesAchievementTable();
  renderPmOverdueTable();
  renderPmConditionTable();
}

function renderPmCalendarGrid() {
  const mount = document.getElementById("pm-calendar-mount");
  if (!mount) return;

  const daysOfWeek = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];
  const totalDays = 31;
  const startOffset = 3; // 1 Okt 2026 = Kamis (offset 3)

  let html = `<div class="pm-calendar-grid">`;

  // Headers (Sen, Sel, Rab, Kam, Jum, Sab, Min)
  daysOfWeek.forEach(day => {
    html += `<div class="pm-cal-header-day">${day}</div>`;
  });

  // Empty leading days
  for (let i = 0; i < startOffset; i++) {
    html += `<div class="pm-cal-day-cell is-empty"></div>`;
  }

  // Days 1 to 31
  for (let day = 1; day <= totalDays; day++) {
    const isSelected = day === pmSelectedCalendarDay;
    const isToday = day === 22;

    let badgeHtml = "";

    if (day <= 18) {
      if (day === 10 || day === 14 || day === 18) {
        badgeHtml = `
          <span class="cal-tag-pill done"><span>Done</span><strong>12</strong></span>
          <span class="cal-tag-pill over"><span>Overdue</span><strong>2</strong></span>
        `;
      } else {
        badgeHtml = `
          <span class="cal-tag-pill done"><span>Done</span><strong>14</strong></span>
        `;
      }
    } else if (day >= 19 && day <= 21) {
      badgeHtml = `
        <span class="cal-tag-pill done"><span>Done</span><strong>10</strong></span>
        <span class="cal-tag-pill over"><span>Overdue</span><strong>4</strong></span>
      `;
    } else if (day === 22) {
      badgeHtml = `
        <span class="cal-tag-pill prog"><span>In Prog</span><strong>12</strong></span>
        <span class="cal-tag-pill over"><span>Overdue</span><strong>2</strong></span>
      `;
    } else {
      badgeHtml = `
        <span class="cal-tag-pill plan"><span>Plan</span><strong>14</strong></span>
      `;
    }

    html += `
      <div class="pm-cal-day-cell ${isSelected ? 'active-filter' : ''} ${isToday ? 'is-today' : ''}" onclick="selectPmCalendarDay(${day})">
        <div class="cal-day-top">
          <span class="cal-day-num">${day}</span>
          ${isToday ? '<span class="cal-today-badge">Hari Ini</span>' : ''}
        </div>
        <div class="cal-day-badge-col">
          ${badgeHtml}
        </div>
      </div>
    `;
  }

  html += `</div>`;
  mount.innerHTML = html;
}

function selectPmCalendarDay(day) {
  pmSelectedCalendarDay = day;
  renderPmCalendarGrid();
  renderPmCalendarDayDetail(day);
  showToast(`Menampilkan rincian agenda Preventive Maintenance untuk tanggal ${day} Oktober 2026.`, "info");
}

function renderPmCalendarDayDetail(day) {
  const mount = document.getElementById("pm-calendar-day-detail");
  if (!mount) return;

  const isPast = day < 22;
  const isToday = day === 22;
  const isOverdueDay = [10, 12, 14, 15, 16, 17, 18, 19, 20, 21].includes(day);

  const dateStr = `${day < 10 ? '0' + day : day} Oktober 2026`;
  let statusSummaryChips = "";
  let tasks = [];

  if (isToday) {
    statusSummaryChips = `
      <span class="pm-inspector-chip prog">⚡ 12 Mesin In Progress</span>
      <span class="pm-inspector-chip over">! 2 Overdue Menunggu Tindakan</span>
    `;
    tasks = [
      { code: "MC-HRT-004", name: "Hartford 1100 VMC #4", line: "Machining Line B", type: "CNC Milling", item: "Inspeksi Spindle Runout & Pelumasan ATC Arm", pic: "Ahmad Fauzi", status: "Overdue", statusClass: "border-overdue", pillClass: "over" },
      { code: "MC-OKM-003", name: "Okuma LB3000 Lathe #3", line: "Machining Line C", type: "CNC Lathe", item: "Pemeriksaan Backlash Axis-X & Re-shim Ballscrew", pic: "Rudi Hartono", status: "In Progress", statusClass: "border-prog", pillClass: "prog" },
      { code: "PR-JGD-002", name: "Jingduan 630T Press #2", line: "Forging Line 2", type: "Forging Press", item: "Flushing & Penggantian Filter Hidrolik Utama", pic: "Bambang S.", status: "In Progress", statusClass: "border-prog", pillClass: "prog" },
      { code: "MC-DSN-011", name: "Doosan DNM-5700 #11", line: "Machining Line D", type: "CNC Milling", item: "Inspeksi Tekanan Pneumatik & Solenoid Valve", pic: "Siti Rahma", status: "In Progress", statusClass: "border-prog", pillClass: "prog" }
    ];
  } else if (isOverdueDay) {
    const dueFormatted = `2026-10-${day < 10 ? '0' + day : day}`;
    const matchedOverdue = PM_DATA.overdueTasks.filter(t => t.dueDate === dueFormatted);

    statusSummaryChips = `
      <span class="pm-inspector-chip over">! ${matchedOverdue.length || 2} Mesin Overdue</span>
      <span class="pm-inspector-chip done">✓ ${14 - (matchedOverdue.length || 2)} Mesin Selesai</span>
    `;

    tasks = (matchedOverdue.length > 0 ? matchedOverdue : PM_DATA.overdueTasks.slice(0, 2)).map(t => ({
      code: t.machineCode,
      name: t.machineName,
      line: t.line,
      type: t.type,
      item: t.inspectionItem,
      pic: t.pic,
      status: `Overdue (+${t.delayDays} Hari)`,
      statusClass: "border-overdue",
      pillClass: "over"
    }));

    tasks.push(
      { code: `MC-MZK-00${(day % 9) + 1}`, name: "Mazak VCN-530C", line: "Machining Line A", type: "CNC Milling", item: "Inspeksi Geometri Spindle & Backlash Z-Axis", pic: "Ahmad Fauzi", status: "Selesai (Done)", statusClass: "border-done", pillClass: "done" },
      { code: `PR-AID-00${(day % 4) + 1}`, name: "Aida 1000T Warm Forging", line: "Forging Line 1", type: "Forging Press", item: "Pengecekan Tekanan Hidrolik Clamping Die", pic: "Bambang S.", status: "Selesai (Done)", statusClass: "border-done", pillClass: "done" }
    );
  } else if (isPast) {
    statusSummaryChips = `
      <span class="pm-inspector-chip done">✓ 14 Mesin Selesai (100% Target)</span>
      <span class="pm-inspector-chip plan">0 Tertunda</span>
    `;
    tasks = [
      { code: `MC-HRT-00${(day % 12) + 1}`, name: "Hartford 1100 VMC", line: "Machining Line B", type: "CNC Milling", item: "Perawatan Berkala Spindle, Pelumasan & Coolant Flow", pic: "Ahmad Fauzi", status: "Selesai (Done)", statusClass: "border-done", pillClass: "done" },
      { code: `MC-OKM-00${(day % 5) + 1}`, name: "Okuma LB3000 Lathe", line: "Machining Line C", type: "CNC Lathe", item: "Penggantian Filter Pendingin & Kalibrasi Zero Point", pic: "Rudi Hartono", status: "Selesai (Done)", statusClass: "border-done", pillClass: "done" },
      { code: `PR-JGD-00${(day % 8) + 1}`, name: "Jingduan 630T Press", line: "Forging Line 2", type: "Forging Press", item: "Inspeksi Kebocoran Seal Cylinder Die Cushion", pic: "Bambang S.", status: "Selesai (Done)", statusClass: "border-done", pillClass: "done" },
      { code: `MC-DSN-00${(day % 10) + 1}`, name: "Doosan DNM-5700", line: "Machining Line D", type: "CNC Milling", item: "Pembersihan Chip Conveyor & Pengecekan Belt Spindle", pic: "Siti Rahma", status: "Selesai (Done)", statusClass: "border-done", pillClass: "done" }
    ];
  } else {
    statusSummaryChips = `
      <span class="pm-inspector-chip plan">📅 14 Mesin Terjadwal</span>
      <span class="pm-inspector-chip prog">Persiapan Shift 1 & 2</span>
    `;
    tasks = [
      { code: `MC-FNC-00${(day % 10) + 1}`, name: "Fanuc Robodrill α-D21LiB", line: "Machining Line E", type: "CNC Milling", item: "Inspeksi Akurasi ATC Tool Magazine & Kalibrasi Sumbu", pic: "Rian Hidayat", status: "Terjadwal (Plan)", statusClass: "border-plan", pillClass: "plan" },
      { code: `PR-KMT-00${(day % 4) + 1}`, name: "Komatsu 800T Forging", line: "Forging Line 3", type: "Forging Press", item: "Inspeksi Ketebalan Brake Lining & Air Clutch Pressure", pic: "Dedi Supriyadi", status: "Terjadwal (Plan)", statusClass: "border-plan", pillClass: "plan" },
      { code: `BR-NCH-00${(day % 4) + 1}`, name: "Nachi Vertical Broach", line: "Broaching Line 1", type: "Broaching", item: "Pemeriksaan Play Slide Guide & Clamping Fixture", pic: "Hendra Wijaya", status: "Terjadwal (Plan)", statusClass: "border-plan", pillClass: "plan" },
      { code: "WS-BLS-001", name: "Shot Blasting Roto-Finish #1", line: "Finishing Line", type: "Finishing", item: "Penggantian Impeller Blade & Blade Liner", pic: "Eko Prasetyo", status: "Terjadwal (Plan)", statusClass: "border-plan", pillClass: "plan" }
    ];
  }

  const html = `
    <div class="pm-day-inspector-card">
      <div class="pm-day-inspector-head">
        <div class="pm-day-inspector-title">
          <span style="font-size:1.15rem;">🗓️</span>
          <h4>Detail Agenda PM — ${dateStr}</h4>
        </div>
        <div class="pm-day-inspector-chips">
          ${statusSummaryChips}
        </div>
      </div>
      <div class="pm-day-task-grid">
        ${tasks.map(t => `
          <div class="pm-day-task-card ${t.statusClass}">
            <div class="pm-task-head">
              <div>
                <span class="pm-task-code">${t.code}</span>
                <div class="pm-task-name">${t.name}</div>
                <span class="pm-task-line">${t.line} • ${t.type}</span>
              </div>
              <span class="cal-tag-pill ${t.pillClass}" style="font-size:0.68rem; padding:2px 8px;">${t.status}</span>
            </div>
            <div class="pm-task-desc">
              <strong>Item:</strong> ${t.item}
            </div>
            <div class="pm-task-meta">
              <span><strong>PIC:</strong> ${t.pic}</span>
              <button type="button" class="pm-task-btn-action" onclick="showInputAccuracyModal('${t.code}')">
                Detail / Eksekusi →
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  mount.innerHTML = html;
}

function renderPmMachinesAchievementTable() {
  const tbody = document.getElementById("pm-achievement-type-body");
  if (!tbody) return;

  tbody.innerHTML = PM_DATA.achievementByMachineType.map(item => {
    const achColor = item.achievement >= 95 ? "#10b981" : "#f59e0b";
    const statusPill = item.status === "Good" 
      ? `<span class="pm-status-pill normal">Tercapai</span>` 
      : `<span class="pm-status-pill attention">Perhatian</span>`;

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:0.95rem;">${item.icon}</span>
            <strong style="color:#0f172a; font-size:0.74rem;">${item.type}</strong>
          </div>
        </td>
        <td style="text-align:center;"><span style="background:#f1f5f9; padding:1.5px 6px; border-radius:4px; font-weight:700; font-family:var(--font-mono); font-size:0.72rem;">${item.count}</span></td>
        <td style="text-align:center;"><strong style="font-family:var(--font-mono); color:#1e293b; font-size:0.72rem;">${item.plan}</strong></td>
        <td style="text-align:center;"><strong style="font-family:var(--font-mono); color:#10b981; font-size:0.72rem;">${item.done}</strong></td>
        <td style="text-align:center;"><span style="font-family:var(--font-mono); color:${item.overdue > 0 ? '#ef4444' : '#64748b'}; font-weight:700; font-size:0.72rem;">${item.overdue}</span></td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="flex:1; height:5px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
              <div style="width:${item.achievement}%; height:100%; background:${achColor};"></div>
            </div>
            <strong style="font-family:var(--font-mono); font-size:0.72rem; color:${achColor};">${item.achievement}%</strong>
          </div>
        </td>
        <td style="text-align:center;"><strong style="font-family:var(--font-mono); color:#2563eb; font-size:0.72rem;">${item.compliance}%</strong></td>
        <td style="text-align:center;">${statusPill}</td>
      </tr>
    `;
  }).join("");
}

function renderPmOverdueTable() {
  const tbody = document.getElementById("pm-overdue-table-body");
  if (!tbody) return;

  tbody.innerHTML = PM_DATA.overdueTasks.map(item => {
    return `
      <tr>
        <td style="text-align:center; font-family:var(--font-mono); font-weight:700; color:#64748b;">#${item.no}</td>
        <td>
          <strong style="font-family:var(--font-mono); color:#1e40af; font-size:0.75rem;">${item.machineCode}</strong>
          <div style="font-weight:600; color:#0f172a; font-size:0.72rem; line-height:1.2;">${item.machineName}</div>
          <span style="color:#64748b; font-size:0.67rem;">${item.line}</span>
        </td>
        <td style="color:#1e293b; font-weight:600;">${item.inspectionItem}</td>
        <td style="text-align:center; font-family:var(--font-mono); color:#64748b; font-size:0.72rem;">${item.dueDate}</td>
        <td style="text-align:center;">
          <span style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; font-weight:800; padding:1.5px 6px; border-radius:999px; font-family:var(--font-mono); font-size:0.7rem;">
            +${item.delayDays}h
          </span>
        </td>
        <td><strong style="color:#334155; font-size:0.72rem;">${item.pic}</strong></td>
        <td><span style="color:#475569; font-size:0.7rem; line-height:1.2; display:block;">${item.actionPlan}</span></td>
        <td style="text-align:center;">
          <button type="button" class="btn-table-action" onclick="showInputAccuracyModal('${item.machineCode}')" title="Eksekusi & Input Form PM">
            Eksekusi
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderPmConditionTable() {
  const tbody = document.getElementById("pm-condition-table-body");
  if (!tbody) return;

  const searchInput = document.getElementById("search-machine-condition") || document.getElementById("search-condition-input");
  const searchVal = (searchInput?.value || "").toLowerCase();

  const filtered = PM_DATA.machines.filter(m => {
    const matchesFilter = pmConditionFilter === "all" || m.status.toLowerCase() === pmConditionFilter.toLowerCase();
    const matchesSearch = m.code.toLowerCase().includes(searchVal) ||
      m.name.toLowerCase().includes(searchVal) ||
      m.line.toLowerCase().includes(searchVal) ||
      m.type.toLowerCase().includes(searchVal) ||
      m.pic.toLowerCase().includes(searchVal) ||
      (m.remark && m.remark.toLowerCase().includes(searchVal));

    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#94a3b8;">Tidak ada mesin yang sesuai dengan filter pencarian.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(m => {
    let pillClass = "normal";
    if (m.status === "Attention") pillClass = "attention";
    if (m.status === "Abnormal") pillClass = "abnormal";

    return `
      <tr>
        <td style="text-align:center; font-family:var(--font-mono); color:#64748b;">${m.no}</td>
        <td>
          <strong style="font-family:var(--font-mono); color:#1e40af; font-size:0.75rem;">${m.code}</strong> • <strong style="color:#0f172a; font-size:0.73rem;">${m.name}</strong>
          <div style="color:#64748b; font-size:0.68rem; line-height:1.2;">${m.line} (${m.type})</div>
        </td>
        <td style="text-align:center;"><span class="pm-status-pill ${pillClass}">${m.status}</span></td>
        <td style="text-align:center; font-family:var(--font-mono); font-size:0.72rem; color:#475569;">${m.lastPm}</td>
        <td style="text-align:center; font-family:var(--font-mono); font-size:0.72rem; color:#1e293b; font-weight:700;">${m.nextPm}</td>
        <td><strong style="color:#334155; font-size:0.72rem;">${m.pic}</strong></td>
        <td><span style="color:#475569; font-size:0.71rem; line-height:1.2; display:block;">${m.remark}</span></td>
      </tr>
    `;
  }).join("");
}

function filterConditionTable(status) {
  pmConditionFilter = status;
  document.querySelectorAll("#view-pm-schedule .filter-pill").forEach(pill => {
    pill.classList.remove("active");
  });
  const target = document.getElementById(`filter-cond-${status}`);
  if (target) target.classList.add("active");
  renderPmConditionTable();
}

function searchConditionTable(query) {
  renderPmConditionTable();
}

// ========================================================
// 5. RENDER SUB-MODUL 3: MACHINE ACCURACY CHECK
// ========================================================

function renderPmAccuracyView() {
  renderAccuracyTypeCards();
  renderAccuracyOverdueTable();
  renderAccuracyMonitoringTable();
  drawAccuracyTrendChart();
}

function renderAccuracyTypeCards() {
  const mount = document.getElementById("acc-type-cards-mount");
  if (!mount) return;

  const data = [
    { title: "CNC Milling Center", plan: 32, done: 31, notYet: 1, ach: "96.9%" },
    { title: "CNC Lathe (Bubut)", plan: 26, done: 25, notYet: 1, ach: "96.2%" },
    { title: "Forging Press 630T/1000T", plan: 12, done: 11, notYet: 1, ach: "91.7%" },
    { title: "Vertical Broaching", plan: 8, done: 7, notYet: 1, ach: "87.5%" },
    { title: "Stamping Press Line", plan: 12, done: 12, notYet: 0, ach: "100%" }
  ];

  mount.innerHTML = data.map(item => {
    const isGood = parseFloat(item.ach) >= 95;
    const achColor = isGood ? "#10b981" : "#f59e0b";
    return `
      <div class="pm-acc-type-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="color:#0f172a; font-size:0.82rem;">${item.title}</strong>
          <span style="color:${achColor}; font-weight:800; font-family:var(--font-mono); font-size:0.85rem;">${item.ach}</span>
        </div>
        <div style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden; margin-bottom:8px;">
          <div style="width:${item.ach}; height:100%; background:${achColor}; border-radius:3px;"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:#64748b;">
          <span>Target: <strong style="color:#1e293b;">${item.plan}</strong></span>
          <span>Selesai: <strong style="color:#10b981;">${item.done}</strong></span>
          <span>Belum: <strong style="color:${item.notYet > 0 ? '#ef4444' : '#64748b'};">${item.notYet}</strong></span>
        </div>
      </div>
    `;
  }).join("");
}

function renderAccuracyOverdueTable() {
  const tbody = document.getElementById("acc-overdue-table-body");
  if (!tbody) return;

  const overdue4 = [
    { no: 1, code: "MC-HRT-004", name: "Hartford 1100 VMC #4", line: "Machining Line B", param: "Positioning Y & Runout Spindle", lastCheck: "2026-09-10", delay: 12, pic: "Ahmad Fauzi" },
    { no: 2, code: "MC-OKM-003", name: "Okuma LB3000 Lathe #3", line: "Machining Line C", param: "Backlash Axis-X (0.038 mm)", lastCheck: "2026-09-12", delay: 10, pic: "Rudi Hartono" },
    { no: 3, code: "PR-JGD-002", name: "Jingduan 630T Press #2", line: "Forging Line 2", param: "Slide Parallelism to Bolster", lastCheck: "2026-09-14", delay: 8, pic: "Bambang S." },
    { no: 4, code: "BR-NCH-001", name: "Nachi Broach #1", line: "Broaching Line 1", param: "Geometric Squareness Ram", lastCheck: "2026-09-14", delay: 8, pic: "Hendra Wijaya" }
  ];

  tbody.innerHTML = overdue4.map(item => `
    <tr>
      <td style="text-align:center; font-family:var(--font-mono); color:#64748b;">${item.no}</td>
      <td>
        <strong style="font-family:var(--font-mono); color:#7c3aed; font-size:0.75rem;">${item.code}</strong> • <strong style="color:#0f172a; font-size:0.73rem;">${item.name}</strong>
        <div style="font-size:0.68rem; color:#64748b;">${item.line}</div>
      </td>
      <td style="color:#b91c1c; font-weight:700; font-size:0.72rem;">${item.param}</td>
      <td style="text-align:center; font-family:var(--font-mono); color:#64748b; font-size:0.72rem;">${item.lastCheck}</td>
      <td style="text-align:center;">
        <span style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; font-weight:800; padding:1.5px 6px; border-radius:999px; font-family:var(--font-mono); font-size:0.7rem;">
          +${item.delay}h
        </span>
      </td>
      <td><strong style="color:#334155; font-size:0.72rem;">${item.pic}</strong></td>
      <td style="text-align:center;">
        <button type="button" class="btn-table-action" onclick="showInputAccuracyModal('${item.code}')" style="background:#7c3aed; color:#ffffff; border:none; padding:2px 8px; border-radius:4px; font-size:0.69rem; font-weight:700; cursor:pointer;">
          Input
        </button>
      </td>
    </tr>
  `).join("");
}

function renderAccuracyMonitoringTable() {
  const tbody = document.getElementById("acc-monitoring-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("search-accuracy-input")?.value || "").toLowerCase();

  const filtered = PM_DATA.machines.filter(m => {
    const matchesFilter = pmAccuracyFilter === "all" || m.accuracyStatus.toLowerCase() === pmAccuracyFilter.toLowerCase();
    const matchesSearch = m.code.toLowerCase().includes(searchVal) ||
      m.name.toLowerCase().includes(searchVal) ||
      m.line.toLowerCase().includes(searchVal) ||
      m.type.toLowerCase().includes(searchVal) ||
      m.pic.toLowerCase().includes(searchVal);

    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:#94a3b8;">Tidak ada data akurasi yang sesuai filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(m => {
    let pillClass = "normal";
    if (m.accuracyStatus === "Attention") pillClass = "attention";
    if (m.accuracyStatus === "Abnormal") pillClass = "abnormal";

    const isPosAbnormal = m.positioningAcc === "0.016 mm";
    const isBacklashAbnormal = m.backlash === "0.024 mm";
    const isRunoutAbnormal = m.spindleRunout === "0.014 mm";

    return `
      <tr>
        <td style="text-align:center; font-family:var(--font-mono); color:#64748b;">${m.no}</td>
        <td>
          <strong style="font-family:var(--font-mono); color:#7c3aed; font-size:0.75rem;">${m.code}</strong> • <strong style="color:#0f172a; font-size:0.73rem;">${m.name}</strong>
          <div style="font-size:0.68rem; color:#64748b;">${m.line}</div>
        </td>
        <td style="text-align:right; font-family:var(--font-mono); font-size:0.72rem; font-weight:700; color:${isPosAbnormal ? '#dc2626' : '#1e293b'};">
          ${m.positioningAcc}
        </td>
        <td style="text-align:right; font-family:var(--font-mono); font-size:0.72rem; font-weight:600; color:${isBacklashAbnormal ? '#dc2626' : '#334155'};">
          ${m.backlash}
        </td>
        <td style="text-align:right; font-family:var(--font-mono); font-size:0.72rem; font-weight:600; color:${isRunoutAbnormal ? '#dc2626' : '#334155'};">
          ${m.spindleRunout}
        </td>
        <td style="text-align:center;">
          <span class="pm-status-pill ${pillClass}">${m.accuracyStatus}</span>
        </td>
        <td style="text-align:center; font-family:var(--font-mono); font-size:0.72rem; color:#475569;">${m.nextPm}</td>
        <td><span style="color:#334155; font-size:0.72rem; font-weight:600;">${m.pic}</span></td>
        <td style="text-align:center;">
          <button type="button" class="btn-table-action" onclick="showInputAccuracyModal('${m.code}')" style="background:#f5f3ff; color:#7c3aed; border:1px solid #ddd6fe; padding:2px 7px; border-radius:4px; font-size:0.69rem; font-weight:700; cursor:pointer;">
            Input
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function filterAccuracyTable(status) {
  pmAccuracyFilter = status;
  document.querySelectorAll("#pm-accuracy-filter-pills .pm-f-pill").forEach(pill => {
    pill.classList.remove("active");
  });
  const target = document.getElementById(`filter-acc-${status}`);
  if (target) target.classList.add("active");
  renderAccuracyMonitoringTable();
}

function searchAccuracyTable(query) {
  renderAccuracyMonitoringTable();
}

function drawAccuracyTrendChart() {
  const canvas = document.getElementById("canvas-accuracy-trend");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const container = canvas.parentElement;
  const rect = container ? container.getBoundingClientRect() : canvas.getBoundingClientRect();
  const width = Math.floor(rect.width) || 720;
  const height = Math.floor(rect.height) || 240;

  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  // Data Tren Positioning Accuracy Hartford 1100 #4 (Jan - Okt 2026 Grounded)
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt"];
  const measured = [0.003, 0.004, 0.004, 0.005, 0.006, 0.007, 0.008, 0.010, 0.013, 0.016]; // mm
  const limitMax = 0.008; // Batas standar industri MTM

  const padding = { top: 25, right: 35, bottom: 35, left: 65 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Background grid
  ctx.strokeStyle = "#f1f5f9";
  ctx.lineWidth = 1;
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = padding.top + (chartH / steps) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const val = (0.020 - (i * 0.005)).toFixed(3);
    ctx.fillStyle = "#64748b";
    ctx.font = "10px Google Sans, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${val} mm`, padding.left - 8, y + 3);
  }

  // Red Limit Line (0.008 mm)
  const yLimit = padding.top + chartH * (1 - limitMax / 0.020);
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(padding.left, yLimit);
  ctx.lineTo(width - padding.right, yLimit);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#dc2626";
  ctx.font = "bold 10px Google Sans, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Batas Maksimal Standar (0.008 mm)", width - padding.right, yLimit - 6);

  // Gradient area above limit (danger zone)
  const dangerGrad = ctx.createLinearGradient(0, padding.top, 0, yLimit);
  dangerGrad.addColorStop(0, "rgba(239, 68, 68, 0.12)");
  dangerGrad.addColorStop(1, "rgba(239, 68, 68, 0.02)");
  ctx.fillStyle = dangerGrad;
  ctx.fillRect(padding.left, padding.top, chartW, yLimit - padding.top);

  // Plot measured points
  const points = measured.map((val, idx) => {
    const x = padding.left + (chartW / (months.length - 1)) * idx;
    const y = padding.top + chartH * (1 - val / 0.020);
    return { x, y, val, month: months[idx], idx };
  });

  // Curve
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = "#7c3aed";
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // Dots
  points.forEach((p, idx) => {
    const isHovered = pmAccHoverIdx === idx;
    ctx.beginPath();
    ctx.arc(p.x, p.y, isHovered ? 6.5 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = p.val > limitMax ? "#ef4444" : "#7c3aed";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = isHovered ? 2.5 : 2;
    ctx.stroke();

    // X-Axis labels
    ctx.fillStyle = isHovered ? "#0f172a" : "#475569";
    ctx.font = isHovered ? "bold 11.5px Google Sans, sans-serif" : "11px Google Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.month, p.x, padding.top + chartH + 18);

    // Value on top for last 3 months if not hovered
    if (pmAccHoverIdx === null && idx >= points.length - 3) {
      ctx.fillStyle = p.val > limitMax ? "#b91c1c" : "#7c3aed";
      ctx.font = "bold 9px Google Sans, sans-serif";
      ctx.fillText(`${p.val} mm`, p.x, p.y - 8);
    }
  });

  // Tracking Guide & Tooltip saat di-hover
  if (pmAccHoverIdx !== null && points[pmAccHoverIdx]) {
    const p = points[pmAccHoverIdx];
    const isOverLimit = p.val > limitMax;

    // Crosshair Lines
    ctx.save();
    ctx.strokeStyle = isOverLimit ? "rgba(239, 68, 68, 0.6)" : "rgba(124, 58, 237, 0.6)";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.2;

    // Vertikal
    ctx.beginPath();
    ctx.moveTo(p.x, padding.top);
    ctx.lineTo(p.x, padding.top + chartH);
    ctx.stroke();

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(padding.left, p.y);
    ctx.lineTo(width - padding.right, p.y);
    ctx.stroke();

    // Beacon ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.strokeStyle = isOverLimit ? "rgba(239, 68, 68, 0.5)" : "rgba(124, 58, 237, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    renderInteractiveChartTooltip(
      ctx,
      width,
      height,
      p.x,
      p.y,
      `📐 Hartford 1100 #4 • ${p.month} 2026`,
      [
        { label: "Parameter", val: "Positioning Y", color: "#e2e8f0" },
        { label: "Deviasi Terukur", val: `${p.val.toFixed(3)} mm`, color: isOverLimit ? "#ef4444" : "#a78bfa" },
        { label: "Batas Standar", val: `${limitMax.toFixed(3)} mm`, color: "#f87171" },
        { label: "Status Toleransi", val: isOverLimit ? `LEWAT +${((p.val - limitMax)*1000).toFixed(1)} μm` : "DALAM TOLERANSI (OK)", color: isOverLimit ? "#ef4444" : "#10b981" },
        { label: "Tindak Lanjut", val: isOverLimit ? "Re-shim Ballscrew & PICA" : "Pelumasan Terjadwal", color: "#38bdf8" }
      ]
    );
  }

  // Pasang Listener Mouse Interaktif (Sekali Pasang)
  if (!pmAccListenersAttached) {
    canvas.addEventListener("mousemove", (e) => {
      const cRect = canvas.getBoundingClientRect();
      const mx = e.clientX - cRect.left;
      let closestIdx = 0;
      let minDiff = Infinity;
      points.forEach((pt, i) => {
        const diff = Math.abs(mx - pt.x);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });
      if (mx >= padding.left - 20 && mx <= width - padding.right + 20) {
        if (pmAccHoverIdx !== closestIdx) {
          pmAccHoverIdx = closestIdx;
          canvas.style.cursor = "crosshair";
          drawAccuracyTrendChart();
        }
      } else if (pmAccHoverIdx !== null) {
        pmAccHoverIdx = null;
        canvas.style.cursor = "default";
        drawAccuracyTrendChart();
      }
    });

    canvas.addEventListener("mouseleave", () => {
      if (pmAccHoverIdx !== null) {
        pmAccHoverIdx = null;
        canvas.style.cursor = "default";
        drawAccuracyTrendChart();
      }
    });

    pmAccListenersAttached = true;
  }
}
window.renderAccuracyTrendChart = drawAccuracyTrendChart;

// ========================================================
// 6. RENDER SUB-MODUL 4: ABNORMALITY, BREAKDOWN & PICA
// ========================================================

function renderPmAbnormalityView() {
  renderTopAbnormalityTable();
  renderTopAccuracyAbnormalityTable();
  renderPicaTable();
  drawBreakdownTrendChart();
}

function renderTopAbnormalityTable() {
  const tbody = document.getElementById("top-abnormality-body");
  if (!tbody) return;

  tbody.innerHTML = PM_DATA.topAbnormality.map(item => `
    <tr>
      <td style="text-align:center;">
        <span style="width:22px; height:22px; border-radius:50%; background:${item.rank <= 3 ? '#fee2e2' : '#f1f5f9'}; color:${item.rank <= 3 ? '#b91c1c' : '#475569'}; display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:0.72rem;">
          ${item.rank}
        </span>
      </td>
      <td>
        <strong style="color:#0f172a; font-size:0.74rem; display:block; line-height:1.2;">${item.problem}</strong>
        <span style="color:#64748b; font-size:0.67rem;">${item.category} • ${item.dominantLine}</span>
      </td>
      <td style="text-align:center;">
        <strong style="font-family:var(--font-mono); color:#b91c1c; font-size:0.8rem;">${item.cases}</strong>
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:6px;">
          <div style="flex:1; height:5px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
            <div style="width:${item.percentage * 2.8}%; height:100%; background:#ef4444;"></div>
          </div>
          <span style="font-family:var(--font-mono); font-size:0.72rem; font-weight:700; color:#b91c1c;">${item.percentage}%</span>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderTopAccuracyAbnormalityTable() {
  const tbody = document.getElementById("top-accuracy-abn-body");
  if (!tbody) return;

  tbody.innerHTML = PM_DATA.topAccuracyAbnormality.map(item => `
    <tr>
      <td style="text-align:center;">
        <span style="width:22px; height:22px; border-radius:50%; background:#f3e8ff; color:#7c3aed; display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:0.72rem;">
          ${item.rank}
        </span>
      </td>
      <td>
        <strong style="color:#0f172a; font-size:0.74rem; display:block; line-height:1.2;">${item.parameter}</strong>
        <span style="color:#7c3aed; font-size:0.67rem; font-weight:600;">${item.impact}</span>
        <span style="color:#64748b; font-size:0.67rem;">• ${item.dominantType}</span>
      </td>
      <td style="text-align:center;">
        <strong style="font-family:var(--font-mono); color:#7c3aed; font-size:0.8rem;">${item.cases}</strong>
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:6px;">
          <div style="flex:1; height:5px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
            <div style="width:${item.percentage * 2}%; height:100%; background:#7c3aed;"></div>
          </div>
          <span style="font-family:var(--font-mono); font-size:0.72rem; font-weight:700; color:#7c3aed;">${item.percentage}%</span>
        </div>
      </td>
    </tr>
  `).join("");
}

function drawBreakdownTrendChart() {
  const canvas = document.getElementById("canvas-breakdown-trend");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const container = canvas.parentElement;
  const rect = container ? container.getBoundingClientRect() : canvas.getBoundingClientRect();
  const width = Math.floor(rect.width) || 720;
  const height = Math.floor(rect.height) || 250;

  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const data = PM_DATA.breakdownMonthly;
  const padding = { top: 25, right: 45, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Grid
  ctx.strokeStyle = "#f1f5f9";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Sumbu Kiri: Kasus (0 - 16)
    const casesVal = 16 - (i * 4);
    ctx.fillStyle = "#64748b";
    ctx.font = "10px Google Sans, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(casesVal, padding.left - 8, y + 3);

    // Sumbu Kanan: Jam Downtime (0 - 60h)
    const hoursVal = 60 - (i * 15);
    ctx.textAlign = "left";
    ctx.fillText(`${hoursVal}h`, width - padding.right + 8, y + 3);
  }

  // Bars: Kasus Kerusakan
  const barW = (chartW / data.length) * 0.45;
  data.forEach((d, idx) => {
    const x = padding.left + (chartW / data.length) * (idx + 0.5);
    const barH = (d.cases / 16) * chartH;
    const y = padding.top + chartH - barH;
    const isHovered = pmBdHoverIdx === idx;

    ctx.fillStyle = isHovered ? "rgba(59, 130, 246, 0.85)" : "rgba(59, 130, 246, 0.45)";
    ctx.fillRect(x - barW / 2, y, barW, barH);

    if (isHovered) {
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - barW / 2, y, barW, barH);
    }

    ctx.fillStyle = isHovered ? "#1d4ed8" : "#1e40af";
    ctx.font = isHovered ? "bold 10px Google Sans, sans-serif" : "bold 9px Google Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(d.cases, x, y - 4);

    ctx.fillStyle = isHovered ? "#0f172a" : "#64748b";
    ctx.font = isHovered ? "bold 11.5px Google Sans, sans-serif" : "11px Google Sans, sans-serif";
    ctx.fillText(d.month, x, padding.top + chartH + 18);
  });

  // Line: Durasi Jam Downtime
  const points = data.map((d, idx) => {
    const x = padding.left + (chartW / data.length) * (idx + 0.5);
    const y = padding.top + chartH * (1 - d.hours / 60);
    return { x, y, val: d.hours, data: d, idx };
  });

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  points.forEach((p, idx) => {
    const isHovered = pmBdHoverIdx === idx;
    ctx.beginPath();
    ctx.arc(p.x, p.y, isHovered ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = "#dc2626";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = isHovered ? 2.5 : 2;
    ctx.stroke();
  });

  // Tracking Guide & Tooltip saat di-hover
  if (pmBdHoverIdx !== null && points[pmBdHoverIdx]) {
    const p = points[pmBdHoverIdx];
    const d = p.data;

    // Vertical Tracking Guide Line
    ctx.save();
    ctx.strokeStyle = "rgba(220, 38, 38, 0.6)";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x, padding.top);
    ctx.lineTo(p.x, padding.top + chartH);
    ctx.stroke();

    // Beacon ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(220, 38, 38, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    renderInteractiveChartTooltip(
      ctx,
      width,
      height,
      p.x,
      p.y,
      `📅 Periode: ${d.month} 2026`,
      [
        { label: "Kasus Kerusakan", val: `${d.cases} Kasus`, color: "#60a5fa" },
        { label: "Total Downtime", val: `${d.hours} Jam`, color: "#f87171" },
        { label: "Rata-rata (MTTR)", val: `${(d.hours / d.cases).toFixed(1)} Jam/Kasus`, color: "#fbbf24" },
        { label: "Availability Mesin", val: `${d.availability}%`, color: d.availability >= 90 ? "#34d399" : "#f87171" }
      ]
    );
  }

  // Pasang Listener Mouse Interaktif (Sekali Pasang)
  if (!pmBdListenersAttached) {
    canvas.addEventListener("mousemove", (e) => {
      const cRect = canvas.getBoundingClientRect();
      const mx = e.clientX - cRect.left;
      let closestIdx = 0;
      let minDiff = Infinity;
      points.forEach((pt, i) => {
        const diff = Math.abs(mx - pt.x);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });
      if (mx >= padding.left - 20 && mx <= width - padding.right + 20) {
        if (pmBdHoverIdx !== closestIdx) {
          pmBdHoverIdx = closestIdx;
          canvas.style.cursor = "crosshair";
          drawBreakdownTrendChart();
        }
      } else if (pmBdHoverIdx !== null) {
        pmBdHoverIdx = null;
        canvas.style.cursor = "default";
        drawBreakdownTrendChart();
      }
    });

    canvas.addEventListener("mouseleave", () => {
      if (pmBdHoverIdx !== null) {
        pmBdHoverIdx = null;
        canvas.style.cursor = "default";
        drawBreakdownTrendChart();
      }
    });

    pmBdListenersAttached = true;
  }
}

function renderPicaTable() {
  const tbody = document.getElementById("pica-records-table-body");
  if (!tbody) return;

  tbody.innerHTML = PM_DATA.picaRecords.map(item => {
    let pillClass = "normal";
    if (item.status === "Open") pillClass = "abnormal";
    if (item.status === "In Progress") pillClass = "attention";

    return `
      <tr>
        <td><strong style="font-family:var(--font-mono); color:#1e40af; font-size:0.72rem;">${item.id}</strong></td>
        <td><strong style="color:#0f172a; font-size:0.74rem;">${item.machine}</strong></td>
        <td style="color:#b91c1c; font-weight:600; font-size:0.72rem; line-height:1.25;">${item.problem}</td>
        <td style="color:#334155; font-size:0.72rem; line-height:1.25;">${item.rootCause}</td>
        <td style="color:#047857; font-weight:600; font-size:0.72rem; line-height:1.25;">${item.correctiveAction}</td>
        <td style="text-align:center;">
          <div style="font-weight:700; color:#1e293b; font-size:0.72rem;">${item.pic}</div>
          <div style="font-family:var(--font-mono); font-size:0.68rem; color:#64748b;">${item.targetDate}</div>
          <span class="pm-status-pill ${pillClass}" style="margin-top:2px; font-size:0.65rem; padding:1px 6px;">${item.status}</span>
        </td>
      </tr>
    `;
  }).join("");
}

function showPicaModal() {
  const modal = document.getElementById("modal-pica-form");
  if (modal) {
    modal.style.display = "flex";
  }
}

function handleSavePica(e) {
  e.preventDefault();

  const machine = document.getElementById("pica-machine")?.value || document.getElementById("pica-input-machine")?.value || "MC-03 (Hartford VMC)";
  const problem = document.getElementById("pica-problem")?.value || document.getElementById("pica-input-problem")?.value || "";
  const rootCause = document.getElementById("pica-why5")?.value || document.getElementById("pica-input-why5")?.value || "Akar masalah teridentifikasi via 5-Why";
  const correctiveAction = document.getElementById("pica-corrective")?.value || document.getElementById("pica-input-action")?.value || "";
  const preventiveAction = document.getElementById("pica-preventive")?.value || document.getElementById("pica-input-preventive")?.value || "";
  const pic = document.getElementById("pica-pic")?.value || document.getElementById("pica-input-pic")?.value || "Teknisi PM";
  const targetDate = document.getElementById("pica-due")?.value || document.getElementById("pica-input-target")?.value || new Date().toISOString().slice(0, 10);

  const newId = `PICA-2026-00${PM_DATA.picaRecords.length + 20}`;

  PM_DATA.picaRecords.unshift({
    id: newId,
    machine: machine,
    problem: problem,
    rootCause: rootCause,
    correctiveAction: correctiveAction,
    preventiveAction: preventiveAction,
    pic: pic,
    targetDate: targetDate,
    status: "Open"
  });

  renderPicaTable();
  closeModal("modal-pica-form");
  showToast(`Dokumen ${newId} berhasil disimpan ke sistem PICA MTM.`, "success");
}

// ========================================================
// 7. RENDER SUB-MODUL 5: OVERHAUL SCHEDULE
// ========================================================

function renderPmOverhaulView() {
  const tbody = document.getElementById("overhaul-schedule-table-body");
  if (!tbody) return;

  tbody.innerHTML = PM_DATA.overhaulProjects.map(proj => {
    let barColor = "#2563eb";
    if (proj.progress >= 80) barColor = "#10b981";
    else if (proj.progress <= 15) barColor = "#f59e0b";

    const scopeBadges = proj.scope.map(s => `
      <span style="background:#f8fafc; color:#334155; border:1px solid #e2e8f0; font-size:0.67rem; padding:1px 5px; border-radius:4px; font-weight:500; display:inline-block; margin:1px 2px; line-height:1.2;">
        ${s}
      </span>
    `).join("");

    return `
      <tr>
        <td>
          <strong style="font-family:var(--font-mono); color:#1e40af; font-size:0.74rem;">${proj.id}</strong>
        </td>
        <td>
          <strong style="color:#0f172a; font-size:0.75rem; display:block; line-height:1.2;">${proj.machineName}</strong>
          <span style="font-family:var(--font-mono); font-size:0.68rem; color:#64748b;">${proj.machineCode} • ${proj.line}</span>
        </td>
        <td>
          <strong style="color:#1d4ed8; font-size:0.74rem; display:block;">${proj.planMonth}</strong>
          <span style="font-family:var(--font-mono); font-size:0.68rem; color:#64748b; white-space:nowrap;">${proj.period}</span>
        </td>
        <td>
          <div style="display:flex; flex-wrap:wrap; gap:2px;">${scopeBadges}</div>
        </td>
        <td style="text-align:center;">
          <div style="display:flex; align-items:center; gap:5px; justify-content:center;">
            <div style="flex:1; max-width:55px; height:5px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
              <div style="width:${proj.progress}%; height:100%; background:${barColor}; border-radius:3px;"></div>
            </div>
            <strong style="font-family:var(--font-mono); font-size:0.72rem; color:${barColor}; min-width:28px; text-align:right;">${proj.progress}%</strong>
          </div>
        </td>
        <td style="text-align:center;">
          <span class="status-pill active" style="font-size:0.68rem; padding:2px 7px; display:inline-flex; align-items:center; gap:4px; justify-content:center;">
            <span style="width:5px; height:5px; border-radius:50%; background:${barColor}; flex-shrink:0;"></span>
            ${proj.status}
          </span>
        </td>
        <td>
          <strong style="color:#334155; font-size:0.74rem; display:block; line-height:1.2;">${proj.pic}</strong>
          <div style="color:#64748b; font-size:0.68rem; line-height:1.2; margin-top:2px;">
            ${proj.notes}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ========================================================
// 8. MODAL & INTERACTIVE UTILITIES
// ========================================================

function showInputAccuracyModal(machineCode) {
  const modal = document.getElementById("modal-accuracy-input");
  if (!modal) return;

  const select = document.getElementById("acc-input-machine");
  if (select && machineCode) {
    select.value = machineCode;
  }
  modal.style.display = "flex";
}

function handleSaveAccuracyCheck(e) {
  e.preventDefault();

  const code = document.getElementById("acc-input-machine")?.value || "MC-HRT-004";
  const rawActual = document.getElementById("acc-input-actual")?.value || "0.008 mm";
  const param = document.getElementById("acc-input-param")?.value || "Positioning Accuracy";
  const status = document.getElementById("acc-input-status")?.value || "Normal";
  const pic = document.getElementById("acc-input-pic")?.value || "Budi S. (Metrologi)";
  const remark = document.getElementById("acc-input-remark")?.value || "";

  const m = PM_DATA.machines.find(item => item.code === code);
  if (m) {
    if (param.includes("Positioning")) m.positioningAcc = rawActual.includes("mm") ? rawActual : `${rawActual} mm`;
    else if (param.includes("Backlash")) m.backlash = rawActual.includes("mm") ? rawActual : `${rawActual} mm`;
    else if (param.includes("Spindle")) m.spindleRunout = rawActual.includes("mm") ? rawActual : `${rawActual} mm`;

    m.accuracyStatus = status;
    m.status = status;
    m.remark = remark || `Inspeksi parameter ${param} selesai oleh ${pic} pada ${new Date().toISOString().slice(0, 10)}.`;
  }

  // Hapus dari daftar overdue jika ada
  PM_DATA.overdueTasks = PM_DATA.overdueTasks.filter(item => item.machineCode !== code);

  closeModal("modal-accuracy-input");
  renderPmAccuracyView();
  renderPmScheduleView();
  showToast(`Pengukuran akurasi untuk mesin ${code} (${param}: ${rawActual}) berhasil disimpan.`, "success");
}

function exportPmReport(type) {
  const data = {
    generatedAt: new Date().toISOString(),
    system: "MAINTENANCE APPS - PT Menara Terus Makmur",
    module: "Preventive Maintenance & Machine Accuracy",
    kpi: PM_DATA.kpi,
    machines: PM_DATA.machines.slice(0, 20),
    overdueTasks: PM_DATA.overdueTasks,
    topAbnormality: PM_DATA.topAbnormality,
    picaRecords: PM_DATA.picaRecords,
    overhaulProjects: PM_DATA.overhaulProjects
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `MTM_PM_Report_${type}_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  showToast(`Laporan ${type.toUpperCase()} Preventive Maintenance MTM berhasil diunduh.`, "success");
}

// Global window exposure
window.PM_DATA = PM_DATA;
window.renderPmExecutiveDashboard = renderPmExecutiveDashboard;
window.renderPmScheduleView = renderPmScheduleView;
window.renderPmAccuracyView = renderPmAccuracyView;
window.renderPmAbnormalityView = renderPmAbnormalityView;
window.renderPmOverhaulView = renderPmOverhaulView;
window.filterConditionTable = filterConditionTable;
window.searchConditionTable = searchConditionTable;
window.filterAccuracyTable = filterAccuracyTable;
window.searchAccuracyTable = searchAccuracyTable;
window.selectPmCalendarDay = selectPmCalendarDay;
window.showPicaModal = showPicaModal;
window.handleSavePica = handleSavePica;
window.showInputAccuracyModal = showInputAccuracyModal;
window.handleSaveAccuracyCheck = handleSaveAccuracyCheck;
window.exportPmReport = exportPmReport;
window.drawPmAvailTrendChart = drawPmAvailTrendChart;
window.drawPmConditionDistChart = drawPmConditionDistChart;
window.drawAccuracyTrendChart = drawAccuracyTrendChart;
window.drawBreakdownTrendChart = drawBreakdownTrendChart;
window.renderAccuracyTrendChart = drawAccuracyTrendChart;

// Responsive resize listener for canvas charts
window.addEventListener("resize", () => {
  if (typeof activeView !== "undefined") {
    if (activeView === "pm-dashboard") {
      drawPmAvailTrendChart();
      drawPmConditionDistChart();
    } else if (activeView === "pm-accuracy") {
      drawAccuracyTrendChart();
    } else if (activeView === "pm-abnormality") {
      drawBreakdownTrendChart();
    }
  }
});
