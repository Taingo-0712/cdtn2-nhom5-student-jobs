const baseUrl = new URL(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080');

export async function httpClient(path, options = {}) {
  const { token, json, responseType = 'json', ...request } = options;
  const url = new URL(path, baseUrl);

  if (url.origin !== baseUrl.origin) {
    throw new Error('Địa chỉ yêu cầu nằm ngoài backend đã cấu hình.');
  }

  const headers = new Headers(request.headers);
  let body = request.body;

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const response = await fetch(url, { ...request, headers, body });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.error?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = payload?.error?.code;
    error.details = payload?.error?.details || [];
    error.traceId = payload?.trace_id;
    throw error;
  }

  if (response.status === 204) return null;
  return responseType === 'blob' ? response.blob() : response.json();
}
