# SAT Practice Hub Platform Audit

## Working Today

- Home landing/dashboard at `/` with SAT countdown, study plan preview, sections, and progress widgets.
- Supabase browser client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Authentication at `/auth`, profile creation through Supabase trigger, and navbar auth state.
- Question Bank at `/question-bank`, backed by Supabase `questions`, with search, difficulty, answer-history, marked-for-review, and Bluebook filters.
- Practice flow at `/question-bank/practice`, with one-question-at-a-time mode, Supabase practice sessions/answers, explanations, results, and AI Tutor.
- Tests dashboard at `/tests` and test runner at `/tests/start`, using Supabase questions and saving test sessions/answers.
- Progress dashboard at `/progress`, using Supabase practice/test history.
- Study Plan at `/study-plan`, backed by `study_plans`.
- AI Tutor API at `/api/ai-tutor`, using server-only OpenAI credentials.
- Countdown date logic in `lib/satDates.ts`.

## Partially Working

- `/` mixes guest landing content and signed-in dashboard widgets. A dedicated `/dashboard` route is needed for the all-in-one platform IA.
- `/converter` exists but is still a coming-soon style tool.
- Tests use a single randomized runner. Past Papers need to reuse the same quiz UI instead of creating a separate incompatible engine.
- Question marks exist at the database/query layer, but full bookmark/review workflows are not yet complete.
- Some home cards still use preview states when no Supabase user data exists. Those should remain empty/preview-safe rather than pretending to be real scores.

## Missing Before This Phase

- Past Papers library and details pages.
- Past paper tables, attempts, modules, module questions, and paper bookmarks.
- Dedicated platform roadmap documentation.
- Unified navbar with Dashboard and More menu.
- `/dashboard` route.
- Adaptive routing utility for future adaptive paper routing.
- Unit-style checks for adaptive routing.

## Route Conflicts And Legacy Routes

- `/practice` is a legacy route. The active practice flow is `/question-bank/practice`.
- `/converter` is legacy but must remain working. New IA should expose converter under More as ENT Converter.
- `/` remains usable for guests and shares dashboard content. `/dashboard` becomes the primary app entry.
- AI Tutor should not be a top-level navbar item; it belongs inside question/review contexts.

## Existing Supabase Tables

- `profiles`
- `questions`
- `question_marks`
- `practice_sessions`
- `practice_answers`
- `test_sessions`
- `test_answers`
- `study_plans`

## Risks Found

- Turbopack development mode previously panicked on `/question-bank`; `npm run dev` now uses webpack.
- Past/future routes can easily become fake if they are exposed before implementation. More menu should show unfinished products only with a development-only Coming Soon badge.
- Content provenance matters: papers must store source metadata and must not be published when the source is unknown.
