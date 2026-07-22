// ============================================================
// RT KNITS — NITA CMMS Tech Jobs Module
// ============================================================

import { $, esc } from './utils';
import { workOrders, taskRequests, assetIdMap } from './state';
import { getPriorityBadge, getFullNameForUserId } from './dashboard';

export function renderTechJobs(): void {
  const t = $('tech-jobs-table-body');
  if (!t) return;
  t.innerHTML = workOrders.map((wo) => {
    const tr = taskRequests.find((tk) => tk.task_request_id === wo.task_request_id) || ({} as any);
    const a = assetIdMap[tr.asset_id] || ({} as any);
    const priBadge = getPriorityBadge(wo.priority || tr.priority);
    const stBadge = wo.status === 'completed' ? '<span class="badge badge-success">COMPLETED</span>' :
      wo.status === 'in_progress' ? '<span class="badge badge-warning">IN PROGRESS</span>' :
      '<span class="badge badge-pending">DISPATCHED</span>';
    const techName = getFullNameForUserId(wo.recommended_technician_id);
    const btn = wo.status === 'completed' ?
      '<button class="btn-outline" style="font-size:11px;padding:4px 8px" onclick="showRatingDialog(\'' + esc(wo.work_order_id) + '\',\'' + esc(wo.recommended_technician_id || '') + '\')">&#9733; Rate Job</button>' :
      wo.status === 'in_progress' ?
      '<button class="btn-success" style="font-size:12px;padding:8px 14px" onclick="updateWorkOrder(\'' + esc(wo.work_order_id) + '\',\'completed\')">Mark Completed</button>' :
      '<button class="btn-primary" style="font-size:12px;padding:8px 14px" onclick="updateWorkOrder(\'' + esc(wo.work_order_id) + '\',\'in_progress\')">Start Work</button>';
    return '<tr>' +
      '<td class="mono" style="font-weight:700;color:var(--accent-light)">' + esc((wo.work_order_id || '').slice(0, 8)) + '</td>' +
      '<td style="font-weight:700;color:var(--text)">' + esc(a.name || '—') + '</td>' +
      '<td style="max-width:250px;line-height:1.4">' + esc(tr.description || '—') + '</td>' +
      '<td>' + priBadge + '</td>' +
      '<td>' + stBadge + '</td>' +
      '<td class="mono-text">' + esc((wo.scheduled_start || wo.created_at || '').split('T')[0] || '—') + '</td>' +
      '<td style="white-space:nowrap">' + btn + '</td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text-3)">No active work orders</td></tr>';
}
