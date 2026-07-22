// ============================================================
// RT KNITS — NITA CMMS Task Management
// ============================================================

import { $, $$, esc, toast, uid, today } from './utils';
import { supaInsert, supaUpdate } from './supabase';
import {
  taskRequests, assets, workOrders, assetIdMap, assetMap,
  session, currentTaskFilter, setCurrentTaskFilter
} from './state';
import { getPriorityBadge, getStats } from './dashboard';
import type { TaskRequest } from './types';

// ── Task List Rendering ─────────────────────────────────────
export function filterTasks(st: string): void {
  setCurrentTaskFilter(st);
  toast('Filtering task list by: ' + st.toUpperCase(), 'info');
  renderTasks();
}

export function renderTasks(): void {
  const t = $('te-task-list-body');
  if (!t) return;
  let list = [...taskRequests];
  if (currentTaskFilter === 'planned') list = list.filter((tk) => tk.status === 'approved' || tk.status === 'in_progress');
  else if (currentTaskFilter === 'deleted') list = list.filter((tk) => tk.status === 'rejected');
  else if (currentTaskFilter === 'rework') list = list.filter((tk) => tk.status === 'rework' || tk.priority === 'high');
  else if (currentTaskFilter === 'unplanned') list = list.filter((tk) => tk.status === 'pending');

  t.innerHTML = list.map((tk) => {
    const a = assetIdMap[tk.asset_id] || ({} as any);
    const priBadge = getPriorityBadge(tk.priority);
    const stBadge = tk.status === 'approved' || tk.status === 'in_progress' ? '<span class="badge badge-warning">IN PROGRESS</span>' :
      tk.status === 'completed' ? '<span class="badge badge-success">COMPLETED</span>' :
      tk.status === 'rejected' ? '<span class="badge badge-danger">REJECTED</span>' :
      '<span class="badge badge-pending">PENDING</span>';
    const cls = tk.status === 'approved' || tk.status === 'in_progress' ? 'row-planned' :
      tk.status === 'rejected' ? 'row-deleted' :
      tk.status === 'pending' ? 'row-unplanned' : '';
    return '<tr class="' + cls + '" onclick="selectTask(\'' + esc(tk.task_request_id) + '\')">' +
      '<td class="mono" style="font-weight:700;color:var(--text)">' + esc(a.asset_code || '—') + '</td>' +
      '<td style="font-weight:700">' + esc(a.name || '—') + '</td>' +
      '<td>' + esc(tk.task_type || 'Repair') + '</td>' +
      '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(tk.description) + '</td>' +
      '<td>' + priBadge + '</td>' +
      '<td>' + stBadge + '</td>' +
      '<td class="mono-text">' + esc((tk.requested_at || '').split('T')[0]) + '</td>' +
      '<td><div class="radio-dot" data-id="' + esc(tk.task_request_id) + '"></div></td></tr>';
  }).join('') || '<tr><td colspan="8" style="padding:40px;text-align:center;color:var(--text-3)">No tasks matching filter</td></tr>';
}

// ── Task Actions ────────────────────────────────────────────
export function selectTask(id: string): void {
  $$('.data-table tr.selected').forEach((r) => r.classList.remove('selected'));
  const row = document.querySelector('[data-id="' + id + '"]');
  if (row) {
    const trEl = (row as HTMLElement).closest('tr');
    if (trEl) trEl.classList.add('selected');
  }
}

export async function approveTask(id: string): Promise<void> {
  try {
    await supaUpdate('task_request', { task_request_id: id }, { status: 'approved', approved_at: new Date().toISOString() });
    const tr = taskRequests.find((t) => t.task_request_id === id);
    if (tr) tr.status = 'approved';
    (window as any)._logAudit('task_approved', 'Approved task request #' + id.slice(0, 8), 'task_request:' + id);
    toast('Task ' + id.slice(0, 8) + ' approved!', 'success');
    await (window as any)._loadAll();
  } catch (_e) {
    const tr2 = taskRequests.find((t) => t.task_request_id === id);
    if (tr2) tr2.status = 'approved';
    (window as any)._logAudit('task_approved', 'Approved task request #' + id.slice(0, 8) + ' (local)', 'task_request:' + id);
    toast('Task approved locally!', 'success');
    (window as any)._renderAll();
  }
}

export async function rejectTask(id: string): Promise<void> {
  const reason = prompt('Rejection reason:');
  if (!reason) return;
  try {
    await supaUpdate('task_request', { task_request_id: id }, { status: 'rejected', rejection_reason: reason });
    const tr = taskRequests.find((t) => t.task_request_id === id);
    if (tr) tr.status = 'rejected';
    (window as any)._logAudit('task_rejected', 'Rejected task #' + id.slice(0, 8) + '. Reason: ' + reason, 'task_request:' + id);
    toast('Task rejected.', 'info');
    await (window as any)._loadAll();
  } catch (_e) {
    const tr2 = taskRequests.find((t) => t.task_request_id === id);
    if (tr2) tr2.status = 'rejected';
    (window as any)._logAudit('task_rejected', 'Rejected task #' + id.slice(0, 8) + ' (local). Reason: ' + reason, 'task_request:' + id);
    toast('Task rejected locally.', 'info');
    (window as any)._renderAll();
  }
}

export async function dispatchTask(id: string): Promise<void> {
  const techId = prompt('Enter technician ID or name to assign:');
  if (!techId) return;
  const woId = 'wo-' + uid();
  const wo = {
    work_order_id: woId,
    task_request_id: id,
    status: 'in_progress',
    priority: 'high',
    scheduled_start: today(),
    created_at: new Date().toISOString(),
    recommended_technician_id: techId
  };
  workOrders.unshift(wo);
  const tr = taskRequests.find((t) => t.task_request_id === id);
  if (tr) tr.status = 'approved';
  (window as any)._logAudit('work_order_dispatched', 'Dispatched work order #' + woId.slice(0, 8) + ' for task #' + id.slice(0, 8) + ' to ' + techId, 'work_order:' + woId);
  toast('Work order dispatched!', 'success');
  supaInsert('work_order', wo).catch(() => {});
  (window as any)._renderAll();
}

export async function updateWorkOrder(id: string, status: string): Promise<void> {
  const body: Record<string, unknown> = { status };
  if (status === 'completed') body.completed_at = new Date().toISOString();
  const wo = workOrders.find((w) => w.work_order_id === id);
  if (wo) {
    wo.status = status;
    if (status === 'completed') wo.completed_at = body.completed_at as string;
  }
  (window as any)._logAudit('work_order_updated', 'Work order #' + id.slice(0, 8) + ' status changed to ' + status, 'work_order:' + id);
  toast('Work order updated to ' + status + '!', 'success');
  supaUpdate('work_order', { work_order_id: id }, body).catch(() => {});
  (window as any)._renderAll();
  if (status === 'completed') {
    (window as any).showRatingDialog(id, wo ? wo.recommended_technician_id : 'tech-1');
  }
}

export function resetAllWorkOrders(): void {
  if (!confirm('Reset all work orders?')) return;
  workOrders.length = 0;
  (window as any)._renderAll();
  toast('Work orders cleared.', 'info');
}

// ── Create Task ─────────────────────────────────────────────
export async function createTask(): Promise<void> {
  const codeInput = $('te-asset-code') as HTMLInputElement | null;
  const descInput = $('te-description') as HTMLInputElement | null;
  const urgencyInput = $('te-urgency') as HTMLSelectElement | null;
  if (!codeInput || !descInput || !urgencyInput) return;

  const assetCode = codeInput.value.trim();
  const desc = descInput.value.trim();
  const urgency = urgencyInput.value;
  if (!assetCode || !desc) return toast('Asset code and description required.', 'error');

  let asset = assetMap[assetCode] || assets.find((a) => a.asset_code === assetCode || a.asset_id === assetCode);
  if (!asset) asset = { asset_id: assetCode || '39', name: 'Machine #' + assetCode, required_trade: 'Mechanic', asset_code: assetCode, status: 'operational', location: '' };

  const priority = urgency === '0' ? 'critical' : urgency === '1' ? 'high' : 'medium';
  const taskType = urgency === '2' ? 'improvement' : 'repair';
  const taskId = uid('tr');

  const newTask: TaskRequest = {
    task_request_id: taskId,
    asset_id: asset.asset_id,
    created_by_user_id: session ? session.userId : 'Operator',
    status: 'pending',
    priority,
    requested_at: new Date().toISOString(),
    description: desc,
    task_type: taskType,
    required_trade: asset.required_trade || 'General',
    created_by_role: session ? session.role : 'Operator'
  };

  taskRequests.unshift(newTask);
  (window as any)._logAudit('task_created', 'Created task request #' + taskId.slice(0, 8) + ' for asset ' + esc(assetCode) + ' (' + priority + ')', 'task_request:' + taskId);
  toast('Task request created! Sent for approval.', 'success');
  codeInput.value = '';
  const nameInput = $('te-asset-name') as HTMLInputElement | null;
  if (nameInput) nameInput.value = '';
  descInput.value = '';

  supaInsert('task_request', newTask).catch(() => {});
  (window as any)._rebuildCaches();
  (window as any)._renderAll();
}
