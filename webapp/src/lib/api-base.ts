export function apiUrl(path: string): string {
  // Fleet ports: backend 11110 / frontend 11111 (WEBAPP_PORTS.md)
  const base = "http://localhost:11110";
  return `${base}${path}`;
}
