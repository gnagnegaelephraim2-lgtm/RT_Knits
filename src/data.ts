// ============================================================
// RT KNITS — NITA CMMS Data Loading & Seeding
// ============================================================

import { supa } from './supabase';
import {
  departments, assets, technicians, taskRequests, workOrders, feedbacks,
  messageLogs, conversationStates, allUsers,
  assetMap, assetIdMap, deptMap, techMap, users,
  setDepartments, setAssets, setTechnicians, setTaskRequests, setWorkOrders,
  setFeedbacks, setMessageLogs, setConversationStates, setAllUsers, setUsers,
  setAssetMap, setAssetIdMap, setDeptMap, setTechMap
} from './state';
import type { Department, Asset, Technician, TaskRequest, WorkOrder } from './types';

// ── Default Mock Seeding ────────────────────────────────────
export function seedDefaultDepartments(): void {
  setDepartments([
    { department_id: 'dept-knit', name: 'Knitting Floor', location: 'Building A - Level 1' },
    { department_id: 'dept-cut', name: 'Cutting Department', location: 'Building A - Level 2' },
    { department_id: 'dept-dye', name: 'Dyeing & Finishing', location: 'Building B - Ground' },
    { department_id: 'dept-sew', name: 'Sewing Assembly', location: 'Building B - Level 1' },
    { department_id: 'dept-util', name: 'Utilities & Energy Room', location: 'Building C - Basement' }
  ]);
}

export function seedDefaultAssets(): void {
  setAssets([
    { asset_id: 'ast-39', asset_code: '39', name: 'Circular Knitter \u2014 Brother CK-8', status: 'operational', location: 'Knitting Floor, Row 3', required_trade: 'Mechanic' },
    { asset_id: 'ast-175', asset_code: '175', name: 'Cutting Machine \u2014 Gerber Z1', status: 'breakdown', location: 'Cutting Department, Row 1', required_trade: 'Electrician' },
    { asset_id: 'ast-88', asset_code: '88', name: 'Industrial Dye Vat \u2014 Thies 500', status: 'operational', location: 'Dyeing Floor, Line 2', required_trade: 'Plumber' },
    { asset_id: 'ast-204', asset_code: '204', name: 'Compressor \u2014 Atlas Copco GA37', status: 'warning', location: 'Utilities Room, Row 2', required_trade: 'HVAC' },
    { asset_id: 'ast-102', asset_code: '102', name: 'Overlock Sewing Unit \u2014 Juki MO-6800', status: 'operational', location: 'Sewing Line B', required_trade: 'Mechanic' }
  ]);
}

export function seedDefaultTechnicians(): void {
  setTechnicians([
    { technician_id: 'tech-1', user_id: 'usr-tech-1', full_name: 'Jean-Luc Picaut', trade: 'Mechanic', active: true },
    { technician_id: 'tech-2', user_id: 'usr-tech-2', full_name: 'Devanand Ramgoolam', trade: 'Electrician', active: true },
    { technician_id: 'tech-3', user_id: 'usr-tech-3', full_name: 'Kavita Seesaghur', trade: 'Plumber', active: true },
    { technician_id: 'tech-4', user_id: 'usr-tech-4', full_name: 'Alain Baret', trade: 'HVAC', active: true },
    { technician_id: 'tech-5', user_id: 'usr-tech-5', full_name: 'Rajesh Jugnauth', trade: 'General Maintenance', active: true }
  ]);
}

export function seedDefaultAdminUser(): void {
  const local: Record<string, any> = JSON.parse(localStorage.getItem('nita_users') || '{}');
  if (!local['+23050000000']) {
    local['+23050000000'] = {
      phone_number: '+23050000000',
      full_name: 'System Admin',
      role: 'admin',
      pin_hash: '',
      created_at: new Date().toISOString(),
      user_id: '+23050000000'
    };
    localStorage.setItem('nita_users', JSON.stringify(local));
  }
}

export function seedDefaultTaskRequests(): void {
  const iso = new Date().toISOString();
  setTaskRequests([
    {
      task_request_id: '336225e2', asset_id: 'ast-39', created_by_user_id: '91e2fdbe-c670-4323-b1d3-a38462583ad5',
      created_by_role: 'Operator', status: 'pending', priority: 'critical', requested_at: iso,
      description: 'Operator requests inspection \u2014 machine running but overheating noticed', task_type: 'repair', required_trade: 'Mechanic'
    },
    {
      task_request_id: '4a111242', asset_id: 'ast-175', created_by_user_id: '065dd6b1-21d0-4298-a3a9-62018414bf9c',
      created_by_role: 'Operator', status: 'pending', priority: 'critical', requested_at: iso,
      description: 'Machine fully stopped \u2014 electrical fault reported, multiple bugs observed', task_type: 'repair', required_trade: 'Electrician'
    },
    {
      task_request_id: '8d114b41', asset_id: 'ast-204', created_by_user_id: '91e2fdbe-c670-4323-b1d3-a38462583ad5',
      created_by_role: 'Operator', status: 'pending', priority: 'critical', requested_at: iso,
      description: 'Red warning light showing, machine has stopped running', task_type: 'repair', required_trade: 'HVAC'
    },
    {
      task_request_id: '7f289a10', asset_id: 'ast-88', created_by_user_id: '065dd6b1-21d0-4298-a3a9-62018414bf9c',
      created_by_role: 'Operator', status: 'approved', priority: 'high', requested_at: iso,
      description: 'Water supply pressure fluctuation detected on dye vat line', task_type: 'repair', required_trade: 'Plumber'
    },
    {
      task_request_id: '9e451b03', asset_id: 'ast-102', created_by_user_id: '91e2fdbe-c670-4323-b1d3-a38462583ad5',
      created_by_role: 'Operator', status: 'approved', priority: 'medium', requested_at: iso,
      description: 'Routine needle timing adjustment and tension check', task_type: 'improvement', required_trade: 'Mechanic'
    }
  ]);
}

export function seedDefaultWorkOrders(): void {
  const now = new Date().toISOString();
  setWorkOrders([
    {
      work_order_id: 'wo-7f289a10', task_request_id: '7f289a10', status: 'in_progress', priority: 'high',
      scheduled_start: now, created_at: now, recommended_technician_id: 'tech-3', recommendation_reason: 'Plumbing trade match'
    },
    {
      work_order_id: 'wo-9e451b03', task_request_id: '9e451b03', status: 'pending', priority: 'medium',
      scheduled_start: now, created_at: now, recommended_technician_id: 'tech-1', recommendation_reason: 'Mechanic trade match'
    }
  ]);
}

export function seedDefaultsIfEmpty(): void {
  if (!departments.length) seedDefaultDepartments();
  if (!assets.length) seedDefaultAssets();
  if (!technicians.length) seedDefaultTechnicians();
  if (!taskRequests.length) seedDefaultTaskRequests();
  if (!workOrders.length) seedDefaultWorkOrders();
  seedDefaultAdminUser();
}

// ── Cache Rebuild ───────────────────────────────────────────
export function rebuildCaches(): void {
  const newAssetMap: Record<string, any> = {};
  const newAssetIdMap: Record<string, any> = {};
  const newDeptMap: Record<string, any> = {};
  const newTechMap: Record<string, any> = {};
  assets.forEach((a) => { newAssetMap[a.asset_code] = a; if (a.asset_id) newAssetIdMap[a.asset_id] = a; });
  departments.forEach((d) => { newDeptMap[d.department_id] = d; });
  technicians.forEach((t) => { newTechMap[t.technician_id] = t; });
  setAssetMap(newAssetMap);
  setAssetIdMap(newAssetIdMap);
  setDeptMap(newDeptMap);
  setTechMap(newTechMap);
}

export function buildUserCache(): void {
  const newAllUsers: Record<string, any> = {};
  const session2 = JSON.parse(localStorage.getItem('nita_session') || 'null');
  if (session2 && session2.user) {
    newAllUsers[session2.user.phone_number] = session2.user;
  }
  const localUsers = JSON.parse(localStorage.getItem('nita_users') || '{}');
  Object.keys(localUsers).forEach((k) => { newAllUsers[k] = localUsers[k]; });
  if (typeof users !== 'undefined') {
    Object.keys(users).forEach((k) => { newAllUsers[k] = users[k]; });
  }
  setAllUsers(newAllUsers);
}

// ── Data Loading ────────────────────────────────────────────
export async function loadAll(): Promise<void> {
  try {
    const r = await Promise.allSettled([
      supa('department'), supa('asset'), supa('technician'),
      supa('task_request', 'order=requested_at.desc&limit=100'), supa('work_order', 'order=created_at.desc&limit=100'),
      supa('work_order_feedback', 'order=created_at.desc&limit=50'), supa('app_user'),
      supa('message_log', 'order=created_at.desc&limit=500'), supa('conversation_state')
    ]);
    if (r[0].status === 'fulfilled' && r[0].value && (r[0].value as any[]).length) setDepartments(r[0].value as any[]); else seedDefaultDepartments();
    if (r[1].status === 'fulfilled' && r[1].value && (r[1].value as any[]).length) setAssets(r[1].value as any[]); else seedDefaultAssets();
    if (r[2].status === 'fulfilled' && r[2].value && (r[2].value as any[]).length) setTechnicians(r[2].value as any[]); else seedDefaultTechnicians();
    if (r[3].status === 'fulfilled' && r[3].value && (r[3].value as any[]).length) setTaskRequests(r[3].value as any[]); else seedDefaultTaskRequests();
    if (r[4].status === 'fulfilled' && r[4].value && (r[4].value as any[]).length) setWorkOrders(r[4].value as any[]); else seedDefaultWorkOrders();
    if (r[5].status === 'fulfilled' && r[5].value) setFeedbacks((r[5].value as any[]) || []);
    if (r[6].status === 'fulfilled' && r[6].value) {
      (r[6].value as any[]).forEach((u: any) => {
        allUsers[u.user_id] = u;
        allUsers[u.phone_number] = u;
      });
    }
    if (r[7].status === 'fulfilled' && r[7].value) setMessageLogs((r[7].value as any[]) || []);
    if (r[8].status === 'fulfilled' && r[8].value) setConversationStates((r[8].value as any[]) || []);
  } catch (e) {
    console.error('loadAll error, seeding defaults:', e);
    seedDefaultsIfEmpty();
  }
  rebuildCaches();
  buildUserCache();
  (window as any)._renderAll();
}

export async function loadUsers(): Promise<void> {
  try {
    const u = await supa('app_user') as any[];
    const newUsers: Record<string, any> = {};
    u.forEach((x: any) => { newUsers[x.user_id] = x; newUsers[x.phone_number] = x; });
    setUsers(newUsers);
  } catch (_e) { /* ignore */ }
}
