export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Small fetch wrapper. Always sends the CSRF header and the session cookie,
 * and turns server errors into friendly messages.
 */
export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { 'X-Requested-With': 'DLM' };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload, credentials: 'same-origin' });
  } catch {
    throw new ApiError('We could not reach the server. Please check your internet connection and try again.', 0);
  }
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok && !isJson && res.status >= 500) {
    throw new ApiError('The service is not responding right now. Please try again in a minute.', res.status);
  }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login')) window.dispatchEvent(new Event('dlm:unauthorized'));
    throw new ApiError(data?.error || 'Something went wrong. Please try again.', res.status, data);
  }
  return data;
}

/** Download a protected file and save it with its original name. */
export async function downloadFile(path, fallbackName = 'document') {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin', headers: { 'X-Requested-With': 'DLM' } });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(data?.error || 'Could not download the file.', res.status);
  }
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
  const name = match ? decodeURIComponent(match[1]) : fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
