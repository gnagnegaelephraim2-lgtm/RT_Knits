// ============================================================
// RT KNITS — NITA CMMS Supabase CRUD Operations
// ============================================================

import { NITA_CONFIG } from './config';

/** Generic Supabase query (SELECT) */
export async function supa(table: string, query?: string): Promise<unknown[]> {
  const c = NITA_CONFIG;
  if (!c || !c.USE_REAL_SUPABASE) return [];
  const r = await fetch(c.SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : ''), {
    headers: {
      'apikey': c.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + c.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  });
  if (!r.ok) throw new Error('Supabase ' + r.status);
  return r.json();
}

/** Insert a row into a Supabase table */
export async function supaInsert(table: string, body: Record<string, unknown> | unknown): Promise<unknown> {
  const c = NITA_CONFIG;
  if (!c) return null;
  const r = await fetch(c.SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'apikey': c.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + c.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('Supabase insert ' + r.status);
  return r.json();
}

/** Update rows in a Supabase table matching a condition */
export async function supaUpdate(
  table: string,
  match: Record<string, unknown> | unknown,
  body: Record<string, unknown> | unknown
): Promise<unknown> {
  const c = NITA_CONFIG;
  if (!c) return null;
  const qs = Object.entries(match as Record<string, unknown>)
    .map(([k, v]) => k + '=eq.' + v)
    .join('&');
  const r = await fetch(c.SUPABASE_URL + '/rest/v1/' + table + '?' + qs, {
    method: 'PATCH',
    headers: {
      'apikey': c.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + c.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('Supabase update ' + r.status);
  return r.json();
}
