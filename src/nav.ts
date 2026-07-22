// ============================================================
// RT KNITS — NITA CMMS Navigation
// ============================================================

import { $, $$, toast } from './utils';
import { session } from './state';

export function navigateTo(id: string): void {
  if (!session) return;
  const isCoordinator = session.role === 'coordinator' || session.role === 'admin';
  if ((id === 'pane-api' || id === 'pane-database') && !isCoordinator) {
    toast('Access denied. Coordinator role required.', 'error');
    return;
  }
  $$('.content-pane').forEach((p) => p.classList.remove('active'));
  $$('.nav-item').forEach((n) => n.classList.remove('active'));
  const pane = $(id);
  if (pane) pane.classList.add('active');
  const nav = document.querySelector('[data-target="' + id + '"]') as HTMLElement | null;
  if (nav) nav.classList.add('active');
}
