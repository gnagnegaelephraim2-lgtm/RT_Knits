// ============================================================
// RT KNITS — NITA API Client
// ============================================================

import { NITA_CONFIG } from './config';
import type { ApiResponse } from './types';

function base(): string {
  return (NITA_CONFIG.NITA_API_URL || '').replace(/\/$/, '');
}

async function get<T = ApiResponse>(path: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const r = await fetch(base() + path + qs);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

async function post<T = ApiResponse>(path: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(base() + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export const API = { base, get, post };
