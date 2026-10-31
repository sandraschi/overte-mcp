export function apiUrl(path: string): string {
  // Same-host backend: LAN/Tailscale tabs reach the backend on the page's own
  // host (port 11110). Localhost-only hardcodes break those tabs (fleet webapp SOTA).
  if (typeof window === "undefined") return `http://127.0.0.1:11110${path}`;
  const { protocol, hostname } = window.location;
  if (protocol.startsWith("tauri") || !hostname) return `http://127.0.0.1:11110${path}`;
  return `${protocol}//${hostname}:11110${path}`;
}
