# Submitted homework review

The submitted result screen now renders one question at a time. This is a presentation change for Homework only; the shared test/paper review component is unchanged.

- Multiple-choice options show **Your answer** and **Correct answer** badges. If both are the same option, both badges appear on that option. Graph choices and standalone stem figures are retained.
- An incorrect answer shows **Incorrect. Correct answer: B.**, followed by the existing explanation. Skipped questions are identified as not answered and included in mistakes. Numeric/fraction answers show the submitted and accepted values separately.
- Correctness comes from the server's `isCorrect`; the browser does not regrade fractions or compare numeric answers as strings.
- Question comments appear beside answer choices on desktop and immediately below them on mobile, before the explanation. Whole-submission and legacy/orphan comments remain visible once above the review. Teacher-authored comment text is not changed.
- **Only mistakes** filters both navigation and questions while retaining original question numbers. Previous/Next follow the filtered sequence. Number buttons include accessible status labels and a current-step marker. Touch targets are at least 44 px in each dimension.
- **Retake** appears only when the existing server `canRetake` flag permits it, and invokes the existing runner handler. Feedback loading, writes, attempt limits, release rules and retake behavior have not been rewritten.

## Hidden answers

The server already checks `canRevealAnswers` and `assignment_answers_released` before loading review keys. The UI additionally requires an allowed release rule and a non-null released review.

When review is hidden (`showAnswers=false` in the review component, including the existing `show_answers='never'` assignment rule), the presentation model drops review data entirely. Students can inspect their own answers and existing teacher comments, but correct-answer badges, per-question correctness colors/verdicts, mistake filtering and explanations are absent. The original release/deadline notice and aggregate score remain. No new requests for answer keys are made by question navigation.

## Checks

- `scripts/homework-review.test.mjs`: the real React review components rendered with a vocabulary selection boundary stub; original numbering, filters, skipped/missing results, numeric server verdicts, single-question rendering, graph choices, adjacent comments, hidden-data markup and retake visibility.
- `scripts/homework-review-visibility.test.mjs`: the existing server snapshot loader with database I/O mocked; hidden keys are never loaded/serialized, deadlines and release checks fail closed, own-submission filtering remains, optional comment failures retain released review, and the existing extra-attempt allowance is preserved.
- Both scripts are included in `npm run test:unit`.
- Browser fixture: Only mistakes shows original numbers 2 and 4; Previous/Next and Enter navigation work; skipped answers and no-mistakes states work; hidden mode omits review keys, explanations, mistake status and disallowed Retake; graph images fit at 360 px with no page overflow. Navigation targets measured 49×44 px at that width.
- The browser fixture is removed before delivery. No production account/result was modified. Physical phone and authenticated production homework workflows were not exercised; browser checks use local fixture data, and server checks use mocked I/O.

Final checks on 2026-11-22: `npm run lint`, `npm run test:unit`, `npx tsc --noEmit`, `npm run build` and `git diff --check` passed. Build retains the four pre-existing CSS optimizer warnings for `::highlight`. The temporary fixture route and its generated route type are absent from the delivered app.

## Database and files

No new SQL migration is needed. Existing feedback and retake tables/RLS/functions are unchanged.

New: `components/homework/HomeworkReview.tsx`, `lib/homeworkReview.ts`, `scripts/homework-review.test.mjs`, `scripts/homework-review-visibility.test.mjs`, `docs/homework-review.md`.

Updated: `components/homework/HomeworkRunner.tsx`, `package.json`.
