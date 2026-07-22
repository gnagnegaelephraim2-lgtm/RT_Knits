// ============================================================
// RT KNITS — NITA CMMS Entry Point
// ============================================================

// ── Imports ─────────────────────────────────────────────────
import './styles.css';
import { $, $$, applyMobileLabels } from './utils';
import { NITA_CONFIG } from './config';
import { NITA_I18N } from './i18n';
import { session, setSession, auditLog, setAuditLog, assetMap, assets } from './state';
import { uid } from './utils';
import { loadAll, loadUsers, rebuildCaches } from './data';
import { switchTab, toggleSignupFields, doLogin, doSignup, doLogout, updateUI } from './auth';
import { navigateTo } from './nav';
import { renderDashboard, renderAdminDashboard, renderDepts, getStats } from './dashboard';
import { renderTasks, filterTasks, selectTask, approveTask, rejectTask, dispatchTask, updateWorkOrder, resetAllWorkOrders, createTask } from './tasks';
import { renderApprovals } from './approvals';
import { renderBreakdown, setBreakdownTab, selectBreakdownTask, dispatchSelectedEngineer } from './planning';
import { renderTechJobs } from './techjobs';
import { renderDbTables } from './database';
import { renderProfile, saveProfile } from './profile';
import { renderDocs } from './docs';
import { renderConversations, selectConversation, setConvFilter, filterConversationList } from './conversations';
import { loadScenario, sendChatMessage, clearConsole } from './simulator';
import { runApiRequest } from './sandbox';
import { showRatingDialog, submitRating } from './ratings';

// ── Theme Management ────────────────────────────────────────
function initTheme(): void {
  const saved = localStorage.getItem('nita_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
}

function toggleTheme(): void {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('nita_theme', next);
}

// ── Audit Logging ───────────────────────────────────────────
function logAudit(action: string, detail: string, target: string): void {
  const entry = {
    id: uid('al'),
    timestamp: new Date().toISOString(),
    actor: session ? session.user.full_name || session.userId : 'System',
    actorRole: session ? session.role : 'system',
    action,
    detail: detail || '',
    target: target || ''
  };
  const newLog = [entry, ...auditLog].slice(0, 200);
  setAuditLog(newLog);
}

// ── Render All ──────────────────────────────────────────────
function renderAll(): void {
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
  applyMobileLabels();
}

// ── Select Department ───────────────────────────────────────
import { setSelectedDeptId, deptMap, departments } from './state';
function selectDept(id: string): void {
  setSelectedDeptId(id);
  $$('.data-table tr.active').forEach((r) => r.classList.remove('active'));
  const row = document.querySelector('[data-dept="' + id + '"]') as HTMLElement | null;
  if (row) row.classList.add('active');
  const d = deptMap[id] || departments.find((x) => x.department_id === id);
  if (d) {
    const nameEl = $('fm-detail-dept-name');
    const locEl = $('fm-detail-dept-loc');
    if (nameEl) nameEl.textContent = d.name;
    if (locEl) locEl.textContent = d.location || 'Building Main';
  }
}

// ── Expose globals for inline onclick handlers ──────────────
declare global {
  interface Window {
    selectDept: (id: string) => void;
    selectTask: (id: string) => void;
    approveTask: (id: string) => void;
    rejectTask: (id: string) => void;
    dispatchTask: (id: string) => void;
    updateWorkOrder: (id: string, status: string) => void;
    resetAllWorkOrders: () => void;
    createTask: () => void;
    showRatingDialog: (woId: string, techId: string) => void;
    submitRating: (woId: string, techId: string) => void;
    saveProfile: () => void;
    switchTab: (tab: string) => void;
    toggleSignupFields: () => void;
    doLogin: () => void;
    doSignup: () => void;
    doLogout: () => void;
    updateUI: () => void;
    navigateTo: (id: string) => void;
    loadScenario: (type: string) => void;
    sendChatMessage: () => void;
    clearConsole: () => void;
    runApiRequest: () => void;
    setBreakdownTab: (el: HTMLElement | null, tab: string) => void;
    selectBreakdownTask: (id: string) => void;
    dispatchSelectedEngineer: () => void;
    filterTasks: (st: string) => void;
    selectConversation: (phone: string) => void;
    setConvFilter: (el: HTMLElement | null, role: string) => void;
    filterConversationList: () => void;
    toggleTheme: () => void;
    _loadAll: () => void;
    _renderAll: () => void;
    _logAudit: (action: string, detail: string, target: string) => void;
    _rebuildCaches: () => void;
    _renderConversations: () => void;
  }
}

window.selectDept = selectDept;
window.selectTask = selectTask;
window.approveTask = approveTask;
window.rejectTask = rejectTask;
window.dispatchTask = dispatchTask;
window.updateWorkOrder = updateWorkOrder;
window.resetAllWorkOrders = resetAllWorkOrders;
window.createTask = createTask;
window.showRatingDialog = showRatingDialog;
window.submitRating = submitRating;
window.saveProfile = saveProfile;
window.switchTab = switchTab;
window.toggleSignupFields = toggleSignupFields;
window.doLogin = doLogin;
window.doSignup = doSignup;
window.doLogout = doLogout;
window.updateUI = updateUI;
window.navigateTo = navigateTo;
window.loadScenario = loadScenario;
window.sendChatMessage = sendChatMessage;
window.clearConsole = clearConsole;
window.runApiRequest = runApiRequest;
window.setBreakdownTab = setBreakdownTab;
window.selectBreakdownTask = selectBreakdownTask;
window.dispatchSelectedEngineer = dispatchSelectedEngineer;
window.filterTasks = filterTasks;
window.selectConversation = selectConversation;
window.setConvFilter = setConvFilter;
window.filterConversationList = filterConversationList;
window.toggleTheme = toggleTheme;
window._loadAll = loadAll;
window._renderAll = renderAll;
window._logAudit = logAudit;
window._rebuildCaches = rebuildCaches;
window._renderConversations = renderConversations;

// ── Init & DOM Event Listeners ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  try {
    const s = JSON.parse(localStorage.getItem('nita_session') || 'null');
    if (s) {
      setSession(s);
      $('auth-overlay')?.classList.add('hidden');
      updateUI();
    }
  } catch (_e) {
    setSession(null);
  }

  NITA_I18N.init();

  // Sidebar toggle
  const ham = $('hamburger-btn');
  const sb = document.querySelector('.sidebar') as HTMLElement | null;
  const ov = $('sidebar-overlay');
  function openSb() { if (sb) sb.classList.add('open'); if (ov) ov.classList.add('active'); }
  function closeSb() { if (sb) sb.classList.remove('open'); if (ov) ov.classList.remove('active'); }
  if (ham) ham.addEventListener('click', () => { sb && sb.classList.contains('open') ? closeSb() : openSb(); });
  if (ov) ov.addEventListener('click', closeSb);

  // Nav item click
  $$('.nav-item').forEach((n) => {
    n.addEventListener('click', () => {
      const t = n.getAttribute('data-target');
      if (t) { navigateTo(t); if (window.innerWidth <= 1024) closeSb(); }
    });
  });

  // DB navigation items
  $$('.db-item').forEach((d) => {
    d.addEventListener('click', () => {
      $$('.db-item').forEach((i) => i.classList.remove('active'));
      d.classList.add('active');
      renderDbTables();
    });
  });

  // Doc navigation TOC
  $$('.doc-toc-item').forEach((d) => {
    d.addEventListener('click', () => {
      $$('.doc-toc-item').forEach((i) => i.classList.remove('active'));
      d.classList.add('active');
      renderDocs(d.getAttribute('data-doc') || 'design');
    });
  });

  // Auth Submit listeners
  const loginBtn = $('btn-login-submit'); if (loginBtn) loginBtn.addEventListener('click', () => doLogin());
  const logoutBtn = $('btn-logout'); if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
  const themeBtn = $('theme-toggle'); if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  const authPin = $('auth-pin') as HTMLInputElement | null;
  if (authPin) authPin.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

  // WhatsApp listeners
  const sendMsgBtn = $('btn-send-message'); if (sendMsgBtn) sendMsgBtn.addEventListener('click', sendChatMessage);
  const chatInput = $('chat-user-input') as HTMLInputElement | null;
  if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });

  // API Sandbox listener
  const runApiBtn = $('btn-run-api'); if (runApiBtn) runApiBtn.addEventListener('click', runApiRequest);
  const apiSel = $('api-endpoint-selector') as HTMLSelectElement | null;
  if (apiSel) apiSel.addEventListener('change', function () {
    const urlInput = $('api-url-input') as HTMLInputElement | null;
    if (urlInput) urlInput.value = (NITA_CONFIG.NITA_API_URL || 'https://bot.nelsonfodjo.me/webhook') + '/' + this.value;
  });

  // Planning Dispatch Engineer Button
  const pbDispatchBtn = $('btn-pb-dispatch-engineer');
  if (pbDispatchBtn) pbDispatchBtn.addEventListener('click', dispatchSelectedEngineer);

  // Task Entry submit button
  const createBtn = $('btn-te-create'); if (createBtn) createBtn.addEventListener('click', () => createTask());

  // Asset Code auto-complete listener
  const codeInput = $('te-asset-code') as HTMLInputElement | null;
  if (codeInput) {
    const handleAssetLookup = function (this: HTMLInputElement) {
      const val = this.value.trim();
      const a = assetMap[val] || assets.find((x) => x.asset_code === val || x.asset_id === val);
      if (a) {
        if ($('te-asset-name')) ($('te-asset-name') as HTMLInputElement).value = a.name || '';
        if ($('te-asset-type')) ($('te-asset-type') as HTMLInputElement).value = a.required_trade || '';
        if ($('te-asset-loc')) ($('te-asset-loc') as HTMLInputElement).value = a.location || '';
      }
    };
    codeInput.addEventListener('blur', handleAssetLookup);
    codeInput.addEventListener('input', handleAssetLookup);
  }

  // Window resize handler
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
      const sb2 = document.querySelector('.sidebar') as HTMLElement | null;
      if (sb2) sb2.classList.remove('open');
      const ov2 = $('sidebar-overlay');
      if (ov2) ov2.classList.remove('active');
    }
  });

  // Initial Data Load
  loadUsers().then(() => loadAll());
});

// ── Init Theme ──────────────────────────────────────────────
initTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('nita_theme')) {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  }
});
