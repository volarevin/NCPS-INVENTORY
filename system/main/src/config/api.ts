/**
 * Base URL for the Express API (no trailing slash).
 * Set VITE_API_URL in .env for local dev, or in Hostinger build env for production
 * (e.g. https://yourdomain.com or https://api.yourdomain.com).
 */
const raw = import.meta.env.VITE_API_URL as string | undefined;
export const API_BASE_URL = (raw?.replace(/\/$/, "") || "http://localhost:5000").replace(/\/$/, "");

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}
