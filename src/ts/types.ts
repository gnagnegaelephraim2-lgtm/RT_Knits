// ============================================================
// RT KNITS — NITA CMMS TypeScript Types
// ============================================================

export interface Department {
  department_id: string;
  name: string;
  created_at: string;
}

export interface Asset {
  asset_id: string;
  asset_code: string;
  name: string;
  status: string;
  location: string;
  required_trade: string;
  created_at: string;
  last_preventive_check?: string;
  preventive_interval_days?: number;
}

export interface Technician {
  technician_id: string;
  user_id: string;
  full_name: string;
  trade: string;
  active: boolean;
  created_at: string;
}

export interface TaskRequest {
  task_request_id: string;
  asset_id: string;
  created_by_user_id: string;
  status: TaskStatus;
  priority: Priority;
  requested_at: string;
  description: string;
  task_type: string;
  approved_by_user_id?: string;
  approved_at?: string;
  rejection_reason?: string;
  media_urls?: string[];
  required_trade: string;
  created_by_role: string;
}

export interface WorkOrder {
  work_order_id: string;
  task_request_id: string;
  status: WorkOrderStatus;
  priority: Priority;
  scheduled_start?: string;
  created_at: string;
  completed_at?: string;
  recommended_technician_id?: string;
  recommendation_reason?: string;
}

export interface WorkOrderTechnician {
  work_order_id: string;
  technician_id: string;
  start_time?: string;
  stop_time?: string;
  assigned_at: string;
  status: string;
}

export interface AppUser {
  user_id: string;
  department_id?: string;
  full_name: string;
  email?: string;
  role: UserRole;
  phone_number: string;
  preferred_language?: string;
  created_at: string;
  whatsapp_verified?: boolean;
  pin_hash?: string;
}

export type TaskStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'declined';
export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type UserRole = 'coordinator' | 'operator' | 'technician' | 'admin';

export interface Session {
  user: AppUser;
  token: string;
  role: UserRole;
  loginTime: number;
}

export interface NitaApiResponse<T> {
  error: boolean;
  data?: T;
  message?: string;
}

export interface AdminStatus {
  pending: number;
  in_progress: number;
  critical: number;
  active_techs: number;
}

export interface LoginRequest {
  phone_number: string;
  pin_hash: string;
}

export interface SignupRequest {
  phone_number: string;
  pin_hash: string;
  role: string;
  full_name: string;
}

export interface AuthResponse {
  token: string;
  role: UserRole;
  error: boolean;
}