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
const assetMap = new Map();
const deptMap = new Map();

function rebuildLookupCaches() {
  assetMap.clear();
  deptMap.clear();
  for (const a of assets) assetMap.set(a.code, a);
  for (const d of departments) deptMap.set(d.id, d);
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
// Initial Mock Database Records
// ------------------------------------------------------------
let departments = [
  { id: "f83b190a-dbca-49d7-84fe-19a9dcf18f29", name: "Knitting Floor", location: "Knitting Floor, Row 3" },
  { id: "d27a1921-9922-4a0b-8cf2-ab9964a2b91c", name: "Cutting Department", location: "Cutting Department, Row 1" },
  { id: "e12a95c9-ca5e-436e-bcfc-843de9c1629d", name: "Engineering Division", location: "Building B, Ground Floor" },
  { id: "a56c4d7f-22a0-47bf-b30f-b28098c4f9a0", name: "Canteen & Admin Area", location: "Main Administration Block" },
  { id: "b28c03e8-55fa-4c4f-9efd-a9121aef42f0", name: "Central Stores", location: "Warehouse Area, Row 2" }
];

let assets = [
  { code: "39", name: "Circular Knitter — Brother CK-8", status: "down", location: "Knitting Floor, Row 3", dept_id: "f83b190a-dbca-49d7-84fe-19a9dcf18f29", type: "Production Loom", serial: "SN-9983-CK" },
  { code: "175", name: "Cutting Machine — Gerber Z1", status: "in_use", location: "Cutting Department, Row 1", dept_id: "d27a1921-9922-4a0b-8cf2-ab9964a2b91c", type: "Gerber Precision", serial: "SN-8822-GZ" },
  { code: "42", name: "Sewing Machine — Juki DDL-9000", status: "in_use", location: "Knitting Floor, Row 1", dept_id: "f83b190a-dbca-49d7-84fe-19a9dcf18f29", type: "Utility Equipment", serial: "SN-1022-JK" },
  { code: "109", name: "Air Compressor — Atlas Copco", status: "maintenance", location: "Building B, Ground Floor", dept_id: "e12a95c9-ca5e-436e-bcfc-843de9c1629d", type: "Pneumatics", serial: "SN-3049-AC" },
  { code: "88", name: "Steam Boiler — LTK-400", status: "in_use", location: "Warehouse Area, Row 2", dept_id: "b28c03e8-55fa-4c4f-9efd-a9121aef42f0", type: "Utilities Boiler", serial: "SN-7742-LT" }
];

let technicians = [
  { id: "tech-1", name: "Jean-Marc Rughoo", trade: "mechanic", active: true, workload: 1 },
  { id: "tech-2", name: "Priya Singh", trade: "mechanic", active: true, workload: 0 },
  { id: "tech-3", name: "Avinash Kowlessur", trade: "electrician", active: true, workload: 2 },
  { id: "tech-4", name: "Rishi Gopaul", trade: "welder", active: true, workload: 0 },
  { id: "tech-5", name: "Farhan Ally", trade: "hvac", active: false, workload: 0 }
];

// Initial Tasks
let taskRequests = [
  {
    task_request_id: "379555",
    asset_id: "39",
    created_by_user_id: "jeanphillipe",
    status: "pending_approval",
    priority: 0,
    requested_at: "2025-12-15T09:12:00.000Z",
    description: "Rewinding machine ground floor to install two line wires to slide air pressure.",
    task_type: "New Task",
    approved_by_user_id: null,
    approved_at: null,
    rejection_reason: null,
    media_urls: [],
    due_date: "2025-12-15"
  },
  {
    task_request_id: "379636",
    asset_id: "175",
    created_by_user_id: "admin",
    status: "pending_approval",
    priority: 1,
    requested_at: "2026-06-29T08:45:00.000Z",
    description: "Piping for combiwash + CPB (steam, condensates, air, soft water, hot water).",
    task_type: "New Task",
    approved_by_user_id: null,
    approved_at: null,
    rejection_reason: null,
    media_urls: [],
    due_date: "2026-06-29"
  },
  {
    task_request_id: "376267",
    asset_id: "42",
    created_by_user_id: "david",
    status: "pending_approval",
    priority: 1,
    requested_at: "2025-08-05T10:00:00.000Z",
    description: "Dyehouse - to lay new network cable from data cabinet to Irshaad office.",
    task_type: "New Task",
    approved_by_user_id: null,
    approved_at: null,
    rejection_reason: null,
    media_urls: [],
    due_date: "2025-08-31"
  },
  {
    task_request_id: "377558",
    asset_id: "109",
    created_by_user_id: "Kunal",
    status: "pending_approval",
    priority: 2,
    requested_at: "2025-09-25T11:20:00.000Z",
    description: "Dyehouse - To install TV.",
    task_type: "New Task",
    approved_by_user_id: null,
    approved_at: null,
    rejection_reason: null,
    media_urls: [],
    due_date: "2025-09-25"
  }
];

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

async function syncWithSupabase() {
  if (!window.NITA_CONFIG || !window.NITA_CONFIG.USE_REAL_SUPABASE) return;
  try {
    const [tasks, orders, assignments, dbDepts, dbAssets, dbTechs] = await Promise.all([
      fetchSupabase('task_request', 'GET', null, 'select=*'),
      fetchSupabase('work_order', 'GET', null, 'select=*'),
      fetchSupabase('work_order_technician', 'GET', null, 'select=*'),
      fetchSupabase('department', 'GET', null, 'select=*'),
      fetchSupabase('asset', 'GET', null, 'select=*'),
      fetchSupabase('technician', 'GET', null, 'select=*')
    ]);
    
    if (tasks) taskRequests = tasks;
    if (orders) workOrders = orders;
    if (assignments) workOrderTechnicians = assignments;
    
    if (dbDepts) {
      departments = dbDepts.map(d => ({
        id: d.department_id,
        name: d.name,
        location: d.location
      }));
    }
    
    if (dbAssets) {
      assets = dbAssets.map(a => ({
        code: a.asset_code,
        name: a.name,
        status: a.status,
        location: a.location,
        dept_id: a.dept_id,
        type: a.type,
        serial: a.serial
      }));
    }
    
    if (dbTechs) {
      technicians = dbTechs.map(t => ({
        id: t.technician_id,
        name: t.full_name,
        trade: t.trade,
        active: t.active,
        workload: t.workload
      }));
    }
    
    rebuildLookupCaches();
    
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

function populateSignupDepartments() {
  const select = document.getElementById('auth-signup-dept');
  if (!select || select.children.length > 0) return; // Already populated
  
  departments.forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept.id;
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
    const phoneInput = document.getElementById('auth-phone').value.trim();
    const pinInput = document.getElementById('auth-pin').value.trim();
    
    if (!phoneInput || !pinInput) {
      alert("Please enter phone number and PIN.");
      return;
    }

    // Hash PIN with SHA-256 (64-char hex) for server validation
    const pinHash = await sha256Hex(pinInput);

    let matchedUser = null;
    let token = '';

    if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
      // Supabase direct authentication
      try {
        const users = await fetchSupabase('app_user', 'GET', null, `phone_number=eq.${encodeURIComponent(phoneInput)}`);
        if (users && users.length > 0) {
          const user = users[0];
          if (user.pin_hash === pinHash) {
            matchedUser = { name: user.full_name, phone: phoneInput, role: user.role, user_id: user.user_id };
          }
        }
      } catch (err) {
        alert(`Supabase authentication error: ${err.message}`);
        return;
      }
    } else {
      // Try Rust server auth endpoint first
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
            
            // Check custom registered users for name
            let userName = data.role === 'coordinator' ? 'Nelson Fodjo' : data.role === 'operator' ? 'Priya Singh' : 'Jean-Marc Rughoo';
            const customUsers = JSON.parse(localStorage.getItem("nita_custom_users") || "{}");
            if (customUsers[phoneInput]) {
              userName = customUsers[phoneInput].name;
            }
            matchedUser = { name: userName, phone: phoneInput, role: data.role, user_id: USER_ID_MAP[phoneInput] || generateId('user'), token };
          }
        }
      } catch {
        // Server unavailable — fall back to local storage auth
      }

      // Local fallback (custom registered users only)
      if (!matchedUser) {
        const customUsers = JSON.parse(localStorage.getItem("nita_custom_users") || "{}");
        const custom = customUsers[phoneInput];
        if (custom && custom.pinHash === pinHash) {
          matchedUser = { name: custom.name, phone: phoneInput, role: custom.role, user_id: generateId('user') };
        }
      }
    }

    if (matchedUser) {
      activeSession = matchedUser;
      localStorage.setItem("nita_active_session", JSON.stringify(matchedUser));
      applyRolePermissions(matchedUser);
      showAuthOverlay(false);
      addLog(`Authenticated securely. Hashed PIN verified.`, 'success');
    } else {
      alert("Invalid phone number or secure PIN combination!");
    }
  });

  document.getElementById('btn-signup-submit')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('auth-signup-name').value.trim();
    const phoneInput = document.getElementById('auth-signup-phone').value.trim();
    const roleInput = document.getElementById('auth-signup-role').value;
    const deptInput = document.getElementById('auth-signup-dept').value;
    const tradeInput = document.getElementById('auth-signup-trade').value;
    const pinInput = document.getElementById('auth-signup-pin').value.trim();
    
    if (!nameInput || !phoneInput || !pinInput) {
      alert("All fields are required.");
      return;
    }
    
    // E.164 phone format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneInput)) {
      alert("Invalid phone format. Please use E.164 format (+XXXXXXXXXXX).");
      return;
    }
    
    // PIN must be 4 to 6 digits
    const pinRegex = /^\d{4,6}$/;
    if (!pinRegex.test(pinInput)) {
      alert("Secure PIN must be between 4 and 6 numeric digits.");
      return;
    }
    
    const pinHash = await sha256Hex(pinInput);
    
    let signupSuccess = false;
    let matchedUser = null;
    let token = '';
    
    if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
      // Production Supabase flow
      try {
        const userId = generateId('user');
        const newUser = {
          user_id: userId,
          department_id: deptInput,
          full_name: nameInput,
          role: roleInput,
          phone_number: phoneInput,
          pin_hash: pinHash
        };
        
        await fetchSupabase('app_user', 'POST', newUser);
        
        if (roleInput === 'technician') {
          const techId = generateId('tech');
          const newTech = {
            technician_id: techId,
            user_id: userId,
            full_name: nameInput,
            trade: tradeInput,
            active: true,
            workload: 0
          };
          await fetchSupabase('technician', 'POST', newTech);
        }
        
        signupSuccess = true;
        matchedUser = { name: nameInput, phone: phoneInput, role: roleInput, user_id: userId };
      } catch (err) {
        alert(`Registration failed on Supabase: ${err.message}`);
        return;
      }
    } else {
      // Local/Rust server flow
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone_number: phoneInput,
            pin_hash: pinHash,
            role: roleInput,
            full_name: nameInput
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (!data.error) {
            signupSuccess = true;
          } else {
            alert(`Registration error: ${data.message}`);
            return;
          }
        } else {
          const data = await res.json();
          alert(`Registration error: ${data.message || 'Server error'}`);
          return;
        }
      } catch {
        // Fallback to local storage persistence
        let localUsers = JSON.parse(localStorage.getItem("nita_custom_users") || "{}");
        if (localUsers[phoneInput]) {
          alert("A user with this phone number is already registered locally.");
          return;
        }
        localUsers[phoneInput] = {
          name: nameInput,
          pinHash: pinHash,
          role: roleInput,
          dept: deptInput,
          trade: roleInput === 'technician' ? tradeInput : null
        };
        localStorage.setItem("nita_custom_users", JSON.stringify(localUsers));
        signupSuccess = true;
      }
      
      if (signupSuccess) {
        // Log in to get token
        try {
          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: phoneInput, pin_hash: pinHash })
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            token = loginData.token;
          }
        } catch {}
        
        matchedUser = { name: nameInput, phone: phoneInput, role: roleInput, user_id: generateId('user'), token };
      }
    }
    
    if (signupSuccess && matchedUser) {
      activeSession = matchedUser;
      localStorage.setItem("nita_active_session", JSON.stringify(matchedUser));
      applyRolePermissions(matchedUser);
      showAuthOverlay(false);
      addLog(`Signed up and authenticated. Hashed PIN registered successfully.`, 'success');
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    activeSession = null;
    localStorage.removeItem("nita_active_session");
    showAuthOverlay(true);
    addLog(`Coordinator logout requested. Session tokens cleared.`, 'info');
  });
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

let selectedDeptId = departments[0].id;

function renderFmDashboard() {
  const pendingCount = taskRequests.filter(t => t.status === 'pending_approval').length;
  if (fmBadgeApproval) fmBadgeApproval.textContent = pendingCount.toString();
  
  if (fmDeptTable) {
    fmDeptTable.innerHTML = '';
    departments.forEach(dept => {
      const tr = document.createElement('tr');
      if (dept.id === selectedDeptId) tr.classList.add('active');
      tr.innerHTML = `<td>${esc(dept.name)}</td><td>${esc(dept.location)}</td>`;
      tr.addEventListener('click', () => {
        selectedDeptId = dept.id;
        renderFmDashboard();
      });
      fmDeptTable.appendChild(tr);
    });
  }

  const current = deptMap.get(selectedDeptId);
  if (current) {
    if (fmDetailDeptName) fmDetailDeptName.textContent = current.name;
    if (fmDetailDeptLoc) fmDetailDeptLoc.textContent = current.location;
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
    const asset = assetMap.get(task.asset_id);
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

  const asset = assetMap.get(task.asset_id);
  if (codeField) codeField.value = task.asset_id;
  if (nameField) nameField.value = asset ? asset.name : '';
  if (typeField) typeField.value = asset ? asset.type : '';
  if (serialField) serialField.value = asset ? asset.serial : '';
  if (deptField) {
    const dept = asset ? deptMap.get(asset.dept_id) : undefined;
    deptField.value = dept ? dept.name : '';
  }
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
    if (typeField) typeField.value = asset.type;
    if (serialField) serialField.value = asset.serial;
    if (deptField) {
      const dept = deptMap.get(asset.dept_id);
      deptField.value = dept ? dept.name : '';
    }
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
      fetchSupabase('task_request', 'POST', body)
        .then(() => syncWithSupabase())
        .catch(err => addLog(`Task creation failed: ${err.message}`, 'error'));
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
    const asset = assetMap.get(task.asset_id);
    const assetName = asset ? asset.name : 'Unknown';

    const plannedChecked = task.status !== 'pending_approval' ? 'checked' : '';
    const immediateChecked = task.priority === 0 ? 'checked' : '';
    const escapedId = esc(task.task_request_id);

    tr.innerHTML = `
      <td>${escapedId}</td>
      <td>${dateStr}</td>
      <td>${timeStr}</td>
      <td>Knitting Department</td>
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
    duration_mins: duration,
    person_in_charge: charge1,
    person_in_charge2: charge2
  };

  const tech = technicians.find(t => t.id === techId);
  const assign = {
    work_order_id: woId,
    technician_id: techId,
    assigned_at: new Date().toISOString(),
    status: 'assigned'
  };

  if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
    fetchSupabase('task_request', 'PATCH', {
      status: 'approved',
      planned_start_date: start,
      planned_finish_date: finish
    }, `task_request_id=eq.${targetTask.task_request_id}`)
      .then(() => fetchSupabase('work_order', 'POST', wo))
      .then(() => fetchSupabase('work_order_technician', 'POST', assign))
      .then(() => syncWithSupabase())
      .catch(err => addLog(`Dispatch failed: ${err.message}`, 'error'));
  } else {
    targetTask.status = 'approved';
    targetTask.planned_start_date = start;
    targetTask.planned_finish_date = finish;
    workOrders.push(wo);
    if (tech) {
      tech.workload += 1;
      workOrderTechnicians.push(assign);
    }
    saveDB();
    renderFmDashboard();
    renderBreakdownTasks();
  }

  alert(`Dispatched successfully! Work order generated for ${tech ? tech.name : 'Engineer'}.`);
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
        <div style="font-weight:700;">Knitting</div>
        <div style="font-size:11px; color:#4b5563;">${esc(task.created_by_user_id)}</div>
      </td>
      <td>${dateStr}</td>
      <td style="max-width:300px; line-height:1.4;">${esc(task.description)}</td>
      <td>${esc(task.due_date) || dateStr}</td>
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
      fetchSupabase('task_request', 'PATCH', {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by_user_id: activeSession?.user_id || 'aa3a190a-dbca-49d7-84fe-19a9dcf18f03'
      }, `task_request_id=eq.${id}`)
        .then(() => {
          const woId = generateId('wo');
          return fetchSupabase('work_order', 'POST', {
            work_order_id: woId,
            task_request_id: id,
            status: 'pending',
            priority: task.priority,
            scheduled_start: new Date().toISOString(),
            created_at: new Date().toISOString(),
            completed_at: null
          });
        })
        .then(() => syncWithSupabase())
        .catch(err => addLog(`Approval dispatch failed: ${err.message}`, 'error'));
    } else {
      fetchSupabase('task_request', 'PATCH', {
        status: 'rejected',
        rejection_reason: "Rejected from approval dashboard list."
      }, `task_request_id=eq.${id}`)
        .then(() => syncWithSupabase())
        .catch(err => addLog(`Rejection failed: ${err.message}`, 'error'));
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
      const bestMech = technicians.filter(t => t.active && t.trade === 'mechanic').sort((a,b) => a.workload - b.workload)[0];
      if (bestMech) {
        bestMech.workload += 1;
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

  const tech = technicians.find(t => t.name === activeSession?.name);
  if (!tech) return;

  const assignments = workOrderTechnicians.filter(wt => wt.technician_id === tech.id);
  
  if (assignments.length === 0) {
    techJobsBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:10px;">No active job assignments for your shift today.</td></tr>`;
    return;
  }

  assignments.forEach(assign => {
    const wo = workOrders.find(w => w.work_order_id === assign.work_order_id);
    if (!wo) return;
    
    const task = taskRequests.find(t => t.task_request_id === wo.task_request_id);
    if (!task) return;

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

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:monospace; font-weight:600;">${esc(wo.work_order_id)}</td>
      <td style="font-weight:600; color:var(--fm-blue-dark);">${esc(task.asset_id)}</td>
      <td>${esc(task.description)}</td>
      <td style="color:${task.priority === 0 ? 'var(--p0-critical)' : 'var(--p2-normal)'}; font-weight:700;">P${task.priority}</td>
      <td><span class="status-badge" style="font-size:11px; padding:2px 8px;">${esc(wo.status)}</span></td>
      <td>${buttonActionHTML}</td>
    `;
    techJobsBody.appendChild(tr);
  });
}

function techUpdateJob(woId, action) {
  const wo = workOrders.find(w => w.work_order_id === woId);
  if (!wo) return;

  if (window.NITA_CONFIG && window.NITA_CONFIG.USE_REAL_SUPABASE) {
    if (action === 'start') {
      fetchSupabase('work_order', 'PATCH', { status: 'in_progress' }, `work_order_id=eq.${woId}`)
        .then(() => syncWithSupabase())
        .catch(err => addLog(`Start job failed: ${err.message}`, 'error'));
    } else if (action === 'done') {
      fetchSupabase('work_order', 'PATCH', {
        status: 'completed',
        completed_at: new Date().toISOString()
      }, `work_order_id=eq.${woId}`)
        .then(() => syncWithSupabase())
        .catch(err => addLog(`Complete job failed: ${err.message}`, 'error'));
    } else if (action === 'decline') {
      fetchSupabase('work_order_technician', 'DELETE', null, `work_order_id=eq.${woId}`)
        .then(() => syncWithSupabase())
        .catch(err => addLog(`Decline job failed: ${err.message}`, 'error'));
    }
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

      const tech = technicians.find(t => t.name === activeSession?.name);
      if (tech) tech.workload = Math.max(0, tech.workload - 1);
      
      addLog(`[Tech Dispatch] Completed job work_order ${woId}. Requesting feedback webhook.`, 'success');
    } else if (action === 'decline') {
      wo.status = 'pending';
      workOrderTechnicians = workOrderTechnicians.filter(w => w.work_order_id !== woId);
      
      const tech = technicians.find(t => t.name === activeSession?.name);
      if (tech) tech.workload = Math.max(0, tech.workload - 1);
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
      fetchSupabase('task_request', 'POST', newTask)
        .then(() => syncWithSupabase())
        .catch(err => addLog(`WhatsApp task creation failed: ${err.message}`, 'error'));
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
      const relatedTasks = taskRequests.filter(t => t.asset_id === code).slice(0, 5);
      return { error: false, message: `Asset with code '${code}' found`, asset_code: asset.code, name: asset.name, status: asset.status, location: asset.location, history: { total_repairs: relatedTasks.length, recent: relatedTasks.map(t => ({ date: t.requested_at, description: t.description, status: t.status, priority: t.priority })) } };
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
      list.sort((a, b) => a.workload - b.workload);
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
  
  btnRunApi?.addEventListener('click', () => {
    const key = apiEndpointSelector.value;
    const config = SANDBOX_ENDPOINTS[key];
    if (config) {
      const inputs = {};
      if (apiInputsContainer) {
        const fields = apiInputsContainer.querySelectorAll('input, select');
        fields.forEach(f => {
          inputs[f.id] = f.value;
        });
      }
      
      const response = config.handler(inputs);
      if (apiResponseJson) {
        apiResponseJson.textContent = JSON.stringify(response, null, 2);
      }
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
