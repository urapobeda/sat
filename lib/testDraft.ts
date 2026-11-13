import { z } from "zod";

const draftSchema = z.object({
  questions: z.array(z.uuid()).min(1).max(40),
  sessionId: z.uuid().nullable(),
  endsAt: z.number().positive(),
  answers: z.record(z.uuid(), z.string().max(500)),
  flags: z.record(z.uuid(), z.boolean()),
  index: z.number().int().min(0).max(39)
});
type TestDraft = z.infer<typeof draftSchema>;
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createTestDraftStore(getStorage: () => DraftStorage) {
  const activeKey = (userId?: string) => `sat-hub-test-active-v2:${userId ?? "guest"}`;
  const draftKey = (userId: string | undefined, id: string) => `sat-hub-test-draft-v2:${userId ?? "guest"}:${id}`;
  return {
    read(userId?: string): { id: string; draft: TestDraft } | null {
      try {
        const storage = getStorage();
        const id = storage.getItem(activeKey(userId));
        if (!id || !z.uuid().safeParse(id).success) return null;
        const parsed = draftSchema.safeParse(JSON.parse(storage.getItem(draftKey(userId, id)) ?? "null"));
        if (!parsed.success || (parsed.data.sessionId !== null && parsed.data.sessionId !== id)) return null;
        if (parsed.data.index >= parsed.data.questions.length) return null;
        return { id, draft: parsed.data };
      } catch {
        return null;
      }
    },
    save(userId: string | undefined, id: string, draft: TestDraft) {
      try {
        const storage = getStorage();
        // Write the complete draft before publishing its active-session pointer.
        storage.setItem(draftKey(userId, id), JSON.stringify(draft));
        storage.setItem(activeKey(userId), id);
      } catch {
        // The test remains usable if storage is blocked or full.
      }
    },
    clear(userId: string | undefined, id: string) {
      try {
        const storage = getStorage();
        storage.removeItem(draftKey(userId, id));
        // A second tab may already have started a different test.
        if (storage.getItem(activeKey(userId)) === id) storage.removeItem(activeKey(userId));
      } catch {
        // Storage can be unavailable.
      }
    }
  };
}
