# Course vocabulary

Teachers manage words at `/teacher/vocabulary`; students search their visible words at `/vocabulary`. Both sidebars include Vocabulary.

## Database setup

In the Supabase SQL Editor, run `supabase/migrations/add_vocabulary.sql`, then the read-only `supabase/verify-vocabulary.sql`. The migration has **not** been applied to production by this implementation.

Prerequisites are the existing migrations, in this order (only apply missing ones):

1. `add_roles.sql`
2. `add_groups.sql`
3. `add_assignments.sql`
4. `add_assignment_feedback.sql`
5. `harden_homework.sql`
6. `add_lessons.sql`
7. `add_vocabulary.sql`

The new migration is transactional and repeatable. It does not modify student attempts, questions, answers, accounts or existing lesson content. For application rollback, revert the vocabulary code and leave the additive database objects in place; dropping the table would delete vocabulary content.

## Access and scope

- A group word is visible to that group's students and managing teacher; an admin can manage all words.
- A common word (`group_id IS NULL`) is shared across the author's groups. It is not public or shared with unrelated teachers. A teacher without groups can prepare common words before adding students.
- Students cannot create, edit or delete words through either the API or direct Supabase requests. The API uses the caller's verified identity and RLS, not service-role bypasses.
- Case-insensitive uniqueness is enforced with partial indexes: `(group_id, lower(word))` for group words and `(created_by, lower(word))` for common words. This also prevents duplicate NULL/common entries.
- The lesson must belong to the selected group, or to the author for common words. Foreign lesson metadata remains subject to lesson RLS.
- Bulk imports accept 1–500 lines: `word — translation — definition`. Existing words are skipped, not overwritten. Invalid imports roll back as a unit.

## Reading & Writing lookup

Select one word in the passage or question prompt. The card shows the matching course definition, translation, part of speech and optional example. An unmatched word shows “Not in the course vocabulary yet.”

Exact entries take priority. Local inflection candidates handle s/es/ed/ing, y changes, doubled consonants and silent e. This is a bounded spelling heuristic, not a full English dictionary; irregular forms require their own entry.

The dictionary is fetched once per page/account and reused across questions. Explicit Retry can make a new request. Selection never queries a third-party dictionary. Optional vocabulary failure does not block the question or answer controls. No vocabulary content is stored in localStorage.

Highlight takes priority: lookup is disabled while Highlight is on. The card closes on Escape, outside interaction, scroll, resize or a question change. It uses native browser selection, including selectionchange events from phone selection handles, without replacing long-press behavior.

## Validation

- `scripts/vocabulary.test.mjs`: single-word selection, inflections, exact-match priority, bulk validation, one-load cache and popup bounds.
- `scripts/vocabulary-api.test.mjs`: actual route handlers with mocked database transport; role checks, forged-author prevention, validation, permission/duplicate errors, batch dispatch and pagination beyond 1,000 words.
- `scripts/vocabulary-sql.test.mjs`: real PostgreSQL execution in isolated PGlite fixtures; two teachers/two students/admin, common/group uniqueness, foreign read/write denial, student write denial, lesson ownership, atomic imports, service-role reads, loss of access after leaving a group and repeat migration preserving words. No production data is used.
- Local browser fixture: desktop selection of `inferred` finds `infer`; missing-word state; answer click still works; Highlight suppresses lookup; Escape, scroll and question change close the card; width 360 px fits the card within content bounds; signed-out `/vocabulary` offers Sign in. The temporary fixture route is removed from the delivered app.
- Physical Android/iOS long-press and production account workflows remain manual verification after migration. They are not reported as executed.

The vocabulary tests are included in `npm run test:unit`; SQL tests also run with `npm run test:vocabulary:sql`.

Final checks on 2026-11-22: `npm run lint`, `npm run test:unit`, `npm run build`, `npx tsc --noEmit` and `git diff --check` completed successfully. Build still reports four pre-existing CSS optimizer warnings for the custom `::highlight` selectors. The final build route list does not contain the temporary QA page.

## Files

New:

- `supabase/migrations/add_vocabulary.sql`
- `supabase/verify-vocabulary.sql`
- `lib/vocabulary.ts`
- `lib/server/vocabularyAccess.ts`
- `app/api/vocabulary/route.ts`
- `app/api/teacher/vocabulary/route.ts`
- `app/api/teacher/vocabulary/[wordId]/route.ts`
- `app/api/teacher/vocabulary/bulk/route.ts`
- `app/vocabulary/page.tsx`
- `app/teacher/vocabulary/page.tsx`
- `components/vocabulary/VocabularyPage.tsx`
- `components/vocabulary/VocabularyProvider.tsx`
- `components/vocabulary/VocabularySelection.tsx`
- `scripts/helpers/vocabularyFixture.mjs`
- `scripts/vocabulary.test.mjs`
- `scripts/vocabulary-api.test.mjs`
- `scripts/vocabulary-sql.test.mjs`
- `docs/vocabulary.md`

Updated:

- `components/dashboard/StudentShell.tsx`
- `components/staff/TeacherShell.tsx`
- `components/homework/HomeworkRunner.tsx`
- `components/question-bank/practice/PracticeExam.tsx`
- `components/quiz/QuestionCard.tsx`
- `types/database.ts`
- `package.json`

Removed: the temporary `app/vocabulary-preview-qa/page.tsx` browser fixture (briefly included in an intermediate commit).
