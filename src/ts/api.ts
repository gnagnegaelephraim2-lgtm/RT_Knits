// ============================================================
// RT KNITS — NITA CMMS API Client
// ============================================================

import type { 
  Department, Asset, Technician, TaskRequest, WorkOrder,
  NitaApiResponse, AdminStatus, LoginRequest, SignupRequest, AuthResponse
} from './types';

const NITA_CONFIG = (window as any).NITA_CONFIG;

class NitaApiClient {
  private baseUrl: string;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.baseUrl = NITA_CONFIG?.NITA_API_URL || 'https://bot.nelsonfodjo.me/webhook';
    this.supabaseUrl = NITA_CONFIG?.SUPABASE_URL || '';
    this.supabaseKey = NITA_CONFIG?.SUPABASE_ANON_KEY || '';
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  private async post<T>(path: string, body: any): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  private async supabaseGet<T>(table: string, query?: string): Promise<T[]> {
    const url = `${this.supabaseUrl}/rest/v1/${table}${query ? '?' + query : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Supabase Error: ${response.status}`);
    }
    return response.json();
  }

  // Asset endpoints
  async getAsset(code: string): Promise<any> {
    return this.get('/api-assets', { code });
  }

  async findAsset(location: string, keyword: string): Promise<any> {
    return this.get('/api-find-asset', { location, keyword });
  }

  // Technician endpoints
  async findTechnicians(trade: string): Promise<Technician[]> {
    return this.get('/api-technicians', { trade });
  }

  async recommendTechnician(trade: string): Promise<any> {
    return this.get('/api-recommend-technician', { trade });
  }

  // Task endpoints
  async getPendingApprovals(): Promise<any[]> {
    return this.get('/api-pending-approvals');
  }

  async createTask(body: any): Promise<any> {
    return this.post('/api-task-lifecycle', { action: 'create', ...body });
  }

  async approveTask(taskId: string, userId: string): Promise<any> {
    return this.post('/api-task-lifecycle', { action: 'approve', task_request_id: taskId, approved_by_user_id: userId });
  }

  async rejectTask(taskId: string, reason: string): Promise<any> {
    return this.post('/api-task-lifecycle', { action: 'reject', task_request_id: taskId, rejection_reason: reason });
  }

  // Technician actions
  async startTask(technicianId: string, taskId: string): Promise<any> {
    return this.post('/api-technician-actions', { action: 'start', technician_id: technicianId, task_request_id: taskId });
  }

  async completeTask(technicianId: string, taskId: string): Promise<any> {
    return this.post('/api-technician-actions', { action: 'done', technician_id: technicianId, task_request_id: taskId });
  }

  async declineTask(technicianId: string, taskId: string, reason: string): Promise<any> {
    return this.post('/api-technician-actions', { action: 'decline', technician_id: technicianId, task_request_id: taskId, reason });
  }

  // Admin endpoints
  async getAdminStatus(): Promise<AdminStatus> {
    return this.get('/api-admin-status');
  }

  async adminRead(table: string, filterField?: string, filterValue?: string, limit?: number): Promise<any[]> {
    const params: Record<string, string> = { table };
    if (filterField) params.filter_field = filterField;
    if (filterValue) params.filter_value = filterValue;
    if (limit) params.limit = String(limit);
    return this.get('/api-admin-read', params);
  }

  async adminAssign(body: any): Promise<any> {
    return this.post('/api-admin-assign', body);
  }

  // Technician daily tasks
  async getTechnicianDailyTasks(technicianId: string): Promise<any[]> {
    return this.get('/api-technician-daily-tasks', { technician_id: technicianId });
  }

  async getNextTask(technicianId: string): Promise<any> {
    return this.get('/api-next-task', { technician_id: technicianId });
  }

  // Feedback
  async submitFeedback(body: any): Promise<any> {
    return this.post('/api-feedback', body);
  }

  // Supabase direct reads
  async getDepartments(): Promise<Department[]> {
    return this.supabaseGet<Department>('department');
  }

  async getAssets(): Promise<Asset[]> {
    return this.supabaseGet<Asset>('asset');
  }

  async getTechniciansFromDb(): Promise<Technician[]> {
    return this.supabaseGet<Technician>('technician');
  }

  async getTaskRequests(): Promise<TaskRequest[]> {
    return this.supabaseGet<TaskRequest>('task_request');
  }

  async getWorkOrders(): Promise<WorkOrder[]> {
    return this.supabaseGet<WorkOrder>('work_order');
  }
}

export const nitaApi = new NitaApiClient();