import axios, { AxiosError } from 'axios';

/**
 * Axios instance for the Spring Boot REST API.
 * Vite proxies /api -> http://localhost:8090 during development.
 */
export const api = axios.create({ baseURL: '/api' });

export type Portal = 'customer' | 'kitchen' | 'admin';

/** Which portal a URL belongs to. Each portal keeps its own login, so a kitchen tab never logs out a customer tab. */
export function portalOf(path: string = window.location.pathname): Portal {
  if (/^\/admin(\/|$)/.test(path)) return 'admin';
  if (/^\/kitchen(\/|$)/.test(path)) return 'kitchen'; // note: /kitchens (customer list) is not the kitchen portal
  return 'customer';
}

const keyFor = (p: Portal) => `homeplate.token.${p}`;

export const tokenStore = {
  get: (p: Portal = portalOf()) => { try { return localStorage.getItem(keyFor(p)); } catch { return null; } },
  set: (t: string, p: Portal = portalOf()) => { try { localStorage.setItem(keyFor(p), t); } catch { /* ignore */ } },
  clear: (p: Portal = portalOf()) => { try { localStorage.removeItem(keyFor(p)); } catch { /* ignore */ } },
};

api.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ message?: string }>) => {
    if (err.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      window.dispatchEvent(new Event('homeplate:logout'));
    }
    return Promise.reject(err);
  },
);

export function errMsg(e: unknown, fallback = 'Something went wrong'): string {
  const ax = e as AxiosError<{ message?: string }>;
  if (ax?.response?.data?.message) return ax.response.data.message;
  if (ax?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running on port 8090?';
  return fallback;
}

/** Upload a file; folder = images | documents | videos */
export async function uploadFile(file: File, folder: 'images' | 'documents' | 'videos' = 'images',
  onProgress?: (pct: number) => void): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);
  const { data } = await api.post('/files/upload', fd, {
    onUploadProgress: (p) => p.total && onProgress?.(Math.round((p.loaded / p.total) * 100)),
  });
  return data.url as string;
}
