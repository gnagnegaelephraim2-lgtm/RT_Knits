// ============================================================
// RT KNITS — NITA CMMS Authentication Module
// ============================================================

import { $, normPhone, sha256, toast } from './utils';
import { supa, supaInsert } from './supabase';
import { API } from './api';
import { session, setSession } from './state';
// loadAll is defined in main.ts and exposed on window

export function switchTab(tab: string): void {
  const loginPane = $('form-login-pane');
  const signupPane = $('form-signup-pane');
  const tabLogin = $('tab-login');
  const tabSignup = $('tab-signup');
  if (loginPane) loginPane.classList.toggle('active', tab === 'login');
  if (signupPane) signupPane.classList.toggle('active', tab === 'signup');
  if (tabLogin) tabLogin.classList.toggle('active', tab === 'login');
  if (tabSignup) tabSignup.classList.toggle('active', tab === 'signup');
}

export function toggleSignupFields(): void {
  const r = ($('auth-signup-role') as HTMLSelectElement | null)?.value;
  const df = $('signup-dept-field');
  const tf = $('signup-trade-field');
  if (df) df.style.display = r === 'technician' ? 'none' : '';
  if (tf) tf.style.display = r === 'technician' ? '' : 'none';
  if (r === 'admin') {
    toast('Admin accounts have full system access.', 'info');
  }
}

export async function doLogin(): Promise<void> {
  const phoneInput = $('auth-phone') as HTMLInputElement | null;
  const pinInput = $('auth-pin') as HTMLInputElement | null;
  if (!phoneInput || !pinInput) return;
  const phone = normPhone(phoneInput.value);
  const pin = pinInput.value;
  if (!phone || !pin) return toast('Enter phone and PIN.', 'error');

  const ph = await sha256(pin);
  const local: Record<string, Record<string, unknown>> = JSON.parse(localStorage.getItem('nita_users') || '{}');

  // Check local users (hashed PIN)
  if (local[phone] && (local[phone] as any).pin_hash === ph) {
    const user = local[phone] as any;
    const newSession = { user, role: user.role, userId: phone };
    setSession(newSession);
    localStorage.setItem('nita_session', JSON.stringify(newSession));
    $('auth-overlay')?.classList.add('hidden');
    (window as any).updateUI();
    (window as any)._loadAll();
    toast('Welcome back!', 'success');
    return;
  }

  // Check Supabase directly
  try {
    const usersResult = await supa('app_user', 'phone_number=eq.' + encodeURIComponent(phone)) as any[];
    if (usersResult && usersResult.length) {
      const u = usersResult[0];
      if (u.pin_hash === ph || u.pin_hash === pin) {
        const newSession = {
          user: { full_name: u.full_name, role: u.role, phone_number: u.phone_number, user_id: u.user_id, email: u.email },
          role: u.role,
          userId: u.user_id
        };
        setSession(newSession);
        localStorage.setItem('nita_session', JSON.stringify(newSession));
        $('auth-overlay')?.classList.add('hidden');
        (window as any).updateUI();
        (window as any)._loadAll();
        toast('Welcome, ' + u.full_name + '!', 'success');
        return;
      }
    }
  } catch (e) {
    console.error('Supabase login check failed:', e);
  }

  // Fallback: try n8n API
  try {
    const d = await API.post('/api-task-lifecycle', { action: 'auth_check', phone_number: phone, pin_hash: ph }) as any;
    if (d && !d.error) {
      const newSession = {
        user: { full_name: d.full_name || 'User', role: d.role || 'coordinator', phone_number: phone, user_id: phone },
        role: d.role || 'coordinator',
        userId: phone
      };
      setSession(newSession);
      localStorage.setItem('nita_session', JSON.stringify(newSession));
      $('auth-overlay')?.classList.add('hidden');
      (window as any).updateUI();
      (window as any)._loadAll();
      toast('Welcome!', 'success');
      return;
    }
  } catch (_e) { /* ignore */ }

  toast('Invalid credentials. Please check your phone number and PIN.', 'error');
}

export async function doSignup(): Promise<void> {
  const nameInput = $('auth-signup-name') as HTMLInputElement | null;
  const phoneInput = $('auth-signup-phone') as HTMLInputElement | null;
  const roleInput = $('auth-signup-role') as HTMLSelectElement | null;
  const pinInput = $('auth-signup-pin') as HTMLInputElement | null;
  if (!nameInput || !phoneInput || !roleInput || !pinInput) return;

  const name = nameInput.value.trim();
  const phone = normPhone(phoneInput.value);
  const role = roleInput.value;
  const pin = pinInput.value;

  if (!name || !phone || !pin) return toast('All fields required.', 'error');
  if (pin.length < 4 || pin.length > 6) return toast('PIN must be 4-6 digits.', 'error');
  if (name.length < 2) return toast('Name too short.', 'error');

  const ph = await sha256(pin);
  const local: Record<string, Record<string, unknown>> = JSON.parse(localStorage.getItem('nita_users') || '{}');
  if (local[phone]) return toast('Account exists. Sign in.', 'error');

  local[phone] = {
    phone_number: phone,
    full_name: name,
    role: role,
    pin_hash: ph,
    created_at: new Date().toISOString(),
    user_id: phone
  };
  localStorage.setItem('nita_users', JSON.stringify(local));

  try {
    await supaInsert('app_user', { full_name: name, phone_number: phone, role, pin_hash: ph });
  } catch (_e) { /* ignore */ }

  toast('Account created! Sign in.', 'success');
  switchTab('login');
}

export function doLogout(): void {
  setSession(null);
  localStorage.removeItem('nita_session');
  location.reload();
}

export function updateUI(): void {
  const s = session;
  if (!s) return;
  const u = s.user;
  const inits = (u.full_name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const avatarEl = $('current-user-avatar');
  const nameEl = $('current-user-name');
  const roleEl = $('current-user-role');
  if (avatarEl) avatarEl.textContent = inits;
  if (nameEl) nameEl.textContent = u.full_name || 'User';
  if (roleEl) roleEl.textContent = s.role;

  const isAdmin = s.role === 'admin';
  const isCoordinator = s.role === 'coordinator' || isAdmin;
  const isTechnician = s.role === 'technician';

  const menuItems = [
    'menu-coordinator-dash', 'menu-planning-breakdown', 'menu-task-entry',
    'menu-tasks-to-approve', 'menu-whatsapp-sim', 'menu-conversations',
    'menu-technician-tasks', 'menu-api', 'menu-database', 'menu-docs', 'menu-profile'
  ];
  menuItems.forEach((id) => { const el = $(id); if (el) el.style.display = ''; });

  if (isAdmin) {
    const mc = $('menu-conversations'); if (mc) mc.style.display = '';
    const ma = $('menu-api'); if (ma) ma.style.display = '';
    const md = $('menu-database'); if (md) md.style.display = '';
    const sub = $('dash_title'); if (sub) sub.textContent = 'Admin Dashboard';
    const rel = $('current-user-role'); if (rel) rel.textContent = 'Admin';
  }

  if (isCoordinator) {
    const mc = $('menu-conversations'); if (mc) mc.style.display = '';
  } else {
    const mc = $('menu-conversations'); if (mc) mc.style.display = 'none';
  }

  if (isTechnician) {
    const mt = $('menu-technician-tasks'); if (mt) mt.style.display = '';
    const mc = $('menu-coordinator-dash'); if (mc) mc.style.display = 'none';
    const mp = $('menu-planning-breakdown'); if (mp) mp.style.display = 'none';
    const me = $('menu-task-entry'); if (me) me.style.display = 'none';
    const ma = $('menu-tasks-to-approve'); if (ma) ma.style.display = 'none';
    const ms = $('menu-whatsapp-sim'); if (ms) ms.style.display = 'none';
    const mv = $('menu-conversations'); if (mv) mv.style.display = 'none';
    const mi = $('menu-api'); if (mi) mi.style.display = 'none';
    const md = $('menu-database'); if (md) md.style.display = 'none';
  }

  if (!isCoordinator) {
    const mi = $('menu-api'); if (mi) mi.style.display = 'none';
    const md = $('menu-database'); if (md) md.style.display = 'none';
  }

  const lang = u.preferred_language || 'en';
  const pl = $('prof-lang') as HTMLSelectElement | null;
  if (pl) pl.value = lang;
}
