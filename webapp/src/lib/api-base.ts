export function apiUrl(path: string): string {
  // Point to the FastAPI backend running on port 10989
  const base = "http://localhost:10989";
  return `${base}${path}`;
}
