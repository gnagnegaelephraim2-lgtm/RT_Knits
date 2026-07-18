// ============================================================
// RT KNITS — NITA CMMS (Single Source of Truth)
// ============================================================

// ------------------------------------------------------------
// Utilities
// ------------------------------------------------------------
function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function generateId(prefix) {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return `${prefix}-${Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')}`;
}

async function sha256Hex(input) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeWhatsAppPhone(phone) {
  let clean = phone.replace(/[\s\-\(\)]/g, '');
  if (!clean.startsWith('+')) {
    if (clean.startsWith('230') && clean.length > 8) clean = '+' + clean;
    else if (clean.length === 8 && /^[5796]/.test(clean)) clean = '+230' + clean;
    else clean = '+' + clean;
  }
  return clean;
}

// ------------------------------------------------------------
// Lookup caches — keyed by DB column names
// ------------------------------------------------------------
const assetMap = new Map();    // asset_code -> asset
const assetIdMap = new Map();  // asset_id (UUID) -> asset
const deptMap = new Map();     // department_id -> department

function rebuildLookupCaches() {
  assetMap.clear(); assetIdMap.clear(); deptMap.clear();
  for (const a of assets) {
    assetMap.set(a.asset_code, a);
    if (a.asset_id) assetIdMap.set(a.asset_id, a);
  }
  for (const d of departments) deptMap.set(d.department_id, d);
}

// ------------------------------------------------------------
// Data — all loaded from Supabase on startup
// ------------------------------------------------------------
let departments = [];
let assets = [];
let technicians = [];
let taskRequests = [];
let workOrders = [];
let workOrderTechnicians = [];
let feedbacks = [];
let activeSession = null;
let selectedDeptId = '';
let selectedTaskId = null;
let activeBreakdownTab = 'all';

// ------------------------------------------------------------
// Supabase direct client
// ------------------------------------------------------------
async function fetchSupabase(table, method, body, query) {
  if (!window.NITA_CONFIG) return null;
  const url = `${window.NITA_CONFIG.SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const headers = { "apikey": window.NITA_CONFIG.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.NITA_CONFIG.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" };
  if (method === 'POST') headers["Prefer"] = "return=representation";
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Supabase ${method} ${table}: ${await res.text()}`);
  if (method === 'DELETE' || res.status === 204) return null;
  return res.json();
}

// ------------------------------------------------------------
// NITA API Client
// ------------------------------------------------------------
const NITA_API = {
  base() { return (window.NITA_CONFIG?.NITA_API_URL || 'https://bot.nelsonfodjo.me/webhook').replace(/\/$/, ''); },
  async get(path, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${this.base()}${path}${qs ? '?' + qs : ''}`);
    if (!res.ok) throw new Error(`NITA API ${path}: ${res.status}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`${this.base()}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`NITA API ${path}: ${res.status}`);
    return res.json();
  },
  getAsset(code) { return this.get('/api-assets', { code }); },
  findAsset(location, keyword) { return this.get('/api-find-asset', { location, keyword }); },
  findTechnicians(trade) { return this.get('/api-technicians', { trade }); },
  recommendTechnician(trade) { return this.get('/api-recommend-technician', { trade }); },
  createTask(p) { return this.post('/api-task-lifecycle', { action: 'create', ...p }); },
  approveTask(p) { return this.post('/api-task-lifecycle', { action: 'approve', ...p }); },
  rejectTask(p) { return this.post('/api-task-lifecycle', { action: 'reject', ...p }); },
  technicianAction(wo_id, phone, action) { return this.post('/api-technician-actions', { work_order_id: wo_id, technician_phone: phone, action }); },
  getTechnicianTasks(id) { return this.get('/api-technician-daily-tasks', { technician_id: id }); },
  getNextTask(id) { return this.get('/api-next-task', { technician_id: id }); },
  adminAssign(p) { return this.post('/api-admin-assign', p); },
  getPendingApprovals() { return this.get('/api-pending-approvals'); },
  getAdminStatus() { return this.get('/api-admin-status'); },
  adminRead(table, filterField, filterValue, limit) {
    const params = { table, limit: String(limit || 50) };
    if (filterField) params.filter_field = filterField;
    if (filterValue) params.filter_value = filterValue;
    return this.get('/api-admin-read', params);
  },
  submitFeedback(p) { return this.post('/api-feedback', p); },
  forwardMedia(p) { return this.post('/api-forward-media', p); }
};

// ------------------------------------------------------------
// Sync data from Supabase — preserves DB column names exactly
// ------------------------------------------------------------
async function syncWithSupabase() {
  if (!window.NITA_CONFIG?.USE_REAL_SUPABASE) return;
  try {
    const [tasks, orders, assignments, dbDepts, dbAssets, dbTechs] = await Promise.allSettled([
      fetchSupabase('task_request', 'GET', null, 'select=*'),
      fetchSupabase('work_order', 'GET', null, 'select=*'),
      fetchSupabase('work_order_technician', 'GET', null, 'select=*'),
      fetchSupabase('department', 'GET', null, 'select=*'),
      fetchSupabase('asset', 'GET', null, 'select=*'),
      fetchSupabase('technician', 'GET', null, 'select=*')
    ]);
    if (tasks.status === 'fulfilled' && tasks.value) taskRequests = tasks.value;
    if (orders.status === 'fulfilled' && orders.value) workOrders = orders.value;
    if (assignments.status === 'fulfilled' && assignments.value) workOrderTechnicians = assignments.value;
    if (dbDepts.status === 'fulfilled' && dbDepts.value) departments = dbDepts.value.map(d => ({ department_id: d.department_id, name: d.name }));
    if (dbAssets.status === 'fulfilled' && dbAssets.value) assets = dbAssets.value.map(a => ({ asset_id: a.asset_id, asset_code: a.asset_code, name: a.name, status: a.status, location: a.location, required_trade: a.required_trade || 'general' }));
    if (dbTechs.status === 'fulfilled' && dbTechs.value) technicians = dbTechs.value.map(t => ({ technician_id: t.technician_id, user_id: t.user_id, full_name: t.full_name, trade: t.trade, active: t.active, workload: t.workload || 0 }));
    rebuildLookupCaches();
    if (!selectedDeptId && departments.length > 0) selectedDeptId = departments[0].department_id;
    populateSignupDepartments(true);
    renderFmDashboard(); renderTaskEntryTable(); renderApprovalTable(); renderBreakdownTasks(); renderTechnicianDailyJobs();
  } catch (err) { addLog(`Sync failed: ${err.message || err}`, 'error'); }
}

function loadDB() {
  if (window.NITA_CONFIG?.USE_REAL_SUPABASE) { syncWithSupabase(); return; }
  const r = localStorage.getItem("nita_task_requests");
  const o = localStorage.getItem("nita_work_orders");
  const t = localStorage.getItem("nita_work_order_techs");
  const f = localStorage.getItem("nita_feedbacks");
  if (r && o && t) { taskRequests = JSON.parse(r); workOrders = JSON.parse(o); workOrderTechnicians = JSON.parse(t); if (f) feedbacks = JSON.parse(f); }
  else saveDB();
}

function saveDB() {
  if (window.NITA_CONFIG?.USE_REAL_SUPABASE) return;
  localStorage.setItem("nita_task_requests", JSON.stringify(taskRequests));
  localStorage.setItem("nita_work_orders", JSON.stringify(workOrders));
  localStorage.setItem("nita_work_order_techs", JSON.stringify(workOrderTechnicians));
  localStorage.setItem("nita_feedbacks", JSON.stringify(feedbacks));
}

// ============================================================
// 1. AUTH
// ============================================================
function showAuthOverlay(show) {
  const o = document.getElementById('auth-overlay');
  if (o) { if (show) o.classList.remove('hidden'); else o.classList.add('hidden'); }
}

function switchAuthTab(tab) {
  const tl = document.getElementById('tab-login'), ts = document.getElementById('tab-signup');
  const pl = document.getElementById('form-login-pane'), ps = document.getElementById('form-signup-pane');
  if (!tl || !ts || !pl || !ps) return;
  if (tab === 'login') { tl.classList.add('active'); ts.classList.remove('active'); pl.classList.add('active'); ps.classList.remove('active'); }
  else { tl.classList.remove('active'); ts.classList.add('active'); pl.classList.remove('active'); ps.classList.add('active'); populateSignupDepartments(); }
}
window.switchAuthTab = switchAuthTab;

function toggleSignupFields() {
  const r = document.getElementById('auth-signup-role'), t = document.getElementById('signup-trade-field');
  if (r && t) t.style.display = r.value === 'technician' ? 'block' : 'none';
}
window.toggleSignupFields = toggleSignupFields;

function populateSignupDepartments(force) {
  const s = document.getElementById('auth-signup-dept');
  if (!s) return;
  if (!force && s.children.length > 1) return;
  s.innerHTML = '<option value="">Select Department</option>';
  departments.forEach(d => { const o = document.createElement('option'); o.value = d.department_id; o.textContent = d.name; s.appendChild(o); });
}

function applyRolePermissions(session) {
  document.getElementById('current-user-name').textContent = session.name;
  document.getElementById('current-user-role').textContent = session.role.toUpperCase();
  document.getElementById('current-user-avatar').textContent = session.name.split(' ').map(n => n[0]).join('');
  const items = ['menu-coordinator-dash','menu-planning-breakdown','menu-task-entry','menu-whatsapp-sim','menu-tasks-to-approve','menu-technician-tasks','menu-api','menu-database','menu-docs'].map(id => document.getElementById(id));
  items.forEach(el => { if (el) el.style.display = 'none'; });
  if (session.role === 'coordinator') {
    items.forEach(el => { if (el && el.id !== 'menu-technician-tasks') el.style.display = 'flex'; });
    navigateToPane('pane-dashboard');
  } else if (session.role === 'operator') {
    document.getElementById('menu-task-entry').style.display = 'flex';
    document.getElementById('menu-whatsapp-sim').style.display = 'flex';
    navigateToPane('pane-task-entry');
  } else if (session.role === 'technician') {
    document.getElementById('menu-technician-tasks').style.display = 'flex';
    navigateToPane('pane-technician-tasks');
    renderTechnicianDailyJobs();
  }
}

function initAuthGate() {
  const saved = localStorage.getItem("nita_active_session");
  if (saved) { activeSession = JSON.parse(saved); applyRolePermissions(activeSession); }
  else showAuthOverlay(true);

  // LOGIN
  document.getElementById('btn-login-submit')?.addEventListener('click', async () => {
    const rawPhone = document.getElementById('auth-phone').value.trim();
    const pinInput = document.getElementById('auth-pin').value.trim();
    if (!rawPhone || !pinInput) { alert("Please enter phone number and PIN."); return; }
    const phone = normalizeWhatsAppPhone(rawPhone);
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) { alert("Invalid WhatsApp number. Use E.164 format (e.g. +23058589024)."); return; }
    const pinHash = await sha256Hex(pinInput);
    let matchedUser = null;

    // Step 1: NITA API lookup
    try {
      const result = await NITA_API.adminRead('app_user', 'phone_number', phone, 1);
      if (!result.error && result.rows?.length > 0) {
        const user = result.rows[0];
        if (user.pin_hash && user.pin_hash !== pinHash) { alert("Incorrect PIN. Please try again."); return; }
        const role = user.role === 'admin' ? 'coordinator' : user.role;
        matchedUser = { name: user.full_name, phone, role, user_id: user.user_id };
      }
    } catch {}

    // Step 2: Local fallback
    if (!matchedUser) {
      const custom = JSON.parse(localStorage.getItem("nita_custom_users") || "{}")[phone];
      if (custom && custom.pinHash === pinHash) matchedUser = { name: custom.name, phone, role: custom.role, user_id: generateId('user') };
    }

    if (matchedUser) {
      activeSession = matchedUser;
      localStorage.setItem("nita_active_session", JSON.stringify(matchedUser));
      applyRolePermissions(matchedUser);
      showAuthOverlay(false);
      addLog(`Welcome, ${matchedUser.name}!`, 'success');
    } else {
      alert("No account found with this phone number. Please sign up first.");
    }
  });

  // SIGNUP
  document.getElementById('btn-signup-submit')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('auth-signup-name').value.trim();
    const rawPhone = document.getElementById('auth-signup-phone').value.trim();
    const roleInput = document.getElementById('auth-signup-role').value;
    const deptInput = document.getElementById('auth-signup-dept').value;
    const tradeInput = document.getElementById('auth-signup-trade').value;
    const pinInput = document.getElementById('auth-signup-pin').value.trim();
    if (!nameInput || !rawPhone || !pinInput) { alert("All fields are required."); return; }
    const phone = normalizeWhatsAppPhone(rawPhone);
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) { alert("Invalid WhatsApp number. Use E.164 format."); return; }
    if (!/^\d{4,6}$/.test(pinInput)) { alert("PIN must be 4-6 digits."); return; }
    const pinHash = await sha256Hex(pinInput);

    // Check duplicate
    try {
      const existing = await NITA_API.adminRead('app_user', 'phone_number', phone, 1);
      if (!existing.error && existing.rows?.length > 0) { alert(`Account with ${phone} already exists. Please sign in.`); return; }
    } catch {}

    // Write to Supabase
    let signupSuccess = false;
    try {
      const userId = generateId('user');
      const newUser = { user_id: userId, full_name: nameInput, role: roleInput, phone_number: phone, pin_hash: pinHash, whatsapp_verified: true };
      if (deptInput) newUser.department_id = deptInput;
      await fetchSupabase('app_user', 'POST', newUser);
      if (roleInput === 'technician') {
        await fetchSupabase('technician', 'POST', { technician_id: generateId('tech'), user_id: userId, full_name: nameInput, trade: tradeInput, active: true });
      }
      signupSuccess = true;
    } catch (err) {
      let localUsers = JSON.parse(localStorage.getItem("nita_custom_users") || "{}");
      if (localUsers[phone]) { alert(`Account with ${phone} already exists.`); return; }
      localUsers[phone] = { name: nameInput, pinHash, role: roleInput, dept: deptInput, trade: roleInput === 'technician' ? tradeInput : null };
      localStorage.setItem("nita_custom_users", JSON.stringify(localUsers));
      signupSuccess = true;
    }

    if (signupSuccess) {
      const user = { name: nameInput, phone, role: roleInput, user_id: generateId('user') };
      activeSession = user;
      localStorage.setItem("nita_active_session", JSON.stringify(user));
      applyRolePermissions(user);
      showAuthOverlay(false);
      addLog(`Account created. Welcome, ${nameInput}!`, 'success');
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    activeSession = null;
    localStorage.removeItem("nita_active_session");
    showAuthOverlay(true);
    addLog("Session cleared.", 'info');
  });
}

window.selectPresetUser = function(name, phone, pin) {
  switchAuthTab('login');
  document.getElementById('auth-phone').value = phone;
  document.getElementById('auth-pin').value = pin;
};

// ============================================================
// 2. VIEW PANEL ROUTING
// ============================================================
function navigateToPane(paneId) {
  const item = document.querySelector(`.sidebar .menu-item[data-target="${paneId}"]`);
  if (item) { item.click(); return; }
  document.querySelectorAll('.content-pane').forEach(p => { p.classList.remove('active'); if (p.id === paneId) p.classList.add('active'); });
}
window.navigateToPane = navigateToPane;

document.querySelectorAll('.sidebar .menu-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.sidebar .menu-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const target = item.getAttribute('data-target');
    document.querySelectorAll('.content-pane').forEach(p => { p.classList.remove('active'); if (p.id === target) p.classList.add('active'); });
    const label = item.querySelector('span');
    const viewTitle = document.getElementById('view-title');
    if (label && viewTitle) viewTitle.textContent = label.textContent;
    if (target === 'pane-planning-breakdown') renderBreakdownTasks();
    else if (target === 'pane-tasks-to-approve') renderApprovalTable();
  });
});

// ============================================================
// 3. COORDINATOR DASHBOARD
// ============================================================
function renderFmDashboard() {
  if (!selectedDeptId && departments.length > 0) selectedDeptId = departments[0].department_id;
  const pending = taskRequests.filter(t => t.status === 'pending_approval').length;
  const badge = document.getElementById('fm-badge-approval');
  if (badge) badge.textContent = pending.toString();
  const table = document.getElementById('fm-dept-dashboard-table');
  if (table) {
    table.innerHTML = '';
    departments.forEach(d => {
      const tr = document.createElement('tr');
      if (d.department_id === selectedDeptId) tr.classList.add('active');
      tr.innerHTML = `<td>${esc(d.name)}</td>`;
      tr.addEventListener('click', () => { selectedDeptId = d.department_id; renderFmDashboard(); });
      table.appendChild(tr);
    });
  }
  const cur = deptMap.get(selectedDeptId);
  if (cur) {
    const n = document.getElementById('fm-detail-dept-name');
    const t = document.getElementById('rt-department-title');
    if (n) n.textContent = cur.name;
    if (t) t.textContent = cur.name;
  }
}

function resetAllWorkOrders() {
  if (!confirm("Reset all dispatched work order assignments?")) return;
  if (window.NITA_CONFIG?.USE_REAL_SUPABASE) {
    fetchSupabase('work_order_technician', 'DELETE', null, 'status=eq.assigned')
      .then(() => fetchSupabase('work_order', 'DELETE', null, 'status=eq.pending'))
      .then(() => syncWithSupabase())
      .catch(err => addLog(`Reset failed: ${err.message}`, 'error'));
  } else {
    workOrders = []; workOrderTechnicians = [];
    taskRequests.forEach(t => { if (t.status !== 'pending_approval' && t.status !== 'rejected') t.status = 'pending_approval'; });
    saveDB(); renderFmDashboard(); renderBreakdownTasks(); renderApprovalTable();
  }
  addLog("Reset all work orders.", 'warn');
}
window.resetAllWorkOrders = resetAllWorkOrders;

// ============================================================
// 4. TASK ENTRY
// ============================================================
function renderTaskEntryTable() {
  const body = document.getElementById('te-task-list-body');
  if (!body) return;
  body.innerHTML = '';
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
    tr.innerHTML = `
      <td>${esc(task.asset_id)}</td>
      <td style="font-weight:600;">${esc(assetName)}</td>
      <td>${esc(task.task_type)}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(task.description)}</td>
      <td>${task.priority === 0 ? 'Urgent' : 'Normal'}</td>
      <td>${priLabel}</td>
      <td>${new Date(task.requested_at).toLocaleDateString()}</td>
      <td><span class="circular-select-icon"></span></td>`;
    tr.addEventListener('click', () => { selectedTaskId = task.task_request_id; loadTaskToForm(task); renderTaskEntryTable(); });
    body.appendChild(tr);
  });
}

function loadTaskToForm(task) {
  const asset = assetIdMap.get(task.asset_id);
  const code = document.getElementById('te-asset-code');
  const name = document.getElementById('te-asset-name');
  const type = document.getElementById('te-asset-type');
  const serial = document.getElementById('te-asset-serial');
  const dept = document.getElementById('te-asset-dept');
  const loc = document.getElementById('te-asset-loc');
  const urg = document.getElementById('te-urgency');
  const desc = document.getElementById('te-description');
  const loc2 = document.getElementById('te-location');
  if (code) code.value = asset ? asset.asset_code : task.asset_id;
  if (name) name.value = asset ? asset.name : '';
  if (type) type.value = asset ? asset.required_trade : '';
  if (serial) serial.value = asset ? asset.asset_code : '';
  if (dept) dept.value = '';
  if (loc) loc.value = asset ? asset.location : '';
  if (urg) urg.value = task.priority.toString();
  if (desc) desc.value = task.description;
  if (loc2) loc2.value = asset ? asset.location : '';
}

function teSearchAsset() {
  const codeInput = document.getElementById('te-asset-code').value.trim();
  const asset = assetMap.get(codeInput);
  if (!asset) { alert("Asset code not recognized!"); return; }
  const name = document.getElementById('te-asset-name');
  const type = document.getElementById('te-asset-type');
  const serial = document.getElementById('te-asset-serial');
  const dept = document.getElementById('te-asset-dept');
  const loc = document.getElementById('te-asset-loc');
  if (name) name.value = asset.name;
  if (type) type.value = asset.required_trade;
  if (serial) serial.value = asset.asset_code;
  if (dept) dept.value = '';
  if (loc) loc.value = asset.location;
  addLog(`Asset ${codeInput} resolved.`, 'success');
}
window.teSearchAsset = teSearchAsset;

function teNewForm() {
  selectedTaskId = null;
  ['te-asset-code','te-asset-name','te-asset-type','te-asset-serial','te-asset-dept','te-asset-loc','te-description','te-location'].forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });
  renderTaskEntryTable();
}
window.teNewForm = teNewForm;

function teConfirmForm() {
  const code = document.getElementById('te-asset-code').value;
  const desc = document.getElementById('te-description').value;
  const priority = parseInt(document.getElementById('te-urgency').value);
  if (!code || !desc) { alert("Fill in asset code and description."); return; }

  if (selectedTaskId) {
    if (window.NITA_CONFIG?.USE_REAL_SUPABASE) {
      fetchSupabase('task_request', 'PATCH', { asset_id: code, description: desc, priority }, `task_request_id=eq.${selectedTaskId}`)
        .then(() => syncWithSupabase()).catch(err => addLog(`Update failed: ${err.message}`, 'error'));
    } else {
      const t = taskRequests.find(x => x.task_request_id === selectedTaskId);
      if (t) { t.asset_id = code; t.description = desc; t.priority = priority; }
      saveDB(); renderTaskEntryTable(); renderFmDashboard();
    }
    addLog(`Updated task ${selectedTaskId}.`, 'success');
  } else {
    if (window.NITA_CONFIG?.USE_REAL_SUPABASE) {
      NITA_API.createTask({ asset_code: code, created_by_phone: activeSession?.phone || '', description: desc, priority, task_type: priority === 0 ? 'emergency' : 'repair' })
        .then(r => { if (r.error) addLog(`Create failed: ${r.message}`, 'error'); else addLog(`Task created: ${r.task_request_id}`, 'success'); syncWithSupabase(); })
        .catch(err => addLog(`Create failed: ${err.message}`, 'error'));
    } else {
      const newId = generateId('task-entry');
      taskRequests.unshift({ task_request_id: newId, asset_id: code, created_by_user_id: activeSession?.name || "Operator", status: "pending_approval", priority, requested_at: new Date().toISOString(), description: desc, task_type: "repair", approved_by_user_id: null, approved_at: null, rejection_reason: null, media_urls: [] });
      selectedTaskId = newId;
      saveDB(); renderTaskEntryTable(); renderFmDashboard();
    }
    addLog("New task logged.", 'success');
  }
}
window.teConfirmForm = teConfirmForm;

function teDeleteForm() {
  if (!selectedTaskId) return;
  if (!confirm("Confirm removal?")) return;
  if (window.NITA_CONFIG?.USE_REAL_SUPABASE) {
    fetchSupabase('task_request', 'PATCH', { status: 'deleted' }, `task_request_id=eq.${selectedTaskId}`)
      .then(() => syncWithSupabase()).catch(err => addLog(`Delete failed: ${err.message}`, 'error'));
  } else {
    const t = taskRequests.find(x => x.task_request_id === selectedTaskId);
    if (t) t.status = 'deleted';
    saveDB(); renderTaskEntryTable(); renderFmDashboard();
  }
  addLog(`Task ${selectedTaskId} deleted.`, 'warn');
}
window.teDeleteForm = teDeleteForm;

// ============================================================
// 5. PLANNING BREAKDOWN
// ============================================================
function setBreakdownTab(tab) {
  activeBreakdownTab = tab;
  document.querySelectorAll('.fm-subtabs-row .subtab-btn').forEach(b => {
    b.classList.remove('active');
    if (b.textContent?.toLowerCase().includes(tab)) b.classList.add('active');
  });
  renderBreakdownTasks();
}
window.setBreakdownTab = setBreakdownTab;

function renderBreakdownTasks() {
  const body = document.getElementById('pb-breakdown-table-body');
  if (!body) return;
  body.innerHTML = '';
  const techSel = document.getElementById('pb-tech-select');
  if (techSel && techSel.children.length === 0) {
    technicians.forEach(t => { const o = document.createElement('option'); o.value = t.technician_id; o.textContent = `${t.full_name} (${t.trade})`; techSel.appendChild(o); });
  }
  let filtered = taskRequests;
  if (activeBreakdownTab === 'leakage') filtered = taskRequests.filter(t => { const d = t.description.toLowerCase(); return d.includes("leak") || d.includes("water"); });
  else if (activeBreakdownTab === 'repairs') filtered = taskRequests.filter(t => t.status === 'pending_approval' && !t.description.toLowerCase().includes("leak"));
  else if (activeBreakdownTab === 'pending') filtered = taskRequests.filter(t => t.status === 'approved');
  else if (activeBreakdownTab === 'approved') filtered = taskRequests.filter(t => t.status === 'in_progress' || t.status === 'completed');
  const searchVal = document.getElementById('pb-search-description')?.value.toLowerCase();
  if (searchVal) filtered = filtered.filter(t => t.description.toLowerCase().includes(searchVal));
  const badge = document.getElementById('breakdown-pending-count');
  if (badge) badge.textContent = filtered.length.toString();
  filtered.forEach(task => {
    const tr = document.createElement('tr');
    const dateStr = new Date(task.requested_at).toLocaleDateString();
    const timeStr = new Date(task.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const asset = assetIdMap.get(task.asset_id);
    const eid = esc(task.task_request_id);
    tr.innerHTML = `
      <td>${eid}</td><td>${dateStr}</td><td>${timeStr}</td>
      <td>${esc(asset ? asset.name : 'Unknown')}</td>
      <td>${esc(task.created_by_user_id)}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(task.description)}</td>
      <td>None</td>
      <td>
        <label style="font-size:11px;display:inline-flex;align-items:center;gap:4px;margin-right:8px;"><input type="radio" name="plan-type-${eid}" ${task.status !== 'pending_approval' ? 'checked' : ''} disabled> Planned</label>
        <label style="font-size:11px;display:inline-flex;align-items:center;gap:4px;"><input type="radio" name="plan-type-${eid}" ${task.priority === 0 ? 'checked' : ''} disabled> Immediate</label>
      </td>
      <td><button class="planner-btn" style="background:#ef4444;color:#fff;padding:2px 8px;font-size:11px;" onclick="pbTrashTask('${eid}')">Trash</button></td>`;
    body.appendChild(tr);
  });
}

function pbTrashTask(id) {
  if (!confirm("Trash this task?")) return;
  if (window.NITA_CONFIG?.USE_REAL_SUPABASE) {
    fetchSupabase('task_request', 'PATCH', { status: 'deleted' }, `task_request_id=eq.${id}`)
      .then(() => syncWithSupabase()).catch(err => addLog(`Trash failed: ${err.message}`, 'error'));
  } else {
    const t = taskRequests.find(x => x.task_request_id === id);
    if (t) t.status = 'deleted';
    saveDB(); renderBreakdownTasks(); renderTaskEntryTable(); renderFmDashboard();
  }
  addLog(`Trashed task ${id}.`, 'warn');
}
window.pbTrashTask = pbTrashTask;

document.getElementById('pb-search-description')?.addEventListener('input', () => renderBreakdownTasks());

document.getElementById('btn-pb-dispatch-engineer')?.addEventListener('click', () => {
  const techId = document.getElementById('pb-tech-select')?.value;
  const start = document.getElementById('pb-start-date')?.value;
  let targetTask = taskRequests.find(t => t.status === 'pending_approval');
  if (activeBreakdownTab === 'leakage') targetTask = taskRequests.find(t => t.status === 'pending_approval' && t.description.toLowerCase().includes("leak"));
  if (!targetTask) { alert("No pending tasks to assign!"); return; }
  const tech = technicians.find(t => t.technician_id === techId);

  if (window.NITA_CONFIG?.USE_REAL_SUPABASE) {
    NITA_API.approveTask({
      task_id: targetTask.task_request_id, approved_by_phone: activeSession?.phone || '', technician_id: techId, recommended_technician_id: techId, recommendation_reason: `Assigned by coordinator on ${start}`
    }).then(r => { if (!r.error) addLog(`Dispatched. WO: ${r.work_order_id}`, 'success'); else addLog(`Failed: ${r.message}`, 'error'); syncWithSupabase(); })
      .catch(err => addLog(`Failed: ${err.message}`, 'error'));
  } else {
    targetTask.status = 'approved';
    const woId = generateId('wo');
    workOrders.push({ work_order_id: woId, task_request_id: targetTask.task_request_id, status: 'pending', priority: targetTask.priority, scheduled_start: start + "T08:00:00.000Z", created_at: new Date().toISOString(), completed_at: null });
    if (tech) { tech.workload = (tech.workload || 0) + 1; workOrderTechnicians.push({ work_order_id: woId, technician_id: techId, assigned_at: new Date().toISOString(), status: 'assigned' }); }
    saveDB(); renderFmDashboard(); renderBreakdownTasks();
  }
  alert(`Dispatched! Work order for ${tech ? tech.full_name : 'Engineer'}.`);
});

// ============================================================
// 6. TASKS TO BE APPROVED
// ============================================================
function renderApprovalTable() {
  const body = document.getElementById('approve-table-body');
  if (!body) return;
  body.innerHTML = '';
  const pending = taskRequests.filter(t => t.status === 'pending_approval');
  const badge = document.getElementById('approve-count-badge');
  if (badge) badge.textContent = pending.length.toString();
  if (pending.length === 0) { body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#6b7280;">No pending tasks.</td></tr>`; return; }
  pending.forEach(task => {
    const tr = document.createElement('tr');
    const eid = esc(task.task_request_id);
    tr.innerHTML = `
      <td style="font-family:monospace;font-weight:700;">${eid}</td>
      <td><div style="font-weight:700;">${esc(task.created_by_role || 'operator')}</div><div style="font-size:11px;color:#4b5563;">${esc(task.created_by_user_id)}</div></td>
      <td>${new Date(task.requested_at).toLocaleDateString()}</td>
      <td style="max-width:300px;line-height:1.4;">${esc(task.description)}</td>
      <td>${new Date(task.requested_at).toLocaleDateString()}</td>
      <td>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:11px;color:#dc2626;font-weight:700;display:inline-flex;align-items:center;gap:4px;cursor:pointer;"><input type="radio" name="approval-${eid}" value="approve" onclick="dispatchDirectApproval('${eid}','approve')"> Approved</label>
          <label style="font-size:11px;color:#374151;font-weight:700;display:inline-flex;align-items:center;gap:4px;cursor:pointer;"><input type="radio" name="approval-${eid}" value="reject" onclick="dispatchDirectApproval('${eid}','reject')"> Not Approved</label>
        </div>
      </td>
      <td><button class="planner-btn" style="background:#f1f5f9;border:1px solid #71717a;color:#000;font-size:11px;font-weight:700;" onclick="approveTaskImmediate('${eid}')">Engineer ➔</button></td>`;
    body.appendChild(tr);
  });
}

function dispatchDirectApproval(id, action) {
  const task = taskRequests.find(t => t.task_request_id === id);
  if (!task) return;
  if (window.NITA_CONFIG?.USE_REAL_SUPABASE) {
    if (action === 'approve') {
      NITA_API.approveTask({ task_id: id, approved_by_phone: activeSession?.phone || '', technician_id: '', recommendation_reason: 'Auto-dispatched from dashboard' })
        .then(r => { if (!r.error) addLog(`Approved: ${r.work_order_id}`, 'success'); else addLog(`Failed: ${r.message}`, 'error'); syncWithSupabase(); })
        .catch(err => addLog(`Failed: ${err.message}`, 'error'));
    } else {
      NITA_API.rejectTask({ task_id: id, approved_by_phone: activeSession?.phone || '', reason: 'Rejected from dashboard' })
        .then(r => { if (!r.error) addLog(`Rejected task ${id}`, 'success'); else addLog(`Failed: ${r.message}`, 'error'); syncWithSupabase(); })
        .catch(err => addLog(`Failed: ${err.message}`, 'error'));
    }
  } else {
    if (action === 'approve') {
      task.status = 'approved'; task.approved_at = new Date().toISOString();
      workOrders.push({ work_order_id: generateId('wo'), task_request_id: id, status: 'pending', priority: task.priority, scheduled_start: new Date().toISOString(), created_at: new Date().toISOString(), completed_at: null });
    } else { task.status = 'rejected'; task.rejection_reason = 'Rejected from dashboard'; }
    saveDB(); renderApprovalTable(); renderFmDashboard(); renderBreakdownTasks();
  }
  addLog(`Task ${id}: ${action.toUpperCase()}`, 'success');
}
window.dispatchDirectApproval = dispatchDirectApproval;

function approveTaskImmediate(id) {
  const task = taskRequests.find(t => t.task_request_id === id);
  if (!task) return;
  if (window.NITA_CONFIG?.USE_REAL_SUPABASE) {
    NITA_API.approveTask({ task_id: id, approved_by_phone: activeSession?.phone || '', technician_id: '', recommendation_reason: 'Immediate dispatch' })
      .then(r => { if (!r.error) addLog(`Dispatched: ${r.work_order_id}`, 'success'); else addLog(`Failed: ${r.message}`, 'error'); syncWithSupabase(); })
      .catch(err => addLog(`Failed: ${err.message}`, 'error'));
  } else {
    if (task.status === 'pending_approval') {
      task.status = 'approved'; task.approved_at = new Date().toISOString();
      const woId = generateId('wo');
      workOrders.push({ work_order_id: woId, task_request_id: id, status: 'pending', priority: task.priority, scheduled_start: new Date().toISOString(), created_at: new Date().toISOString(), completed_at: null });
      const best = technicians.filter(t => t.active && t.trade === 'mechanic').sort((a, b) => (a.workload || 0) - (b.workload || 0))[0];
      if (best) { best.workload = (best.workload || 0) + 1; workOrderTechnicians.push({ work_order_id: woId, technician_id: best.technician_id, assigned_at: new Date().toISOString(), status: 'assigned' }); }
    }
    saveDB(); renderApprovalTable(); renderFmDashboard(); renderBreakdownTasks();
  }
}
window.approveTaskImmediate = approveTaskImmediate;

// ============================================================
// 7. TECHNICIAN DAILY DASHBOARD
// ============================================================
function renderTechnicianDailyJobs() {
  const body = document.getElementById('tech-jobs-table-body');
  if (!body || !activeSession) return;
  body.innerHTML = '';
  const tech = technicians.find(t => t.full_name === activeSession?.name);
  if (!tech) return;
  const assignments = workOrderTechnicians.filter(wt => wt.technician_id === tech.technician_id);
  if (assignments.length === 0) { body.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:10px;">No active job assignments.</td></tr>`; return; }
  assignments.forEach(assign => {
    const wo = workOrders.find(w => w.work_order_id === assign.work_order_id);
    if (!wo) return;
    const task = taskRequests.find(t => t.task_request_id === wo.task_request_id);
    if (!task) return;
    const asset = assetIdMap.get(task.asset_id);
    const assetDisplay = asset ? asset.name : task.asset_id.substring(0, 8) + '...';
    let buttons = '';
    if (wo.status === 'pending') buttons = `<button class="planner-btn primary" style="font-size:11px;padding:4px 8px;margin-right:6px;" onclick="techUpdateJob('${wo.work_order_id}','start')">Start</button><button class="planner-btn" style="background:#ef4444;font-size:11px;padding:4px 8px;color:#fff;" onclick="techUpdateJob('${wo.work_order_id}','decline')">Decline</button>`;
    else if (wo.status === 'in_progress') buttons = `<button class="planner-btn" style="background:#10b981;font-size:11px;padding:4px 8px;color:#fff;" onclick="techUpdateJob('${wo.work_order_id}','done')">Done</button>`;
    else buttons = `<span style="font-size:12px;color:#9ca3af;">Closed</span>`;
    const schedDate = wo.scheduled_start ? new Date(wo.scheduled_start).toLocaleDateString() : '—';
    const sColor = wo.status === 'completed' ? '#10b981' : wo.status === 'in_progress' ? '#f59e0b' : '#6b7280';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:monospace;font-weight:600;">${esc(wo.work_order_id)}</td>
      <td style="font-weight:600;color:#1d4ed8;">${esc(assetDisplay)}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(task.description)}</td>
      <td style="color:${task.priority === 0 ? '#ef4444' : '#10b981'};font-weight:700;">P${task.priority}</td>
      <td><span style="font-size:11px;padding:2px 8px;background:${sColor}20;color:${sColor};border:1px solid ${sColor}40;border-radius:4px;">${esc(wo.status)}</span></td>
      <td>${schedDate}</td>
      <td>${buttons}</td>`;
    body.appendChild(tr);
  });
}

function techUpdateJob(woId, action) {
  const wo = workOrders.find(w => w.work_order_id === woId);
  if (!wo) return;
  if (window.NITA_CONFIG?.USE_REAL_SUPABASE) {
    NITA_API.technicianAction(woId, activeSession?.phone || '', action)
      .then(r => { if (!r.error) addLog(`Tech ${action}: ${r.message}`, 'success'); else addLog(`Failed: ${r.message}`, 'error'); syncWithSupabase(); })
      .catch(err => addLog(`Failed: ${err.message}`, 'error'));
  } else {
    if (action === 'start') { wo.status = 'in_progress'; const t = taskRequests.find(x => x.task_request_id === wo.task_request_id); if (t) t.status = 'in_progress'; }
    else if (action === 'done') { wo.status = 'completed'; wo.completed_at = new Date().toISOString(); const t = taskRequests.find(x => x.task_request_id === wo.task_request_id); if (t) t.status = 'completed'; const tech = technicians.find(x => x.full_name === activeSession?.name); if (tech) tech.workload = Math.max(0, (tech.workload || 0) - 1); }
    else if (action === 'decline') { wo.status = 'pending'; const a = workOrderTechnicians.find(x => x.work_order_id === woId); if (a) a.status = 'declined'; }
    saveDB(); renderTechnicianDailyJobs(); renderFmDashboard(); renderBreakdownTasks(); renderApprovalTable();
  }
}
window.techUpdateJob = techUpdateJob;

// ============================================================
// 8. WHATSAPP SIMULATOR
// ============================================================
const initialConversations = [{ sender: 'ai', text: "Hello! Welcome to the RT Knits NITA Dispatch Bot. I help you coordinate maintenance requests instantly. What issue are you experiencing on the floor?", time: "08:00 AM" }];
const NITA_PHONE = window.NITA_CONFIG?.NITA_WHATSAPP || '+15551564344';

function renderChat() {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  el.innerHTML = '';
  initialConversations.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.sender === 'ai' ? 'incoming' : 'outgoing'}`;
    let html = '';
    if (msg.image) html += `<img class="chat-image" src="${esc(msg.image)}" alt="Attachment">`;
    html += `<div>${msg.text}</div><div class="time">${esc(msg.time)}</div>`;
    bubble.innerHTML = html;
    el.appendChild(bubble);
  });
  el.scrollTop = el.scrollHeight;
}

function addLog(text, type) {
  const el = document.getElementById('console-logs');
  if (!el) return;
  const line = document.createElement('div');
  line.className = `console-line ${type || 'info'}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function clearConsole() { const el = document.getElementById('console-logs'); if (el) el.innerHTML = '<div class="console-line info">[System] Log cleared.</div>'; }
window.clearConsole = clearConsole;

function loadScenario(preset) {
  const input = document.getElementById('chat-user-input');
  if (!input) return;
  if (preset === 'critical_leak') { input.value = "Mo pe tann enn gro gro bwi grinding lor knitting floor. Brother Circular Knitter line 3 inn arete net!"; addLog("[Preset] P0 Critical loaded.", "info"); }
  else if (preset === 'urgent_tension') { input.value = "Belt sliding on Gerber Z1. Machine still works but cutting poorly, need someone quickly."; addLog("[Preset] P1 Urgent loaded.", "info"); }
  else { input.value = "Office gate handle is loose. Can someone check it during daily rounds?"; addLog("[Preset] P2 Non-Urgent loaded.", "info"); }
}
window.loadScenario = loadScenario;

function processUserMessage(text) {
  if (!text.trim()) return;
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  initialConversations.push({ sender: 'user', text, time: nowStr });
  renderChat();
  const input = document.getElementById('chat-user-input');
  if (input) input.value = '';
  setTimeout(() => addLog(`Inbound WhatsApp webhook received from ${NITA_PHONE} (NITA Dispatcher).`, "info"), 400);
  let assetCode = "42", trade = "general", priority = 2, responseText = "";
  const lower = text.toLowerCase();
  if (lower.includes("knitt") || lower.includes("circular") || lower.includes("bwi")) { assetCode = "39"; trade = "mechanic"; priority = 0; responseText = "Detected **Circular Knitter (Asset 39)**. **P0 Critical**. Requesting mechanic dispatch."; }
  else if (lower.includes("gerber") || lower.includes("belt") || lower.includes("cut")) { assetCode = "175"; trade = "mechanic"; priority = 1; responseText = "Detected **Gerber Z1 (Asset 175)**. **P1 Urgent**. Recommending Mechanic."; }
  else { responseText = "Logged inspection request. **P2 Non-Urgent** task."; }
  setTimeout(() => addLog(`NER: Asset ${assetCode}, Priority P${priority}, Trade: ${trade}`, "success"), 1200);
  setTimeout(() => {
    addLog("Inserting task_request...", "success");
    if (window.NITA_CONFIG?.USE_REAL_SUPABASE) {
      NITA_API.createTask({ asset_code: assetCode, created_by_phone: activeSession?.phone || '', description: text, priority, task_type: priority === 0 ? 'emergency' : 'repair' })
        .then(r => { if (r.error) addLog(`Failed: ${r.message}`, 'error'); else addLog(`Created: ${r.task_request_id}`, 'success'); syncWithSupabase(); })
        .catch(err => addLog(`Failed: ${err.message}`, 'error'));
    } else {
      taskRequests.unshift({ task_request_id: generateId('task'), asset_id: assetCode, created_by_user_id: activeSession?.name || "Operator", status: "pending_approval", priority, requested_at: new Date().toISOString(), description: text, task_type: "repair", approved_by_user_id: null, approved_at: null, rejection_reason: null, media_urls: [] });
      saveDB(); renderFmDashboard(); renderTaskEntryTable(); renderApprovalTable();
    }
    const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    initialConversations.push({ sender: 'ai', text: responseText, time: aiTime });
    renderChat();
    addLog("AI response dispatched.", "success");
  }, 2000);
}

document.getElementById('btn-send-message')?.addEventListener('click', () => { const input = document.getElementById('chat-user-input'); if (input) processUserMessage(input.value); });
document.getElementById('chat-user-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') { const input = document.getElementById('chat-user-input'); if (input) processUserMessage(input.value); } });
renderChat();

// ============================================================
// 9. API SANDBOX
// ============================================================
function setupAPITester() {
  const sel = document.getElementById('api-endpoint-selector');
  if (!sel) return;
  sel.addEventListener('change', () => updateEndpointForm(sel.value));
  updateEndpointForm(sel.value);
  document.getElementById('btn-run-api')?.addEventListener('click', async () => {
    const key = sel.value;
    const response = document.getElementById('api-response-json');
    if (!window.NITA_CONFIG?.NITA_API_URL) { if (response) response.textContent = 'NITA_API_URL not configured.'; return; }
    if (response) response.textContent = 'Calling NITA API...';
    try {
      let result;
      const getVal = id => document.getElementById('api-inputs-container')?.querySelector(`#${id}`)?.value || '';
      switch (key) {
        case 'api-pending-approvals': result = await NITA_API.getPendingApprovals(); break;
        case 'api-assets': result = await NITA_API.getAsset(getVal('param-asset-code')); break;
        case 'api-find-asset': result = await NITA_API.findAsset(getVal('param-find-loc'), getVal('param-find-key')); break;
        case 'api-technicians': result = await NITA_API.findTechnicians(getVal('param-tech-trade')); break;
        case 'api-recommend-technician': result = await NITA_API.recommendTechnician(getVal('param-rec-trade')); break;
        case 'api-technician-daily-tasks': result = await NITA_API.getTechnicianTasks(getVal('param-daily-tech-id')); break;
        case 'api-next-task': result = await NITA_API.getNextTask(getVal('param-next-tech-id')); break;
        case 'api-admin-status': result = await NITA_API.getAdminStatus(); break;
        case 'api-admin-read': result = await NITA_API.adminRead(getVal('param-read-table')); break;
        default: result = { error: true, message: 'Select a valid endpoint' };
      }
      if (response) response.textContent = JSON.stringify(result, null, 2);
      addLog(`API: ${key}`, "success");
    } catch (err) { if (response) response.textContent = JSON.stringify({ error: true, message: err.message }, null, 2); addLog(`API error: ${err.message}`, "error"); }
  });
}

function updateEndpointForm(key) {
  const endpoints = {
    'api-pending-approvals': { url: '/api-pending-approvals', desc: 'Returns pending approval tasks.', inputs: '' },
    'api-assets': { url: '/api-assets?code=39', desc: 'Get asset details by code.', inputs: '<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Asset Code</label><input type="text" id="param-asset-code" value="39" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"></div>' },
    'api-find-asset': { url: '/api-find-asset', desc: 'Search assets by location/keyword.', inputs: '<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Location</label><input type="text" id="param-find-loc" value="Knitting" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"></div><div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Keyword</label><input type="text" id="param-find-key" value="Circular" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"></div>' },
    'api-technicians': { url: '/api-technicians', desc: 'Find technicians by trade.', inputs: '<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Trade</label><select id="param-tech-trade" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"><option value="mechanic">mechanic</option><option value="electrician">electrician</option><option value="welder">welder</option></select></div>' },
    'api-recommend-technician': { url: '/api-recommend-technician', desc: 'Get best technician recommendation.', inputs: '<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Trade</label><select id="param-rec-trade" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"><option value="mechanic">mechanic</option><option value="electrician">electrician</option></select></div>' },
    'api-technician-daily-tasks': { url: '/api-technician-daily-tasks', desc: 'Tech daily task queue.', inputs: '<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Technician ID</label><input type="text" id="param-daily-tech-id" value="" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"></div>' },
    'api-next-task': { url: '/api-next-task', desc: 'Next task for technician.', inputs: '<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Technician ID</label><input type="text" id="param-next-tech-id" value="" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"></div>' },
    'api-admin-status': { url: '/api-admin-status', desc: 'Dashboard metrics.', inputs: '' },
    'api-admin-read': { url: '/api-admin-read', desc: 'Generic table reader.', inputs: '<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;">Table</label><select id="param-read-table" style="width:100%;padding:6px;border:1px solid #71717a;border-radius:4px;margin-top:4px;"><option value="technician">technician</option><option value="department">department</option><option value="asset">asset</option><option value="app_user">app_user</option><option value="task_request">task_request</option></select></div>' },
    'api-task-lifecycle': { url: '/api-task-lifecycle', desc: 'Task lifecycle.', inputs: '<p style="font-size:11px;color:#9ca3af;">Use dashboard controls.</p>' },
    'api-technician-actions': { url: '/api-technician-actions', desc: 'Tech actions.', inputs: '<p style="font-size:11px;color:#9ca3af;">Use technician dashboard.</p>' },
    'api-admin-assign': { url: '/api-admin-assign', desc: 'Admin dispatch.', inputs: '<p style="font-size:11px;color:#9ca3af;">Use planning breakdown.</p>' },
    'api-feedback': { url: '/api-feedback', desc: 'Submit feedback.', inputs: '<p style="font-size:11px;color:#9ca3af;">Feedback submission.</p>' },
    'api-forward-media': { url: '/api-forward-media', desc: 'Forward media.', inputs: '<p style="font-size:11px;color:#9ca3af;">Media relay.</p>' }
  };
  const cfg = endpoints[key];
  if (!cfg) return;
  const urlInput = document.getElementById('api-url-input');
  const title = document.getElementById('api-doc-title');
  const desc = document.getElementById('api-doc-description');
  const inputsEl = document.getElementById('api-inputs-container');
  if (urlInput) urlInput.value = `https://bot.nelsonfodjo.me/webhook${cfg.url}`;
  if (title) title.textContent = `API — ${key}`;
  if (desc) desc.textContent = cfg.desc;
  if (inputsEl) inputsEl.innerHTML = cfg.inputs;
}

// ============================================================
// 10. DOCUMENTATION
// ============================================================
const docsContent = {
  design: '<h1>Solution Design & Architecture</h1><div class="docs-alert note"><strong>NITA: Next-generation Intelligent Triage Assistant</strong><br>A complete WhatsApp-first CMMS replacing FileMaker coordinator bottleneck.</div><h2>Core Architecture</h2><p>Operators → WhatsApp → NITA API (n8n) → Supabase → Technician notification.</p><h2>Security</h2><ul><li>Rust API Gateway: JWT auth, OWASP headers</li><li>WASM Crypto: SHA-256 PIN hashing, AES-GCM encryption</li></ul>',
  logic: '<h1>Priority Matrix</h1><table class="docs-table"><thead><tr><th>Level</th><th>Criteria</th><th>SLA</th></tr></thead><tbody><tr><td style="color:#ef4444;font-weight:700;">P0 Critical</td><td>Production line stopped</td><td>&lt; 15 mins</td></tr><tr><td style="color:#f97316;font-weight:700;">P1 Urgent</td><td>Machine below threshold</td><td>&lt; 4 hours</td></tr><tr><td style="color:#10b981;font-weight:700;">P2 Non-Urgent</td><td>Minor / preventive</td><td>Weekly backlog</td></tr></tbody></table>',
  model: '<h1>Data Model</h1><p>PostgreSQL via Supabase with RLS policies.</p><pre style="background:rgba(0,0,0,0.3);padding:10px;border-radius:6px;font-family:monospace;font-size:11px;">department → app_user → technician<br>asset → task_request → work_order → work_order_technician</pre>',
  impact: '<h1>Business Impact</h1><p>NITA reduces coordination bottlenecks by over 50% through automated WhatsApp triage.</p>'
};

document.querySelectorAll('.docs-toc-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.docs-toc-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const vp = document.getElementById('docs-viewport');
    if (vp) vp.innerHTML = docsContent[item.getAttribute('data-doc')] || 'Not found';
  });
});
const docsViewport = document.getElementById('docs-viewport');
if (docsViewport) docsViewport.innerHTML = docsContent.design;

// ============================================================
// 11. INIT
// ============================================================
loadDB();
initAuthGate();
renderFmDashboard();
renderTaskEntryTable();
renderApprovalTable();
renderBreakdownTasks();
setupAPITester();
addLog("Systems initialized.", "success");
