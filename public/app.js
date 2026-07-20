// ============================================================
// NITA CMMS — Full Application
// ============================================================

// ── Utilities ──────────────────────────────────────────────
function esc(s){if(s==null)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function $(id){return document.getElementById(id);}
function $$(s){return document.querySelectorAll(s);}
function uid(p){var a=new Uint8Array(8);crypto.getRandomValues(a);return p+'-'+Array.from(a,function(b){return b.toString(16).padStart(2,'0')}).join('');}
async function sha256(s){var h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(h),function(b){return b.toString(16).padStart(2,'0')}).join('');}
function normPhone(p){var c=p.replace(/[\s\-\(\)]/g,'');if(!c.startsWith('+')){if(c.startsWith('230')&&c.length>8)c='+'+c;else if(c.length===8&&/^[5796]/.test(c))c='+230'+c;else c='+'+c;}return c;}
function ago(ts){if(!ts)return'';var d=Date.now()-new Date(ts).getTime();if(d<60000)return'just now';if(d<3600000)return Math.floor(d/60000)+'m ago';if(d<86400000)return Math.floor(d/3600000)+'h ago';return Math.floor(d/86400000)+'d ago';}
function today(){return new Date().toISOString().split('T')[0];}
function toast(msg,type){
  var t=document.createElement('div');t.className='toast toast-'+(type||'info');t.textContent=msg;
  document.body.appendChild(t);setTimeout(function(){t.classList.add('show');},10);
  setTimeout(function(){t.classList.remove('show');setTimeout(function(){t.remove();},300);},3000);
}

// ── State ──────────────────────────────────────────────────
var departments=[],assets=[],technicians=[],taskRequests=[],workOrders=[],feedbacks=[];
var assetMap={},assetIdMap={},deptMap={},techMap={};
var session=null;

// ── Supabase ───────────────────────────────────────────────
async function supa(table,query){
  var c=window.NITA_CONFIG;if(!c||!c.USE_REAL_SUPABASE)return[];
  var r=await fetch(c.SUPABASE_URL+'/rest/v1/'+table+(query?'?'+query:''),{
    headers:{'apikey':c.SUPABASE_ANON_KEY,'Authorization':'Bearer '+c.SUPABASE_ANON_KEY,'Content-Type':'application/json'}
  });if(!r.ok)throw new Error('Supabase '+r.status);return r.json();
}
async function supaInsert(table,body){
  var c=window.NITA_CONFIG;if(!c)return null;
  var r=await fetch(c.SUPABASE_URL+'/rest/v1/'+table,{
    method:'POST',headers:{'apikey':c.SUPABASE_ANON_KEY,'Authorization':'Bearer '+c.SUPABASE_ANON_KEY,'Content-Type':'application/json','Prefer':'return=representation'},
    body:JSON.stringify(body)
  });if(!r.ok)throw new Error('Supabase insert '+r.status);return r.json();
}
async function supaUpdate(table,match,body){
  var c=window.NITA_CONFIG;if(!c)return null;
  var qs=Object.entries(match).map(function(k){return k[0]+'=eq.'+k[1]}).join('&');
  var r=await fetch(c.SUPABASE_URL+'/rest/v1/'+table+'?'+qs,{
    method:'PATCH',headers:{'apikey':c.SUPABASE_ANON_KEY,'Authorization':'Bearer '+c.SUPABASE_ANON_KEY,'Content-Type':'application/json','Prefer':'return=representation'},
    body:JSON.stringify(body)
  });if(!r.ok)throw new Error('Supabase update '+r.status);return r.json();
}

// ── NITA API ───────────────────────────────────────────────
var API={
  base:function(){return(window.NITA_CONFIG.NITA_API_URL||'').replace(/\/$/,'');},
  get:function(p,q){var qs=q?'?'+new URLSearchParams(q).toString():'';return fetch(this.base()+p+qs).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});},
  post:function(p,b){return fetch(this.base()+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}
};

// ── Data Loading ───────────────────────────────────────────
async function loadAll(){
  try{
    var r=await Promise.allSettled([
      supa('department'),supa('asset'),supa('technician'),
      supa('task_request','order=requested_at.desc&limit=100'),supa('work_order','order=created_at.desc&limit=100'),
      supa('work_order_feedback','order=created_at.desc&limit=50'),supa('app_user')
    ]);
    if(r[0].status==='fulfilled')departments=r[0].value||[];
    if(r[1].status==='fulfilled')assets=r[1].value||[];
    if(r[2].status==='fulfilled')technicians=r[2].value||[];
    if(r[3].status==='fulfilled')taskRequests=r[3].value||[];
    if(r[4].status==='fulfilled')workOrders=r[4].value||[];
    if(r[5].status==='fulfilled')feedbacks=r[5].value||[];
    rebuildCaches();renderAll();
  }catch(e){console.error('loadAll:',e);}
}
function rebuildCaches(){
  assetMap={};assetIdMap={};deptMap={};techMap={};
  assets.forEach(function(a){assetMap[a.asset_code]=a;if(a.asset_id)assetIdMap[a.asset_id]=a;});
  departments.forEach(function(d){deptMap[d.department_id]=d;});
  technicians.forEach(function(t){techMap[t.technician_id]=t;});
}

// ── Dashboard Stats ────────────────────────────────────────
function getStats(){
  var pending=taskRequests.filter(function(t){return t.status==='pending';}).length;
  var inProgress=taskRequests.filter(function(t){return t.status==='approved'||t.status==='in_progress';}).length;
  var completed=taskRequests.filter(function(t){return t.status==='completed';}).length;
  var critical=taskRequests.filter(function(t){return t.priority==='critical';}).length;
  var activeTechs=technicians.filter(function(t){return t.active;}).length;
  return{pending:pending,inProgress:inProgress,completed:completed,critical:critical,activeTechs:activeTechs,total:taskRequests.length};
}

// ── Render ─────────────────────────────────────────────────
function renderAll(){
  renderDashboard();renderDepts();renderTasks();renderApprovals();renderBreakdown();renderTechJobs();renderDbTables();renderProfile();
}
function renderDashboard(){
  var s=getStats();
  var el=$('stats-grid');
  if(el)el.innerHTML=
    '<div class="stat-card '+(s.critical>0?'stat-red':'stat-green')+'"><div class="stat-num">'+s.critical+'</div><div class="stat-label">P0 Critical Alerts</div></div>'+
    '<div class="stat-card stat-amber"><div class="stat-num">'+s.pending+'</div><div class="stat-label">Pending Approvals</div></div>'+
    '<div class="stat-card stat-cyan"><div class="stat-num">'+s.inProgress+'</div><div class="stat-label">Active Dispatches</div></div>'+
    '<div class="stat-card stat-accent"><div class="stat-num">'+s.activeTechs+'</div><div class="stat-label">Techs On-Duty</div></div>'+
    '<div class="stat-card stat-green"><div class="stat-num">99.8%</div><div class="stat-label">Plant SLA Target</div></div>'+
    '<div class="stat-card stat-cyan"><div class="stat-num">'+assets.length+'</div><div class="stat-label">Registered Assets</div></div>';
  var badge=$('fm-badge-approval');if(badge)badge.textContent=s.pending;
}
function renderDepts(){
  var t=$('fm-dept-dashboard-table');if(!t)return;
  t.innerHTML=departments.map(function(d){
    var deptTasks=taskRequests.filter(function(tk){return assets.some(function(a){return a.asset_id===tk.asset_id&&deptMap[a.asset_id]&&deptMap[a.asset_id].department_id===d.department_id;});});
    var hasCrit=deptTasks.some(function(tk){return(tk.priority==='critical'||tk.priority===0)&&tk.status!=='completed';});
    var b=hasCrit?'<span class="badge badge-p0" style="padding:2px 8px;font-size:10px">LINE STOP</span>':'<span class="badge badge-success" style="padding:2px 8px;font-size:10px">OPERATIONAL</span>';
    return '<tr data-dept="'+esc(d.department_id)+'" onclick="selectDept(\''+esc(d.department_id)+'\')"><td style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;"><span style="font-weight:700;color:var(--text)">'+esc(d.name)+'</span>'+b+'</td></tr>';
  }).join('')||'<tr><td style="padding:20px;text-align:center;color:var(--text-3)">No departments</td></tr>';
}
function renderTasks(){
  var t=$('te-task-list-body');if(!t)return;
  t.innerHTML=taskRequests.map(function(tk){
    var a=assetIdMap[tk.asset_id]||{};
    var priBadge=(tk.priority==='critical'||tk.priority===0)?'<span class="badge badge-p0">P0 CRITICAL</span>':(tk.priority==='high'||tk.priority===1)?'<span class="badge badge-p1">P1 URGENT</span>':'<span class="badge badge-p2">P2 NORMAL</span>';
    var stBadge=tk.status==='approved'||tk.status==='in_progress'?'<span class="badge badge-warning">IN PROGRESS</span>':tk.status==='completed'?'<span class="badge badge-success">COMPLETED</span>':tk.status==='rejected'?'<span class="badge badge-danger">REJECTED</span>':'<span class="badge badge-pending">PENDING</span>';
    var cls=tk.status==='approved'?'row-planned':tk.status==='rejected'?'row-deleted':tk.status==='pending'?'row-unplanned':'';
    return '<tr class="'+cls+'" onclick="selectTask(\''+esc(tk.task_request_id)+'\')"><td class="mono" style="font-weight:700;color:var(--text)">'+esc(a.asset_code||'—')+'</td><td style="font-weight:700">'+esc(a.name||'—')+'</td><td>'+esc(tk.task_type)+'</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(tk.description)+'</td><td>'+priBadge+'</td><td>'+stBadge+'</td><td class="mono-text">'+esc((tk.requested_at||'').split('T')[0])+'</td><td><div class="radio-dot" data-id="'+esc(tk.task_request_id)+'"></div></td></tr>';
  }).join('')||'<tr><td colspan="8" style="padding:40px;text-align:center;color:var(--text-3)">No tasks found</td></tr>';
}
function renderApprovals(){
  var t=$('approve-table-body');if(!t)return;
  var pending=taskRequests.filter(function(tk){return tk.status==='pending'||tk.status==='pending_approval';});
  var b=$('approve-count-badge');if(b)b.textContent=pending.length;
  t.innerHTML=pending.map(function(tk){
    var a=assetIdMap[tk.asset_id]||{};
    var priBadge=(tk.priority==='critical'||tk.priority===0)?'<span class="badge badge-p0">P0 CRITICAL</span>':(tk.priority==='high'||tk.priority===1)?'<span class="badge badge-p1">P1 URGENT</span>':'<span class="badge badge-p2">P2 NORMAL</span>';
    return '<tr><td class="mono" style="font-weight:700;color:var(--accent-light)">'+esc(tk.task_request_id.slice(0,8))+'</td><td><div style="font-weight:700;color:var(--text)">'+esc(tk.created_by_role||'Operator')+'</div><div style="font-size:11px;color:var(--text-3)">'+esc(a.name||a.location||'—')+'</div></td><td class="mono-text">'+esc((tk.requested_at||'').split('T')[0])+'</td><td style="max-width:280px;line-height:1.4">'+esc(tk.description)+'</td><td>'+priBadge+'</td><td><span class="badge badge-pending">PENDING</span></td><td class="action-cell" style="white-space:nowrap"><button class="btn-approve" onclick="approveTask(\''+esc(tk.task_request_id)+'\')">Approve</button><button class="btn-reject" onclick="rejectTask(\''+esc(tk.task_request_id)+'\')">Reject</button></td></tr>';
  }).join('')||'<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text-3)">No pending approvals</td></tr>';
}
function renderBreakdown(){
  var t=$('pb-breakdown-table-body');if(!t)return;
  t.innerHTML=taskRequests.slice(0,50).map(function(tk){
    var a=assetIdMap[tk.asset_id]||{};
    var priBadge=(tk.priority==='critical'||tk.priority===0)?'<span class="badge badge-p0">P0</span>':(tk.priority==='high'||tk.priority===1)?'<span class="badge badge-p1">P1</span>':'<span class="badge badge-p2">P2</span>';
    return '<tr><td class="mono" style="font-weight:700">'+esc(tk.task_request_id.slice(0,8))+'</td><td class="mono-text">'+esc((tk.requested_at||'').split('T')[0])+'</td><td class="mono-text">'+esc((tk.requested_at||'').split('T')[1]||'').slice(0,5)+'</td><td>'+esc(a.location||'—')+'</td><td style="font-weight:700">'+esc(a.name||'—')+'</td><td>'+esc(tk.created_by_user_id)+'</td><td style="max-width:220px;line-height:1.4">'+esc(tk.description)+'</td><td>'+priBadge+'</td><td><button class="btn-primary" style="padding:6px 12px;font-size:11px" onclick="dispatchTask(\''+esc(tk.task_request_id)+'\')">Dispatch</button></td></tr>';
  }).join('')||'<tr><td colspan="9" style="padding:40px;text-align:center;color:var(--text-3)">No tasks</td></tr>';
}
function renderTechJobs(){
  var t=$('tech-jobs-table-body');if(!t)return;
  t.innerHTML=workOrders.map(function(wo){
    var tr=taskRequests.find(function(tk){return tk.task_request_id===wo.task_request_id;})||{};
    var a=assetIdMap[tr.asset_id]||{};
    var priBadge=(wo.priority==='critical'||wo.priority===0)?'<span class="badge badge-p0">P0 CRITICAL</span>':(wo.priority==='high'||wo.priority===1)?'<span class="badge badge-p1">P1 URGENT</span>':'<span class="badge badge-p2">P2 NORMAL</span>';
    var stBadge=wo.status==='completed'?'<span class="badge badge-success">COMPLETED</span>':wo.status==='in_progress'?'<span class="badge badge-warning">IN PROGRESS</span>':'<span class="badge badge-pending">DISPATCHED</span>';
    var btn=wo.status==='completed'?'<span class="badge badge-success">Job Closed</span>':wo.status==='in_progress'?'<button class="btn-success" style="font-size:12px;padding:8px 14px" onclick="updateWorkOrder(\''+esc(wo.work_order_id)+'\',\'completed\')">✅ Mark Completed</button>':'<button class="btn-primary" style="font-size:12px;padding:8px 14px" onclick="updateWorkOrder(\''+esc(wo.work_order_id)+'\',\'in_progress\')">🛠 Start Work</button>';
    return '<tr><td class="mono" style="font-weight:700;color:var(--accent-light)">'+esc(wo.work_order_id.slice(0,8))+'</td><td style="font-weight:700;color:var(--text)">'+esc(a.name||'—')+'</td><td style="max-width:250px;line-height:1.4">'+esc(tr.description||'—')+'</td><td>'+priBadge+'</td><td>'+stBadge+'</td><td class="mono-text">'+esc((wo.scheduled_start||'').split('T')[0]||'—')+'</td><td style="white-space:nowrap">'+btn+'</td></tr>';
  }).join('')||'<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text-3)">No work orders</td></tr>';
}
function renderDbTables(){
  var t=$('db-fields-body');if(!t)return;
  var schemas={
    department:[{f:'department_id',t:'uuid',k:'PK'},{f:'name',t:'text'},{f:'created_at',t:'timestamptz'}],
    app_user:[{f:'user_id',t:'uuid',k:'PK'},{f:'department_id',t:'uuid',k:'FK'},{f:'full_name',t:'text'},{f:'email',t:'text'},{f:'role',t:'text'},{f:'phone_number',t:'text',k:'UNIQUE'},{f:'pin_hash',t:'text'},{f:'preferred_language',t:'text'},{f:'created_at',t:'timestamptz'},{f:'whatsapp_verified',t:'boolean'}],
    technician:[{f:'technician_id',t:'uuid',k:'PK'},{f:'user_id',t:'uuid',k:'FK'},{f:'full_name',t:'text'},{f:'trade',t:'text'},{f:'active',t:'boolean'},{f:'created_at',t:'timestamptz'}],
    asset:[{f:'asset_id',t:'uuid',k:'PK'},{f:'asset_code',t:'text',k:'UNIQUE'},{f:'name',t:'text'},{f:'status',t:'text'},{f:'location',t:'text'},{f:'required_trade',t:'text'},{f:'created_at',t:'timestamptz'}],
    task_request:[{f:'task_request_id',t:'uuid',k:'PK'},{f:'asset_id',t:'uuid',k:'FK'},{f:'created_by_user_id',t:'uuid',k:'FK'},{f:'status',t:'text'},{f:'priority',t:'text'},{f:'requested_at',t:'timestamptz'},{f:'description',t:'text'},{f:'task_type',t:'text'},{f:'approved_by_user_id',t:'uuid',k:'FK'},{f:'approved_at',t:'timestamptz'},{f:'rejection_reason',t:'text'},{f:'required_trade',t:'text'},{f:'created_by_role',t:'text'}],
    work_order:[{f:'work_order_id',t:'uuid',k:'PK'},{f:'task_request_id',t:'uuid',k:'FK'},{f:'status',t:'text'},{f:'priority',t:'text'},{f:'scheduled_start',t:'timestamptz'},{f:'created_at',t:'timestamptz'},{f:'completed_at',t:'timestamptz'},{f:'recommended_technician_id',t:'uuid',k:'FK'},{f:'recommendation_reason',t:'text'}],
    work_order_feedback:[{f:'feedback_id',t:'uuid',k:'PK'},{f:'work_order_id',t:'uuid',k:'FK'},{f:'technician_id',t:'uuid',k:'FK'},{f:'rating',t:'integer'},{f:'comment',t:'text'},{f:'commendation',t:'boolean'},{f:'created_by_user_id',t:'uuid',k:'FK'},{f:'created_at',t:'timestamptz'}]
  };
  var active=document.querySelector('.db-item.active');
  var tableName=active?active.getAttribute('data-table'):'department';
  var fields=schemas[tableName]||[];
  $('db-table-title').textContent='TABLE '+tableName;
  $('db-table-size').textContent=fields.length+' fields';
  t.innerHTML=fields.map(function(f){
    var k=f.k==='PK'?'<span class="key-pill pk">PK</span>':f.k==='FK'?'<span class="key-pill fk">FK</span>':f.k==='UNIQUE'?'<span class="key-pill" style="background:var(--amber-dim);color:var(--amber)">UQ</span>':'';
    return '<tr><td><code>'+esc(f.f)+'</code></td><td><code>'+esc(f.t)+'</code></td><td>'+k+'</td><td></td></tr>';
  }).join('');
}

// ── Profile ────────────────────────────────────────────────
var users={};
async function loadUsers(){
  try{var u=await supa('app_user');u.forEach(function(x){users[x.user_id]=x;users[x.phone_number]=x;});}catch(e){}
}
function renderProfile(){
  var el=$('profile-content');if(!el||!session)return;
  var u=session.user;
  var myRatings=feedbacks.filter(function(f){return f.technician_id===u.user_id;});
  var avgRating=myRatings.length?Math.round(myRatings.reduce(function(s,f){return s+f.rating;},0)/myRatings.length):0;
  var commendations=myRatings.filter(function(f){return f.commendation;}).length;
  var myTasks=taskRequests.filter(function(tk){return tk.created_by_user_id===u.user_id;}).length;

  el.innerHTML=
    '<div class="profile-header">'+
      '<div class="profile-avatar-lg">'+(u.full_name||'U').split(' ').map(function(n){return n[0]}).join('').toUpperCase().slice(0,2)+'</div>'+
      '<div class="profile-info"><h2>'+esc(u.full_name||'User')+'</h2>'+
      '<span class="badge badge-'+(u.role==='coordinator'?'accent':u.role==='technician'?'cyan':'normal')+'">'+esc(u.role||'unknown')+'</span></div>'+
    '</div>'+
    '<div class="profile-stats">'+
      '<div class="pstat"><div class="pstat-num">'+myTasks+'</div><div class="pstat-label">My Requests</div></div>'+
      '<div class="pstat"><div class="pstat-num">'+avgRating+'</div><div class="pstat-label">Avg Rating</div></div>'+
      '<div class="pstat"><div class="pstat-num">'+commendations+'</div><div class="pstat-label">Commendations</div></div>'+
      '<div class="pstat"><div class="pstat-num">'+myRatings.length+'</div><div class="pstat-label">Reviews</div></div>'+
    '</div>'+
    '<div class="profile-form">'+
      '<h3>Edit Profile</h3>'+
      '<label class="field-label">Full Name</label><input class="field-input" id="prof-name" value="'+esc(u.full_name||'')+'">'+
      '<label class="field-label">Email</label><input class="field-input" id="prof-email" value="'+esc(u.email||'')+'" type="email">'+
      '<label class="field-label">Preferred Language</label>'+
      '<select class="field-input" id="prof-lang"><option value="en">English</option><option value="fr">Français</option><option value="cr">Kreol</option><option value="hi">हिन्दी</option></select>'+
      '<button class="btn-primary" onclick="saveProfile()">Save Changes</button>'+
    '</div>'+
    (session.role==='coordinator'||session.role==='admin'?renderRatingBoard():'');
}
function renderRatingBoard(){
  var techsWithRatings=technicians.map(function(t){
    var r=feedbacks.filter(function(f){return f.technician_id===t.technician_id;});
    var avg=r.length?Math.round(r.reduce(function(s,f){return s+f.rating;},0)/r.length):0;
    return {tech:t,ratings:r,avg:avg,commendations:r.filter(function(f){return f.commendation;}).length};
  }).sort(function(a,b){return b.avg-a.avg;});

  var rows=techsWithRatings.map(function(item){
    var stars='';for(var i=0;i<5;i++)stars+=i<item.avg?'★':'☆';
    return '<tr><td>'+esc(item.tech.full_name)+'</td><td>'+esc(item.tech.trade)+'</td><td class="stars">'+stars+'</td><td>'+item.ratings.length+'</td><td style="color:var(--amber)">'+item.commendations+'</td></tr>';
  }).join('');

  return '<div class="rating-board"><h3>Technician Leaderboard</h3>'+
    '<table class="data-table"><thead><tr><th>Technician</th><th>Trade</th><th>Rating</th><th>Reviews</th><th>Commendations</th></tr></thead><tbody>'+
    rows+'</tbody></table></div>';
}

// ── Navigation ─────────────────────────────────────────────
function navigateTo(id){
  $$('.content-pane').forEach(function(p){p.classList.remove('active');});
  $$('.nav-item').forEach(function(n){n.classList.remove('active');});
  var pane=$(id);if(pane)pane.classList.add('active');
  var nav=document.querySelector('[data-target="'+id+'"]');if(nav)nav.classList.add('active');
}

// ── Auth ───────────────────────────────────────────────────
function switchTab(tab){
  $('form-login-pane').classList.toggle('active',tab==='login');
  $('form-signup-pane').classList.toggle('active',tab==='signup');
  $('tab-login').classList.toggle('active',tab==='login');
  $('tab-signup').classList.toggle('active',tab==='signup');
}
function toggleSignupFields(){
  var r=$('auth-signup-role').value;
  $('signup-dept-field').style.display=r==='technician'?'none':'';
  $('signup-trade-field').style.display=r==='technician'?'':'none';
}
async function doLogin(){
  var phone=normPhone($('auth-phone').value);
  var pin=$('auth-pin').value;
  if(!phone||!pin)return toast('Enter phone and PIN.','error');
  var ph=await sha256(pin);
  // Try localStorage
  var local=JSON.parse(localStorage.getItem('nita_users')||'{}');
  
  // Default PIN 1234 works for any phone number
  if(pin==='1234'||pin==='123456'){
    if(!local[phone]){
      local[phone]={phone_number:phone,full_name:'User '+phone.slice(-4),role:'coordinator',pin_hash:ph,created_at:new Date().toISOString(),user_id:phone};
      localStorage.setItem('nita_users',JSON.stringify(local));
    }
    session={user:local[phone],role:local[phone].role||'coordinator',userId:phone};
    localStorage.setItem('nita_session',JSON.stringify(session));
    $('auth-overlay').classList.add('hidden');updateUI();loadAll();toast('Welcome back!','success');return;
  }

  if(local[phone]&&local[phone].pin_hash===ph){
    session={user:local[phone],role:local[phone].role,userId:phone};
    localStorage.setItem('nita_session',JSON.stringify(session));
    $('auth-overlay').classList.add('hidden');updateUI();loadAll();toast('Welcome back!','success');return;
  }
  // Try NITA API
  try{
    var d=await API.post('/api-task-lifecycle',{action:'auth_check',phone_number:phone,pin_hash:ph});
    if(d&&!d.error){
      session={user:{full_name:d.full_name||'User',role:d.role||'coordinator',phone_number:phone,user_id:phone},role:d.role||'coordinator',userId:phone};
      localStorage.setItem('nita_session',JSON.stringify(session));
      $('auth-overlay').classList.add('hidden');updateUI();loadAll();toast('Welcome!','success');return;
    }
  }catch(e){}
  toast('Invalid credentials. Default PIN is 1234.','error');
}
async function doSignup(){
  var name=$('auth-signup-name').value.trim();
  var phone=normPhone($('auth-signup-phone').value);
  var role=$('auth-signup-role').value;
  var pin=$('auth-signup-pin').value;
  if(!name||!phone||!pin)return toast('All fields required.','error');
  if(pin.length<4||pin.length>6)return toast('PIN must be 4-6 digits.','error');
  if(name.length<2)return toast('Name too short.','error');
  var ph=await sha256(pin);
  var local=JSON.parse(localStorage.getItem('nita_users')||'{}');
  if(local[phone])return toast('Account exists. Sign in.','error');
  local[phone]={phone_number:phone,full_name:name,role:role,pin_hash:ph,created_at:new Date().toISOString(),user_id:phone};
  localStorage.setItem('nita_users',JSON.stringify(local));
  // Try Supabase insert
  try{await supaInsert('app_user',{full_name:name,phone_number:phone,role:role,pin_hash:ph});}catch(e){}
  toast('Account created! Sign in.','success');switchTab('login');
}
function doLogout(){session=null;localStorage.removeItem('nita_session');location.reload();}
function updateUI(){
  if(!session)return;
  var u=session.user;
  var inits=(u.full_name||'U').split(' ').map(function(n){return n[0]}).join('').toUpperCase().slice(0,2);
  $('current-user-avatar').textContent=inits;
  $('current-user-name').textContent=u.full_name||'User';
  $('current-user-role').textContent=session.role;
  if(session.role==='technician'){
    $('menu-technician-tasks').style.display='';
    $('menu-coordinator-dash').style.display='none';
    $('menu-planning-breakdown').style.display='none';
    $('menu-tasks-to-approve').style.display='none';
  }
  // Set profile language
  var lang=u.preferred_language||'en';
  var pl=$('prof-lang');if(pl)pl.value=lang;
}

// ── Task Actions ───────────────────────────────────────────
function selectDept(id){
  $$('.data-table tr.active').forEach(function(r){r.classList.remove('active');});
  var row=document.querySelector('[data-dept="'+id+'"]');if(row)row.classList.add('active');
  var d=deptMap[id];if(d){$('fm-detail-dept-name').textContent=d.name;$('fm-detail-dept-loc').textContent='—';}
}
function selectTask(id){
  $$('.data-table tr.selected').forEach(function(r){r.classList.remove('selected');});
  var row=document.querySelector('[data-id="'+id+'"]');if(row)row.closest('tr').classList.add('selected');
}
async function approveTask(id){
  if(!confirm('Approve this task?'))return;
  try{
    await supaUpdate('task_request',{task_request_id:id},{status:'approved',approved_at:new Date().toISOString()});
    await loadAll();toast('Task approved!','success');
  }catch(e){toast('Approve failed: '+e.message,'error');}
}
async function rejectTask(id){
  var reason=prompt('Rejection reason:');if(!reason)return;
  try{
    await supaUpdate('task_request',{task_request_id:id},{status:'rejected',rejection_reason:reason});
    await loadAll();toast('Task rejected.','info');
  }catch(e){toast('Reject failed: '+e.message,'error');}
}
async function dispatchTask(id){
  var techId=prompt('Enter technician_id to assign:');if(!techId)return;
  try{
    await supaInsert('work_order',{task_request_id:id,status:'pending',priority:'medium',created_at:new Date().toISOString()});
    toast('Work order created!','success');await loadAll();
  }catch(e){toast('Dispatch failed: '+e.message,'error');}
}
async function updateWorkOrder(id){
  var status=prompt('New status (pending/in_progress/completed):');if(!status)return;
  try{
    var body={status:status};if(status==='completed')body.completed_at=new Date().toISOString();
    await supaUpdate('work_order',{work_order_id:id},body);
    toast('Work order updated!','success');await loadAll();
  }catch(e){toast('Update failed: '+e.message,'error');}
}
function resetAllWorkOrders(){
  if(!confirm('Reset all work orders?'))return;
  workOrders=[];renderAll();toast('Work orders cleared.','info');
}

// ── Create Task (Operator) ─────────────────────────────────
async function createTask(){
  var assetCode=$('te-asset-code').value.trim();
  var desc=$('te-description').value.trim();
  var urgency=$('te-urgency').value;
  if(!assetCode||!desc)return toast('Asset code and description required.','error');
  var asset=assetMap[assetCode];
  if(!asset)return toast('Asset not found. Check code.','error');
  var priority=urgency==='0'?'critical':urgency==='1'?'high':'medium';
  var taskType=urgency==='2'?'improvement':'repair';
  try{
    var r=await supaInsert('task_request',{
      asset_id:asset.asset_id,created_by_user_id:session.userId,status:'pending',
      priority:priority,requested_at:new Date().toISOString(),description:desc,
      task_type:taskType,required_trade:asset.required_trade||'general',
      created_by_role:session.role
    });
    toast('Task created! Waiting for approval.','success');
    $('te-asset-code').value='';$('te-asset-name').value='';$('te-description').value='';
    await loadAll();
  }catch(e){toast('Create failed: '+e.message,'error');}
}

// ── Rating & Commendation ──────────────────────────────────
function showRatingDialog(workOrderId,technicianId){
  var existing=$('rating-dialog');if(existing)existing.remove();
  var dlg=document.createElement('div');dlg.id='rating-dialog';dlg.className='modal-overlay';
  dlg.innerHTML=
    '<div class="modal-card">'+
      '<h3>Rate This Technician</h3>'+
      '<div class="star-select" id="star-select">'+
        '<span class="star" data-val="1">★</span><span class="star" data-val="2">★</span>'+
        '<span class="star" data-val="3">★</span><span class="star" data-val="4">★</span>'+
        '<span class="star" data-val="5">★</span>'+
      '</div>'+
      '<label class="field-label">Comment (optional)</label>'+
      '<textarea class="field-input" id="rating-comment" rows="3" placeholder="How did they do?"></textarea>'+
      '<label class="field-check"><input type="checkbox" id="rating-commend"> Commend for excellent work</label>'+
      '<div class="modal-actions">'+
        '<button class="btn-outline" onclick="$(\'rating-dialog\').remove()">Cancel</button>'+
        '<button class="btn-primary" onclick="submitRating(\''+esc(workOrderId)+'\',\''+esc(technicianId)+'\')">Submit</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(dlg);
  var stars=dlg.querySelectorAll('.star');
  var selectedVal=0;
  stars.forEach(function(s){
    s.addEventListener('click',function(){
      selectedVal=parseInt(s.getAttribute('data-val'));
      stars.forEach(function(st){st.classList.toggle('active',parseInt(st.getAttribute('data-val'))<=selectedVal);});
    });
    s.addEventListener('mouseenter',function(){
      var val=parseInt(s.getAttribute('data-val'));
      stars.forEach(function(st){st.classList.toggle('hover',parseInt(st.getAttribute('data-val'))<=val);});
    });
    s.addEventListener('mouseleave',function(){
      stars.forEach(function(st){st.classList.remove('hover');});
    });
  });
  dlg._selectedRating=function(){return selectedVal;};
}
async function submitRating(workOrderId,technicianId){
  var dlg=$('rating-dialog');if(!dlg)return;
  var rating=dlg._selectedRating();
  if(!rating)return toast('Select a rating.','error');
  var comment=$('rating-comment').value.trim();
  var commend=$('rating-commend').checked;
  try{
    await supaInsert('work_order_feedback',{
      work_order_id:workOrderId,technician_id:technicianId,rating:rating,
      comment:comment,commendation:commend,created_by_user_id:session.userId,
      created_at:new Date().toISOString()
    });
    dlg.remove();
    toast(commend?'Commendation sent! Great work!':'Rating submitted!','success');
    await loadAll();
  }catch(e){toast('Rating failed: '+e.message,'error');}
}

// ── WhatsApp Simulator ─────────────────────────────────────
function loadScenario(type){
  var chat=$('chat-messages');var log=$('console-logs');if(!chat)return;
  var scenarios={
    critical_leak:{msg:'URGENT: Grinding noise on Circular Knitter CK-8, production line stopped!',priority:'critical'},
    urgent_tension:{msg:'Gerber cutter belt slipping on Row 1, tension inconsistent.',priority:'high'},
    normal_cosmetic:{msg:'Office door latch is broken, needs replacement.',priority:'medium'}
  };
  var s=scenarios[type];if(!s)return;
  var now=new Date().toLocaleTimeString();
  chat.innerHTML+='<div class="bubble incoming"><div class="bubble-text">'+esc(s.msg)+'</div><div class="bubble-time">'+now+'</div></div>';
  chat.scrollTop=chat.scrollHeight;
  log.innerHTML+='<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-info">Scenario: '+type+' ('+s.priority+')</span></div>';
  log.innerHTML+='<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-success">NITA: Analyzing priority and required trade...</span></div>';
  log.scrollTop=log.scrollHeight;
}
var whatsappBotState = { awaitingDetails: false };

function sendChatMessage(){
  var input=$('chat-user-input');var chat=$('chat-messages');if(!input||!input.value.trim())return;
  var now=new Date().toLocaleTimeString();
  var msg=input.value.trim();
  input.value='';
  chat.innerHTML+='<div class="bubble outgoing"><div class="bubble-text">'+esc(msg)+'</div><div class="bubble-time">'+now+'</div></div>';
  chat.scrollTop=chat.scrollHeight;
  
  var log=$('console-logs');
  if(log) log.innerHTML+='<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-info">User: '+esc(msg)+'</span></div>';

  var lower=msg.toLowerCase();

  // 1. Check for simple greetings or short acknowledgements
  var isGreeting = /^(hi|hello|hey|bonjour|nita|hi nita|hey nita|salut)\b/i.test(lower) && msg.length < 20;

  if (isGreeting) {
    whatsappBotState.awaitingDetails = true;
    if(log) log.innerHTML+='<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-info">NITA: Greeting detected. Prompting operator for issue details...</span></div>';
    chat.innerHTML+='<div class="bubble incoming"><div class="bubble-text">Hello! I am the NITA Dispatch Bot. Please describe your maintenance issue (e.g., machine number, problem description, and urgency level like P0, P1, or P2) so I can log it for dispatch.</div><div class="bubble-time">'+now+'</div></div>';
    if(log) log.scrollTop=log.scrollHeight;
    chat.scrollTop=chat.scrollHeight;
    return;
  }

  // 2. Entity & Priority Extraction
  if(log) log.innerHTML+='<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-info">NITA: Processing message text with NLP entity parser...</span></div>';

  // Determine Priority: P0 (Critical), P1 (Urgent), P2 (Normal/Routine)
  var priority = 'medium';
  var priorityCode = 2;
  var priorityLabel = 'P2 NORMAL';

  if (/\bp0\b|critical|emergency|stop|gro bwi|production down|grinding/i.test(lower)) {
    priority = 'critical';
    priorityCode = 0;
    priorityLabel = 'P0 CRITICAL';
  } else if (/\bp1\b|urgent|asap|leak|water|sliding|poorly|belt|high/i.test(lower)) {
    priority = 'high';
    priorityCode = 1;
    priorityLabel = 'P1 URGENT';
  } else if (/\bp2\b|normal|routine|cosmetic|door|latch|light|paint|low/i.test(lower)) {
    priority = 'medium';
    priorityCode = 2;
    priorityLabel = 'P2 NORMAL';
  } else if (whatsappBotState.awaitingDetails || /\b(machine|macine|issue|problem|broken|fault)\b/i.test(lower)) {
    // If operator is answering prompt or mentioning a machine/issue without explicit priority tag, infer P1 Urgent
    priority = 'high';
    priorityCode = 1;
    priorityLabel = 'P1 URGENT';
  }

  // Extract Asset / Machine Number (e.g., "Macine number 39", "asset 175", "line 3", "39")
  var assetMatch = lower.match(/(?:machine|macine|asset|line|#|code)\s*#?\s*([0-9]+)/i) || lower.match(/\b([0-9]{1,4})\b/);
  var extractedAssetId = assetMatch ? assetMatch[1] : null;

  var matchedAsset = null;
  if (extractedAssetId && typeof assets !== 'undefined' && assets.length > 0) {
    matchedAsset = assets.find(function(a){ return a.asset_code === extractedAssetId || String(a.asset_id) === extractedAssetId; });
  }

  var assetName = matchedAsset ? matchedAsset.name : (extractedAssetId ? 'Machine #' + extractedAssetId : 'Circular Knitter CK-8');
  var assetCode = matchedAsset ? (matchedAsset.asset_code || matchedAsset.asset_id) : (extractedAssetId || '39');
  var realAssetId = matchedAsset ? matchedAsset.asset_id : assetCode;

  if(log) log.innerHTML+='<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-success">NITA: Slot Extracted -> Asset: '+esc(assetName)+' (ID: '+esc(assetCode)+'), Priority: '+priorityLabel+'</span></div>';

  // 3. Create Task Request Record
  var taskId = 'TR-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  var newTask = {
    task_request_id: taskId,
    asset_id: realAssetId,
    created_by_user_id: (session && session.user && session.user.full_name) ? session.user.full_name : 'Operator Priya',
    created_by_role: 'Operator',
    status: 'pending',
    priority: priorityCode === 0 ? 'critical' : (priorityCode === 1 ? 'high' : 'medium'),
    requested_at: new Date().toISOString(),
    description: msg,
    task_type: 'New Task'
  };

  if (typeof taskRequests !== 'undefined') {
    taskRequests.unshift(newTask);
    if (typeof rebuildCaches === 'function') rebuildCaches();
    if (typeof renderAll === 'function') renderAll();
  }

  if (typeof supaInsert === 'function') {
    supaInsert('task_request', newTask).catch(function(e){});
  }

  // 4. Dispatch WhatsApp Confirmation Response
  var replyText = '';
  if (priorityCode === 0) {
    replyText = '🚨 **P0 CRITICAL** task created for ' + assetName + '. Line operator advised to STOP. Mechanic dispatched immediately (Ref #' + taskId.slice(0,8) + ').';
    if(log) log.innerHTML+='<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-warn">NITA: Escalating to P0 CRITICAL. Dispatching mechanic...</span></div>';
  } else if (priorityCode === 1) {
    replyText = '⚠️ **P1 URGENT** task created for ' + assetName + '. Request #' + taskId.slice(0,8) + ' logged and submitted to Coordinator Dashboard for approval.';
    if(log) log.innerHTML+='<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-success">NITA: Logged P1 Urgent task request #' + taskId.slice(0,8) + '.</span></div>';
  } else {
    replyText = 'ℹ️ Routine **P2 Normal** task request #' + taskId.slice(0,8) + ' logged for ' + assetName + '. Scheduled for next maintenance window.';
    if(log) log.innerHTML+='<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-info">NITA: Logged P2 routine task request.</span></div>';
  }

  chat.innerHTML+='<div class="bubble incoming"><div class="bubble-text">'+esc(replyText)+'</div><div class="bubble-time">'+now+'</div></div>';
  whatsappBotState.awaitingDetails = false;

  if(log) log.scrollTop=log.scrollHeight;
  chat.scrollTop=chat.scrollHeight;
}
function clearConsole(){var c=$('console-logs');if(c)c.innerHTML='';}

// ── API Sandbox ────────────────────────────────────────────
function runApiRequest(){
  var sel=$('api-endpoint-selector');var viewer=$('api-response-json');if(!sel||!viewer)return;
  viewer.textContent='Loading...';
  var endpoint=sel.value;
  var params={};
  if(endpoint==='api-assets')params.code='39';
  if(endpoint==='api-find-asset'){params.location='Knitting';params.keyword='Circular';}
  if(endpoint==='api-technicians'||endpoint==='api-recommend-technician')params.trade='mechanic';
  if(endpoint==='api-technician-daily-tasks'||endpoint==='api-next-task')params.technician_id=session?session.userId:'';
  if(endpoint==='api-admin-read')params.table='department';

  API.get('/'+endpoint,params).then(function(d){
    viewer.textContent=JSON.stringify(d,null,2);
  }).catch(function(e){
    viewer.textContent='Error: '+e.message+'\n\nThis endpoint may require POST method or different parameters.';
  });
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',function(){
  // Session restore
  try{session=JSON.parse(localStorage.getItem('nita_session'));if(session){$('auth-overlay').classList.add('hidden');updateUI();}}catch(e){session=null;}
  // i18n
  if(window.NITA_I18N)NITA_I18N.init();
  // Hamburger
  var ham=$('hamburger-btn');var sb=document.querySelector('.sidebar');var ov=$('sidebar-overlay');
  function openSb(){sb.classList.add('open');ov.classList.add('active');}
  function closeSb(){sb.classList.remove('open');ov.classList.remove('active');}
  if(ham)ham.addEventListener('click',function(){sb.classList.contains('open')?closeSb():openSb();});
  if(ov)ov.addEventListener('click',closeSb);
  // Nav
  $$('.nav-item').forEach(function(n){
    n.addEventListener('click',function(){
      var t=n.getAttribute('data-target');if(t){navigateTo(t);if(window.innerWidth<=1024)closeSb();}
    });
  });
  // DB nav
  $$('.db-item').forEach(function(d){
    d.addEventListener('click',function(){$$('.db-item').forEach(function(i){i.classList.remove('active');});d.classList.add('active');renderDbTables();});
  });
  // Doc nav
  $$('.doc-toc-item').forEach(function(d){
    d.addEventListener('click',function(){$$('.doc-toc-item').forEach(function(i){i.classList.remove('active');});d.classList.add('active');});
  });
  // Auth
  $('btn-login-submit').addEventListener('click',doLogin);
  $('btn-signup-submit').addEventListener('click',doSignup);
  $('btn-logout').addEventListener('click',doLogout);
  // Auth enter key
  $('auth-pin').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});
  // WhatsApp
  $('btn-send-message').addEventListener('click',sendChatMessage);
  $('chat-user-input').addEventListener('keydown',function(e){if(e.key==='Enter')sendChatMessage();});
  // API
  $('btn-run-api').addEventListener('click',runApiRequest);
  $('api-endpoint-selector').addEventListener('change',function(){$('api-url-input').value=NITA_CONFIG.NITA_API_URL+'/'+this.value;});
  // Task create
  var createBtn=$('btn-te-create');if(createBtn)createBtn.addEventListener('click',createTask);
  // Asset code lookup
  var codeInput=$('te-asset-code');if(codeInput)codeInput.addEventListener('blur',function(){
    var a=assetMap[this.value.trim()];if(a){
      $('te-asset-name').value=a.name||'';$('te-asset-type').value=a.required_trade||'';
      $('te-asset-loc').value=a.location||'';
    }
  });
  // Window resize
  window.addEventListener('resize',function(){if(window.innerWidth>1024){document.querySelector('.sidebar').classList.remove('open');$('sidebar-overlay').classList.remove('active');}});
  // Load
  if(session){loadUsers().then(function(){loadAll();});}
});