/**
 * Base URL for the Express API (no trailing slash).
 * Set VITE_API_URL in .env for local dev, or in Hostinger build env for production
 * (e.g. https://yourdomain.com or https://api.yourdomain.com).
 */
const raw = import.meta.env.VITE_API_URL as string | undefined;
// If VITE_API_URL is set, use it. Otherwise, if we are in a browser, use the current origin. 
// If somehow not in browser (e.g. SSR), fallback to localhost:5000.
export const API_BASE_URL = raw 
  ? raw.replace(/\/$/, "") 
  : (typeof window !== 'undefined' ? window.location.origin : "http://localhost:5000");

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}
