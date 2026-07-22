// ============================================================
// RT KNITS — NITA CMMS Dashboard Rendering
// ============================================================

import { $, esc, ago } from './utils';
import {
  departments, assets, technicians, taskRequests, workOrders, feedbacks,
  assetIdMap, deptMap, auditLog, allUsers, selectedDeptId, session
} from './state';
import type { DashboardStats, ActivityEntry, TechPerformanceData } from './types';

// ── Priority Helpers ────────────────────────────────────────
export function isPriorityCritical(p: unknown): boolean {
  return p === 'critical' || p === 0;
}
export function isPriorityHigh(p: unknown): boolean {
  return p === 'high' || p === 1;
}
export function isPriorityMedium(p: unknown): boolean {
  return p === 'medium' || p === 2;
}

export function getPriorityBadge(p: unknown): string {
  if (isPriorityCritical(p)) return '<span class="badge badge-p0">P0 CRITICAL</span>';
  if (isPriorityHigh(p)) return '<span class="badge badge-p1">P1 URGENT</span>';
  return '<span class="badge badge-p2">P2 NORMAL</span>';
}

export function getPriorityShort(p: unknown): string {
  if (isPriorityCritical(p)) return 'P0';
  if (isPriorityHigh(p)) return 'P1';
  return 'P2';
}

export function getFullNameForUserId(userId: string): string {
  if (!userId) return 'Unknown';
  const u = allUsers[userId];
  if (u && u.full_name) return u.full_name;
  return userId.slice(0, 8);
}

// ── Stats ───────────────────────────────────────────────────
export function getStats(): DashboardStats {
  const pending = taskRequests.filter((t) => t.status === 'pending' || t.status === 'pending_approval').length;
  const inProgress = taskRequests.filter((t) => t.status === 'approved' || t.status === 'in_progress').length;
  const completed = taskRequests.filter((t) => t.status === 'completed').length;
  const critical = taskRequests.filter((t) => isPriorityCritical(t.priority) && t.status !== 'completed').length;
  const high = taskRequests.filter((t) => isPriorityHigh(t.priority)).length;
  const medium = taskRequests.filter((t) => isPriorityMedium(t.priority)).length;
  const activeTechs = technicians.filter((t) => t.active !== false).length;
  const totalAssets = assets.length;
  const totalDepts = departments.length;
  const totalWo = workOrders.length;
  const woInProgress = workOrders.filter((w) => w.status === 'in_progress').length;
  const woCompleted = workOrders.filter((w) => w.status === 'completed').length;
  const rejected = taskRequests.filter((t) => t.status === 'rejected').length;
  return {
    pending, inProgress, completed, rejected,
    critical, high, medium,
    activeTechs, total: taskRequests.length,
    totalAssets, totalDepts,
    totalWo, woInProgress, woCompleted
  };
}

// ── Admin Dashboard ─────────────────────────────────────────
export function renderAdminDashboard(): void {
  renderWelcomeBar();
  const s = getStats();
  renderAdminStatsTop(s);
  renderAdminActivityFeed();
  renderAdminTechPerformance();
  renderAdminPriorityChart(s);
  renderAdminDeptStats();
}

function renderWelcomeBar(): void {
  const greetingEl = $('welcome-greeting');
  const subEl = $('welcome-sub');
  const timeEl = $('welcome-time');
  if (!greetingEl || !subEl) return;

  const hour = new Date().getHours();
  let period = 'Good evening';
  if (hour < 12) period = 'Good morning';
  else if (hour < 17) period = 'Good afternoon';

  const name = session?.user?.full_name?.split(' ')[0] || 'there';
  greetingEl.textContent = period + ', ' + name;

  const s = getStats();
  if (s.critical > 0) {
    subEl.textContent = s.critical + ' critical alert' + (s.critical > 1 ? 's' : '') + ' need' + (s.critical === 1 ? 's' : '') + ' immediate attention.';
    subEl.style.color = 'var(--red)';
  } else if (s.pending > 0) {
    subEl.textContent = s.pending + ' task' + (s.pending > 1 ? 's' : '') + ' awaiting your approval.';
    subEl.style.color = 'var(--amber)';
  } else {
    subEl.textContent = 'All systems operational. ' + s.completed + ' tasks completed this period.';
    subEl.style.color = 'var(--green)';
  }

  if (timeEl) {
    const now = new Date();
    timeEl.textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}

function renderAdminStatsTop(s: DashboardStats): void {
  const el = $('admin-stats-top');
  if (!el) return;
  el.innerHTML =
    '<div class="admin-stat-card"><div class="admin-stat-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="admin-stat-info"><div class="admin-stat-value" style="color:var(--red)">' + s.critical + '</div><div class="admin-stat-label">P0 Critical</div><div class="admin-stat-change ' + (s.critical > 0 ? 'down' : 'up') + '">' + (s.critical > 0 ? 'Needs attention' : 'All clear') + '</div></div></div>' +
    '<div class="admin-stat-card"><div class="admin-stat-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="admin-stat-info"><div class="admin-stat-value" style="color:var(--amber)">' + s.pending + '</div><div class="admin-stat-label">Pending Approval</div><div class="admin-stat-change">Awaiting review</div></div></div>' +
    '<div class="admin-stat-card"><div class="admin-stat-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg></div><div class="admin-stat-info"><div class="admin-stat-value" style="color:var(--cyan)">' + s.woInProgress + '</div><div class="admin-stat-label">Active Dispatches</div><div class="admin-stat-change up">' + s.totalWo + ' total orders</div></div></div>' +
    '<div class="admin-stat-card"><div class="admin-stat-icon accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="admin-stat-info"><div class="admin-stat-value" style="color:var(--accent-light)">' + s.activeTechs + '</div><div class="admin-stat-label">Techs On-Duty</div><div class="admin-stat-change up">' + technicians.length + ' registered</div></div></div>' +
    '<div class="admin-stat-card"><div class="admin-stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="admin-stat-info"><div class="admin-stat-value" style="color:var(--green)">' + s.completed + '</div><div class="admin-stat-label">Completed</div><div class="admin-stat-change up">' + s.total + ' total tasks</div></div></div>' +
    '<div class="admin-stat-card"><div class="admin-stat-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></div><div class="admin-stat-info"><div class="admin-stat-value" style="color:#a855f7">' + s.totalAssets + '</div><div class="admin-stat-label">Registered Assets</div><div class="admin-stat-change">' + s.totalDepts + ' departments</div></div></div>';

  const badge = $('fm-badge-approval'); if (badge) badge.textContent = String(s.pending);
  const adminBadge = $('admin-approval-badge'); if (adminBadge) adminBadge.textContent = String(s.pending);
  const deptBadge = $('dept-count-badge'); if (deptBadge) deptBadge.textContent = String(departments.length);
}

function renderAdminActivityFeed(): void {
  const el = $('admin-activity-feed');
  if (!el) return;
  const activities: ActivityEntry[] = [];

  taskRequests.slice(0, 8).forEach((tk) => {
    const a = assetIdMap[tk.asset_id] || ({} as any);
    const dotColor = isPriorityCritical(tk.priority) ? 'red' : isPriorityHigh(tk.priority) ? 'amber' : 'cyan';
    const statusText = tk.status === 'pending' ? 'New task request submitted' : tk.status === 'approved' ? 'Task approved and dispatched' : tk.status === 'completed' ? 'Task completed' : tk.status === 'rejected' ? 'Task rejected' : 'Task updated';
    activities.push({
      dot: dotColor,
      text: '<strong>' + esc(a.name || 'Asset') + '</strong> — ' + statusText,
      time: tk.requested_at || new Date().toISOString(),
      ts: new Date(tk.requested_at || new Date().toISOString()).getTime()
    });
  });

  workOrders.slice(0, 5).forEach((wo) => {
    const tr = taskRequests.find((t) => t.task_request_id === wo.task_request_id) || ({} as any);
    const a = assetIdMap[tr.asset_id] || ({} as any);
    const techName = getFullNameForUserId(wo.recommended_technician_id);
    const dotColor = wo.status === 'completed' ? 'green' : wo.status === 'in_progress' ? 'accent' : 'amber';
    activities.push({
      dot: dotColor,
      text: 'Work order for <strong>' + esc(a.name || 'Asset') + '</strong> assigned to <strong>' + esc(techName) + '</strong>',
      time: wo.created_at || new Date().toISOString(),
      ts: new Date(wo.created_at || new Date().toISOString()).getTime()
    });
  });

  auditLog.slice(0, 10).forEach((entry) => {
    const dotColor = entry.action.includes('approved') ? 'green' : entry.action.includes('rejected') ? 'red' : entry.action.includes('dispatched') ? 'accent' : entry.action.includes('created') ? 'cyan' : 'amber';
    activities.push({
      dot: dotColor,
      text: '<strong>' + esc(entry.actor) + '</strong> — ' + esc(entry.action.replace(/_/g, ' ')) + ' ' + esc(entry.detail),
      time: entry.timestamp,
      ts: new Date(entry.timestamp).getTime()
    });
  });

  activities.sort((a, b) => b.ts - a.ts);
  const sliced = activities.slice(0, 15);

  if (!sliced.length) {
    el.innerHTML = '<div class="conv-empty">No recent activity</div>';
    return;
  }

  el.innerHTML = sliced.map((a) =>
    '<div class="admin-activity-item">' +
    '<div class="admin-activity-dot ' + a.dot + '"></div>' +
    '<div><div class="admin-activity-text">' + a.text + '</div>' +
    '<div class="admin-activity-time">' + esc(ago(a.time)) + '</div></div>' +
    '</div>'
  ).join('');
}

function renderAdminTechPerformance(): void {
  const el = $('admin-tech-performance');
  if (!el) return;
  if (!technicians.length) {
    el.innerHTML = '<div class="conv-empty">No technicians registered</div>';
    return;
  }
  const techData: TechPerformanceData[] = technicians.map((t) => {
    const assigned = workOrders.filter((w) => w.recommended_technician_id === t.technician_id).length;
    const completed = workOrders.filter((w) => w.recommended_technician_id === t.technician_id && w.status === 'completed').length;
    const r = feedbacks.filter((f) => f.technician_id === t.technician_id || f.rated_by_user_id === t.user_id);
    const avg = r.length ? Math.round(r.reduce((s, f) => s + (f.derived_rating || f.rating || 5), 0) / r.length) : 5;
    const pct = assigned ? Math.round((completed / assigned) * 100) : 0;
    return { tech: t, assigned, completed, avg, pct };
  }).sort((a, b) => b.avg - a.avg);

  el.innerHTML = techData.map((d) => {
    const initials = d.tech.full_name ? d.tech.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) : '??';
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < d.avg ? '★' : '☆';
    return '<div class="admin-tech-item">' +
      '<div class="admin-tech-avatar">' + initials + '</div>' +
      '<div class="admin-tech-info">' +
      '<div class="admin-tech-name">' + esc(d.tech.full_name) + '</div>' +
      '<div class="admin-tech-trade">' + esc(d.tech.trade || 'General') + ' · ' + d.completed + '/' + d.assigned + ' completed</div>' +
      '</div>' +
      '<div class="admin-tech-bar-wrap"><div class="admin-tech-bar" style="width:' + d.pct + '%"></div></div>' +
      '<div class="admin-tech-rating">' + stars + '</div>' +
      '</div>';
  }).join('');
}

function renderAdminPriorityChart(s: DashboardStats): void {
  const el = $('admin-priority-chart');
  if (!el) return;
  const total = s.total || 1;
  const p0Pct = Math.round((s.critical / total) * 100);
  const p1Pct = Math.round((s.high / total) * 100);
  const p2Pct = Math.round((s.medium / total) * 100);

  el.innerHTML =
    '<div class="admin-priority-row"><div class="admin-priority-label" style="color:var(--red)">P0 Critical</div><div class="admin-priority-bar-wrap"><div class="admin-priority-bar p0" style="width:' + p0Pct + '%"></div></div><div class="admin-priority-count red">' + s.critical + '</div></div>' +
    '<div class="admin-priority-row"><div class="admin-priority-label" style="color:var(--amber)">P1 Urgent</div><div class="admin-priority-bar-wrap"><div class="admin-priority-bar p1" style="width:' + p1Pct + '%"></div></div><div class="admin-priority-count amber">' + s.high + '</div></div>' +
    '<div class="admin-priority-row"><div class="admin-priority-label" style="color:var(--cyan)">P2 Normal</div><div class="admin-priority-bar-wrap"><div class="admin-priority-bar p2" style="width:' + p2Pct + '%"></div></div><div class="admin-priority-count cyan">' + s.medium + '</div></div>';
}

function renderAdminDeptStats(): void {
  const el = $('admin-dept-stats');
  if (!el) return;
  el.innerHTML =
    '<div class="admin-dept-stat"><div class="admin-dept-stat-num">' + assets.length + '</div><div class="admin-dept-stat-label">Assets</div></div>' +
    '<div class="admin-dept-stat"><div class="admin-dept-stat-num">' + taskRequests.length + '</div><div class="admin-dept-stat-label">Tasks</div></div>' +
    '<div class="admin-dept-stat"><div class="admin-dept-stat-num">' + workOrders.length + '</div><div class="admin-dept-stat-label">Work Orders</div></div>';
}

// ── Main Dashboard ──────────────────────────────────────────
export function renderDashboard(): void {
  const s = getStats();
  const el = $('stats-grid');
  if (el) el.innerHTML =
    '<div class="stat-card ' + (s.critical > 0 ? 'stat-red' : 'stat-green') + '"><div class="stat-num">' + s.critical + '</div><div class="stat-label">P0 Critical Alerts</div></div>' +
    '<div class="stat-card stat-amber"><div class="stat-num">' + s.pending + '</div><div class="stat-label">Pending Approvals</div></div>' +
    '<div class="stat-card stat-cyan"><div class="stat-num">' + s.inProgress + '</div><div class="stat-label">Active Dispatches</div></div>' +
    '<div class="stat-card stat-accent"><div class="stat-num">' + s.activeTechs + '</div><div class="stat-label">Techs On-Duty</div></div>' +
    '<div class="stat-card stat-green"><div class="stat-num">99.8%</div><div class="stat-label">Plant SLA Target</div></div>' +
    '<div class="stat-card stat-cyan"><div class="stat-num">' + assets.length + '</div><div class="stat-label">Registered Assets</div></div>';
  const badge = $('fm-badge-approval'); if (badge) badge.textContent = String(s.pending);
  const adminBadge = $('admin-approval-badge'); if (adminBadge) adminBadge.textContent = String(s.pending);
}

// ── Department List ─────────────────────────────────────────
export function renderDepts(): void {
  const t = $('fm-dept-dashboard-table');
  if (!t) return;
  if (!departments.length) {
    t.innerHTML = '<tr><td style="padding:20px;text-align:center;color:var(--text-3)">No departments registered</td></tr>';
    return;
  }
  t.innerHTML = departments.map((d) => {
    const isSel = selectedDeptId === d.department_id;
    const deptTasks = taskRequests.filter((tk) => assets.some((a) => a.asset_id === tk.asset_id && deptMap[a.asset_id] && deptMap[a.asset_id].department_id === d.department_id));
    const hasCrit = deptTasks.some((tk) => isPriorityCritical(tk.priority) && tk.status !== 'completed');
    const b = hasCrit ? '<span class="badge badge-p0" style="padding:2px 8px;font-size:10px">LINE STOP</span>' : '<span class="badge badge-success" style="padding:2px 8px;font-size:10px">OPERATIONAL</span>';
    return '<tr class="' + (isSel ? 'active' : '') + '" data-dept="' + esc(d.department_id) + '" onclick="selectDept(\'' + esc(d.department_id) + '\')"><td style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;"><span style="font-weight:700;color:var(--text)">' + esc(d.name) + '</span>' + b + '</td></tr>';
  }).join('') || '<tr><td style="padding:20px;text-align:center;color:var(--text-3)">No departments</td></tr>';
}
