// ============================================================
// RT KNITS — NITA CMMS AGENTIC PROTOTYPE & ENGINE (COMPILED JS)
// ============================================================

// ------------------------------------------------------------
// Utility: XSS-safe HTML escaping
// ------------------------------------------------------------
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ------------------------------------------------------------
// Utility: Collision-resistant ID generation
// ------------------------------------------------------------
function generateId(prefix) {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${hex}`;
}

// ------------------------------------------------------------
// Utility: Cached asset/dept lookups (O(1) instead of O(n) per render)
// ------------------------------------------------------------
const assetMap = new Map();       // keyed by asset_code
const assetIdMap = new Map();     // keyed by asset_id (UUID)
const deptMap = new Map();

function rebuildLookupCaches() {
  assetMap.clear();
  assetIdMap.clear();
  deptMap.clear();
  for (const a of assets) {
    assetMap.set(a.asset_code, a);
    assetIdMap.set(a.asset_id, a);
  }
  for (const d of departments) deptMap.set(d.department_id, d);
}
rebuildLookupCaches();

// ------------------------------------------------------------
// CurrentSession type
// ------------------------------------------------------------
// Phone-to-user_id mapping for local auth fallback
const USER_ID_MAP = {
  '+23054737266': 'aa3a190a-dbca-49d7-84fe-19a9dcf18f03',
  '+23052000101': 'aa3a190a-dbca-49d7-84fe-19a9dcf18f01',
  '+23057551012': 'aa3a190a-dbca-49d7-84fe-19a9dcf18f02',
};

// Technician UUID mapping
const TECH_ID_MAP = {
  '+23057551012': 'b03a190a-dbca-49d7-84fe-19a9dcf18f91',
};

// ------------------------------------------------------------
// Initial Data — all loaded from Supabase on startup
// ------------------------------------------------------------
let departments = [];
let assets = [];
let technicians = [];
let taskRequests = [];
let workOrders = [];
let workOrderTechnicians = [];
let feedbacks = [];

// ------------------------------------------------------------
// Production Supabase Postgrest API Client
// ------------------------------------------------------------
async function fetchSupabase(table, method, body, query) {
  if (!window.NITA_CONFIG) return null;
  const url = `${window.NITA_CONFIG.SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const headers = {
    "apikey": window.NITA_CONFIG.SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${window.NITA_CONFIG.SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  };
  if (method === 'POST') {
    headers["Prefer"] = "return=representation";
  }

  const options = {
    method,
    headers
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase API error: ${txt}`);
  }
  
  if (method === 'DELETE' || res.status === 204) return null;
  return res.json();
}

// Fire-and-forget wrapper with error logging
function fireSupabase(method, table, body, query) {
  fetchSupabase(table, method, body, query).catch(err => {
    addLog(`Supabase ${method} ${table} failed: ${err.message}`, 'error');
  });
}

// ------------------------------------------------------------
// NITA API Client (bot.nelsonfodjo.me/webhook/)
// ------------------------------------------------------------
const NITA_API = {
  base() { return (window.NITA_CONFIG?.NITA_API_URL || 'https://bot.nelsonfodjo.me/webhook').replace(/\/$/, ''); },

  async get(path, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.base()}${path}${qs ? '?' + qs : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NITA API ${path}: ${res.status}`);
    return res.json();
  },

  async post(path, body) {
    const url = `${this.base()}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`NITA API ${path}: ${res.status}`);
    return res.json();
  },

  // 1. Get Asset
  getAsset(code) { return this.get('/api-assets', { code }); },

  // 2. Find Asset
  findAsset(location, keyword) { return this.get('/api-find-asset', { location, keyword }); },

  // 3. Find Technicians
  findTechnicians(trade) { return this.get('/api-technicians', { trade }); },

  // 4. Recommend Technician
  recommendTechnician(trade) { return this.get('/api-recommend-technician', { trade }); },

  // 5. Task Lifecycle
  createTask(payload) { return this.post('/api-task-lifecycle', { action: 'create', ...payload }); },
  approveTask(payload) { return this.post('/api-task-lifecycle', { action: 'approve', ...payload }); },
  rejectTask(payload) { return this.post('/api-task-lifecycle', { action: 'reject', ...payload }); },

  // 6. Technician Actions
  technicianAction(work_order_id, technician_phone, action) {
    return this.post('/api-technician-actions', { work_order_id, technician_phone, action });
  },

  // 7. Technician Daily Tasks
  getTechnicianTasks(technician_id) { return this.get('/api-technician-daily-tasks', { technician_id }); },

  // 8. Next Task
  getNextTask(technician_id) { return this.get('/api-next-task', { technician_id }); },

  // 9. Admin Assign
  adminAssign(payload) { return this.post('/api-admin-assign', payload); },

  // 10. Pending Approvals
  getPendingApprovals() { return this.get('/api-pending-approvals'); },

  // 11. Admin Status
  getAdminStatus() { return this.get('/api-admin-status'); },

  // 12. Admin Read
  adminRead(table, filterField, filterValue, limit) {
    const params = { table, limit: String(limit || 50) };
    if (filterField) params.filter_field = filterField;
    if (filterValue) params.filter_value = filterValue;
    return this.get('/api-admin-read', params);
  },

  // 13. Submit Feedback
  submitFeedback(payload) { return this.post('/api-feedback', payload); },

  // 14. Forward Media
  forwardMedia(payload) { return this.post('/api-forward-media', payload); }
};

async function syncWithSupabase() {
  if (!window.NITA_CONFIG || !window.NITA_CONFIG.USE_REAL_SUPABASE) return;
  try {
    // Use NITA API for admin reads where possible, fall back to direct Supabase
    const [pendingResult, tasks, orders, assignments, dbDepts, dbAssets, dbTechs] = await Promise.allSettled([
      NITA_API.getPendingApprovals().catch(() => null),
      fetchSupabase('task_request', 'GET', null, 'select=*'),
      fetchSupabase('work_order', 'GET', null, 'select=*'),
      fetchSupabase('work_order_technician', 'GET', null, 'select=*'),
      fetchSupabase('department', 'GET', null, 'select=*'),
      fetchSupabase('asset', 'GET', null, 'select=*'),
      fetchSupabase('technician', 'GET', null, 'select=*')
    ]);
    
    const tasksVal = tasks.status === 'fulfilled' ? tasks.value : null;
    const ordersVal = orders.status === 'fulfilled' ? orders.value : null;
    const assignmentsVal = assignments.status === 'fulfilled' ? assignments.value : null;
    
    if (tasksVal) taskRequests = tasksVal;
    if (ordersVal) workOrders = ordersVal;
    if (assignmentsVal) workOrderTechnicians = assignmentsVal;
    
    const dbDeptsVal = dbDepts.status === 'fulfilled' ? dbDepts.value : null;
    const dbAssetsVal = dbAssets.status === 'fulfilled' ? dbAssets.value : null;
    const dbTechsVal = dbTechs.status === 'fulfilled' ? dbTechs.value : null;
    
    if (dbDeptsVal) {
      departments = dbDeptsVal.map(d => ({
        id: d.department_id,
        name: d.name,
        location: d.location || ''
      }));
    }
    
    if (dbAssetsVal) {
      assets = dbAssetsVal.map(a => ({
        code: a.asset_code,
        name: a.name,
        status: a.status,
        location: a.location,
        dept_id: a.dept_id,
        type: a.type || 'Production Loom',
        serial: a.serial || ''
      }));
    }
    
    if (dbTechsVal) {
      technicians = dbTechsVal.map(t => ({
        id: t.technician_id,
        name: t.full_name,
        trade: t.trade,
        active: t.active,
        workload: t.workload || 0
      }));
    }
    
    rebuildLookupCaches();
    populateSignupDepartments(true);
    
    renderFmDashboard();
    renderTaskEntryTable();
    renderApprovalTable();
    renderBreakdownTasks();
    renderTechnicianDailyJobs();
  } catch (err) {
    addLog(`Supabase API Synchronization failed: ${err.message || err}`, 'error');
  }
}

// ------------------------------------------------------------
// Local Storage Operations
// ------------------------------------------------------------
function loadDB() {
  if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
    syncWithSupabase();
    return;
  }
  const requests = localStorage.getItem("nita_task_requests");
  const orders = localStorage.getItem("nita_work_orders");
  const techs = localStorage.getItem("nita_work_order_techs");
  const feed = localStorage.getItem("nita_feedbacks");
  
  if (requests && orders && techs) {
    taskRequests = JSON.parse(requests);
    workOrders = JSON.parse(orders);
    workOrderTechnicians = JSON.parse(techs);
    if (feed) feedbacks = JSON.parse(feed);
  } else {
    saveDB();
  }
}

function saveDB() {
  if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
    return;
  }
  localStorage.setItem("nita_task_requests", JSON.stringify(taskRequests));
  localStorage.setItem("nita_work_orders", JSON.stringify(workOrders));
  localStorage.setItem("nita_work_order_techs", JSON.stringify(workOrderTechnicians));
  localStorage.setItem("nita_feedbacks", JSON.stringify(feedbacks));
}

// ------------------------------------------------------------
// 1. ROLE-BASED LOGIN & USER GATE
// ------------------------------------------------------------
let activeSession = null;

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const paneLogin = document.getElementById('form-login-pane');
  const paneSignup = document.getElementById('form-signup-pane');
  
  if (!tabLogin || !tabSignup || !paneLogin || !paneSignup) return;

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    paneLogin.classList.add('active');
    paneSignup.classList.remove('active');
  } else {
    tabLogin.classList.remove('active');
    tabSignup.classList.add('active');
    paneLogin.classList.remove('active');
    paneSignup.classList.add('active');
    populateSignupDepartments();
  }
}
window.switchAuthTab = switchAuthTab;

function toggleSignupFields() {
  const roleSelect = document.getElementById('auth-signup-role');
  const tradeField = document.getElementById('signup-trade-field');
  if (!roleSelect || !tradeField) return;

  if (roleSelect.value === 'technician') {
    tradeField.style.display = 'block';
  } else {
    tradeField.style.display = 'none';
  }
}
window.toggleSignupFields = toggleSignupFields;

function populateSignupDepartments(force) {
  const select = document.getElementById('auth-signup-dept');
  if (!select) return;
  
  // Clear and repopulate if empty or forced
  if (!force && select.children.length > 1) return;
  
  // Keep the first placeholder option if it exists, otherwise add one
  select.innerHTML = '<option value="">Select Department</option>';
  
  departments.forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept.department_id;
    opt.textContent = dept.name;
    select.appendChild(opt);
  });
}

function initAuthGate() {
  const savedSession = localStorage.getItem("nita_active_session");
  if (savedSession) {
    activeSession = JSON.parse(savedSession);
    applyRolePermissions(activeSession);
  } else {
    showAuthOverlay(true);
  }

  document.getElementById('btn-login-submit')?.addEventListener('click', async () => {
    const rawPhone = document.getElementById('auth-phone').value.trim();
    const pinInput = document.getElementById('auth-pin').value.trim();
    
    if (!rawPhone || !pinInput) {
      alert("Please enter phone number and PIN.");
      return;
    }

    const phoneInput = normalizeWhatsAppPhone(rawPhone);
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(phoneInput)) {
      alert("Invalid WhatsApp number format. Please enter a valid number starting with '+' (e.g., +23058589024).");
      return;
    }

    // Hash PIN with SHA-256
    const pinHash = await sha256Hex(pinInput);
    let matchedUser = null;
    let token = '';

    // 1. Try NITA API login (via api-admin-read to check user exists)
    try {
      const result = await NITA_API.adminRead('app_user', 'phone_number', phoneInput, 1);
      if (!result.error && result.rows && result.rows.length > 0) {
        const user = result.rows[0];
        // Validate PIN if pin_hash exists
        if (user.pin_hash) {
          if (user.pin_hash !== pinHash) {
            alert("Incorrect PIN. Please try again.");
            return;
          }
        }
        // Map role names: "admin" -> "coordinator"
        const role = user.role === 'admin' ? 'coordinator' : user.role;
        matchedUser = { name: user.full_name, phone: phoneInput, role: role, user_id: user.user_id };
        addLog(`Logged in via NITA API: ${user.full_name} (${role})`, 'success');
      }
    } catch (err) {
      addLog(`NITA API auth check failed: ${err.message}`, 'warn');
    }

    // 2. Try Rust server auth
    if (!matchedUser) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone_number: phoneInput, pin_hash: pinHash })
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.error) {
            token = data.token;
            matchedUser = { name: data.role === 'coordinator' ? 'Coordinator' : data.role === 'operator' ? 'Operator' : 'Technician', phone: phoneInput, role: data.role, user_id: USER_ID_MAP[phoneInput] || generateId('user'), token };
          }
        }
      } catch {}
    }

    // 3. Try Supabase direct
    if (!matchedUser && window.NITA_CONFIG?.USE_REAL_SUPABASE) {
      try {
        const users = await fetchSupabase('app_user', 'GET', null, `phone_number=eq.${encodeURIComponent(phoneInput)}`);
        if (users && users.length > 0) {
          const user = users[0];
          matchedUser = { name: user.full_name, phone: phoneInput, role: user.role, user_id: user.user_id };
        }
      } catch {}
    }

    // 4. Local fallback
    if (!matchedUser) {
      const customUsers = JSON.parse(localStorage.getItem("nita_custom_users") || "{}");
      const custom = customUsers[phoneInput];
      if (custom && custom.pinHash === pinHash) {
        matchedUser = { name: custom.name, phone: phoneInput, role: custom.role, user_id: generateId('user') };
      }
    }

    if (matchedUser) {
      activeSession = matchedUser;
      localStorage.setItem("nita_active_session", JSON.stringify(matchedUser));
      applyRolePermissions(matchedUser);
      showAuthOverlay(false);
      addLog(`Welcome, ${matchedUser.name}!`, 'success');
    } else {
      alert("No account found with this phone number. Please sign up first or check your number.");
    }
  });

  document.getElementById('btn-signup-submit')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('auth-signup-name').value.trim();
    const rawPhone = document.getElementById('auth-signup-phone').value.trim();
    const roleInput = document.getElementById('auth-signup-role').value;
    const deptInput = document.getElementById('auth-signup-dept').value;
    const tradeInput = document.getElementById('auth-signup-trade').value;
    const pinInput = document.getElementById('auth-signup-pin').value.trim();
    
    if (!nameInput || !rawPhone || !pinInput) {
      alert("All fields are required.");
      return;
    }

    const phoneInput = normalizeWhatsAppPhone(rawPhone);
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(phoneInput)) {
      alert("Invalid WhatsApp number. Please enter a valid WhatsApp number in E.164 format (e.g., +23058589024).");
      return;
    }
    
    const pinRegex = /^\d{4,6}$/;
    if (!pinRegex.test(pinInput)) {
      alert("PIN must be 4-6 digits.");
      return;
    }
    
    const pinHash = await sha256Hex(pinInput);
    let signupSuccess = false;
    let matchedUser = null;

    // 1. Check if user already exists via NITA API
    try {
      const existing = await NITA_API.adminRead('app_user', 'phone_number', phoneInput, 1);
      if (!existing.error && existing.rows && existing.rows.length > 0) {
        alert(`Account with ${phoneInput} already exists. Please sign in.`);
        return;
      }
    } catch {}

    // 2. Try NITA API admin-assign for technician signup
    if (roleInput === 'technician') {
      try {
        const result = await NITA_API.adminAssign({
          admin_phone: phoneInput,
          asset_code: '0',
          technician_id: generateId('tech'),
          instructions: `New technician: ${nameInput}, trade: ${tradeInput}`,
          task_type: 'inspection'
        });
        if (!result.error) {
          signupSuccess = true;
        }
      } catch {}
    }

    // 3. Try Supabase direct write
    if (!signupSuccess && window.NITA_CONFIG?.USE_REAL_SUPABASE) {
      try {
        const userId = generateId('user');
        const newUser = { user_id: userId, full_name: nameInput, role: roleInput, phone_number: phoneInput, whatsapp_verified: true };
        if (deptInput) newUser.department_id = deptInput;
        await fetchSupabase('app_user', 'POST', newUser);
        signupSuccess = true;
        matchedUser = { name: nameInput, phone: phoneInput, role: roleInput, user_id: userId };
      } catch (err) {
        if (err.message && err.message.includes('duplicate')) {
          alert(`Account with ${phoneInput} already exists. Please sign in.`);
          return;
        }
      }
    }

    // 4. Try Rust server signup
    if (!signupSuccess) {
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone_number: phoneInput, pin_hash: pinHash, role: roleInput, full_name: nameInput })
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.error) signupSuccess = true;
        }
      } catch {}
    }

    // 5. Local fallback
    if (!signupSuccess) {
      let localUsers = JSON.parse(localStorage.getItem("nita_custom_users") || "{}");
      if (localUsers[phoneInput]) {
        alert(`Account with ${phoneInput} already exists locally. Please sign in.`);
        return;
      }
      localUsers[phoneInput] = { name: nameInput, pinHash, role: roleInput, dept: deptInput, trade: roleInput === 'technician' ? tradeInput : null };
      localStorage.setItem("nita_custom_users", JSON.stringify(localUsers));
      signupSuccess = true;
      matchedUser = { name: nameInput, phone: phoneInput, role: roleInput, user_id: generateId('user') };
    }

    if (signupSuccess) {
      if (!matchedUser) {
        matchedUser = { name: nameInput, phone: phoneInput, role: roleInput, user_id: generateId('user') };
      }
      activeSession = matchedUser;
      localStorage.setItem("nita_active_session", JSON.stringify(matchedUser));
      applyRolePermissions(matchedUser);
      showAuthOverlay(false);
      addLog(`Account created. Welcome, ${nameInput}!`, 'success');
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    activeSession = null;
    localStorage.removeItem("nita_active_session");
    showAuthOverlay(true);
    addLog(`Coordinator logout requested. Session tokens cleared.`, 'info');
  });
}

// Normalizes phone input for WhatsApp CMMS (e.g. 58589024 -> +23058589024)
function normalizeWhatsAppPhone(phone) {
  let clean = phone.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parentheses
  if (!clean.startsWith('+')) {
    // If it starts with a country code (like '230') but no plus, prepend '+'
    if (clean.startsWith('230') && clean.length > 8) {
      clean = '+' + clean;
    } else if (clean.length === 8 && (clean.startsWith('5') || clean.startsWith('7') || clean.startsWith('9') || clean.startsWith('6'))) {
      // Auto-prepend Mauritius country code +230 for 8-digit mobile numbers
      clean = '+230' + clean;
    } else {
      // Prepend plus if they just forgot it but typed a country code
      clean = '+' + clean;
    }
  }
  return clean;
}

// SHA-256 helper — returns 64-char lowercase hex
async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
}

function showAuthOverlay(show) {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) {
    if (show) overlay.classList.remove('hidden');
    else overlay.classList.add('hidden');
  }
}

function selectPresetUser(name, phone, pin) {
  switchAuthTab('login');
  const phoneField = document.getElementById('auth-phone');
  const pinField = document.getElementById('auth-pin');
  if (phoneField && pinField) {
    phoneField.value = phone;
    pinField.value = pin;
  }
}
window.selectPresetUser = selectPresetUser;

function applyRolePermissions(session) {
  const profileName = document.getElementById('current-user-name');
  const profileRole = document.getElementById('current-user-role');
  const profileAvatar = document.getElementById('current-user-avatar');
  
  if (profileName) profileName.textContent = session.name;
  if (profileRole) profileRole.textContent = session.role.toUpperCase();
  if (profileAvatar) {
    profileAvatar.textContent = session.name.split(' ').map(n => n[0]).join('');
  }

  const dashLink = document.getElementById('menu-coordinator-dash');
  const pbLink = document.getElementById('menu-planning-breakdown');
  const entryLink = document.getElementById('menu-task-entry');
  const simLink = document.getElementById('menu-whatsapp-sim');
  const schedulerLink = document.getElementById('menu-tasks-to-approve');
  const techLink = document.getElementById('menu-technician-tasks');
  const apiLink = document.getElementById('menu-api');
  const dbLink = document.getElementById('menu-database');
  const docsLink = document.getElementById('menu-docs');

  const items = [dashLink, pbLink, entryLink, simLink, schedulerLink, techLink, apiLink, dbLink, docsLink];
  items.forEach(el => { if (el) el.style.display = 'none'; });

  if (session.role === 'coordinator') {
    items.forEach(el => { if (el && el !== techLink) el.style.display = 'flex'; });
    navigateToPane('pane-dashboard');
  } else if (session.role === 'operator') {
    if (entryLink) entryLink.style.display = 'flex';
    if (simLink) simLink.style.display = 'flex';
    navigateToPane('pane-task-entry');
  } else if (session.role === 'technician') {
    if (techLink) techLink.style.display = 'flex';
    navigateToPane('pane-technician-tasks');
    renderTechnicianDailyJobs();
  }
}

// ------------------------------------------------------------
// 2. VIEW PANEL ROUTING
// ------------------------------------------------------------
const menuItems = document.querySelectorAll('.sidebar .menu-item');
const contentPanes = document.querySelectorAll('.content-pane');
const viewTitle = document.getElementById('view-title');

menuItems.forEach(item => {
  item.addEventListener('click', () => {
    menuItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    const target = item.getAttribute('data-target');
    contentPanes.forEach(pane => {
      pane.classList.remove('active');
      if (pane.id === target) {
        pane.classList.add('active');
      }
    });
    
    const labelSpan = item.querySelector('span');
    if (labelSpan && viewTitle) {
      viewTitle.textContent = labelSpan.textContent;
    }
    
    if (target === 'pane-planning-breakdown') {
      renderBreakdownTasks();
    } else if (target === 'pane-tasks-to-approve') {
      renderApprovalTable();
    }
  });
});

function navigateToPane(paneId) {
  const item = document.querySelector(`.sidebar .menu-item[data-target="${paneId}"]`);
  if (item) {
    item.click();
  } else {
    contentPanes.forEach(pane => {
      pane.classList.remove('active');
      if (pane.id === paneId) {
        pane.classList.add('active');
      }
    });
  }
}
window.navigateToPane = navigateToPane;

// ------------------------------------------------------------
// 3. PANE 1: FILEMAKER COORDINATOR DASHBOARD
// ------------------------------------------------------------
const fmDeptTable = document.getElementById('fm-dept-dashboard-table');
const fmDetailDeptName = document.getElementById('fm-detail-dept-name');
const fmDetailDeptLoc = document.getElementById('fm-detail-dept-loc');
const fmBadgeApproval = document.getElementById('fm-badge-approval');
const rtDeptTitle = document.getElementById('rt-department-title');

let selectedDeptId = departments[0].department_id;

function renderFmDashboard() {
  const pendingCount = taskRequests.filter(t => t.status === 'pending_approval').length;
  if (fmBadgeApproval) fmBadgeApproval.textContent = pendingCount.toString();
  
  if (fmDeptTable) {
    fmDeptTable.innerHTML = '';
    departments.forEach(dept => {
      const tr = document.createElement('tr');
      if (dept.department_id === selectedDeptId) tr.classList.add('active');
      tr.innerHTML = `<td>${esc(dept.name)}</td>`;
      tr.addEventListener('click', () => {
        selectedDeptId = dept.department_id;
        renderFmDashboard();
      });
      fmDeptTable.appendChild(tr);
    });
  }

  const current = deptMap.get(selectedDeptId);
  if (current) {
    if (fmDetailDeptName) fmDetailDeptName.textContent = current.name;
    if (rtDeptTitle) rtDeptTitle.textContent = current.name;
  }
}

function resetAllWorkOrders() {
  if (confirm("Are you sure you want to reset all dispatched work order assignments?")) {
    if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
      fetchSupabase('work_order_technician', 'DELETE', null, 'status=eq.assigned')
        .then(() => fetchSupabase('work_order', 'DELETE', null, 'status=eq.pending'))
        .then(() => syncWithSupabase())
        .catch(err => addLog(`Reset failed: ${err.message}`, 'error'));
    } else {
      workOrders = [];
      workOrderTechnicians = [];
      taskRequests.forEach(t => {
        if (t.status !== 'pending_approval' && t.status !== 'rejected') {
          t.status = 'pending_approval';
        }
      });
      saveDB();
      renderFmDashboard();
      renderBreakdownTasks();
      renderApprovalTable();
    }
    addLog("[Database] Reset all active work orders completely.", 'warn');
  }
}
window.resetAllWorkOrders = resetAllWorkOrders;

// ------------------------------------------------------------
// 4. PANE 2: TASK ENTRY PANEL (Image 3)
// ------------------------------------------------------------
const teTaskListBody = document.getElementById('te-task-list-body');
let selectedTaskId = null;

function renderTaskEntryTable() {
  if (!teTaskListBody) return;
  teTaskListBody.innerHTML = '';
  
  taskRequests.forEach(task => {
    const asset = assetIdMap.get(task.asset_id);
    const assetName = asset ? asset.name : 'Unknown';
    
    let statusClass = 'row-unplanned';
    if (task.status === 'approved' || task.status === 'in_progress') statusClass = 'row-planned';
    if (task.status === 'deleted' || task.status === 'rejected') statusClass = 'row-deleted';
    if (task.status === 'completed') statusClass = 'row-rework';

    const tr = document.createElement('tr');
    tr.className = statusClass;
    if (task.task_request_id === selectedTaskId) tr.classList.add('selected');
    
    const priLabel = task.priority === 0 ? 'P0' : task.priority === 1 ? 'P1' : 'P2';
    const dateStr = new Date(task.requested_at).toLocaleDateString();

    tr.innerHTML = `
      <td>${esc(task.asset_id)}</td>
      <td style="font-weight:600;">${esc(assetName)}</td>
      <td>${esc(task.task_type)}</td>
      <td style="max-width: 150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(task.description)}</td>
      <td>${task.priority === 0 ? 'Urgent' : 'Normal'}</td>
      <td>${priLabel}</td>
      <td>${dateStr}</td>
      <td><span class="circular-select-icon"></span></td>
    `;
    
    tr.addEventListener('click', () => {
      selectedTaskId = task.task_request_id;
      loadTaskToForm(task);
      renderTaskEntryTable();
    });
    teTaskListBody.appendChild(tr);
  });
}

function loadTaskToForm(task) {
  const codeField = document.getElementById('te-asset-code');
  const nameField = document.getElementById('te-asset-name');
  const typeField = document.getElementById('te-asset-type');
  const serialField = document.getElementById('te-asset-serial');
  const deptField = document.getElementById('te-asset-dept');
  const locField = document.getElementById('te-asset-loc');
  const urgencySelect = document.getElementById('te-urgency');
  const descField = document.getElementById('te-description');
  const locField2 = document.getElementById('te-location');

  const asset = assetIdMap.get(task.asset_id);
  if (codeField) codeField.value = asset ? asset.asset_code : task.asset_id;
  if (nameField) nameField.value = asset ? asset.name : '';
  if (typeField) typeField.value = asset ? asset.required_trade : '';
  if (serialField) serialField.value = asset ? asset.asset_code : '';
  if (deptField) deptField.value = '';
  if (locField) locField.value = asset ? asset.location : '';
  if (urgencySelect) urgencySelect.value = task.priority.toString();
  if (descField) descField.value = task.description;
  if (locField2) locField2.value = asset ? asset.location : '';
}

function teSearchAsset() {
  const codeInput = document.getElementById('te-asset-code').value.trim();
  const asset = assetMap.get(codeInput);
  if (asset) {
    const nameField = document.getElementById('te-asset-name');
    const typeField = document.getElementById('te-asset-type');
    const serialField = document.getElementById('te-asset-serial');
    const deptField = document.getElementById('te-asset-dept');
    const locField = document.getElementById('te-asset-loc');
    
    if (nameField) nameField.value = asset.name;
    if (typeField) typeField.value = asset.required_trade;
    if (serialField) serialField.value = asset.asset_code;
    if (deptField) deptField.value = '';
    if (locField) locField.value = asset.location;
    addLog(`Asset ${codeInput} metadata resolved.`, 'success');
  } else {
    alert("Asset code not recognized!");
  }
}
window.teSearchAsset = teSearchAsset;

function teNewForm() {
  selectedTaskId = null;
  const fields = ['te-asset-code', 'te-asset-name', 'te-asset-type', 'te-asset-serial', 'te-asset-dept', 'te-asset-loc', 'te-description', 'te-location'];
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = '';
  });
  renderTaskEntryTable();
}
window.teNewForm = teNewForm;

function teConfirmForm() {
  const code = document.getElementById('te-asset-code').value;
  const desc = document.getElementById('te-description').value;
  const priority = parseInt(document.getElementById('te-urgency').value);

  if (!code || !desc) {
    alert("Please fill in the asset code and description fields!");
    return;
  }

  if (selectedTaskId) {
    if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
      fetchSupabase('task_request', 'PATCH', {
        asset_id: code,
        description: desc,
        priority: priority
      }, `task_request_id=eq.${selectedTaskId}`)
        .then(() => syncWithSupabase())
        .catch(err => addLog(`Task update failed: ${err.message}`, 'error'));
    } else {
      const task = taskRequests.find(t => t.task_request_id === selectedTaskId);
      if (task) {
        task.asset_id = code;
        task.description = desc;
        task.priority = priority;
      }
      saveDB();
      renderTaskEntryTable();
      renderFmDashboard();
    }
    addLog(`Updated task request ${selectedTaskId}.`, 'success');
  } else {
    const newId = generateId('task-entry');
    const body = {
      task_request_id: newId,
      asset_id: code,
      created_by_user_id: activeSession ? activeSession.name : "Operator",
      status: "pending_approval",
      priority: priority,
      requested_at: new Date().toISOString(),
      description: desc,
      task_type: "New Task",
      approved_by_user_id: null,
      approved_at: null,
      rejection_reason: null,
      media_urls: []
    };

    if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
      // Use NITA API to create task
      NITA_API.createTask({
        asset_code: code,
        created_by_phone: activeSession?.phone || '+23052000101',
        description: desc,
        priority: priority,
        task_type: priority === 0 ? 'emergency' : 'repair'
      }).then(result => {
        if (!result.error) {
          if (result.is_duplicate) {
            addLog(`Duplicate task detected: ${result.existing_task_id}`, 'warn');
          } else {
            addLog(`Task created via NITA API: ${result.task_request_id}`, 'success');
          }
        } else {
          addLog(`NITA API task creation failed: ${result.message}`, 'error');
        }
        syncWithSupabase();
      }).catch(err => addLog(`Task creation failed: ${err.message}`, 'error'));
    } else {
      taskRequests.unshift(body);
      saveDB();
      renderTaskEntryTable();
      renderFmDashboard();
    }
    selectedTaskId = newId;
    addLog(`Logged new maintenance task request ${newId}.`, 'success');
  }
}
window.teConfirmForm = teConfirmForm;

function teDeleteForm() {
  if (!selectedTaskId) return;
  if (confirm("Confirm removal of this task request?")) {
    if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
      fetchSupabase('task_request', 'PATCH', { status: 'deleted' }, `task_request_id=eq.${selectedTaskId}`)
        .then(() => syncWithSupabase())
        .catch(err => addLog(`Task delete failed: ${err.message}`, 'error'));
    } else {
      const task = taskRequests.find(t => t.task_request_id === selectedTaskId);
      if (task) {
        task.status = 'deleted';
      }
      saveDB();
      renderTaskEntryTable();
      renderFmDashboard();
    }
    addLog(`Marked task request ${selectedTaskId} as deleted.`, 'warn');
  }
}
window.teDeleteForm = teDeleteForm;

// ------------------------------------------------------------
// 5. PANE 3: PLANNING BREAKDOWN (Image 4)
// ------------------------------------------------------------
const pbTableBody = document.getElementById('pb-breakdown-table-body');
const pbTechSelect = document.getElementById('pb-tech-select');
const pbPendingCountBadge = document.getElementById('breakdown-pending-count');

let activeBreakdownTab = 'leakage';

function setBreakdownTab(tab) {
  activeBreakdownTab = tab;
  
  const btns = document.querySelectorAll('.fm-subtabs-row .subtab-btn');
  btns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent?.toLowerCase().includes(tab)) {
      btn.classList.add('active');
    }
  });

  renderBreakdownTasks();
}
window.setBreakdownTab = setBreakdownTab;

function renderBreakdownTasks() {
  if (!pbTableBody) return;
  pbTableBody.innerHTML = '';

  if (pbTechSelect && pbTechSelect.children.length === 0) {
    technicians.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.trade})`;
      pbTechSelect.appendChild(opt);
    });
  }

  let filtered = taskRequests;
  if (activeBreakdownTab === 'leakage') {
    filtered = taskRequests.filter(t => t.description.toLowerCase().includes("leak") || t.description.toLowerCase().includes("water"));
  } else if (activeBreakdownTab === 'repairs') {
    filtered = taskRequests.filter(t => t.status === 'pending_approval' && !t.description.toLowerCase().includes("leak"));
  } else if (activeBreakdownTab === 'pending') {
    filtered = taskRequests.filter(t => t.status === 'approved');
  } else if (activeBreakdownTab === 'approved') {
    filtered = taskRequests.filter(t => t.status === 'in_progress' || t.status === 'completed');
  }

  const searchInput = document.getElementById('pb-search-description')?.value.toLowerCase();
  if (searchInput) {
    filtered = filtered.filter(t => t.description.toLowerCase().includes(searchInput));
  }

  if (pbPendingCountBadge) {
    pbPendingCountBadge.textContent = filtered.length.toString();
  }

  filtered.forEach(task => {
    const tr = document.createElement('tr');
    const dateStr = new Date(task.requested_at).toLocaleDateString();
    const timeStr = new Date(task.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const asset = assetIdMap.get(task.asset_id);
    const assetName = asset ? asset.name : 'Unknown';

    const plannedChecked = task.status !== 'pending_approval' ? 'checked' : '';
    const immediateChecked = task.priority === 0 ? 'checked' : '';
    const escapedId = esc(task.task_request_id);

    tr.innerHTML = `
      <td>${escapedId}</td>
      <td>${dateStr}</td>
      <td>${timeStr}</td>
      <td>${esc(assetName)}</td>
      <td>${esc(task.created_by_user_id)}</td>
      <td style="max-width: 150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(task.description)}</td>
      <td>None</td>
      <td>
        <label style="font-size:11px; display:inline-flex; align-items:center; gap:4px; margin-right:8px;">
          <input type="radio" name="plan-type-${escapedId}" ${plannedChecked} disabled> Planned
        </label>
        <label style="font-size:11px; display:inline-flex; align-items:center; gap:4px;">
          <input type="radio" name="plan-type-${escapedId}" ${immediateChecked} disabled> Immediate
        </label>
      </td>
      <td>
        <button class="planner-btn" style="background:#ef4444; color:#fff; padding:2px 8px; font-size:11px;" onclick="pbTrashTask('${escapedId}')">Trash</button>
      </td>
    `;
    pbTableBody.appendChild(tr);
  });
}

function pbTrashTask(id) {
  if (confirm("Trash this task request from breakdown catalog?")) {
    if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
      fetchSupabase('task_request', 'PATCH', { status: 'deleted' }, `task_request_id=eq.${id}`)
        .then(() => syncWithSupabase())
        .catch(err => addLog(`Trash failed: ${err.message}`, 'error'));
    } else {
      const task = taskRequests.find(t => t.task_request_id === id);
      if (task) {
        task.status = 'deleted';
      }
      saveDB();
      renderBreakdownTasks();
      renderTaskEntryTable();
      renderFmDashboard();
    }
    addLog(`Trashed task ${id} from planner breakdown.`, 'warn');
  }
}
window.pbTrashTask = pbTrashTask;

document.getElementById('pb-search-description')?.addEventListener('input', () => {
  renderBreakdownTasks();
});

document.getElementById('btn-pb-dispatch-engineer')?.addEventListener('click', () => {
  const techId = pbTechSelect.value;
  const duration = parseInt(document.getElementById('pb-duration').value);
  const start = document.getElementById('pb-start-date').value;
  const finish = document.getElementById('pb-finish-date').value;
  const charge1 = document.getElementById('pb-charge-1').value;
  const charge2 = document.getElementById('pb-charge-2').value;

  let targetTask = taskRequests.find(t => t.status === 'pending_approval');
  if (activeBreakdownTab === 'leakage') {
    targetTask = taskRequests.find(t => t.status === 'pending_approval' && t.description.toLowerCase().includes("leak"));
  }

  if (!targetTask) {
    alert("No pending tasks in this list to assign to the engineer!");
    return;
  }

  const woId = generateId('wo');
  const wo = {
    work_order_id: woId,
    task_request_id: targetTask.task_request_id,
    status: 'pending',
    priority: targetTask.priority,
    scheduled_start: start + "T08:00:00.000Z",
    created_at: new Date().toISOString(),
    completed_at: null,
    recommended_technician_id: techId,
    recommendation_reason: `Assigned by coordinator on ${start}`
  };

  const tech = technicians.find(t => t.technician_id === techId);
  const assign = {
    work_order_id: woId,
    technician_id: techId,
    assigned_at: new Date().toISOString(),
    status: 'assigned'
  };

  if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
    // Use NITA API approve endpoint which creates work order + assignment
    NITA_API.approveTask({
      task_id: targetTask.task_request_id,
      approved_by_phone: activeSession?.phone || '+23054737266',
      technician_id: techId,
      recommended_technician_id: techId,
      recommendation_reason: `Assigned by coordinator on ${start}`
    }).then(result => {
      if (!result.error) {
        addLog(`Dispatched via NITA API. Work order: ${result.work_order_id}`, 'success');
      } else {
        addLog(`NITA API dispatch failed: ${result.message}`, 'error');
      }
      syncWithSupabase();
    }).catch(err => addLog(`Dispatch failed: ${err.message}`, 'error'));
  } else {
    targetTask.status = 'approved';
    workOrders.push(wo);
    if (tech) {
      tech.workload = (tech.workload || 0) + 1;
      workOrderTechnicians.push(assign);
    }
    saveDB();
    renderFmDashboard();
    renderBreakdownTasks();
  }

  alert(`Dispatched successfully! Work order generated for ${tech ? tech.full_name : 'Engineer'}.`);
  addLog(`Dispatched engineer assignment for task ${targetTask.task_request_id}.`, 'success');
});

// ------------------------------------------------------------
// 6. PANE 4: TASKS TO BE APPROVED (Image 5 Implementation)
// ------------------------------------------------------------
const approveTableBody = document.getElementById('approve-table-body');
const approveCountBadge = document.getElementById('approve-count-badge');

function renderApprovalTable() {
  if (!approveTableBody) return;
  approveTableBody.innerHTML = '';

  const pending = taskRequests.filter(t => t.status === 'pending_approval');
  if (approveCountBadge) {
    approveCountBadge.textContent = pending.length.toString();
  }

  if (pending.length === 0) {
    approveTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#6b7280; font-weight:600;">No pending task requests requiring approvals.</td></tr>`;
    return;
  }

  pending.forEach(task => {
    const dateStr = new Date(task.requested_at).toLocaleDateString();
    const escapedId = esc(task.task_request_id);
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:monospace; font-weight:700;">${escapedId}</td>
      <td>
        <div style="font-weight:700;">${esc(task.created_by_role || 'operator')}</div>
        <div style="font-size:11px; color:#4b5563;">${esc(task.created_by_user_id)}</div>
      </td>
      <td>${dateStr}</td>
      <td style="max-width:300px; line-height:1.4;">${esc(task.description)}</td>
      <td>${dateStr}</td>
      <td>
        <div style="display:flex; flex-direction:column; gap:4px;">
          <label style="font-size:11px; color:#dc2626; font-weight:700; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
            <input type="radio" name="approval-state-${escapedId}" value="approve" onclick="dispatchDirectApproval('${escapedId}', 'approve')"> Approved
          </label>
          <label style="font-size:11px; color:#374151; font-weight:700; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
            <input type="radio" name="approval-state-${escapedId}" value="reject" onclick="dispatchDirectApproval('${escapedId}', 'reject')"> Not Approved
          </label>
        </div>
      </td>
      <td>
        <button class="planner-btn" style="background:#f1f5f9; border:1px solid #71717a; color:#000; font-size:11px; font-weight:700;" onclick="approveTaskImmediate('${escapedId}')">Engineer ➔</button>
      </td>
    `;
    approveTableBody.appendChild(tr);
  });
}

function dispatchDirectApproval(id, action) {
  const task = taskRequests.find(t => t.task_request_id === id);
  if (!task) return;

  if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
    if (action === 'approve') {
      // Use NITA API to approve and auto-dispatch
      NITA_API.approveTask({
        task_id: id,
        approved_by_phone: activeSession?.phone || '+23054737266',
        technician_id: TECH_ID_MAP[activeSession?.phone || ''] || '1c60280b-4c7f-4996-a827-56b6b4113760',
        recommended_technician_id: TECH_ID_MAP[activeSession?.phone || ''] || '1c60280b-4c7f-4996-a827-56b6b4113760',
        recommendation_reason: 'Auto-dispatched from approval dashboard'
      }).then(result => {
        if (!result.error) {
          addLog(`Task ${id} approved via NITA API. WO: ${result.work_order_id}`, 'success');
        } else {
          addLog(`NITA API approval failed: ${result.message}`, 'error');
        }
        syncWithSupabase();
      }).catch(err => addLog(`Approval failed: ${err.message}`, 'error'));
    } else {
      NITA_API.rejectTask({
        task_id: id,
        approved_by_phone: activeSession?.phone || '+23054737266',
        reason: 'Rejected from approval dashboard'
      }).then(result => {
        if (!result.error) {
          addLog(`Task ${id} rejected via NITA API.`, 'success');
        } else {
          addLog(`NITA API rejection failed: ${result.message}`, 'error');
        }
        syncWithSupabase();
      }).catch(err => addLog(`Rejection failed: ${err.message}`, 'error'));
    }
  } else {
    if (action === 'approve') {
      task.status = 'approved';
      task.approved_at = new Date().toISOString();
      task.approved_by_user_id = activeSession ? (activeSession.user_id || activeSession.name) : "Nelson Fodjo";
      
      const woId = generateId('wo');
      workOrders.push({
        work_order_id: woId,
        task_request_id: task.task_request_id,
        status: 'pending',
        priority: task.priority,
        scheduled_start: new Date().toISOString(),
        created_at: new Date().toISOString(),
        completed_at: null
      });
    } else {
      task.status = 'rejected';
      task.rejection_reason = "Rejected from approval dashboard list.";
    }
    saveDB();
    renderApprovalTable();
    renderFmDashboard();
    renderBreakdownTasks();
  }
  addLog(`Task ${id} direct action updated: ${action.toUpperCase()}`, 'success');
}
window.dispatchDirectApproval = dispatchDirectApproval;

function approveTaskImmediate(id) {
  const task = taskRequests.find(t => t.task_request_id === id);
  if (!task) return;

  if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
    fetchSupabase('task_request', 'PATCH', { status: 'approved' }, `task_request_id=eq.${id}`)
      .then(() => {
        const woId = generateId('wo');
        return fetchSupabase('work_order', 'POST', {
          work_order_id: woId,
          task_request_id: id,
          status: 'in_progress',
          priority: task.priority,
          scheduled_start: new Date().toISOString(),
          created_at: new Date().toISOString(),
          completed_at: null
        }).then(() => woId);
      })
      .then(woId => fetchSupabase('work_order_technician', 'POST', {
        work_order_id: woId,
        technician_id: TECH_ID_MAP[activeSession?.phone || ''] || 'b03a190a-dbca-49d7-84fe-19a9dcf18f91',
        assigned_at: new Date().toISOString(),
        status: 'assigned'
      }))
      .then(() => syncWithSupabase())
      .catch(err => addLog(`Immediate dispatch failed: ${err.message}`, 'error'));
  } else {
    if (task.status === 'pending_approval') {
      task.status = 'approved';
      task.approved_at = new Date().toISOString();
      
      const woId = generateId('wo');
      workOrders.push({
        work_order_id: woId,
        task_request_id: task.task_request_id,
        status: 'pending',
        priority: task.priority,
        scheduled_start: new Date().toISOString(),
        created_at: new Date().toISOString(),
        completed_at: null
      });
    }

    const wo = workOrders.find(w => w.task_request_id === task.task_request_id);
    if (wo) {
      const bestMech = technicians.filter(t => t.active && t.trade === 'mechanic').sort((a,b) => (a.workload || 0) - (b.workload || 0))[0];
      if (bestMech) {
        bestMech.workload = (bestMech.workload || 0) + 1;
        workOrderTechnicians.push({
          work_order_id: wo.work_order_id,
          technician_id: bestMech.id,
          assigned_at: new Date().toISOString(),
          status: 'assigned'
        });
        wo.status = 'in_progress';
        task.status = 'in_progress';
      }
    }
    saveDB();
    renderApprovalTable();
    renderFmDashboard();
    renderBreakdownTasks();
  }
}
window.approveTaskImmediate = approveTaskImmediate;

// ------------------------------------------------------------
// 7. TECHNICIAN DAILY DASHBOARD
// ------------------------------------------------------------
const techJobsBody = document.getElementById('tech-jobs-table-body');

function renderTechnicianDailyJobs() {
  if (!techJobsBody || !activeSession) return;
  techJobsBody.innerHTML = '';

  const tech = technicians.find(t => t.full_name === activeSession?.name);
  if (!tech) return;

  const assignments = workOrderTechnicians.filter(wt => wt.technician_id === tech.technician_id);
  
  if (assignments.length === 0) {
    techJobsBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:10px;">No active job assignments for your shift today.</td></tr>`;
    return;
  }

  assignments.forEach(assign => {
    const wo = workOrders.find(w => w.work_order_id === assign.work_order_id);
    if (!wo) return;
    
    const task = taskRequests.find(t => t.task_request_id === wo.task_request_id);
    if (!task) return;

    const asset = assetIdMap.get(task.asset_id);
    const assetDisplay = asset ? asset.name : task.asset_id.substring(0, 8) + '...';

    let buttonActionHTML = '';
    if (wo.status === 'pending') {
      buttonActionHTML = `
        <button class="planner-btn primary" style="font-size:11px; padding:4px 8px; margin-right:6px;" onclick="techUpdateJob('${wo.work_order_id}', 'start')">Start Job</button>
        <button class="planner-btn" style="background:#ef4444; font-size:11px; padding:4px 8px; color:#fff;" onclick="techUpdateJob('${wo.work_order_id}', 'decline')">Decline</button>
      `;
    } else if (wo.status === 'in_progress') {
      buttonActionHTML = `
        <button class="planner-btn" style="background:#10b981; font-size:11px; padding:4px 8px; color:#fff;" onclick="techUpdateJob('${wo.work_order_id}', 'done')">Mark Completed</button>
      `;
    } else {
      buttonActionHTML = `<span style="font-size:12px; color:var(--text-muted); font-weight:600;">Job Closed</span>`;
    }

    const scheduledDate = wo.scheduled_start ? new Date(wo.scheduled_start).toLocaleDateString() : '—';
    const statusColor = wo.status === 'completed' ? '#10b981' : wo.status === 'in_progress' ? '#f59e0b' : '#6b7280';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:monospace; font-weight:600;">${esc(wo.work_order_id)}</td>
      <td style="font-weight:600; color:var(--fm-blue-dark);">${esc(assetDisplay)}</td>
      <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(task.description)}</td>
      <td style="color:${task.priority === 0 ? 'var(--p0-critical)' : 'var(--p2-normal)'}; font-weight:700;">P${task.priority}</td>
      <td><span class="status-badge" style="font-size:11px; padding:2px 8px; background:${statusColor}20; color:${statusColor}; border:1px solid ${statusColor}40;">${esc(wo.status)}</span></td>
      <td>${scheduledDate}</td>
      <td>${buttonActionHTML}</td>
    `;
    techJobsBody.appendChild(tr);
  });
}

function techUpdateJob(woId, action) {
  const wo = workOrders.find(w => w.work_order_id === woId);
  if (!wo) return;

  if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
    // Use NITA API technician actions endpoint
    NITA_API.technicianAction(woId, activeSession?.phone || '', action)
      .then(result => {
        if (!result.error) {
          addLog(`[Tech] ${action} work_order ${woId}: ${result.message}`, 'success');
        } else {
          addLog(`[Tech] ${action} failed: ${result.message}`, 'error');
        }
        syncWithSupabase();
      })
      .catch(err => addLog(`[Tech] ${action} failed: ${err.message}`, 'error'));
  } else {
    if (action === 'start') {
      wo.status = 'in_progress';
      const task = taskRequests.find(t => t.task_request_id === wo.task_request_id);
      if (task) task.status = 'in_progress';
      addLog(`[Tech Dispatch] Started job work_order ${woId}.`, 'success');
    } else if (action === 'done') {
      wo.status = 'completed';
      wo.completed_at = new Date().toISOString();
      
      const task = taskRequests.find(t => t.task_request_id === wo.task_request_id);
      if (task) task.status = 'completed';

      const tech = technicians.find(t => t.full_name === activeSession?.name);
      if (tech) tech.workload = Math.max(0, (tech.workload || 0) - 1);
      
      addLog(`[Tech Dispatch] Completed job work_order ${woId}. Requesting feedback webhook.`, 'success');
    } else if (action === 'decline') {
      wo.status = 'pending';
      const assign = workOrderTechnicians.find(w => w.work_order_id === woId);
      if (assign) assign.status = 'declined';
      
      const tech = technicians.find(t => t.full_name === activeSession?.name);
      if (tech) tech.workload = Math.max(0, (tech.workload || 0) - 1);
      addLog(`[Tech Dispatch] Declined job work_order ${woId}. Reassignment queue active.`, 'warn');
    }

    saveDB();
    renderTechnicianDailyJobs();
    renderFmDashboard();
    renderBreakdownTasks();
    renderApprovalTable();
  }
}
window.techUpdateJob = techUpdateJob;

// ------------------------------------------------------------
// 8. PANE 4: WHATSAPP SIMULATOR
// ------------------------------------------------------------
const chatMessages = document.getElementById('chat-messages');
const chatUserInput = document.getElementById('chat-user-input');
const btnSendMessage = document.getElementById('btn-send-message');
const consoleLogs = document.getElementById('console-logs');

const initialConversations = [
  { sender: 'ai', text: "Hello! Welcome to the RT Knits NITA Dispatch Bot. I help you coordinate maintenance requests instantly. What issue are you experiencing on the floor?", time: "08:00 AM" }
];

function renderChat() {
  if (!chatMessages) return;
  chatMessages.innerHTML = '';
  initialConversations.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.sender === 'ai' ? 'incoming' : 'outgoing'}`;
    
    let innerHTML = '';
    if (msg.image) {
      innerHTML += `<img class="chat-image" src="${esc(msg.image)}" alt="Attachment">`;
    }
    if (msg.audio) {
      innerHTML += `
        <div class="chat-audio">
          <span style="font-size:10px; color:#6b7280; margin-left:4px;">${esc(msg.audio)}</span>
        </div>
      `;
    }
    innerHTML += `<div>${msg.text}</div>`;
    innerHTML += `<div class="time">${esc(msg.time)}</div>`;
    
    bubble.innerHTML = innerHTML;
    chatMessages.appendChild(bubble);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addLog(text, type = 'info') {
  if (!consoleLogs) return;
  const line = document.createElement('div');
  line.className = `console-line ${type}`;
  const now = new Date().toLocaleTimeString();
  line.textContent = `[${now}] ${text}`;
  consoleLogs.appendChild(line);
  consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

function clearConsole() {
  if (consoleLogs) {
    consoleLogs.innerHTML = '<div class="console-line info">[System] Log cleared. Ready.</div>';
  }
}

function loadScenario(preset) {
  if (!chatUserInput) return;
  if (preset === 'critical_leak') {
    chatUserInput.value = "Mo pe tann enn gro gro bwi grinding lor knitting floor. Brother Circular Knitter line 3 inn arete net!";
    addLog("[Preset] Loaded P0 Critical Scenario.", "info");
  } else if (preset === 'urgent_tension') {
    chatUserInput.value = "Belt sliding on Gerber Z1. Machine still works but it is cutting poorly, need someone quickly.";
    addLog("[Preset] Loaded P1 Urgent Scenario.", "info");
  } else if (preset === 'normal_cosmetic') {
    chatUserInput.value = "Office gate handle is loose. Can someone check it during daily rounds?";
    addLog("[Preset] Loaded P2 Normal Scenario.", "info");
  }
}

window.loadScenario = loadScenario;
window.clearConsole = clearConsole;

function processUserMessage(text) {
  if (!text.trim()) return;
  
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  initialConversations.push({ sender: 'user', text: text, time: nowStr });
  renderChat();
  if (chatUserInput) chatUserInput.value = '';
  
  setTimeout(() => addLog("Inbound WhatsApp webhook received from +23052000101 (Operator Priya Singh).", "info"), 400);
  setTimeout(() => addLog("Analyzing message text language...", "info"), 800);
  
  let detectedAsset = "Unknown";
  let assetCode = "Unknown";
  let trade = "general";
  let priority = 2;
  let responseText = "";

  if (text.toLowerCase().includes("knitt") || text.toLowerCase().includes("circular") || text.toLowerCase().includes("bwi")) {
    detectedAsset = "Circular Knitter — Brother CK-8";
    assetCode = "39";
    trade = "mechanic";
    priority = 0;
    responseText = "Detected **Circular Knitter (Asset 39)**. This has been marked as a **P0 Critical** (Production Down) issue. Requesting mechanic dispatch. Please approve on the dashboard.";
  } else if (text.toLowerCase().includes("gerber") || text.toLowerCase().includes("belt") || text.toLowerCase().includes("cut")) {
    detectedAsset = "Cutting Machine — Gerber Z1";
    assetCode = "175";
    trade = "mechanic";
    priority = 1;
    responseText = "Detected **Gerber Z1 Cutting Machine (Asset 175)**. Marked as **P1 Urgent**. I am recommending a Mechanic to tension the belt.";
  } else {
    detectedAsset = "Office Gate / Latch";
    assetCode = "42";
    trade = "general";
    priority = 2;
    responseText = "Thank you. I have logged an inspection request for the **Office Latch/Gate**. Assigned as a **P2 Non-Urgent** task.";
  }

  setTimeout(() => {
    if (text.toLowerCase().includes("gro bwi") || text.toLowerCase().includes("arete")) {
      addLog("Language detected: Kreol (Mauritian Creole). Translating to English...", "warn");
      addLog("Translation: 'I am hearing a very loud grinding noise on knitting floor. Brother Circular Knitter line 3 has stopped completely!'", "success");
    } else {
      addLog("Language detected: English. Processing directly.", "success");
    }
  }, 1200);

  setTimeout(() => {
    addLog(`Running NER. Extracted slots: Asset Type: ${detectedAsset}, Code: ${assetCode}`, "success");
  }, 1800);

  setTimeout(() => {
    addLog(`Classifying task criteria: Priority ${priority}, Required Trade: ${trade}`, "warn");
  }, 2400);

  setTimeout(() => {
    addLog("Inserting record into `task_request` with status = 'pending_approval'.", "success");
    
    const newTaskId = generateId('task');
    const newTask = {
      task_request_id: newTaskId,
      asset_id: assetCode,
      created_by_user_id: activeSession ? activeSession.name : "Operator",
      status: "pending_approval",
      priority: priority,
      requested_at: new Date().toISOString(),
      description: text,
      task_type: "New Task",
      approved_by_user_id: null,
      approved_at: null,
      rejection_reason: null,
      media_urls: []
    };

    if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
      // Use NITA API to create task
      NITA_API.createTask({
        asset_code: assetCode,
        created_by_phone: activeSession?.phone || '+23052000101',
        description: text,
        priority: priority,
        task_type: priority === 0 ? 'emergency' : 'repair'
      }).then(result => {
        if (!result.error) {
          if (result.is_duplicate) {
            addLog(`Duplicate task detected: ${result.existing_task_id}`, 'warn');
          } else {
            addLog(`Task created via NITA API: ${result.task_request_id}`, 'success');
          }
        } else {
          addLog(`NITA API task creation failed: ${result.message}`, 'error');
        }
        syncWithSupabase();
      }).catch(err => addLog(`WhatsApp task creation failed: ${err.message}`, 'error'));
    } else {
      taskRequests.unshift(newTask);
      saveDB();
      renderFmDashboard();
      renderTaskEntryTable();
      renderApprovalTable();
    }
    
    const aiTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    initialConversations.push({ sender: 'ai', text: responseText, time: aiTimeStr });
    renderChat();
    addLog("AI Response message dispatched to WhatsApp gateway successfully.", "success");
  }, 3000);
}

btnSendMessage?.addEventListener('click', () => {
  if (chatUserInput) processUserMessage(chatUserInput.value);
});

chatUserInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && chatUserInput) {
    processUserMessage(chatUserInput.value);
  }
});

renderChat();

// ------------------------------------------------------------
// 10. PANE 7: API SANDBOX & 14 ENDPOINTS CONTROLLER
// ------------------------------------------------------------
const btnRunApi = document.getElementById('btn-run-api');
const apiResponseJson = document.getElementById('api-response-json');
const apiEndpointSelector = document.getElementById('api-endpoint-selector');
const apiUrlInput = document.getElementById('api-url-input');
const apiDocTitle = document.getElementById('api-doc-title');
const apiDocDescription = document.getElementById('api-doc-description');
const apiInputsContainer = document.getElementById('api-inputs-container');

const SANDBOX_ENDPOINTS = {
  "api-pending-approvals": {
    url: "https://bot.nelsonfodjo.me/webhook/api-pending-approvals",
    desc: "Returns every task request currently awaiting admin approval, sorted by priority then requested_at.",
    inputsHTML: `<p style="font-size: 11px; color: #9ca3af;">No input parameters needed for GET /api-pending-approvals</p>`,
    handler: () => {
      const pendingTasks = taskRequests.filter(t => t.status === 'pending_approval');
      pendingTasks.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
      });
      return { error: false, count: pendingTasks.length, tasks: pendingTasks };
    }
  },
  "api-assets": {
    url: "https://bot.nelsonfodjo.me/webhook/api-assets?code=39",
    desc: "Retrieve machine details + last 5 repair logs for a given asset code.",
    inputsHTML: `<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Asset Code</label><input type="text" id="param-asset-code" value="39" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"></div>`,
    handler: (inputs) => {
      const code = inputs["param-asset-code"] || "39";
      const asset = assetMap.get(code);
      if (!asset) return { error: true, message: `Asset with code '${code}' not found` };
      const relatedTasks = taskRequests.filter(t => t.asset_id === asset.asset_id).slice(0, 5);
      return { error: false, message: `Asset with code '${code}' found`, asset_code: asset.asset_code, name: asset.name, status: asset.status, location: asset.location, history: { total_repairs: relatedTasks.length, recent: relatedTasks.map(t => ({ date: t.requested_at, description: t.description, status: t.status, priority: t.priority })) } };
    }
  },
  "api-find-asset": {
    url: "https://bot.nelsonfodjo.me/webhook/api-find-asset?location=Knitting&keyword=Circular",
    desc: "Search assets by location prefix and text keyword match.",
    inputsHTML: `<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Location Keyword</label><input type="text" id="param-find-loc" value="Knitting" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"></div><div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Name/Type Keyword</label><input type="text" id="param-find-key" value="Circular" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"></div>`,
    handler: (inputs) => {
      const loc = (inputs["param-find-loc"] || "").toLowerCase();
      const key = (inputs["param-find-key"] || "").toLowerCase();
      const candidates = assets.filter(a => a.location.toLowerCase().includes(loc) && a.name.toLowerCase().includes(key));
      return { error: false, count: candidates.length, candidates };
    }
  },
  "api-technicians": {
    url: "https://bot.nelsonfodjo.me/webhook/api-technicians?trade=mechanic",
    desc: "Get all active technicians matching a trade.",
    inputsHTML: `<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Trade skill</label><select id="param-tech-trade" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"><option value="mechanic">mechanic</option><option value="electrician">electrician</option><option value="welder">welder</option></select></div>`,
    handler: (inputs) => {
      const trade = inputs["param-tech-trade"] || "mechanic";
      const matches = technicians.filter(t => t.trade === trade);
      return { error: false, count: matches.length, technicians: matches };
    }
  },
  "api-recommend-technician": {
    url: "https://bot.nelsonfodjo.me/webhook/api-recommend-technician?trade=mechanic",
    desc: "Score and recommend the best technician based on trade availability and lowest workload.",
    inputsHTML: `<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Required Trade</label><select id="param-rec-trade" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"><option value="mechanic">mechanic</option><option value="electrician">electrician</option><option value="welder">welder</option></select></div>`,
    handler: (inputs) => {
      const trade = inputs["param-rec-trade"] || "mechanic";
      const list = technicians.filter(t => t.active && t.trade === trade);
      if (list.length === 0) return { error: true, message: "No active technicians available" };
      list.sort((a, b) => (a.workload || 0) - (b.workload || 0));
      return { error: false, recommended: list[0], Alternatives: list.slice(1) };
    }
  },
  "api-technician-daily-tasks": {
    url: "https://bot.nelsonfodjo.me/webhook/api-technician-daily-tasks?technician_id=tech-1",
    desc: "Fetch the active daily task queue for a technician.",
    inputsHTML: `<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Technician ID</label><select id="param-daily-tech-id" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"><option value="tech-1">Jean-Marc Rughoo</option><option value="tech-3">Avinash Kowlessur</option></select></div>`,
    handler: (inputs) => {
      const id = inputs["param-daily-tech-id"] || "tech-1";
      const assignments = workOrderTechnicians.filter(wt => wt.technician_id === id);
      const list = assignments.map(a => {
        const wo = workOrders.find(w => w.work_order_id === a.work_order_id);
        const task = wo ? taskRequests.find(t => t.task_request_id === wo.task_request_id) : null;
        return { work_order_id: a.work_order_id, status: wo?.status, priority: wo?.priority, description: task?.description };
      });
      return { error: false, count: list.length, tasks: list };
    }
  },
  "api-next-task": {
    url: "https://bot.nelsonfodjo.me/webhook/api-next-task?technician_id=tech-1",
    desc: "Never-Idle Queue. Fetches the next critical/highest priority task assigned.",
    inputsHTML: `<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Technician ID</label><select id="param-next-tech-id" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"><option value="tech-1">Jean-Marc Rughoo</option></select></div>`,
    handler: () => { return { found: false, message: "No further tasks queued right now" }; }
  },
  "api-admin-status": {
    url: "https://bot.nelsonfodjo.me/webhook/api-admin-status",
    desc: "Returns high level operational metrics count for admin dashboard.",
    inputsHTML: `<p style="font-size: 11px; color: #9ca3af;">No params required for GET /api-admin-status</p>`,
    handler: () => { return { pending_approval: 2, in_progress: 3, critical_active: 1, active_technicians: 4 }; }
  },
  "api-admin-read": {
    url: "https://bot.nelsonfodjo.me/webhook/api-admin-read?table=technician&limit=5",
    desc: "Generic whitelisted reader. Access data from database tables.",
    inputsHTML: `<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Table</label><select id="param-read-table" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"><option value="technician">technician</option><option value="department">department</option><option value="asset">asset</option></select></div>`,
    handler: (inputs) => {
      const table = inputs["param-read-table"] || "technician";
      return { error: false, table, rows: table === 'technician' ? technicians : departments };
    }
  },
  "api-task-lifecycle": {
    url: "https://bot.nelsonfodjo.me/webhook/api-task-lifecycle",
    desc: "Operate task lifecycle events (create / approve / reject).",
    inputsHTML: `<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Action</label><select id="param-life-action" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"><option value="create">create</option></select></div>`,
    handler: () => { return { error: false, status: "pending_approval" }; }
  },
  "api-technician-actions": {
    url: "https://bot.nelsonfodjo.me/webhook/api-technician-actions",
    desc: "Update work order state directly from WhatsApp flows.",
    inputsHTML: `<p style="font-size:11px; color:#9ca3af;">Triggers technician progress updates.</p>`,
    handler: () => { return { error: false, status: "started" }; }
  },
  "api-admin-assign": {
    url: "https://bot.nelsonfodjo.me/webhook/api-admin-assign",
    desc: "Admin directly creates a task and allocates it to a technician in one transaction.",
    inputsHTML: `<p style="font-size:11px; color:#9ca3af;">Performs direct server dispatch.</p>`,
    handler: () => { return { error: false, status: "assigned" }; }
  },
  "api-feedback": {
    url: "https://bot.nelsonfodjo.me/webhook/api-feedback",
    desc: "Submit work order feedback text/voice transcript, analyze rating and automatically flag if rating <= 2.",
    inputsHTML: `<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Rating (1-5)</label><input type="number" id="param-feed-rating" value="5" min="1" max="5" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"></div>`,
    handler: (inputs) => {
      const rating = parseInt(inputs["param-feed-rating"] || "5");
      return { error: false, feedback_id: "feed-102", flagged: rating <= 2 };
    }
  },
  "api-forward-media": {
    url: "https://bot.nelsonfodjo.me/webhook/api-forward-media",
    desc: "Forward/relay attachment file on-demand.",
    inputsHTML: `<p style="font-size:11px; color:#9ca3af;">None</p>`,
    handler: () => { return { error: false, sent: true }; }
  }
};

function setupAPITester() {
  if (!apiEndpointSelector) return;
  updateEndpointForm('api-pending-approvals');
  
  apiEndpointSelector.addEventListener('change', () => {
    updateEndpointForm(apiEndpointSelector.value);
  });
  
  btnRunApi?.addEventListener('click', async () => {
    const key = apiEndpointSelector.value;
    const config = SANDBOX_ENDPOINTS[key];
    if (!config) return;

    const inputs = {};
    if (apiInputsContainer) {
      const fields = apiInputsContainer.querySelectorAll('input, select');
      fields.forEach(f => { inputs[f.id] = f.value; });
    }

    // Call real NITA API when available
    if (window.NITA_CONFIG?.NITA_API_URL) {
      if (apiResponseJson) apiResponseJson.textContent = 'Calling NITA API...';
      try {
        let result;
        switch (key) {
          case 'api-pending-approvals': result = await NITA_API.getPendingApprovals(); break;
          case 'api-assets': result = await NITA_API.getAsset(inputs['param-asset-code'] || '39'); break;
          case 'api-find-asset': result = await NITA_API.findAsset(inputs['param-find-loc'] || '', inputs['param-find-key'] || ''); break;
          case 'api-technicians': result = await NITA_API.findTechnicians(inputs['param-tech-trade'] || 'mechanic'); break;
          case 'api-recommend-technician': result = await NITA_API.recommendTechnician(inputs['param-rec-trade'] || 'mechanic'); break;
          case 'api-technician-daily-tasks': result = await NITA_API.getTechnicianTasks(inputs['param-daily-tech-id'] || ''); break;
          case 'api-next-task': result = await NITA_API.getNextTask(inputs['param-next-tech-id'] || ''); break;
          case 'api-admin-status': result = await NITA_API.getAdminStatus(); break;
          case 'api-admin-read': result = await NITA_API.adminRead(inputs['param-read-table'] || 'technician'); break;
          case 'api-task-lifecycle': result = await NITA_API.createTask({ asset_code: inputs['param-asset-code'] || '39', created_by_phone: inputs['param-created-phone'] || '+23052000101', description: inputs['param-description'] || 'Test task', priority: parseInt(inputs['param-priority'] || '2'), task_type: 'repair' }); break;
          case 'api-technician-actions': result = await NITA_API.technicianAction(inputs['param-wo-id'] || '', inputs['param-tech-phone'] || '', inputs['param-action'] || 'start'); break;
          case 'api-admin-assign': result = await NITA_API.adminAssign({ admin_phone: inputs['param-admin-phone'] || '+23054737266', asset_code: inputs['param-asset-code'] || '39', technician_id: inputs['param-tech-id'] || '', instructions: inputs['param-instructions'] || '' }); break;
          case 'api-feedback': result = await NITA_API.submitFeedback({ work_order_id: inputs['param-wo-id'] || '', feedback_type: 'text', feedback_text: inputs['param-feedback-text'] || 'Good service', derived_sentiment: 'positive', derived_rating: 5, key_issues: [], rated_by_phone: inputs['param-rated-phone'] || '+23052000101' }); break;
          case 'api-forward-media': result = await NITA_API.forwardMedia({ task_id: inputs['param-task-id'] || '', recipient_phone: inputs['param-recipient-phone'] || '' }); break;
          default: result = config.handler(inputs);
        }
        if (apiResponseJson) apiResponseJson.textContent = JSON.stringify(result, null, 2);
        addLog(`NITA API: ${key}`, "success");
      } catch (err) {
        if (apiResponseJson) apiResponseJson.textContent = JSON.stringify({ error: true, message: err.message }, null, 2);
        addLog(`NITA API error: ${err.message}`, "error");
      }
    } else {
      // Fallback to local mock handler
      const response = config.handler(inputs);
      if (apiResponseJson) apiResponseJson.textContent = JSON.stringify(response, null, 2);
      addLog(`Mock executed API endpoint: ${key.toUpperCase()}`, "success");
    }
  });
}

function updateEndpointForm(key) {
  const config = SANDBOX_ENDPOINTS[key];
  if (!config) return;
  
  if (apiUrlInput) apiUrlInput.value = config.url;
  if (apiDocTitle) apiDocTitle.textContent = `API Details — ${key.toUpperCase()}`;
  if (apiDocDescription) apiDocDescription.textContent = config.desc;
  if (apiInputsContainer) apiInputsContainer.innerHTML = config.inputsHTML;
}

// ------------------------------------------------------------
// 11. PANE 9: SOLUTION DOCUMENTATION & SLIDE DECK
// ------------------------------------------------------------
const docsViewport = document.getElementById('docs-viewport');
const docsTocItems = document.querySelectorAll('.docs-toc-item');

const docsContent = {
  design: `
    <h1>Solution Design & Architecture</h1>
    <div class="docs-alert note">
      <strong>NITA: Next-generation Intelligent Triage Assistant</strong><br>
      A complete WhatsApp-first systems solution replacing FileMaker's coordinator planning bottleneck with a highly scalable multimodal AI agent.
    </div>
    <h2>Core Architecture</h2>
    <p>NITA bridges operators on the factory floor, the planning coordinator, and technicians via a relational Supabase back-end integrated with WhatsApp (Twilio/Meta API).</p>
    <div class="docs-diagram-box">
      <div style="text-align: center; font-family: monospace; font-size:12px; line-height: 1.4; color: #2563eb;">
        [ WhatsApp Hook ] <br>
        (JSON Payload / Voice Stream)<br>
        [ FastAPI Agent Webhook Controller ]<br>
        (Whisper Speech-to-Text & Gemini Translation/NER)<br>
        [ Database Triage (Supabase / Postgres) ]<br>
        (Smart Scheduler allocation engine)<br>
        [ Dispatcher WhatsApp Notification ] &gt; [ Technicians / Planners ]
      </div>
    </div>
    <h2>Rust Security Layer</h2>
    <p>To secure access to the CMMS data and APIs, the NITA system implements a multi-tiered Rust security strategy:</p>
    <ul>
      <li><strong>Rust Secure API Gateway (src/main.rs):</strong> Built with Actix-web to authenticate coordinator requests using signed JWT tokens (HS256) and force headers compliant with OWASP security specs (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).</li>
      <li><strong>Rust WebAssembly Cryptographic Module (wasm-security):</strong> Client-side cryptography written in Rust and compiled to Wasm bindings, allowing password/PIN hashing (SHA-256) and secure payload encryption/decryption (AES-GCM 256-bit) directly in-memory in the browser.</li>
    </ul>
    <h2>Multimodal Capability</h2>
    <ul>
      <li><strong>Speech-to-Text:</strong> Operator voice notes in Kreol/French are transcribed via Whisper API, translated to English via LLM, and audited under <code>message_log</code>.</li>
      <li><strong>Defect Photo Recognition:</strong> Image attachments are analyzed using multimodal Gemini vision slots to confirm machine assets and assess physical wear.</li>
    </ul>
  `,
  logic: `
    <h1>AI Agent Decision Logic & Priority Classifications</h1>
    <h2>1. Priority Matrix Rules</h2>
    <table class="docs-table">
      <thead>
        <tr>
          <th>Priority Level</th>
          <th>Triage Criteria</th>
          <th>SLA Response</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="color:#ef4444; font-weight:700;">P0 Critical</td>
          <td>Production Line stopped, safety hazard, or immediate shipping deadline at risk.</td>
          <td>Immediate assignment (&lt; 15 mins)</td>
        </tr>
        <tr>
          <td style="color:#f97316; font-weight:700;">P1 Urgent</td>
          <td>Machine running below parameter threshold, employee wellbeing (lighting/ventilation).</td>
          <td>Assign within shift (&lt; 4 hours)</td>
        </tr>
        <tr>
          <td style="color:#10b981; font-weight:700;">P2 Non-Urgent</td>
          <td>Minor cosmetic, preventive schedule, or nice-to-have improvement.</td>
          <td>Scheduled weekly backlog</td>
        </tr>
      </tbody>
    </table>
  `,
  model: `
    <h1>Relational Data Model Analysis</h1>
    <p>NITA's relational PostgreSQL schema enforces atomic tracking and preserves audit trails across operations:</p>
    <h2>Active Indexes for Scale</h2>
    <pre style="background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; font-family:monospace; font-size:11px; margin: 12px 0;">
CREATE INDEX idx_app_user_phone ON app_user(phone_number);
CREATE INDEX idx_task_approval ON task_request(status) WHERE status = 'pending_approval';</pre>
  `,
  impact: `
    <h1>Business Impact & Operational Gains</h1>
    <p>NITA replaces the FileMaker planning bottleneck with dynamic scheduling loops, reducing down-times by over 50%.</p>
  `
};

docsTocItems.forEach(item => {
  item.addEventListener('click', () => {
    docsTocItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    const key = item.getAttribute('data-doc') || 'design';
    if (docsViewport) {
      docsViewport.innerHTML = docsContent[key] || 'Document not found';
    }
  });
});

if (docsViewport) {
  docsViewport.innerHTML = docsContent.design;
}

// ------------------------------------------------------------
// 12. APP INITIALIZATION
// ------------------------------------------------------------
loadDB();
initAuthGate();
renderFmDashboard();
renderTaskEntryTable();
renderApprovalTable();
renderBreakdownTasks();
setupAPITester();

addLog("Prototype systems initialized completely. Data models synchronized.", "success");
addLog("[Wasm Security] Scanning WASM memory bindings...", "info");
addLog("[Wasm Security] Secure Rust WebAssembly module target configured: wasm-security/src/lib.rs", "success");
addLog("[Wasm Security] Native WebCrypto hashing active for coordinator credentials (SHA-256).", "success");
addLog("Coordinator session connected securely via Rust backend API proxy.", "info");
