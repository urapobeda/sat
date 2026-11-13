import { getSupabaseAuthHeaders } from "@/lib/supabase/authHeaders";
export async function groupRequest<T>(path: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method, signal, cache: "no-store",
    headers: { ...await getSupabaseAuthHeaders(), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Не удалось выполнить действие.");
  return payload as T;
}
