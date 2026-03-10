import { User } from './types';

const USERS_KEY = 'powergrid_users';
const SESSION_KEY = 'powergrid_session';

export function getUsers(): User[] {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function register(user: Omit<User, 'id' | 'createdAt'>): { success: boolean; error?: string } {
  const users = getUsers();

  if (users.find((u) => u['email'].toLowerCase() === user['email'].toLowerCase())) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  if (users.find((u) => u['systemNumber'] === user['systemNumber'])) {
    return { success: false, error: 'This System Number is already registered.' };
  }

  const newUser: User = {
    ...user,
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);
  return { success: true };
}

export function login(email: string, password: string): { success: boolean; user?: User; error?: string } {
  const users = getUsers();
  const user = users.find((u) => u['email'].toLowerCase() === email.toLowerCase());

  if (!user) {
    return { success: false, error: 'No account found with this email address.' };
  }

  if (user['password'] !== password) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return { success: true, user };
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): User | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
