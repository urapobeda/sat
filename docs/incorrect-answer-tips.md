# Incorrect choice feedback

Question Bank practice shows a dismissible, nonmodal explanation card after an incorrect
Check. Selecting an option alone still does not submit it. The card has Close, Try again,
Next (Show Results on the final question), keyboard Escape and an accessible heading.
Closing it stays dismissed for that checked attempt; another incorrect Check opens a new card.

The server extracts only the selected choice's explicitly incorrect rationale from the
existing saved explanation. It supports single and grouped choice headings, stops before
another choice's explanation and rejects answer-key references. It does not send the full
solution or correct label on a wrong attempt. Existing homework and live-lesson restrictions
run before grading/hint generation. If there is no suitable separate rationale, the card
states that it is unavailable rather than inventing a reason. Student-produced responses
receive a generic retry message. Incorrect attempts still record no timing.

Eliminated options use a grey background, muted letter/text and a thicker strike-through;
graph choices additionally become grayscale with a visible strike-through overlay.
Restore reverses the styling, and selecting an eliminated option restores it as before.
The shared AnswerOption applies this appearance wherever answer elimination is available.

No database migration, new API key or AI request is required.

Verification: route tests cover correct/wrong timing, isolated incorrect rationale and
blocked homework without hints; `incorrect-answer-tip.test.mjs` checks extraction,
privacy fallbacks, rendered popup actions and eliminated text/graphs. A temporary browser
fixture exercised the real QuestionAnswers/IncorrectAnswerTip components, Close, restore,
Next, and the 360 px layout (no horizontal overflow). The fixture was removed afterward.
Production account tests were not run.

Final checks passed: `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`,
`npm run build`. The build retains four existing CSS optimizer warnings for `::highlight`.

Files: `app/api/practice/answers/route.ts`, `lib/incorrectChoiceExplanation.ts`,
`types/sat.ts`, `components/question-bank/practice/QuestionBankPracticePage.tsx`,
`PracticeExam.tsx`, `IncorrectAnswerTip.tsx`, `components/quiz/AnswerOption.tsx`,
`scripts/practice-answer-route.test.mjs`, `scripts/incorrect-answer-tip.test.mjs`,
`package.json`, this document.
