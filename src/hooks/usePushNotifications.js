import { useState, useEffect, useCallback } from "react";
import { get, post } from "../services/api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Computed once — these never change during the page lifetime
const IS_SUPPORTED = "serviceWorker" in navigator && "Notification" in window;
const IS_SECURE    = window.isSecureContext; // true on HTTPS or localhost

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isChecked,    setIsChecked]    = useState(false); // true once initial sub check completes
  const [permission,   setPermission]   = useState(
    IS_SUPPORTED ? Notification.permission : "denied"
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // On mount: check if browser already has an active push subscription
  useEffect(() => {
    if (!IS_SUPPORTED || !IS_SECURE) { setIsChecked(true); return; }
    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((reg) => reg?.pushManager?.getSubscription())
      .then((sub) => { if (sub) setIsSubscribed(true); })
      .catch(() => {})
      .finally(() => setIsChecked(true));
  }, []);

  const subscribe = useCallback(async () => {
    setError(null);

    if (!IS_SUPPORTED) {
      setError("Your browser does not support push notifications.");
      return;
    }
    if (!IS_SECURE) {
      setError("Notifications require HTTPS. Please open the app via https://");
      return;
    }

    setLoading(true);
    try {
      // 1. Ask for permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError("Notification permission denied. Please allow it in your browser settings.");
        return;
      }

      // 2. Register service worker (no-cache so updated SW activates immediately)
      await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });

      // 3. Wait for the active SW — this is what owns pushManager
      const reg = await navigator.serviceWorker.ready;

      // 4. Get VAPID public key from backend
      const { publicKey } = await get("/push/vapid-public-key");

      // 5. Create push subscription
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 6. Save subscription on backend
      const { endpoint, keys } = sub.toJSON();
      await post("/push/subscribe", { endpoint, keys });

      setIsSubscribed(true);
    } catch (err) {
      setError(err.message || "Failed to enable notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager?.getSubscription();
      if (sub) {
        await post("/push/unsubscribe", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      setError(err.message || "Failed to disable notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isSupported:  IS_SUPPORTED,
    isSecure:     IS_SECURE,
    isChecked,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
  };
}
