// ============================================================
// RT KNITS — NITA CMMS Approvals Module
// ============================================================

import { $, esc } from './utils';
import { taskRequests, assetIdMap } from './state';
import { getPriorityBadge } from './dashboard';

export function renderApprovals(): void {
  const t = $('approve-table-body');
  if (!t) return;
  const searchInput = $('approve-search') as HTMLInputElement | null;
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const pending = taskRequests.filter((tk) => {
    const isP = tk.status === 'pending' || tk.status === 'pending_approval';
    if (!isP) return false;
    if (!query) return true;
    const a = assetIdMap[tk.asset_id] || ({} as any);
    return (tk.task_request_id || '').toLowerCase().includes(query) ||
      (tk.description || '').toLowerCase().includes(query) ||
      (a.name || '').toLowerCase().includes(query);
  });
  const b = $('approve-count-badge');
  if (b) b.textContent = String(pending.length);

  t.innerHTML = pending.map((tk) => {
    const a = assetIdMap[tk.asset_id] || ({} as any);
    const priBadge = getPriorityBadge(tk.priority);
    return '<tr>' +
      '<td class="mono" style="font-weight:700;color:var(--accent-light)">' + esc((tk.task_request_id || '').slice(0, 8)) + '</td>' +
      '<td><div style="font-weight:700;color:var(--text)">' + esc(tk.created_by_role || 'Operator') + '</div><div style="font-size:11px;color:var(--text-3)">' + esc(a.name || a.location || '—') + '</div></td>' +
      '<td class="mono-text">' + esc((tk.requested_at || '').split('T')[0]) + '</td>' +
      '<td style="max-width:280px;line-height:1.4">' + esc(tk.description) + '</td>' +
      '<td>' + priBadge + '</td>' +
      '<td><span class="badge badge-pending">PENDING</span></td>' +
      '<td class="action-cell" style="white-space:nowrap"><button class="btn-approve" onclick="approveTask(\'' + esc(tk.task_request_id) + '\')">Approve</button><button class="btn-reject" onclick="rejectTask(\'' + esc(tk.task_request_id) + '\')">Reject</button></td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text-3)">No pending approvals matching filter</td></tr>';
}
