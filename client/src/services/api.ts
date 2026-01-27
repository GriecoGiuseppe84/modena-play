const API_URL = import.meta.env.VITE_API_URL || '';

function getAccessToken() {
  return localStorage.getItem('mp_access') || '';
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    const rr = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (rr.ok) {
      const j = await rr.json();
      localStorage.setItem('mp_access', j.accessToken);
      return apiFetch<T>(path, init);
    }
  }

  const txt = await res.text();
  const data = txt ? (() => { try { return JSON.parse(txt); } catch { return { error: txt }; } })() : {};
  if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
  return data as T;
}
