export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNotificationDispatcher } = await import("./instrumentation-node");
    await startNotificationDispatcher();
  }
}
