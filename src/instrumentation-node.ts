import { isMailConfigured, safeMailError } from "./lib/mail";

/** Poll due notification jobs while this server process is running. */
export async function startNotificationDispatcher() {
  if (process.env.VITEST) return;
  if (!isMailConfigured()) return;
  const { dispatchDueNotifications } = await import("./lib/notifications");
  const globalKey = globalThis as { __acapNotifyTimer?: ReturnType<typeof setInterval> };
  if (globalKey.__acapNotifyTimer) return;
  const tick = () => {
    void dispatchDueNotifications().catch((err) => {
      console.error("notification dispatch failed", safeMailError(err));
    });
  };
  tick();
  globalKey.__acapNotifyTimer = setInterval(tick, 5 * 60 * 1000);
}
