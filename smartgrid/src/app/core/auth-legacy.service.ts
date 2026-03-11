import { Injectable, computed, signal } from '@angular/core';

const AUTH_STORAGE_KEY = 'gridlite.session' as const;

// ---- Roles (same strings as your old js) ----
export const ROLES = {
  ADMIN: 'Administrator',
  DTCOM: 'DTCoM',
  FIELD: 'Field',
  VIEWER: 'Viewer',
  CONSUMER: 'Consumer'
} as const;

export type AppRole =
  | typeof ROLES.ADMIN
  | typeof ROLES.DTCOM
  | typeof ROLES.FIELD
  | typeof ROLES.VIEWER
  | typeof ROLES.CONSUMER;

// ---- Angular route equivalents for PAGE_ACCESS (note: 'reports.html' -> '/report') ----
const PAGE_ACCESS: Record<string, AppRole[]> = {
  // landing/login ignored here (header hides there)
  '/map':             [ROLES.ADMIN, ROLES.DTCOM, ROLES.FIELD, ROLES.VIEWER],
  '/feeder':          [ROLES.ADMIN,ROLES.DTCOM, ROLES.FIELD, ROLES.VIEWER],     
  '/transformers':    [ROLES.ADMIN,ROLES.DTCOM, ROLES.FIELD, ROLES.VIEWER],     
  '/planner':         [ROLES.ADMIN, ROLES.DTCOM, ROLES.FIELD],
  '/report':          [ROLES.ADMIN, ROLES.DTCOM, ROLES.VIEWER],     // reports.html -> /report
  '/settings':        [ROLES.ADMIN],
  '/consumer':        [ROLES.CONSUMER],
  '/help':            [ROLES.ADMIN, ROLES.DTCOM, ROLES.FIELD, ROLES.VIEWER, ROLES.CONSUMER],
};

@Injectable({ providedIn: 'root' })
export class AuthLegacyService {
  private roleSig = signal<AppRole | null>(null);
  role = computed(() => this.roleSig());

  constructor() {
    // hydrate from storage on start
    this.roleSig.set(this.getCurrentRole());
    // keep updated if another tab/window changes it
    window.addEventListener('storage', (e) => {
      if (e.key === AUTH_STORAGE_KEY) this.roleSig.set(this.getCurrentRole());
    });
  }

  /** signIn(role, userId) — exactly like old auth.js */
  signIn(role: AppRole, userId?: string) {
    const session = { role, userId, timestamp: new Date().toISOString() };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    this.roleSig.set(role);
    return session;
  }

  /** currentSession() */
  currentSession(): { role: AppRole; userId?: string; timestamp?: string } | null {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  /** signOut() */
  signOut() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    this.roleSig.set(null);
  }

  /** isAuthenticated() */
  isAuthenticated(): boolean {
    return this.currentSession() !== null;
  }

  /** getCurrentRole() */
  getCurrentRole(): AppRole | null {
    const s = this.currentSession();
    return s ? (s.role as AppRole) : null;
  }

  /** getAccessibleRoutes(role = current) — Angular routes list mirroring getAccessiblePages() */
  getAccessibleRoutes(role: AppRole | null = this.getCurrentRole()): string[] {
    if (!role) return [];
    const out: string[] = [];
    Object.entries(PAGE_ACCESS).forEach(([route, roles]) => {
      if (roles.includes(role)) out.push(route);
    });
    return out;
  }

  /** getRoleDisplayName(role) */
  getRoleDisplayName(role: AppRole): string {
    const names: Record<AppRole, string> = {
      [ROLES.ADMIN]:    'Administrator',
      [ROLES.DTCOM]:    'DT O&M Partner',
      [ROLES.FIELD]:    'Field Technician',
      [ROLES.VIEWER]:   'Viewer',
      [ROLES.CONSUMER]: 'Consumer'
    };
    return names[role] || role;
  }

  /** getRoleHomepage() — Angular route version of ROLE_PAGES */
  getRoleHomepage(role: AppRole | null = this.getCurrentRole()): string {
    if (!role) return '/';
    // your old logic: all but CONSUMER -> map, CONSUMER -> consumer
    return role === ROLES.CONSUMER ? '/consumer' : '/map';
  }
}