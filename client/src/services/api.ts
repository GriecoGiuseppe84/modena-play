import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:10000';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

export function setAccessToken(token: string | null) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}
