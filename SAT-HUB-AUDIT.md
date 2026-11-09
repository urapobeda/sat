# SAT Hub production audit

Baseline was clean commit `7d96dd4` in the local checkout. Production probes used the anonymous Supabase role and requested zero rows. No production migration, student account change, or progress write was performed.

## Evidence and fixes

| Severity | Location | Reproduction and cause | Resolution and evidence |
|---|---|---|---|
| Critical | `supabase/schema.sql:10`, `supabase/schema.sql:154`, `supabase/repair-question-bank-access.sql:78` | A fresh schema or legacy repair granted table-wide reads while solutions could still be in `questions`. The production project currently returns 42703 for both legacy solution columns and denies reads from `question_solutions` (42501). | Public column allowlists and explicit solution revokes. Embedded PostgreSQL test rejects anonymous and authenticated solution reads. |
| High | `supabase/migrations/secure_question_solutions.sql:13`, `supabase/migrations/add_question_bank_import_metadata.sql:11` | Rerunning solution migration referenced columns already dropped. Metadata migration ended with stray SQL and recreated an index unnecessarily. | Conditional copy preserves existing solution rows. Metadata SQL is rerunnable. Ordered migrations executed twice against embedded PostgreSQL with a legacy question fixture. |
| High | `app/api/tests/complete/route.ts:11`, `supabase/migrations/finalize_verified_tests.sql:9` | Send an empty/bad submission, a foreign session, or hit a write failure during grading. The previous handler loaded solutions before checking ownership, returned success after ignored writes, and disclosed review solutions for skipped questions. Browser grants also allowed clients to set scores and answer flags directly on their own rows. | Validate payload and ownership, withhold skipped solutions, reserve grade writes to the server, atomically lock and finalize an owned session. Legacy skipped answer keys remain stored behind column privileges. Embedded PostgreSQL verified foreign-owner denial, rollback, and repeated finalization. |
| High | `app/api/ai-tutor/route.ts:55` | A caller could request the test-review context or supply an answer string without having checked the question. | Private solutions now require an authenticated user's verified saved answer. Anonymous tutoring continues with public question context. Model behavior and distributed rate limiting remain separate risks. |
| High | `supabase/question-bank-filters.sql`, `supabase/study-plans.sql`, `supabase/migrations/add_past_papers.sql` | Hosted anon REST schema reports PGRST205 for question_marks, study_plans, and all six Past Papers tables. Missing from the exposed schema does not prove the underlying relation is absent. | Existing idempotent, RLS-enabled DDL is included in the rollout order below. Marks now persist through the existing review button when the table is available. Verify production catalog/grants first. |
| Medium | `components/question-bank/QuestionBankPage.tsx:103`, `components/question-bank/SectionPracticeSetupPage.tsx:239` | Deny a progress or marks request while catalog succeeds. Progress could hide questions or optional errors could look like zero activity. | Isolated optional requests, local failure state, catalog stays usable. Fault injection in an authenticated browser is still outstanding. |
| Medium | `app/api/practice/sessions/[sessionId]/complete/route.ts:38` | A session exceeding the PostgREST row cap could get a truncated score; a repeat completion overwrote the original timestamp. | Stable ordered pagination and guarded completion. Existing pagination unit tests pass. Concurrent answer-versus-finish hardening remains open. |
| Medium | `lib/supabase/queries.ts:571` | Starting a test fetched rich bodies for the entire bank and used a random sort comparator. | Sample the lightweight catalog, then request only selected bodies in batches of at most 50. |
| Medium | `app/converter/page.tsx:4`, `app/tools/ent-converter/page.tsx:4` | These routes redirected to each other. | Legacy aliases now resolve to the available SAT Score Calculator. No separate ENT converter implementation was present. |
| Medium | `package.json`, `package-lock.json` | Initial npm production audit reported seven vulnerable package entries, including high severity. | Updated affected runtime dependencies. The npm production audit now reports zero known vulnerabilities. Development tooling findings are separate. |

| Medium | `components/auth/AuthPage.tsx:41`, `lib/authRedirect.ts:1` | Opening the OAuth callback directly with an existing saved session could be treated as a fresh OAuth return. Recovery must also distinguish a normal session from a recovery link. | Require callback payload and the expected Auth event, and continue to require PASSWORD_RECOVERY for changing a password. Mock-event unit tests passed. Live Google and email delivery are still unverified. |

## Page and data map

| Routes | Main component | Supabase reads | Writes |
|---|---|---|---|
| `/`, `/dashboard` | DashboardPage, StudentShell | Auth, profiles through shared account chrome | Auth sign-out |
| `/auth` | AuthPage | Supabase Auth, public provider settings | Signup, login, recovery, callback and idempotent profile insert |
| `/question-bank` | QuestionBankPage | questions, practice_answers, test_answers, question_marks | None |
| `/question-bank/math`, `/question-bank/reading-writing` | SectionPracticeSetupPage | questions, practice_answers, test_answers | None |
| `/practice`, `/question-bank/practice` | Redirect, QuestionBankPracticePage and PracticeExam | questions, own prior answers and question_marks; solutions server-side after Check | practice_sessions, practice_answers, question_marks |
| `/tests` | TestsPage | test_sessions | None |
| `/tests/start` | TestStartPage | questions, test_sessions; question_solutions server-side on submit | test_sessions, test_answers |
| `/past-papers`, `/past-papers/[slug]` | PastPapersPage, PastPaperDetailsPage | exam_papers, exam_modules, exam_module_questions, exam_attempts, paper_bookmarks | paper_bookmarks |
| `/past-papers/[slug]/start` | PaperStartRoute | Account chrome only | Paper runner is an explicit placeholder |
| `/progress` | ProgressDashboard | practice_sessions, test_sessions, practice_answers, test_answers, questions | Existing user-initiated history clear |
| `/study-plan` | StudyPlanPage | study_plans, own progress and questions | study_plans |
| `/homework`, `/mistakes`, `/schedule`, `/recordings`, `/materials` | Dashboard feature pages | Auth/profile chrome; page bodies use sample data | No feature persistence |
| `/tools/sat-score-calculator`, legacy aliases | SAT score calculator | Auth/profile chrome; calculation is local | None |

Shared account chrome reads the current user's profile. `exam_attempt_answers` is defined in SQL without an active runner. API routes are practice answers, practice completion, test completion, and AI tutor; only server-side code loads `question_solutions`.

## Database rollout — approval required

1. Run [read-only verification SQL](supabase/verify-production-readiness.sql) and save the output plus the current grants/policies/function definitions. Compare actual columns, unique indexes, foreign keys, defaults, and policy predicates. Check for duplicate `(session_id, question_id)` and `(test_session_id, question_id)` groups using aggregate queries. If duplicates exist, stop and review them individually. No automatic deletion or merging is prescribed.
2. For a **fresh** Supabase database only, install `supabase/schema.sql`. Do not run the base schema as a production reset or upgrade. Use controlled fixtures for staging.
3. On staging, run the required pieces in order: `repair-question-bank-access.sql`, `migrations/secure_question_solutions.sql`, `migrations/add_question_bank_import_metadata.sql`, `migrations/add_practice_answer_time_tracking.sql`, `question-bank-filters.sql`, `study-plans.sql`, `migrations/add_past_papers.sql`, `fix-permissions.sql`, then `migrations/finalize_verified_tests.sql`. Skip already verified additive steps in production. The legacy solution migration drops legacy solution columns after verifying the separate solution records; skip it if the production inventory already shows the columns absent, the solution table protected, and each question has a solution. Do not run seed scripts against production as part of this rollout.
4. Verify the finalizer exists and only service_role can execute it. Verify allowed public question columns, no browser privileges on solution keys, RLS on private tables, and no student writes to verified grades. With two **staging** accounts, test signup and existing profiles, bookmarks, practice, results, and attempts to read or modify the other account. Test authenticated and guest HTTP endpoints separately. Verify the Supabase auth callback/reset allowlist and email delivery; Google is disabled in the current hosted project.
5. Apply reviewed production DDL only after approval. The signed-in test completion API depends on the finalizer. Install and verify DB changes before deploying that application revision.

**Rollback.** A failed transactional migration rolls back its DDL. If a post-deploy issue appears, stop rollout and use the previous app revision where compatible or disable affected submission traffic while fixing forward. Keep new tables, persisted attempts, and restrictive grants in place. Restore only individually reviewed ACL/policy/function definitions from the preflight snapshot, never broad public solution reads or student writes to grade columns. The legacy column move is not reversed by a destructive down migration. Re-run the read-only inventory and compare results.

## Release blockers and incomplete flows

- The hosted project's authenticated grants, policies, service-role configuration, relational constraints, and two-account isolation are **not verified**. MCP is configured but no SQL tool is exposed in this chat. Anonymous REST and the isolated embedded PostgreSQL fixture do not replace authenticated staging.
- Past Papers catalog and bookmarks have code and SQL; paper-specific attempts, autosave, adaptive module transitions, and resume are incomplete. Standard tests keep answers in memory until submission; refresh/cross-device resume remains incomplete. Standard test question membership is not issued or sealed by the server; matching an owned session count alone is not an exam integrity boundary. A shared question can also be checked separately through its legitimate practice flow.
- Homework, schedule, recordings, materials, teacher feedback and dashboard sample cards are not real student records. Mistake Notebook remains a sample view; question-bank analytics use verified history where available. Question Bank does not expose source/Bluebook filter controls. An exam score is an unofficial estimate, not a College Board scaled result.
- Live OAuth and reset redirects, email delivery, cross-device persistence and authenticated browser faults require a dedicated Auth test environment. Public guest APIs still need abuse limits across instances. The tutor's process-local cookie quota is not a distributed enforcement boundary.
- Deployment verdict: **hold real-student rollout** pending approved migration and authenticated staging. Keep unfinished modules visibly scoped as such.

## Verification summary

- Baseline: lint, TypeScript, existing unit tests and production build passed. The build emitted four existing CSS optimizer warnings for the Custom Highlight API and a stale browser data notice.
- Final: lint, TypeScript, unit tests and production build passed. Extra math conversion, inline asset, verbal metadata and FlashSAT preparation suites passed (22 tests). The updated production dependency audit reports 0 entries; the full dependency audit still reports 11 development-tree entries.
- Embedded PostgreSQL: migrations on a fresh base with a legacy fixture, reapplication, two roles with distinct user IDs, idempotent profile creation, saved bookmark visibility, prohibited grade writes, protected solutions, test completion rollback and replay. See `scripts/database-audit.test.mjs`, run with a path to an installed `@electric-sql/pglite/dist/index.js` outside the application dependency tree.
- Mocked test API: verified unauthenticated session denial, ownership lookup, already-completed rejection, scoring, omission of skipped solutions, permission-failure response and guest read-only completion. Auth redirect unit tests model the SDK events; they do not exercise the live provider.
- Desktop browser against the local build and hosted public catalog: Math 1,925 and Reading & Writing 1,838; combined difficulty, completion and skill filters led to the same 98-question practice list; Check displayed a result and Explanation opened. A guest test loaded 40 questions, submitted one response and displayed the result; converter alias reached the score estimator. No hosted student writes were involved. Tablet, mobile, keyboard-only and complete WCAG/contrast verification were not run in this pass.
