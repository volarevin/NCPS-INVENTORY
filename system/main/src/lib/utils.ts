import { clsx, type ClassValue } from "clsx";
import { apiUrl } from '@/config/api';
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getProfilePictureUrl(path: string | null | undefined) {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return apiUrl(`${path}`);
}
