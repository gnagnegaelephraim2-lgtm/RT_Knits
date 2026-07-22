// ============================================================
// RT KNITS — NITA CMMS Conversations Module
// ============================================================

import { $, $$, esc, ago } from './utils';
import {
  messageLogs, simChatHistory, workOrders, taskRequests, technicians,
  assetIdMap, allUsers, session,
  selectedConvPhone, convFilterRole,
  setSelectedConvPhone, setConvFilterRole
} from './state';
import { getFullNameForUserId, getPriorityShort } from './dashboard';
import type { NormalizedMessage, ConversationGroup } from './types';

export function getRoleForPhone(phone: string): string {
  const u = allUsers[phone];
  if (u && u.role) return u.role;
  return 'unknown';
}

export function getNameForPhone(phone: string): string {
  const u = allUsers[phone];
  if (u && u.full_name) return u.full_name;
  return phone || 'Unknown';
}

export function getConversationGroups(): ConversationGroup[] {
  const groups: Record<string, ConversationGroup> = {};

  messageLogs.forEach((msg) => {
    const phone = msg.phone_number;
    if (!phone) return;
    const normalizedMsg: NormalizedMessage = {
      phone_number: msg.phone_number,
      message_direction: msg.direction || msg.message_direction || 'inbound',
      message_type: msg.message_type || 'text',
      message_content: msg.content || msg.message_content || '',
      translated_content: msg.translated_content || null,
      meta_data: msg.metadata || msg.meta_data || null,
      created_at: msg.created_at || msg.timestamp || '',
      user_id: msg.user_id || null,
      user_name: msg.user_name || null
    };
    if (!groups[phone]) groups[phone] = { phone, messages: [], role: getRoleForPhone(phone), name: msg.user_name || getNameForPhone(phone) };
    groups[phone].messages.push(normalizedMsg);
  });

  simChatHistory.forEach((msg) => {
    const phone = msg.phone_number || 'sim-' + (session ? session.userId : 'local');
    if (!groups[phone]) groups[phone] = { phone, messages: [], role: getRoleForPhone(phone), name: getNameForPhone(phone) };
    groups[phone].messages.push(msg as any);
  });

  // Work order communications
  workOrders.forEach((wo) => {
    const tr = taskRequests.find((t) => t.task_request_id === wo.task_request_id) || ({} as any);
    const tech = technicians.find((t) => t.technician_id === wo.recommended_technician_id);
    if (!tech) return;
    const phone = tech.user_id || 'tech-' + tech.technician_id;
    const techName = tech.full_name || 'Technician';
    const a = assetIdMap[tr.asset_id] || ({} as any);

    if (!groups[phone]) groups[phone] = { phone, messages: [], role: 'technician', name: techName };

    groups[phone].messages.push({
      phone_number: phone,
      message_direction: 'outbound',
      message_type: 'text',
      message_content: 'Work Order dispatched: ' + esc(a.name || 'Asset') + ' \u2014 Priority: ' + getPriorityShort(wo.priority || tr.priority) + '. ' + esc(tr.description || ''),
      created_at: wo.created_at || wo.scheduled_start || new Date().toISOString(),
      source: 'work_order',
      work_order_id: wo.work_order_id,
      translated_content: null,
      meta_data: null
    });

    if (wo.status === 'in_progress') {
      groups[phone].messages.push({
        phone_number: phone,
        message_direction: 'inbound',
        message_type: 'text',
        message_content: 'Started working on ' + esc(a.name || 'Asset') + '. Estimating completion shortly.',
        created_at: wo.scheduled_start || new Date().toISOString(),
        source: 'work_order_status',
        work_order_id: wo.work_order_id,
        translated_content: null,
        meta_data: null
      });
    }
    if (wo.status === 'completed') {
      groups[phone].messages.push({
        phone_number: phone,
        message_direction: 'inbound',
        message_type: 'text',
        message_content: 'Completed work on ' + esc(a.name || 'Asset') + '. Job done.',
        created_at: wo.completed_at || new Date().toISOString(),
        source: 'work_order_status',
        work_order_id: wo.work_order_id,
        translated_content: null,
        meta_data: null
      });
    }
  });

  // Task request submissions
  taskRequests.forEach((tk) => {
    const creatorPhone = tk.created_by_user_id;
    if (!creatorPhone) return;
    const role = tk.created_by_role || 'operator';
    const creatorName = getFullNameForUserId(creatorPhone);
    if (!groups[creatorPhone]) groups[creatorPhone] = { phone: creatorPhone, messages: [], role, name: creatorName };
    const a = assetIdMap[tk.asset_id] || ({} as any);
    const statusText = tk.status === 'pending' ? 'Request submitted' : tk.status === 'approved' ? 'Request approved' : tk.status === 'completed' ? 'Task completed' : tk.status === 'rejected' ? 'Request rejected' : 'Status updated';
    groups[creatorPhone].messages.push({
      phone_number: creatorPhone,
      message_direction: 'outbound',
      message_type: 'text',
      message_content: '[' + statusText + '] ' + esc(a.name || 'Asset') + ' \u2014 ' + esc(tk.description || ''),
      created_at: tk.requested_at || new Date().toISOString(),
      source: 'task_request',
      task_request_id: tk.task_request_id,
      translated_content: null,
      meta_data: null
    });
  });

  const arr = Object.values(groups);
  arr.sort((a, b) => {
    const aLast = a.messages.length ? a.messages[a.messages.length - 1].created_at || '' : '';
    const bLast = b.messages.length ? b.messages[b.messages.length - 1].created_at || '' : '';
    return bLast.localeCompare(aLast);
  });
  return arr;
}

export function getConversationGroupsFiltered(): ConversationGroup[] {
  let list = getConversationGroups();
  if (convFilterRole === 'work_orders') {
    list = list.filter((g) => g.messages.some((m) => m.source === 'work_order' || m.source === 'work_order_status'));
  } else if (convFilterRole !== 'all') {
    list = list.filter((g) => g.role === convFilterRole);
  }
  return list;
}

export function renderConversations(): void {
  let list = getConversationGroupsFiltered();
  const search = $('conv-search') as HTMLInputElement | null;
  const query = search ? search.value.toLowerCase().trim() : '';
  if (query) {
    list = list.filter((g) =>
      (g.phone || '').toLowerCase().includes(query) ||
      (g.name || '').toLowerCase().includes(query) ||
      g.messages.some((m) => (m.message_content || '').toLowerCase().includes(query))
    );
  }
  const el = $('conv-list');
  const badge = $('conv-count-badge');
  if (badge) badge.textContent = String(list.length);
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div class="conv-empty" data-i18n="conv_no_messages">No conversations found</div>';
    return;
  }
  el.innerHTML = list.map((g) => {
    const lastMsg = g.messages[g.messages.length - 1];
    const content = lastMsg.message_content || '';
    const ts = lastMsg.created_at || '';
    const isActive = selectedConvPhone === g.phone;
    const initials = g.name ? g.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) : '??';
    const roleClass = 'role-' + g.role;
    const hasWO = g.messages.some((m) => m.source === 'work_order' || m.source === 'work_order_status');
    const woIndicator = hasWO ? '<span class="conv-item-wo-badge" title="Contains work order messages">WO</span>' : '';
    return '<div class="conv-item' + (isActive ? ' active' : '') + '" onclick="selectConversation(\'' + esc(g.phone) + '\')">' +
      '<div class="conv-item-avatar ' + roleClass + '">' + esc(initials) + '</div>' +
      '<div class="conv-item-info">' +
      '<div class="conv-item-top">' +
      '<span class="conv-item-name">' + esc(g.name || g.phone) + '</span>' +
      '<span class="conv-item-time">' + esc(ago(ts)) + '</span>' +
      '</div>' +
      '<div class="conv-item-preview">' + esc(content.slice(0, 60)) + '</div>' +
      '<span class="conv-item-role ' + roleClass + '">' + esc(g.role) + '</span> ' + woIndicator +
      '</div>' +
      '<div class="conv-item-badge">' + g.messages.length + '</div>' +
      '</div>';
  }).join('');
}

export function selectConversation(phone: string): void {
  setSelectedConvPhone(phone);
  renderConversations();
  renderConversationThread(phone);
}

export function renderConversationThread(phone: string): void {
  const groups = getConversationGroups();
  const group = groups.find((g) => g.phone === phone);
  const header = $('conv-thread-header');
  const body = $('conv-thread-body');
  const stats = $('conv-thread-stats');
  const nameEl = $('conv-thread-name');
  const subEl = $('conv-thread-sub');
  const avatarEl = $('conv-thread-avatar');
  if (!group) {
    if (nameEl) nameEl.textContent = 'Select a conversation';
    if (subEl) subEl.textContent = 'Choose from the list on the left';
    if (avatarEl) avatarEl.textContent = '\u2014';
    if (body) body.innerHTML = '<div class="conv-empty" style="padding:60px 20px;text-align:center"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5" style="margin:0 auto 16px;display:block"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><div style="color:var(--text-3);font-size:14px">Select a conversation from the list to view messages</div></div>';
    if (stats) stats.innerHTML = '';
    return;
  }
  const initials = group.name ? group.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) : '??';
  if (avatarEl) {
    avatarEl.textContent = initials;
    avatarEl.className = 'conv-thread-avatar';
    avatarEl.classList.add('role-' + group.role);
  }
  if (nameEl) nameEl.textContent = group.name || group.phone;
  if (subEl) subEl.textContent = group.messages.length + ' messages \u00B7 ' + group.role;
  const sorted = group.messages.slice().sort((a, b) => {
    const aTs = a.created_at || '';
    const bTs = b.created_at || '';
    return aTs.localeCompare(bTs);
  });
  let inboundCount = 0;
  let outboundCount = 0;
  if (body) {
    body.innerHTML = sorted.map((msg) => {
      const dir = msg.message_direction || 'inbound';
      const content = msg.message_content || '';
      const translation = msg.translated_content || '';
      const ts = msg.created_at || '';
      const type = msg.message_type || 'text';
      const meta = msg.meta_data;
      const source = msg.source || '';
      let sourceLabel = '';
      if (source === 'work_order') sourceLabel = '<span class="conv-msg-type" style="background:var(--accent-dim);color:var(--accent-light)">Work Order</span>';
      else if (source === 'work_order_status') sourceLabel = '<span class="conv-msg-type" style="background:var(--green-dim);color:var(--green)">Status Update</span>';
      else if (source === 'task_request') sourceLabel = '<span class="conv-msg-type" style="background:var(--amber-dim);color:var(--amber)">Task Request</span>';
      if (dir === 'inbound') inboundCount++; else outboundCount++;
      let metaHtml = '';
      if (meta && typeof meta === 'object' && Object.keys(meta).length) {
        metaHtml = '<div class="conv-msg-meta">' + esc(JSON.stringify(meta)) + '</div>';
      }
      const transHtml = translation ? '<div class="conv-msg-translation">Translated: ' + esc(translation) + '</div>' : '';
      const typeBadge = type !== 'text' ? '<span class="conv-msg-type">' + esc(type) + '</span>' : '';
      return '<div class="conv-msg ' + esc(dir) + '">' +
        '<div class="conv-msg-direction">' + (dir === 'inbound' ? '\u2191 Inbound' : '\u2193 Outbound') + ' ' + typeBadge + ' ' + sourceLabel + '</div>' +
        '<div class="conv-msg-content">' + esc(content) + '</div>' +
        transHtml + metaHtml +
        '<div class="conv-msg-time">' + esc(ts.replace('T', ' ').slice(0, 19)) + '</div>' +
        '</div>';
    }).join('') || '<div class="conv-empty">No messages in this conversation</div>';
    body.scrollTop = body.scrollHeight;
  }
  if (stats) {
    const workOrderCount = sorted.filter((m) => m.source === 'work_order' || m.source === 'work_order_status').length;
    stats.innerHTML = '<div class="conv-stat"><strong>' + sorted.length + '</strong> total</div>' +
      '<div class="conv-stat"><strong>' + inboundCount + '</strong> inbound</div>' +
      '<div class="conv-stat"><strong>' + outboundCount + '</strong> outbound</div>' +
      (workOrderCount ? '<div class="conv-stat"><strong>' + workOrderCount + '</strong> work order msgs</div>' : '') +
      '<div class="conv-stat">Role: <strong>' + esc(group.role) + '</strong></div>' +
      '<div class="conv-stat">ID: <strong>' + esc(group.phone) + '</strong></div>';
  }
}

export function setConvFilter(el: HTMLElement | null, role: string): void {
  setConvFilterRole(role || 'all');
  $$('.conv-filter').forEach((b) => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderConversations();
}

export function filterConversationList(): void {
  renderConversations();
}
