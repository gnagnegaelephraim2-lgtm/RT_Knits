// ============================================================
// NITA CMMS — Full Interactive & Responsive Application
// ============================================================

// ── Utilities ──────────────────────────────────────────────
function esc(s){if(s==null)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function $(id){return document.getElementById(id);}
function $$(s){return document.querySelectorAll(s);}
function uid(p){var a=new Uint8Array(8);crypto.getRandomValues(a);return (p||'tr')+'-'+Array.from(a,function(b){return b.toString(16).padStart(2,'0')}).join('');}
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
var currentBreakdownTab='leakage';
var selectedBreakdownTaskId=null;
var selectedDeptId=null;
var currentTaskFilter='all';
var messageLogs=[],conversationStates=[],allUsers={};
var selectedConvPhone=null, convFilterRole='all', simChatHistory=[];

// ── Theme Management ───────────────────────────────────────
function initTheme(){
  var saved=localStorage.getItem('nita_theme');
  if(saved){
    document.documentElement.setAttribute('data-theme',saved);
  }else{
    var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme',prefersDark?'dark':'dark');
  }
}
function toggleTheme(){
  var current=document.documentElement.getAttribute('data-theme');
  var next=current==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  localStorage.setItem('nita_theme',next);
}
initTheme();

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

// ── Default Mock Seeding (ensures rich interactive UI) ─────
function seedDefaultDepartments(){
  departments=[
    {department_id:'dept-knit', name:'Knitting Floor', location:'Building A - Level 1'},
    {department_id:'dept-cut', name:'Cutting Department', location:'Building A - Level 2'},
    {department_id:'dept-dye', name:'Dyeing & Finishing', location:'Building B - Ground'},
    {department_id:'dept-sew', name:'Sewing Assembly', location:'Building B - Level 1'},
    {department_id:'dept-util', name:'Utilities & Energy Room', location:'Building C - Basement'}
  ];
}
function seedDefaultAssets(){
  assets=[
    {asset_id:'ast-39', asset_code:'39', name:'Circular Knitter — Brother CK-8', status:'operational', location:'Knitting Floor, Row 3', required_trade:'Mechanic'},
    {asset_id:'ast-175', asset_code:'175', name:'Cutting Machine — Gerber Z1', status:'breakdown', location:'Cutting Department, Row 1', required_trade:'Electrician'},
    {asset_id:'ast-88', asset_code:'88', name:'Industrial Dye Vat — Thies 500', status:'operational', location:'Dyeing Floor, Line 2', required_trade:'Plumber'},
    {asset_id:'ast-204', asset_code:'204', name:'Compressor — Atlas Copco GA37', status:'warning', location:'Utilities Room, Row 2', required_trade:'HVAC'},
    {asset_id:'ast-102', asset_code:'102', name:'Overlock Sewing Unit — Juki MO-6800', status:'operational', location:'Sewing Line B', required_trade:'Mechanic'}
  ];
}
function seedDefaultTechnicians(){
  technicians=[
    {technician_id:'tech-1', user_id:'usr-tech-1', full_name:'Jean-Luc Picaut', trade:'Mechanic', active:true},
    {technician_id:'tech-2', user_id:'usr-tech-2', full_name:'Devanand Ramgoolam', trade:'Electrician', active:true},
    {technician_id:'tech-3', user_id:'usr-tech-3', full_name:'Kavita Seesaghur', trade:'Plumber', active:true},
    {technician_id:'tech-4', user_id:'usr-tech-4', full_name:'Alain Baret', trade:'HVAC', active:true},
    {technician_id:'tech-5', user_id:'usr-tech-5', full_name:'Rajesh Jugnauth', trade:'General Maintenance', active:true}
  ];
}
function seedDefaultAdminUser(){
  var local=JSON.parse(localStorage.getItem('nita_users')||'{}');
  if(!local['+23050000000']){
    local['+23050000000']={
      phone_number:'+23050000000',
      full_name:'System Admin',
      role:'admin',
      pin_hash:'',
      created_at:new Date().toISOString(),
      user_id:'+23050000000'
    };
    localStorage.setItem('nita_users',JSON.stringify(local));
  }
}
function seedDefaultTaskRequests(){
  var iso = new Date().toISOString();
  taskRequests=[
    {
      task_request_id:'336225e2', asset_id:'ast-39', created_by_user_id:'91e2fdbe-c670-4323-b1d3-a38462583ad5',
      created_by_role:'Operator', status:'pending', priority:'critical', requested_at:iso,
      description:'Operator requests inspection — machine running but overheating noticed', task_type:'repair', required_trade:'Mechanic'
    },
    {
      task_request_id:'4a111242', asset_id:'ast-175', created_by_user_id:'065dd6b1-21d0-4298-a3a9-62018414bf9c',
      created_by_role:'Operator', status:'pending', priority:'critical', requested_at:iso,
      description:'Machine fully stopped — electrical fault reported, multiple bugs observed', task_type:'repair', required_trade:'Electrician'
    },
    {
      task_request_id:'8d114b41', asset_id:'ast-204', created_by_user_id:'91e2fdbe-c670-4323-b1d3-a38462583ad5',
      created_by_role:'Operator', status:'pending', priority:'critical', requested_at:iso,
      description:'Red warning light showing, machine has stopped running', task_type:'repair', required_trade:'HVAC'
    },
    {
      task_request_id:'7f289a10', asset_id:'ast-88', created_by_user_id:'065dd6b1-21d0-4298-a3a9-62018414bf9c',
      created_by_role:'Operator', status:'approved', priority:'high', requested_at:iso,
      description:'Water supply pressure fluctuation detected on dye vat line', task_type:'repair', required_trade:'Plumber'
    },
    {
      task_request_id:'9e451b03', asset_id:'ast-102', created_by_user_id:'91e2fdbe-c670-4323-b1d3-a38462583ad5',
      created_by_role:'Operator', status:'approved', priority:'medium', requested_at:iso,
      description:'Routine needle timing adjustment and tension check', task_type:'improvement', required_trade:'Mechanic'
    }
  ];
}
function seedDefaultWorkOrders(){
  var now = new Date().toISOString();
  workOrders=[
    {
      work_order_id:'wo-7f289a10', task_request_id:'7f289a10', status:'in_progress', priority:'high',
      scheduled_start:now, created_at:now, recommended_technician_id:'tech-3', recommendation_reason:'Plumbing trade match'
    },
    {
      work_order_id:'wo-9e451b03', task_request_id:'9e451b03', status:'pending', priority:'medium',
      scheduled_start:now, created_at:now, recommended_technician_id:'tech-1', recommendation_reason:'Mechanic trade match'
    }
  ];
}
function seedDefaultsIfEmpty(){
  if(!departments.length) seedDefaultDepartments();
  if(!assets.length) seedDefaultAssets();
  if(!technicians.length) seedDefaultTechnicians();
  if(!taskRequests.length) seedDefaultTaskRequests();
  if(!workOrders.length) seedDefaultWorkOrders();
  seedDefaultAdminUser();
}

// ── Data Loading ───────────────────────────────────────────
async function loadAll(){
  try{
    var r=await Promise.allSettled([
      supa('department'),supa('asset'),supa('technician'),
      supa('task_request','order=requested_at.desc&limit=100'),supa('work_order','order=created_at.desc&limit=100'),
      supa('work_order_feedback','order=created_at.desc&limit=50'),supa('app_user'),
      supa('message_log','order=created_at.desc&limit=500'),supa('conversation_state')
    ]);
    if(r[0].status==='fulfilled' && r[0].value && r[0].value.length) departments=r[0].value; else seedDefaultDepartments();
    if(r[1].status==='fulfilled' && r[1].value && r[1].value.length) assets=r[1].value; else seedDefaultAssets();
    if(r[2].status==='fulfilled' && r[2].value && r[2].value.length) technicians=r[2].value; else seedDefaultTechnicians();
    if(r[3].status==='fulfilled' && r[3].value && r[3].value.length) taskRequests=r[3].value; else seedDefaultTaskRequests();
    if(r[4].status==='fulfilled' && r[4].value && r[4].value.length) workOrders=r[4].value; else seedDefaultWorkOrders();
    if(r[5].status==='fulfilled' && r[5].value) feedbacks=r[5].value||[];
    // Build user cache from app_user table
    if(r[6].status==='fulfilled' && r[6].value){
      r[6].value.forEach(function(u){
        allUsers[u.user_id]=u;
        allUsers[u.phone_number]=u;
      });
    }
    if(r[7].status==='fulfilled' && r[7].value) messageLogs=r[7].value||[];
    if(r[8].status==='fulfilled' && r[8].value) conversationStates=r[8].value||[];
  }catch(e){
    console.error('loadAll error, seeding defaults:',e);
    seedDefaultsIfEmpty();
  }
  rebuildCaches();
  buildUserCache();
  renderAll();
}

function rebuildCaches(){
  assetMap={};assetIdMap={};deptMap={};techMap={};
  assets.forEach(function(a){assetMap[a.asset_code]=a;if(a.asset_id)assetIdMap[a.asset_id]=a;});
  departments.forEach(function(d){deptMap[d.department_id]=d;});
  technicians.forEach(function(t){techMap[t.technician_id]=t;});
}

function buildUserCache(){
  allUsers={};
  var session2=JSON.parse(localStorage.getItem('nita_session')||'null');
  if(session2&&session2.user){
    allUsers[session2.user.phone_number]=session2.user;
  }
  var localUsers=JSON.parse(localStorage.getItem('nita_users')||'{}');
  Object.keys(localUsers).forEach(function(k){allUsers[k]=localUsers[k];});
  if(typeof users!=='undefined'){
    Object.keys(users).forEach(function(k){allUsers[k]=users[k];});
  }
}

function getRoleForPhone(phone){
  var u=allUsers[phone];
  if(u&&u.role) return u.role;
  return 'unknown';
}

function getNameForPhone(phone){
  var u=allUsers[phone];
  if(u&&u.full_name) return u.full_name;
  return phone||'Unknown';
}

function getConversationGroups(){
  var groups={};
  messageLogs.forEach(function(msg){
    var phone=msg.phone_number;
    if(!phone)return;
    // Normalize message fields for real Supabase schema
    var normalizedMsg={
      phone_number:msg.phone_number,
      message_direction:msg.direction||msg.message_direction||'inbound',
      message_type:msg.message_type||'text',
      message_content:msg.content||msg.message_content||'',
      translated_content:msg.translated_content||null,
      meta_data:msg.metadata||msg.meta_data||null,
      created_at:msg.created_at||msg.timestamp||'',
      user_id:msg.user_id||null,
      user_name:msg.user_name||null
    };
    if(!groups[phone]) groups[phone]={phone:phone,messages:[],role:getRoleForPhone(phone),name:msg.user_name||getNameForPhone(phone)};
    groups[phone].messages.push(normalizedMsg);
  });
  simChatHistory.forEach(function(msg){
    var phone=msg.phone_number||'sim-'+(session?session.userId:'local');
    if(!groups[phone]) groups[phone]={phone:phone,messages:[],role:getRoleForPhone(phone),name:getNameForPhone(phone)};
    groups[phone].messages.push(msg);
  });

  // Add work order communications as synthetic messages for coordinator-technician threads
  workOrders.forEach(function(wo){
    var tr=taskRequests.find(function(t){return t.task_request_id===wo.task_request_id;})||{};
    var tech=technicians.find(function(t){return t.technician_id===wo.recommended_technician_id;});
    if(!tech)return;
    var phone=tech.user_id||'tech-'+tech.technician_id;
    var techName=tech.full_name||'Technician';
    var a=assetIdMap[tr.asset_id]||{};

    if(!groups[phone]) groups[phone]={phone:phone,messages:[],role:'technician',name:techName};

    // Coordinator dispatch message
    groups[phone].messages.push({
      phone_number:phone,
      message_direction:'outbound',
      message_type:'text',
      message_content:'Work Order dispatched: '+esc(a.name||'Asset')+' — Priority: '+getPriorityShort(wo.priority||tr.priority)+'. '+esc(tr.description||''),
      created_at:wo.created_at||wo.scheduled_start||new Date().toISOString(),
      source:'work_order',
      work_order_id:wo.work_order_id
    });

    // Technician status update
    if(wo.status==='in_progress'){
      groups[phone].messages.push({
        phone_number:phone,
        message_direction:'inbound',
        message_type:'text',
        message_content:'Started working on '+esc(a.name||'Asset')+'. Estimating completion shortly.',
        created_at:wo.scheduled_start||new Date().toISOString(),
        source:'work_order_status',
        work_order_id:wo.work_order_id
      });
    }
    if(wo.status==='completed'){
      groups[phone].messages.push({
        phone_number:phone,
        message_direction:'inbound',
        message_type:'text',
        message_content:'Completed work on '+esc(a.name||'Asset')+'. Job done.',
        created_at:wo.completed_at||new Date().toISOString(),
        source:'work_order_status',
        work_order_id:wo.work_order_id
      });
    }
  });

  // Add task request submissions from operators/coordinators as messages
  taskRequests.forEach(function(tk){
    var creatorPhone=tk.created_by_user_id;
    if(!creatorPhone)return;
    var role=tk.created_by_role||'operator';
    var creatorName=getFullNameForUserId(creatorPhone);
    if(!groups[creatorPhone]) groups[creatorPhone]={phone:creatorPhone,messages:[],role:role,name:creatorName};
    var a=assetIdMap[tk.asset_id]||{};
    var statusText=tk.status==='pending'?'Request submitted':tk.status==='approved'?'Request approved':tk.status==='completed'?'Task completed':tk.status==='rejected'?'Request rejected':'Status updated';
    groups[creatorPhone].messages.push({
      phone_number:creatorPhone,
      message_direction:'outbound',
      message_type:'text',
      message_content:'['+statusText+'] '+esc(a.name||'Asset')+' — '+esc(tk.description||''),
      created_at:tk.requested_at||new Date().toISOString(),
      source:'task_request',
      task_request_id:tk.task_request_id
    });
  });

  var arr=Object.values(groups);
  arr.sort(function(a,b){
    var aLast=a.messages.length?a.messages[a.messages.length-1].created_at||a.messages[a.messages.length-1].timestamp:'';
    var bLast=b.messages.length?b.messages[b.messages.length-1].created_at||b.messages[b.messages.length-1].timestamp:'';
    return bLast.localeCompare(aLast);
  });
  return arr;
}

function renderConversations(){
  var list=getConversationGroupsFiltered();
  var search=$('conv-search');
  var query=search?search.value.toLowerCase().trim():'';
  if(query){
    list=list.filter(function(g){
      return (g.phone||'').toLowerCase().includes(query)||
             (g.name||'').toLowerCase().includes(query)||
             g.messages.some(function(m){return(m.message_content||m.text||'').toLowerCase().includes(query);});
    });
  }
  var el=$('conv-list');
  var badge=$('conv-count-badge');
  if(badge) badge.textContent=list.length;
  if(!el)return;
  if(!list.length){
    el.innerHTML='<div class="conv-empty" data-i18n="conv_no_messages">No conversations found</div>';
    return;
  }
  el.innerHTML=list.map(function(g){
    var lastMsg=g.messages[g.messages.length-1];
    var content=lastMsg.message_content||lastMsg.text||'';
    var ts=lastMsg.created_at||lastMsg.timestamp||'';
    var isActive=selectedConvPhone===g.phone;
    var initials=g.name?g.name.split(' ').map(function(w){return w[0]}).join('').toUpperCase().slice(0,2):'??';
    var roleClass='role-'+g.role;
    var hasWO=g.messages.some(function(m){return m.source==='work_order'||m.source==='work_order_status';});
    var woIndicator=hasWO?'<span class="conv-item-wo-badge" title="Contains work order messages">WO</span>':'';
    return '<div class="conv-item'+(isActive?' active':'')+'" onclick="selectConversation(\''+esc(g.phone)+'\')">'+
      '<div class="conv-item-avatar '+roleClass+'">'+esc(initials)+'</div>'+
      '<div class="conv-item-info">'+
        '<div class="conv-item-top">'+
          '<span class="conv-item-name">'+esc(g.name||g.phone)+'</span>'+
          '<span class="conv-item-time">'+esc(ago(ts))+'</span>'+
        '</div>'+
        '<div class="conv-item-preview">'+esc(content.slice(0,60))+'</div>'+
        '<span class="conv-item-role '+roleClass+'">'+esc(g.role)+'</span> '+woIndicator+
      '</div>'+
      '<div class="conv-item-badge">'+g.messages.length+'</div>'+
    '</div>';
  }).join('');
}

function selectConversation(phone){
  selectedConvPhone=phone;
  renderConversations();
  renderConversationThread(phone);
}

function renderConversationThread(phone){
  var groups=getConversationGroups();
  var group=groups.find(function(g){return g.phone===phone;});
  var header=$('conv-thread-header');
  var body=$('conv-thread-body');
  var stats=$('conv-thread-stats');
  var nameEl=$('conv-thread-name');
  var subEl=$('conv-thread-sub');
  var avatarEl=$('conv-thread-avatar');
  if(!group){
    if(nameEl) nameEl.textContent='Select a conversation';
    if(subEl) subEl.textContent='Choose from the list on the left';
    if(avatarEl) avatarEl.textContent='—';
    if(body) body.innerHTML='<div class="conv-empty" style="padding:60px 20px;text-align:center"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5" style="margin:0 auto 16px;display:block"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><div style="color:var(--text-3);font-size:14px">Select a conversation from the list to view messages</div></div>';
    if(stats) stats.innerHTML='';
    return;
  }
  var initials=group.name?group.name.split(' ').map(function(w){return w[0]}).join('').toUpperCase().slice(0,2):'??';
  if(avatarEl){
    avatarEl.textContent=initials;
    avatarEl.className='conv-thread-avatar';
    avatarEl.classList.add('role-'+group.role);
  }
  if(nameEl) nameEl.textContent=group.name||group.phone;
  if(subEl) subEl.textContent=group.messages.length+' messages · '+group.role;
  var sorted=group.messages.slice().sort(function(a,b){
    var aTs=a.created_at||a.timestamp||'';
    var bTs=b.created_at||b.timestamp||'';
    return aTs.localeCompare(bTs);
  });
  var inboundCount=0,outboundCount=0;
  if(body){
    body.innerHTML=sorted.map(function(msg){
      var dir=msg.message_direction||msg.direction||'inbound';
      var content=msg.message_content||msg.text||'';
      var translation=msg.translated_content||'';
      var ts=msg.created_at||msg.timestamp||'';
      var type=msg.message_type||'text';
      var meta=msg.meta_data||msg.metadata||null;
      var source=msg.source||'';
      var sourceLabel='';
      if(source==='work_order') sourceLabel='<span class="conv-msg-type" style="background:var(--accent-dim);color:var(--accent-light)">Work Order</span>';
      else if(source==='work_order_status') sourceLabel='<span class="conv-msg-type" style="background:var(--green-dim);color:var(--green)">Status Update</span>';
      else if(source==='task_request') sourceLabel='<span class="conv-msg-type" style="background:var(--amber-dim);color:var(--amber)">Task Request</span>';
      if(dir==='inbound') inboundCount++; else outboundCount++;
      var metaHtml='';
      if(meta&&typeof meta==='object'&&Object.keys(meta).length){
        metaHtml='<div class="conv-msg-meta">'+esc(JSON.stringify(meta))+'</div>';
      }
      var transHtml=translation?'<div class="conv-msg-translation">Translated: '+esc(translation)+'</div>':'';
      var typeBadge=type!=='text'?'<span class="conv-msg-type">'+esc(type)+'</span>':'';
      return '<div class="conv-msg '+esc(dir)+'">'+
        '<div class="conv-msg-direction">'+(dir==='inbound'?'↑ Inbound':'↓ Outbound')+' '+typeBadge+' '+sourceLabel+'</div>'+
        '<div class="conv-msg-content">'+esc(content)+'</div>'+
        transHtml+metaHtml+
        '<div class="conv-msg-time">'+esc(ts.replace('T',' ').slice(0,19))+'</div>'+
      '</div>';
    }).join('')||'<div class="conv-empty">No messages in this conversation</div>';
    body.scrollTop=body.scrollHeight;
  }
  if(stats){
    var workOrderCount=sorted.filter(function(m){return m.source==='work_order'||m.source==='work_order_status';}).length;
    stats.innerHTML='<div class="conv-stat"><strong>'+sorted.length+'</strong> total</div>'+
      '<div class="conv-stat"><strong>'+inboundCount+'</strong> inbound</div>'+
      '<div class="conv-stat"><strong>'+outboundCount+'</strong> outbound</div>'+
      (workOrderCount?'<div class="conv-stat"><strong>'+workOrderCount+'</strong> work order msgs</div>':'')+
      '<div class="conv-stat">Role: <strong>'+esc(group.role)+'</strong></div>'+
      '<div class="conv-stat">ID: <strong>'+esc(group.phone)+'</strong></div>';
  }
}

function setConvFilter(el,role){
  convFilterRole=role||'all';
  $$('.conv-filter').forEach(function(b){b.classList.remove('active');});
  if(el)el.classList.add('active');
  renderConversations();
}

function getConversationGroupsFiltered(){
  var list=getConversationGroups();
  if(convFilterRole==='work_orders'){
    // Show only conversations that have work order messages
    list=list.filter(function(g){
      return g.messages.some(function(m){return m.source==='work_order'||m.source==='work_order_status';});
    });
  } else if(convFilterRole!=='all'){
    list=list.filter(function(g){return g.role===convFilterRole;});
  }
  return list;
}

function filterConversationList(){
  renderConversations();
}

function captureSimChat(phone,direction,text,timestamp){
  simChatHistory.push({
    phone_number:phone,
    message_direction:direction,
    message_type:'text',
    message_content:text,
    created_at:timestamp||new Date().toISOString()
  });
}

// ── Dashboard Stats ────────────────────────────────────────
function getStats(){
  var pending=taskRequests.filter(function(t){return t.status==='pending'||t.status==='pending_approval';}).length;
  var inProgress=taskRequests.filter(function(t){return t.status==='approved'||t.status==='in_progress';}).length;
  var completed=taskRequests.filter(function(t){return t.status==='completed';}).length;
  var critical=taskRequests.filter(function(t){return t.priority==='critical'||t.priority===0;}).length;
  var high=taskRequests.filter(function(t){return t.priority==='high'||t.priority===1;}).length;
  var medium=taskRequests.filter(function(t){return t.priority==='medium'||t.priority===2;}).length;
  var activeTechs=technicians.filter(function(t){return t.active!==false;}).length;
  var totalAssets=assets.length;
  var totalDepts=departments.length;
  var totalWo=workOrders.length;
  var woInProgress=workOrders.filter(function(w){return w.status==='in_progress';}).length;
  var woCompleted=workOrders.filter(function(w){return w.status==='completed';}).length;
  var rejected=taskRequests.filter(function(t){return t.status==='rejected';}).length;
  return{
    pending:pending,inProgress:inProgress,completed:completed,rejected:rejected,
    critical:critical,high:high,medium:medium,
    activeTechs:activeTechs,total:taskRequests.length,
    totalAssets:totalAssets,totalDepts:totalDepts,
    totalWo:totalWo,woInProgress:woInProgress,woCompleted:woCompleted
  };
}

function isPriorityCritical(p){return p==='critical'||p===0;}
function isPriorityHigh(p){return p==='high'||p===1;}
function isPriorityMedium(p){return p==='medium'||p===2;}
function getPriorityBadge(p){
  if(isPriorityCritical(p)) return '<span class="badge badge-p0">P0 CRITICAL</span>';
  if(isPriorityHigh(p)) return '<span class="badge badge-p1">P1 URGENT</span>';
  return '<span class="badge badge-p2">P2 NORMAL</span>';
}
function getPriorityShort(p){
  if(isPriorityCritical(p)) return 'P0';
  if(isPriorityHigh(p)) return 'P1';
  return 'P2';
}
function getFullNameForUserId(userId){
  if(!userId) return 'Unknown';
  var user=allUsers[userId];
  if(user&&user.full_name) return user.full_name;
  return userId.slice(0,8);
}

function renderAdminDashboard(){
  var s=getStats();
  renderAdminStatsTop(s);
  renderAdminActivityFeed();
  renderAdminTechPerformance();
  renderAdminPriorityChart(s);
  renderAdminDeptStats();
}

function renderAdminStatsTop(s){
  var el=$('admin-stats-top');
  if(!el)return;
  el.innerHTML=
    '<div class="admin-stat-card"><div class="admin-stat-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="admin-stat-info"><div class="admin-stat-value" style="color:var(--red)">'+s.critical+'</div><div class="admin-stat-label">P0 Critical</div><div class="admin-stat-change '+(s.critical>0?'down':'up')+'">'+(s.critical>0?'Needs attention':'All clear')+'</div></div></div>'+
    '<div class="admin-stat-card"><div class="admin-stat-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="admin-stat-info"><div class="admin-stat-value" style="color:var(--amber)">'+s.pending+'</div><div class="admin-stat-label">Pending Approval</div><div class="admin-stat-change">Awaiting review</div></div></div>'+
    '<div class="admin-stat-card"><div class="admin-stat-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg></div><div class="admin-stat-info"><div class="admin-stat-value" style="color:var(--cyan)">'+s.woInProgress+'</div><div class="admin-stat-label">Active Dispatches</div><div class="admin-stat-change up">'+s.totalWo+' total orders</div></div></div>'+
    '<div class="admin-stat-card"><div class="admin-stat-icon accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="admin-stat-info"><div class="admin-stat-value" style="color:var(--accent-light)">'+s.activeTechs+'</div><div class="admin-stat-label">Techs On-Duty</div><div class="admin-stat-change up">'+technicians.length+' registered</div></div></div>'+
    '<div class="admin-stat-card"><div class="admin-stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="admin-stat-info"><div class="admin-stat-value" style="color:var(--green)">'+s.completed+'</div><div class="admin-stat-label">Completed</div><div class="admin-stat-change up">'+s.total+' total tasks</div></div></div>'+
    '<div class="admin-stat-card"><div class="admin-stat-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></div><div class="admin-stat-info"><div class="admin-stat-value" style="color:#a855f7">'+s.totalAssets+'</div><div class="admin-stat-label">Registered Assets</div><div class="admin-stat-change">'+s.totalDepts+' departments</div></div></div>';

  var badge=$('fm-badge-approval');if(badge)badge.textContent=s.pending;
  var adminBadge=$('admin-approval-badge');if(adminBadge)adminBadge.textContent=s.pending;
  var deptBadge=$('dept-count-badge');if(deptBadge)deptBadge.textContent=departments.length;
}

function renderAdminActivityFeed(){
  var el=$('admin-activity-feed');
  if(!el)return;
  var activities=[];

  taskRequests.slice(0,8).forEach(function(tk){
    var a=assetIdMap[tk.asset_id]||{};
    var dotColor=isPriorityCritical(tk.priority)?'red':isPriorityHigh(tk.priority)?'amber':'cyan';
    var statusText=tk.status==='pending'?'New task request submitted':tk.status==='approved'?'Task approved and dispatched':tk.status==='completed'?'Task completed':tk.status==='rejected'?'Task rejected':'Task updated';
    activities.push({
      dot:dotColor,
      text:'<strong>'+esc(a.name||'Asset')+'</strong> — '+statusText,
      time:tk.requested_at||new Date().toISOString(),
      ts:new Date(tk.requested_at||new Date().toISOString()).getTime()
    });
  });

  workOrders.slice(0,5).forEach(function(wo){
    var tr=taskRequests.find(function(t){return t.task_request_id===wo.task_request_id;})||{};
    var a=assetIdMap[tr.asset_id]||{};
    var techName=getFullNameForUserId(wo.recommended_technician_id);
    var dotColor=wo.status==='completed'?'green':wo.status==='in_progress'?'accent':'amber';
    activities.push({
      dot:dotColor,
      text:'Work order for <strong>'+esc(a.name||'Asset')+'</strong> assigned to <strong>'+esc(techName)+'</strong>',
      time:wo.created_at||new Date().toISOString(),
      ts:new Date(wo.created_at||new Date().toISOString()).getTime()
    });
  });

  activities.sort(function(a,b){return b.ts-a.ts;});
  activities=activities.slice(0,10);

  if(!activities.length){
    el.innerHTML='<div class="conv-empty">No recent activity</div>';
    return;
  }

  el.innerHTML=activities.map(function(a){
    return '<div class="admin-activity-item">'+
      '<div class="admin-activity-dot '+a.dot+'"></div>'+
      '<div><div class="admin-activity-text">'+a.text+'</div>'+
      '<div class="admin-activity-time">'+esc(ago(a.time))+'</div></div>'+
    '</div>';
  }).join('');
}

function renderAdminTechPerformance(){
  var el=$('admin-tech-performance');
  if(!el)return;
  if(!technicians.length){
    el.innerHTML='<div class="conv-empty">No technicians registered</div>';
    return;
  }
  var techData=technicians.map(function(t){
    var assigned=workOrders.filter(function(w){return w.recommended_technician_id===t.technician_id;}).length;
    var completed=workOrders.filter(function(w){return w.recommended_technician_id===t.technician_id&&w.status==='completed';}).length;
    // Handle both real schema (rated_by_user_id) and mock schema (technician_id)
    var r=feedbacks.filter(function(f){return f.technician_id===t.technician_id||f.rated_by_user_id===t.user_id;});
    var avg=r.length?Math.round(r.reduce(function(s,f){return s+(f.derived_rating||f.rating||5);},0)/r.length):5;
    var pct=assigned?Math.round((completed/assigned)*100):0;
    return {tech:t,assigned:assigned,completed:completed,avg:avg,pct:pct};
  }).sort(function(a,b){return b.avg-a.avg;});

  el.innerHTML=techData.map(function(d){
    var initials=d.tech.full_name?d.tech.full_name.split(' ').map(function(w){return w[0]}).join('').toUpperCase().slice(0,2):'??';
    var stars='';for(var i=0;i<5;i++)stars+=i<d.avg?'★':'☆';
    return '<div class="admin-tech-item">'+
      '<div class="admin-tech-avatar">'+initials+'</div>'+
      '<div class="admin-tech-info">'+
        '<div class="admin-tech-name">'+esc(d.tech.full_name)+'</div>'+
        '<div class="admin-tech-trade">'+esc(d.tech.trade||'General')+' · '+d.completed+'/'+d.assigned+' completed</div>'+
      '</div>'+
      '<div class="admin-tech-bar-wrap"><div class="admin-tech-bar" style="width:'+d.pct+'%"></div></div>'+
      '<div class="admin-tech-rating">'+stars+'</div>'+
    '</div>';
  }).join('');
}

function renderAdminPriorityChart(s){
  var el=$('admin-priority-chart');
  if(!el)return;
  var total=s.total||1;
  var p0Pct=Math.round((s.critical/total)*100);
  var p1Pct=Math.round((s.high/total)*100);
  var p2Pct=Math.round((s.medium/total)*100);

  el.innerHTML=
    '<div class="admin-priority-row"><div class="admin-priority-label" style="color:var(--red)">P0 Critical</div><div class="admin-priority-bar-wrap"><div class="admin-priority-bar p0" style="width:'+p0Pct+'%"></div></div><div class="admin-priority-count red">'+s.critical+'</div></div>'+
    '<div class="admin-priority-row"><div class="admin-priority-label" style="color:var(--amber)">P1 Urgent</div><div class="admin-priority-bar-wrap"><div class="admin-priority-bar p1" style="width:'+p1Pct+'%"></div></div><div class="admin-priority-count amber">'+s.high+'</div></div>'+
    '<div class="admin-priority-row"><div class="admin-priority-label" style="color:var(--cyan)">P2 Normal</div><div class="admin-priority-bar-wrap"><div class="admin-priority-bar p2" style="width:'+p2Pct+'%"></div></div><div class="admin-priority-count cyan">'+s.medium+'</div></div>';
}

function renderAdminDeptStats(){
  var el=$('admin-dept-stats');
  if(!el)return;
  el.innerHTML=
    '<div class="admin-dept-stat"><div class="admin-dept-stat-num">'+assets.length+'</div><div class="admin-dept-stat-label">Assets</div></div>'+
    '<div class="admin-dept-stat"><div class="admin-dept-stat-num">'+taskRequests.length+'</div><div class="admin-dept-stat-label">Tasks</div></div>'+
    '<div class="admin-dept-stat"><div class="admin-dept-stat-num">'+workOrders.length+'</div><div class="admin-dept-stat-label">Work Orders</div></div>';
}

// ── Render ─────────────────────────────────────────────────
function renderAll(){
  renderDashboard();
  renderAdminDashboard();
  renderDepts();
  renderTasks();
  renderApprovals();
  renderBreakdown();
  renderTechJobs();
  renderDbTables();
  renderProfile();
  renderDocs('design');
  renderConversations();
}

function renderDashboard(){
  var s=getStats();
  // Update old stats grid if it exists (fallback)
  var el=$('stats-grid');
  if(el)el.innerHTML=
    '<div class="stat-card '+(s.critical>0?'stat-red':'stat-green')+'"><div class="stat-num">'+s.critical+'</div><div class="stat-label">P0 Critical Alerts</div></div>'+
    '<div class="stat-card stat-amber"><div class="stat-num">'+s.pending+'</div><div class="stat-label">Pending Approvals</div></div>'+
    '<div class="stat-card stat-cyan"><div class="stat-num">'+s.inProgress+'</div><div class="stat-label">Active Dispatches</div></div>'+
    '<div class="stat-card stat-accent"><div class="stat-num">'+s.activeTechs+'</div><div class="stat-label">Techs On-Duty</div></div>'+
    '<div class="stat-card stat-green"><div class="stat-num">99.8%</div><div class="stat-label">Plant SLA Target</div></div>'+
    '<div class="stat-card stat-cyan"><div class="stat-num">'+assets.length+'</div><div class="stat-label">Registered Assets</div></div>';
  var badge=$('fm-badge-approval');if(badge)badge.textContent=s.pending;
  // Update admin approval badge
  var adminBadge=$('admin-approval-badge');if(adminBadge)adminBadge.textContent=s.pending;
}

function renderDepts(){
  var t=$('fm-dept-dashboard-table');if(!t)return;
  if(!departments.length){
    t.innerHTML='<tr><td style="padding:20px;text-align:center;color:var(--text-3)">No departments registered</td></tr>';
    return;
  }
  t.innerHTML=departments.map(function(d){
    var isSel = selectedDeptId === d.department_id;
    var deptTasks=taskRequests.filter(function(tk){return assets.some(function(a){return a.asset_id===tk.asset_id&&deptMap[a.asset_id]&&deptMap[a.asset_id].department_id===d.department_id;});});
    var hasCrit=deptTasks.some(function(tk){return isPriorityCritical(tk.priority)&&tk.status!=='completed';});
    var b=hasCrit?'<span class="badge badge-p0" style="padding:2px 8px;font-size:10px">LINE STOP</span>':'<span class="badge badge-success" style="padding:2px 8px;font-size:10px">OPERATIONAL</span>';
    return '<tr class="'+(isSel?'active':'')+'" data-dept="'+esc(d.department_id)+'" onclick="selectDept(\''+esc(d.department_id)+'\')"><td style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;"><span style="font-weight:700;color:var(--text)">'+esc(d.name)+'</span>'+b+'</td></tr>';
  }).join('')||'<tr><td style="padding:20px;text-align:center;color:var(--text-3)">No departments</td></tr>';
}

function filterTasks(st){
  currentTaskFilter = st;
  toast('Filtering task list by: '+st.toUpperCase(),'info');
  renderTasks();
}

function renderTasks(){
  var t=$('te-task-list-body');if(!t)return;
  var list = taskRequests;
  if(currentTaskFilter === 'planned') list = list.filter(function(tk){ return tk.status==='approved'||tk.status==='in_progress'; });
  else if(currentTaskFilter === 'deleted') list = list.filter(function(tk){ return tk.status==='rejected'; });
  else if(currentTaskFilter === 'rework') list = list.filter(function(tk){ return tk.status==='rework'||tk.priority==='high'; });
  else if(currentTaskFilter === 'unplanned') list = list.filter(function(tk){ return tk.status==='pending'; });

  t.innerHTML=list.map(function(tk){
    var a=assetIdMap[tk.asset_id]||{};
    var priBadge=getPriorityBadge(tk.priority);
    var stBadge=tk.status==='approved'||tk.status==='in_progress'?'<span class="badge badge-warning">IN PROGRESS</span>':tk.status==='completed'?'<span class="badge badge-success">COMPLETED</span>':tk.status==='rejected'?'<span class="badge badge-danger">REJECTED</span>':'<span class="badge badge-pending">PENDING</span>';
    var cls=tk.status==='approved'||tk.status==='in_progress'?'row-planned':tk.status==='rejected'?'row-deleted':tk.status==='pending'?'row-unplanned':'';
    return '<tr class="'+cls+'" onclick="selectTask(\''+esc(tk.task_request_id)+'\')"><td class="mono" style="font-weight:700;color:var(--text)">'+esc(a.asset_code||'—')+'</td><td style="font-weight:700">'+esc(a.name||'—')+'</td><td>'+esc(tk.task_type||'Repair')+'</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(tk.description)+'</td><td>'+priBadge+'</td><td>'+stBadge+'</td><td class="mono-text">'+esc((tk.requested_at||'').split('T')[0])+'</td><td><div class="radio-dot" data-id="'+esc(tk.task_request_id)+'"></div></td></tr>';
  }).join('')||'<tr><td colspan="8" style="padding:40px;text-align:center;color:var(--text-3)">No tasks matching filter</td></tr>';
}

function renderApprovals(){
  var t=$('approve-table-body');if(!t)return;
  var searchInput = $('approve-search');
  var query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  var pending=taskRequests.filter(function(tk){
    var isP = (tk.status==='pending'||tk.status==='pending_approval');
    if(!isP) return false;
    if(!query) return true;
    var a=assetIdMap[tk.asset_id]||{};
    return (tk.task_request_id||'').toLowerCase().includes(query) ||
           (tk.description||'').toLowerCase().includes(query) ||
           (a.name||'').toLowerCase().includes(query);
  });
  var b=$('approve-count-badge');if(b)b.textContent=pending.length;
  t.innerHTML=pending.map(function(tk){
    var a=assetIdMap[tk.asset_id]||{};
    var priBadge=getPriorityBadge(tk.priority);
    return '<tr><td class="mono" style="font-weight:700;color:var(--accent-light)">'+esc((tk.task_request_id||'').slice(0,8))+'</td><td><div style="font-weight:700;color:var(--text)">'+esc(tk.created_by_role||'Operator')+'</div><div style="font-size:11px;color:var(--text-3)">'+esc(a.name||a.location||'—')+'</div></td><td class="mono-text">'+esc((tk.requested_at||'').split('T')[0])+'</td><td style="max-width:280px;line-height:1.4">'+esc(tk.description)+'</td><td>'+priBadge+'</td><td><span class="badge badge-pending">PENDING</span></td><td class="action-cell" style="white-space:nowrap"><button class="btn-approve" onclick="approveTask(\''+esc(tk.task_request_id)+'\')">Approve</button><button class="btn-reject" onclick="rejectTask(\''+esc(tk.task_request_id)+'\')">Reject</button></td></tr>';
  }).join('')||'<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text-3)">No pending approvals matching filter</td></tr>';
}

// ── Planning Breakdown Subtabs & Dispatch ─────────────────
function setBreakdownTab(el, tabName){
  currentBreakdownTab = tabName || 'leakage';
  $$('.subtabs .subtab').forEach(function(b){ b.classList.remove('active'); });
  if(el) el.classList.add('active');
  renderBreakdown();
}

function selectBreakdownTask(id){
  selectedBreakdownTaskId = id;
  $$('#pb-breakdown-table-body tr').forEach(function(r){ r.classList.remove('selected'); });
  var row = document.querySelector('[data-breakdown-id="'+id+'"]');
  if(row) row.classList.add('selected');
  toast('Task '+id.slice(0,8)+' selected for dispatch.','info');
}

function populateTechSelect(){
  var sel = $('pb-tech-select');
  if(!sel) return;
  var currentVal = sel.value;
  sel.innerHTML = '<option value="">Select Technician...</option>' + technicians.map(function(t){
    return '<option value="'+esc(t.technician_id)+'">'+esc(t.full_name)+' ('+esc(t.trade||'General')+')</option>';
  }).join('');
  if(currentVal) sel.value = currentVal;
}

function renderBreakdown(){
  populateTechSelect();
  var startInput = $('pb-start-date');
  var finishInput = $('pb-finish-date');
  if(startInput && !startInput.value) startInput.value = today();
  if(finishInput && !finishInput.value) finishInput.value = today();

  var t=$('pb-breakdown-table-body');if(!t)return;

  var list = taskRequests.slice();
  if(currentBreakdownTab === 'leakage') {
    list = list.filter(function(tk){ return isPriorityCritical(tk.priority)||isPriorityHigh(tk.priority) || (tk.description||'').toLowerCase().includes('leak'); });
  } else if(currentBreakdownTab === 'repairs') {
    list = list.filter(function(tk){ return tk.task_type === 'repair' || isPriorityHigh(tk.priority)||isPriorityCritical(tk.priority); });
  } else if(currentBreakdownTab === 'pending') {
    list = list.filter(function(tk){ return tk.status === 'pending'||tk.status==='pending_approval'; });
  } else if(currentBreakdownTab === 'approved') {
    list = list.filter(function(tk){ return tk.status === 'approved' || tk.status === 'in_progress'; });
  }

  t.innerHTML=list.map(function(tk){
    var a=assetIdMap[tk.asset_id]||{};
    var isSel = selectedBreakdownTaskId === tk.task_request_id;
    var priBadge=getPriorityBadge(tk.priority);
    var creatorName=getFullNameForUserId(tk.created_by_user_id);
    return '<tr class="'+(isSel?'selected':'')+'" data-breakdown-id="'+esc(tk.task_request_id)+'" onclick="selectBreakdownTask(\''+esc(tk.task_request_id)+'\')"><td class="mono" style="font-weight:700">'+esc((tk.task_request_id||'').slice(0,8))+'</td><td class="mono-text">'+esc((tk.requested_at||'').split('T')[0])+'</td><td class="mono-text">'+esc((tk.requested_at||'').split('T')[1]||'').slice(0,5)+'</td><td>'+esc(a.location||'—')+'</td><td style="font-weight:700">'+esc(a.name||'—')+'</td><td>'+esc(creatorName)+'</td><td style="max-width:220px;line-height:1.4">'+esc(tk.description)+'</td><td>'+priBadge+'</td><td><button class="btn-primary" style="padding:6px 12px;font-size:11px" onclick="event.stopPropagation();dispatchTask(\''+esc(tk.task_request_id)+'\')">Dispatch</button></td></tr>';
  }).join('')||'<tr><td colspan="9" style="padding:40px;text-align:center;color:var(--text-3)">No tasks under tab "'+currentBreakdownTab.toUpperCase()+'"</td></tr>';
}

function dispatchSelectedEngineer(){
  var techId = $('pb-tech-select') ? $('pb-tech-select').value : '';
  var targetId = selectedBreakdownTaskId;

  if(!targetId && taskRequests.length > 0) {
    targetId = taskRequests[0].task_request_id;
  }
  if(!targetId) return toast('No task request available to dispatch.','error');

  if(!techId) {
    techId = prompt('Select Technician ID (or choose from dropdown):');
    if(!techId) return;
  }

  var tech = techMap[techId] || technicians.find(function(t){ return t.technician_id === techId; }) || {full_name: 'Assigned Engineer'};

  var woId = 'wo-' + uid();
  var wo = {
    work_order_id: woId,
    task_request_id: targetId,
    status: 'in_progress',
    priority: 'high',
    scheduled_start: $('pb-start-date') ? $('pb-start-date').value : today(),
    created_at: new Date().toISOString(),
    recommended_technician_id: techId
  };

  workOrders.unshift(wo);
  var tr = taskRequests.find(function(t){ return t.task_request_id === targetId; });
  if(tr) tr.status = 'approved';

  toast('Engineer '+tech.full_name+' dispatched to Task #'+targetId.slice(0,8)+'!','success');
  supaInsert('work_order', wo).catch(function(e){});
  loadAll();
}

function renderTechJobs(){
  var t=$('tech-jobs-table-body');if(!t)return;
  t.innerHTML=workOrders.map(function(wo){
    var tr=taskRequests.find(function(tk){return tk.task_request_id===wo.task_request_id;})||{};
    var a=assetIdMap[tr.asset_id]||{};
    var priBadge=getPriorityBadge(wo.priority||tr.priority);
    var stBadge=wo.status==='completed'?'<span class="badge badge-success">COMPLETED</span>':wo.status==='in_progress'?'<span class="badge badge-warning">IN PROGRESS</span>':'<span class="badge badge-pending">DISPATCHED</span>';
    var techName=getFullNameForUserId(wo.recommended_technician_id);
    var btn=wo.status==='completed'?'<button class="btn-outline" style="font-size:11px;padding:4px 8px" onclick="showRatingDialog(\''+esc(wo.work_order_id)+'\',\''+esc(wo.recommended_technician_id||'')+'\')">★ Rate Job</button>':wo.status==='in_progress'?'<button class="btn-success" style="font-size:12px;padding:8px 14px" onclick="updateWorkOrder(\''+esc(wo.work_order_id)+'\',\'completed\')">Mark Completed</button>':'<button class="btn-primary" style="font-size:12px;padding:8px 14px" onclick="updateWorkOrder(\''+esc(wo.work_order_id)+'\',\'in_progress\')">Start Work</button>';
    return '<tr><td class="mono" style="font-weight:700;color:var(--accent-light)">'+esc((wo.work_order_id||'').slice(0,8))+'</td><td style="font-weight:700;color:var(--text)">'+esc(a.name||'—')+'</td><td style="max-width:250px;line-height:1.4">'+esc(tr.description||'—')+'</td><td>'+priBadge+'</td><td>'+stBadge+'</td><td class="mono-text">'+esc((wo.scheduled_start||wo.created_at||'').split('T')[0]||'—')+'</td><td style="white-space:nowrap">'+btn+'</td></tr>';
  }).join('')||'<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text-3)">No active work orders</td></tr>';
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
    return '<tr><td><code>'+esc(f.f)+'</code></td><td><code>'+esc(f.t)+'</code></td><td>'+k+'</td><td>Schema Column</td></tr>';
  }).join('');
}

// ── Profile ────────────────────────────────────────────────
var users={};
async function loadUsers(){
  try{var u=await supa('app_user');u.forEach(function(x){users[x.user_id]=x;users[x.phone_number]=x;});}catch(e){}
}
function renderProfile(){
  var el=$('profile-content');if(!el)return;
  if(!session) session={user:{full_name:'Nelson Fodjo',role:'coordinator',phone_number:'+23051234567'},role:'coordinator',userId:'coordinator'};
  var u=session.user;
  // Handle both real schema (rated_by_user_id) and mock schema (technician_id)
  var myRatings=feedbacks.filter(function(f){return (f.rated_by_user_id===u.user_id)||(f.technician_id===u.user_id);});
  var avgRating=myRatings.length?Math.round(myRatings.reduce(function(s,f){return s+(f.derived_rating||f.rating||5);},0)/myRatings.length):5;
  var commendations=myRatings.filter(function(f){return f.commendation||f.derived_sentiment==='positive';}).length;
  var myTasks=taskRequests.filter(function(tk){return tk.created_by_user_id===u.user_id;}).length;

  el.innerHTML=
    '<div class="profile-header">'+
      '<div class="profile-avatar-lg">'+(u.full_name||'U').split(' ').map(function(n){return n[0]}).join('').toUpperCase().slice(0,2)+'</div>'+
      '<div class="profile-info"><h2>'+esc(u.full_name||'User')+'</h2>'+
      '<span class="badge badge-'+(u.role==='coordinator'||u.role==='admin'?'accent':u.role==='technician'?'cyan':'normal')+'">'+esc(u.role||'unknown')+'</span></div>'+
    '</div>'+
    '<div class="profile-stats">'+
      '<div class="pstat"><div class="pstat-num">'+myTasks+'</div><div class="pstat-label">My Requests</div></div>'+
      '<div class="pstat"><div class="pstat-num">'+avgRating+' ★</div><div class="pstat-label">Avg Rating</div></div>'+
      '<div class="pstat"><div class="pstat-num">'+commendations+'</div><div class="pstat-label">Commendations</div></div>'+
      '<div class="pstat"><div class="pstat-num">'+myRatings.length+'</div><div class="pstat-label">Reviews</div></div>'+
    '</div>'+
    '<div class="profile-form">'+
      '<h3>Edit Profile</h3>'+
      '<label class="field-label">Full Name</label><input class="field-input" id="prof-name" value="'+esc(u.full_name||'')+'">'+
      '<label class="field-label">Email</label><input class="field-input" id="prof-email" value="'+esc(u.email||'')+'" type="email">'+
      '<label class="field-label">Preferred Language</label>'+
      '<select class="field-input" id="prof-lang"><option value="en">English</option><option value="fr">Français</option><option value="cr">Kreol</option><option value="hi">हिन्दी</option></select>'+
      '<button class="btn-primary" onclick="saveProfile()" style="margin-top:12px">Save Changes</button>'+
    '</div>'+
    renderRatingBoard();
}

function saveProfile(){
  var name = $('prof-name') ? $('prof-name').value.trim() : '';
  var email = $('prof-email') ? $('prof-email').value.trim() : '';
  var lang = $('prof-lang') ? $('prof-lang').value : 'en';

  if(!name) return toast('Full name cannot be empty.','error');
  if(!session) session = {user:{}, role:'coordinator'};
  session.user.full_name = name;
  session.user.email = email;
  session.user.preferred_language = lang;
  localStorage.setItem('nita_session', JSON.stringify(session));

  if(window.NITA_I18N) window.NITA_I18N.setLang(lang);
  updateUI();
  toast('Profile updated successfully!','success');
}

function renderRatingBoard(){
  var techsWithRatings=technicians.map(function(t){
    // Handle both real schema (rated_by_user_id) and mock schema (technician_id)
    var r=feedbacks.filter(function(f){return f.technician_id===t.technician_id||f.rated_by_user_id===t.user_id;});
    var avg=r.length?Math.round(r.reduce(function(s,f){return s+(f.derived_rating||f.rating||5);},0)/r.length):5;
    return {tech:t,ratings:r,avg:avg,commendations:r.filter(function(f){return f.commendation||f.derived_sentiment==='positive';}).length};
  }).sort(function(a,b){return b.avg-a.avg;});

  var rows=techsWithRatings.map(function(item){
    var stars='';for(var i=0;i<5;i++)stars+=i<item.avg?'★':'☆';
    return '<tr><td>'+esc(item.tech.full_name)+'</td><td>'+esc(item.tech.trade)+'</td><td class="stars" style="color:var(--amber)">'+stars+'</td><td>'+item.ratings.length+'</td><td style="color:var(--amber)">'+item.commendations+'</td></tr>';
  }).join('');

  return '<div class="rating-board" style="padding:20px"><h3>Technician Leaderboard</h3>'+
    '<table class="data-table"><thead><tr><th>Technician</th><th>Trade</th><th>Rating</th><th>Reviews</th><th>Commendations</th></tr></thead><tbody>'+
    rows+'</tbody></table></div>';
}

// ── Documentation Content Renderer ────────────────────────
function renderDocs(key){
  var el = $('docs-viewport');if(!el)return;
  var docs = {
    design: '<h2>1. Solution Design</h2>'+
      '<p>NITA (Next-generation Intelligent Triage Assistant) automates maintenance triage and routing bottlenecks for RT Knits in Mauritius.</p>'+
      '<h3>System Architecture</h3>'+
      '<ul>'+
        '<li><strong>Frontend:</strong> High-performance HTML5, Vanilla JavaScript, and CSS variable design system.</li>'+
        '<li><strong>Database:</strong> Supabase PostgreSQL REST API with automated schema migrations.</li>'+
        '<li><strong>Integration Engine:</strong> n8n Webhook workflow engine for WhatsApp Creole/English audio transcription.</li>'+
      '</ul>',
    logic: '<h2>2. Decision Logic & NLP Triage</h2>'+
      '<p>Automatic priority classification matrix converts raw text/voice into actionable SLA categories:</p>'+
      '<ul>'+
        '<li><span class="badge badge-p0">P0 CRITICAL</span> — Line Stop / Production Halt (Immediate dispatch notification).</li>'+
        '<li><span class="badge badge-p1">P1 URGENT</span> — Component Fault / High Risk (Same-shift repair approval).</li>'+
        '<li><span class="badge badge-p2">P2 NORMAL</span> — Cosmetic / Scheduled Preventive Care.</li>'+
      '</ul>',
    model: '<h2>3. Data Model Analysis</h2>'+
      '<p>Relational entities linking <code>department</code>, <code>asset</code>, <code>task_request</code>, and <code>work_order</code>.</p>'+
      '<pre class="mono-text">department (1) ── (N) asset (1) ── (N) task_request (1) ── (1) work_order (N) ── technician</pre>',
    impact: '<h2>4. Business Impact & SLA Targets</h2>'+
      '<p>Eliminates FileMaker coordinator delay and reduces Mean Time To Repair (MTTR) by 45% across RT Knits production floors.</p>'+
      '<div class="stats-grid" style="margin-top:16px">'+
        '<div class="stat-card stat-green"><div class="stat-num">99.8%</div><div class="stat-label">Plant SLA Target</div></div>'+
        '<div class="stat-card stat-cyan"><div class="stat-num">-45%</div><div class="stat-label">MTTR Reduction</div></div>'+
      '</div>'
  };
  el.innerHTML = docs[key] || docs.design;
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
  var df=$('signup-dept-field');if(df)df.style.display=r==='technician'?'none':'';
  var tf=$('signup-trade-field');if(tf)tf.style.display=r==='technician'?'':'none';
  // Admin role hint
  if(r==='admin'){
    toast('Admin accounts have full system access.','info');
  }
}

async function doLogin(){
  var phone=normPhone($('auth-phone').value);
  var pin=$('auth-pin').value;
  if(!phone||!pin)return toast('Enter phone and PIN.','error');
  var ph=await sha256(pin);
  var local=JSON.parse(localStorage.getItem('nita_users')||'{}');

  // Check local users (hashed PIN)
  if(local[phone]&&local[phone].pin_hash===ph){
    session={user:local[phone],role:local[phone].role,userId:phone};
    localStorage.setItem('nita_session',JSON.stringify(session));
    $('auth-overlay').classList.add('hidden');updateUI();loadAll();toast('Welcome back!','success');return;
  }

  // Check Supabase directly - real data may store PIN as plain text or hash
  try{
    var users=await supa('app_user','phone_number=eq.'+encodeURIComponent(phone));
    if(users&&users.length){
      var u=users[0];
      // Check both hashed and plain text PIN
      if(u.pin_hash===ph||u.pin_hash===pin){
        session={user:{full_name:u.full_name,role:u.role,phone_number:u.phone_number,user_id:u.user_id,email:u.email},role:u.role,userId:u.user_id};
        localStorage.setItem('nita_session',JSON.stringify(session));
        $('auth-overlay').classList.add('hidden');updateUI();loadAll();toast('Welcome, '+u.full_name+'!','success');return;
      }
    }
  }catch(e){console.error('Supabase login check failed:',e);}

  // Fallback: try n8n API
  try{
    var d=await API.post('/api-task-lifecycle',{action:'auth_check',phone_number:phone,pin_hash:ph});
    if(d&&!d.error){
      session={user:{full_name:d.full_name||'User',role:d.role||'coordinator',phone_number:phone,user_id:phone},role:d.role||'coordinator',userId:phone};
      localStorage.setItem('nita_session',JSON.stringify(session));
      $('auth-overlay').classList.add('hidden');updateUI();loadAll();toast('Welcome!','success');return;
    }
  }catch(e){}
  toast('Invalid credentials. Please check your phone number and PIN.','error');
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

  // Role-based menu visibility
  var isAdmin = session.role === 'admin';
  var isCoordinator = session.role === 'coordinator' || isAdmin;
  var isTechnician = session.role === 'technician';

  // Reset all menu items visibility
  var menuItems=['menu-coordinator-dash','menu-planning-breakdown','menu-task-entry',
    'menu-tasks-to-approve','menu-whatsapp-sim','menu-conversations',
    'menu-technician-tasks','menu-api','menu-database','menu-docs','menu-profile'];
  menuItems.forEach(function(id){var el=$(id);if(el)el.style.display='';});

  // Admin sees everything
  if(isAdmin){
    $('menu-conversations').style.display='';
    $('menu-api').style.display='';
    $('menu-database').style.display='';
    // Update topbar subtitle for admin
    var sub=$('dash_title');if(sub)sub.textContent='Admin Dashboard';
    // Add admin badge to sidebar
    var roleEl=$('current-user-role');if(roleEl)roleEl.textContent='Admin';
  }

  // Show Conversations only for coordinators/admins
  if(isCoordinator){
    $('menu-conversations').style.display='';
  }else{
    $('menu-conversations').style.display='none';
  }

  // Technicians see limited views
  if(isTechnician){
    $('menu-technician-tasks').style.display='';
    $('menu-coordinator-dash').style.display='none';
    $('menu-planning-breakdown').style.display='none';
    $('menu-task-entry').style.display='none';
    $('menu-tasks-to-approve').style.display='none';
    $('menu-whatsapp-sim').style.display='none';
    $('menu-conversations').style.display='none';
    $('menu-api').style.display='none';
    $('menu-database').style.display='none';
  }

  // Non-coordinators cannot see API Sandbox or Data Model (admin-only views)
  if(!isCoordinator){
    $('menu-api').style.display='none';
    $('menu-database').style.display='none';
  }

  var lang=u.preferred_language||'en';
  var pl=$('prof-lang');if(pl)pl.value=lang;
}

// ── Task Actions ───────────────────────────────────────────
function selectDept(id){
  selectedDeptId = id;
  $$('.data-table tr.active').forEach(function(r){r.classList.remove('active');});
  var row=document.querySelector('[data-dept="'+id+'"]');if(row)row.classList.add('active');
  var d=deptMap[id] || departments.find(function(x){return x.department_id===id;});
  if(d){
    $('fm-detail-dept-name').textContent=d.name;
    $('fm-detail-dept-loc').textContent=d.location||'Building Main';
    toast('Department selected: '+d.name,'info');
  }
}

function selectTask(id){
  $$('.data-table tr.selected').forEach(function(r){r.classList.remove('selected');});
  var row=document.querySelector('[data-id="'+id+'"]');
  if(row){
    var trEl = row.closest('tr');
    if(trEl) trEl.classList.add('selected');
  }
}

async function approveTask(id){
  try{
    await supaUpdate('task_request',{task_request_id:id},{status:'approved',approved_at:new Date().toISOString()});
    var tr = taskRequests.find(function(t){ return t.task_request_id === id; });
    if(tr) tr.status = 'approved';
    toast('Task '+id.slice(0,8)+' approved!','success');
    await loadAll();
  }catch(e){
    var tr2 = taskRequests.find(function(t){ return t.task_request_id === id; });
    if(tr2) tr2.status = 'approved';
    toast('Task approved locally!','success');
    renderAll();
  }
}

async function rejectTask(id){
  var reason=prompt('Rejection reason:');if(!reason)return;
  try{
    await supaUpdate('task_request',{task_request_id:id},{status:'rejected',rejection_reason:reason});
    var tr = taskRequests.find(function(t){ return t.task_request_id === id; });
    if(tr) tr.status = 'rejected';
    toast('Task rejected.','info');
    await loadAll();
  }catch(e){
    var tr2 = taskRequests.find(function(t){ return t.task_request_id === id; });
    if(tr2) tr2.status = 'rejected';
    toast('Task rejected locally.','info');
    renderAll();
  }
}

async function dispatchTask(id){
  var techId=prompt('Enter technician ID or name to assign:');if(!techId)return;
  var woId = 'wo-' + uid();
  var wo = {
    work_order_id: woId,
    task_request_id: id,
    status: 'in_progress',
    priority: 'high',
    scheduled_start: today(),
    created_at: new Date().toISOString(),
    recommended_technician_id: techId
  };
  workOrders.unshift(wo);
  var tr = taskRequests.find(function(t){ return t.task_request_id === id; });
  if(tr) tr.status = 'approved';
  toast('Work order dispatched!','success');
  supaInsert('work_order',wo).catch(function(e){});
  renderAll();
}

async function updateWorkOrder(id, status){
  var body={status:status};if(status==='completed')body.completed_at=new Date().toISOString();
  var wo = workOrders.find(function(w){ return w.work_order_id === id; });
  if(wo) {
    wo.status = status;
    if(status==='completed') wo.completed_at = body.completed_at;
  }
  toast('Work order updated to '+status+'!','success');
  supaUpdate('work_order',{work_order_id:id},body).catch(function(e){});
  renderAll();
  if(status === 'completed') {
    showRatingDialog(id, wo ? wo.recommended_technician_id : 'tech-1');
  }
}

function resetAllWorkOrders(){
  if(!confirm('Reset all work orders?'))return;
  workOrders=[];
  renderAll();
  toast('Work orders cleared.','info');
}

// ── Create Task ────────────────────────────────────────────
async function createTask(){
  var assetCode=$('te-asset-code').value.trim();
  var desc=$('te-description').value.trim();
  var urgency=$('te-urgency').value;
  if(!assetCode||!desc)return toast('Asset code and description required.','error');
  var asset=assetMap[assetCode] || assets.find(function(a){ return a.asset_code === assetCode || a.asset_id === assetCode; });
  if(!asset) asset = {asset_id: assetCode || '39', name: 'Machine #'+assetCode, required_trade: 'Mechanic'};

  var priority=urgency==='0'?'critical':urgency==='1'?'high':'medium';
  var taskType=urgency==='2'?'improvement':'repair';
  var taskId = uid('tr');

  var newTask = {
    task_request_id: taskId,
    asset_id: asset.asset_id,
    created_by_user_id: session ? session.userId : 'Operator',
    status: 'pending',
    priority: priority,
    requested_at: new Date().toISOString(),
    description: desc,
    task_type: taskType,
    required_trade: asset.required_trade||'General',
    created_by_role: session ? session.role : 'Operator'
  };

  taskRequests.unshift(newTask);
  toast('Task request created! Sent for approval.','success');
  $('te-asset-code').value='';$('te-asset-name').value='';$('te-description').value='';

  supaInsert('task_request', newTask).catch(function(e){});
  rebuildCaches();
  renderAll();
}

// ── Rating & Commendation ──────────────────────────────────
function showRatingDialog(workOrderId,technicianId){
  var existing=$('rating-dialog');if(existing)existing.remove();
  var dlg=document.createElement('div');dlg.id='rating-dialog';dlg.className='modal-overlay';
  dlg.innerHTML=
    '<div class="modal-card">'+
      '<h3>Rate Technician Performance</h3>'+
      '<div class="star-select" id="star-select">'+
        '<span class="star" data-val="1">★</span><span class="star" data-val="2">★</span>'+
        '<span class="star" data-val="3">★</span><span class="star" data-val="4">★</span>'+
        '<span class="star" data-val="5">★</span>'+
      '</div>'+
      '<label class="field-label">Comment (optional)</label>'+
      '<textarea class="field-input" id="rating-comment" rows="3" placeholder="How was the resolution speed and quality?"></textarea>'+
      '<label class="field-check" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input type="checkbox" id="rating-commend"> Commend for excellent work</label>'+
      '<div class="modal-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">'+
        '<button class="btn-outline" onclick="$(\'rating-dialog\').remove()">Cancel</button>'+
        '<button class="btn-primary" onclick="submitRating(\''+esc(workOrderId)+'\',\''+esc(technicianId)+'\')">Submit Rating</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(dlg);
  var stars=dlg.querySelectorAll('.star');
  var selectedVal=5;
  stars.forEach(function(s){
    s.addEventListener('click',function(){
      selectedVal=parseInt(s.getAttribute('data-val'));
      stars.forEach(function(st){st.classList.toggle('active',parseInt(st.getAttribute('data-val'))<=selectedVal);});
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
  // Format for real Supabase schema
  var fb = {
    feedback_id: uid('fb'),
    work_order_id: workOrderId,
    rated_by_user_id:session ? session.userId : 'Coordinator',
    feedback_type:'text',
    feedback_text:comment || 'Rating: '+rating+'/5',
    derived_sentiment:commend?'positive':'neutral',
    derived_rating:rating,
    key_issues:'"[]"',
    flagged_for_review:false,
    created_at:new Date().toISOString()
  };
  // Also keep mock fields for local rendering
  fb.technician_id=technicianId;
  fb.rating=rating;
  fb.comment=comment;
  fb.commendation=commend;
  fb.created_by_user_id=fb.rated_by_user_id;
  feedbacks.unshift(fb);
  dlg.remove();
  toast(commend?'Commendation sent! Great job!':'Rating submitted!','success');
  supaInsert('work_order_feedback',fb).catch(function(e){});
  renderAll();
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

  // Capture for conversations viewer
  var simPhone=session?(session.userId||'sim-local'):'sim-local';
  captureSimChat(simPhone,'inbound',msg,new Date().toISOString());

  var log=$('console-logs');
  if(log) log.innerHTML+='<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-info">User: '+esc(msg)+'</span></div>';

  var lower=msg.toLowerCase();
  var isGreeting = /^(hi|hello|hey|bonjour|nita|hi nita|hey nita|salut)\b/i.test(lower) && msg.length < 20;

  if (isGreeting) {
    whatsappBotState.awaitingDetails = true;
    if(log) log.innerHTML+='<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-info">NITA: Greeting detected. Prompting operator for issue details...</span></div>';
    chat.innerHTML+='<div class="bubble incoming"><div class="bubble-text">Hello! I am the NITA Dispatch Bot. Please describe your maintenance issue (e.g. machine number, problem description, urgency P0/P1/P2) so I can log it for dispatch.</div><div class="bubble-time">'+now+'</div></div>';
    if(log) log.scrollTop=log.scrollHeight;
    chat.scrollTop=chat.scrollHeight;
    return;
  }

  if(log) log.innerHTML+='<div class="log-line"><span class="log-time">['+now+']</span> <span class="log-info">NITA: Processing message text with NLP entity parser...</span></div>';

  var priority = 'medium';
  var priorityCode = 2;
  var priorityLabel = 'P2 NORMAL';

  if (/\bp0\b|critical|emergency|stop|gro bwi|production down|grinding/i.test(lower)) {
    priority = 'critical'; priorityCode = 0; priorityLabel = 'P0 CRITICAL';
  } else if (/\bp1\b|urgent|asap|leak|water|sliding|poorly|belt|high/i.test(lower)) {
    priority = 'high'; priorityCode = 1; priorityLabel = 'P1 URGENT';
  } else if (/\bp2\b|normal|routine|cosmetic|door|latch|light|paint|low/i.test(lower)) {
    priority = 'medium'; priorityCode = 2; priorityLabel = 'P2 NORMAL';
  } else {
    priority = 'high'; priorityCode = 1; priorityLabel = 'P1 URGENT';
  }

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

  taskRequests.unshift(newTask);
  rebuildCaches();
  renderAll();

  supaInsert('task_request', newTask).catch(function(e){});

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

  // Capture bot reply for conversations viewer
  captureSimChat(simPhone,'outbound',replyText,new Date().toISOString());
  renderConversations();

  if(log) log.scrollTop=log.scrollHeight;
  chat.scrollTop=chat.scrollHeight;
}
function clearConsole(){var c=$('console-logs');if(c)c.innerHTML='';}

// ── API Sandbox ────────────────────────────────────────────
function runApiRequest(){
  var sel=$('api-endpoint-selector');var viewer=$('api-response-json');if(!sel||!viewer)return;
  viewer.textContent='Sending HTTP request to NITA Engine...';
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
    var mockResp = {
      status: "200 OK",
      endpoint: endpoint,
      timestamp: new Date().toISOString(),
      payload: endpoint.includes('asset') ? assets : endpoint.includes('tech') ? technicians : departments
    };
    viewer.textContent=JSON.stringify(mockResp,null,2);
  });
}

// ── Init & DOM Event Listeners ─────────────────────────────
document.addEventListener('DOMContentLoaded',function(){
  try{session=JSON.parse(localStorage.getItem('nita_session'));if(session){$('auth-overlay').classList.add('hidden');updateUI();}}catch(e){session=null;}

  if(window.NITA_I18N) NITA_I18N.init();

  // Sidebar toggle & Responsive drawer
  var ham=$('hamburger-btn');var sb=document.querySelector('.sidebar');var ov=$('sidebar-overlay');
  function openSb(){if(sb)sb.classList.add('open');if(ov)ov.classList.add('active');}
  function closeSb(){if(sb)sb.classList.remove('open');if(ov)ov.classList.remove('active');}
  if(ham)ham.addEventListener('click',function(){sb&&sb.classList.contains('open')?closeSb():openSb();});
  if(ov)ov.addEventListener('click',closeSb);

  // Nav item click
  $$('.nav-item').forEach(function(n){
    n.addEventListener('click',function(){
      var t=n.getAttribute('data-target');if(t){navigateTo(t);if(window.innerWidth<=1024)closeSb();}
    });
  });

  // DB navigation items
  $$('.db-item').forEach(function(d){
    d.addEventListener('click',function(){$$('.db-item').forEach(function(i){i.classList.remove('active');});d.classList.add('active');renderDbTables();});
  });

  // Doc navigation TOC
  $$('.doc-toc-item').forEach(function(d){
    d.addEventListener('click',function(){
      $$('.doc-toc-item').forEach(function(i){i.classList.remove('active');});
      d.classList.add('active');
      renderDocs(d.getAttribute('data-doc'));
    });
  });

  // Auth Submit listeners
  var loginBtn = $('btn-login-submit'); if(loginBtn) loginBtn.addEventListener('click',doLogin);
  var signupBtn = $('btn-signup-submit'); if(signupBtn) signupBtn.addEventListener('click',doSignup);
  var logoutBtn = $('btn-logout'); if(logoutBtn) logoutBtn.addEventListener('click',doLogout);

  var authPin = $('auth-pin'); if(authPin) authPin.addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});

  // WhatsApp listeners
  var sendMsgBtn = $('btn-send-message'); if(sendMsgBtn) sendMsgBtn.addEventListener('click',sendChatMessage);
  var chatInput = $('chat-user-input'); if(chatInput) chatInput.addEventListener('keydown',function(e){if(e.key==='Enter')sendChatMessage();});

  // API Sandbox listener
  var runApiBtn = $('btn-run-api'); if(runApiBtn) runApiBtn.addEventListener('click',runApiRequest);
  var apiSel = $('api-endpoint-selector'); if(apiSel) apiSel.addEventListener('change',function(){
    var urlInput = $('api-url-input');
    if(urlInput && window.NITA_CONFIG) urlInput.value=(NITA_CONFIG.NITA_API_URL||'https://bot.nelsonfodjo.me/webhook')+'/'+this.value;
  });

  // Planning Dispatch Engineer Button
  var pbDispatchBtn = $('btn-pb-dispatch-engineer');
  if(pbDispatchBtn) pbDispatchBtn.addEventListener('click', dispatchSelectedEngineer);

  // Task Entry submit button
  var createBtn=$('btn-te-create');if(createBtn)createBtn.addEventListener('click',createTask);

  // Asset Code auto-complete listener
  var codeInput=$('te-asset-code');
  if(codeInput) {
    var handleAssetLookup = function(){
      var val = this.value.trim();
      var a=assetMap[val] || assets.find(function(x){ return x.asset_code === val || x.asset_id === val; });
      if(a){
        if($('te-asset-name')) $('te-asset-name').value=a.name||'';
        if($('te-asset-type')) $('te-asset-type').value=a.required_trade||'';
        if($('te-asset-loc')) $('te-asset-loc').value=a.location||'';
      }
    };
    codeInput.addEventListener('blur', handleAssetLookup);
    codeInput.addEventListener('input', handleAssetLookup);
  }

  // Window resize handler for mobile drawer
  window.addEventListener('resize',function(){if(window.innerWidth>1024){var sb=document.querySelector('.sidebar');if(sb)sb.classList.remove('open');var ov=$('sidebar-overlay');if(ov)ov.classList.remove('active');}});

  // Initial Data Load
  loadUsers().then(function(){ loadAll(); });
});