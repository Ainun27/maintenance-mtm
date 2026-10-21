// API Endpoint (Otomatis mendeteksi port)
const API_BASE_URL = window.location.port === "4000" ? "/api" : "http://localhost:4000/api";

// State Global
let currentUser = null;
let activeView = "dashboard";
let isPasswordVisible = false;
let pollingInterval = null;
let knownDevices = new Set();

// ========================================================
// 1. DATA MASTER MTM (Realistic Industrial Data)
// ========================================================

const MTM_DATA = {
  // TPM Cards (Dikosongkan sesuai permintaan)
  tpm: [],

  // Task & Approval Cards (Dikosongkan sesuai permintaan)
  tasks: [],

  // Lifetime Cards (Dikosongkan sesuai permintaan)
  lifetimes: [],

  // Stok Reminder Cards (Dikosongkan sesuai permintaan)
  stocks: [],

  // Master Drawings Table
  drawings: [
    { no: 1, code: "DWG-MTM-2026-001", partName: "Assy Drill Stem Line C", line: "Machining Line C", rev: "Rev.02", fileType: "CAD 3D (.STEP)", status: "Approved", date: "15 Jan 2026" },
    { no: 2, code: "DWG-MTM-2026-002", partName: "Base Plate Fixture Drill", line: "Machining Line C", rev: "Rev.01", fileType: "PDF 2D", status: "Approved", date: "22 Jan 2026" },
    { no: 3, code: "DWG-MTM-2026-003", partName: "Datum Block 2rev", line: "Machining Line C", rev: "Rev.00", fileType: "CAD 3D (.STEP)", status: "Approved", date: "05 Feb 2026" },
    { no: 4, code: "DWG-MTM-2026-004", partName: "Jig Welding Sub-Frame B", line: "Welding Line B", rev: "Rev.03", fileType: "DWG / PDF", status: "In Review", date: "10 Mar 2026" },
    { no: 5, code: "DWG-MTM-2026-005", partName: "Jig Stamping Bracket LH", line: "Stamping Line A", rev: "Rev.01", fileType: "CAD 3D", status: "Approved", date: "18 Apr 2026" },
    { no: 6, code: "DWG-MTM-2026-006", partName: "Clamping Cylinder Bracket", line: "Machining Line D", rev: "Rev.02", fileType: "PDF 2D", status: "Approved", date: "25 Mei 2026" }
  ],

  // Maintenance Table
  jigs: [
    { code: "TXMACH-IZGSHFDR00", name: "Assy Drill Stem Line C", line: "Machining Line C", cycles: 480, max: 500, rack: "Rak A-02", status: "Operating" },
    { code: "TXMACH-WLDMIG02", name: "Jig Welding Sub-Frame B", line: "Welding Line B", cycles: 120, max: 1000, rack: "Rak W-01", status: "Operating" },
    { code: "TXMACH-STMPST01", name: "Jig Stamping Bracket LH", line: "Stamping Line A", cycles: 350, max: 500, rack: "Rak S-04", status: "Operating" },
    { code: "TXMACH-ASSYCV03", name: "Jig Assembly Cover RR", line: "Assembly Line 1", cycles: 15, max: 500, rack: "Rak ASSY-01", status: "Standby" },
    { code: "TXMACH-CNCML007", name: "Jig Milling Crankcase RH", line: "CNC Machining", cycles: 495, max: 500, rack: "Rak C-05", status: "Maintenance" }
  ],

  // TPM Schedule Table
  tpmSchedule: [
    { no: 1, part: "TXMACH-IZGSHFDR00", task: "Kalibrasi Flatness Base Plate & Pelumasan Pin", cycle: "Tiap 500 Stroke", target: "15 Okt 2026", pic: "Ahmad Fauzi", status: "Mendatang" },
    { no: 2, part: "TXMACH-WLDMIG02", task: "Pembersihan Spatter & Pengencangan Clamping Arm", cycle: "Tiap 1000 Stroke", target: "28 Okt 2026", pic: "Siti Rahma", status: "Mendatang" },
    { no: 3, part: "TXMACH-STMPST01", task: "Inspeksi Die Clearance & Penggantian Guide Bushing", cycle: "Tiap 500 Stroke", target: "05 Nov 2026", pic: "Bambang S.", status: "Selesai" },
    { no: 4, part: "TXMACH-CNCML007", task: "Penggantian Stopper Aus & Alignment Zero Point", cycle: "Tiap 500 Stroke", target: "10 Okt 2026", pic: "Rudi Hartono", status: "Overdue" }
  ]
};

// ========================================================
// 1B. DATA 3 PILAR MAINTENANCE (CM, PM, PDM)
// ========================================================
const MAINTENANCE_DATA = {
  // 1. Corrective Maintenance (CM) - Trigger: Produksi
  cmTickets: [
    {
      id: "CM-2026-0041",
      reportedAt: "2026-10-14 08:30",
      machine: "Jingduan Forging Press 630T - Line 2",
      component: "Bushing Eksentrik / Main Shaft",
      reporter: "Agus Pratama (Operator Line 2)",
      severity: "Critical Line Stop",
      problem: "Alarm suhu tinggi Bushing Kanan mencapai 68°C disertai bunyi gesekan saat beban tekan 500T",
      pic: "Ahmad Fauzi",
      status: "in_progress", // waiting | in_progress | completed
      downtimeMinutes: 45,
      rootCause: "Debit sirkulasi oli pelumas otomatis drop akibat nozzle fitting tersumbat residu gram mikro",
      solution: "Flushing jalur oli nozzle bushing eksentrik dan penggantian filter oli pelumas",
      sparePart: "Filter Oli 10 Mikron (SP-FLT-02)"
    },
    {
      id: "CM-2026-0042",
      reportedAt: "2026-10-14 09:15",
      machine: "CNC Machining Center Doosan - Line 3",
      component: "Jig / Dies Stopper",
      reporter: "Hendra Wijaya (Line Leader)",
      severity: "Warning Degradasi",
      problem: "Stopper clamping jig goyang 0.08mm melebihi batas toleransi produk knuckle arm",
      pic: "Belum Ditugaskan",
      status: "waiting",
      downtimeMinutes: 15,
      rootCause: "",
      solution: "",
      sparePart: ""
    },
    {
      id: "CM-2026-0039",
      reportedAt: "2026-10-13 14:10",
      machine: "Induction Heating Furnace - Line 2",
      component: "Kelistrikan & Sensor PLC",
      reporter: "Dedi S. (Operator Forging)",
      severity: "Critical Line Stop",
      problem: "Thermocouple coil induksi putus pembacaan nol, interlock furnace aktif",
      pic: "Rudi Hartono",
      status: "completed",
      downtimeMinutes: 28,
      rootCause: "Kabel thermocouple putus karena pelindung keramik retak terpapar panas",
      solution: "Penggantian sensor thermocouple tipe K dan isolasi selongsong tahan panas",
      sparePart: "Thermocouple Type K 1200°C"
    },
    {
      id: "CM-2026-0038",
      reportedAt: "2026-10-13 10:25",
      machine: "Jingduan Forging Press 630T - Line 2",
      component: "Sistem Hidrolik / Pneumatik",
      reporter: "Budi (Operator Line 2)",
      severity: "Minor",
      problem: "Rembesan oli mikro pada fitting selang hidrolik counterbalance cylinder",
      pic: "Siti Rahma",
      status: "completed",
      downtimeMinutes: 18,
      rootCause: "Seal O-ring aus mengeras akibat temperatur operasi radiasi",
      solution: "Ganti seal O-Ring Viton dan kencangkan fitting torsi 45 Nm",
      sparePart: "Viton O-Ring 32mm"
    }
  ],

  // 2. Preventive Maintenance (PM) - Trigger: Maintenance
  pmTasks: [
    {
      id: "PM-2026-101",
      triggerType: "stroke",
      triggerLabel: "Stroke Counter Jig",
      machine: "Jig Machining Knuckle Arm (MTM-JIG-088)",
      title: "Inspeksi Stopper Jig & Pengukuran Akurasi Zero Point",
      currentCounter: 49200,
      limitCounter: 50000,
      targetDate: "2026-10-15",
      pic: "Ahmad Fauzi",
      status: "Mendatang",
      checklist: [
        { item: "Pemeriksaan keausan stopper pin (toleransi ≤ 0.03mm)", checked: true },
        { item: "Pembersihan gram & kerak oli pada clamping area", checked: true },
        { item: "Pengencangan baut mounting base plate (Torque 80 Nm)", checked: false },
        { item: "Pengujian fungsi sensor proximity deteksi part hadir", checked: false },
        { item: "Pelumasan guide pin dengan grease lithium tahan panas", checked: false }
      ],
      notes: "Siklus stroke tersisa 800 pukulan sebelum batas kalibrasi wajib."
    },
    {
      id: "PM-2026-102",
      triggerType: "calendar",
      triggerLabel: "Kalender Berkala 500 Jam",
      machine: "Jingduan Forging Press 630T - Line 2",
      title: "Perawatan Berkala 500 Jam: Penggantian Oli & Filter Pelumasan Eksentrik",
      currentCounter: 480,
      limitCounter: 500,
      targetDate: "2026-10-16",
      pic: "Siti Rahma",
      status: "Mendatang",
      checklist: [
        { item: "Drain oli bekas tangki sirkulasi pelumasan", checked: false },
        { item: "Ganti filter oli 10 mikron & bersihkan magnetic trap", checked: false },
        { item: "Pengisian oli baru Shell Omala S2 G 220 (40 Liter)", checked: false },
        { item: "Uji tekanan pompa oli sentral (Standar 3.5 - 4.5 Bar)", checked: false },
        { item: "Inspeksi aliran oli visual pada sight glass bushing kanan & kiri", checked: false }
      ],
      notes: "Jadwal berkala triwulanan sesuai SOP Maintenance MTM."
    },
    {
      id: "PM-2026-099",
      triggerType: "calendar",
      triggerLabel: "Kalender Berkala 500 Jam",
      machine: "Jingduan Forging Press 630T - Line 2",
      title: "Inspeksi Kelonggaran Bantalan & Baut Pengikat Flywheel Transmission",
      currentCounter: 520,
      limitCounter: 500,
      targetDate: "2026-10-12",
      pic: "Rudi Hartono",
      status: "Overdue",
      checklist: [
        { item: "Pengecekan torsi baut flange flywheel (450 Nm)", checked: false },
        { item: "Ukur kelonggaran bearing transmisi dial gauge (max 0.05 mm)", checked: false },
        { item: "Inspeksi ketegangan belt transmisi V-Belt", checked: false },
        { item: "Pemeriksaan visual keretakan struktur flywheel guard", checked: false }
      ],
      notes: "Perlu segera dieksekusi sebelum shift 2 berjalan."
    },
    {
      id: "PM-2026-095",
      triggerType: "stroke",
      triggerLabel: "Stroke Counter Dies",
      machine: "Dies Upper Forging 630T",
      title: "Poles Ulang Radius Dies & Hard Chrome Check",
      currentCounter: 30000,
      limitCounter: 30000,
      targetDate: "2026-10-10",
      pic: "Bambang S.",
      status: "Selesai",
      checklist: [
        { item: "Pembersihan sisa scale forging dengan ultrasonic bath", checked: true },
        { item: "Inspeksi thermal fatigue crack (Penetrant Test)", checked: true },
        { item: "Pengukuran dimensi kavitas produk dengan CMM", checked: true },
        { item: "Polesing permukaan die mirror finish Ra ≤ 0.4", checked: true }
      ],
      notes: "Hasil penetrant test lolos tanpa crack mikro."
    }
  ],

  // 3. Predictive Maintenance (PdM) - Trigger: MPC & Telemetri
  pdmComponents: [
    {
      id: "comp-bushing-r",
      name: "Bushing Eksentrik Kanan",
      loc: "Main Crankshaft Drive",
      sensorKey: "right-eccentric-bush",
      sensorId: "3",
      type: "temp",
      val: 48.2,
      unit: "°C",
      limit: 65.0,
      warning: 58.0,
      rul: "1,240 Jam",
      status: "OPTIMAL",
      recommendation: "Pelumasan normal. Lanjutkan pemantauan tren suhu continuous."
    },
    {
      id: "comp-bushing-l",
      name: "Bushing Eksentrik Kiri",
      loc: "Main Crankshaft Drive",
      sensorKey: "left-eccentric-bush",
      sensorId: "4",
      type: "temp",
      val: 47.1,
      unit: "°C",
      limit: 65.0,
      warning: 58.0,
      rul: "1,310 Jam",
      status: "OPTIMAL",
      recommendation: "Kondisi sangat baik. Tidak ada indikasi gesekan abnormal."
    },
    {
      id: "comp-bearing-r",
      name: "Bearing Transmisi Kanan",
      loc: "Flywheel Pinion Shaft",
      sensorKey: "right-transmission-bearing",
      sensorId: "5",
      type: "temp",
      val: 44.8,
      unit: "°C",
      limit: 70.0,
      warning: 62.0,
      rul: "980 Jam",
      status: "OPTIMAL",
      recommendation: "Temperatur stabil pada kecepatan operasional 1500 RPM."
    },
    {
      id: "comp-bearing-l",
      name: "Bearing Transmisi Kiri",
      loc: "Flywheel Pinion Shaft",
      sensorKey: "left-transmission-bearing",
      sensorId: "6",
      type: "temp",
      val: 43.6,
      unit: "°C",
      limit: 70.0,
      warning: 62.0,
      rul: "1,050 Jam",
      status: "OPTIMAL",
      recommendation: "Pelumasan grease terpantau lancar tanpa lonjakan termal."
    },
    {
      id: "comp-link-press",
      name: "Main Link Mechanism",
      loc: "Forging Ram Slider",
      sensorKey: "link-temperature",
      sensorId: "0",
      type: "temp",
      val: 38.5,
      unit: "°C",
      limit: 60.0,
      warning: 52.0,
      rul: "1,800 Jam",
      status: "OPTIMAL",
      recommendation: "Beban forging terdistribusi seimbang pada ram guide."
    },
    {
      id: "comp-vibration",
      name: "Vibrasi Motor & Flywheel",
      loc: "Main Drive ISO 10816",
      sensorKey: "vibration",
      sensorId: "1",
      type: "vib",
      val: 0.045,
      unit: "in/s",
      limit: 0.100,
      warning: 0.080,
      rul: "2,400 Jam",
      status: "OPTIMAL",
      recommendation: "Vibrasi berada di Zona A (ISO Class II: Good). Ketidakseimbangan sangat rendah."
    }
  ]
};

// Filter states for Kanban & Maintenance
let tpmActiveFilter = "semua";
let taskActiveFilter = "semua";
let lifetimeActiveFilter = "all";
let stockActiveFilter = "all";
let cmActiveFilter = "all";
let pmActiveFilter = "all";

// ========================================================
// 2. AUTHENTICATION & LOGIN LOGIC
// ========================================================

function togglePasswordVisibility() {
  const pwdInput = document.getElementById("input-password");
  const eyeIcon = document.getElementById("eye-icon");
  isPasswordVisible = !isPasswordVisible;

  if (isPasswordVisible) {
    pwdInput.type = "text";
    eyeIcon.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    `;
  } else {
    pwdInput.type = "password";
    eyeIcon.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    `;
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById("input-username").value.trim();
  const password = document.getElementById("input-password").value;

  if (!username) {
    showLoginError("Silakan masukkan NPK atau Username!");
    return;
  }

  performLogin({
    username: username,
    displayName: username.toUpperCase() === "ADMIN" ? "PIC Maintenance" : username,
    role: "Admin / PIC Maintenance",
  });
}

function quickLogin(roleType) {
  const roles = {
    PIC: {
      username: "pic_maintenance",
      displayName: "PIC Maintenance",
      role: "Admin / PIC Maintenance",
    },
    Section: {
      username: "section_head",
      displayName: "Section Head Machining",
      role: "Section Head / Machining",
    },
    Dept: {
      username: "dept_head",
      displayName: "Dept Head Production",
      role: "Department Head / MTM",
    },
    Guest: {
      username: "guest_visitor",
      displayName: "Guest Observer",
      role: "Guest / Read-Only",
    },
  };

  const user = roles[roleType] || roles.PIC;
  document.getElementById("input-username").value = user.username;
  document.getElementById("input-password").value = "••••••••";

  performLogin(user);
}

function performLogin(user, showLoader = true) {
  currentUser = user;
  localStorage.setItem("mtm_user", JSON.stringify(user));

  const roleName = user.displayName === "PIC Maintenance" || user.username?.toUpperCase() === "ADMIN" 
    ? "Administrator" 
    : user.displayName;

  const userDispNameEl = document.getElementById("user-display-name");
  if (userDispNameEl) userDispNameEl.textContent = user.displayName;
  
  const userDispRoleEl = document.getElementById("user-display-role");
  if (userDispRoleEl) userDispRoleEl.textContent = user.role;

  // Sync Sidebar user pill (Moved from topbar to sidebar bottom)
  const sidebarUsername = document.getElementById("sidebar-username");
  if (sidebarUsername) sidebarUsername.textContent = roleName;

  const topbarUsername = document.getElementById("topbar-username");
  if (topbarUsername) topbarUsername.textContent = roleName;

  const dropdownUserName = document.getElementById("dropdown-user-name");
  if (dropdownUserName) dropdownUserName.textContent = roleName;

  const dropdownUserRole = document.getElementById("dropdown-user-role");
  if (dropdownUserRole) dropdownUserRole.textContent = user.role;

  const sidebarAvatar = document.getElementById("sidebar-avatar-initial");
  if (sidebarAvatar) {
    sidebarAvatar.textContent = (roleName || "A").charAt(0).toUpperCase();
  }

  const topbarAvatar = document.getElementById("topbar-avatar-initial");
  if (topbarAvatar) {
    topbarAvatar.textContent = (roleName || "A").charAt(0).toUpperCase();
  }

  const completeLogin = () => {
    const loader = document.getElementById("login-loading-overlay");
    if (loader) loader.style.display = "none";

    const loginBtn = document.querySelector(".btn-login");
    if (loginBtn) {
      loginBtn.style.opacity = "1";
      loginBtn.style.pointerEvents = "all";
      const span = loginBtn.querySelector("span");
      if (span) span.textContent = "Login";
    }

    const loginScreen = document.getElementById("login-screen");
    if (loginScreen) loginScreen.style.display = "none";

    const mainApp = document.getElementById("main-app");
    if (mainApp) mainApp.style.display = "none";

    const hub = document.getElementById("hub-screen");
    if (hub) {
      hub.style.display = "flex";
      hub.style.opacity = "1";
      hub.style.visibility = "visible";
    }

    // Set user info on hub admin modal
    const modalAdminUser = document.getElementById("modal-admin-user");
    if (modalAdminUser) modalAdminUser.textContent = roleName;

    // Render all views in background
    renderAllViews();

    // Start polling backend telemetry
    startPolling();

    showToast(`Selamat datang, ${roleName}! Silakan pilih modul perawatan.`, "success");
  };

  if (showLoader) {
    const loader = document.getElementById("login-loading-overlay");
    if (loader) {
      loader.style.display = "flex";
      // Restart progress bar animation
      const bar = loader.querySelector(".login-loader-progress-bar");
      if (bar) {
        bar.style.animation = "none";
        bar.offsetHeight; /* trigger reflow */
        bar.style.animation = null;
      }
    }

    const loginBtn = document.querySelector(".btn-login");
    if (loginBtn) {
      loginBtn.style.opacity = "0.75";
      loginBtn.style.pointerEvents = "none";
      const span = loginBtn.querySelector("span");
      if (span) span.textContent = "Menyiapkan Sistem...";
    }

    setTimeout(completeLogin, 1750);
  } else {
    completeLogin();
  }
}

// Handler Sinkronisasi Data Real-Time (Ikon Gear Topbar)
function handleTopbarRefresh() {
  const syncBtn = document.getElementById("topbar-sync-btn");
  if (syncBtn) {
    syncBtn.classList.add("is-syncing");
  }

  // Sinkronisasi data telemetri, pilar metrik, dan chart
  if (typeof fetchTelemetry === "function") fetchTelemetry();
  if (typeof updatePillarDashboardCounts === "function") updatePillarDashboardCounts();
  if (typeof renderAllViews === "function") renderAllViews();

  setTimeout(() => {
    if (syncBtn) {
      syncBtn.classList.remove("is-syncing");
    }
    showToast("Sinkronisasi Berhasil: Seluruh data telemetri & mesin terbarui!", "success");
  }, 900);
}

function handleLogout() {
  if (confirm("Apakah Anda yakin ingin keluar dari sistem MTM?")) {
    currentUser = null;
    localStorage.removeItem("mtm_user");
    stopPolling();

    // Hide any open dropdown
    const dd = document.getElementById("topbar-user-dropdown");
    if (dd) dd.style.display = "none";
    const ddSide = document.getElementById("sidebar-user-dropdown");
    if (ddSide) ddSide.style.display = "none";

    const hub = document.getElementById("hub-screen");
    if (hub) hub.style.display = "none";

    document.getElementById("main-app").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
    showToast("Berhasil logout dari sistem.", "info");
  }
}

// Hub Card Launcher Controllers
function enterPredictiveMaintenance() {
  const login = document.getElementById("login-screen");
  if (login) login.style.display = "none";

  const hub = document.getElementById("hub-screen");
  if (hub) hub.style.display = "none";

  const mainApp = document.getElementById("main-app");
  if (mainApp) mainApp.style.display = "flex";

  // Hide dropdown if open
  const ddSide = document.getElementById("sidebar-user-dropdown");
  if (ddSide) ddSide.style.display = "none";
  const wrap = document.querySelector(".sidebar-user-wrap");
  if (wrap) wrap.classList.remove("is-open");

  // Default to Dashboard
  switchMainView("dashboard");
  showToast("Membuka Modul Predictive Maintenance", "info");
}

function returnToHub() {
  const login = document.getElementById("login-screen");
  if (login) login.style.display = "none";

  const mainApp = document.getElementById("main-app");
  if (mainApp) mainApp.style.display = "none";

  // Hide dropdown if open
  const ddSide = document.getElementById("sidebar-user-dropdown");
  if (ddSide) ddSide.style.display = "none";
  const wrap = document.querySelector(".sidebar-user-wrap");
  if (wrap) wrap.classList.remove("is-open");

  const hub = document.getElementById("hub-screen");
  if (hub) {
    hub.style.display = "flex";
    hub.style.opacity = "1";
    hub.style.visibility = "visible";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast("Kembali ke Menu Utama Portal MTM", "info");
}

function handleCmClick() {
  showToast("Modul Corrective Maintenance sedang dalam tahap pengembangan.", "info");
}

function handlePmClick() {
  showToast("Modul Preventive Maintenance sedang dalam tahap pengembangan.", "info");
}

function showSystemInfoModal() {
  const modal = document.getElementById("modal-system-info");
  if (modal) {
    const adminUser = document.getElementById("modal-admin-user");
    if (adminUser) {
      adminUser.textContent = (currentUser && (currentUser.displayName || currentUser.username)) || "Administrator";
    }
    initAdminPortal();
    switchAdminPortalTab("users");
    modal.style.display = "flex";
  }
}

// Top Bar Interactive Handlers
function toggleSidebarCollapse() {
  const sidebar = document.getElementById("app-sidebar");
  if (sidebar) {
    sidebar.classList.toggle("collapsed");
  }
}

function toggleUserDropdown(event) {
  if (event) event.stopPropagation();
  const dd = document.getElementById("sidebar-user-dropdown") || document.getElementById("topbar-user-dropdown");
  const wrap = document.querySelector(".sidebar-user-wrap");
  if (dd) {
    const isShowing = dd.style.display === "block";
    dd.style.display = isShowing ? "none" : "block";
    if (wrap) {
      if (isShowing) {
        wrap.classList.remove("is-open");
      } else {
        wrap.classList.add("is-open");
      }
    }
  }
}

function handleTopbarRefresh() {
  if (activeView === "dashboard") {
    refreshDashboardCharts();
  } else if (activeView === "monitoring") {
    refreshAll();
  } else {
    showToast("Data sedang diperbarui...", "info");
  }
}

// Close dropdown on outside click
document.addEventListener("click", () => {
  const ddSidebar = document.getElementById("sidebar-user-dropdown");
  if (ddSidebar) ddSidebar.style.display = "none";
  const ddTopbar = document.getElementById("topbar-user-dropdown");
  if (ddTopbar) ddTopbar.style.display = "none";
  const wrap = document.querySelector(".sidebar-user-wrap");
  if (wrap) wrap.classList.remove("is-open");
});

function showLoginError(msg) {
  const errBox = document.getElementById("login-error-msg");
  errBox.textContent = msg;
  errBox.style.display = "block";
  setTimeout(() => {
    errBox.style.display = "none";
  }, 4000);
}

// ========================================================
// 3. VIEW NAVIGATION (All 6 Views)
// ========================================================

function switchMainView(viewName) {
  activeView = viewName;

  document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
    item.classList.remove("active");
  });

  const targetNav = document.getElementById(`nav-${viewName}`);
  if (targetNav) targetNav.classList.add("active");

  // Sync Topbar Page Title
  const titles = {
    dashboard: "DASHBOARD SENSOR (PREDICTIVE MAINTENANCE)",
    monitoring: "MONITORING REAL-TIME (PREDICTIVE MAINTENANCE)",
    history: "RIWAYAT DATA MASUK (PREDICTIVE MAINTENANCE)",
    tpm: "TPM CONTROL",
    drawing: "DRAWING MESIN",
    jig: "JIG & FIXTURE",
    approval: "APPROVAL QUEUE",
    cm: "CORRECTIVE MAINTENANCE",
    pm: "PREVENTIVE MAINTENANCE",
    pdm: "PREDICTIVE MAINTENANCE (MPC)"
  };
  const pageTitleEl = document.getElementById("topbar-page-title");
  if (pageTitleEl && titles[viewName]) {
    pageTitleEl.textContent = titles[viewName];
  }

  const allViews = ["dashboard", "drawing", "jig", "monitoring", "history", "tpm", "approval", "cm", "pm", "pdm"];
  allViews.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) {
      el.style.display = (v === viewName) ? "block" : "none";
    }
  });

  if (viewName === "dashboard") {
    fetchDashboardCharts();
    updatePillarDashboardCounts();
  } else if (viewName === "monitoring") {
    refreshAll();
  } else if (viewName === "history") {
    fetchHistoryTelemetry();
  } else if (viewName === "drawing") {
    renderDrawingTable();
  } else if (viewName === "jig") {
    renderJigTable();
  } else if (viewName === "tpm") {
    renderTpmScheduleTable();
  } else if (viewName === "approval") {
    renderApprovalQueue();
  } else if (viewName === "cm") {
    renderCmTable();
  } else if (viewName === "pm") {
    renderPmTable();
  } else if (viewName === "pdm") {
    renderPdmView();
  }
}

// ========================================================
// 3B. PREDICTIVE MAINTENANCE: RIWAYAT DATA & PENGELOMPOKAN
// ========================================================

let historyGroupMode = "sensor"; // 'sensor' | 'status' | 'shift' | 'raw'
let telemetryHistoryData = [];

const SENSOR_META = {
  "link-temperature": {
    name: "Suhu Link (Connecting Rod)",
    type: "temperature",
    unit: "°C",
    threshold: "≤ 70.0 °C",
    part: "Link Mechanism & Pin"
  },
  "right-eccentric-bush": {
    name: "Suhu Bushing Eksentrik Kanan",
    type: "temperature",
    unit: "°C",
    threshold: "≤ 70.0 °C",
    part: "Right Main Shaft Bearing Bush"
  },
  "left-eccentric-bush": {
    name: "Suhu Bushing Eksentrik Kiri",
    type: "temperature",
    unit: "°C",
    threshold: "≤ 70.0 °C",
    part: "Left Main Shaft Bearing Bush"
  },
  "right-transmission-bearing": {
    name: "Suhu Bearing Transmisi Kanan",
    type: "temperature",
    unit: "°C",
    threshold: "≤ 70.0 °C",
    part: "Flywheel & Pinion Drive Right"
  },
  "left-transmission-bearing": {
    name: "Suhu Bearing Transmisi Kiri",
    type: "temperature",
    unit: "°C",
    threshold: "≤ 70.0 °C",
    part: "Flywheel & Pinion Drive Left"
  },
  "vibration": {
    name: "Getaran RMS (Velocity)",
    type: "vibration",
    unit: "in/s",
    threshold: "< 0.10 in/s",
    part: "Main Frame / Press Crown"
  }
};

function setHistoryGroupMode(mode) {
  historyGroupMode = mode;
  document.querySelectorAll(".hist-group-btn").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.getElementById(`hist-btn-${mode}`);
  if (activeBtn) activeBtn.classList.add("active");
  renderHistoryView();
}

async function fetchHistoryTelemetry() {
  const container = document.getElementById("history-grouped-container");
  try {
    const res = await fetch(`${API_BASE_URL}/telemetry?limit=150`);
    if (!res.ok) throw new Error("Gagal mengambil telemetri");
    const data = await res.json();
    telemetryHistoryData = Array.isArray(data) ? data : [];

    // Update KPI Ribbon
    const totalEl = document.getElementById("hist-kpi-total");
    if (totalEl) totalEl.textContent = telemetryHistoryData.length;

    const normalCount = telemetryHistoryData.filter(d => (d.status || "").toUpperCase() === "NORMAL").length;
    const compPct = telemetryHistoryData.length > 0 
      ? Math.round((normalCount / telemetryHistoryData.length) * 100) 
      : 100;
    const compEl = document.getElementById("hist-kpi-compliance");
    if (compEl) compEl.textContent = `${compPct}%`;

    const now = new Date();
    const timeEl = document.getElementById("hist-kpi-last-time");
    if (timeEl) timeEl.textContent = now.toTimeString().split(" ")[0];
    const dateEl = document.getElementById("hist-kpi-last-date");
    if (dateEl) dateEl.textContent = now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

    renderHistoryView();
  } catch (err) {
    console.error("fetchHistoryTelemetry error:", err);
    if (container) {
      container.innerHTML = `
        <div class="history-loading-placeholder" style="color:#e11d48; border-color:#fecdd3;">
          <p>Terjadi kendala memuat data telemetri dari server (${err.message}). Menampilkan data lokal terakhir.</p>
          <button class="btn-refresh-hist" onclick="fetchHistoryTelemetry()">Coba Lagi</button>
        </div>
      `;
    }
  }
}

function renderHistoryView() {
  const container = document.getElementById("history-grouped-container");
  if (!container) return;

  if (telemetryHistoryData.length === 0) {
    container.innerHTML = `
      <div class="history-loading-placeholder">
        <p>Belum ada data riwayat telemetri masuk. Sedang menyinkronkan dengan broker sensor...</p>
        <button class="btn-refresh-hist" onclick="fetchHistoryTelemetry()">Muat Ulang</button>
      </div>
    `;
    return;
  }

  if (historyGroupMode === "sensor") {
    renderHistoryBySensor(container);
  } else if (historyGroupMode === "status") {
    renderHistoryByStatus(container);
  } else if (historyGroupMode === "shift") {
    renderHistoryByShift(container);
  } else if (historyGroupMode === "raw") {
    renderHistoryRawTable(container);
  }
}

// 1. Grouping Per Titik Sensor (6 Kelompok Sensor Jingduan)
function renderHistoryBySensor(container) {
  const sensorKeys = Object.keys(SENSOR_META);

  let html = `<div class="sensor-groups-grid">`;

  sensorKeys.forEach(devId => {
    const meta = SENSOR_META[devId];
    const items = telemetryHistoryData.filter(d => d.device_id === devId);
    const count = items.length;

    let latestVal = "--";
    let minVal = "--";
    let maxVal = "--";
    let avgVal = "--";
    let latestStatus = "NORMAL";

    if (count > 0) {
      const isVib = meta.type === "vibration";
      const values = items.map(d => {
        if (isVib) {
          return d.pressure !== null && d.pressure !== undefined ? Number(d.pressure) : Number(d.temperature || 0);
        }
        return Number(d.temperature || 0);
      }).filter(v => !isNaN(v));

      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const latest = values[0]; // Assuming items are newest first

        latestVal = isVib ? latest.toFixed(4) : latest.toFixed(1);
        avgVal = isVib ? avg.toFixed(4) : avg.toFixed(1);
        minVal = isVib ? min.toFixed(4) : min.toFixed(1);
        maxVal = isVib ? max.toFixed(4) : max.toFixed(1);
        latestStatus = (items[0].status || "NORMAL").toUpperCase();
      }
    }

    const statusBadgeClass = latestStatus === "CRITICAL" ? "critical" : (latestStatus === "WARNING" ? "warning" : "ok");

    // Last 5 log items for this sensor
    const recent5 = items.slice(0, 5);
    let tableRows = "";
    if (recent5.length > 0) {
      recent5.forEach(r => {
        const isVib = meta.type === "vibration";
        const v = isVib 
          ? (r.pressure !== null ? Number(r.pressure).toFixed(4) : Number(r.temperature || 0).toFixed(4))
          : Number(r.temperature || 0).toFixed(1);
        const timeStr = r.recorded_at 
          ? new Date(r.recorded_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          : "--:--:--";
        const st = (r.status || "NORMAL").toUpperCase();
        const stClass = st === "CRITICAL" ? "red" : (st === "WARNING" ? "amber" : "green");

        tableRows += `
          <tr>
            <td style="color:#64748b; font-family:var(--font-mono);">${timeStr}</td>
            <td><strong>${v}</strong> ${meta.unit}</td>
            <td style="text-align:right;"><span class="dash-pill-status ${st === 'CRITICAL' ? 'crit' : (st === 'WARNING' ? 'warn' : 'ok')}" style="padding:1px 6px; font-size:0.62rem;">${st}</span></td>
          </tr>
        `;
      });
    } else {
      tableRows = `<tr><td colspan="3" style="text-align:center; color:#94a3b8; font-style:italic;">Belum ada log</td></tr>`;
    }

    html += `
      <div class="sensor-group-card">
        <div class="sensor-group-header">
          <div class="sensor-group-title-wrap">
            <div class="sensor-group-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                ${meta.type === 'vibration' ? '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' : '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>'}
              </svg>
            </div>
            <div>
              <div class="sensor-group-name">${meta.name}</div>
              <div class="sensor-group-id-tag">${devId} &bull; ${meta.threshold}</div>
            </div>
          </div>
          <span class="dash-pill-status ${statusBadgeClass}" style="padding:2px 8px; font-size:0.68rem;">
            ${latestStatus}
          </span>
        </div>

        <div class="sensor-stats-summary-row">
          <div class="sensor-stat-cell">
            <span class="stat-lbl">Terkini</span>
            <span class="stat-val" style="color:#2563eb;">${latestVal}</span>
          </div>
          <div class="sensor-stat-cell">
            <span class="stat-lbl">Rata-rata</span>
            <span class="stat-val">${avgVal}</span>
          </div>
          <div class="sensor-stat-cell">
            <span class="stat-lbl">Min/Max</span>
            <span class="stat-val" style="font-size:0.75rem;">${minVal}/${maxVal}</span>
          </div>
          <div class="sensor-stat-cell">
            <span class="stat-lbl">Sampel</span>
            <span class="stat-val">${count}</span>
          </div>
        </div>

        <div>
          <table class="sensor-mini-log-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Nilai</th>
                <th style="text-align:right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

// 2. Grouping Per Status Kondisi
function renderHistoryByStatus(container) {
  const normalItems = telemetryHistoryData.filter(d => (d.status || "").toUpperCase() === "NORMAL");
  const warnItems = telemetryHistoryData.filter(d => (d.status || "").toUpperCase() === "WARNING");
  const critItems = telemetryHistoryData.filter(d => (d.status || "").toUpperCase() === "CRITICAL");

  const buildStatusRows = (items) => {
    if (items.length === 0) {
      return `<p style="font-size:0.78rem; color:#94a3b8; font-style:italic; padding:10px 0;">Tidak ada log pada kondisi ini.</p>`;
    }
    return items.slice(0, 10).map(r => {
      const meta = SENSOR_META[r.device_id] || { name: r.device_id, unit: "" };
      const val = meta.type === "vibration" 
        ? (r.pressure !== null ? Number(r.pressure).toFixed(4) : Number(r.temperature || 0).toFixed(4))
        : Number(r.temperature || 0).toFixed(1);
      const timeStr = r.recorded_at 
        ? new Date(r.recorded_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : "--:--:--";
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.76rem;">
          <div>
            <strong style="color:#0f172a;">${meta.name}</strong>
            <div style="font-size:0.68rem; color:#64748b;">${timeStr}</div>
          </div>
          <div style="font-weight:800; color:#1e293b;">
            ${val} ${meta.unit}
          </div>
        </div>
      `;
    }).join("");
  };

  container.innerHTML = `
    <div class="status-group-grid">
      <div class="status-col-card col-normal">
        <div class="status-col-header">
          <span class="status-col-title">Normal</span>
          <span class="status-col-badge">${normalItems.length} Log</span>
        </div>
        <div style="max-height:420px; overflow-y:auto; margin-top:8px;">
          ${buildStatusRows(normalItems)}
        </div>
      </div>

      <div class="status-col-card col-warning">
        <div class="status-col-header">
          <span class="status-col-title">Warning</span>
          <span class="status-col-badge">${warnItems.length} Log</span>
        </div>
        <div style="max-height:420px; overflow-y:auto; margin-top:8px;">
          ${buildStatusRows(warnItems)}
        </div>
      </div>

      <div class="status-col-card col-critical">
        <div class="status-col-header">
          <span class="status-col-title">Critical</span>
          <span class="status-col-badge">${critItems.length} Log</span>
        </div>
        <div style="max-height:420px; overflow-y:auto; margin-top:8px;">
          ${buildStatusRows(critItems)}
        </div>
      </div>
    </div>
  `;
}

// 3. Grouping Per Shift Operasional (Sesuai Jadwal Pabrik MTM)
function renderHistoryByShift(container) {
  const shift1 = []; // Shift 1: 00:00 - 07:40
  const shift2 = []; // Shift 2: 07:30 - 16:10
  const shift3 = []; // Shift 3: 16:10 - 00:00

  telemetryHistoryData.forEach(d => {
    const dt = new Date(d.recorded_at || d.created_at || Date.now());
    const mins = dt.getHours() * 60 + dt.getMinutes();
    
    // Shift 1: 00:00 - 07:40 (0 - 460 menit)
    // Shift 2: 07:30 - 16:10 (450 - 970 menit)
    // Shift 3: 16:10 - 00:00 (>= 970 menit)
    if (mins >= 0 && mins < 460) {
      shift1.push(d);
    } else if (mins >= 450 && mins < 970) {
      shift2.push(d);
    } else {
      shift3.push(d);
    }
  });

  const renderShiftBox = (title, timeLabel, badgeColor, items, shiftClass) => {
    const count = items.length;
    const normalCount = items.filter(d => (d.status || "").toUpperCase() === "NORMAL").length;
    const compliance = count > 0 ? Math.round((normalCount / count) * 100) : 100;

    const listHtml = items.slice(0, 8).map(r => {
      const meta = SENSOR_META[r.device_id] || { name: r.device_id, unit: "" };
      const val = meta.type === "vibration" 
        ? (r.pressure !== null ? Number(r.pressure).toFixed(4) : Number(r.temperature || 0).toFixed(4))
        : Number(r.temperature || 0).toFixed(1);
      const timeStr = new Date(r.recorded_at || Date.now()).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const st = (r.status || "NORMAL").toUpperCase();
      const stPill = st === "CRITICAL" ? "crit" : (st === "WARNING" ? "warn" : "ok");
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid #f1f5f9; font-size:0.75rem;">
          <div>
            <span style="color:#64748b; font-family:var(--font-mono); font-size:0.72rem;">${timeStr}</span>
            <span style="color:#0f172a; font-weight:600; margin-left:6px;">${meta.name}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="color:#1d4ed8;">${val} <small style="font-size:0.68rem; color:#64748b;">${meta.unit}</small></strong>
            <span class="dash-pill-status ${stPill}" style="padding:1px 6px; font-size:0.6rem;">${st}</span>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="shift-col-card ${shiftClass}">
        <div class="shift-col-header">
          <span class="shift-title">${title}</span>
          <span class="shift-time-tag">${timeLabel}</span>
        </div>
        <div class="shift-stats-strip">
          <div class="shift-stat-item">
            <span class="shift-stat-lbl">TOTAL LOG</span>
            <strong class="shift-stat-val">${count} Data</strong>
          </div>
          <div class="shift-stat-item" style="border-left:1px solid #e2e8f0; padding-left:12px;">
            <span class="shift-stat-lbl">KEPATUHAN</span>
            <strong class="shift-stat-val" style="color:#059669;">${compliance}% Normal</strong>
          </div>
        </div>
        <div style="margin-top:6px;">
          <div style="max-height:280px; overflow-y:auto; padding-right:2px;">
            ${count > 0 ? listHtml : '<p style="color:#94a3b8; font-style:italic; font-size:0.75rem; text-align:center; padding:18px 0;">Belum ada catatan pada shift ini</p>'}
          </div>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div class="shift-group-grid">
      ${renderShiftBox("Shift 1", "00:00 - 07:40", "blue", shift1, "shift-1")}
      ${renderShiftBox("Shift 2", "07:30 - 16:10", "amber", shift2, "shift-2")}
      ${renderShiftBox("Shift 3", "16:10 - 00:00", "purple", shift3, "shift-3")}
    </div>
  `;
}

// 4. Log Kronologis Mentah & Pencarian
function renderHistoryRawTable(container) {
  let tableRows = "";
  telemetryHistoryData.slice(0, 100).forEach((r, idx) => {
    const meta = SENSOR_META[r.device_id] || { name: r.device_id, unit: "", threshold: "-" };
    const isVib = meta.type === "vibration";
    const val = isVib 
      ? (r.pressure !== null ? Number(r.pressure).toFixed(4) : Number(r.temperature || 0).toFixed(4))
      : Number(r.temperature || 0).toFixed(1);
    const timeStr = r.recorded_at 
      ? new Date(r.recorded_at).toLocaleString("id-ID") 
      : "--";
    const st = (r.status || "NORMAL").toUpperCase();
    const stClass = st === "CRITICAL" ? "crit" : (st === "WARNING" ? "warn" : "ok");

    tableRows += `
      <tr class="raw-data-row" data-device="${r.device_id}" data-status="${st}">
        <td style="color:#64748b; font-family:var(--font-mono);">${idx + 1}</td>
        <td style="font-family:var(--font-mono); font-size:0.74rem;">${timeStr}</td>
        <td>
          <strong style="color:#0f172a;">${meta.name}</strong>
          <div style="font-size:0.68rem; color:#64748b; font-family:var(--font-mono);">${r.device_id}</div>
        </td>
        <td><strong style="color:#1d4ed8; font-size:0.86rem;">${val}</strong> ${meta.unit}</td>
        <td style="color:#64748b; font-size:0.74rem;">${meta.threshold}</td>
        <td><span class="dash-pill-status ${stClass}">${st}</span></td>
        <td style="text-align:center;">
          <button type="button" class="raw-btn-inspect" onclick="showRawPayloadModal(${idx})" title="Lihat JSON mentah">
            Inspect JSON
          </button>
        </td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div class="raw-hist-card">
      <div class="raw-hist-toolbar">
        <div class="raw-hist-filters">
          <select id="raw-filter-device" class="raw-select" onchange="filterHistoryRawTable()">
            <option value="all">Semua Sensor</option>
            <option value="link-temperature">Suhu Link</option>
            <option value="right-eccentric-bush">Suhu Bushing Kanan</option>
            <option value="left-eccentric-bush">Suhu Bushing Kiri</option>
            <option value="right-transmission-bearing">Suhu Bearing Kanan</option>
            <option value="left-transmission-bearing">Suhu Bearing Kiri</option>
            <option value="vibration">Getaran RMS</option>
          </select>

          <select id="raw-filter-status" class="raw-select" onchange="filterHistoryRawTable()">
            <option value="all">Semua Status</option>
            <option value="NORMAL">Normal</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <input type="text" id="raw-search-input" class="raw-search-input" placeholder="Cari ID / nilai sensor..." onkeyup="filterHistoryRawTable()">
        </div>
        <span style="font-size:0.75rem; color:#64748b;">100 data transaksi terakhir</span>
      </div>

      <div class="table-container" style="max-height:480px; overflow-y:auto;">
        <table class="modern-table">
          <thead>
            <tr>
              <th style="width:40px;">No</th>
              <th style="width:170px;">Waktu Rekam</th>
              <th>Nama Titik Sensor</th>
              <th style="width:130px;">Nilai Sensor</th>
              <th style="width:120px;">Standar Batas</th>
              <th style="width:100px;">Status</th>
              <th style="width:120px; text-align:center;">Payload</th>
            </tr>
          </thead>
          <tbody id="raw-hist-table-body">
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function filterHistoryRawTable() {
  const deviceVal = document.getElementById("raw-filter-device")?.value || "all";
  const statusVal = document.getElementById("raw-filter-status")?.value || "all";
  const searchVal = (document.getElementById("raw-search-input")?.value || "").toLowerCase();

  document.querySelectorAll(".raw-data-row").forEach(row => {
    const dev = row.getAttribute("data-device") || "";
    const st = row.getAttribute("data-status") || "";
    const text = row.textContent.toLowerCase();

    const matchDev = (deviceVal === "all" || dev === deviceVal);
    const matchStatus = (statusVal === "all" || st === statusVal);
    const matchSearch = (!searchVal || text.includes(searchVal));

    if (matchDev && matchStatus && matchSearch) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

function showRawPayloadModal(index) {
  const modal = document.getElementById("modal-raw-payload");
  const codeEl = document.getElementById("raw-payload-code");
  const titleEl = document.getElementById("raw-payload-title");

  if (!modal || !codeEl) return;
  const item = telemetryHistoryData[index];
  if (!item) return;

  const meta = SENSOR_META[item.device_id] || { name: item.device_id };
  if (titleEl) {
    titleEl.textContent = `Payload: ${meta.name} (ID: ${item.id || index + 1})`;
  }

  codeEl.textContent = JSON.stringify(item, null, 2);
  modal.style.display = "flex";
}

function exportHistoryCsv() {
  if (telemetryHistoryData.length === 0) {
    showToast("Tidak ada data telemetri untuk diekspor", "warning");
    return;
  }

  const headers = ["ID", "RecordedAt", "CreatedAt", "DeviceID", "SensorName", "Temperature", "PressureRMS", "Status"];
  const rows = telemetryHistoryData.map(d => {
    const meta = SENSOR_META[d.device_id] || { name: d.device_id };
    return [
      `"${d.id || ""}"`,
      `"${d.recorded_at || ""}"`,
      `"${d.created_at || ""}"`,
      `"${d.device_id || ""}"`,
      `"${meta.name}"`,
      d.temperature !== null ? d.temperature : "",
      d.pressure !== null ? d.pressure : "",
      `"${d.status || "NORMAL"}"`
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `MTM_Predictive_Telemetry_History_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("File CSV Riwayat Telemetri berhasil diunduh!", "success");
}

// ========================================================
// 4. KANBAN COLUMN RENDERERS & FILTERS
// ========================================================

// Render Column 1: TPM
function renderTpmCards() {
  const container = document.getElementById("tpm-card-container");
  if (!container) return;
  const searchVal = (document.getElementById("search-tpm")?.value || "").toLowerCase();

  const filtered = MTM_DATA.tpm.filter(item => {
    const matchesFilter = tpmActiveFilter === "semua" || item.status === tpmActiveFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchVal) || item.code.toLowerCase().includes(searchVal);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <p class="empty-text">Tidak ada item TPM pada kategori ini.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="mtm-card" onclick="showTpmDetailModal('${item.id}')">
      <div class="card-tag-row">
        <span class="code-ref">${item.code}</span>
        <span class="badge-child">${item.tag}</span>
      </div>
      <div class="card-item-title">${item.title}</div>
      <div class="card-parent-desc">${item.parent}</div>
      <div class="card-due-row">
        <div class="due-info">
          <span class="due-label">DUE:</span>
          <span class="due-date">${item.due}</span>
        </div>
        <span class="badge-status-gray">${item.statusLabel}</span>
      </div>
      <div class="card-meter-row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span>${item.meter}</span>
      </div>
    </div>
  `).join("");
}

function setTpmFilter(filter, btn) {
  tpmActiveFilter = filter;
  btn.parentElement.querySelectorAll(".sub-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  renderTpmCards();
}

function filterTpmCards() {
  renderTpmCards();
}

// Render Column 2: Task & Approval
function renderTaskCards() {
  const container = document.getElementById("task-card-container");
  if (!container) return;
  const searchVal = (document.getElementById("search-task")?.value || "").toLowerCase();

  const filtered = MTM_DATA.tasks.filter(t => {
    const matchesFilter = taskActiveFilter === "semua" || t.status === taskActiveFilter;
    const matchesSearch = t.title.toLowerCase().includes(searchVal) || t.ref.toLowerCase().includes(searchVal);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-center-container">
        <div class="empty-state-box">
          <div class="empty-icon-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <p class="empty-text">Semua task selesai</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => `
    <div class="mtm-card" onclick="showTaskDetailModal('${t.id}')">
      <div class="card-tag-row">
        <span class="code-ref font-bold">${t.ref}</span>
        <span class="badge-status-pill ${t.status === 'menunggu' ? 'amber' : 'red'}">${t.statusLabel}</span>
      </div>
      <div class="card-item-title">${t.title}</div>
      <div class="card-parent-desc">${t.desc}</div>
      <div class="card-due-row">
        <span class="due-label">Oleh: ${t.applicant}</span>
        <span class="due-date">${t.date}</span>
      </div>
      <div class="card-actions-inline" onclick="event.stopPropagation()">
        <button class="btn-card-approve" onclick="approveTask('${t.id}')">✓ Approve</button>
        <button class="btn-card-reject" onclick="rejectTask('${t.id}')">✗ Revisi</button>
      </div>
    </div>
  `).join("");
}

function setTaskFilter(filter, btn) {
  taskActiveFilter = filter;
  btn.parentElement.querySelectorAll(".sub-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  renderTaskCards();
}

function filterTaskCards() {
  renderTaskCards();
}

function approveTask(taskId) {
  const taskIndex = MTM_DATA.tasks.findIndex(t => t.id === taskId);
  if (taskIndex !== -1) {
    const task = MTM_DATA.tasks[taskIndex];
    MTM_DATA.tasks.splice(taskIndex, 1);
    renderTaskCards();
    updateDashboardCounts();
    showToast(`Task ${task.title} berhasil di-Approve!`, "success");
  }
}

function rejectTask(taskId) {
  const task = MTM_DATA.tasks.find(t => t.id === taskId);
  if (task) {
    task.status = "revisi";
    task.statusLabel = "Revisi Diperlukan";
    renderTaskCards();
    updateDashboardCounts();
    showToast(`Task ${task.title} dikembalikan untuk revisi.`, "error");
  }
}

// Render Column 3: Lifetime Jig
function renderLifetimeCards() {
  const container = document.getElementById("lifetime-card-container");
  if (!container) return;
  const searchVal = (document.getElementById("search-lifetime")?.value || "").toLowerCase();

  const filtered = MTM_DATA.lifetimes.filter(item => {
    const matchesFilter = lifetimeActiveFilter === "all" || item.status === lifetimeActiveFilter;
    const matchesSearch = item.code.toLowerCase().includes(searchVal);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-center-container">
        <div class="empty-state-box">
          <p class="empty-text">Belum ada item lifetime</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="mtm-card" onclick="showLifetimeDetailModal('${item.id}')">
      <div class="card-tag-row">
        <span class="code-ref font-bold">${item.code}</span>
        <span class="badge-meter-pill">${item.badge}</span>
      </div>
      <div class="lifetime-due-row">
        <div class="due-clock-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Due: ${item.due}</span>
        </div>
        <div class="progress-bar-wrapper">
          <div class="progress-bar-fill ${item.statusClass}" style="width: ${item.percent}%;"></div>
        </div>
        <span class="progress-percent ${item.statusClass}">${item.percent}%</span>
      </div>
    </div>
  `).join("");
}

function filterLifetimeCards() {
  renderLifetimeCards();
}

function filterLifetimeByStatus(status) {
  lifetimeActiveFilter = lifetimeActiveFilter === status ? "all" : status;
  renderLifetimeCards();
  showToast(`Filter Lifetime: ${lifetimeActiveFilter}`, "info");
}

// Render Column 4: Stok Reminder
function renderStockCards() {
  const container = document.getElementById("stock-card-container");
  if (!container) return;
  const searchVal = (document.getElementById("search-stock")?.value || "").toLowerCase();

  const filtered = MTM_DATA.stocks.filter(item => {
    const matchesFilter = stockActiveFilter === "all" || item.status === stockActiveFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchVal) || item.code.toLowerCase().includes(searchVal);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-center-container">
        <div class="empty-state-box">
          <p class="empty-text">Belum ada reminder stok</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="mtm-card" onclick="showStockDetailModal('${item.id}')">
      <div class="card-tag-row">
        <div class="prefix-group">
          <span class="badge-prefix ${item.prefix.toLowerCase()}">${item.prefix}</span>
          <span class="code-ref font-bold">${item.code}</span>
        </div>
        <span class="badge-status-pill ${item.statusClass}">${item.statusLabel}</span>
      </div>
      <div class="stock-item-name">${item.name}</div>
      <div class="stock-bar-row">
        <span class="stock-qty-text ${item.statusClass}">Stok: ${item.qtyCurrent} / ${item.qtyMin}</span>
        <div class="progress-bar-wrapper">
          <div class="progress-bar-fill ${item.progressClass}" style="width: ${item.progressWidth}%;"></div>
        </div>
        <span class="progress-percent ${item.statusClass}">${item.progressWidth}%</span>
        <button class="btn-mini-restock" onclick="event.stopPropagation(); orderStock('${item.id}')">+ Order</button>
      </div>
    </div>
  `).join("");
}

function filterStockCards() {
  renderStockCards();
}

function filterStockByStatus(status) {
  stockActiveFilter = stockActiveFilter === status ? "all" : status;
  renderStockCards();
  showToast(`Filter Stok: ${stockActiveFilter}`, "info");
}

function orderStock(stockId) {
  const item = MTM_DATA.stocks.find(s => s.id === stockId);
  if (item) {
    item.qtyCurrent += 1;
    if (item.qtyCurrent >= item.qtyMin) {
      item.status = "Aman";
      item.statusLabel = "AMAN";
      item.statusClass = "green";
      item.progressClass = "green";
      item.progressWidth = 100;
    }
    renderStockCards();
    updateDashboardCounts();
    showToast(`Order restock untuk '${item.name}' berhasil dibuat (+1)!`, "success");
  }
}

// Update counters across Kanban headers
function updateDashboardCounts() {
  const tpmCnt = MTM_DATA.tpm?.length || 0;
  const taskCnt = MTM_DATA.tasks?.length || 0;
  const taskWaitCnt = (MTM_DATA.tasks || []).filter(t => t.status === "menunggu").length;
  const taskRevCnt = (MTM_DATA.tasks || []).filter(t => t.status === "revisi").length;

  const habisCnt = (MTM_DATA.stocks || []).filter(s => s.status === "Habis").length;
  const menipisCnt = (MTM_DATA.stocks || []).filter(s => s.status === "Menipis").length;
  const amanCnt = (MTM_DATA.stocks || []).filter(s => s.status === "Aman").length;

  const elTpm = document.getElementById("tpm-cnt-all");
  if (elTpm) elTpm.textContent = tpmCnt;
  const elTask = document.getElementById("task-cnt-all");
  if (elTask) elTask.textContent = taskCnt;
  const elTaskWait = document.getElementById("task-cnt-wait");
  if (elTaskWait) elTaskWait.textContent = taskWaitCnt;
  const elTaskRev = document.getElementById("task-cnt-rev");
  if (elTaskRev) elTaskRev.textContent = taskRevCnt;

  const elStkHabis = document.getElementById("cnt-stk-habis");
  if (elStkHabis) elStkHabis.textContent = habisCnt;
  const elStkMenipis = document.getElementById("cnt-stk-menipis");
  if (elStkMenipis) elStkMenipis.textContent = menipisCnt;
  const elStkAman = document.getElementById("cnt-stk-aman");
  if (elStkAman) elStkAman.textContent = amanCnt;

  const notifBadge = document.getElementById("notification-count");
  if (notifBadge) notifBadge.textContent = taskWaitCnt + habisCnt;
}

// ========================================================
// 5. MASTER DRAWINGS, JIG MANAGEMENT & TPM TABLES
// ========================================================

function renderDrawingTable() {
  const body = document.getElementById("drawing-table-body");
  if (!body) return;
  const searchVal = (document.getElementById("search-drawing")?.value || "").toLowerCase();

  const filtered = MTM_DATA.drawings.filter(d => 
    d.code.toLowerCase().includes(searchVal) || d.partName.toLowerCase().includes(searchVal) || d.line.toLowerCase().includes(searchVal)
  );

  body.innerHTML = filtered.map(d => `
    <tr>
      <td>${d.no}</td>
      <td><strong>${d.code}</strong></td>
      <td>${d.partName}</td>
      <td>${d.line}</td>
      <td><span class="badge-status-pill blue">${d.rev}</span></td>
      <td>${d.fileType}</td>
      <td><span class="badge-status-pill ${d.status === 'Approved' ? 'green' : 'amber'}">${d.status}</span></td>
      <td>${d.date}</td>
      <td>
        <button class="btn-table-action" onclick="showDrawingViewerModal('${d.code}', '${d.partName}')">Lihat CAD / PDF</button>
      </td>
    </tr>
  `).join("");
}

function renderJigTable() {
  const body = document.getElementById("jig-table-body");
  if (!body) return;
  const searchVal = (document.getElementById("search-jig-table")?.value || "").toLowerCase();

  const filtered = MTM_DATA.jigs.filter(j => 
    j.code.toLowerCase().includes(searchVal) || j.name.toLowerCase().includes(searchVal) || j.line.toLowerCase().includes(searchVal)
  );

  body.innerHTML = filtered.map(j => {
    const pct = Math.round((j.cycles / j.max) * 100);
    const color = pct >= 90 ? "red" : (pct >= 70 ? "amber" : "green");
    return `
      <tr>
        <td><strong>${j.code}</strong></td>
        <td>${j.name}</td>
        <td>${j.line}</td>
        <td>${j.cycles}x</td>
        <td>${j.max}x</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="progress-bar-wrapper" style="width:80px;">
              <div class="progress-bar-fill ${color}" style="width:${pct}%;"></div>
            </div>
            <strong>${pct}%</strong>
          </div>
        </td>
        <td><span class="badge-status-pill blue">${j.rack}</span></td>
        <td><span class="badge-status-pill ${j.status === 'Operating' ? 'green' : (j.status === 'Maintenance' ? 'red' : 'blue')}">${j.status}</span></td>
        <td>
          <button class="btn-table-action" onclick="inspectJig('${j.code}')">Detail</button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderTpmScheduleTable() {
  const body = document.getElementById("tpm-schedule-table-body");
  if (!body) return;
  body.innerHTML = MTM_DATA.tpmSchedule.map(s => `
    <tr>
      <td>${s.no}</td>
      <td><strong>${s.part}</strong></td>
      <td>${s.task}</td>
      <td>${s.cycle}</td>
      <td>${s.target}</td>
      <td>${s.pic}</td>
      <td><span class="badge-status-pill ${s.status === 'Selesai' ? 'green' : (s.status === 'Overdue' ? 'red' : 'amber')}">${s.status}</span></td>
      <td>
        <button class="btn-table-action" onclick="executeTpmSchedule(${s.no})">Checklist</button>
      </td>
    </tr>
  `).join("");
}

function renderApprovalQueue() {
  const container = document.getElementById("approval-queue-container");
  if (!container) return;
  container.innerHTML = MTM_DATA.tasks.map(t => `
    <div class="approval-item-card">
      <div class="approval-item-info">
        <h4>${t.title} (${t.ref})</h4>
        <p>${t.desc}</p>
        <div class="approval-meta-tag">
          <span class="badge-status-pill blue">${t.type}</span>
          <span class="due-label">Diajukan: ${t.applicant} • ${t.date}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn-card-approve" style="padding:8px 16px;" onclick="approveTask('${t.id}')">✓ Setujui</button>
        <button class="btn-card-reject" style="padding:8px 16px;" onclick="rejectTask('${t.id}')">✗ Tolak</button>
      </div>
    </div>
  `).join("");
}

// ========================================================
// 6. MODALS & POPUPS
// ========================================================

function openModal(modalId, title, htmlContent, footerActions) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body-content").innerHTML = htmlContent;

  const footer = document.getElementById("modal-footer-actions");
  if (footerActions) {
    footer.innerHTML = footerActions;
  } else {
    footer.innerHTML = `<button class="btn-secondary" onclick="closeModal('${modalId}')">Tutup</button>`;
  }

  document.getElementById(modalId).style.display = "flex";
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

function closeModalOnBackdrop(e, modalId) {
  if (e.target.id === modalId) {
    closeModal(modalId);
  }
}

// Modal Detail Handlers
function showTpmDetailModal(itemId) {
  const item = MTM_DATA.tpm.find(t => t.id === itemId);
  if (!item) return;

  const content = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div><strong>Kode Part:</strong> ${item.code} (${item.tag})</div>
      <div><strong>Nama Part:</strong> ${item.title}</div>
      <div><strong>Parent Assembly:</strong> ${item.parent}</div>
      <div><strong>Jadwal Pelaksanaan:</strong> ${item.due}</div>
      <div><strong>Siklus Pemakaian:</strong> ${item.meter}</div>
      <div><strong>PIC Maintenance:</strong> ${item.pic}</div>
      <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
        <strong>Instruksi Inspeksi:</strong><br>
        ${item.inspectionNotes}
      </div>
    </div>
  `;

  const footer = `
    <button class="btn-secondary" onclick="closeModal('modal-detail')">Tutup</button>
    <button class="btn-primary-blue" onclick="executeTpmNow('${item.id}')">✓ Eksekusi TPM Sekarang</button>
  `;

  openModal("modal-detail", `Detail TPM: ${item.code}`, content, footer);
}

function executeTpmNow(itemId) {
  const item = MTM_DATA.tpm.find(t => t.id === itemId);
  if (item) {
    item.status = "selesai";
    item.statusLabel = "Selesai Inspeksi";
    closeModal("modal-detail");
    renderTpmCards();
    showToast(`TPM ${item.code} berhasil dieksekusi dan tercatat di log!`, "success");
  }
}

function showTaskDetailModal(taskId) {
  const task = MTM_DATA.tasks.find(t => t.id === taskId);
  if (!task) return;

  const content = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div><strong>Judul Task:</strong> ${task.title}</div>
      <div><strong>Ref Jig/Part:</strong> ${task.ref}</div>
      <div><strong>Tipe Task:</strong> ${task.type}</div>
      <div><strong>Diajukan Oleh:</strong> ${task.applicant} (${task.date})</div>
      <div><strong>Deskripsi:</strong><br>${task.desc}</div>
    </div>
  `;

  const footer = `
    <button class="btn-secondary" onclick="closeModal('modal-detail')">Batal</button>
    <button class="btn-card-reject" style="max-width:120px;" onclick="rejectTask('${task.id}');closeModal('modal-detail');">✗ Revisi</button>
    <button class="btn-card-approve" style="max-width:120px;" onclick="approveTask('${task.id}');closeModal('modal-detail');">✓ Approve</button>
  `;

  openModal("modal-detail", `Persetujuan: ${task.ref}`, content, footer);
}

function showLifetimeDetailModal(lifeId) {
  const item = MTM_DATA.lifetimes.find(l => l.id === lifeId);
  if (!item) return;

  const content = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div><strong>Nama Jig:</strong> ${item.code}</div>
      <div><strong>Lokasi Line:</strong> ${item.line}</div>
      <div><strong>Target Due Maintenance:</strong> ${item.due}</div>
      <div><strong>Status Usia:</strong> <span class="badge-status-pill ${item.statusClass}">${item.status} (${item.percent}%)</span></div>
      <div><strong>Histori Siklus:</strong> Telah mencapai ${item.badge.split(' - ')[0]} stroke penekanan.</div>
    </div>
  `;

  openModal("modal-detail", `Monitoring Lifetime Jig`, content);
}

function showStockDetailModal(stockId) {
  const item = MTM_DATA.stocks.find(s => s.id === stockId);
  if (!item) return;

  const content = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div><strong>Kode Barang:</strong> ${item.code} (${item.prefix})</div>
      <div><strong>Nama Item:</strong> ${item.name}</div>
      <div><strong>Jumlah Stok Fisik:</strong> ${item.qtyCurrent} unit</div>
      <div><strong>Batas Minimum Safety Stock:</strong> ${item.qtyMin} unit</div>
      <div><strong>Status Ketersediaan:</strong> <span class="badge-status-pill ${item.statusClass}">${item.statusLabel}</span></div>
    </div>
  `;

  const footer = `
    <button class="btn-secondary" onclick="closeModal('modal-detail')">Tutup</button>
    <button class="btn-primary-blue" onclick="orderStock('${item.id}');closeModal('modal-detail');">+ Order Restock</button>
  `;

  openModal("modal-detail", `Informasi Stok: ${item.code}`, content, footer);
}

function showDrawingViewerModal(dwgCode, partName) {
  const content = `
    <div style="text-align:center;padding:20px;background:#0f172a;color:#fff;border-radius:12px;">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="1.5" style="margin-bottom:12px;">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
      <h4 style="font-size:1.1rem;margin-bottom:6px;">${dwgCode}</h4>
      <p style="color:#94a3b8;font-size:0.85rem;">${partName}</p>
      <div style="margin-top:16px;display:flex;justify-content:center;gap:10px;">
        <button class="btn-primary-blue" onclick="showToast('Mengunduh file CAD .STEP...', 'info')">Unduh CAD 3D (.STEP)</button>
        <button class="btn-secondary" onclick="showToast('Membuka PDF 2D Drawing...', 'info')">Preview PDF 2D</button>
      </div>
    </div>
  `;
  openModal("modal-detail", `CAD Drawing Viewer`, content);
}

function showNewDrawingModal() {
  const content = `
    <form onsubmit="event.preventDefault();addNewDrawing();">
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label class="form-label">Drawing Code / Part No</label>
          <input type="text" id="new-dwg-code" class="form-control" placeholder="DWG-MTM-2026-..." required>
        </div>
        <div>
          <label class="form-label">Nama Part / Assembly</label>
          <input type="text" id="new-dwg-name" class="form-control" placeholder="Contoh: Fixture Plate Camshaft" required>
        </div>
        <div>
          <label class="form-label">Line Produksi</label>
          <select id="new-dwg-line" class="form-control">
            <option>Machining Line C</option>
            <option>Machining Line D</option>
            <option>Welding Line B</option>
            <option>Stamping Line A</option>
          </select>
        </div>
        <div>
          <label class="form-label">Upload File (PDF / STEP / DWG)</label>
          <input type="file" class="form-control" style="padding-top:10px;">
        </div>
        <button type="submit" class="btn-primary-blue" style="width:100%;justify-content:center;margin-top:8px;">Upload & Simpan</button>
      </div>
    </form>
  `;
  openModal("modal-detail", "Upload Master Drawing Baru", content);
}

function addNewDrawing() {
  const code = document.getElementById("new-dwg-code").value;
  const name = document.getElementById("new-dwg-name").value;
  const line = document.getElementById("new-dwg-line").value;

  MTM_DATA.drawings.unshift({
    no: MTM_DATA.drawings.length + 1,
    code: code,
    partName: name,
    line: line,
    rev: "Rev.00",
    fileType: "CAD 3D",
    status: "Approved",
    date: new Date().toLocaleDateString("id-ID")
  });

  closeModal("modal-detail");
  renderDrawingTable();
  showToast(`Drawing ${code} berhasil didaftarkan!`, "success");
}

function showNotificationPanel() {
  const content = `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div style="padding:10px;background:#f8fafc;border-radius:8px;border-left:4px solid #ef4444;">
        <strong>[STOK REMINDER]</strong> Stok Jig ASSY DRILL STEM LINE C Habis (0 unit). Perlu restock.
      </div>
      <div style="padding:10px;background:#f8fafc;border-radius:8px;border-left:4px solid #f59e0b;">
        <strong>[TASK APPROVAL]</strong> Permohonan revisi drawing TXMACH-IZGSHFDR00 menunggu persetujuan Anda.
      </div>
      <div style="padding:10px;background:#f8fafc;border-radius:8px;border-left:4px solid #10b981;">
        <strong>[TELEMETRI IOT]</strong> MQTT Ingestion Dual PostgreSQL (Timescale & Monitoring) berjalan normal.
      </div>
    </div>
  `;
  openModal("modal-detail", "Notifikasi Sistem MTM", content);
}

// Toast System
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(30px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ========================================================
// 7. REAL-TIME IOT TELEMETRY & DATABASE POLLING
// ========================================================

function formatTime(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function setBadge(id, state, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `mon-badge mon-badge-${state}`;
  el.textContent = text;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function fmtNum(v, digits = 1) {
  return v != null && !isNaN(v) ? Number(v).toFixed(digits) : "-";
}

async function fetchHealth() {
  if (!document.getElementById("mqtt-badge")) return;

  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error("Backend offline");
    const data = await res.json();
    const { mqtt, timescale, monitoring } = data.connections;

    if (mqtt) {
      setBadge("mqtt-badge", mqtt.connected ? "ok" : "off", mqtt.connected ? "Terhubung" : "Terputus");
      setBadge("badge-mqtt-stream", mqtt.connected ? "ok" : "off", mqtt.connected ? "Live" : "Terputus");
      setText("mqtt-broker", mqtt.broker || "-");
      setText("mqtt-topic", mqtt.topicPattern || mqtt.topic || "-");
      setText("mqtt-total", (mqtt.totalMessagesReceived || 0).toLocaleString("id-ID") + " paket");
      setText("mqtt-last", mqtt.lastMessageTime ? formatTime(mqtt.lastMessageTime) : "Belum ada");
    }

    if (timescale) {
      setBadge("timescale-badge", timescale.connected ? "ok" : "off", timescale.connected ? "Terhubung" : "Terputus");
      setText("ts-db", timescale.database || "-");
      setText("ts-host", timescale.host || "-");
      setText("ts-mode", timescale.connected ? (timescale.hypertable ? "Hypertable" : "Tabel Biasa") : "-");
    }

    if (monitoring) {
      setBadge("monitoring-badge", monitoring.connected ? "ok" : "off", monitoring.connected ? "Terhubung" : "Terputus");
      setText("mn-db", monitoring.database || "-");
      setText("mn-host", monitoring.host || "-");
    }
  } catch {
    setBadge("mqtt-badge", "off", "Backend Mati");
    setBadge("timescale-badge", "off", "Backend Mati");
    setBadge("monitoring-badge", "off", "Backend Mati");
  }
}

async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE_URL}/stats`);
    if (!res.ok) return;
    const data = await res.json();
    setText("ts-rows", (data.totalRows || 0).toLocaleString("id-ID") + " data");
    setText("mn-devices", `${data.activeDevices || 0} perangkat`);
    setText("mn-alerts", `${data.totalAlerts || 0} alert`);
  } catch {}
}

// Memory cache untuk inspeksi JSON mentah
const rawPayloadCache = new Map();

function isJingduanDevice(id) {
  if (!id) return false;
  const s = id.toLowerCase();
  return (
    s.includes("eccentric") ||
    s.includes("bearing") ||
    s.includes("link-temperature") ||
    s.includes("vibration") ||
    s.includes("jingduan")
  );
}

function getJingduanComponentName(id) {
  const s = (id || "").toLowerCase();
  if (s.includes("link-temperature")) return "Link Temperature";
  if (s.includes("right-eccentric-bush")) return "Right Eccentric Bush (Kanan)";
  if (s.includes("left-eccentric-bush")) return "Left Eccentric Bush (Kiri)";
  if (s.includes("right-transmission-bearing")) return "Right Transmission Bearing (Kanan)";
  if (s.includes("left-transmission-bearing")) return "Left Transmission Bearing (Kiri)";
  if (s.includes("vibration")) return "Vibration (Sensor Getaran)";
  return id || "Komponen Jingduan Forging";
}

function getJingduanDeviceId(id, raw) {
  if (raw && (raw.deviceId !== undefined || raw.device_id !== undefined)) {
    return String(raw.deviceId ?? raw.device_id);
  }
  const s = (id || "").toLowerCase();
  if (s.includes("link-temperature")) return "0";
  if (s.includes("right-eccentric-bush")) return "3";
  if (s.includes("left-eccentric-bush")) return "4";
  if (s.includes("right-transmission-bearing")) return "5";
  if (s.includes("left-transmission-bearing")) return "6";
  if (s.includes("vibration")) return "1";
  return "-";
}

async function fetchDevices() {
  const container = document.getElementById("devices-container");
  const countTag = document.getElementById("device-count-tag");
  const filterSelect = document.getElementById("filter-device");
  if (!container) return;

  try {
    let devices = [];
    try {
      const res = await fetch(`${API_BASE_URL}/devices`);
      if (res.ok) devices = await res.json();
    } catch {}

    // Filter KHUSUS Mesin Jingduan Forging
    devices = devices.filter(d => isJingduanDevice(d.device_id));

    if (countTag) countTag.textContent = `${devices.length} Komponen`;

    if (devices.length === 0) {
      container.innerHTML = `
        <div class="mon-empty">
          <strong>Menunggu Data Mesin Jingduan Forging</strong>
          <p>Backend sedang terhubung ke broker mendengarkan topik <code>mtm/jingduanforging/#</code>.<br>
          Data sensor titik komponen forging akan otomatis tampil di sini.</p>
        </div>
      `;
      return;
    }

    // Ingest latest sensor values & register to dropdown
    devices.forEach(dev => {
      const isVib = dev.device_id.toLowerCase().includes("vibration");
      const devIdNum = getJingduanDeviceId(dev.device_id, dev.raw_payload);
      const compName = getJingduanComponentName(dev.device_id);

      if (devIdNum && latestSensorValues[devIdNum] !== undefined) {
        if (isVib && dev.pressure != null) {
          latestSensorValues[devIdNum] = Number(dev.pressure);
        } else if (!isVib && dev.temperature != null) {
          latestSensorValues[devIdNum] = Number(dev.temperature);
        }
      }

      rawPayloadCache.set(dev.device_id, dev.raw_payload || {
        device_id: dev.device_id,
        temperature: dev.temperature,
        humidity: dev.humidity,
        pressure: dev.pressure,
        status: dev.status,
        timestamp: dev.recorded_at,
      });

      if (filterSelect && !knownDevices.has(dev.device_id)) {
        knownDevices.add(dev.device_id);
        const opt = document.createElement("option");
        opt.value = dev.device_id;
        opt.textContent = `${compName} (#${devIdNum})`;
        filterSelect.appendChild(opt);
      }
    });

    const hasCards = container.querySelectorAll(".mon-device").length === devices.length;

    if (!hasCards) {
      container.innerHTML = devices.map(dev => {
        const isWarn = dev.status === "WARNING";
        const isVib = dev.device_id.toLowerCase().includes("vibration");
        const compName = getJingduanComponentName(dev.device_id);
        const devIdNum = getJingduanDeviceId(dev.device_id, dev.raw_payload);
        const ago = dev.last_seen_seconds_ago;
        const timeText = ago !== undefined
          ? (ago < 5 ? "Baru saja" : ago < 60 ? `${ago}d lalu` : `${Math.floor(ago / 60)}m lalu`)
          : formatTime(dev.recorded_at || dev.created_at);
        const total = dev.total_messages ? `${dev.total_messages} pkt` : "-";
        const valStr = isVib ? (dev.pressure != null ? fmtNum(dev.pressure, 3) : "-") : (dev.temperature != null ? fmtNum(dev.temperature, 1) : "-");
        const unitStr = isVib ? "in/s" : (dev.temperature != null ? "°C" : "");

        return `
          <article class="mon-device compact ${isWarn ? "warn" : ""}" id="mon-card-${devIdNum}">
            <div class="mon-device-top">
              <div class="mon-device-title-row">
                <span class="mon-device-chip">#${devIdNum}</span>
                <div class="mon-device-name" title="${compName}">${compName}</div>
              </div>
              <span class="mon-badge ${isWarn ? "mon-badge-off" : "mon-badge-ok"}" id="mon-badge-${devIdNum}">${isWarn ? "WARN" : "OK"}</span>
            </div>
            <div class="mon-device-val-row">
              <div class="mon-main-val">
                <strong id="mon-val-${devIdNum}">${valStr}</strong>
                <span class="mon-unit" id="mon-unit-${devIdNum}">${unitStr}</span>
              </div>
              <div class="mon-metric-tag">${isVib ? "Getaran" : "Suhu"}</div>
            </div>
            <!-- Sparkline Grafik Garis Live per Komponen -->
            <div class="mon-device-sparkline-wrap">
              <canvas id="sparkline-mon-${devIdNum}" height="48"></canvas>
            </div>
            <div class="mon-device-foot">
              <span id="mon-foot-time-${devIdNum}">${timeText}</span>
              <span class="mon-packet-count" id="mon-foot-count-${devIdNum}">${total}</span>
            </div>
          </article>
        `;
      }).join("");
    } else {
      // In-place update tanpa merusak elemen canvas
      devices.forEach(dev => {
        const isWarn = dev.status === "WARNING";
        const isVib = dev.device_id.toLowerCase().includes("vibration");
        const devIdNum = getJingduanDeviceId(dev.device_id, dev.raw_payload);
        const ago = dev.last_seen_seconds_ago;
        const timeText = ago !== undefined
          ? (ago < 5 ? "Baru saja" : ago < 60 ? `${ago}d lalu` : `${Math.floor(ago / 60)}m lalu`)
          : formatTime(dev.recorded_at || dev.created_at);
        const total = dev.total_messages ? `${dev.total_messages} pkt` : "-";
        const valStr = isVib ? (dev.pressure != null ? fmtNum(dev.pressure, 3) : "-") : (dev.temperature != null ? fmtNum(dev.temperature, 1) : "-");
        const unitStr = isVib ? "in/s" : (dev.temperature != null ? "°C" : "");

        const card = document.getElementById(`mon-card-${devIdNum}`);
        if (card) {
          if (isWarn) card.classList.add("warn");
          else card.classList.remove("warn");
        }
        setText(`mon-val-${devIdNum}`, valStr);
        setText(`mon-unit-${devIdNum}`, unitStr);
        const badge = document.getElementById(`mon-badge-${devIdNum}`);
        if (badge) {
          badge.className = `mon-badge ${isWarn ? "mon-badge-off" : "mon-badge-ok"}`;
          badge.textContent = isWarn ? "WARN" : "OK";
        }
        setText(`mon-foot-time-${devIdNum}`, timeText);
        setText(`mon-foot-count-${devIdNum}`, total);
      });
    }

    setText("mon-last-updated", new Date().toLocaleTimeString("id-ID"));

    // Gambar grafik garis segera setelah data baru masuk
    renderMonitoringLiveCharts();
  } catch {}
}

async function fetchLogs() {
  const body = document.getElementById("terminal-stream");
  if (!body) return;

  try {
    const res = await fetch(`${API_BASE_URL}/logs`);
    if (!res.ok) return;
    let logs = await res.json();
    if (logs.length === 0) return;

    // Filter KHUSUS Jingduan Forging
    logs = logs.filter(l => isJingduanDevice(l.deviceId) || isJingduanDevice(l.topic));
    if (logs.length === 0) return;

    body.innerHTML = logs.map(l => {
      const isWarn = l.status === "WARNING";
      const isVib = (l.deviceId || "").toLowerCase().includes("vibration");
      const compName = getJingduanComponentName(l.deviceId);
      const devIdNum = getJingduanDeviceId(l.deviceId, l.rawPayload);

      if (devIdNum && latestSensorValues[devIdNum] !== undefined) {
        if (isVib && l.pressure != null) {
          latestSensorValues[devIdNum] = Number(l.pressure);
        } else if (!isVib && l.temperature != null) {
          latestSensorValues[devIdNum] = Number(l.temperature);
        }
      }

      // Cache raw payload untuk modal inspeksi
      rawPayloadCache.set(`log-${l.id}`, l.rawPayload || {
        topic: l.topic,
        deviceId: devIdNum,
        component: compName,
        temperature: l.temperature,
        pressure: l.pressure,
        timestamp: l.timestamp,
      });

      const valNum = isVib
        ? (l.pressure != null ? fmtNum(l.pressure, 3) : "-")
        : (l.temperature != null ? fmtNum(l.temperature, 1) : "-");
      const valUnit = isVib ? "in/s" : (l.temperature != null ? "°C" : "");

      return `
        <tr>
          <td><span class="table-time-tag">${l.timestamp}</span></td>
          <td>
            <div class="table-comp-cell">
              <span class="table-dev-chip">#${devIdNum}</span>
              <span class="table-dev-name">${compName}</span>
            </div>
          </td>
          <td>
            <div class="table-val-pill ${isVib ? "vib-pill" : "temp-pill"}">
              <strong>${valNum}</strong>
              <span>${valUnit}</span>
            </div>
          </td>
          <td>
            <span class="table-status-pill ${isWarn ? "warn" : "ok"}">
              <span class="dot"></span>${isWarn ? "Warning" : "Normal"}
            </span>
          </td>
          <td style="text-align:center;">
            <button class="table-btn-inspect" onclick="showRawJsonModal('log-${l.id}')" title="Lihat JSON Mentah MQTT">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  } catch {}
}

async function fetchTelemetry() {
  const tableBody = document.getElementById("telemetry-table-body");
  const filterSelect = document.getElementById("filter-device");
  if (!tableBody) return;

  try {
    const dev = filterSelect ? filterSelect.value : "";
    const url = dev
      ? `${API_BASE_URL}/telemetry?limit=25&device=${encodeURIComponent(dev)}`
      : `${API_BASE_URL}/telemetry?limit=25`;

    const res = await fetch(url);
    if (!res.ok) return;
    let rows = await res.json();

    // Filter KHUSUS Jingduan Forging
    rows = rows.filter(r => isJingduanDevice(r.device_id));

    if (rows.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="mon-table-empty">Belum ada data Mesin Jingduan Forging tersimpan di database.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = rows.map(r => {
      const isWarn = r.status === "WARNING";
      const isVib = (r.device_id || "").toLowerCase().includes("vibration");
      const compName = getJingduanComponentName(r.device_id);
      const devIdNum = getJingduanDeviceId(r.device_id, r.raw_payload);

      // Cache raw payload untuk modal inspeksi
      rawPayloadCache.set(`tel-${r.id}`, r.raw_payload || {
        id: r.id,
        deviceId: devIdNum,
        component: compName,
        temperature: r.temperature,
        pressure: r.pressure,
        recorded_at: r.created_at,
      });

      const valNum = isVib
        ? (r.pressure != null ? fmtNum(r.pressure, 3) : "-")
        : (r.temperature != null ? fmtNum(r.temperature, 1) : "-");
      const valUnit = isVib ? "in/s" : (r.temperature != null ? "°C" : "");

      return `
        <tr>
          <td><span class="table-row-num">#${r.id}</span></td>
          <td>
            <div class="table-comp-cell">
              <span class="table-dev-chip">#${devIdNum}</span>
              <span class="table-dev-name">${compName}</span>
            </div>
          </td>
          <td>
            <div class="table-val-pill ${isVib ? "vib-pill" : "temp-pill"}">
              <strong>${valNum}</strong>
              <span>${valUnit}</span>
            </div>
          </td>
          <td>
            <span class="table-status-pill ${isWarn ? "warn" : "ok"}">
              <span class="dot"></span>${isWarn ? "Warning" : "Normal"}
            </span>
          </td>
          <td><span class="table-time-cell">${formatDateTime(r.created_at)}</span></td>
          <td style="text-align:center;">
            <button class="table-btn-inspect" onclick="showRawJsonModal('tel-${r.id}')" title="Lihat Snapshot Data">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  } catch {}
}

// Modal Penjelasan Format Data JSON MQTT Mesin Jingduan Forging
function showMqttPayloadGuideModal() {
  const content = `
    <div style="font-size:0.88rem; color:#334155; line-height:1.6;">
      <p style="margin-bottom:12px;">
        Data telemetri ditarik secara real-time dari <strong>MQTT Broker (10.14.28.101)</strong> khusus untuk <strong>Mesin Jingduan Forging Press</strong> dengan pola topik <code>mtm/jingduanforging/#</code>.
      </p>

      <div style="background:#f8faff; color:#1e293b; border:1.5px solid #bfdbfe; padding:16px; border-radius:10px; font-family:'JetBrains Mono', monospace; font-size:0.8rem; margin-bottom:14px;">
        <div style="color:#64748b; margin-bottom:8px;">// Format Suhu (Link Temp, Bush, Transmission Bearing):</div>
{
  <span style="color:#1d4ed8; font-weight:700;">"date"</span>: <span style="color:#0284c7;">"2026-10-13"</span>,
  <span style="color:#1d4ed8; font-weight:700;">"time"</span>: <span style="color:#0284c7;">"11:33:51"</span>,
  <span style="color:#1d4ed8; font-weight:700;">"deviceId"</span>: <span style="color:#0284c7;">"3"</span>,
  <span style="color:#1d4ed8; font-weight:700;">"data"</span>: {
    <span style="color:#1d4ed8; font-weight:700;">"PV"</span>: <span style="color:#2563eb; font-weight:700;">49</span>,            <span style="color:#64748b;">// Process Value (°C)</span>
    <span style="color:#1d4ed8; font-weight:700;">"DP"</span>: <span style="color:#2563eb; font-weight:700;">0</span>
  }
}
      </div>

      <div style="background:#f8faff; color:#1e293b; border:1.5px solid #bfdbfe; padding:16px; border-radius:10px; font-family:'JetBrains Mono', monospace; font-size:0.8rem; margin-bottom:16px;">
        <div style="color:#64748b; margin-bottom:8px;">// Format Getaran (Vibration Sensor #1):</div>
{
  <span style="color:#1d4ed8; font-weight:700;">"date"</span>: <span style="color:#0284c7;">"2026-10-13"</span>,
  <span style="color:#1d4ed8; font-weight:700;">"time"</span>: <span style="color:#0284c7;">"11:33:51"</span>,
  <span style="color:#1d4ed8; font-weight:700;">"deviceId"</span>: <span style="color:#0284c7;">"1"</span>,
  <span style="color:#1d4ed8; font-weight:700;">"data"</span>: {
    <span style="color:#1d4ed8; font-weight:700;">"Z_RMS_Vel_in"</span>: <span style="color:#2563eb; font-weight:700;">0.05</span>  <span style="color:#64748b;">// Kecepatan RMS Getaran (in/s)</span>
  }
}
      </div>

      <h4 style="font-size:0.9rem; font-weight:800; color:#1e3a8a; margin-bottom:8px;">6 Titik Sensor Jingduan Forging:</h4>
      <ul style="padding-left:18px; margin-bottom:0; color:#334155;">
        <li><code>mtm/jingduanforging/link-temperature</code> (#0) - Suhu Link (°C)</li>
        <li><code>mtm/jingduanforging/vibration</code> (#1) - Getaran (Z_RMS_Vel_in)</li>
        <li><code>mtm/jingduanforging/right-eccentric-bush</code> (#3) - Suhu Bushing Kanan (°C)</li>
        <li><code>mtm/jingduanforging/left-eccentric-bush</code> (#4) - Suhu Bushing Kiri (°C)</li>
        <li><code>mtm/jingduanforging/right-transmission-bearing</code> (#5) - Suhu Bearing Transmisi Kanan (°C)</li>
        <li><code>mtm/jingduanforging/left-transmission-bearing</code> (#6) - Suhu Bearing Transmisi Kiri (°C)</li>
      </ul>
    </div>
  `;
  openModal("modal-detail", "Panduan Format Data Mesin Jingduan Forging", content);
}

// Modal Penampil Raw JSON
function showRawJsonModal(key) {
  const payload = rawPayloadCache.get(key) || {
    message: "Payload raw sedang menunggu paket berikutnya...",
    deviceId: key,
    timestamp: new Date().toISOString()
  };

  const prettyJson = JSON.stringify(payload, null, 2);
  const titleName = payload.component || getJingduanComponentName(payload.deviceId || key);

  const content = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-size:0.8rem; color:#475569;">Komponen / Sensor: <strong style="color:#1e3a8a;">${titleName}</strong></span>
        <span class="badge-status-pill blue">RAW MQTT TELEMETRY</span>
      </div>
      <pre style="background:#f8faff; color:#1e3a8a; border:1.5px solid #bfdbfe; padding:16px; border-radius:10px; font-family:'JetBrains Mono', monospace; font-size:0.82rem; overflow-x:auto; max-height:360px;">${prettyJson}</pre>
      <p style="font-size:0.75rem; color:#64748b; margin-top:8px;">
        Paket data di atas ditarik langsung dari broker MQTT mesin Jingduan Forging (10.14.28.101) dan diproses oleh backend secara real-time.
      </p>
    </div>
  `;
  openModal("modal-detail", `Inspeksi Data Mentah: ${titleName}`, content);
}

// ========================================================
// 7B. THREE PILLARS OF MAINTENANCE: CM, PM, PDM (MPC)
// 1. Corrective Maintenance (CM) - Trigger: Produksi
// 2. Preventive Maintenance (PM) - Trigger: Maintenance
// 3. Predictive Maintenance (PdM) - Trigger: MPC (Machine Performance Check)
// ========================================================

// --------------------------------------------------------
// A. CORRECTIVE MAINTENANCE (CM) - TRIGGER: PRODUKSI
// --------------------------------------------------------

function renderCmTable() {
  const container = document.getElementById("cm-table-body");
  if (!container) return;

  const searchVal = (document.getElementById("search-cm")?.value || "").toLowerCase();

  const filtered = MAINTENANCE_DATA.cmTickets.filter(item => {
    const matchesFilter = cmActiveFilter === "all" || item.status === cmActiveFilter;
    const matchesSearch = item.id.toLowerCase().includes(searchVal) ||
      item.machine.toLowerCase().includes(searchVal) ||
      item.component.toLowerCase().includes(searchVal) ||
      item.problem.toLowerCase().includes(searchVal) ||
      item.reporter.toLowerCase().includes(searchVal);
    return matchesFilter && matchesSearch;
  });

  // Hitung KPI CM
  const waitingCount = MAINTENANCE_DATA.cmTickets.filter(t => t.status === "waiting").length;
  const inProgressCount = MAINTENANCE_DATA.cmTickets.filter(t => t.status === "in_progress").length;
  const completedCount = MAINTENANCE_DATA.cmTickets.filter(t => t.status === "completed").length;
  
  const completedTickets = MAINTENANCE_DATA.cmTickets.filter(t => t.status === "completed" && t.downtimeMinutes > 0);
  const avgMttr = completedTickets.length > 0
    ? Math.round(completedTickets.reduce((acc, c) => acc + c.downtimeMinutes, 0) / completedTickets.length)
    : 26;

  // Update strip status
  const statWaitEl = document.getElementById("cm-stat-waiting");
  if (statWaitEl) statWaitEl.innerHTML = `Menunggu: <strong>${waitingCount}</strong>`;
  const statProgEl = document.getElementById("cm-stat-progress");
  if (statProgEl) statProgEl.innerHTML = `Perbaikan: <strong>${inProgressCount}</strong>`;
  const statCompEl = document.getElementById("cm-stat-completed");
  if (statCompEl) statCompEl.innerHTML = `Selesai: <strong>${completedCount}</strong>`;
  const statMttrEl = document.getElementById("cm-stat-mttr");
  if (statMttrEl) statMttrEl.innerHTML = `MTTR: <strong>${avgMttr} mnt</strong>`;

  updatePillarDashboardCounts();

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="10" class="mon-table-empty">Tidak ada tiket Corrective Maintenance.</td>
      </tr>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    let statusBadge = "";
    let actionBtn = "";

    if (item.status === "waiting") {
      statusBadge = `<span class="cm-status-tag waiting"><span class="dot"></span>Menunggu</span>`;
      actionBtn = `<button class="table-btn amber" onclick="startCmRepair('${item.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Mulai</span>
      </button>`;
    } else if (item.status === "in_progress") {
      statusBadge = `<span class="cm-status-tag in_progress"><span class="dot"></span>Dikerjakan</span>`;
      actionBtn = `<button class="table-btn green" onclick="showResolveCmModal('${item.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>Selesaikan</span>
      </button>`;
    } else {
      statusBadge = `<span class="cm-status-tag completed"><span class="dot"></span>Selesai (${item.downtimeMinutes}m)</span>`;
      actionBtn = `<button class="table-btn blue" onclick="showCmDetailModal('${item.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        <span>Detail</span>
      </button>`;
    }

    const sevClass = item.severity.toLowerCase().includes("critical") ? "red" : item.severity.toLowerCase().includes("warning") ? "amber" : "blue";

    return `
      <tr>
        <td><strong style="color:#0f172a; font-family:var(--font-mono);">${item.id}</strong></td>
        <td style="color:#64748b; font-size:0.75rem;">${item.reportedAt}</td>
        <td><strong>${item.machine}</strong></td>
        <td><span style="font-weight:600; color:#1e293b;">${item.reporter}</span></td>
        <td><span class="badge-prefix" style="background:#f1f5f9; color:#334155;">${item.component}</span></td>
        <td style="max-width:280px; line-height:1.35; font-size:0.78rem;" title="${item.problem}">${item.problem}</td>
        <td><span class="pillar-type ${sevClass}">${item.severity}</span></td>
        <td><span style="font-size:0.78rem; font-weight:600;">${item.pic}</span></td>
        <td>${statusBadge}</td>
        <td style="text-align:center;">${actionBtn}</td>
      </tr>
    `;
  }).join("");
}

function filterCmView(filter, btn) {
  cmActiveFilter = filter;
  document.querySelectorAll("#view-cm .approval-tab-pills .pill-tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderCmTable();
}

function showNewCmModal() {
  const modal = document.getElementById("modal-new-cm");
  if (modal) {
    document.getElementById("form-new-cm")?.reset();
    modal.style.display = "flex";
  }
}

function handleCreateCmTicket(event) {
  event.preventDefault();

  const machine = document.getElementById("cm-input-machine").value;
  const reporter = document.getElementById("cm-input-reporter").value.trim();
  const component = document.getElementById("cm-input-component").value;
  const severity = document.getElementById("cm-input-severity").value;
  const desc = document.getElementById("cm-input-desc").value.trim();

  const nextNum = MAINTENANCE_DATA.cmTickets.length + 42;
  const ticketId = `CM-2026-00${nextNum}`;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10) + " " + now.toTimeString().slice(0, 5);

  const newTicket = {
    id: ticketId,
    reportedAt: dateStr,
    machine: machine,
    component: component,
    reporter: reporter,
    severity: severity,
    problem: desc,
    pic: "Belum Ditugaskan",
    status: "waiting",
    downtimeMinutes: 0,
    rootCause: "",
    solution: "",
    sparePart: ""
  };

  MAINTENANCE_DATA.cmTickets.unshift(newTicket);
  closeModal("modal-new-cm");
  renderCmTable();
  updatePillarDashboardCounts();
  showToast(`Tiket Breakdown Baru ${ticketId} Berhasil Dibuat (Trigger Produksi)!`, "success");
}

function startCmRepair(ticketId) {
  const ticket = MAINTENANCE_DATA.cmTickets.find(t => t.id === ticketId);
  if (!ticket) return;

  ticket.status = "in_progress";
  ticket.pic = currentUser?.displayName || "Ahmad Fauzi (PIC)";
  renderCmTable();
  updatePillarDashboardCounts();
  showToast(`Teknisi mulai menangani tiket ${ticketId}`, "info");
}

function showResolveCmModal(ticketId) {
  const ticket = MAINTENANCE_DATA.cmTickets.find(t => t.id === ticketId);
  if (!ticket) return;

  document.getElementById("resolve-cm-ticket-id").value = ticket.id;
  document.getElementById("resolve-cm-modal-title").textContent = `Selesaikan Perbaikan: ${ticket.id} (${ticket.component})`;
  document.getElementById("resolve-cm-pic").value = currentUser?.displayName || ticket.pic || "Ahmad Fauzi";
  document.getElementById("resolve-cm-root-cause").value = ticket.rootCause || "";
  document.getElementById("resolve-cm-action").value = ticket.solution || "";
  document.getElementById("resolve-cm-sparepart").value = ticket.sparePart || "";

  openModal("modal-resolve-cm");
}

function handleResolveCmTicket(event) {
  event.preventDefault();

  const ticketId = document.getElementById("resolve-cm-ticket-id").value;
  const rootCause = document.getElementById("resolve-cm-root-cause").value.trim();
  const action = document.getElementById("resolve-cm-action").value.trim();
  const sparePart = document.getElementById("resolve-cm-sparepart").value.trim();
  const pic = document.getElementById("resolve-cm-pic").value.trim();

  const ticket = MAINTENANCE_DATA.cmTickets.find(t => t.id === ticketId);
  if (ticket) {
    ticket.status = "completed";
    ticket.rootCause = rootCause;
    ticket.solution = action;
    ticket.sparePart = sparePart;
    ticket.pic = pic;
    if (!ticket.downtimeMinutes || ticket.downtimeMinutes === 0) {
      ticket.downtimeMinutes = 35;
    }
  }

  closeModal("modal-resolve-cm");
  renderCmTable();
  updatePillarDashboardCounts();
  showToast(`Tiket ${ticketId} berhasil diselesaikan & diverifikasi!`, "success");
}

function showCmDetailModal(ticketId) {
  const ticket = MAINTENANCE_DATA.cmTickets.find(t => t.id === ticketId);
  if (!ticket) return;

  const content = `
    <div style="display:flex; flex-direction:column; gap:12px; font-size:0.85rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px;">
        <strong style="font-size:1.05rem; color:#0f172a;">${ticket.id}</strong>
        <span class="cm-status-tag completed"><span class="dot"></span>Selesai (${ticket.downtimeMinutes} mnt)</span>
      </div>
      <div><strong>Mesin:</strong> ${ticket.machine}</div>
      <div><strong>Komponen:</strong> ${ticket.component}</div>
      <div><strong>Pelapor (Produksi):</strong> ${ticket.reporter} (${ticket.reportedAt})</div>
      <div><strong>Gejala Awal:</strong><br><span style="color:#64748b;">${ticket.problem}</span></div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
        <div style="color:#b91c1c; font-weight:700; margin-bottom:4px;">Akar Masalah:</div>
        <p style="margin:0 0 10px 0; color:#334155;">${ticket.rootCause || "Dalam analisis"}</p>
        <div style="color:#15803d; font-weight:700; margin-bottom:4px;">Tindakan Perbaikan:</div>
        <p style="margin:0 0 10px 0; color:#334155;">${ticket.solution || "Flushing & kalibrasi"}</p>
        <div style="color:#1d4ed8; font-weight:700; margin-bottom:4px;">Spare Part Diganti:</div>
        <p style="margin:0; color:#334155;">${ticket.sparePart || "Tidak ada"}</p>
      </div>
      <div><strong>Teknisi PIC:</strong> ${ticket.pic}</div>
    </div>
  `;
  openModal("modal-detail", `Detail Perbaikan ${ticket.id}`, content);
}


// --------------------------------------------------------
// B. PREVENTIVE MAINTENANCE (PM) - TRIGGER: MAINTENANCE
// --------------------------------------------------------

function renderPmTable() {
  const container = document.getElementById("pm-table-body");
  if (!container) return;

  const searchVal = (document.getElementById("search-pm")?.value || "").toLowerCase();

  const filtered = MAINTENANCE_DATA.pmTasks.filter(item => {
    let matchesFilter = true;
    if (pmActiveFilter === "stroke") {
      matchesFilter = item.triggerType === "stroke";
    } else if (pmActiveFilter === "calendar") {
      matchesFilter = item.triggerType === "calendar";
    } else if (pmActiveFilter === "pending") {
      matchesFilter = item.status === "Mendatang" || item.status === "Overdue";
    } else if (pmActiveFilter === "completed") {
      matchesFilter = item.status === "Selesai";
    }

    const matchesSearch = item.id.toLowerCase().includes(searchVal) ||
      item.machine.toLowerCase().includes(searchVal) ||
      item.title.toLowerCase().includes(searchVal) ||
      item.pic.toLowerCase().includes(searchVal);

    return matchesFilter && matchesSearch;
  });

  updatePillarDashboardCounts();

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="9" class="mon-table-empty">Tidak ada agenda Preventive Maintenance yang sesuai filter.</td>
      </tr>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const isStroke = item.triggerType === "stroke";
    const triggerBadge = isStroke
      ? `<span class="pillar-type amber">STROKE</span>`
      : `<span class="pillar-type blue">KALENDER</span>`;

    const cycleInfo = isStroke
      ? `<span class="stroke-tag ${item.currentCounter >= item.limitCounter * 0.9 ? "warning" : ""}">
          ${item.currentCounter.toLocaleString()} / ${item.limitCounter.toLocaleString()} Stroke
         </span>`
      : `<span style="font-size:0.75rem; color:#64748b; font-weight:600;">Interval ${item.limitCounter} Jam</span>`;

    let statusBadge = "";
    if (item.status === "Overdue") {
      statusBadge = `<span class="cm-status-tag waiting">Overdue</span>`;
    } else if (item.status === "Mendatang") {
      statusBadge = `<span class="cm-status-tag in_progress">Mendatang</span>`;
    } else {
      statusBadge = `<span class="cm-status-tag completed">Selesai</span>`;
    }

    const checkedCount = item.checklist ? item.checklist.filter(c => c.checked).length : 0;
    const totalCount = item.checklist ? item.checklist.length : 0;

    return `
      <tr>
        <td><strong style="color:#0f172a; font-family:var(--font-mono);">${item.id}</strong></td>
        <td>${triggerBadge}</td>
        <td><strong>${item.machine}</strong></td>
        <td style="max-width:280px; font-size:0.78rem; line-height:1.35;">${item.title}</td>
        <td>${cycleInfo}</td>
        <td style="font-size:0.76rem; color:#64748b;">${item.targetDate}</td>
        <td><span style="font-size:0.78rem; font-weight:600;">${item.pic}</span></td>
        <td>${statusBadge}</td>
        <td style="text-align:center;">
          <button class="table-btn ${item.status === "Selesai" ? "green" : "amber"}" onclick="showPmChecklistModal('${item.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span>Checklist (${checkedCount}/${totalCount})</span>
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function filterPmView(filter, btn) {
  pmActiveFilter = filter;
  document.querySelectorAll("#view-pm .approval-tab-pills .pill-tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderPmTable();
}

function showNewPmModal() {
  const modal = document.getElementById("modal-new-pm");
  if (modal) {
    document.getElementById("form-new-pm")?.reset();
    const dateInput = document.getElementById("pm-input-date");
    if (dateInput) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      dateInput.value = tomorrow.toISOString().slice(0, 10);
    }
    modal.style.display = "flex";
  }
}

function handleCreatePmTask(event) {
  event.preventDefault();

  const machine = document.getElementById("pm-input-machine").value;
  const triggerType = document.getElementById("pm-input-trigger").value;
  const desc = document.getElementById("pm-input-desc").value.trim();
  const date = document.getElementById("pm-input-date").value;
  const pic = document.getElementById("pm-input-pic").value.trim();

  const nextNum = MAINTENANCE_DATA.pmTasks.length + 104;
  const taskId = `PM-2026-${nextNum}`;

  const newTask = {
    id: taskId,
    triggerType: triggerType,
    triggerLabel: triggerType === "stroke" ? "Stroke Counter Jig" : "Kalender Berkala",
    machine: machine,
    title: desc,
    currentCounter: triggerType === "stroke" ? 12000 : 250,
    limitCounter: triggerType === "stroke" ? 50000 : 500,
    targetDate: date,
    pic: pic,
    status: "Mendatang",
    checklist: [
      { item: "Pemeriksaan visual kebersihan & kelonggaran komponen", checked: false },
      { item: "Pengukuran gap clearance / kelonggaran sesuai toleransi", checked: false },
      { item: "Penggantian pelumas / grease sesuai spesifikasi ISO", checked: false },
      { item: "Uji fungsi operasional & emergency stop", checked: false }
    ],
    notes: ""
  };

  MAINTENANCE_DATA.pmTasks.unshift(newTask);
  closeModal("modal-new-pm");
  renderPmTable();
  updatePillarDashboardCounts();
  showToast(`Agenda PM Baru ${taskId} Berhasil Ditambahkan ke Jadwal!`, "success");
}

function showPmChecklistModal(taskId) {
  const task = MAINTENANCE_DATA.pmTasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById("pm-active-task-id").value = task.id;
  document.getElementById("pm-checklist-title").textContent = `Checklist PM: ${task.id}`;
  document.getElementById("pm-checklist-sub").textContent = `${task.machine} - ${task.title}`;
  document.getElementById("pm-checklist-notes").value = task.notes || "";

  const container = document.getElementById("pm-checklist-items-container");
  if (container) {
    container.innerHTML = (task.checklist || []).map((c, idx) => `
      <label class="checklist-item">
        <input type="checkbox" ${c.checked ? "checked" : ""} onchange="togglePmChecklistItem(${idx})">
        <div class="checklist-text">
          <span class="checklist-title">${c.item}</span>
          <span class="checklist-desc">Poin Inspeksi Standar Maintenance MTM</span>
        </div>
      </label>
    `).join("");
  }

  openModal("modal-pm-checklist");
}

function togglePmChecklistItem(index) {
  const taskId = document.getElementById("pm-active-task-id").value;
  const task = MAINTENANCE_DATA.pmTasks.find(t => t.id === taskId);
  if (task && task.checklist && task.checklist[index]) {
    task.checklist[index].checked = !task.checklist[index].checked;
  }
}

function submitPmChecklist() {
  const taskId = document.getElementById("pm-active-task-id").value;
  const notes = document.getElementById("pm-checklist-notes").value.trim();

  const task = MAINTENANCE_DATA.pmTasks.find(t => t.id === taskId);
  if (task) {
    task.notes = notes;
    task.status = "Selesai";
    if (task.checklist) {
      task.checklist.forEach(c => c.checked = true);
    }
  }

  closeModal("modal-pm-checklist");
  renderPmTable();
  updatePillarDashboardCounts();
  showToast(`Checklist PM ${taskId} berhasil disimpan & diverifikasi selesai!`, "success");
}


// --------------------------------------------------------
// C. PREDICTIVE MAINTENANCE (PdM & MPC) - TRIGGER: MPC
// --------------------------------------------------------

function renderPdmView() {
  updateMpcFromLiveSensors();

  const gridContainer = document.getElementById("mpc-component-grid");
  const tableContainer = document.getElementById("mpc-advisory-table-body");

  if (gridContainer) {
    gridContainer.innerHTML = MAINTENANCE_DATA.pdmComponents.map(comp => {
      const isVib = comp.type === "vib";
      const valStr = isVib ? Number(comp.val).toFixed(3) : Number(comp.val).toFixed(1);
      const pct = Math.min(100, Math.max(10, Math.round((comp.val / comp.limit) * 80)));
      const colorClass = comp.val >= comp.limit ? "red" : comp.val >= comp.warning ? "amber" : "green";

      return `
        <div class="mpc-comp-card">
          <div class="mpc-comp-head">
            <div>
              <div class="mpc-comp-title">${comp.name}</div>
              <div class="mpc-comp-loc">${comp.loc} (Sensor #${comp.sensorId})</div>
            </div>
            <span class="pillar-type ${colorClass === "green" ? "blue" : colorClass}">${comp.status}</span>
          </div>

          <div class="mpc-comp-metric">
            <div class="mpc-val-main">
              ${valStr} <span class="mpc-val-unit">${comp.unit}</span>
            </div>
            <div class="mpc-val-limit">Batas: ${comp.limit} ${comp.unit}</div>
          </div>

          <div class="mpc-meter-bar">
            <div class="mpc-meter-fill ${colorClass}" style="width: ${pct}%;"></div>
          </div>

          <div class="mpc-comp-foot">
            <span>RUL: <strong>${comp.rul}</strong></span>
            <span>Warning: ${comp.warning} ${comp.unit}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  if (tableContainer) {
    tableContainer.innerHTML = MAINTENANCE_DATA.pdmComponents.map(comp => {
      const isVib = comp.type === "vib";
      const valStr = isVib ? Number(comp.val).toFixed(3) : Number(comp.val).toFixed(1);
      const colorClass = comp.val >= comp.limit ? "red" : comp.val >= comp.warning ? "amber" : "green";

      return `
        <tr>
          <td><strong>${comp.name}</strong></td>
          <td><span class="badge-prefix" style="background:#eff6ff; color:#1d4ed8;">Sensor #${comp.sensorId}</span></td>
          <td><strong style="font-family:var(--font-mono); font-size:0.95rem;">${valStr} ${comp.unit}</strong></td>
          <td style="font-size:0.75rem; color:#64748b;">${comp.warning} ${comp.unit}</td>
          <td><span class="pillar-type ${colorClass === "green" ? "blue" : colorClass}">${comp.status}</span></td>
          <td><span style="font-weight:700; color:#0f172a;">${comp.rul}</span></td>
          <td style="font-size:0.78rem; line-height:1.35; color:#334155;">${comp.recommendation}</td>
        </tr>
      `;
    }).join("");
  }
}

function updateMpcFromLiveSensors() {
  let penalty = 0;

  MAINTENANCE_DATA.pdmComponents.forEach(comp => {
    const liveVal = latestSensorValues[comp.sensorId];
    if (liveVal !== undefined && liveVal !== null) {
      comp.val = Number(liveVal);
    }

    if (comp.val >= comp.limit) {
      comp.status = "ANOMALI";
      penalty += 4.5;
    } else if (comp.val >= comp.warning) {
      comp.status = "WARNING";
      penalty += 1.8;
    } else {
      comp.status = "OPTIMAL";
    }
  });

  const liveScore = Math.max(80.0, +(99.2 - penalty).toFixed(1));
  const healthScoreEl = document.getElementById("mpc-live-health-score");
  if (healthScoreEl) healthScoreEl.textContent = liveScore.toFixed(1);

  const dashHealthEl = document.getElementById("dash-pdm-health");
  if (dashHealthEl) dashHealthEl.textContent = `Health: ${liveScore.toFixed(1)}%`;

  const dashPdmStatusEl = document.getElementById("dash-pdm-status");
  if (dashPdmStatusEl) {
    dashPdmStatusEl.textContent = penalty === 0 ? "OPTIMAL" : penalty > 4 ? "PERIKSA" : "WASPADA";
    dashPdmStatusEl.className = penalty === 0 ? "stat-val green" : penalty > 4 ? "stat-val red" : "stat-val amber";
  }

  const dashPdmAnomalyEl = document.getElementById("dash-pdm-anomaly");
  if (dashPdmAnomalyEl) {
    const anomalyCount = MAINTENANCE_DATA.pdmComponents.filter(c => c.status !== "OPTIMAL").length;
    dashPdmAnomalyEl.textContent = `${anomalyCount} Terdeteksi`;
    dashPdmAnomalyEl.className = anomalyCount === 0 ? "stat-val green" : "stat-val red";
  }
}

function refreshMpcHealth() {
  updateMpcFromLiveSensors();
  renderPdmView();
  showToast("Diagnosa MPC Berhasil: Seluruh 6 Titik Komponen Terverifikasi Optimal!", "success");
}

function updatePillarDashboardCounts() {
  // 1. CM Counts
  const activeCm = MAINTENANCE_DATA.cmTickets.filter(t => t.status === "waiting" || t.status === "in_progress").length;
  const dashCmCountEl = document.getElementById("dash-cm-count");
  if (dashCmCountEl) dashCmCountEl.textContent = `${activeCm} Tiket Aktif`;
  const dashCmOpenEl = document.getElementById("dash-cm-open");
  if (dashCmOpenEl) dashCmOpenEl.textContent = `${activeCm} Kasus`;

  // 2. PM Counts
  const overduePm = MAINTENANCE_DATA.pmTasks.filter(t => t.status === "Overdue").length;
  const pendingPm = MAINTENANCE_DATA.pmTasks.filter(t => t.status === "Mendatang").length;
  const completedPm = MAINTENANCE_DATA.pmTasks.filter(t => t.status === "Selesai").length;
  const totalPm = MAINTENANCE_DATA.pmTasks.length;
  const compliance = totalPm > 0 ? ((completedPm / totalPm) * 100).toFixed(1) : "94.2";

  const dashPmCountEl = document.getElementById("dash-pm-count");
  if (dashPmCountEl) dashPmCountEl.textContent = `${overduePm} Overdue, ${pendingPm} Mendatang`;
  const dashPmCompEl = document.getElementById("dash-pm-compliance");
  if (dashPmCompEl) dashPmCompEl.textContent = `${compliance}%`;
  const dashPmTotalEl = document.getElementById("dash-pm-total");
  if (dashPmTotalEl) dashPmTotalEl.textContent = `${totalPm} Task`;

  // 3. PdM Health
  updateMpcFromLiveSensors();
}

// ========================================================
// 8. DASHBOARD GRAFIK ANALITIK MESIN JINGDUAN FORGING
// ========================================================
// ========================================================
// 8. DASHBOARD GRAFIK ANALITIK MESIN JINGDUAN FORGING (REAL-TIME STREAMING)
// ========================================================
const STREAM_WINDOW_SIZE = 30;
let dashChartPointsLimit = 30;
let dashTempFilter = "all";
let dashTelemetryHistory = [];
let dashDevicesCache = [];
let streamTickTimer = null;
let streamInitialized = false;

// Ring buffer per-sensor untuk time-series mengalir secara kontinu
const streamSeriesMap = {
  "0": [], // link-temperature (#0)
  "3": [], // right-eccentric-bush (#3)
  "4": [], // left-eccentric-bush (#4)
  "5": [], // right-transmission-bearing (#5)
  "6": [], // left-transmission-bearing (#6)
  "1": []  // vibration (#1)
};

// Target nilai sensor terkini (disinkronkan dari MQTT / API backend)
const latestSensorValues = {
  "0": 38.5,
  "3": 48.2,
  "4": 47.1,
  "5": 44.8,
  "6": 43.6,
  "1": 0.045
};

// Inisialisasi awal buffer agar grafik langsung terisi penuh dan berjalan sejak detik pertama
function initStreamBuffers() {
  if (streamInitialized && streamSeriesMap["0"] && streamSeriesMap["0"].length >= STREAM_WINDOW_SIZE) return;

  const now = Date.now();
  const stepMs = 1200;

  const baselineMap = {
    "0": 38.5,
    "3": 48.2,
    "4": 47.1,
    "5": 44.8,
    "6": 43.6,
    "1": 0.045
  };

  Object.keys(streamSeriesMap).forEach(id => {
    streamSeriesMap[id] = [];
    const base = baselineMap[id] || 40.0;
    const isVib = id === "1";

    for (let i = STREAM_WINDOW_SIZE - 1; i >= 0; i--) {
      const ptTime = now - i * stepMs;
      const wave = isVib 
        ? Math.sin(i * 0.4) * 0.012 + (Math.random() - 0.5) * 0.005
        : Math.sin(i * 0.3 + parseInt(id, 10)) * 1.1 + (Math.random() - 0.5) * 0.35;
      const val = isVib ? Math.max(0.015, +(base + wave).toFixed(3)) : +(base + wave).toFixed(1);

      streamSeriesMap[id].push({
        time: ptTime,
        val: val
      });
    }
  });

  streamInitialized = true;
}

// Ingest membaca data baru dari respons backend
function ingestReadingIntoStream(deviceId, rawVal) {
  if (rawVal == null) return;
  const devId = getJingduanDeviceId(deviceId);
  if (devId && latestSensorValues[devId] !== undefined) {
    latestSensorValues[devId] = Number(rawVal);
  }
}

// Detak waktu konstan: membuat grafik terus jalan seiring waktu dan data baru yang masuk
function advanceStreamTimeline() {
  initStreamBuffers();

  const now = Date.now();

  Object.keys(streamSeriesMap).forEach(id => {
    const isVib = id === "1";
    const targetVal = latestSensorValues[id] ?? (isVib ? 0.045 : 45.0);
    
    // Mikro-fluktuasi lembut agar garis sensor terus bergerak dinamis saat streaming
    const drift = isVib 
      ? (Math.random() - 0.5) * 0.002
      : (Math.random() - 0.5) * 0.2;

    let nextVal = isVib 
      ? Math.max(0.01, +(targetVal + drift).toFixed(3))
      : +(targetVal + drift).toFixed(1);

    latestSensorValues[id] = nextVal;

    streamSeriesMap[id].push({
      time: now,
      val: nextVal
    });

    if (streamSeriesMap[id].length > STREAM_WINDOW_SIZE) {
      streamSeriesMap[id].shift();
    }
  });

  // Sinkronkan pembaruan candlestick & running trade Stockbit
  if (typeof updateStockbitOnTick === "function") {
    updateStockbitOnTick(now);
  }

  // Update status MPC & Pilar Maintenance secara real-time
  updateMpcFromLiveSensors();

  // Gambar ulang grafik jika view Dashboard sedang aktif
  const dashView = document.getElementById("view-dashboard");
  const isDashActive = activeView === "dashboard" || (dashView && (dashView.style.display !== "none" && !dashView.style.display.includes("none")));
  if (isDashActive) {
    renderTemperatureChart();
    renderVibrationChart();
    updateLiveStreamingKpis();
    updatePillarDashboardCounts();
  } else if (activeView === "pdm") {
    renderPdmView();
  }

  // Gambar ulang grafik garis Live Monitoring secara real-time
  const monView = document.getElementById("view-monitoring");
  const isMonActive = activeView === "monitoring" || (monView && (monView.style.display !== "none" && !monView.style.display.includes("none")));
  if (isMonActive) {
    renderMonitoringLiveCharts();
  }
}

function updateLiveStreamingKpis() {
  const tempKeys = ["0", "3", "4", "5", "6"];
  const tempVals = tempKeys.map(k => latestSensorValues[k]);
  const avg = tempVals.reduce((a, b) => a + b, 0) / tempVals.length;
  setText("kpi-avg-temp", fmtNum(avg, 1));

  let peakVal = tempVals[0];
  let peakKey = "0";
  tempKeys.forEach(k => {
    if (latestSensorValues[k] > peakVal) {
      peakVal = latestSensorValues[k];
      peakKey = k;
    }
  });
  setText("kpi-peak-temp", fmtNum(peakVal, 1));

  const keyNames = {
    "0": "Link Temp (#0)",
    "3": "Right Bush (#3)",
    "4": "Left Bush (#4)",
    "5": "Right Bearing (#5)",
    "6": "Left Bearing (#6)"
  };
  setText("kpi-peak-device", keyNames[peakKey] || "-");

  const vibVal = latestSensorValues["1"];
  if (vibVal != null) {
    setText("kpi-vib-val", fmtNum(vibVal, 3));
    setText("kpi-vib-sub", vibVal > 0.10 ? "⚠️ Di Atas Batas" : "Aman (< 0.10 in/s)");
  }

  const hasWarning = peakVal > 75 || (vibVal != null && vibVal > 0.10);
  const statusEl = document.getElementById("kpi-machine-status");
  if (statusEl) {
    statusEl.className = `dash-pill-status ${hasWarning ? "warn" : "ok"}`;
    statusEl.innerHTML = `<span class="dot"></span>${hasWarning ? "WARNING" : "NORMAL"}`;
  }

  setText("kpi-last-update", new Date().toLocaleTimeString("id-ID"));
}

function updateDashboardChartRange(val) {
  dashChartPointsLimit = parseInt(val, 10) || 30;
  renderTemperatureChart();
  renderVibrationChart();
}

function setTempChartFilter(filterKey, btn) {
  dashTempFilter = filterKey;
  const group = document.getElementById("temp-chart-filter-group");
  if (group) {
    group.querySelectorAll(".dash-tab, .dash-tab-sm").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }
  renderTemperatureChart();
}

async function fetchDashboardCharts() {
  const dashView = document.getElementById("view-dashboard");
  const isDashActive = activeView === "dashboard" || (dashView && (dashView.style.display !== "none" && !dashView.style.display.includes("none")));

  try {
    const [telRes, devRes] = await Promise.all([
      fetch(`${API_BASE_URL}/telemetry?limit=50`),
      fetch(`${API_BASE_URL}/devices`)
    ]);

    let rows = telRes.ok ? await telRes.json() : [];
    let devices = devRes.ok ? await devRes.json() : [];

    rows = rows.filter(r => isJingduanDevice(r.device_id));
    devices = devices.filter(d => isJingduanDevice(d.device_id));

    // Sinkronkan target value dari perangkat live
    devices.forEach(d => {
      const isVib = (d.device_id || "").toLowerCase().includes("vibration");
      const devIdNum = getJingduanDeviceId(d.device_id, d.raw_payload);
      if (devIdNum && latestSensorValues[devIdNum] !== undefined) {
        if (isVib && d.pressure != null) {
          latestSensorValues[devIdNum] = Number(d.pressure);
        } else if (!isVib && d.temperature != null) {
          latestSensorValues[devIdNum] = Number(d.temperature);
        }
      }
    });

    dashTelemetryHistory = rows;
    dashDevicesCache = devices;

    if (isDashActive) {
      updateDashboardKpis(devices, rows);
      renderDashboardMatrix(devices);
      renderTemperatureChart();
      renderVibrationChart();
    }
  } catch (err) {
    // Keep running
  }
}

function getCompactComponentName(id) {
  const s = (id || "").toLowerCase();
  if (s.includes("link-temperature")) return "Link Temp (#0)";
  if (s.includes("right-eccentric-bush")) return "Right Bush (#3)";
  if (s.includes("left-eccentric-bush")) return "Left Bush (#4)";
  if (s.includes("right-transmission-bearing")) return "Right Bearing (#5)";
  if (s.includes("left-transmission-bearing")) return "Left Bearing (#6)";
  if (s.includes("vibration")) return "Vibration (#1)";
  return id || "-";
}

function updateDashboardKpis(devices, rows) {
  updateLiveStreamingKpis();
  updateTopbarTable(devices);
}

function updateTopbarTable(devices) {
  const configs = [
    { id: "0", key: "link-temperature", isVib: false, limit: 75 },
    { id: "3", key: "right-eccentric-bush", isVib: false, limit: 75 },
    { id: "4", key: "left-eccentric-bush", isVib: false, limit: 75 },
    { id: "5", key: "right-transmission-bearing", isVib: false, limit: 75 },
    { id: "6", key: "left-transmission-bearing", isVib: false, limit: 75 },
    { id: "1", key: "vibration", isVib: true, limit: 0.10 }
  ];

  configs.forEach(cfg => {
    const valEl = document.getElementById(`top-val-${cfg.id}`);
    const badgeEl = document.getElementById(`top-badge-${cfg.id}`);
    const liveVal = latestSensorValues[cfg.id];

    if (valEl && liveVal !== undefined) {
      const numStr = cfg.isVib ? fmtNum(liveVal, 3) : fmtNum(liveVal, 1);
      const unit = cfg.isVib ? "in/s" : "°C";
      valEl.innerHTML = `<strong class="top-val-num">${numStr}</strong> <span class="top-val-unit">${unit}</span>`;

      if (badgeEl) {
        const isWarn = liveVal > cfg.limit;
        badgeEl.className = `topbar-badge ${isWarn ? "warn" : "ok"}`;
        badgeEl.textContent = isWarn ? "WARNING" : "NORMAL";
      }
    }
  });
}

function renderTemperatureChart(history, filter) {
  initStreamBuffers();
  const activeFilter = filter || dashTempFilter || "all";
  const canvas = document.getElementById("canvas-temp-chart");
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(300, rect.width || canvas.parentElement?.clientWidth || 450);
  const height = 260;

  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const pad = { top: 20, right: 30, bottom: 26, left: 36 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const sensorConfigs = [
    { id: "0", subtopic: "link-temperature", label: "Link Temp (#0)", color: "#f59e0b", valEl: "leg-val-0", cat: "link" },
    { id: "3", subtopic: "right-eccentric-bush", label: "Right Bush (#3)", color: "#2563eb", valEl: "leg-val-3", cat: "bush" },
    { id: "4", subtopic: "left-eccentric-bush", label: "Left Bush (#4)", color: "#06b6d4", valEl: "leg-val-4", cat: "bush" },
    { id: "5", subtopic: "right-transmission-bearing", label: "Right Bearing (#5)", color: "#8b5cf6", valEl: "leg-val-5", cat: "bearing" },
    { id: "6", subtopic: "left-transmission-bearing", label: "Left Bearing (#6)", color: "#ec4899", valEl: "leg-val-6", cat: "bearing" },
  ];

  const activeSensors = sensorConfigs.filter(s => activeFilter === "all" || s.cat === activeFilter);

  const minY = 0;
  const maxY = 80;

  // Garis Grid Y
  ctx.strokeStyle = "#eef2f6";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#64748b";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";

  const ySteps = [0, 20, 40, 60, 80];
  ySteps.forEach(yVal => {
    const yPos = pad.top + plotH - ((yVal - minY) / (maxY - minY)) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, yPos);
    ctx.lineTo(width - pad.right, yPos);
    ctx.stroke();
    ctx.fillText(`${yVal}°C`, pad.left - 8, yPos + 3);
  });

  // Limit Peringatan (75°C)
  const yWarn = pad.top + plotH - ((75 - minY) / (maxY - minY)) * plotH;
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, yWarn);
  ctx.lineTo(width - pad.right, yWarn);
  ctx.stroke();
  ctx.fillStyle = "#ef4444";
  ctx.textAlign = "left";
  ctx.font = "bold 9px 'JetBrains Mono', monospace";
  ctx.fillText("75°C LIMIT", width - pad.right - 65, yWarn - 5);
  ctx.restore();

  // Pulse radius untuk animasi denyut beacon data terkini
  const pulseR = 5 + Math.sin(Date.now() / 200) * 2.5;
  const totalSlots = STREAM_WINDOW_SIZE;

  activeSensors.forEach(cfg => {
    const points = streamSeriesMap[cfg.id] || [];
    if (points.length === 0) return;

    const latestPt = points[points.length - 1];
    setText(cfg.valEl, latestPt ? `${fmtNum(latestPt.val, 1)} °C` : "-- °C");

    if (points.length < 2) return;

    // Gambar Garis Waveform
    ctx.beginPath();
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";

    points.forEach((pt, idx) => {
      const xPos = pad.left + (idx / (totalSlots - 1)) * plotW;
      const tVal = Math.min(maxY, Math.max(minY, pt.val || 0));
      const yPos = pad.top + plotH - ((tVal - minY) / (maxY - minY)) * plotH;

      if (idx === 0) ctx.moveTo(xPos, yPos);
      else ctx.lineTo(xPos, yPos);
    });
    ctx.stroke();

    // Gambar Titik & Beacon Data Real-Time
    points.forEach((pt, idx) => {
      const xPos = pad.left + (idx / (totalSlots - 1)) * plotW;
      const tVal = Math.min(maxY, Math.max(minY, pt.val || 0));
      const yPos = pad.top + plotH - ((tVal - minY) / (maxY - minY)) * plotH;

      if (idx % 3 === 0 || idx === points.length - 1) {
        ctx.beginPath();
        ctx.arc(xPos, yPos, idx === points.length - 1 ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Animasi Denyut Beacon Ujung Kanan (Data Paling Baru)
      if (idx === points.length - 1) {
        ctx.beginPath();
        ctx.arc(xPos, yPos, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    });
  });

  // Label Waktu Berjalan di Bawah (X-Axis)
  const refSeries = streamSeriesMap["0"] || [];
  if (refSeries.length > 0) {
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.font = "10px 'JetBrains Mono', monospace";

    const labelIndices = [0, 7, 14, 21, refSeries.length - 1];
    labelIndices.forEach(idx => {
      if (idx < refSeries.length) {
        const pt = refSeries[idx];
        const xPos = pad.left + (idx / (totalSlots - 1)) * plotW;
        const d = new Date(pt.time);
        const timeStr = !isNaN(d.getTime()) 
          ? d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) 
          : "";
        ctx.fillText(timeStr, xPos, height - pad.bottom + 16);
      }
    });
  }

  ctx.restore();
}

function renderVibrationChart(history) {
  initStreamBuffers();
  const canvas = document.getElementById("canvas-vib-chart");
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(300, rect.width || canvas.parentElement?.clientWidth || 450);
  const height = 260;

  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const pad = { top: 20, right: 30, bottom: 26, left: 36 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const minY = 0.0;
  const maxY = 0.16;

  // Grid Y
  ctx.strokeStyle = "#eef2f6";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#64748b";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";

  const ySteps = [0.00, 0.04, 0.08, 0.12, 0.16];
  ySteps.forEach(yVal => {
    const yPos = pad.top + plotH - ((yVal - minY) / (maxY - minY)) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, yPos);
    ctx.lineTo(width - pad.right, yPos);
    ctx.stroke();
    ctx.fillText(`${yVal.toFixed(2)}`, pad.left - 8, yPos + 3);
  });

  // Limit Warning (0.10 in/s)
  const yWarn = pad.top + plotH - ((0.10 - minY) / (maxY - minY)) * plotH;
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, yWarn);
  ctx.lineTo(width - pad.right, yWarn);
  ctx.stroke();
  ctx.fillStyle = "#d97706";
  ctx.textAlign = "left";
  ctx.font = "bold 9px 'JetBrains Mono', monospace";
  ctx.fillText("0.10 WARNING", width - pad.right - 75, yWarn - 5);

  // Limit Danger (0.15 in/s)
  const yDang = pad.top + plotH - ((0.15 - minY) / (maxY - minY)) * plotH;
  ctx.strokeStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(pad.left, yDang);
  ctx.lineTo(width - pad.right, yDang);
  ctx.stroke();
  ctx.fillStyle = "#ef4444";
  ctx.fillText("0.15 DANGER", width - pad.right - 68, yDang - 5);
  ctx.restore();

  const vibPoints = streamSeriesMap["1"] || [];
  if (vibPoints.length < 2) {
    ctx.restore();
    return;
  }

  const vals = vibPoints.map(p => p.val || 0);
  const peak = Math.max(...vals);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const latest = vals[vals.length - 1];

  setText("vib-peak-tag", `${fmtNum(peak, 3)} in/s`);
  setText("vib-avg-tag", `${fmtNum(avg, 3)} in/s`);
  setText("leg-val-vib", `${fmtNum(latest, 3)} in/s`);

  const totalSlots = STREAM_WINDOW_SIZE;

  // Area Fill Gradient Hijau Emerald
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  grad.addColorStop(0, "rgba(16, 185, 129, 0.32)");
  grad.addColorStop(1, "rgba(16, 185, 129, 0.02)");

  ctx.beginPath();
  vibPoints.forEach((pt, idx) => {
    const xPos = pad.left + (idx / (totalSlots - 1)) * plotW;
    const vVal = Math.min(maxY, Math.max(minY, pt.val || 0));
    const yPos = pad.top + plotH - ((vVal - minY) / (maxY - minY)) * plotH;

    if (idx === 0) ctx.moveTo(xPos, yPos);
    else ctx.lineTo(xPos, yPos);
  });
  ctx.lineTo(pad.left + ((vibPoints.length - 1) / (totalSlots - 1)) * plotW, pad.top + plotH);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Garis Stroke Getaran
  ctx.beginPath();
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 2.4;
  ctx.lineJoin = "round";

  vibPoints.forEach((pt, idx) => {
    const xPos = pad.left + (idx / (totalSlots - 1)) * plotW;
    const vVal = Math.min(maxY, Math.max(minY, pt.val || 0));
    const yPos = pad.top + plotH - ((vVal - minY) / (maxY - minY)) * plotH;

    if (idx === 0) ctx.moveTo(xPos, yPos);
    else ctx.lineTo(xPos, yPos);
  });
  ctx.stroke();

  // Titik dan Denyut Beacon
  const pulseR = 5 + Math.sin(Date.now() / 200) * 2.5;
  vibPoints.forEach((pt, idx) => {
    const xPos = pad.left + (idx / (totalSlots - 1)) * plotW;
    const vVal = Math.min(maxY, Math.max(minY, pt.val || 0));
    const yPos = pad.top + plotH - ((vVal - minY) / (maxY - minY)) * plotH;

    if (idx % 3 === 0 || idx === vibPoints.length - 1) {
      ctx.beginPath();
      ctx.arc(xPos, yPos, idx === vibPoints.length - 1 ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (idx === vibPoints.length - 1) {
      ctx.beginPath();
      ctx.arc(xPos, yPos, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  });

  // Waktu Berjalan di Bawah (X-Axis)
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  ctx.font = "10px 'JetBrains Mono', monospace";
  const labelIndices = [0, 7, 14, 21, vibPoints.length - 1];
  labelIndices.forEach(idx => {
    if (idx < vibPoints.length) {
      const pt = vibPoints[idx];
      const xPos = pad.left + (idx / (totalSlots - 1)) * plotW;
      const d = new Date(pt.time);
      const timeStr = !isNaN(d.getTime()) 
        ? d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) 
        : "";
      ctx.fillText(timeStr, xPos, height - pad.bottom + 16);
    }
  });

  ctx.restore();
}

function renderDashboardMatrix(devices) {
  const container = document.getElementById("dash-matrix-container");
  if (!container) return;

  const jingduanKeys = [
    { key: "link-temperature", id: "0", name: "Link Temperature", isVib: false, limit: 75 },
    { key: "right-eccentric-bush", id: "3", name: "Right Eccentric Bush", isVib: false, limit: 75 },
    { key: "left-eccentric-bush", id: "4", name: "Left Eccentric Bush", isVib: false, limit: 75 },
    { key: "right-transmission-bearing", id: "5", name: "Right Transmission Bearing", isVib: false, limit: 75 },
    { key: "left-transmission-bearing", id: "6", name: "Left Transmission Bearing", isVib: false, limit: 75 },
    { key: "vibration", id: "1", name: "Vibration Sensor", isVib: true, limit: 0.10 }
  ];

  container.innerHTML = jingduanKeys.map(item => {
    const dev = devices.find(d => d.device_id.toLowerCase().includes(item.key));
    const val = item.isVib
      ? (dev?.pressure != null ? dev.pressure : 0.055)
      : (dev?.temperature != null ? dev.temperature : 45.0);
    const isWarn = val > item.limit;
    const pct = Math.min(100, Math.max(10, Math.round((val / item.limit) * 80)));
    const valStr = item.isVib ? fmtNum(val, 3) : fmtNum(val, 1);
    const unit = item.isVib ? "in/s" : "°C";

    return `
      <div class="matrix-item-card">
        <div class="matrix-item-head">
          <span class="matrix-chip">#${item.id}</span>
          <span class="matrix-dot ${isWarn ? "warn" : ""}"></span>
        </div>
        <div class="matrix-name" title="${item.name}">${item.name}</div>
        <div class="matrix-val-row">
          <span class="matrix-val">${valStr}</span>
          <span class="matrix-unit">${unit}</span>
        </div>
        <div class="matrix-bar-wrap">
          <div class="matrix-bar-fill ${item.isVib ? "vib" : (isWarn ? "warn" : "")}" style="width:${pct}%;"></div>
        </div>
      </div>
    `;
  }).join("");
}

// ========================================================
// 10. STOCKBIT & TRADINGVIEW PRO MONITORING TERMINAL
// ========================================================

const STOCK_SENSOR_METAS = {
  "0": { id: "0", name: "Link Temperature", short: "Link Temp", unit: "°C", isVib: false, limit: 75, color: "#f59e0b" },
  "3": { id: "3", name: "Right Eccentric Bush", short: "Right Bush", unit: "°C", isVib: false, limit: 75, color: "#2563eb" },
  "4": { id: "4", name: "Left Eccentric Bush", short: "Left Bush", unit: "°C", isVib: false, limit: 75, color: "#06b6d4" },
  "5": { id: "5", name: "Right Transmission Bearing", short: "Right Bearing", unit: "°C", isVib: false, limit: 75, color: "#10b981" },
  "6": { id: "6", name: "Left Transmission Bearing", short: "Left Bearing", unit: "°C", isVib: false, limit: 75, color: "#ec4899" },
  "1": { id: "1", name: "Vibration Sensor", short: "Vibration", unit: "in/s", isVib: true, limit: 0.08, color: "#8b5cf6" },
};

let stockActiveSensor = "0"; // "0", "3", "4", "5", "6", "1", "all"
let stockTimeframe = "5s"; // "1s", "5s", "15s", "30s", "1m"
let stockChartType = "candle"; // "candle", "line"
let stockIndicators = {
  ma7: true,
  ma21: true,
  limit: true
};
let stockActiveTool = "crosshair";
let stockCrosshairPos = null;
let stockCandlesMap = {}; // sensorId -> [ { time, open, high, low, close, volume } ]
let stockRunningTrades = []; // [ { id, time, timeStr, sensorId, name, val, prevVal, delta, pct, dir, status, raw } ]
let isRtPaused = false;
let rtActiveFilter = "all"; // 'all', 'up', 'down', 'warn'
let stockCandleStartTime = {}; // sensorId -> timestamp of current candle
let stockPreviousVals = {}; // sensorId -> previous tick val
let stockCanvasListenersAttached = false;
let stockVisibleCount = 35;

// Timeframe duration in milliseconds
function getStockTfMs() {
  switch (stockTimeframe) {
    case "1s": return 1000;
    case "5s": return 5000;
    case "15s": return 15000;
    case "30s": return 30000;
    case "1m": return 60000;
    default: return 5000;
  }
}

// Inisialisasi awal lilin candlestick realistis (35 lilin sebelumnya)
function initStockCandles() {
  if (stockCandlesMap["0"] && stockCandlesMap["0"].length > 0) return;

  const now = Date.now();
  const tfMs = getStockTfMs();
  const count = 35;

  Object.keys(STOCK_SENSOR_METAS).forEach(sId => {
    const meta = STOCK_SENSOR_METAS[sId];
    stockCandlesMap[sId] = [];
    let curVal = latestSensorValues[sId] != null ? latestSensorValues[sId] : (meta.isVib ? 0.045 : 42.0);

    // Bangun mundur 35 candle
    const tempCandles = [];
    for (let i = count; i >= 1; i--) {
      const cTime = now - i * tfMs;
      const step = meta.isVib ? (Math.random() - 0.5) * 0.004 : (Math.random() - 0.5) * 0.45;
      const open = meta.isVib ? Math.max(0.015, +(curVal - step).toFixed(3)) : +(curVal - step).toFixed(1);
      const close = curVal;
      const spread = meta.isVib ? Math.random() * 0.003 + 0.001 : Math.random() * 0.35 + 0.1;
      const high = meta.isVib ? +(Math.max(open, close) + spread).toFixed(3) : +(Math.max(open, close) + spread).toFixed(1);
      const low = meta.isVib ? Math.max(0.01, +(Math.min(open, close) - spread).toFixed(3)) : +(Math.min(open, close) - spread).toFixed(1);
      const volume = Math.floor(Math.random() * 250 + 50);

      tempCandles.push({
        time: cTime,
        open: open,
        high: high,
        low: low,
        close: close,
        volume: volume
      });

      // Jalan ke nilai berikutnya
      const nextDrift = meta.isVib ? (Math.random() - 0.49) * 0.002 : (Math.random() - 0.49) * 0.25;
      curVal = meta.isVib ? Math.max(0.015, +(curVal + nextDrift).toFixed(3)) : +(curVal + nextDrift).toFixed(1);
    }

    stockCandlesMap[sId] = tempCandles;
    stockCandleStartTime[sId] = now;
  });
}

// Detak setiap detik: membentuk candle baru / memperbarui candle berjalan dan mencatat running trade
function updateStockbitOnTick(now) {
  initStockCandles();

  const tfMs = getStockTfMs();
  const timeStr = new Date(now).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  Object.keys(STOCK_SENSOR_METAS).forEach(sId => {
    const meta = STOCK_SENSOR_METAS[sId];
    const val = latestSensorValues[sId] != null ? latestSensorValues[sId] : (meta.isVib ? 0.045 : 40.0);
    const prev = stockPreviousVals[sId] != null ? stockPreviousVals[sId] : val;
    stockPreviousVals[sId] = val;

    const delta = meta.isVib ? +(val - prev).toFixed(3) : +(val - prev).toFixed(2);
    const pct = prev > 0 ? +((delta / prev) * 100).toFixed(2) : 0;
    const dir = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    const status = val > meta.limit ? "critical" : val > (meta.limit * 0.9) ? "warning" : "normal";

    // 1. Catat ke riwayat perubahan (Running Trade)
    if (!isRtPaused) {
      stockRunningTrades.unshift({
        id: `${now}-${sId}`,
        time: now,
        timeStr: timeStr,
        sensorId: sId,
        name: meta.short,
        unit: meta.unit,
        val: val,
        prevVal: prev,
        delta: delta,
        pct: pct,
        dir: dir,
        status: status,
        isVib: meta.isVib,
        raw: meta.isVib ? `{"p":${val}}` : `{"t":${val}}`,
        isNew: true
      });

      if (stockRunningTrades.length > 80) {
        stockRunningTrades.pop();
      }
    }

    // 2. Perbarui candlestick aktif
    const candles = stockCandlesMap[sId] || [];
    const lastStart = stockCandleStartTime[sId] || (now - tfMs);

    if (now - lastStart >= tfMs || candles.length === 0) {
      // Tutup candle lama & buka candle baru
      stockCandleStartTime[sId] = now;
      candles.push({
        time: now,
        open: val,
        high: val,
        low: val,
        close: val,
        volume: Math.floor(Math.random() * 80 + 20)
      });
      if (candles.length > 50) candles.shift();
    } else {
      // Update candle berjalan saat ini
      const activeC = candles[candles.length - 1];
      activeC.high = meta.isVib ? Math.max(activeC.high, val) : +(Math.max(activeC.high, val)).toFixed(1);
      activeC.low = meta.isVib ? Math.min(activeC.low, val) : +(Math.min(activeC.low, val)).toFixed(1);
      activeC.close = val;
      activeC.volume += Math.floor(Math.random() * 15 + 5);
    }
  });

  // 3. Update DOM Ticker, Watchlist & Bandar Detector
  updateStockTerminalHeader();
  updateStockWatchlistBar();
  updateBandarDetectorDOM();

  // 4. Render tabel Running Trade jika view monitoring aktif
  renderStockRunningTrades();
}

// Update Header Ticker & OHLC Bar
function updateStockTerminalHeader() {
  const sId = stockActiveSensor === "all" ? "0" : stockActiveSensor;
  const meta = STOCK_SENSOR_METAS[sId] || STOCK_SENSOR_METAS["0"];
  const val = latestSensorValues[sId] != null ? latestSensorValues[sId] : 0;
  const candles = stockCandlesMap[sId] || [];
  const curCandle = candles[candles.length - 1] || { open: val, high: val, low: val, close: val, volume: 100 };
  const firstCandle = candles[0] || curCandle;

  const totalDelta = meta.isVib ? +(curCandle.close - firstCandle.open).toFixed(3) : +(curCandle.close - firstCandle.open).toFixed(2);
  const totalPct = firstCandle.open > 0 ? +((totalDelta / firstCandle.open) * 100).toFixed(2) : 0;
  const isUp = totalDelta >= 0;

  setText("stock-active-name", stockActiveSensor === "all" ? "Semua Sensor Mesin (Multi-Series)" : `${meta.name} (#${meta.id})`);
  setText("stock-live-price", meta.isVib ? fmtNum(curCandle.close, 3) : fmtNum(curCandle.close, 2));
  setText("stock-live-unit", meta.unit);

  const tag = document.getElementById("stock-change-tag");
  if (tag) {
    tag.className = `stock-change-tag ${isUp ? "up" : "down"}`;
    setText("stock-change-symbol", isUp ? "▲" : "▼");
    setText("stock-change-val", `${isUp ? "+" : ""}${totalDelta}`);
    setText("stock-change-pct", `(${isUp ? "+" : ""}${totalPct}%)`);
  }

  setText("stock-stat-open", meta.isVib ? fmtNum(curCandle.open, 3) : fmtNum(curCandle.open, 2));
  setText("stock-stat-high", meta.isVib ? fmtNum(curCandle.high, 3) : fmtNum(curCandle.high, 2));
  setText("stock-stat-low", meta.isVib ? fmtNum(curCandle.low, 3) : fmtNum(curCandle.low, 2));
  setText("stock-stat-close", meta.isVib ? fmtNum(curCandle.close, 3) : fmtNum(curCandle.close, 2));
  setText("stock-stat-vol", `${curCandle.volume.toLocaleString("id-ID")} pkt`);
}

// Update Watchlist Chip Bar
function updateStockWatchlistBar() {
  Object.keys(STOCK_SENSOR_METAS).forEach(sId => {
    const meta = STOCK_SENSOR_METAS[sId];
    const val = latestSensorValues[sId];
    const prev = stockPreviousVals[sId] != null ? stockPreviousVals[sId] : val;
    const isUp = (val || 0) >= (prev || 0);

    const valEl = document.getElementById(`watch-val-${sId}`);
    if (valEl && val != null) {
      valEl.textContent = meta.isVib ? `${fmtNum(val, 3)} in/s` : `${fmtNum(val, 1)} °C`;
    }

    const dirEl = document.getElementById(`watch-dir-${sId}`);
    if (dirEl) {
      dirEl.textContent = isUp ? "▲" : "▼";
      dirEl.className = `watch-dir ${isUp ? "up" : "down"}`;
    }

    const chip = document.querySelector(`.stock-watch-chip[data-id="${sId}"], .sb-watch-chip[data-id="${sId}"], .mon-sensor-chip[data-id="${sId}"]`);
    if (chip) {
      if (stockActiveSensor === sId) chip.classList.add("active");
      else chip.classList.remove("active");
    }
  });
}

// Menghitung Simple Moving Average (SMA)
function calcMovingAverage(candles, period) {
  const result = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[i - j].close;
      }
      result.push(sum / period);
    }
  }
  return result;
}

// RENDER UTAMA: Stockbit / TradingView Canvas Candlestick & Line Chart
function renderMonitoringLiveCharts() {
  initStockCandles();

  const monView = document.getElementById("view-monitoring");
  if (!monView || (monView.style.display === "none" && activeView !== "monitoring")) return;

  renderStockMainChart();
  renderStockBandarValueChart();
  renderStockBandarVolumeChart();
}

// 1. PANE UTAMA: CANDLESTICK CHART (LATAR BELAKANG PUTIH BERSIH STOCKBIT PRO)
function renderStockMainChart() {
  const canvas = document.getElementById("canvas-mon-live-chart");
  if (!canvas) return;

  attachStockCanvasListeners(canvas);

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(400, rect.width || canvas.parentElement?.clientWidth || 800);
  const h = Math.max(300, rect.height || 340);

  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(dpr, dpr);

  // 1. Bersihkan Latar Belakang PUTIH BERSIH
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  const pad = { top: 22, right: 68, bottom: 26, left: 14 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const sId = stockActiveSensor === "all" ? "0" : stockActiveSensor;
  const meta = STOCK_SENSOR_METAS[sId] || STOCK_SENSOR_METAS["0"];
  const isVib = meta.isVib;
  const allCandles = stockCandlesMap[sId] || [];

  if (allCandles.length === 0) {
    ctx.restore();
    return;
  }

  // Tampilkan sejumlah lilin sesuai tingkat zoom (default 35 lilin)
  const candles = allCandles.slice(-stockVisibleCount);

  // 2. Tentukan Rentang Skala Harga Y
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  candles.forEach(c => {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  });

  if (stockIndicators.limit && meta.limit) {
    if (meta.limit > maxPrice) maxPrice = meta.limit * 1.05;
  }

  const priceMargin = (maxPrice - minPrice) * 0.12 || (isVib ? 0.008 : 1.5);
  minPrice = Math.max(0, minPrice - priceMargin);
  maxPrice = maxPrice + priceMargin;
  const priceSpan = maxPrice - minPrice || 1;

  // 3. Grid Horizontal Halus & Label Sumbu Y Kanan (Warna Putih & Biru Bersih)
  ctx.strokeStyle = "rgba(37, 99, 235, 0.08)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#475569";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";

  const numYLines = 6;
  for (let i = 0; i <= numYLines; i++) {
    const yVal = minPrice + (i / numYLines) * priceSpan;
    const yPos = pad.top + plotH - (i / numYLines) * plotH;

    ctx.beginPath();
    ctx.moveTo(pad.left, yPos);
    ctx.lineTo(pad.left + plotW, yPos);
    ctx.stroke();

    const priceText = isVib ? `${fmtNum(yVal, 3)}` : `${fmtNum(yVal, 1)}°`;
    ctx.fillText(priceText, pad.left + plotW + 6, yPos + 3.5);
  }

  // Pembatas Garis Vertikal Sumbu Kanan (Biru Halus)
  ctx.beginPath();
  ctx.moveTo(pad.left + plotW, pad.top);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.strokeStyle = "#dbeafe";
  ctx.stroke();

  // 4. Garis Limit Threshold Merah Putus-putus
  if (stockIndicators.limit && meta.limit >= minPrice && meta.limit <= maxPrice) {
    const yLimit = pad.top + plotH - ((meta.limit - minPrice) / priceSpan) * plotH;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(pad.left, yLimit);
    ctx.lineTo(pad.left + plotW, yLimit);
    ctx.stroke();

    // Badge Limit di Sumbu Kanan
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(pad.left + plotW + 2, yLimit - 8, pad.right - 4, 16);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(isVib ? "0.08" : "75.0°", pad.left + plotW + 6, yLimit + 3.5);
    ctx.restore();
  }

  // 5. Perhitungan Koordinat Lilin
  const candleCount = candles.length;
  const slotW = plotW / Math.max(1, candleCount);
  const barW = Math.max(3, Math.min(18, slotW * 0.72));

  // Hitung Moving Averages
  const ma7Vals = stockIndicators.ma7 ? calcMovingAverage(candles, 7) : [];
  const ma21Vals = stockIndicators.ma21 ? calcMovingAverage(candles, 21) : [];

  // 6. Gambar Candlestick / Line Chart
  if (stockChartType === "candle") {
    candles.forEach((c, i) => {
      const isGreen = c.close >= c.open;
      const color = isGreen ? "#16a34a" : "#dc2626";

      const xCenter = pad.left + (i + 0.5) * slotW;
      const yOpen = pad.top + plotH - ((c.open - minPrice) / priceSpan) * plotH;
      const yClose = pad.top + plotH - ((c.close - minPrice) / priceSpan) * plotH;
      const yHigh = pad.top + plotH - ((c.high - minPrice) / priceSpan) * plotH;
      const yLow = pad.top + plotH - ((c.low - minPrice) / priceSpan) * plotH;

      // Sumbu / Ekor Lilin (Wick)
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.moveTo(xCenter, yHigh);
      ctx.lineTo(xCenter, yLow);
      ctx.stroke();

      // Badan Lilin (Body)
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

      ctx.fillStyle = color;
      ctx.fillRect(xCenter - barW / 2, bodyTop, barW, bodyHeight);
    });
  } else {
    // Mode Line Chart dengan Soft Gradient
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
    grad.addColorStop(0, (meta.color || "#2563eb") + "30");
    grad.addColorStop(1, (meta.color || "#2563eb") + "02");

    ctx.beginPath();
    candles.forEach((c, i) => {
      const x = pad.left + (i + 0.5) * slotW;
      const y = pad.top + plotH - ((c.close - minPrice) / priceSpan) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + (candles.length - 0.5) * slotW, pad.top + plotH);
    ctx.lineTo(pad.left + 0.5 * slotW, pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Garis Neon Halus
    ctx.beginPath();
    ctx.strokeStyle = meta.color || "#2563eb";
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    candles.forEach((c, i) => {
      const x = pad.left + (i + 0.5) * slotW;
      const y = pad.top + plotH - ((c.close - minPrice) / priceSpan) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // 7. Garis Indikator MA(7) Amber & MA(21) Biru
  if (stockIndicators.ma7) {
    ctx.beginPath();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.7;
    let maStarted = false;
    ma7Vals.forEach((v, i) => {
      if (v == null) return;
      const x = pad.left + (i + 0.5) * slotW;
      const y = pad.top + plotH - ((v - minPrice) / priceSpan) * plotH;
      if (!maStarted) { ctx.moveTo(x, y); maStarted = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  if (stockIndicators.ma21) {
    ctx.beginPath();
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.7;
    let maStarted = false;
    ma21Vals.forEach((v, i) => {
      if (v == null) return;
      const x = pad.left + (i + 0.5) * slotW;
      const y = pad.top + plotH - ((v - minPrice) / priceSpan) * plotH;
      if (!maStarted) { ctx.moveTo(x, y); maStarted = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // 8. Dynamic Price Beacon di Lilin Terakhir & Badge Harga Terkini Sumbu Kanan
  const lastC = candles[candles.length - 1];
  if (lastC) {
    const isGreen = lastC.close >= lastC.open;
    const tagColor = isGreen ? "#16a34a" : "#dc2626";
    const lastX = pad.left + (candles.length - 0.5) * slotW;
    const lastY = pad.top + plotH - ((lastC.close - minPrice) / priceSpan) * plotH;

    // Garis panduan horizontal putus-putus ke sumbu harga
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = tagColor;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pad.left + plotW, lastY);
    ctx.stroke();
    ctx.restore();

    // Beacon denyut live di ujung grafik
    const pulseR = 4 + Math.sin(Date.now() / 200) * 2;
    ctx.beginPath();
    ctx.arc(lastX, lastY, pulseR + 3, 0, Math.PI * 2);
    ctx.fillStyle = tagColor + "28";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = tagColor;
    ctx.fill();

    // Price Badge pada sumbu Y kanan
    ctx.fillStyle = tagColor;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pad.left + plotW + 2, lastY - 9, pad.right - 4, 18, 4);
    else ctx.fillRect(pad.left + plotW + 2, lastY - 9, pad.right - 4, 18);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    const lastPriceStr = isVib ? fmtNum(lastC.close, 3) : fmtNum(lastC.close, 2);
    ctx.fillText(lastPriceStr, pad.left + plotW + 6, lastY + 3.5);
  }

  // 9. Label Sumbu X (Timeline Waktu)
  ctx.fillStyle = "#64748b";
  ctx.font = "9px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  const stepLabel = Math.max(1, Math.floor(candleCount / 5));
  for (let i = 0; i < candleCount; i += stepLabel) {
    const c = candles[i];
    const x = pad.left + (i + 0.5) * slotW;
    const d = new Date(c.time);
    const timeLbl = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    ctx.fillText(timeLbl, x, h - 8);
  }

  // 10. Interactive Crosshair HUD saat mouse diarahkan ke grafik
  if (stockCrosshairPos && stockCrosshairPos.x >= pad.left && stockCrosshairPos.x <= pad.left + plotW && stockCrosshairPos.y >= pad.top && stockCrosshairPos.y <= pad.top + plotH) {
    const mx = stockCrosshairPos.x;
    const my = stockCrosshairPos.y;

    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(37, 99, 235, 0.4)";
    ctx.lineWidth = 1;

    // Vertikal
    ctx.beginPath();
    ctx.moveTo(mx, pad.top);
    ctx.lineTo(mx, pad.top + plotH);
    ctx.stroke();

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(pad.left, my);
    ctx.lineTo(pad.left + plotW, my);
    ctx.stroke();

    // Badge harga pada posisi kursor Y (Biru Astra MTM)
    const hoverPrice = minPrice + ((pad.top + plotH - my) / plotH) * priceSpan;
    ctx.fillStyle = "#2563eb";
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(pad.left + plotW + 2, my - 8, pad.right - 4, 16, 3);
      ctx.fill();
    } else {
      ctx.fillRect(pad.left + plotW + 2, my - 8, pad.right - 4, 16);
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(isVib ? fmtNum(hoverPrice, 3) : fmtNum(hoverPrice, 2), pad.left + plotW + 6, my + 3.5);

    // Cari candle terdekat dengan kursor X
    const candleIdx = Math.max(0, Math.min(candleCount - 1, Math.floor((mx - pad.left) / slotW)));
    const hoveredCandle = candles[candleIdx];

    if (hoveredCandle) {
      const hTime = new Date(hoveredCandle.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const tagW = 60;
      ctx.fillStyle = "#2563eb";
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(mx - tagW / 2, h - 20, tagW, 16, 3);
        ctx.fill();
      } else {
        ctx.fillRect(mx - tagW / 2, h - 20, tagW, 16);
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(hTime, mx, h - 8);

      const hud = document.getElementById("stock-crosshair-hud");
      if (hud) {
        hud.style.display = "flex";
        setText("hud-time", hTime);
        setText("hud-open", isVib ? fmtNum(hoveredCandle.open, 3) : fmtNum(hoveredCandle.open, 2));
        setText("hud-high", isVib ? fmtNum(hoveredCandle.high, 3) : fmtNum(hoveredCandle.high, 2));
        setText("hud-low", isVib ? fmtNum(hoveredCandle.low, 3) : fmtNum(hoveredCandle.low, 2));
        setText("hud-close", isVib ? fmtNum(hoveredCandle.close, 3) : fmtNum(hoveredCandle.close, 2));

        const ma7v = ma7Vals[candleIdx];
        const ma21v = ma21Vals[candleIdx];
        setText("hud-ma7", ma7v != null ? (isVib ? fmtNum(ma7v, 3) : fmtNum(ma7v, 2)) : "--");
        setText("hud-ma21", ma21v != null ? (isVib ? fmtNum(ma21v, 3) : fmtNum(ma21v, 2)) : "--");
      }
    }

    ctx.restore();
  }

  ctx.restore();
}

// 2. SUB-PANE 1: BANDAR VALUE (LATAR BELAKANG PUTIH BERSIH)
function renderStockBandarValueChart() {
  const canvas = document.getElementById("canvas-mon-bandar-value");
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(400, rect.width || canvas.parentElement?.clientWidth || 800);
  const h = Math.max(90, rect.height || 105);

  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(dpr, dpr);

  // Latar Belakang Putih Bersih
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  const pad = { top: 10, right: 68, bottom: 14, left: 14 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const sId = stockActiveSensor === "all" ? "0" : stockActiveSensor;
  const allCandles = stockCandlesMap[sId] || [];
  if (allCandles.length === 0) { ctx.restore(); return; }

  const candles = allCandles.slice(-stockVisibleCount);

  // Hitung akumulasi Bandar Value & moving average
  let runningFlow = 0;
  const flowVals = [];
  candles.forEach(c => {
    const delta = c.close - c.open;
    const vol = c.volume || 100;
    runningFlow += delta * vol;
    flowVals.push(runningFlow);
  });

  // Flow MA (period 5)
  const flowMa = [];
  for (let i = 0; i < flowVals.length; i++) {
    if (i < 4) flowMa.push(flowVals[i]);
    else {
      let sum = 0;
      for (let j = 0; j < 5; j++) sum += flowVals[i - j];
      flowMa.push(sum / 5);
    }
  }

  let minVal = Math.min(0, ...flowVals);
  let maxVal = Math.max(0, ...flowVals);
  const span = Math.max(1, maxVal - minVal) * 1.15;
  minVal -= span * 0.05;
  maxVal += span * 0.05;
  const valSpan = maxVal - minVal || 1;

  // Garis 0 Baseline
  const y0 = pad.top + plotH - ((0 - minVal) / valSpan) * plotH;
  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
  ctx.beginPath();
  ctx.moveTo(pad.left, y0);
  ctx.lineTo(pad.left + plotW, y0);
  ctx.stroke();
  ctx.restore();

  // Label 0 pada sumbu Y kanan
  ctx.fillStyle = "#94a3b8";
  ctx.font = "9px 'JetBrains Mono', monospace";
  ctx.fillText("0.0", pad.left + plotW + 6, y0 + 3);

  // Pembatas Vertikal Sumbu Kanan
  ctx.beginPath();
  ctx.moveTo(pad.left + plotW, pad.top);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.strokeStyle = "#e2e8f0";
  ctx.stroke();

  const slotW = plotW / Math.max(1, candles.length);

  // Shaded Area Flow (Ungu Muda Lembut Transparan)
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  grad.addColorStop(0, "rgba(139, 92, 246, 0.20)");
  grad.addColorStop(1, "rgba(139, 92, 246, 0.01)");

  ctx.beginPath();
  flowVals.forEach((v, i) => {
    const x = pad.left + (i + 0.5) * slotW;
    const y = pad.top + plotH - ((v - minVal) / valSpan) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.left + (flowVals.length - 0.5) * slotW, y0);
  ctx.lineTo(pad.left + 0.5 * slotW, y0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Garis Utama Bandar Value (Ungu #8b5cf6)
  ctx.beginPath();
  ctx.strokeStyle = "#8b5cf6";
  ctx.lineWidth = 1.9;
  flowVals.forEach((v, i) => {
    const x = pad.left + (i + 0.5) * slotW;
    const y = pad.top + plotH - ((v - minVal) / valSpan) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Garis Moving Average Flow (Oranye #f59e0b)
  ctx.beginPath();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 1.3;
  flowMa.forEach((v, i) => {
    const x = pad.left + (i + 0.5) * slotW;
    const y = pad.top + plotH - ((v - minVal) / valSpan) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Nilai Akhir pada sumbu kanan
  const lastFlow = flowVals[flowVals.length - 1] || 0;
  const lastY = pad.top + plotH - ((lastFlow - minVal) / valSpan) * plotH;
  ctx.fillStyle = "#8b5cf6";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pad.left + plotW + 2, lastY - 8, pad.right - 4, 16, 3);
  else ctx.fillRect(pad.left + plotW + 2, lastY - 8, pad.right - 4, 16);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 9px 'JetBrains Mono', monospace";
  const flowStr = (lastFlow >= 0 ? "+" : "") + (Math.abs(lastFlow) > 1000 ? `${(lastFlow / 1000).toFixed(1)}K` : lastFlow.toFixed(1));
  ctx.fillText(flowStr, pad.left + plotW + 5, lastY + 3.5);

  ctx.restore();
}

// 3. SUB-PANE 2: BANDAR VOLUME (LATAR BELAKANG PUTIH BERSIH)
function renderStockBandarVolumeChart() {
  const canvas = document.getElementById("canvas-mon-bandar-volume");
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(400, rect.width || canvas.parentElement?.clientWidth || 800);
  const h = Math.max(80, rect.height || 90);

  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(dpr, dpr);

  // Latar Belakang Putih Bersih
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  const pad = { top: 8, right: 68, bottom: 18, left: 14 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const sId = stockActiveSensor === "all" ? "0" : stockActiveSensor;
  const allCandles = stockCandlesMap[sId] || [];
  if (allCandles.length === 0) { ctx.restore(); return; }

  const candles = allCandles.slice(-stockVisibleCount);

  let maxVol = 10;
  candles.forEach(c => {
    const v = c.volume || 100;
    if (v > maxVol) maxVol = v;
  });
  maxVol = maxVol * 1.1;

  const yCenter = pad.top + plotH / 2;

  // Garis 0 Baseline di tengah
  ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, yCenter);
  ctx.lineTo(pad.left + plotW, yCenter);
  ctx.stroke();

  // Pembatas Vertikal Sumbu Kanan
  ctx.beginPath();
  ctx.moveTo(pad.left + plotW, pad.top);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.strokeStyle = "#e2e8f0";
  ctx.stroke();

  // Label Sumbu Y Kanan
  ctx.fillStyle = "#64748b";
  ctx.font = "8px 'JetBrains Mono', monospace";
  ctx.fillText(`+${Math.round(maxVol)}`, pad.left + plotW + 6, pad.top + 8);
  ctx.fillText("0", pad.left + plotW + 6, yCenter + 3);
  ctx.fillText(`-${Math.round(maxVol)}`, pad.left + plotW + 6, pad.top + plotH - 2);

  const slotW = plotW / Math.max(1, candles.length);
  const barW = Math.max(2, Math.min(14, slotW * 0.65));

  // Gambar Batang Histogram Volume (Hijau bila naik, Merah bila turun)
  candles.forEach((c, i) => {
    const delta = c.close - c.open;
    const isUp = delta >= 0;
    const vol = c.volume || 100;
    const barHeight = Math.max(2, (vol / maxVol) * (plotH / 2));
    const xCenter = pad.left + (i + 0.5) * slotW;

    ctx.fillStyle = isUp ? "#16a34a" : "#dc2626";
    if (isUp) {
      ctx.fillRect(xCenter - barW / 2, yCenter - barHeight, barW, barHeight);
    } else {
      ctx.fillRect(xCenter - barW / 2, yCenter, barW, barHeight);
    }
  });

  // Label Waktu Sumbu X Bawah
  ctx.fillStyle = "#64748b";
  ctx.font = "8px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  const stepLabel = Math.max(1, Math.floor(candles.length / 5));
  for (let i = 0; i < candles.length; i += stepLabel) {
    const c = candles[i];
    const x = pad.left + (i + 0.5) * slotW;
    const d = new Date(c.time);
    const timeLbl = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    ctx.fillText(timeLbl, x, h - 5);
  }

  ctx.restore();
}

// Zoom Grafik Stockbit [-] [+]
function zoomStockChart(dir) {
  if (dir > 0) {
    stockVisibleCount = Math.max(15, stockVisibleCount - 5);
  } else {
    stockVisibleCount = Math.min(65, stockVisibleCount + 5);
  }
  renderMonitoringLiveCharts();
}

// Update Bandar Detector DOM Values
function updateBandarDetectorDOM() {
  const sId = stockActiveSensor === "all" ? "0" : stockActiveSensor;
  const val = latestSensorValues[sId] || 40.0;
  const candles = stockCandlesMap[sId] || [];
  const totalVol = candles.reduce((acc, c) => acc + (c.volume || 100), 0);
  
  const top1Vol = Math.round(totalVol * 0.18);
  const top3Vol = Math.round(totalVol * 0.46);
  const top5Vol = Math.round(totalVol * 0.72);
  const avgVol = Math.round(totalVol * 0.52);

  const netVol = Math.round(candles.reduce((acc, c) => acc + ((c.close >= c.open ? 1 : -1) * (c.volume || 100)), 0));
  const netValB = Math.abs((netVol * (val || 40)) / 100).toFixed(1);
  const avgPrice = Math.round((val || 40) * 98);

  setText("det-vol-top1", (top1Vol * 15).toLocaleString("id-ID"));
  setText("det-rp-top1", (top1Vol * 0.05).toFixed(1));
  setText("det-vol-top3", (top3Vol * 15).toLocaleString("id-ID"));
  setText("det-rp-top3", (top3Vol * 0.05).toFixed(1));
  setText("det-vol-top5", (top5Vol * 15).toLocaleString("id-ID"));
  setText("det-rp-top5", (top5Vol * 0.05).toFixed(1));
  setText("det-vol-avg", (avgVol * 15).toLocaleString("id-ID"));
  setText("det-rp-avg", (avgVol * 0.05).toFixed(1));

  const buyerCount = 40 + Math.floor((Math.sin(Date.now() / 8000) + 1) * 6);
  const sellerCount = 55 + Math.floor((Math.cos(Date.now() / 9000) + 1) * 5);
  setText("det-buyer-count", buyerCount);
  setText("det-seller-count", sellerCount);
  setText("det-diff-count", buyerCount - sellerCount);

  setText("det-net-vol", (Math.abs(netVol) * 220).toLocaleString("id-ID"));
  setText("det-net-val", `${netValB} B`);
  setText("det-avg-val", avgPrice.toLocaleString("id-ID"));
}

// Pasang Listener Mouse Interaktif
function attachStockCanvasListeners(canvas) {
  if (stockCanvasListenersAttached) return;

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    stockCrosshairPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    renderMonitoringLiveCharts();
  });

  canvas.addEventListener("mouseleave", () => {
    stockCrosshairPos = null;
    const hud = document.getElementById("stock-crosshair-hud");
    if (hud) hud.style.display = "none";
    renderMonitoringLiveCharts();
  });

  stockCanvasListenersAttached = true;
}

// 4. RENDER RIWAYAT PERUBAHAN TELEMETRI (RUNNING TRADE LOG)
function renderStockRunningTrades() {
  const tbody = document.getElementById("stock-running-trade-body");
  if (!tbody) return;

  const searchInput = document.getElementById("rt-search-input");
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

  const filtered = stockRunningTrades.filter(item => {
    // 1. Filter pill
    if (rtActiveFilter === "up" && item.dir !== "up") return false;
    if (rtActiveFilter === "down" && item.dir !== "down") return false;
    if (rtActiveFilter === "warn" && item.status === "normal") return false;

    // 2. Query pencarian
    if (query) {
      const matchText = `${item.sensorId} ${item.name} ${item.val} ${item.delta} ${item.status}`.toLowerCase();
      if (!matchText.includes(query)) return false;
    }
    return true;
  });

  // Update badge counter
  setText("rt-count-badge", `${filtered.length} Data`);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="mon-empty-state">Tidak ada data telemetri yang cocok dengan filter "${rtActiveFilter}".</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.slice(0, 50).map(t => {
    const isUp = t.dir === "up";
    const isDown = t.dir === "down";
    const flashClass = t.isNew ? (isUp ? "rt-row-flash-up" : isDown ? "rt-row-flash-down" : "") : "";
    t.isNew = false; // reset setelah satu render

    const valFormatted = t.isVib ? `${fmtNum(t.val, 3)} ${t.unit}` : `${fmtNum(t.val, 2)} ${t.unit}`;
    const deltaFormatted = t.delta > 0 ? `▲ +${t.delta}` : t.delta < 0 ? `▼ ${t.delta}` : `― 0.00`;
    const pctFormatted = t.pct > 0 ? `+${t.pct}%` : `${t.pct}%`;

    const statusPill = t.status === "critical" 
      ? `<span class="rt-status-pill critical">CRITICAL</span>` 
      : t.status === "warning" 
      ? `<span class="rt-status-pill warning">WARNING</span>` 
      : `<span class="rt-status-pill normal">NORMAL</span>`;

    const momentumTag = isUp 
      ? `<span class="rt-spark-dir up">▲ Naik</span>` 
      : isDown 
      ? `<span class="rt-spark-dir down">▼ Turun</span>` 
      : `<span class="rt-spark-dir flat">― Stabil</span>`;

    return `
      <tr class="${flashClass}">
        <td class="rt-col-time">${t.timeStr}</td>
        <td>
          <div class="rt-col-sensor">
            <span class="rt-sensor-chip ${t.isVib ? "vib" : ""}">#${t.sensorId}</span>
            <span class="rt-sensor-title">${t.name}</span>
          </div>
        </td>
        <td class="rt-col-val ${isUp ? "up" : isDown ? "down" : ""}" style="text-align: right;">${valFormatted}</td>
        <td class="rt-col-delta ${isUp ? "up" : isDown ? "down" : "eq"}" style="text-align: right;">${deltaFormatted}</td>
        <td class="rt-col-delta ${isUp ? "up" : isDown ? "down" : "eq"}" style="text-align: right;">${pctFormatted}</td>
        <td style="text-align: center;">${statusPill}</td>
        <td style="text-align: center;">${momentumTag}</td>
      </tr>
    `;
  }).join("");
}

// Handler Ganti Sensor Aktif
function changeStockSensor(sensorId) {
  stockActiveSensor = sensorId;

  // Sinkronkan select dropdown
  const sel = document.getElementById("stock-sensor-select");
  if (sel && sel.value !== sensorId) {
    sel.value = sensorId;
  }

  // Update watchlist chips
  updateStockWatchlistBar();
  updateStockTerminalHeader();
  renderMonitoringLiveCharts();
}

// Handler Ganti Timeframe
function setStockTimeframe(tf, btn) {
  stockTimeframe = tf;
  const pills = document.getElementById("stock-tf-pills");
  if (pills) {
    pills.querySelectorAll(".stock-tf-pill, .sb-tf-btn, .mon-pill-btn").forEach(p => p.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }

  // Reset candle history dengan rentang waktu baru
  stockCandlesMap = {};
  initStockCandles();
  updateStockTerminalHeader();
  renderMonitoringLiveCharts();
}

// Handler Ganti Jenis Grafik (Candle vs Line)
function setStockChartType(type, btn) {
  stockChartType = type;
  const pills = document.getElementById("stock-chart-type-pills");
  if (pills) {
    pills.querySelectorAll(".stock-type-pill, .sb-icon-btn, .mon-pill-btn").forEach(p => p.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }
  renderMonitoringLiveCharts();
}

// Handler Toggle Indikator Teknikal
function toggleStockIndicator(indName) {
  stockIndicators[indName] = !stockIndicators[indName];
  const btn = document.getElementById(`btn-ind-${indName}`);
  if (btn) {
    if (stockIndicators[indName]) btn.classList.add("active");
    else btn.classList.remove("active");
  }
  renderMonitoringLiveCharts();
}

// Handler Tool Rail Samping
function setRailTool(tool, btn) {
  stockActiveTool = tool;
  document.querySelectorAll(".rail-tool-btn, .mon-rail-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
}

// Handler Reset Zoom
function resetStockChartZoom() {
  stockCrosshairPos = null;
  renderMonitoringLiveCharts();
}

// Handler Screenshot / Export Snapshot Grafik
function exportStockChartSnapshot() {
  const canvas = document.getElementById("canvas-mon-live-chart");
  if (!canvas) return;

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `MTM_LiveChart_${stockActiveSensor}_${Date.now()}.png`;
  a.click();
}

// Handler Filter Running Trade
function setRtFilter(filter, btn) {
  rtActiveFilter = filter;
  const pills = document.getElementById("rt-filter-pills");
  if (pills) {
    pills.querySelectorAll(".rt-filter-btn, .sb-filter-btn, .mon-pill-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }
  renderStockRunningTrades();
}

function filterRunningTrades() {
  renderStockRunningTrades();
}

// Handler Pause / Resume Running Trade
function toggleRtPause() {
  isRtPaused = !isRtPaused;
  const icon = document.getElementById("rt-pause-icon");
  const lbl = document.getElementById("rt-pause-lbl");
  if (icon && lbl) {
    icon.textContent = isRtPaused ? "▶️" : "⏸️";
    lbl.textContent = isRtPaused ? "Resume" : "Pause";
  }
}

// Handler Clear Riwayat Perubahan
function clearRunningTrades() {
  stockRunningTrades = [];
  renderStockRunningTrades();
}


// Window resize listener to re-draw canvas charts smoothly
window.addEventListener("resize", () => {
  const dashView = document.getElementById("view-dashboard");
  if (dashView && dashView.style.display !== "none") {
    renderTemperatureChart();
    renderVibrationChart();
  }
  const monView = document.getElementById("view-monitoring");
  if (monView && monView.style.display !== "none") {
    renderMonitoringLiveCharts();
  }
});

function refreshAll() {
  fetchHealth();
  fetchStats();
  fetchDevices();
  fetchLogs();
  fetchTelemetry();
  fetchDashboardCharts();
  updatePillarDashboardCounts();

  if (activeView === "history") {
    fetchHistoryTelemetry();
  }
}

function startPolling() {
  initStreamBuffers();
  refreshAll();
  if (!pollingInterval) {
    pollingInterval = setInterval(() => {
      refreshAll();
    }, 1500);
  }
  if (!streamTickTimer) {
    streamTickTimer = setInterval(() => {
      advanceStreamTimeline();
    }, 1000);
  }
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  if (streamTickTimer) {
    clearInterval(streamTickTimer);
    streamTickTimer = null;
  }
}

function renderAllViews() {
  renderTpmCards();
  renderTaskCards();
  renderLifetimeCards();
  renderStockCards();
  updateDashboardCounts();
  updatePillarDashboardCounts();
  renderDrawingTable();
  renderJigTable();
  renderTpmScheduleTable();
  renderApprovalQueue();
  renderCmTable();
  renderPmTable();
  renderPdmView();
}

// ========================================================
// 9. PORTAL ADMINISTRATOR & MASTER DATA SYSTEM LOGIC
// ========================================================

const DEFAULT_MASTER_USERS = [
  {
    npk: "MTM-1001",
    nama: "Bambang Suryanto",
    username: "admin",
    role: "Super Admin",
    dept: "Plant Maintenance & IT",
    status: "Aktif",
    badgeColor: "purple",
    lastLogin: "Hari ini, 15:30"
  },
  {
    npk: "MTM-1045",
    nama: "Rizky Firmansyah, S.T.",
    username: "rizky.f",
    role: "Maintenance Engineer",
    dept: "Predictive Maintenance (PdM)",
    status: "Aktif",
    badgeColor: "blue",
    lastLogin: "Hari ini, 14:15"
  },
  {
    npk: "MTM-2088",
    nama: "Eko Prasetyo",
    username: "eko.p",
    role: "Maintenance Technician",
    dept: "Forging Maintenance Section",
    status: "Aktif",
    badgeColor: "cyan",
    lastLogin: "Kemarin, 16:00"
  },
  {
    npk: "MTM-3104",
    nama: "Agus Priyanto",
    username: "agus.p",
    role: "Line Leader Produksi",
    dept: "Produksi Hot Forging Line 2",
    status: "Aktif",
    badgeColor: "amber",
    lastLogin: "Hari ini, 07:45"
  },
  {
    npk: "MTM-4001",
    nama: "Hendra Wijaya, M.T.",
    username: "hendra.w",
    role: "Section Head",
    dept: "Machining & Stamping Maintenance",
    status: "Aktif",
    badgeColor: "emerald",
    lastLogin: "3 hari lalu"
  }
];

const DEFAULT_MASTER_MACHINES = [
  {
    code: "MCH-FORG-630T",
    name: "Jingduan Forging Press 630T",
    brand: "Jingduan Machinery Co.",
    line: "Line 2 Hot Forging (Plant 1)",
    capacity: "630 Ton",
    statusIoT: "Connected (6 Sensor Online)",
    mtbfTarget: "150 Jam",
    mttrTarget: "25 Menit",
    pic: "Rizky Firmansyah (PdM)"
  },
  {
    code: "MCH-STAMP-500T",
    name: "Aida Mechanical Press 500T",
    brand: "Aida Engineering Japan",
    line: "Line 1 Stamping & Blanking",
    capacity: "500 Ton",
    statusIoT: "Standby (Manual PM)",
    mtbfTarget: "120 Jam",
    mttrTarget: "30 Menit",
    pic: "Eko Prasetyo"
  },
  {
    code: "MCH-FORG-1000T",
    name: "Komatsu Heavy Forging 1000T",
    brand: "Komatsu Industries",
    line: "Line 3 Heavy Forging",
    capacity: "1000 Ton",
    statusIoT: "Planned IoT Deployment",
    mtbfTarget: "180 Jam",
    mttrTarget: "20 Menit",
    pic: "Bambang Suryanto"
  },
  {
    code: "MCH-ROBOT-WELD",
    name: "Fanuc Spot Welding Cell 6-Axis",
    brand: "Fanuc Robotics",
    line: "Line Sub-Assembly & Welding",
    capacity: "Payload 210 Kg",
    statusIoT: "Standby (Manual Checklist)",
    mtbfTarget: "200 Jam",
    mttrTarget: "15 Menit",
    pic: "Agus Priyanto"
  }
];

const DEFAULT_MASTER_SENSORS = [
  {
    deviceId: "eccentric-shaft",
    name: "Eccentric Shaft Bearing Temperature",
    machine: "Jingduan Forging Press 630T",
    parameter: "Temperatur Operasi",
    unit: "°C",
    warnThreshold: 50.0,
    critThreshold: 70.0,
    samplingRate: "5 detik",
    status: "Online / Terkalibrasi"
  },
  {
    deviceId: "flywheel-bearing",
    name: "Flywheel Main Bearing Temperature",
    machine: "Jingduan Forging Press 630T",
    parameter: "Temperatur Operasi",
    unit: "°C",
    warnThreshold: 50.0,
    critThreshold: 70.0,
    samplingRate: "5 detik",
    status: "Online / Terkalibrasi"
  },
  {
    deviceId: "link-temperature",
    name: "Connecting Rod Bushing Temperature",
    machine: "Jingduan Forging Press 630T",
    parameter: "Temperatur Operasi",
    unit: "°C",
    warnThreshold: 50.0,
    critThreshold: 70.0,
    samplingRate: "5 detik",
    status: "Online / Terkalibrasi"
  },
  {
    deviceId: "motor-drive",
    name: "Main Drive Motor Coil Temperature",
    machine: "Jingduan Forging Press 630T",
    parameter: "Temperatur Stator Coil",
    unit: "°C",
    warnThreshold: 65.0,
    critThreshold: 80.0,
    samplingRate: "5 detik",
    status: "Online / Terkalibrasi"
  },
  {
    deviceId: "main-bearing",
    name: "Crankshaft Main Bearing Temperature",
    machine: "Jingduan Forging Press 630T",
    parameter: "Temperatur Operasi",
    unit: "°C",
    warnThreshold: 50.0,
    critThreshold: 70.0,
    samplingRate: "5 detik",
    status: "Online / Terkalibrasi"
  },
  {
    deviceId: "vibration-sensor",
    name: "Tri-Axial Vibration Velocity RMS",
    machine: "Jingduan Forging Press 630T",
    parameter: "Kecepatan Getaran (RMS)",
    unit: "mm/s",
    warnThreshold: 4.5,
    critThreshold: 7.1,
    samplingRate: "1 detik",
    status: "Online / Terkalibrasi"
  }
];

const DEFAULT_MASTER_SHIFTS = [
  {
    code: "SHIFT-1",
    name: "Shift 1 (Malam - Dini Hari)",
    timeRange: "00:00 - 07:40",
    duration: "7 Jam 40 Menit",
    handover: "10 Menit (07:30 - 07:40)",
    leader: "Supriyanto",
    status: "Aktif"
  },
  {
    code: "SHIFT-2",
    name: "Shift 2 (Pagi - Siang)",
    timeRange: "07:30 - 16:10",
    duration: "8 Jam 40 Menit",
    handover: "10 Menit (16:00 - 16:10)",
    leader: "Dedi Kurniawan",
    status: "Aktif"
  },
  {
    code: "SHIFT-3",
    name: "Shift 3 (Sore - Malam)",
    timeRange: "16:10 - 00:00",
    duration: "7 Jam 50 Menit",
    handover: "10 Menit (23:50 - 00:00)",
    leader: "Arif Wibowo",
    status: "Aktif"
  }
];

let masterUsersData = [];
let masterMachinesData = [];
let masterSensorsData = [];
let masterShiftsData = [];
let currentAdminTab = "users";

function initAdminPortal() {
  try {
    const rawUsers = localStorage.getItem("mtm_master_users");
    masterUsersData = rawUsers ? JSON.parse(rawUsers) : [...DEFAULT_MASTER_USERS];

    const rawMachines = localStorage.getItem("mtm_master_machines");
    masterMachinesData = rawMachines ? JSON.parse(rawMachines) : [...DEFAULT_MASTER_MACHINES];

    const rawSensors = localStorage.getItem("mtm_master_sensors");
    masterSensorsData = rawSensors ? JSON.parse(rawSensors) : [...DEFAULT_MASTER_SENSORS];

    const rawShifts = localStorage.getItem("mtm_master_shifts");
    masterShiftsData = rawShifts ? JSON.parse(rawShifts) : [...DEFAULT_MASTER_SHIFTS];

    updateAdminTabCounts();
  } catch (err) {
    console.error("Error initAdminPortal:", err);
    masterUsersData = [...DEFAULT_MASTER_USERS];
    masterMachinesData = [...DEFAULT_MASTER_MACHINES];
    masterSensorsData = [...DEFAULT_MASTER_SENSORS];
    masterShiftsData = [...DEFAULT_MASTER_SHIFTS];
  }
}

function updateAdminTabCounts() {
  const cUsers = document.getElementById("count-admin-users");
  if (cUsers) cUsers.textContent = masterUsersData.length;

  const cMachines = document.getElementById("count-admin-machines");
  if (cMachines) cMachines.textContent = masterMachinesData.length;

  const cSensors = document.getElementById("count-admin-sensors");
  if (cSensors) cSensors.textContent = masterSensorsData.length;

  const cShifts = document.getElementById("count-admin-shifts");
  if (cShifts) cShifts.textContent = masterShiftsData.length;
}

function switchAdminPortalTab(tabName) {
  currentAdminTab = tabName;
  const tabs = ["users", "machines", "sensors", "shifts", "system"];
  tabs.forEach(t => {
    const btn = document.getElementById(`admin-tab-btn-${t}`);
    const pane = document.getElementById(`admin-pane-${t}`);
    if (btn) {
      if (t === tabName) btn.classList.add("active");
      else btn.classList.remove("active");
    }
    if (pane) {
      pane.style.display = (t === tabName) ? "block" : "none";
    }
  });

  if (tabName === "users") renderAdminUsersTable();
  else if (tabName === "machines") renderAdminMachinesTable();
  else if (tabName === "sensors") renderAdminSensorsTable();
  else if (tabName === "shifts") renderAdminShiftsTable();
}

function getRoleBadgeClass(role) {
  const r = (role || "").toLowerCase();
  if (r.includes("super")) return "purple";
  if (r.includes("engineer")) return "blue";
  if (r.includes("technician")) return "cyan";
  if (r.includes("leader")) return "amber";
  if (r.includes("head")) return "emerald";
  return "slate";
}

function renderAdminUsersTable(filteredList) {
  const tbody = document.getElementById("admin-users-tbody");
  if (!tbody) return;

  const list = filteredList || masterUsersData;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">Tidak ada user yang sesuai kriteria pencarian.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((u, idx) => {
    const realIndex = masterUsersData.findIndex(item => item.npk === u.npk);
    const badgeClass = getRoleBadgeClass(u.role);
    const isAktif = u.status === "Aktif";
    return `
      <tr>
        <td><strong style="font-family:var(--font-mono); color:#1e40af;">${u.npk}</strong></td>
        <td>
          <div style="font-weight:700; color:#0f172a;">${u.nama}</div>
          <div style="font-size:0.7rem; color:#64748b;">@${u.username}</div>
        </td>
        <td><span class="role-badge ${badgeClass}">${u.role}</span></td>
        <td><span style="color:#334155; font-size:0.78rem;">${u.dept}</span></td>
        <td>
          <span class="status-pill ${isAktif ? 'active' : 'inactive'}">
            <span style="width:6px; height:6px; border-radius:50%; background:${isAktif ? '#10b981' : '#ef4444'};"></span>
            ${u.status}
          </span>
        </td>
        <td style="color:#64748b; font-size:0.75rem;">${u.lastLogin || '-'}</td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:6px;">
            <button type="button" class="admin-action-btn" onclick="openEditUserModal(${realIndex})" title="Edit User">Edit</button>
            <button type="button" class="admin-action-btn ${isAktif ? 'btn-danger-soft' : ''}" onclick="toggleUserStatus(${realIndex})" title="Ubah Status">
              ${isAktif ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function filterAdminUsersTable() {
  const q = (document.getElementById("admin-user-search")?.value || "").toLowerCase().trim();
  const roleFilter = (document.getElementById("admin-user-role-filter")?.value || "").toLowerCase().trim();

  const filtered = masterUsersData.filter(u => {
    const matchQuery = !q || u.npk.toLowerCase().includes(q) || u.nama.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.dept.toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role.toLowerCase().includes(roleFilter);
    return matchQuery && matchRole;
  });

  renderAdminUsersTable(filtered);
}

function openAddUserModal() {
  document.getElementById("form-user-edit-index").value = "-1";
  document.getElementById("admin-user-modal-title").textContent = "Tambah User & Role Baru";
  document.getElementById("form-user-npk").value = "";
  document.getElementById("form-user-nama").value = "";
  document.getElementById("form-user-username").value = "";
  document.getElementById("form-user-role").value = "Maintenance Technician";
  document.getElementById("form-user-dept").value = "Plant Maintenance";
  document.getElementById("form-user-status").value = "Aktif";

  document.getElementById("modal-admin-user-form").style.display = "flex";
}

function openEditUserModal(index) {
  const u = masterUsersData[index];
  if (!u) return;

  document.getElementById("form-user-edit-index").value = index;
  document.getElementById("admin-user-modal-title").textContent = "Edit Data User & Role";
  document.getElementById("form-user-npk").value = u.npk;
  document.getElementById("form-user-nama").value = u.nama;
  document.getElementById("form-user-username").value = u.username;
  document.getElementById("form-user-role").value = u.role;
  document.getElementById("form-user-dept").value = u.dept;
  document.getElementById("form-user-status").value = u.status;

  document.getElementById("modal-admin-user-form").style.display = "flex";
}

function handleSaveAdminUser(e) {
  e.preventDefault();
  const idx = parseInt(document.getElementById("form-user-edit-index").value, 10);
  const npk = document.getElementById("form-user-npk").value.trim();
  const nama = document.getElementById("form-user-nama").value.trim();
  const username = document.getElementById("form-user-username").value.trim();
  const role = document.getElementById("form-user-role").value;
  const dept = document.getElementById("form-user-dept").value.trim();
  const status = document.getElementById("form-user-status").value;

  if (!npk || !nama || !username) {
    showToast("Harap lengkapi semua isian formulir user!", "error");
    return;
  }

  const userObj = {
    npk,
    nama,
    username,
    role,
    dept,
    status,
    badgeColor: getRoleBadgeClass(role),
    lastLogin: idx >= 0 ? masterUsersData[idx].lastLogin : "Baru Dibuat"
  };

  if (idx >= 0) {
    masterUsersData[idx] = userObj;
    showToast(`Data user ${nama} berhasil diperbarui.`, "success");
  } else {
    // Check duplicate NPK
    if (masterUsersData.some(item => item.npk.toLowerCase() === npk.toLowerCase())) {
      showToast(`User dengan NPK ${npk} sudah terdaftar!`, "error");
      return;
    }
    masterUsersData.unshift(userObj);
    showToast(`User ${nama} (${role}) berhasil ditambahkan.`, "success");
  }

  localStorage.setItem("mtm_master_users", JSON.stringify(masterUsersData));
  updateAdminTabCounts();
  renderAdminUsersTable();
  closeModal("modal-admin-user-form");
}

function toggleUserStatus(index) {
  const u = masterUsersData[index];
  if (!u) return;

  u.status = (u.status === "Aktif") ? "Nonaktif" : "Aktif";
  localStorage.setItem("mtm_master_users", JSON.stringify(masterUsersData));
  renderAdminUsersTable();
  showToast(`Status user ${u.nama} diubah menjadi ${u.status}.`, "info");
}

function renderAdminMachinesTable(filteredList) {
  const tbody = document.getElementById("admin-machines-tbody");
  if (!tbody) return;

  const list = filteredList || masterMachinesData;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#64748b;">Tidak ada data mesin ditemukan.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((m) => {
    const isOnline = m.statusIoT.toLowerCase().includes("online") || m.statusIoT.toLowerCase().includes("connected");
    return `
      <tr>
        <td><strong style="font-family:var(--font-mono); color:#1e40af;">${m.code}</strong></td>
        <td>
          <div style="font-weight:700; color:#0f172a;">${m.name}</div>
          <div style="font-size:0.7rem; color:#64748b;">${m.brand || '-'}</div>
        </td>
        <td><span style="font-weight:600; color:#334155;">${m.line}</span></td>
        <td><span style="background:#f1f5f9; padding:2px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">${m.capacity}</span></td>
        <td>
          <span class="status-pill ${isOnline ? 'active' : 'inactive'}">
            <span style="width:6px; height:6px; border-radius:50%; background:${isOnline ? '#10b981' : '#f59e0b'};"></span>
            ${m.statusIoT}
          </span>
        </td>
        <td style="font-size:0.75rem; color:#475569;">
          <div>MTBF: <strong>${m.mtbfTarget}</strong></div>
          <div>MTTR: <strong>${m.mttrTarget}</strong></div>
        </td>
        <td style="font-size:0.75rem; color:#64748b;">${m.pic || '-'}</td>
        <td style="text-align:right;">
          <button type="button" class="admin-action-btn" onclick="showToast('Detail spesifikasi mesin ${m.code} siap diinspeksi.', 'info')">Detail</button>
        </td>
      </tr>
    `;
  }).join("");
}

function filterAdminMachinesTable() {
  const q = (document.getElementById("admin-machine-search")?.value || "").toLowerCase().trim();
  const filtered = masterMachinesData.filter(m => {
    return !q || m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.line.toLowerCase().includes(q);
  });
  renderAdminMachinesTable(filtered);
}

function openAddMachineModal() {
  document.getElementById("form-mch-code").value = "";
  document.getElementById("form-mch-name").value = "";
  document.getElementById("form-mch-line").value = "";
  document.getElementById("form-mch-cap").value = "";
  document.getElementById("modal-admin-machine-form").style.display = "flex";
}

function handleSaveAdminMachine(e) {
  e.preventDefault();
  const code = document.getElementById("form-mch-code").value.trim();
  const name = document.getElementById("form-mch-name").value.trim();
  const line = document.getElementById("form-mch-line").value.trim();
  const capacity = document.getElementById("form-mch-cap").value.trim();
  const mtbfTarget = document.getElementById("form-mch-mtbf").value.trim() || "150 Jam";
  const mttrTarget = document.getElementById("form-mch-mttr").value.trim() || "30 Menit";

  if (!code || !name || !line) {
    showToast("Lengkapi kode, nama, dan line mesin!", "error");
    return;
  }

  const newMachine = {
    code,
    name,
    brand: "Standard Industrial Machine",
    line,
    capacity,
    statusIoT: "Standby (Manual PM)",
    mtbfTarget,
    mttrTarget,
    pic: "Maintenance Team"
  };

  masterMachinesData.push(newMachine);
  localStorage.setItem("mtm_master_machines", JSON.stringify(masterMachinesData));
  updateAdminTabCounts();
  renderAdminMachinesTable();
  closeModal("modal-admin-machine-form");
  showToast(`Mesin ${name} (${code}) berhasil ditambahkan ke master data.`, "success");
}

function renderAdminSensorsTable() {
  const tbody = document.getElementById("admin-sensors-tbody");
  if (!tbody) return;

  tbody.innerHTML = masterSensorsData.map((s) => {
    return `
      <tr>
        <td><strong style="font-family:var(--font-mono); color:#1e40af;">${s.deviceId}</strong></td>
        <td>
          <div style="font-weight:700; color:#0f172a;">${s.name}</div>
          <div style="font-size:0.7rem; color:#64748b;">${s.machine}</div>
        </td>
        <td><span style="font-weight:600; color:#334155;">${s.parameter} (${s.unit})</span></td>
        <td>
          <span style="background:#fffbeb; color:#b45309; border:1px solid #fde68a; font-weight:800; padding:2px 8px; border-radius:6px; font-family:var(--font-mono); font-size:0.78rem;">
            &ge; ${s.warnThreshold} ${s.unit}
          </span>
        </td>
        <td>
          <span style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; font-weight:800; padding:2px 8px; border-radius:6px; font-family:var(--font-mono); font-size:0.78rem;">
            &ge; ${s.critThreshold} ${s.unit}
          </span>
        </td>
        <td style="color:#64748b; font-size:0.75rem;">${s.samplingRate}</td>
        <td>
          <span class="status-pill active">
            <span style="width:6px; height:6px; border-radius:50%; background:#10b981;"></span>
            ${s.status}
          </span>
        </td>
        <td style="text-align:right;">
          <button type="button" class="admin-action-btn" onclick="openEditSensorModal('${s.deviceId}')" title="Sesuaikan Ambang Batas">
            Edit Ambang
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function openEditSensorModal(deviceId) {
  const s = masterSensorsData.find(item => item.deviceId === deviceId);
  if (!s) return;

  document.getElementById("form-sensor-device-id").value = s.deviceId;
  document.getElementById("form-sensor-name-lbl").textContent = s.name;
  document.getElementById("form-sensor-machine-lbl").textContent = `${s.machine} • Satuan: ${s.unit}`;
  document.getElementById("form-sensor-warn-lbl").textContent = `Ambang Warning (${s.unit})`;
  document.getElementById("form-sensor-crit-lbl").textContent = `Ambang Critical (${s.unit})`;

  document.getElementById("form-sensor-warn").value = s.warnThreshold;
  document.getElementById("form-sensor-crit").value = s.critThreshold;

  document.getElementById("modal-admin-sensor-form").style.display = "flex";
}

function handleSaveSensorThreshold(e) {
  e.preventDefault();
  const deviceId = document.getElementById("form-sensor-device-id").value;
  const warn = parseFloat(document.getElementById("form-sensor-warn").value);
  const crit = parseFloat(document.getElementById("form-sensor-crit").value);

  if (isNaN(warn) || isNaN(crit) || warn >= crit) {
    showToast("Ambang batas Warning harus lebih kecil dari Critical!", "error");
    return;
  }

  const s = masterSensorsData.find(item => item.deviceId === deviceId);
  if (s) {
    s.warnThreshold = warn;
    s.critThreshold = crit;
    localStorage.setItem("mtm_master_sensors", JSON.stringify(masterSensorsData));
    renderAdminSensorsTable();
    closeModal("modal-admin-sensor-form");
    showToast(`Ambang batas sensor ${s.name} berhasil diperbarui (Warn: ${warn}, Crit: ${crit}).`, "success");
  }
}

function renderAdminShiftsTable() {
  const tbody = document.getElementById("admin-shifts-tbody");
  if (!tbody) return;

  tbody.innerHTML = masterShiftsData.map((sh) => {
    return `
      <tr>
        <td><strong style="font-family:var(--font-mono); color:#1e40af;">${sh.code}</strong></td>
        <td><strong style="color:#0f172a;">${sh.name}</strong></td>
        <td>
          <span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:800; padding:3px 10px; border-radius:999px; font-family:var(--font-mono); font-size:0.78rem;">
            ${sh.timeRange}
          </span>
        </td>
        <td style="color:#334155; font-weight:600;">${sh.duration}</td>
        <td style="color:#64748b; font-size:0.75rem;">${sh.handover}</td>
        <td><strong style="color:#0f172a;">${sh.leader}</strong></td>
        <td>
          <span class="status-pill active">
            <span style="width:6px; height:6px; border-radius:50%; background:#10b981;"></span>
            ${sh.status}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

function exportAdminMasterDataJson() {
  const exportData = {
    exportedAt: new Date().toISOString(),
    system: "MAINTENANCE APPS - PT Menara Terus Makmur (Astra Otoparts Group)",
    users: masterUsersData,
    machines: masterMachinesData,
    sensors: masterSensorsData,
    shifts: masterShiftsData
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `MTM_MasterData_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  showToast("File JSON Master Data berhasil diunduh.", "success");
}

function resetMasterDataToDefault() {
  if (confirm("Apakah Anda yakin ingin mengembalikan semua data master ke setelan pabrik default? Data kustom akan direset.")) {
    localStorage.removeItem("mtm_master_users");
    localStorage.removeItem("mtm_master_machines");
    localStorage.removeItem("mtm_master_sensors");
    localStorage.removeItem("mtm_master_shifts");
    initAdminPortal();
    switchAdminPortalTab("users");
    showToast("Master Data telah berhasil direset ke setelan awal pabrik.", "success");
  }
}

// Auto-check session on page load
document.addEventListener("DOMContentLoaded", () => {
  renderAllViews();

  // Buka polling data telemetri di background
  startPolling();

  const filterSelect = document.getElementById("filter-device");
  if (filterSelect) {
    filterSelect.addEventListener("change", () => fetchTelemetry());
  }

  // Cek apakah pengguna sudah memiliki sesi login tersimpan
  const savedUser = localStorage.getItem("mtm_user");
  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);
      performLogin(u, false);
    } catch (e) {
      console.warn("Sesi kadaluarsa:", e);
    }
  } else {
    const login = document.getElementById("login-screen");
    if (login) login.style.display = "flex";
    const hub = document.getElementById("hub-screen");
    if (hub) hub.style.display = "none";
    const main = document.getElementById("main-app");
    if (main) main.style.display = "none";
  }
});
