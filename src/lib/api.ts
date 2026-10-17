import type { ApiResult } from './types';
export async function api<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/bridge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }), cache: 'no-store' });
  let result: ApiResult<T>;
  try { result = await response.json() as ApiResult<T>; } catch { throw new Error('The server returned an invalid response. Please retry.'); }
  if (!response.ok || !result.ok) throw new Error(result.ok ? `Request failed (${response.status})` : result.error);
  return result.data;
}
