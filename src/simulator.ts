// ============================================================
// RT KNITS — NITA CMMS WhatsApp Simulator
// ============================================================

import { $, esc } from './utils';
import { supaInsert } from './supabase';
import {
  taskRequests, assets, simChatHistory, session,
  setSimChatHistory
} from './state';
import { rebuildCaches } from './data';

const whatsappBotState = { awaitingDetails: false };

export function loadScenario(type: string): void {
  const chat = $('chat-messages');
  const log = $('console-logs');
  if (!chat) return;
  const scenarios: Record<string, { msg: string; priority: string }> = {
    critical_leak: { msg: 'URGENT: Grinding noise on Circular Knitter CK-8, production line stopped!', priority: 'critical' },
    urgent_tension: { msg: 'Gerber cutter belt slipping on Row 1, tension inconsistent.', priority: 'high' },
    normal_cosmetic: { msg: 'Office door latch is broken, needs replacement.', priority: 'medium' }
  };
  const s = scenarios[type];
  if (!s) return;
  const now = new Date().toLocaleTimeString();
  chat.innerHTML += '<div class="bubble incoming"><div class="bubble-text">' + esc(s.msg) + '</div><div class="bubble-time">' + now + '</div></div>';
  chat.scrollTop = chat.scrollHeight;
  if (log) {
    log.innerHTML += '<div class="log-line"><span class="log-time">[' + now + ']</span> <span class="log-info">Scenario: ' + type + ' (' + s.priority + ')</span></div>';
    log.innerHTML += '<div class="log-line"><span class="log-time">[' + now + ']</span> <span class="log-success">NITA: Analyzing priority and required trade...</span></div>';
    log.scrollTop = log.scrollHeight;
  }
}

export function captureSimChat(phone: string, direction: string, text: string, timestamp?: string): void {
  const history = [...simChatHistory];
  history.push({
    phone_number: phone,
    message_direction: direction,
    message_type: 'text',
    message_content: text,
    created_at: timestamp || new Date().toISOString()
  });
  setSimChatHistory(history);
}

export function sendChatMessage(): void {
  const input = $('chat-user-input') as HTMLInputElement | null;
  const chat = $('chat-messages');
  if (!input || !input.value.trim() || !chat) return;
  const now = new Date().toLocaleTimeString();
  const msg = input.value.trim();
  input.value = '';
  chat.innerHTML += '<div class="bubble outgoing"><div class="bubble-text">' + esc(msg) + '</div><div class="bubble-time">' + now + '</div></div>';
  chat.scrollTop = chat.scrollHeight;

  const simPhone = session ? (session.userId || 'sim-local') : 'sim-local';
  captureSimChat(simPhone, 'inbound', msg, new Date().toISOString());

  const log = $('console-logs');
  if (log) log.innerHTML += '<div class="log-line"><span class="log-time">[' + now + ']</span> <span class="log-info">User: ' + esc(msg) + '</span></div>';

  const lower = msg.toLowerCase();
  const isGreeting = /^(hi|hello|hey|bonjour|nita|hi nita|hey nita|salut)\b/i.test(lower) && msg.length < 20;

  if (isGreeting) {
    whatsappBotState.awaitingDetails = true;
    if (log) log.innerHTML += '<div class="log-line"><span class="log-time">[' + now + ']</span> <span class="log-info">NITA: Greeting detected. Prompting operator for issue details...</span></div>';
    chat.innerHTML += '<div class="bubble incoming"><div class="bubble-text">Hello! I am the NITA Dispatch Bot. Please describe your maintenance issue (e.g. machine number, problem description, urgency P0/P1/P2) so I can log it for dispatch.</div><div class="bubble-time">' + now + '</div></div>';
    if (log) log.scrollTop = log.scrollHeight;
    chat.scrollTop = chat.scrollHeight;
    return;
  }

  if (log) log.innerHTML += '<div class="log-line"><span class="log-time">[' + now + ']</span> <span class="log-info">NITA: Processing message text with NLP entity parser...</span></div>';

  let priority = 'medium';
  let priorityCode = 2;
  let priorityLabel = 'P2 NORMAL';

  if (/\bp0\b|critical|emergency|stop|gro bwi|production down|grinding/i.test(lower)) {
    priority = 'critical'; priorityCode = 0; priorityLabel = 'P0 CRITICAL';
  } else if (/\bp1\b|urgent|asap|leak|water|sliding|poorly|belt|high/i.test(lower)) {
    priority = 'high'; priorityCode = 1; priorityLabel = 'P1 URGENT';
  } else if (/\bp2\b|normal|routine|cosmetic|door|latch|light|paint|low/i.test(lower)) {
    priority = 'medium'; priorityCode = 2; priorityLabel = 'P2 NORMAL';
  } else {
    priority = 'high'; priorityCode = 1; priorityLabel = 'P1 URGENT';
  }

  const assetMatch = lower.match(/(?:machine|macine|asset|line|#|code)\s*#?\s*([0-9]+)/i) || lower.match(/\b([0-9]{1,4})\b/);
  const extractedAssetId = assetMatch ? assetMatch[1] : null;

  let matchedAsset = null;
  if (extractedAssetId && assets.length > 0) {
    matchedAsset = assets.find((a) => a.asset_code === extractedAssetId || String(a.asset_id) === extractedAssetId) || null;
  }

  const assetName = matchedAsset ? matchedAsset.name : (extractedAssetId ? 'Machine #' + extractedAssetId : 'Circular Knitter CK-8');
  const assetCode = matchedAsset ? (matchedAsset.asset_code || matchedAsset.asset_id) : (extractedAssetId || '39');
  const realAssetId = matchedAsset ? matchedAsset.asset_id : assetCode;

  if (log) log.innerHTML += '<div class="log-line"><span class="log-time">[' + now + ']</span> <span class="log-success">NITA: Slot Extracted -> Asset: ' + esc(assetName) + ' (ID: ' + esc(assetCode) + '), Priority: ' + priorityLabel + '</span></div>';

  const taskId = 'TR-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  const newTask = {
    task_request_id: taskId,
    asset_id: realAssetId,
    created_by_user_id: (session && session.user && session.user.full_name) ? session.user.full_name : 'Operator Priya',
    created_by_role: 'Operator',
    status: 'pending' as const,
    priority: (priorityCode === 0 ? 'critical' : (priorityCode === 1 ? 'high' : 'medium')) as 'critical' | 'high' | 'medium',
    requested_at: new Date().toISOString(),
    description: msg,
    task_type: 'New Task'
  };

  taskRequests.unshift(newTask);
  rebuildCaches();
  (window as any)._renderAll();

  supaInsert('task_request', newTask).catch(() => {});

  let replyText = '';
  if (priorityCode === 0) {
    replyText = '\u{1F6A8} **P0 CRITICAL** task created for ' + assetName + '. Line operator advised to STOP. Mechanic dispatched immediately (Ref #' + taskId.slice(0, 8) + ').';
    if (log) log.innerHTML += '<div class="log-line"><span class="log-time">[' + now + ']</span> <span class="log-warn">NITA: Escalating to P0 CRITICAL. Dispatching mechanic...</span></div>';
  } else if (priorityCode === 1) {
    replyText = '\u26A0\uFE0F **P1 URGENT** task created for ' + assetName + '. Request #' + taskId.slice(0, 8) + ' logged and submitted to Coordinator Dashboard for approval.';
    if (log) log.innerHTML += '<div class="log-line"><span class="log-time">[' + now + ']</span> <span class="log-success">NITA: Logged P1 Urgent task request #' + taskId.slice(0, 8) + '.</span></div>';
  } else {
    replyText = '\u2139\uFE0F Routine **P2 Normal** task request #' + taskId.slice(0, 8) + ' logged for ' + assetName + '. Scheduled for next maintenance window.';
    if (log) log.innerHTML += '<div class="log-line"><span class="log-time">[' + now + ']</span> <span class="log-info">NITA: Logged P2 routine task request.</span></div>';
  }

  chat.innerHTML += '<div class="bubble incoming"><div class="bubble-text">' + esc(replyText) + '</div><div class="bubble-time">' + now + '</div></div>';
  whatsappBotState.awaitingDetails = false;

  captureSimChat(simPhone, 'outbound', replyText, new Date().toISOString());
  (window as any)._renderConversations();

  if (log) log.scrollTop = log.scrollHeight;
  chat.scrollTop = chat.scrollHeight;
}

export function clearConsole(): void {
  const c = $('console-logs');
  if (c) c.innerHTML = '';
}
