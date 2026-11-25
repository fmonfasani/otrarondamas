/**
 * E3 — subscribes this browser to push (new messages with Wapsell closed). Browser only; needs
 * notification permission already granted. Quiet: any failure leaves the in-page alerts (E2).
 */
const SETTINGS = '/panel/mensajes/avisos';

/** The VAPID public key (base64url) as the bytes PushManager wants. */
export function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function ensurePushSubscription(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
    const settings = (await (await fetch(SETTINGS, { credentials: 'same-origin' })).json()) as {
      enabled: boolean;
      publicKey: string | null;
    };
    if (!settings.enabled || !settings.publicKey) return false;
    const registration = await navigator.serviceWorker.register('/sw.js');
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(settings.publicKey) }));
    const response = await fetch(SETTINGS, {
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify(subscription.toJSON()),
    });
    return response.ok;
  } catch {
    return false;
  }
}
