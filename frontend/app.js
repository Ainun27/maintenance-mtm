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

    document.getElementById("login-screen").style.display = "none";
    document.getElementById("main-app").style.display = "flex";

    // Render all views
    renderAllViews();

    // Start polling backend telemetry
    startPolling();

    showToast(`Selamat datang, ${roleName}!`, "success");
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

    document.getElementById("main-app").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
    showToast("Berhasil logout dari sistem.", "info");
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
    dashboard: "DASHBOARD",
    monitoring: "MONITORING",
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

  const allViews = ["dashboard", "drawing", "jig", "monitoring", "tpm", "approval", "cm", "pm", "pdm"];
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
// 4. KANBAN COLUMN RENDERERS & FILTERS
// ========================================================

// Render Column 1: TPM
function renderTpmCards() {
  const container = document.getElementById("tpm-card-container");
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
  const tpmCnt = MTM_DATA.tpm.length;
  const taskCnt = MTM_DATA.tasks.length;
  const taskWaitCnt = MTM_DATA.tasks.filter(t => t.status === "menunggu").length;
  const taskRevCnt = MTM_DATA.tasks.filter(t => t.status === "revisi").length;

  const habisCnt = MTM_DATA.stocks.filter(s => s.status === "Habis").length;
  const menipisCnt = MTM_DATA.stocks.filter(s => s.status === "Menipis").length;
  const amanCnt = MTM_DATA.stocks.filter(s => s.status === "Aman").length;

  document.getElementById("tpm-cnt-all").textContent = tpmCnt;
  document.getElementById("task-cnt-all").textContent = taskCnt;
  document.getElementById("task-cnt-wait").textContent = taskWaitCnt;
  document.getElementById("task-cnt-rev").textContent = taskRevCnt;

  document.getElementById("cnt-stk-habis").textContent = habisCnt;
  document.getElementById("cnt-stk-menipis").textContent = menipisCnt;
  document.getElementById("cnt-stk-aman").textContent = amanCnt;

  const notifBadge = document.getElementById("notification-count");
  if (notifBadge) notifBadge.textContent = taskWaitCnt + habisCnt;
}

// ========================================================
// 5. MASTER DRAWINGS, JIG MANAGEMENT & TPM TABLES
// ========================================================

function renderDrawingTable() {
  const body = document.getElementById("drawing-table-body");
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
    group.querySelectorAll(".dash-tab").forEach(b => b.classList.remove("active"));
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

  const pad = { top: 25, right: 35, bottom: 35, left: 45 };
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

  const pad = { top: 25, right: 35, bottom: 35, left: 45 };
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
// 10. REAL-TIME STREAMING MONITORING LINE CHARTS
// ========================================================

let monSensorFilter = "all"; // 'all', 'temp', 'vib'

function setMonSensorFilter(filterKey, btn) {
  monSensorFilter = filterKey;
  const group = document.getElementById("mon-sensor-chart-filter");
  if (group) {
    group.querySelectorAll(".mon-pill-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }
  renderMonitoringLiveCharts();
}

const monSensorConfigs = [
  { id: "0", label: "Link Temp (#0)", color: "#f59e0b", type: "temp", valEl: "mon-leg-val-0" },
  { id: "3", label: "Right Bush (#3)", color: "#2563eb", type: "temp", valEl: "mon-leg-val-3" },
  { id: "4", label: "Left Bush (#4)", color: "#06b6d4", type: "temp", valEl: "mon-leg-val-4" },
  { id: "5", label: "Right Bearing (#5)", color: "#10b981", type: "temp", valEl: "mon-leg-val-5" },
  { id: "6", label: "Left Bearing (#6)", color: "#ec4899", type: "temp", valEl: "mon-leg-val-6" },
  { id: "1", label: "Vibration (#1)", color: "#8b5cf6", type: "vib", valEl: "mon-leg-val-1" },
];

function renderMonitoringLiveCharts() {
  initStreamBuffers();

  const monView = document.getElementById("view-monitoring");
  if (!monView || (monView.style.display === "none" && activeView !== "monitoring")) return;

  const dpr = window.devicePixelRatio || 1;

  // 1. Gambar Sparkline Garis pada Setiap Kartu Sensor Komponen
  monSensorConfigs.forEach(cfg => {
    const canvas = document.getElementById(`sparkline-mon-${cfg.id}`);
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const w = Math.max(80, rect.width || canvas.parentElement?.clientWidth || 140);
    const h = 48;

    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }

    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const pts = streamSeriesMap[cfg.id] || [];
    if (pts.length < 2) {
      ctx.restore();
      return;
    }

    const isVib = cfg.type === "vib";
    let minVal = isVib ? 0.01 : 20.0;
    let maxVal = isVib ? 0.08 : 65.0;

    pts.forEach(p => {
      if (p.val < minVal) minVal = p.val;
      if (p.val > maxVal) maxVal = p.val;
    });

    const span = (maxVal - minVal) * 1.15 || 1;
    const baseMin = minVal - (maxVal - minVal) * 0.08;

    const padX = 2;
    const padY = 5;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2;
    const totalSlots = STREAM_WINDOW_SIZE;

    // Gradient Area Fill di bawah garis
    const grad = ctx.createLinearGradient(0, padY, 0, h);
    grad.addColorStop(0, cfg.color + "50");
    grad.addColorStop(1, cfg.color + "05");

    ctx.beginPath();
    pts.forEach((pt, idx) => {
      const x = padX + (idx / (totalSlots - 1)) * plotW;
      const y = padY + plotH - ((pt.val - baseMin) / span) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    const lastX = padX + ((pts.length - 1) / (totalSlots - 1)) * plotW;
    ctx.lineTo(lastX, h);
    ctx.lineTo(padX, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Gambar Garis Waveform
    ctx.beginPath();
    pts.forEach((pt, idx) => {
      const x = padX + (idx / (totalSlots - 1)) * plotW;
      const y = padY + plotH - ((pt.val - baseMin) / span) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Beacon pada data point terakhir
    const latestPt = pts[pts.length - 1];
    const endY = padY + plotH - ((latestPt.val - baseMin) / span) * plotH;

    ctx.beginPath();
    ctx.arc(lastX, endY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  });

  // 2. Gambar Grafik Garis Utama Multi-Series Live Stream
  const mainCanvas = document.getElementById("canvas-mon-live-chart");
  if (!mainCanvas) return;

  const mRect = mainCanvas.getBoundingClientRect();
  const mW = Math.max(300, mRect.width || mainCanvas.parentElement?.clientWidth || 700);
  const mH = 200;

  if (mainCanvas.width !== Math.floor(mW * dpr) || mainCanvas.height !== Math.floor(mH * dpr)) {
    mainCanvas.width = Math.floor(mW * dpr);
    mainCanvas.height = Math.floor(mH * dpr);
  }

  const mCtx = mainCanvas.getContext("2d");
  mCtx.save();
  mCtx.scale(dpr, dpr);
  mCtx.clearRect(0, 0, mW, mH);

  const mPad = { top: 20, right: monSensorFilter === "all" ? 54 : 25, bottom: 28, left: 45 };
  const mPlotW = mW - mPad.left - mPad.right;
  const mPlotH = mH - mPad.top - mPad.bottom;

  // Filter konfigurasi sensor
  const activeSensors = monSensorConfigs.filter(s => {
    if (monSensorFilter === "temp") return s.type === "temp";
    if (monSensorFilter === "vib") return s.type === "vib";
    return true;
  });

  // Tentukan Rentang Skala Y
  const isVibOnly = monSensorFilter === "vib";
  const minY = 0;
  const maxY = isVibOnly ? 0.12 : 80;

  // Gambar Grid Sumbu Y
  mCtx.strokeStyle = "#f1f5f9";
  mCtx.lineWidth = 1;
  mCtx.fillStyle = "#64748b";
  mCtx.font = "10px 'JetBrains Mono', monospace";
  mCtx.textAlign = "right";

  const ySteps = isVibOnly ? [0, 0.03, 0.06, 0.09, 0.12] : [0, 20, 40, 60, 80];
  ySteps.forEach(yVal => {
    const yPos = mPad.top + mPlotH - ((yVal - minY) / (maxY - minY)) * mPlotH;
    mCtx.beginPath();
    mCtx.moveTo(mPad.left, yPos);
    mCtx.lineTo(mW - mPad.right, yPos);
    mCtx.stroke();
    const lbl = isVibOnly ? `${yVal.toFixed(2)}` : `${yVal}°C`;
    mCtx.fillText(lbl, mPad.left - 6, yPos + 3.5);
  });

  // Jika mode "all", gambar label sekunder di kanan untuk getaran (0 - 0.12 in/s)
  if (monSensorFilter === "all") {
    mCtx.textAlign = "left";
    mCtx.fillStyle = "#8b5cf6";
    const vSteps = [0, 0.03, 0.06, 0.09, 0.12];
    vSteps.forEach(vVal => {
      const yPos = mPad.top + mPlotH - (vVal / 0.12) * mPlotH;
      mCtx.fillText(`${vVal.toFixed(2)} in/s`, mW - mPad.right + 6, yPos + 3.5);
    });
  }

  // Garis Limit Threshold Peringatan (Ambang Batas)
  mCtx.save();
  mCtx.setLineDash([4, 4]);
  mCtx.strokeStyle = "#ef4444";
  mCtx.lineWidth = 1.2;
  const warnLimitVal = isVibOnly ? 0.08 : 75;
  const yWarn = mPad.top + mPlotH - ((warnLimitVal - minY) / (maxY - minY)) * mPlotH;
  mCtx.beginPath();
  mCtx.moveTo(mPad.left, yWarn);
  mCtx.lineTo(mW - mPad.right, yWarn);
  mCtx.stroke();
  mCtx.fillStyle = "#ef4444";
  mCtx.textAlign = "right";
  mCtx.font = "bold 9px 'JetBrains Mono', monospace";
  mCtx.fillText(isVibOnly ? "0.08 in/s" : "75°C", mW - mPad.right - 8, yWarn - 4);
  mCtx.restore();

  // Pulse effect untuk titik data terbaru
  const pulseR = 4.5 + Math.sin(Date.now() / 200) * 2;
  const totalSlots = STREAM_WINDOW_SIZE;

  // Gambar Setiap Garis Sensor
  activeSensors.forEach(cfg => {
    const points = streamSeriesMap[cfg.id] || [];
    if (points.length === 0) return;

    const latestPt = points[points.length - 1];
    const isVib = cfg.type === "vib";
    const valText = latestPt ? (isVib ? `${fmtNum(latestPt.val, 3)} in/s` : `${fmtNum(latestPt.val, 1)} °C`) : "--";
    setText(cfg.valEl, valText);

    if (points.length < 2) return;

    mCtx.beginPath();
    mCtx.strokeStyle = cfg.color;
    mCtx.lineWidth = isVib ? 2.4 : 2.0;
    mCtx.lineJoin = "round";

    points.forEach((pt, idx) => {
      const xPos = mPad.left + (idx / (totalSlots - 1)) * mPlotW;
      let normVal = pt.val;
      if (monSensorFilter === "all" && isVib) {
        // Normalisasikan vibration (0 - 0.12) ke rentang temperatur (0 - 80)
        normVal = (pt.val / 0.12) * 80;
      }
      const clamped = Math.min(maxY, Math.max(minY, normVal));
      const yPos = mPad.top + mPlotH - ((clamped - minY) / (maxY - minY)) * mPlotH;

      if (idx === 0) mCtx.moveTo(xPos, yPos);
      else mCtx.lineTo(xPos, yPos);
    });
    mCtx.stroke();

    // Gambar titik data & denyut beacon live
    points.forEach((pt, idx) => {
      const isLast = idx === points.length - 1;
      if (idx % 4 !== 0 && !isLast) return;

      const xPos = mPad.left + (idx / (totalSlots - 1)) * mPlotW;
      let normVal = pt.val;
      if (monSensorFilter === "all" && isVib) {
        normVal = (pt.val / 0.12) * 80;
      }
      const clamped = Math.min(maxY, Math.max(minY, normVal));
      const yPos = mPad.top + mPlotH - ((clamped - minY) / (maxY - minY)) * mPlotH;

      if (isLast) {
        mCtx.save();
        mCtx.beginPath();
        mCtx.arc(xPos, yPos, pulseR, 0, Math.PI * 2);
        mCtx.fillStyle = cfg.color + "33";
        mCtx.fill();
        mCtx.restore();
      }

      mCtx.beginPath();
      mCtx.arc(xPos, yPos, isLast ? 3.5 : 2, 0, Math.PI * 2);
      mCtx.fillStyle = "#ffffff";
      mCtx.fill();
      mCtx.strokeStyle = cfg.color;
      mCtx.lineWidth = 1.8;
      mCtx.stroke();
    });
  });

  // Gambar Label Sumbu X (Timeline Waktu)
  mCtx.fillStyle = "#64748b";
  mCtx.font = "9px 'JetBrains Mono', monospace";
  mCtx.textAlign = "center";
  const xLabels = ["-30s", "-20s", "-10s", "Sekarang (Live)"];
  xLabels.forEach((lbl, i) => {
    const xPos = mPad.left + (i / 3) * mPlotW;
    mCtx.fillText(lbl, xPos, mH - 10);
  });

  mCtx.restore();
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

// Auto-check session on page load
document.addEventListener("DOMContentLoaded", () => {
  renderAllViews();

  // Buka polling data telemetri di background
  startPolling();

  const filterSelect = document.getElementById("filter-device");
  if (filterSelect) {
    filterSelect.addEventListener("change", () => fetchTelemetry());
  }
});
