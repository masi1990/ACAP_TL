import { isMailConfigured, mailConfig, mailOutboxDir, safeMailError } from "./lib/mail";

/** Poll due notification jobs while this server process is running. */
export async function startNotificationDispatcher() {
  if (process.env.VITEST) return;
  if (!isMailConfigured()) {
    console.warn(
      "Email notifications are paused: set SMTP_USER + SMTP_PASS (Google Workspace app password), or MAIL_OUTBOX=1.",
    );
    return;
  }
  if (mailConfig()) {
    console.info(`Email notifications: SMTP ${mailConfig()!.host} as ${mailConfig()!.from}`);
  } else {
    console.info(`Email notifications: writing to outbox ${mailOutboxDir()}`);
  }
  const { dispatchDueNotifications } = await import("./lib/notifications");
  const globalKey = globalThis as { __acapNotifyTimer?: ReturnType<typeof setInterval> };
  if (globalKey.__acapNotifyTimer) return;
  const tick = () => {
    void dispatchDueNotifications().catch((err) => {
      console.error("notification dispatch failed", safeMailError(err));
    });
  };
  // Defer the first poll so boot is not blocked on a slow/down database.
  setTimeout(tick, 5_000);
  globalKey.__acapNotifyTimer = setInterval(tick, 5 * 60 * 1000);
}
