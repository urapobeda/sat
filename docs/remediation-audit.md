# SAT Practice Hub Remediation Audit

Date: 2026-07-29

## Baseline Commands

Initial baseline before remediation:

- `npm install`: passed, reported 5 high severity vulnerabilities.
- `npm run lint`: passed.
- `npm run test:unit`: passed.
- `npm run build`: passed.
- `npm audit --omit=dev`: failed with high severity advisories through `next`, nested `postcss`, and `sharp`.

## Existing Working Routes

- `/`
- `/dashboard`
- `/auth`
- `/question-bank`
- `/question-bank/practice`
- `/tests`
- `/tests/start`
- `/progress`
- `/study-plan`
- `/past-papers`
- `/past-papers/[slug]`
- `/past-papers/[slug]/start`
- `/tools/ent-converter`
- `/tools/sat-score-calculator`
- `/converter` redirects to `/tools/ent-converter`
- `/api/ai-tutor`
- `/api/practice/answers`
- `/api/practice/sessions/[sessionId]/complete`
- `/api/tests/complete`

## Database Tables Observed

- `profiles`
- `questions`
- `question_solutions` added by `secure_question_solutions.sql`
- `practice_sessions`
- `practice_answers`
- `test_sessions`
- `test_answers`
- `study_plans`
- `question_marks`
- `exam_papers`
- `exam_modules`
- `exam_module_questions`
- `exam_attempts`
- `exam_attempt_answers`
- `paper_bookmarks`

## RLS And Grants Observed

Baseline schema enabled RLS on user-owned tables and allowed public read access on `questions`.
The critical issue was that `questions` also contained `correct_answer` and `explanation`, so public read access exposed solutions.

The new `question_solutions` table has RLS enabled and no anon/authenticated SELECT grant or public SELECT policy. It is intended for trusted server access only through `SUPABASE_SERVICE_ROLE_KEY`.

## Functionality Actually Working Before Remediation

- Supabase-backed question loading.
- Question Bank filters and progress-derived status.
- Practice flow with immediate feedback.
- Timed test flow with post-test review.
- Supabase Auth page.
- Progress dashboard from Supabase session rows.
- Study Plan page.
- AI Tutor endpoint backed by OpenAI.
- SAT Score Estimator.

## Placeholder Or Incomplete Areas

- `/past-papers/[slug]/start` still delegates to `/tests/start` instead of a full paper-specific runner.
- Full Digital SAT module flow, autosave/resume, and locked module behavior are not fully implemented.
- Mistake Review and Bookmarks are not fully functional working routes.
- Dashboard still has some recommendation logic that is not a full adaptive study engine.
- AI Tutor rate limiting is still session-cookie/in-memory, not durable Supabase-backed RPC.

## Security Findings

Fixed in this pass:

- Public question payload exposed `correct_answer` and `explanation`.
- Client `Question` type included `correctAnswer` and `explanation`.
- Practice and test flows computed correctness in the browser.
- AI Tutor accepted `correctAnswer`, `explanation`, `question`, and `hasSubmitted` from the browser.
- Public `/converter` was a placeholder route.

Partially fixed:

- Practice answer submission is now server-verified and saved via trusted server route.
- Practice session completion is now server-computed from saved verified answers.
- Test completion is now server-verified and returns solutions only after completion.
- AI Tutor now loads trusted question/solution context server-side.

Still remaining:

- AI Tutor durable rate limiting tables/RPC are not yet implemented.
- Unified ExamRunner and Past Papers runner are not complete.
- Full attempt ownership/review routes for every exam attempt type are still needed.
- Existing `practice_answers.correct_answer` and `test_answers.correct_answer` remain for historical review compatibility.

## Accessibility Findings

Baseline:

- Navbar More menu had previous hover stability issues; it is now stateful and clickable.
- Full mobile drawer/focus-trap coverage is still not implemented.
- AI Tutor panel has overlay behavior but not a complete focus trap.
- No automated axe/Playwright accessibility smoke tests are present yet.

## Dependency Findings

Before:

- `next@16.2.6`
- `postcss@8.5.15`
- nested `next/node_modules/postcss@8.4.31`
- `sharp@0.34.x` through Next
- `npm audit --omit=dev` reported high severity advisories.

After:

- `next@16.2.12`
- root `postcss@8.5.25`
- `sharp@0.35.3` override
- residual audit report still flags `next/node_modules/postcss@8.4.31`, which is nested inside Next and not lifted by npm override in this install. This remains documented rather than force-downgrading with `npm audit fix --force`.

## Remediation Implemented

- Added `supabase/migrations/secure_question_solutions.sql`.
- Added server-only Supabase admin client at `lib/supabase/admin.ts`.
- Added `SUPABASE_SERVICE_ROLE_KEY` to `.env.example`.
- Removed solution fields from public app `Question` type.
- Replaced public question query `select("*")` with explicit column selection.
- Added server verified practice answer endpoint.
- Added server computed practice session complete endpoint.
- Added server verified test complete endpoint.
- Hardened AI Tutor request boundary to questionId-based server lookup.
- Added security-boundary unit tests.
- Added GitHub Actions CI.
- Redirected `/converter` to `/tools/ent-converter`.
- Restored SAT Score Estimator route selector and URL params per latest remediation spec.

## Final Verification

Final checks run during remediation:

- `npm run lint`: passed.
- `npm run test:unit`: passed after adding security-boundary tests.
- `npm run build`: passed.
- `npm audit --omit=dev`: still reports residual nested Next/PostCSS advisory; see dependency findings.

## Migration Order

Run these in Supabase SQL Editor after the existing schema and seed migrations:

1. `supabase/migrations/secure_question_solutions.sql`
2. Existing paper migrations/seeds as needed:
   - `supabase/migrations/add_past_papers.sql`
   - `supabase/seed-past-papers.sql`

The secure migration copies existing `questions.correct_answer` and `questions.explanation` into `question_solutions`, verifies coverage, enables RLS, revokes public access, and drops solution columns from `questions`.
