import axios from 'axios';

const rawBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:10000';
const baseURL = rawBase.replace(/\/$/, '');

export type ApiError = Error & { status?: number; details?: any };

export const api = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 10000,
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

function flash(message: string) {
  try {
    sessionStorage.setItem('mp_flash', message);
  } catch {
    // ignore
  }
}

export function consumeFlash(): string | null {
  try {
    const v = sessionStorage.getItem('mp_flash');
    if (v) sessionStorage.removeItem('mp_flash');
    return v;
  } catch {
    return null;
  }
}

// ✅ Safety net: attach token to every request (avoids missing Authorization after refresh/race conditions)
api.interceptors.request.use((config) => {
  const tok = getToken();
  if (tok) {
    config.headers = config.headers ?? {};
    (config.headers as any)['Authorization'] = `Bearer ${tok}`;
  } else if (config.headers) {
    delete (config.headers as any)['Authorization'];
  }
  return config;
});

// ✅ Better UX for auth errors + normalized error object
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = Number(err?.response?.status || 0) || undefined;
    const msg =
      String(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Request failed');

    // If user is not authorized, clear token and redirect to the right login
    if (status === 401 || status === 403) {
      setToken(null);
      flash('Sessione scaduta o accesso non autorizzato. Accedi di nuovo.');
      const path = window.location.pathname || '';
      if (path.startsWith('/admin')) window.location.assign('/admin/login');
      else window.location.assign('/login');
    }

    const e: ApiError = new Error(msg) as ApiError;
    e.status = status;
    e.details = err?.response?.data;
    return Promise.reject(e);
  }
);

// ✅ persist login after refresh
setToken(getToken());
