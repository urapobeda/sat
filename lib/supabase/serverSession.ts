// Access-token mirror for server-rendered staff pages. Refresh tokens remain in
// the existing Supabase browser session; neither role nor identity is trusted here.
let pending: Promise<void> = Promise.resolve();
export function syncServerSession(token: string | null) {
  pending = pending.catch(() => {}).then(async () => {
    const response = await fetch("/api/auth/session", {
      method: token ? "POST" : "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Could not prepare your session. Please try again.");
  });
  return pending;
}
