import { apiFetch } from './api';

export type Role = 'admin' | 'user' | 'seller';
export type User = { id: string; email: string; role: Role };

export async function adminLogin(email: string, password: string): Promise<User> {
  const r = await apiFetch<{ accessToken: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('mp_access', r.accessToken);
  localStorage.setItem('mp_user', JSON.stringify(r.user));
  return r.user;
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('mp_access');
  localStorage.removeItem('mp_user');
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem('mp_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
