import { type Writable, writable } from "svelte/store";

export const isProduction: Writable<boolean> = writable();

export function getApiUri(): string {
  const url = import.meta.env.VITE_ANCA_API_URI;
  if (url != null) {
    return url;
  }
  return `${window.location.origin}/api/v1`;
}
