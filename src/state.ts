// ============================================================
// RT KNITS — NITA CMMS Application State
// ============================================================

import type {
  Department,
  Asset,
  Technician,
  TaskRequest,
  WorkOrder,
  Feedback,
  MessageLog,
  ConversationState,
  AppUser,
  Session,
  AuditLogEntry
} from './types';

// ── Core Data Arrays ────────────────────────────────────────
export let departments: Department[] = [];
export let assets: Asset[] = [];
export let technicians: Technician[] = [];
export let taskRequests: TaskRequest[] = [];
export let workOrders: WorkOrder[] = [];
export let feedbacks: Feedback[] = [];

// ── Lookup Maps ─────────────────────────────────────────────
export let assetMap: Record<string, Asset> = {};
export let assetIdMap: Record<string, Asset> = {};
export let deptMap: Record<string, Department> = {};
export let techMap: Record<string, Technician> = {};

// ── Session ─────────────────────────────────────────────────
export let session: Session | null = null;

// ── UI State ────────────────────────────────────────────────
export let currentBreakdownTab: string = 'leakage';
export let selectedBreakdownTaskId: string | null = null;
export let selectedDeptId: string | null = null;
export let currentTaskFilter: string = 'all';

// ── Conversation State ──────────────────────────────────────
export let messageLogs: MessageLog[] = [];
export let conversationStates: ConversationState[] = [];
export let allUsers: Record<string, AppUser> = {};
export let users: Record<string, AppUser> = {};
export let selectedConvPhone: string | null = null;
export let convFilterRole: string = 'all';
export let simChatHistory: MessageLog[] = [];

// ── Audit Log ───────────────────────────────────────────────
export let auditLog: AuditLogEntry[] = JSON.parse(localStorage.getItem('nita_audit_log') || '[]');

// ── Setters for mutable state ───────────────────────────────
export function setDepartments(v: Department[]): void { departments = v; }
export function setAssets(v: Asset[]): void { assets = v; }
export function setTechnicians(v: Technician[]): void { technicians = v; }
export function setTaskRequests(v: TaskRequest[]): void { taskRequests = v; }
export function setWorkOrders(v: WorkOrder[]): void { workOrders = v; }
export function setFeedbacks(v: Feedback[]): void { feedbacks = v; }
export function setAssetMap(v: Record<string, Asset>): void { assetMap = v; }
export function setAssetIdMap(v: Record<string, Asset>): void { assetIdMap = v; }
export function setDeptMap(v: Record<string, Department>): void { deptMap = v; }
export function setTechMap(v: Record<string, Technician>): void { techMap = v; }
export function setSession(v: Session | null): void { session = v; }
export function setCurrentBreakdownTab(v: string): void { currentBreakdownTab = v; }
export function setSelectedBreakdownTaskId(v: string | null): void { selectedBreakdownTaskId = v; }
export function setSelectedDeptId(v: string | null): void { selectedDeptId = v; }
export function setCurrentTaskFilter(v: string): void { currentTaskFilter = v; }
export function setMessageLogs(v: MessageLog[]): void { messageLogs = v; }
export function setConversationStates(v: ConversationState[]): void { conversationStates = v; }
export function setAllUsers(v: Record<string, AppUser>): void { allUsers = v; }
export function setUsers(v: Record<string, AppUser>): void { users = v; }
export function setSelectedConvPhone(v: string | null): void { selectedConvPhone = v; }
export function setConvFilterRole(v: string): void { convFilterRole = v; }
export function setSimChatHistory(v: MessageLog[]): void { simChatHistory = v; }
export function setAuditLog(v: AuditLogEntry[]): void {
  auditLog = v;
  localStorage.setItem('nita_audit_log', JSON.stringify(auditLog));
}
