// ============================================================
// RT KNITS — NITA CMMS Main Application
// ============================================================

import { auth } from './auth';
import { nitaApi } from './api';
import { i18n } from './i18n';
import type { Department, Asset, Technician, TaskRequest, WorkOrder, UserRole } from './types';

// ============================================================
// GLOBAL STATE
// ============================================================

let departments: Department[] = [];
let assets: Asset[] = [];
let technicians: Technician[] = [];
let taskRequests: TaskRequest[] = [];
let workOrders: WorkOrder[] = [];
let selectedDeptId = '';
let selectedTaskId: string | null = null;

// Lookup caches
const assetMap = new Map<string, Asset>();
const assetIdMap = new Map<string, Asset>();
const deptMap = new Map<string, Department>();

function rebuildLookupCaches(): void {
  assetMap.clear();
  assetIdMap.clear();
  deptMap.clear();
  for (const a of assets) {
    assetMap.set(a.asset_code, a);
    if (a.asset_id) assetIdMap.set(a.asset_id, a);
  }
  for (const d of departments) deptMap.set(d.department_id, d);
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function esc(str: any): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function generateId(prefix: string): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return `${prefix}-${Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')}`;
}

// ============================================================
// DATA LOADING
// ============================================================

async function loadAllData(): Promise<void> {
  try {
    const [deptData, assetData, techData, taskData, workData] = await Promise.allSettled([
      nitaApi.getDepartments(),
      nitaApi.getAssets(),
      nitaApi.getTechniciansFromDb(),
      nitaApi.getTaskRequests(),
      nitaApi.getWorkOrders()
    ]);

    if (deptData.status === 'fulfilled') departments = deptData.value;
    if (assetData.status === 'fulfilled') assets = assetData.value;
    if (techData.status === 'fulfilled') technicians = techData.value;
    if (taskData.status === 'fulfilled') taskRequests = taskData.value;
    if (workData.status === 'fulfilled') workOrders = workData.value;

    rebuildLookupCaches();
    renderAll();
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderAll(): void {
  renderDepartmentTable();
  renderTaskEntryTable();
  renderApprovalTable();
  renderBreakdownTable();
  renderTechJobsTable();
}

function renderDepartmentTable(): void {
  const table = document.getElementById('fm-dept-dashboard-table');
  if (!table) return;

  const rows = departments.map(d => {
    const taskCount = taskRequests.filter(t => 
      assets.some(a => a.asset_id === t.asset_id && deptMap.get(a.asset_id)?.department_id === d.department_id)
    ).length;

    return `<tr data-dept-id="${esc(d.department_id)}" onclick="selectDepartment('${esc(d.department_id)}')">
      <td>${esc(d.name)}</td>
      <td>${taskCount}</td>
    </tr>`;
  }).join('');

  table.innerHTML = rows || '<tr><td>No departments found</td></tr>';
}

function renderTaskEntryTable(): void {
  const tbody = document.getElementById('te-task-list-body');
  if (!tbody) return;

  const rows = taskRequests.map(t => {
    const asset = assetIdMap.get(t.asset_id);
    const rowClass = t.status === 'approved' ? 'row-planned' : 
                     t.status === 'rejected' ? 'row-deleted' : 
                     t.status === 'pending' ? 'row-unplanned' : '';

    return `<tr class="${rowClass}" data-task-id="${esc(t.task_request_id)}" onclick="selectTask('${esc(t.task_request_id)}')">
      <td>${esc(asset?.asset_code || 'N/A')}</td>
      <td>${esc(asset?.name || 'Unknown')}</td>
      <td>${esc(t.task_type)}</td>
      <td>${esc(t.description)}</td>
      <td><span class="status-badge ${t.priority === 'critical' ? 'critical' : t.priority === 'high' ? 'urgent' : 'normal'}">${esc(t.priority)}</span></td>
      <td>${esc(t.status)}</td>
      <td>${esc(t.requested_at?.split('T')[0] || 'N/A')}</td>
      <td><span class="circular-select-icon"></span></td>
    </tr>`;
  }).join('');

  tbody.innerHTML = rows || '<tr><td colspan="8">No tasks found</td></tr>';
}

function renderApprovalTable(): void {
  const tbody = document.getElementById('approve-table-body');
  if (!tbody) return;

  const pendingTasks = taskRequests.filter(t => t.status === 'pending');
  const badge = document.getElementById('approve-count-badge');
  if (badge) badge.textContent = String(pendingTasks.length);

  const rows = pendingTasks.map(t => {
    const asset = assetIdMap.get(t.asset_id);

    return `<tr data-task-id="${esc(t.task_request_id)}">
      <td>${esc(t.task_request_id.slice(0, 8))}</td>
      <td>${esc(asset?.location || 'N/A')}</td>
      <td>${esc(t.requested_at?.split('T')[0] || 'N/A')}</td>
      <td>${esc(t.description)}</td>
      <td>${esc(t.requested_at?.split('T')[0] || 'N/A')}</td>
      <td><span class="status-badge pending">${esc(t.status)}</span></td>
      <td>
        <button class="planner-btn" style="padding: 4px 12px; font-size: 11px;" onclick="approveTask('${esc(t.task_request_id)}')">Approve</button>
        <button class="planner-btn" style="padding: 4px 12px; font-size: 11px; color: var(--danger);" onclick="rejectTask('${esc(t.task_request_id)}')">Reject</button>
      </td>
    </tr>`;
  }).join('');

  tbody.innerHTML = rows || '<tr><td colspan="7">No pending approvals</td></tr>';
}

function renderBreakdownTable(): void {
  const tbody = document.getElementById('pb-breakdown-table-body');
  if (!tbody) return;

  const rows = taskRequests.map(t => {
    const asset = assetIdMap.get(t.asset_id);

    return `<tr data-task-id="${esc(t.task_request_id)}">
      <td>${esc(t.task_request_id.slice(0, 8))}</td>
      <td>${esc(t.requested_at?.split('T')[0] || 'N/A')}</td>
      <td>${esc(t.requested_at?.split('T')[1]?.slice(0, 5) || 'N/A')}</td>
      <td>${esc(asset?.location || 'N/A')}</td>
      <td>${esc(asset?.name || 'Unknown')}</td>
      <td>${esc(t.created_by_user_id)}</td>
      <td>${esc(t.description)}</td>
      <td>N/A</td>
      <td>${esc(t.task_type)}</td>
      <td><button class="planner-btn" style="padding: 4px 8px; font-size: 11px;">Select</button></td>
    </tr>`;
  }).join('');

  tbody.innerHTML = rows || '<tr><td colspan="10">No breakdown tasks</td></tr>';
}

function renderTechJobsTable(): void {
  const tbody = document.getElementById('tech-jobs-table-body');
  if (!tbody) return;

  const rows = workOrders.map(wo => {
    return `<tr data-wo-id="${esc(wo.work_order_id)}">
      <td>${esc(wo.work_order_id.slice(0, 8))}</td>
      <td>N/A</td>
      <td>N/A</td>
      <td><span class="status-badge ${wo.priority === 'critical' ? 'critical' : wo.priority === 'high' ? 'urgent' : 'normal'}">${esc(wo.priority)}</span></td>
      <td>${esc(wo.status)}</td>
      <td>${esc(wo.scheduled_start?.split('T')[0] || 'N/A')}</td>
      <td><button class="planner-btn" style="padding: 4px 8px; font-size: 11px;">Update</button></td>
    </tr>`;
  }).join('');

  tbody.innerHTML = rows || '<tr><td colspan="7">No work orders</td></tr>';
}

// ============================================================
// NAVIGATION
// ============================================================

function navigateToPane(paneId: string): void {
  document.querySelectorAll('.content-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));

  const pane = document.getElementById(paneId);
  if (pane) pane.classList.add('active');

  const menuItem = document.querySelector(`[data-target="${paneId}"]`);
  if (menuItem) menuItem.classList.add('active');
}

// Make navigateToPane available globally
(window as any).navigateToPane = navigateToPane;

// ============================================================
// AUTH UI
// ============================================================

function switchAuthTab(tab: 'login' | 'signup'): void {
  const loginPane = document.getElementById('form-login-pane');
  const signupPane = document.getElementById('form-signup-pane');
  const loginTab = document.getElementById('tab-login');
  const signupTab = document.getElementById('tab-signup');

  if (tab === 'login') {
    loginPane?.classList.add('active');
    signupPane?.classList.remove('active');
    loginTab?.classList.add('active');
    signupTab?.classList.remove('active');
  } else {
    loginPane?.classList.remove('active');
    signupPane?.classList.add('active');
    loginTab?.classList.remove('active');
    signupTab?.classList.add('active');
  }
}

(window as any).switchAuthTab = switchAuthTab;

function toggleSignupFields(): void {
  const roleSelect = document.getElementById('auth-signup-role') as HTMLSelectElement;
  const deptField = document.getElementById('signup-dept-field');
  const tradeField = document.getElementById('signup-trade-field');

  if (roleSelect?.value === 'technician') {
    deptField!.style.display = 'none';
    tradeField!.style.display = 'block';
  } else {
    deptField!.style.display = 'block';
    tradeField!.style.display = 'none';
  }
}

(window as any).toggleSignupFields = toggleSignupFields;

// ============================================================
// TASK ACTIONS
// ============================================================

function selectTask(taskId: string): void {
  selectedTaskId = taskId;
  document.querySelectorAll('.select-task-table tr.selected').forEach(r => r.classList.remove('selected'));
  const row = document.querySelector(`[data-task-id="${taskId}"]`);
  if (row) row.classList.add('selected');
}

(window as any).selectTask = selectTask;

function selectDepartment(deptId: string): void {
  selectedDeptId = deptId;
  document.querySelectorAll('.fm-scroll-table tr.active').forEach(r => r.classList.remove('active'));
  const row = document.querySelector(`[data-dept-id="${deptId}"]`);
  if (row) row.classList.add('active');

  const dept = deptMap.get(deptId);
  const nameEl = document.getElementById('fm-detail-dept-name');
  const locEl = document.getElementById('fm-detail-dept-loc');
  if (dept && nameEl) nameEl.textContent = dept.name;
  if (dept && locEl) locEl.textContent = dept.location || 'N/A';
}

(window as any).selectDepartment = selectDepartment;

async function approveTask(taskId: string): Promise<void> {
  const session = auth.getSession();
  if (!session) return alert('Please log in first.');

  try {
    await nitaApi.approveTask(taskId, session.user.user_id);
    await loadAllData();
  } catch (error) {
    console.error('Failed to approve task:', error);
    alert('Failed to approve task.');
  }
}

(window as any).approveTask = approveTask;

async function rejectTask(taskId: string): Promise<void> {
  const reason = prompt('Enter rejection reason:');
  if (!reason) return;

  try {
    await nitaApi.rejectTask(taskId, reason);
    await loadAllData();
  } catch (error) {
    console.error('Failed to reject task:', error);
    alert('Failed to reject task.');
  }
}

(window as any).rejectTask = rejectTask;

// ============================================================
// INITIALIZATION
// ============================================================

async function initApp(): Promise<void> {
  // Initialize i18n
  i18n.initLanguageSwitcher();

  // Check if user is authenticated
  if (auth.isAuthenticated()) {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.classList.add('hidden');

    const session = auth.getSession();
    if (session) {
      const nameEl = document.getElementById('current-user-name');
      const roleEl = document.getElementById('current-user-role');
      const avatarEl = document.getElementById('current-user-avatar');

      if (nameEl) nameEl.textContent = session.user.full_name;
      if (roleEl) roleEl.textContent = session.role;
      if (avatarEl) {
        const initials = session.user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        avatarEl.textContent = initials;
      }

      // Show/hide menu items based on role
      if (session.role === 'technician') {
        document.getElementById('menu-technician-tasks')?.style.setProperty('display', 'flex');
        document.getElementById('menu-coordinator-dash')?.style.setProperty('display', 'none');
        document.getElementById('menu-planning-breakdown')?.style.setProperty('display', 'none');
        document.getElementById('menu-task-entry')?.style.setProperty('display', 'none');
        document.getElementById('menu-tasks-to-approve')?.style.setProperty('display', 'none');
      }
    }

    await loadAllData();
  }

  // Setup login handler
  const loginBtn = document.getElementById('btn-login-submit');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const phone = (document.getElementById('auth-phone') as HTMLInputElement).value;
      const pin = (document.getElementById('auth-pin') as HTMLInputElement).value;

      if (!phone || !pin) {
        alert('Please enter phone and PIN.');
        return;
      }

      const result = await auth.login(phone, pin);
      if (result.success) {
        location.reload();
      } else {
        alert(result.error || 'Login failed.');
      }
    });
  }

  // Setup signup handler
  const signupBtn = document.getElementById('btn-signup-submit');
  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      const name = (document.getElementById('auth-signup-name') as HTMLInputElement).value;
      const phone = (document.getElementById('auth-signup-phone') as HTMLInputElement).value;
      const role = (document.getElementById('auth-signup-role') as HTMLSelectElement).value;
      const pin = (document.getElementById('auth-signup-pin') as HTMLInputElement).value;

      if (!name || !phone || !role || !pin) {
        alert('All fields are required.');
        return;
      }

      const result = await auth.signup(name, phone, role, pin);
      if (result.success) {
        alert('Account created! Please sign in.');
        switchAuthTab('login');
      } else {
        alert(result.error || 'Signup failed.');
      }
    });
  }

  // Setup logout handler
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.logout();
      location.reload();
    });
  }

  // Setup navigation
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      if (target) navigateToPane(target);
    });
  });

  // Initial department selection
  if (departments.length > 0) {
    selectDepartment(departments[0].department_id);
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', initApp);