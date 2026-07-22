// ============================================================
// RT KNITS — NITA CMMS Database Viewer
// ============================================================

import { $, $$ } from './utils';
import type { SchemaField } from './types';

const schemas: Record<string, SchemaField[]> = {
  department: [{ f: 'department_id', t: 'uuid', k: 'PK' }, { f: 'name', t: 'text' }, { f: 'created_at', t: 'timestamptz' }],
  app_user: [{ f: 'user_id', t: 'uuid', k: 'PK' }, { f: 'department_id', t: 'uuid', k: 'FK' }, { f: 'full_name', t: 'text' }, { f: 'email', t: 'text' }, { f: 'role', t: 'text' }, { f: 'phone_number', t: 'text', k: 'UNIQUE' }, { f: 'pin_hash', t: 'text' }, { f: 'preferred_language', t: 'text' }, { f: 'created_at', t: 'timestamptz' }, { f: 'whatsapp_verified', t: 'boolean' }],
  technician: [{ f: 'technician_id', t: 'uuid', k: 'PK' }, { f: 'user_id', t: 'uuid', k: 'FK' }, { f: 'full_name', t: 'text' }, { f: 'trade', t: 'text' }, { f: 'active', t: 'boolean' }, { f: 'created_at', t: 'timestamptz' }],
  asset: [{ f: 'asset_id', t: 'uuid', k: 'PK' }, { f: 'asset_code', t: 'text', k: 'UNIQUE' }, { f: 'name', t: 'text' }, { f: 'status', t: 'text' }, { f: 'location', t: 'text' }, { f: 'required_trade', t: 'text' }, { f: 'created_at', t: 'timestamptz' }],
  task_request: [{ f: 'task_request_id', t: 'uuid', k: 'PK' }, { f: 'asset_id', t: 'uuid', k: 'FK' }, { f: 'created_by_user_id', t: 'uuid', k: 'FK' }, { f: 'status', t: 'text' }, { f: 'priority', t: 'text' }, { f: 'requested_at', t: 'timestamptz' }, { f: 'description', t: 'text' }, { f: 'task_type', t: 'text' }, { f: 'approved_by_user_id', t: 'uuid', k: 'FK' }, { f: 'approved_at', t: 'timestamptz' }, { f: 'rejection_reason', t: 'text' }, { f: 'required_trade', t: 'text' }, { f: 'created_by_role', t: 'text' }],
  work_order: [{ f: 'work_order_id', t: 'uuid', k: 'PK' }, { f: 'task_request_id', t: 'uuid', k: 'FK' }, { f: 'status', t: 'text' }, { f: 'priority', t: 'text' }, { f: 'scheduled_start', t: 'timestamptz' }, { f: 'created_at', t: 'timestamptz' }, { f: 'completed_at', t: 'timestamptz' }, { f: 'recommended_technician_id', t: 'uuid', k: 'FK' }, { f: 'recommendation_reason', t: 'text' }],
  work_order_feedback: [{ f: 'feedback_id', t: 'uuid', k: 'PK' }, { f: 'work_order_id', t: 'uuid', k: 'FK' }, { f: 'technician_id', t: 'uuid', k: 'FK' }, { f: 'rating', t: 'integer' }, { f: 'comment', t: 'text' }, { f: 'commendation', t: 'boolean' }, { f: 'created_by_user_id', t: 'uuid', k: 'FK' }, { f: 'created_at', t: 'timestamptz' }]
};

export function renderDbTables(): void {
  const t = $('db-fields-body');
  if (!t) return;
  const active = document.querySelector('.db-item.active') as HTMLElement | null;
  const tableName = active ? active.getAttribute('data-table') || 'department' : 'department';
  const fields = schemas[tableName] || [];
  const titleEl = $('db-table-title');
  const sizeEl = $('db-table-size');
  if (titleEl) titleEl.textContent = 'TABLE ' + tableName;
  if (sizeEl) sizeEl.textContent = fields.length + ' fields';

  t.innerHTML = fields.map((f) => {
    const k = f.k === 'PK' ? '<span class="key-pill pk">PK</span>' :
      f.k === 'FK' ? '<span class="key-pill fk">FK</span>' :
      f.k === 'UNIQUE' ? '<span class="key-pill" style="background:var(--amber-dim);color:var(--amber)">UQ</span>' : '';
    return '<tr><td><code>' + f.f + '</code></td><td><code>' + f.t + '</code></td><td>' + k + '</td><td>Schema Column</td></tr>';
  }).join('');
}
