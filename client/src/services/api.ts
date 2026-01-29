import axios from 'axios';

const rawBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:10000';
const baseURL = rawBase.replace(/\/$/, '');

export const api = axios.create({
  baseURL,
  // ✅ niente cookie
  withCredentials: false,
  // ✅ rende l'UX più "snappy" su Render free (se il backend è down/cold-start evitiamo attese infinite)
  timeout: 8000,
});

export function getToken() {
  return localStorage.getItem('mp_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('mp_token', token);
  else localStorage.removeItem('mp_token');

  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

// ✅ persist login after refresh
setToken(getToken());
