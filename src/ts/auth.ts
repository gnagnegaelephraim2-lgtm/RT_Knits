// ============================================================
// RT KNITS — NITA CMMS Authentication
// ============================================================

import type { AppUser, UserRole, Session, LoginRequest, SignupRequest, AuthResponse } from './types';

const STORAGE_KEY = 'nita_session';

export class AuthManager {
  private currentSession: Session | null = null;

  constructor() {
    this.loadSession();
  }

  private async sha256Hex(input: string): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
  }

  normalizePhone(phone: string): string {
    let clean = phone.replace(/[\s\-\(\)]/g, '');
    if (!clean.startsWith('+')) {
      if (clean.startsWith('230') && clean.length > 8) {
        clean = '+' + clean;
      } else if (clean.length === 8 && /^[5796]/.test(clean)) {
        clean = '+230' + clean;
      } else {
        clean = '+' + clean;
      }
    }
    return clean;
  }

  validateE164(phone: string): boolean {
    return /^\+[1-9]\d{6,14}$/.test(phone);
  }

  async hashPin(pin: string): Promise<string> {
    if (pin.length < 4 || pin.length > 6) {
      throw new Error('PIN must be 4-6 digits');
    }
    if (!/^\d+$/.test(pin)) {
      throw new Error('PIN must contain only digits');
    }
    return this.sha256Hex(pin);
  }

  private loadSession(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored) as Session;
        // Check if session is expired
        if (session.loginTime && Date.now() - session.loginTime < 3600000) {
          this.currentSession = session;
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private saveSession(session: Session): void {
    this.currentSession = session;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  getSession(): Session | null {
    return this.currentSession;
  }

  isAuthenticated(): boolean {
    return this.currentSession !== null;
  }

  getRole(): UserRole | null {
    return this.currentSession?.role || null;
  }

  getUserId(): string | null {
    return this.currentSession?.user.user_id || null;
  }

  async login(phone: string, pin: string): Promise<{ success: boolean; error?: string; role?: UserRole }> {
    const normalizedPhone = this.normalizePhone(phone);
    
    if (!this.validateE164(normalizedPhone)) {
      return { success: false, error: 'Invalid phone number format.' };
    }

    try {
      const pinHash = await this.hashPin(pin);

      // Try NITA API first
      const response = await fetch(`${(window as any).NITA_CONFIG?.NITA_API_URL || 'https://bot.nelsonfodjo.me/webhook'}/api-auth-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: normalizedPhone, pin_hash: pinHash })
      });

      if (response.ok) {
        const data: AuthResponse = await response.json();
        if (!data.error && data.token) {
          // Fetch user details
          const users = await fetch(`${(window as any).NITA_CONFIG?.NITA_API_URL || 'https://bot.nelsonfodjo.me/webhook'}/api-admin-read?table=app_user&filter_field=phone_number&filter_value=${normalizedPhone}`);
          const userData = await users.json();
          
          const user: AppUser = userData[0] || {
            user_id: 'unknown',
            full_name: 'User',
            phone_number: normalizedPhone,
            role: data.role,
            created_at: new Date().toISOString()
          };

          this.saveSession({
            user,
            token: data.token,
            role: data.role,
            loginTime: Date.now()
          });

          return { success: true, role: data.role };
        }
      }

      // Fallback to localStorage
      return this.loginFallback(normalizedPhone, pin, pinHash);
    } catch (error) {
      console.error('Login error:', error);
      const pinHash = await this.hashPin(pin);
      return this.loginFallback(normalizedPhone, pin, pinHash);
    }
  }

  private loginFallback(phone: string, rawPin: string, pinHash: string): { success: boolean; error?: string; role?: UserRole } {
    const users = this.getLocalUsers();
    
    if (rawPin === '1234' || rawPin === '123456') {
      if (!users[phone]) {
        users[phone] = {
          phone_number: phone,
          pin_hash: pinHash,
          role: 'coordinator',
          full_name: 'User ' + phone.slice(-4),
          created_at: new Date().toISOString()
        };
        localStorage.setItem('nita_users', JSON.stringify(users));
      }
      const user = users[phone];
      this.saveSession({
        user: { ...user, user_id: phone },
        token: 'local-token',
        role: (user.role as UserRole) || 'coordinator',
        loginTime: Date.now()
      });
      return { success: true, role: (user.role as UserRole) || 'coordinator' };
    }

    const user = users[phone];
    if (user && user.pin_hash === pinHash) {
      this.saveSession({
        user: { ...user, user_id: phone },
        token: 'local-token',
        role: user.role as UserRole,
        loginTime: Date.now()
      });
      return { success: true, role: user.role as UserRole };
    }

    return { success: false, error: 'Invalid credentials. Default PIN is 1234.' };
  }

  private getLocalUsers(): Record<string, any> {
    try {
      return JSON.parse(localStorage.getItem('nita_users') || '{}');
    } catch {
      return {};
    }
  }

  async signup(name: string, phone: string, role: string, pin: string, departmentId?: string, trade?: string): Promise<{ success: boolean; error?: string }> {
    const normalizedPhone = this.normalizePhone(phone);
    
    if (!this.validateE164(normalizedPhone)) {
      return { success: false, error: 'Invalid phone number format.' };
    }

    const sanitizedName = name.replace(/[<>]/g, '').trim();

    if (sanitizedName.length < 2 || sanitizedName.length > 100) {
      return { success: false, error: 'Name must be 2-100 characters.' };
    }

    try {
      const pinHash = await this.hashPin(pin);

      // Try NITA API
      const response = await fetch(`${(window as any).NITA_CONFIG?.NITA_API_URL || 'https://bot.nelsonfodjo.me/webhook'}/api-auth-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: normalizedPhone,
          pin_hash: pinHash,
          role,
          full_name: sanitizedName
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          return { success: true };
        }
        return { success: false, error: data.message };
      }

      // Fallback to localStorage
      return this.signupFallback(normalizedPhone, pinHash, role, sanitizedName);
    } catch (error) {
      console.error('Signup error:', error);
      const pinHash = await this.hashPin(pin);
      return this.signupFallback(normalizedPhone, pinHash, role, sanitizedName);
    }
  }

  private signupFallback(phone: string, pinHash: string, role: string, name: string): { success: boolean; error?: string } {
    const users = this.getLocalUsers();
    
    if (users[phone]) {
      return { success: false, error: 'User already exists.' };
    }

    users[phone] = {
      phone_number: phone,
      pin_hash: pinHash,
      role,
      full_name: name,
      created_at: new Date().toISOString()
    };

    localStorage.setItem('nita_users', JSON.stringify(users));
    return { success: true };
  }

  logout(): void {
    this.currentSession = null;
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const auth = new AuthManager();