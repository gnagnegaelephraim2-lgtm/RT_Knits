// ============================================================
// RT KNITS — NITA CMMS TypeScript Interfaces
// ============================================================

// ── Config ──────────────────────────────────────────────────
export interface NitaConfig {
  USE_REAL_SUPABASE: boolean;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  NITA_API_URL: string;
  NITA_WHATSAPP: string;
}

// ── Department ──────────────────────────────────────────────
export interface Department {
  department_id: string;
  name: string;
  location?: string;
  created_at?: string;
}

// ── Asset ───────────────────────────────────────────────────
export interface Asset {
  asset_id: string;
  asset_code: string;
  name: string;
  status: 'operational' | 'breakdown' | 'warning' | string;
  location: string;
  required_trade: string;
  created_at?: string;
}

// ── Technician ──────────────────────────────────────────────
export interface Technician {
  technician_id: string;
  user_id: string;
  full_name: string;
  trade: string;
  active: boolean;
  created_at?: string;
}

// ── Task Request ────────────────────────────────────────────
export type TaskPriority = 'critical' | 'high' | 'medium';
export type TaskStatus = 'pending' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'rework';

export interface TaskRequest {
  task_request_id: string;
  asset_id: string;
  created_by_user_id: string;
  created_by_role: string;
  status: TaskStatus;
  priority: TaskPriority | number;
  requested_at: string;
  description: string;
  task_type: string;
  required_trade?: string;
  approved_by_user_id?: string;
  approved_at?: string;
  rejection_reason?: string;
}

// ── Work Order ──────────────────────────────────────────────
export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed' | string;

export interface WorkOrder {
  work_order_id: string;
  task_request_id: string;
  status: WorkOrderStatus;
  priority: TaskPriority | string;
  scheduled_start?: string;
  created_at: string;
  completed_at?: string;
  recommended_technician_id: string;
  recommendation_reason?: string;
}

// ── Feedback ────────────────────────────────────────────────
export interface Feedback {
  feedback_id?: string;
  work_order_id: string;
  technician_id?: string;
  rated_by_user_id?: string;
  rating?: number;
  derived_rating?: number;
  comment?: string;
  feedback_text?: string;
  feedback_type?: string;
  derived_sentiment?: string;
  commendation?: boolean;
  key_issues?: string;
  flagged_for_review?: boolean;
  created_by_user_id?: string;
  created_at: string;
}

// ── App User ────────────────────────────────────────────────
export interface AppUser {
  user_id: string;
  phone_number: string;
  full_name: string;
  role: UserRole;
  email?: string;
  pin_hash?: string;
  preferred_language?: string;
  department_id?: string;
  created_at?: string;
  whatsapp_verified?: boolean;
}

export type UserRole = 'admin' | 'coordinator' | 'technician' | 'operator' | 'unknown';

// ── Session ─────────────────────────────────────────────────
export interface Session {
  user: AppUser;
  role: UserRole;
  userId: string;
}

// ── Message Log ─────────────────────────────────────────────
export interface MessageLog {
  phone_number: string;
  direction?: string;
  message_direction?: string;
  message_type?: string;
  content?: string;
  message_content?: string;
  translated_content?: string;
  metadata?: Record<string, unknown>;
  meta_data?: Record<string, unknown>;
  created_at?: string;
  timestamp?: string;
  user_id?: string;
  user_name?: string;
}

// ── Conversation State ──────────────────────────────────────
export interface ConversationState {
  phone_number: string;
  state?: string;
  [key: string]: unknown;
}

// ── Normalized Message ──────────────────────────────────────
export interface NormalizedMessage {
  phone_number: string;
  message_direction: string;
  message_type: string;
  message_content: string;
  translated_content: string | null;
  meta_data: Record<string, unknown> | null;
  created_at: string;
  user_id?: string | null;
  user_name?: string | null;
  source?: string;
  work_order_id?: string;
  task_request_id?: string;
}

// ── Conversation Group ──────────────────────────────────────
export interface ConversationGroup {
  phone: string;
  messages: NormalizedMessage[];
  role: string;
  name: string;
}

// ── Activity Feed Entry ─────────────────────────────────────
export interface ActivityEntry {
  dot: string;
  text: string;
  time: string;
  ts: number;
}

// ── Audit Log Entry ─────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  detail: string;
  target: string;
}

// ── Database Schema ─────────────────────────────────────────
export interface SchemaField {
  f: string;
  t: string;
  k?: string;
}

// ── Stats ───────────────────────────────────────────────────
export interface DashboardStats {
  pending: number;
  inProgress: number;
  completed: number;
  rejected: number;
  critical: number;
  high: number;
  medium: number;
  activeTechs: number;
  total: number;
  totalAssets: number;
  totalDepts: number;
  totalWo: number;
  woInProgress: number;
  woCompleted: number;
}

// ── Tech Performance Data ───────────────────────────────────
export interface TechPerformanceData {
  tech: Technician;
  assigned: number;
  completed: number;
  avg: number;
  pct: number;
}

// ── Tech Rating Data ────────────────────────────────────────
export interface TechRatingData {
  tech: Technician;
  ratings: Feedback[];
  avg: number;
  commendations: number;
}

// ── i18n ────────────────────────────────────────────────────
export type TranslationKey = string;

export interface TranslationSet {
  [key: string]: string;
}

export interface I18NTranslations {
  en: TranslationSet;
  fr: TranslationSet;
  cr: TranslationSet;
  hi: TranslationSet;
}

// ── WhatsApp Bot State ──────────────────────────────────────
export interface WhatsAppBotState {
  awaitingDetails: boolean;
}

// ── Scenario ────────────────────────────────────────────────
export interface Scenario {
  msg: string;
  priority: string;
}

// ── API Response ────────────────────────────────────────────
export interface ApiResponse {
  status?: string;
  endpoint?: string;
  timestamp?: string;
  payload?: unknown;
  [key: string]: unknown;
}
