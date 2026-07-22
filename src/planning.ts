// ============================================================
// RT KNITS — NITA CMMS Planning & Breakdown Module
// ============================================================

import { $, $$, esc, toast, uid, today } from './utils';
import { supaInsert } from './supabase';
import {
  taskRequests, technicians, workOrders, assetIdMap, techMap,
  currentBreakdownTab, selectedBreakdownTaskId,
  setCurrentBreakdownTab, setSelectedBreakdownTaskId
} from './state';
import { getPriorityBadge, getFullNameForUserId } from './dashboard';

export function setBreakdownTab(el: HTMLElement | null, tabName: string): void {
  setCurrentBreakdownTab(tabName || 'leakage');
  $$('.subtabs .subtab').forEach((b) => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderBreakdown();
}

export function selectBreakdownTask(id: string): void {
  setSelectedBreakdownTaskId(id);
  $$('#pb-breakdown-table-body tr').forEach((r) => r.classList.remove('selected'));
  const row = document.querySelector('[data-breakdown-id="' + id + '"]');
  if (row) (row as HTMLElement).classList.add('selected');
  toast('Task ' + id.slice(0, 8) + ' selected for dispatch.', 'info');
}

function populateTechSelect(): void {
  const sel = $('pb-tech-select') as HTMLSelectElement | null;
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">Select Technician...</option>' + technicians.map((t) =>
    '<option value="' + esc(t.technician_id) + '">' + esc(t.full_name) + ' (' + esc(t.trade || 'General') + ')</option>'
  ).join('');
  if (currentVal) sel.value = currentVal;
}

export function renderBreakdown(): void {
  populateTechSelect();
  const startInput = $('pb-start-date') as HTMLInputElement | null;
  const finishInput = $('pb-finish-date') as HTMLInputElement | null;
  if (startInput && !startInput.value) startInput.value = today();
  if (finishInput && !finishInput.value) finishInput.value = today();

  const t = $('pb-breakdown-table-body');
  if (!t) return;

  let list = [...taskRequests];
  if (currentBreakdownTab === 'leakage') {
    list = list.filter((tk) => getPriorityBadge(tk.priority).includes('P0') || getPriorityBadge(tk.priority).includes('P1') || (tk.description || '').toLowerCase().includes('leak'));
  } else if (currentBreakdownTab === 'repairs') {
    list = list.filter((tk) => tk.task_type === 'repair' || tk.priority === 'high' || tk.priority === 'critical' || tk.priority === 0 || tk.priority === 1);
  } else if (currentBreakdownTab === 'pending') {
    list = list.filter((tk) => tk.status === 'pending' || tk.status === 'pending_approval');
  } else if (currentBreakdownTab === 'approved') {
    list = list.filter((tk) => tk.status === 'approved' || tk.status === 'in_progress');
  }

  t.innerHTML = list.map((tk) => {
    const a = assetIdMap[tk.asset_id] || ({} as any);
    const isSel = selectedBreakdownTaskId === tk.task_request_id;
    const priBadge = getPriorityBadge(tk.priority);
    const creatorName = getFullNameForUserId(tk.created_by_user_id);
    return '<tr class="' + (isSel ? 'selected' : '') + '" data-breakdown-id="' + esc(tk.task_request_id) + '" onclick="selectBreakdownTask(\'' + esc(tk.task_request_id) + '\')">' +
      '<td class="mono" style="font-weight:700">' + esc((tk.task_request_id || '').slice(0, 8)) + '</td>' +
      '<td class="mono-text">' + esc((tk.requested_at || '').split('T')[0]) + '</td>' +
      '<td class="mono-text">' + esc((tk.requested_at || '').split('T')[1] || '').slice(0, 5) + '</td>' +
      '<td>' + esc(a.location || '—') + '</td>' +
      '<td style="font-weight:700">' + esc(a.name || '—') + '</td>' +
      '<td>' + esc(creatorName) + '</td>' +
      '<td style="max-width:220px;line-height:1.4">' + esc(tk.description) + '</td>' +
      '<td>' + priBadge + '</td>' +
      '<td><button class="btn-primary" style="padding:6px 12px;font-size:11px" onclick="event.stopPropagation();dispatchTask(\'' + esc(tk.task_request_id) + '\')">Dispatch</button></td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="9" style="padding:40px;text-align:center;color:var(--text-3)">No tasks under tab "' + currentBreakdownTab.toUpperCase() + '"</td></tr>';
}

export function dispatchSelectedEngineer(): void {
  const techSelect = $('pb-tech-select') as HTMLSelectElement | null;
  let techId = techSelect ? techSelect.value : '';
  let targetId = selectedBreakdownTaskId;

  if (!targetId && taskRequests.length > 0) {
    targetId = taskRequests[0].task_request_id;
  }
  if (!targetId) return toast('No task request available to dispatch.', 'error');

  if (!techId) {
    techId = prompt('Select Technician ID (or choose from dropdown):') || '';
    if (!techId) return;
  }

  const tech = techMap[techId] || technicians.find((t) => t.technician_id === techId) || { full_name: 'Assigned Engineer' };
  const woId = 'wo-' + uid();
  const wo = {
    work_order_id: woId,
    task_request_id: targetId,
    status: 'in_progress',
    priority: 'high',
    scheduled_start: ($('pb-start-date') as HTMLInputElement | null)?.value || today(),
    created_at: new Date().toISOString(),
    recommended_technician_id: techId
  };

  workOrders.unshift(wo);
  const tr = taskRequests.find((t) => t.task_request_id === targetId);
  if (tr) tr.status = 'approved';
  (window as any)._logAudit('work_order_dispatched', 'Dispatched ' + esc(tech.full_name) + ' to task #' + targetId.slice(0, 8) + ' (WO #' + woId.slice(0, 8) + ')', 'work_order:' + woId);

  toast('Engineer ' + tech.full_name + ' dispatched to Task #' + targetId.slice(0, 8) + '!', 'success');
  supaInsert('work_order', wo).catch(() => {});
  (window as any)._loadAll();
}
