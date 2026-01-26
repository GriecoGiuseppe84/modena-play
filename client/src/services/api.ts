// client/src/services/api.ts
import axios from 'axios';

function normalizeBaseUrl(raw?: string): string {
  const fallback = 'http://localhost:10000';
  const v = String(raw ?? '').trim();

  if (!v) return fallback;

  // Se l'utente mette "modenaplay-api.onrender.com" senza https
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;

  // Rimuovi slash finali (evita //api/...)
  return withProto.replace(/\/+$/, '');
}

const baseURL = normalizeBaseUrl(import.meta.env.VITE_API_URL as string | undefined);

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20000,
});

export function setAccessToken(token: string | null) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}
