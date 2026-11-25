# Course materials and Hard questions

## Supabase deployment

No production migration was executed by this change. Existing core roles, groups, homework,
lesson, vocabulary and live-lesson migrations must already be installed. In particular,
`add_lessons.sql`, `add_vocabulary.sql` and `add_live_lessons.sql` are prerequisites.

1. Run `supabase/migrations/add_course_materials.sql` in the SQL editor.
2. Run `supabase/verify-course-materials.sql` (read-only).
3. Verify with real accounts: publish a text for group A, check it as its student,
   check it is absent for group B; verify drafts are private. Save/remove Hard,
   refresh and sign in again. Do not use service-role credentials for these tests.

The migration is transactional and repeatable. It adds materials, personal flags and a
private mistake ledger; it neither deletes questions nor changes saved results. On SQL
failure, its transaction rolls back. For application rollback, revert the application
change and keep the additive tables/data. Do not drop tables containing student flags.
If the new capture triggers must be disabled during rollback, drop only the trigger named
`capture_question_mistake` from practice_answers, test_answers, assignment_answers and
live_answers; preserve the ledger and other grading triggers.

## Behavior

- `/teacher/materials`: create/edit/delete text, note and HTTP/HTTPS link; Markdown and
  KaTeX preview, group/lesson, section, position and publication controls.
- Common materials belong to the author's groups, consistent with the existing vocabulary
  scope. They are not public to unrelated students. Students see published content only.
  Teachers manage their groups; admins can manage all materials. Author is immutable.
- Course navigation: plan, homework, vocabulary, texts, hard questions, practice tests and
  useful. It scrolls horizontally on mobile. Existing `/materials` resources remain.
- Text/note reader: persisted browser-session highlighter and existing course vocabulary
  selection. The vocabulary loads once per page. Highlighter mode disables word cards.
- Hard is available on practice and homework questions, including submitted review. Guests
  must sign in. Manual flags persist per student. Automatic entries require wrong answers
  in at least two distinct saved attempts; repeated network saves in one attempt count once.
  Removing a manual flag does not remove an automatic entry with two mistakes.
- Existing wrong rows are backfilled once. Wrong attempts overwritten before deployment
  cannot be recovered. From deployment, the private ledger retains them after corrections.
- Unfinished tests, unreleased homework reviews and live questions before Reveal are excluded
  from automatic counts. This prevents Hard from becoming a hidden correctness oracle.
- Practice all honors section/search; selected practice allows up to 100 questions.
  The runner intersects IDs with the signed-in user's hard collection, then uses the existing
  question loader, check, timing and result persistence. It does not mark skipped work complete.
- List APIs return metadata only and paginate beyond Supabase's 1,000-row limit. The full
  material body loads on demand. New feature errors show Retry without blocking questions.

## Rendering and security

Markdown uses react-markdown, remark-gfm, remark-math and rehype-katex (see the
[primary documentation](https://github.com/remarkjs/remark-math)). Use `$...$` / `$$...$$`.
Raw HTML is disabled, KaTeX trust is false, URL schemes/credentials are checked, and external
links use noopener/noreferrer. Images load only from permitted HTTP(S)/same-origin URLs.
The dependency override reuses the project's patched KaTeX; npm install reported zero
dependency vulnerabilities after installation.

All APIs verify identity and use the user's Supabase context, allowing RLS to enforce
ownership. No new browser service-role access. The private ledger is unavailable to
authenticated/anon; its own-user RPC exposes counts only after visibility rules permit them.

## Verification

`scripts/course-materials.test.mjs`: actual Markdown/KaTeX SSR, HTML/URL safety,
Hard filters/ID limits and request deduplication.

`scripts/course-materials-api.test.mjs`: actual route handlers with mocked I/O for
role checks, validation, immutable owner, publication, 1,001-row pagination and flag identity.

`scripts/course-materials-sql.test.mjs`: actual migration in isolated PostgreSQL (PGlite),
applied repeatedly; draft/published RLS, cross-group isolation, private flags, safe links,
wrong-attempt persistence/deduplication and test/homework/live release gates.

These are local checks, not evidence that production SQL has been installed. Browser CRUD
against real teacher/student accounts remains a deployment check.

Browser checks used a temporary local fixture with the real Markdown, KaTeX, highlighter,
vocabulary selection and course navigation components. At 360 px, tabs scroll horizontally
and the page has no horizontal overflow; vocabulary opens for a selected word, and does
not open in highlighter mode. At 1280 px, formulas, the table and text render without
horizontal page overflow. The temporary fixture was removed after verification.

Final local checks: `npm run lint`, `npm run test:unit`, `npx tsc --noEmit` and `npm run build` passed.
The build reports four existing CSS optimizer warnings about `::highlight`; the actual
browser highlight rendering was verified. A first build encountered a stale development
type reference to the removed QA page; regenerating the development cache resolved it.

## Changed files

- New route pages: `app/teacher/materials/page.tsx`, `app/course/texts/page.tsx`,
  `app/course/texts/[materialId]/page.tsx`, `app/course/useful/page.tsx`,
  `app/course/hard-questions/page.tsx`, `app/course/practice-tests/page.tsx`.
- New APIs: `app/api/materials/route.ts`, `app/api/materials/[materialId]/route.ts`,
  `app/api/teacher/materials/route.ts`, `app/api/teacher/materials/[materialId]/route.ts`,
  `app/api/hard-questions/route.ts`.
- New components: `components/course/CourseTabs.tsx`, `components/materials/MaterialMarkdown.tsx`,
  `TeacherMaterialsPage.tsx`, `StudentMaterials.tsx`, `useCourseMaterials.ts`;
  `components/hard-questions/HardQuestionsProvider.tsx`, `HardQuestionButton.tsx`, `HardQuestionsPage.tsx`.
- New helpers: `lib/courseMaterials.ts`, `lib/hardQuestions.ts`, `lib/pageRequest.ts`,
  `lib/server/materialAccess.ts`.
- Integration: `components/auth/AuthPage.tsx`, `components/dashboard/MaterialsPage.tsx`,
  `components/homework/HomeworkReview.tsx`, `HomeworkRunner.tsx`, `StudentHomeworkPage.tsx`,
  `components/lessons/LessonViews.tsx`, `components/vocabulary/VocabularyPage.tsx`,
  `components/question-bank/practice/PracticeExam.tsx`, `QuestionBankPracticePage.tsx`,
  `components/quiz/QuestionCard.tsx`, `lib/groups.ts`, `types/database.ts`.
- Dependencies/tests: `package.json`, `package-lock.json`, `scripts/groups.test.ts`,
  `scripts/homework-review.test.mjs`, the three new course-material test scripts.
- SQL/docs: the migration, verification SQL and this document.
