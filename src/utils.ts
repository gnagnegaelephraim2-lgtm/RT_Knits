// ============================================================
// RT KNITS — NITA CMMS Utility Functions
// ============================================================

/** HTML-escape a string */
export function esc(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Shorthand getElementById */
export function $<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/** Shorthand querySelectorAll */
export function $$<T extends HTMLElement = HTMLElement>(s: string): NodeListOf<T> {
  return document.querySelectorAll<T>(s);
}

/** Generate a unique ID with an optional prefix */
export function uid(prefix?: string): string {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return (prefix || 'tr') + '-' + Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 hash a string */
export async function sha256(s: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Normalize a phone number to E.164 format */
export function normPhone(p: string): string {
  const c = p.replace(/[\s\-\(\)]/g, '');
  if (!c.startsWith('+')) {
    if (c.startsWith('230') && c.length > 8) return '+' + c;
    if (c.length === 8 && /^[5796]/.test(c)) return '+230' + c;
    return '+' + c;
  }
  return c;
}

/** Convert a timestamp to a human-readable "time ago" string */
export function ago(ts: string | null | undefined): string {
  if (!ts) return '';
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return 'just now';
  if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
  return Math.floor(d / 86400000) + 'd ago';
}

/** Get today's date as YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/** Apply data-label attributes for mobile table responsiveness */
export function applyMobileLabels(): void {
  $$('.data-table').forEach((table) => {
    const headers: string[] = [];
    table.querySelectorAll('thead th').forEach((th) => {
      headers.push(th.textContent!.trim());
    });
    if (!headers.length) return;
    table.querySelectorAll('tbody tr').forEach((tr) => {
      tr.querySelectorAll('td').forEach((td, i) => {
        if (i < headers.length && headers[i]) td.setAttribute('data-label', headers[i]);
      });
    });
  });
}

/** Show a toast notification */
export function toast(msg: string, type?: string): void {
  const t = document.createElement('div');
  t.className = 'toast toast-' + (type || 'info');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 3000);
}
