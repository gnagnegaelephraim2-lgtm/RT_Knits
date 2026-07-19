// ============================================================
// NITA CMMS — Application Logic
// ============================================================

// Utilities
function esc(s) { if (s == null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function $(id) { return document.getElementById(id); }
function $$(sel) { return document.querySelectorAll(sel); }
function generateId(p) { var a=new Uint8Array(8); crypto.getRandomValues(a); return p+'-'+Array.from(a,function(b){return b.toString(16).padStart(2,'0')}).join(''); }

async function sha256Hex(input) {
  var h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(h), function(b){return b.toString(16).padStart(2,'0')}).join('');
}

function normalizePhone(phone) {
  var c = phone.replace(/[\s\-\(\)]/g,'');
  if (!c.startsWith('+')) {
    if (c.startsWith('230') && c.length > 8) c = '+' + c;
    else if (c.length === 8 && /^[5796]/.test(c)) c = '+230' + c;
    else c = '+' + c;
  }
  return c;
}

// Lookup caches
var assetMap = {}, assetIdMap = {}, deptMap = {};

// State
var departments = [], assets = [], technicians = [], taskRequests = [], workOrders = [];
var session = null;

// ============================================================
// Supabase Client
// ============================================================
async function supa(table, query) {
  var cfg = window.NITA_CONFIG;
  if (!cfg || !cfg.USE_REAL_SUPABASE) return [];
  var url = cfg.SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : '');
  var res = await fetch(url, {
    headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
  });
  if (!res.ok) throw new Error('Supabase: ' + res.status);
  return res.json();
}

// ============================================================
// NITA API Client
// ============================================================
var API = {
  base: function() { return (window.NITA_CONFIG.NITA_API_URL || '').replace(/\/$/,''); },
  get: function(path, params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch(this.base() + path + qs).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); });
  },
  post: function(path, body) {
    return fetch(this.base() + path, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); });
  }
};

// ============================================================
// Data Loading
// ============================================================
async function loadData() {
  try {
    var results = await Promise.allSettled([
      supa('department'), supa('asset'), supa('technician'),
      supa('task_request', 'order=requested_at.desc'), supa('work_order', 'order=created_at.desc')
    ]);
    if (results[0].status==='fulfilled') departments = results[0].value;
    if (results[1].status==='fulfilled') assets = results[1].value;
    if (results[2].status==='fulfilled') technicians = results[2].value;
    if (results[3].status==='fulfilled') taskRequests = results[3].value;
    if (results[4].status==='fulfilled') workOrders = results[4].value;

    assetMap = {}; assetIdMap = {}; deptMap = {};
    assets.forEach(function(a) { assetMap[a.asset_code]=a; if(a.asset_id) assetIdMap[a.asset_id]=a; });
    departments.forEach(function(d) { deptMap[d.department_id]=d; });

    renderAll();
  } catch(e) { console.error('loadData:', e); }
}

// ============================================================
// Render Functions
// ============================================================
function renderAll() {
  renderDepts(); renderTasks(); renderApprovals(); renderBreakdown(); renderTechJobs(); renderDbTables();
}

function renderDepts() {
  var t = $('fm-dept-dashboard-table');
  if (!t) return;
  t.innerHTML = departments.map(function(d) {
    return '<tr data-dept="'+esc(d.department_id)+'" onclick="selectDept(\''+esc(d.department_id)+'\')"><td>'+esc(d.name)+'</td></tr>';
  }).join('') || '<tr><td style="color:var(--text-muted);padding:20px;text-align:center">No departments found</td></tr>';
}

function renderTasks() {
  var t = $('te-task-list-body');
  if (!t) return;
  t.innerHTML = taskRequests.map(function(tk) {
    var a = assetIdMap[tk.asset_id] || {};
    var cls = tk.status==='approved'?'row-planned':tk.status==='rejected'?'row-deleted':tk.status==='pending'?'row-unplanned':'';
    var prCls = tk.priority==='critical'?'critical':tk.priority==='high'?'urgent':tk.priority==='medium'?'warning':'normal';
    return '<tr class="'+cls+'" onclick="selectTask(\''+esc(tk.task_request_id)+'\')"><td>'+esc(a.asset_code||'—')+'</td><td>'+esc(a.name||'—')+'</td><td>'+esc(tk.task_type)+'</td><td>'+esc(tk.description)+'</td><td><span class="badge badge-'+prCls+'">'+esc(tk.priority)+'</span></td><td>'+esc(tk.status)+'</td><td>'+esc((tk.requested_at||'').split('T')[0])+'</td><td><div class="radio-dot" data-id="'+esc(tk.task_request_id)+'"></div></td></tr>';
  }).join('') || '<tr><td colspan="8" style="color:var(--text-muted);padding:40px;text-align:center">No tasks found</td></tr>';
}

function renderApprovals() {
  var t = $('approve-table-body');
  var pending = taskRequests.filter(function(tk){return tk.status==='pending';});
  var b = $('approve-count-badge');
  if(b) b.textContent = pending.length;
  var badge = $('fm-badge-approval');
  if(badge) badge.textContent = pending.length;
  if (!t) return;
  t.innerHTML = pending.map(function(tk) {
    var a = assetIdMap[tk.asset_id] || {};
    return '<tr><td>'+esc(tk.task_request_id.slice(0,8))+'</td><td>'+esc(a.location||'—')+'</td><td>'+esc((tk.requested_at||'').split('T')[0])+'</td><td>'+esc(tk.description)+'</td><td>'+esc((tk.requested_at||'').split('T')[0])+'</td><td><span class="badge badge-warning">pending</span></td><td class="action-cell"><button class="btn-approve" onclick="approveTask(\''+esc(tk.task_request_id)+'\')">Approve</button><button class="btn-reject" onclick="rejectTask(\''+esc(tk.task_request_id)+'\')">Reject</button></td></tr>';
  }).join('') || '<tr><td colspan="7" style="color:var(--text-muted);padding:40px;text-align:center">No pending approvals</td></tr>';
}

function renderBreakdown() {
  var t = $('pb-breakdown-table-body');
  if (!t) return;
  t.innerHTML = taskRequests.map(function(tk) {
    var a = assetIdMap[tk.asset_id] || {};
    return '<tr><td>'+esc(tk.task_request_id.slice(0,8))+'</td><td>'+esc((tk.requested_at||'').split('T')[0])+'</td><td>'+esc((tk.requested_at||'').split('T')[1]||'').slice(0,5)+'</td><td>'+esc(a.location||'—')+'</td><td>'+esc(a.name||'—')+'</td><td>'+esc(tk.created_by_user_id)+'</td><td>'+esc(tk.description)+'</td><td>—</td><td>'+esc(tk.task_type)+'</td><td><button class="btn-small">Select</button></td></tr>';
  }).join('') || '<tr><td colspan="10" style="color:var(--text-muted);padding:40px;text-align:center">No breakdown tasks</td></tr>';
}

function renderTechJobs() {
  var t = $('tech-jobs-table-body');
  if (!t) return;
  t.innerHTML = workOrders.map(function(wo) {
    var prCls = wo.priority==='critical'?'critical':wo.priority==='high'?'urgent':'normal';
    return '<tr><td>'+esc(wo.work_order_id.slice(0,8))+'</td><td>—</td><td>—</td><td><span class="badge badge-'+prCls+'">'+esc(wo.priority)+'</span></td><td>'+esc(wo.status)+'</td><td>'+esc((wo.scheduled_start||'').split('T')[0]||'—')+'</td><td><button class="btn-small">Update</button></td></tr>';
  }).join('') || '<tr><td colspan="7" style="color:var(--text-muted);padding:40px;text-align:center">No work orders</td></tr>';
}

function renderDbTables() {
  var t = $('db-fields-body');
  if (!t) return;
  var schemas = {
    department: [{f:'department_id',t:'uuid',k:'PK'},{f:'name',t:'text',k:''},{f:'created_at',t:'timestamptz',k:''}],
    app_user: [{f:'user_id',t:'uuid',k:'PK'},{f:'department_id',t:'uuid',k:'FK → department'},{f:'full_name',t:'text',k:''},{f:'email',t:'text',k:''},{f:'role',t:'text',k:''},{f:'phone_number',t:'text',k:'UNIQUE'},{f:'pin_hash',t:'text',k:''},{f:'preferred_language',t:'text',k:''},{f:'created_at',t:'timestamptz',k:''},{f:'whatsapp_verified',t:'boolean',k:''}],
    technician: [{f:'technician_id',t:'uuid',k:'PK'},{f:'user_id',t:'uuid',k:'FK → app_user'},{f:'full_name',t:'text',k:''},{f:'trade',t:'text',k:''},{f:'active',t:'boolean',k:''},{f:'created_at',t:'timestamptz',k:''}],
    asset: [{f:'asset_id',t:'uuid',k:'PK'},{f:'asset_code',t:'text',k:'UNIQUE'},{f:'name',t:'text',k:''},{f:'status',t:'text',k:''},{f:'location',t:'text',k:''},{f:'required_trade',t:'text',k:''},{f:'created_at',t:'timestamptz',k:''},{f:'last_preventive_check',t:'timestamptz',k:''},{f:'preventive_interval_days',t:'integer',k:''}],
    task_request: [{f:'task_request_id',t:'uuid',k:'PK'},{f:'asset_id',t:'uuid',k:'FK → asset'},{f:'created_by_user_id',t:'uuid',k:'FK → app_user'},{f:'status',t:'text',k:''},{f:'priority',t:'text',k:''},{f:'requested_at',t:'timestamptz',k:''},{f:'description',t:'text',k:''},{f:'task_type',t:'text',k:''},{f:'approved_by_user_id',t:'uuid',k:'FK → app_user'},{f:'approved_at',t:'timestamptz',k:''},{f:'rejection_reason',t:'text',k:''},{f:'required_trade',t:'text',k:''},{f:'created_by_role',t:'text',k:''}],
    work_order: [{f:'work_order_id',t:'uuid',k:'PK'},{f:'task_request_id',t:'uuid',k:'FK → task_request'},{f:'status',t:'text',k:''},{f:'priority',t:'text',k:''},{f:'scheduled_start',t:'timestamptz',k:''},{f:'created_at',t:'timestamptz',k:''},{f:'completed_at',t:'timestamptz',k:''},{f:'recommended_technician_id',t:'uuid',k:'FK → technician'},{f:'recommendation_reason',t:'text',k:''}],
    work_order_technician: [{f:'work_order_id',t:'uuid',k:'FK → work_order'},{f:'technician_id',t:'uuid',k:'FK → technician'},{f:'start_time',t:'timestamptz',k:''},{f:'stop_time',t:'timestamptz',k:''},{f:'assigned_at',t:'timestamptz',k:''},{f:'status',t:'text',k:''}]
  };
  var activeTable = document.querySelector('.db-list-item.active');
  var tableName = activeTable ? activeTable.getAttribute('data-table') : 'department';
  var fields = schemas[tableName] || [];

  $('db-table-title').textContent = 'TABLE ' + tableName;
  $('db-table-size').textContent = fields.length + ' fields';

  t.innerHTML = fields.map(function(f) {
    var kHtml = f.k==='PK'?'<span class="key-pill pk">PK</span>':f.k.startsWith('FK')?'<span class="key-pill fk">FK</span>':'';
    return '<tr><td><code>'+esc(f.f)+'</code></td><td><code>'+esc(f.t)+'</code></td><td>'+kHtml+(f.k?' '+esc(f.k):'')+'</td><td></td></tr>';
  }).join('');

  // Relationship text
  var rels = fields.filter(function(f){return f.k && f.k.startsWith('FK');}).map(function(f){
    var target = f.k.replace('FK → ','');
    return tableName + '.' + f.f + ' → ' + target;
  });
  $('db-relationship-text').textContent = rels.length ? rels.join('\n') : 'None';
}

// ============================================================
// Navigation
// ============================================================
function navigateTo(paneId) {
  $$('.content-pane').forEach(function(p){p.classList.remove('active');});
  $$('.menu-item').forEach(function(m){m.classList.remove('active');});
  var pane = $(paneId);
  if(pane) pane.classList.add('active');
  var mi = document.querySelector('[data-target="'+paneId+'"]');
  if(mi) mi.classList.add('active');
}

// ============================================================
// Auth
// ============================================================
function switchTab(tab) {
  $('form-login-pane').classList.toggle('active', tab==='login');
  $('form-signup-pane').classList.toggle('active', tab==='signup');
  $('tab-login').classList.toggle('active', tab==='login');
  $('tab-signup').classList.toggle('active', tab==='signup');
}

function toggleSignupFields() {
  var role = $('auth-signup-role').value;
  $('signup-dept-field').style.display = role==='technician'?'none':'';
  $('signup-trade-field').style.display = role==='technician'?'':'none';
}

async function doLogin() {
  var phone = normalizePhone($('auth-phone').value);
  var pin = $('auth-pin').value;
  if (!phone || !pin) return alert('Please enter phone and PIN.');

  var pinHash = await sha256Hex(pin);

  // Try localStorage users first
  var users = JSON.parse(localStorage.getItem('nita_users')||'{}');
  if (users[phone] && users[phone].pin_hash === pinHash) {
    session = { user: users[phone], role: users[phone].role, userId: phone };
    localStorage.setItem('nita_session', JSON.stringify(session));
    $('auth-overlay').classList.add('hidden');
    updateUserInfo();
    loadData();
    return;
  }

  // Try NITA API
  try {
    var data = await API.post('/api-task-lifecycle', { action:'auth_check', phone_number:phone, pin_hash:pinHash });
    if (data && !data.error) {
      session = { user:{full_name:data.full_name||'User',role:data.role||'coordinator'}, role:data.role||'coordinator', userId:phone };
      localStorage.setItem('nita_session', JSON.stringify(session));
      $('auth-overlay').classList.add('hidden');
      updateUserInfo();
      loadData();
      return;
    }
  } catch(e) {}

  alert('Invalid credentials.');
}

async function doSignup() {
  var name = $('auth-signup-name').value.trim();
  var phone = normalizePhone($('auth-signup-phone').value);
  var role = $('auth-signup-role').value;
  var pin = $('auth-signup-pin').value;

  if (!name || !phone || !pin) return alert('All fields required.');
  if (pin.length < 4 || pin.length > 6) return alert('PIN must be 4-6 digits.');

  var pinHash = await sha256Hex(pin);
  var users = JSON.parse(localStorage.getItem('nita_users')||'{}');
  if (users[phone]) return alert('User already exists.');

  users[phone] = { phone_number:phone, full_name:name, role:role, pin_hash:pinHash, created_at:new Date().toISOString() };
  localStorage.setItem('nita_users', JSON.stringify(users));
  alert('Account created! Please sign in.');
  switchTab('login');
}

function doLogout() {
  session = null;
  localStorage.removeItem('nita_session');
  location.reload();
}

function updateUserInfo() {
  if (!session) return;
  var initials = session.user.full_name.split(' ').map(function(n){return n[0]}).join('').toUpperCase().slice(0,2);
  $('current-user-avatar').textContent = initials;
  $('current-user-name').textContent = session.user.full_name;
  $('current-user-role').textContent = session.role;

  // Role-based nav visibility
  if (session.role === 'technician') {
    $('menu-technician-tasks').style.display = '';
    $('menu-coordinator-dash').style.display = 'none';
    $('menu-planning-breakdown').style.display = 'none';
    $('menu-task-entry').style.display = 'none';
    $('menu-tasks-to-approve').style.display = 'none';
  }
}

// ============================================================
// Task Actions
// ============================================================
function selectDept(id) {
  $$('.fm-scroll-table tr.active').forEach(function(r){r.classList.remove('active');});
  var row = document.querySelector('[data-dept="'+id+'"]');
  if(row) row.classList.add('active');
  var d = deptMap[id];
  if(d) {
    $('fm-detail-dept-name').textContent = d.name;
    $('fm-detail-dept-loc').textContent = d.location || 'N/A';
  }
}

function selectTask(id) {
  $$('.select-task-table tr.selected').forEach(function(r){r.classList.remove('selected');});
  var row = document.querySelector('[data-id="'+id+'"]');
  if(row) row.closest('tr').classList.add('selected');
}

function approveTask(id) {
  if(!confirm('Approve this task?')) return;
  taskRequests = taskRequests.map(function(tk){return tk.task_request_id===id?Object.assign(tk,{status:'approved'}):tk;});
  renderAll();
}

function rejectTask(id) {
  var reason = prompt('Rejection reason:');
  if(!reason) return;
  taskRequests = taskRequests.map(function(tk){return tk.task_request_id===id?Object.assign(tk,{status:'rejected',rejection_reason:reason}):tk;});
  renderAll();
}

function resetAllWorkOrders() {
  if(!confirm('Reset all work orders? This cannot be undone.')) return;
  workOrders = [];
  renderAll();
}

// ============================================================
// WhatsApp Simulator (stub)
// ============================================================
function loadScenario(type) {
  var chat = $('chat-messages');
  var console_ = $('console-logs');
  if(!chat) return;

  var scenarios = {
    critical_leak: { msg:'URGENT: Grinding noise on Circular Knitter CK-8, production line stopped!', priority:'critical' },
    urgent_tension: { msg:'Gerber cutter belt is slipping on Row 1, tension inconsistent.', priority:'high' },
    normal_cosmetic: { msg:'Office door latch is broken, needs replacement.', priority:'medium' }
  };

  var s = scenarios[type];
  if(!s) return;

  chat.innerHTML += '<div class="bubble incoming"><div class="bubble-text">'+esc(s.msg)+'</div></div>';
  chat.scrollTop = chat.scrollHeight;

  var now = new Date().toLocaleTimeString();
  console_.innerHTML += '<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-info">Scenario loaded: '+type+' (P'+(s.priority==='critical'?'0':s.priority==='high'?'1':'2')+')</span></div>';
  console_.innerHTML += '<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-success">NITA: Message received, analyzing...</span></div>';
  console_.scrollTop = console_.scrollHeight;
}

function sendChatMessage() {
  var input = $('chat-user-input');
  var chat = $('chat-messages');
  if(!input || !input.value.trim()) return;

  chat.innerHTML += '<div class="bubble outgoing"><div class="bubble-text">'+esc(input.value)+'</div></div>';
  var msg = input.value;
  input.value = '';
  chat.scrollTop = chat.scrollHeight;

  var now = new Date().toLocaleTimeString();
  $('console-logs').innerHTML += '<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-info">User: '+esc(msg)+'</span></div>';
  $('console-logs').innerHTML += '<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-success">NITA: Processing message...</span></div>';
  $('console-logs').scrollTop = $('console-logs').scrollHeight;
}

function clearConsole() {
  var c = $('console-logs');
  if(c) c.innerHTML = '<div class="log-line"><span class="log-time">['+new Date().toLocaleTimeString()+']</span> <span class="log-info">Console cleared.</span></div>';
}

// ============================================================
// API Sandbox (stub)
// ============================================================
function runApiRequest() {
  var sel = $('api-endpoint-selector');
  var viewer = $('api-response-json');
  if(!sel || !viewer) return;

  viewer.textContent = 'Loading...';
  API.get('/'+sel.value).then(function(data) {
    viewer.textContent = JSON.stringify(data, null, 2);
  }).catch(function(e) {
    viewer.textContent = 'Error: ' + e.message;
  });
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  // Check session
  try {
    session = JSON.parse(localStorage.getItem('nita_session'));
    if(session) {
      $('auth-overlay').classList.add('hidden');
      updateUserInfo();
    }
  } catch(e) { session = null; }

  // i18n
  if(window.NITA_I18N) NITA_I18N.init();

  // Navigation clicks
  $$('.menu-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var target = item.getAttribute('data-target');
      if(target) navigateTo(target);
    });
  });

  // DB table clicks
  $$('.db-list-item').forEach(function(item) {
    item.addEventListener('click', function() {
      $$('.db-list-item').forEach(function(i){i.classList.remove('active');});
      item.classList.add('active');
      renderDbTables();
    });
  });

  // Auth buttons
  $('btn-login-submit').addEventListener('click', doLogin);
  $('btn-signup-submit').addEventListener('click', doSignup);
  $('btn-logout').addEventListener('click', doLogout);

  // WhatsApp
  $('btn-send-message').addEventListener('click', sendChatMessage);
  $('chat-user-input').addEventListener('keydown', function(e) { if(e.key==='Enter') sendChatMessage(); });

  // API
  $('btn-run-api').addEventListener('click', runApiRequest);
  $('api-endpoint-selector').addEventListener('change', function() {
    $('api-url-input').value = NITA_CONFIG.NITA_API_URL + '/' + this.value;
  });

  // Load data if authenticated
  if(session) loadData();
});