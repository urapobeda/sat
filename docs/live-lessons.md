# Live classwork

Teachers open a saved lesson and choose **Open live practice**, then **Start live practice**. This uses the lesson's saved **Classwork questions**, not Homework or text blocks. A group needs at least one student and every selected question needs an answer key.

The teacher screen `/teacher/lessons/[lessonId]/live` shows the question and Group answers table, answered count, Copy link, Reveal answer, Next question and Finish. Students open `/live/[code]` with their existing group account, or use the live banner on `/course`. Knowing a code does not grant membership.

The email/password and Google callback flows preserve the exact live return path. The redirect allowlist accepts only valid join/live codes, not external URLs, arbitrary routes or appended query strings.

## SQL execution order

After the existing `add_lessons.sql` prerequisites are installed:

1. Apply `supabase/migrations/add_live_lessons.sql` in Supabase SQL Editor.
2. Run the read-only `supabase/verify-live-lessons.sql`.
3. Test the two-account workflow below before a real lesson.

**Production SQL was not executed during implementation.** The migration is transactional and repeatable; it does not delete or replace existing student results, vocabulary, lessons or questions. It also includes `live_sessions` and `live_answers` in `supabase_realtime`. The private roster is not published.

Rollback: stop active sessions through the teacher UI if needed, revert the application changes and leave the new tables in place to preserve results. Do not drop the tables or reset the database. Before the migration, ordinary Question Bank/AI requests tolerate the specifically missing live restriction RPC; other restriction errors fail closed. Apply the migration as a whole, not selected fragments.

## Data and security

- One active session per lesson; starting again resumes it. A finished session remains available and a new one can be started.
- The ordered question IDs and named roster are snapshotted at start. Editing Classwork later does not alter an existing session. Students added afterwards join the next session; removal from the group immediately prevents further access/submission.
- `live_sessions` contains control state, question IDs and revealed positions, never answer keys. Its SELECT policy allows managing staff and enrolled roster members only.
- `live_answers` and `live_session_roster` have staff-only SELECT policies. Even a student's own raw answer row is unreadable through PostgREST or a Realtime subscription.
- The student snapshot returns only their own selected answer. `is_correct` is null before Reveal and becomes their boolean verdict after Reveal; correct answer strings and explanations are never included. A finished session shows their total score.
- Answer identity comes from verified Supabase authentication. The route grades on the server using the existing multiple-choice/numeric/fraction grader. Only `service_role` can call the final write RPC; authenticated users cannot submit forged verdicts directly.
- The final write RPC locks the session and rechecks current membership, active status, current question and reveal status. A stale answer arriving after Next/Reveal/Finish is rejected. The first answer wins; retries cannot overwrite it.
- Teacher controls validate ownership in SQL and require the current position, preventing a stale double Next from skipping two questions. Reveal and Finish are idempotent.
- Question Bank Check and AI Tutor do not reveal keys for questions in the authenticated student's active live session. The ordinary guest Question Bank remains as before; this feature is classroom practice, not a proctored exam boundary against separate guest accounts.
- Finished Group answers reports appear directly on the teacher's lesson page; a selector retains previous sessions.

## Realtime and recovery

Subscriptions use Supabase [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). Students subscribe to their session row only; staff also subscribe to that session's answer inserts. Subscription/reconnection triggers a fresh authorized snapshot. Overlapping refreshes coalesce, old/unmounted reads are ignored and channels are removed on exit.

While active and visible, an 8-second snapshot fallback handles socket loss. The course banner checks every 15 seconds in addition to session events. Online/visibility changes recover the latest screen. Failed optional refreshes show Retry while keeping the last loaded question. Reads and mutations have bounded client timeouts. Keys remain server-only regardless of transport.

## Executed checks and limits

- `scripts/live-lessons-sql.test.mjs`: isolated PGlite PostgreSQL execution with two teachers, two students and admin; role/RLS isolation, private raw rows, current-question/reveal/finish guards, first-answer preservation, stale controls, lesson/roster snapshots, repeat migration and publication membership.
- `scripts/live-lessons-api.test.mjs`: actual route handlers with mocked I/O; role checks, identity/verdict spoof prevention, no student keys, current/closed questions, API errors, controls and pagination.
- `scripts/live-restrictions.test.mjs`: active-question restriction, pre-migration compatibility and fail-closed errors. Existing practice and tutor route tests include live restrictions.
- `scripts/live-realtime.test.mjs`: real subscription hook with mocked React/transport; private channel selection, one request at a time, queued refreshes, subscription/reconnection recovery, fallback polling, preserved last data and cleanup.
- Browser presentation fixture: explicit submit, correct and incorrect verdicts only after Reveal, new-question selection reset, teacher matrix and mobile width 360 px without page overflow. The fixture is removed from the delivered app and does not write production data.
- A first build worker terminated with Windows exit code 3221226505 after compilation/type checking. A separate retry completed successfully without a code/configuration workaround.

**Not executed:** live WebSocket delivery between real production teacher/student accounts, production migration execution or physical Android/iOS interaction. SQL publication membership and mocked hook recovery are not represented as an end-to-end network test.

Final verification on 2026-11-22: `npm run lint`, `npm run test:unit`, `npx tsc --noEmit` and `npm run build` completed successfully. Build retains the four pre-existing CSS optimizer warnings for `::highlight`. The temporary browser fixture and its generated route type were removed; it is absent from the final build.

Manual acceptance after migration:

1. Start Classwork containing two questions from Teacher A's lesson. Open its code as A's student on another device/browser.
2. Submit an answer. Teacher sees letter + verdict immediately; student sees only “Answer saved”. Inspect student network responses and direct `live_answers` SELECT: no key or raw verdict before Reveal.
3. Reveal, then Next. The student sees their verdict and then only the next question with no answer selected. Try submitting the old question directly: rejected.
4. Disable and restore the network. Verify the current position is recovered and no duplicate answer appears.
5. Finish, refresh both pages, and check the lesson's saved report. Start a new session and verify the old report remains selectable.
6. Try the code as another group's student and teacher: denied. Verify Question Bank Check and AI Tutor do not expose the active lesson's key to the enrolled student.

## Files

New: `supabase/migrations/add_live_lessons.sql`, `supabase/verify-live-lessons.sql`, `lib/liveLessons.ts`, `lib/server/liveAccess.ts`, `lib/server/liveRestrictions.ts`, `components/live/LivePractice.tsx`, `components/live/LiveLessonLinks.tsx`, `components/live/useLiveSnapshot.ts`, `app/live/[code]/page.tsx`, `app/teacher/lessons/[lessonId]/live/page.tsx`, `app/api/live/route.ts`, `app/api/live/[code]/route.ts`, `app/api/teacher/live/[code]/route.ts`, `app/api/teacher/lessons/[lessonId]/live/route.ts`, the four `scripts/live-*.test.mjs` tests above, and this document.

Updated: `types/database.ts`, `package.json`, `components/lessons/LessonEditor.tsx`, `components/lessons/LessonViews.tsx`, `app/api/practice/answers/route.ts`, `app/api/ai-tutor/route.ts`, `scripts/practice-answer-route.test.mjs`, `scripts/ai-tutor-route.test.mjs`, `components/auth/AuthPage.tsx`, `lib/groups.ts`, `scripts/groups.test.ts`.
