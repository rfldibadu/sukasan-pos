// Utilities for Mobile & Browser Web Push Notifications

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

export function getDeviceName(): string {
  if (typeof window === "undefined") return "Unknown Device";
  const ua = window.navigator.userAgent;
  const isPwa = isStandalonePwa();
  const pwaSuffix = isPwa ? " (PWA)" : "";

  if (/iPhone/i.test(ua)) return `iPhone${pwaSuffix}`;
  if (/iPad/i.test(ua)) return `iPad${pwaSuffix}`;
  if (/Android/i.test(ua)) return `Android Phone${pwaSuffix}`;
  if (/Macintosh/i.test(ua)) return `Mac${pwaSuffix}`;
  if (/Windows/i.test(ua)) return `Windows PC${pwaSuffix}`;
  return `Mobile / Web${pwaSuffix}`;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error("[WebPush] Failed to register service worker:", err);
    return null;
  }
}

export async function getDeviceSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const reg = await registerServiceWorker();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.error("[WebPush] Error getting subscription:", err);
    return null;
  }
}

export async function subscribeDeviceToPush(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    throw new Error("Web Push Notifications are not supported on this browser.");
  }

  // Request browser notification permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied. Please allow notifications in your phone / browser settings.");
  }

  const reg = await registerServiceWorker();
  if (!reg) {
    throw new Error("Failed to register background Service Worker.");
  }

  // Check if existing subscription exists
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });
  }

  return sub;
}

export async function unsubscribeDeviceFromPush(): Promise<string | null> {
  if (!isPushNotificationSupported()) return null;

  const reg = await registerServiceWorker();
  if (!reg) return null;

  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
