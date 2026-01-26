import { api, setAccessToken } from './api';

export async function adminLogin(email: string, password: string) {
  const { data } = await api.post('/api/auth/admin/login', { email, password });
  setAccessToken(data.accessToken);
  return data as { accessToken: string; role: string };
}

export async function refreshAccessToken() {
  const { data } = await api.post('/api/auth/refresh');
  setAccessToken(data.accessToken);
  return data as { accessToken: string; role: string };
}

export async function logout() {
  await api.post('/api/auth/logout');
  setAccessToken(null);
}
