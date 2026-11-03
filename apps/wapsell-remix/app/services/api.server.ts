export function getApiBaseUrl(): string {
  const configuredUrl = process.env.API_BASE_URL || process.env.API_URL;
  if (!configuredUrl) throw new Response('API_BASE_URL is not configured on the Remix server.', { status: 503 });
  try {
    const url = new URL(configuredUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Response('API_BASE_URL is not a valid HTTP(S) URL.', { status: 503 });
  }
}
