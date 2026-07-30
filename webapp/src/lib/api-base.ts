export function apiUrl(path: string): string {
  // Fleet ports: backend 11110 / frontend 11111 (WEBAPP_PORTS.md)
  const base = "http://127.0.0.1:11110";
  return `${base}${path}`;
}
