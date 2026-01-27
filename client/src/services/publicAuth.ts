import { apiFetch } from './api';
import type { User, Role } from './auth';

export async function signup(email: string, password: string, role: Exclude<Role, 'admin'>): Promise<User> {
  const r = await apiFetch<{ accessToken: string; user: User }>('/api/public/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
  localStorage.setItem('mp_access', r.accessToken);
  localStorage.setItem('mp_user', JSON.stringify(r.user));
  return r.user;
}

export async function login(email: string, password: string): Promise<User> {
  const r = await apiFetch<{ accessToken: string; user: User }>('/api/public/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('mp_access', r.accessToken);
  localStorage.setItem('mp_user', JSON.stringify(r.user));
  return r.user;
}
