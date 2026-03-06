import { Injectable } from '@angular/core';

const AUTH_STORAGE_KEY = 'gridlite.session' as const;

// ---- Old Roles ----
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

// ---- Old Page Labels ----
export const PAGE_LABELS: Record<string, string> = {
  '/map': 'Map',
  '/feeder': 'Feeder',
  '/transformers': 'Transformers',
  '/planner': 'Planner',
  '/reports': 'Reports',
  '/consumer': 'Consumer',
  '/settings': 'Settings',
  '/help': 'Help',
  '/legal/privacy': 'Privacy',
  '/legal/terms': 'Terms'
};

// ---- Old Access Matrix (ported) ----
// NOTE: As in your old code, Admin does NOT see Feeder/Transformers
const PAGE_ACCESS: Record<string, AppRole[]> = {
  '/':                [ROLES.ADMIN, ROLES.DTCOM, ROLES.FIELD, ROLES.VIEWER, ROLES.CONSUMER],
  '/map':             [ROLES.ADMIN, ROLES.DTCOM, ROLES.FIELD, ROLES.VIEWER],
  '/feeder':          [ROLES.DTCOM, ROLES.FIELD, ROLES.VIEWER],
  '/transformers':    [ROLES.DTCOM, ROLES.FIELD, ROLES.VIEWER],
  '/planner':         [ROLES.ADMIN, ROLES.DTCOM, ROLES.FIELD],
  '/reports':         [ROLES.ADMIN, ROLES.DTCOM, ROLES.VIEWER],
  '/settings':        [ROLES.ADMIN],
  '/consumer':        [ROLES.CONSUMER],
  '/help':            [ROLES.ADMIN, ROLES.DTCOM, ROLES.FIELD, ROLES.VIEWER, ROLES.CONSUMER],
  '/legal/privacy':   [ROLES.ADMIN, ROLES.DTCOM, ROLES.FIELD, ROLES.VIEWER, ROLES.CONSUMER],
  '/legal/terms':     [ROLES.ADMIN, ROLES.DTCOM, ROLES.FIELD, ROLES.VIEWER, ROLES.CONSUMER]
};

const ROLE_HOME: Record<AppRole, string> = {
  [ROLES.ADMIN]:    '/map',
  [ROLES.DTCOM]:    '/map',
  [ROLES.FIELD]:    '/map',
  [ROLES.VIEWER]:   '/map',
  [ROLES.CONSUMER]: '/consumer'
};

export type Session = {
  role: AppRole;
  userId?: string;
  timestamp?: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Read current session (localStorage) */
  private readSession(): Session | null {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  }

  /** Write session */
  private writeSession(s: Session): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(s));
  }

  /** Public: get current role */
  getCurrentRole(): AppRole | null {
    return this.readSession()?.role ?? null;
  }

  /** Public: sign out */
  signOut(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  /** Public: set role (handy during dev without login) */
  setRole(role: AppRole, userId?: string): void {
    this.writeSession({ role, userId, timestamp: new Date().toISOString() });
  }

  /** Accessible routes for a role (Angular routes) */
  getAccessibleRoutes(role: AppRole | null = this.getCurrentRole()): string[] {
    if (!role) return [];
    const routes: string[] = [];
    Object.entries(PAGE_ACCESS).forEach(([route, roles]) => {
      if (roles.includes(role)) routes.push(route);
    });
    return routes;
  }

  /** Label for a route */
  getLabel(route: string): string {
    return PAGE_LABELS[route] ?? route;
  }

  /** Display name for role */
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

  /** Home route per role */
  getRoleHomepage(role: AppRole | null = this.getCurrentRole()): string {
    return role ? ROLE_HOME[role] : '/';
  }
}