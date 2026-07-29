# SAT Practice Hub

SAT Practice Hub is a premium EdTech/SaaS-style SAT preparation MVP built with Next.js, React, TypeScript, Tailwind CSS, lucide-react, and Supabase.

The app includes a Supabase-backed question bank, interactive practice sessions, timed mini tests, auth, saved progress, weak-area analytics, and a responsive dashboard UI.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- lucide-react icons
- Supabase Auth, Postgres, and Row Level Security

## Getting Started

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It is required for API routes that
verify answers and load `question_solutions`. Never expose it in client code,
browser logs, or public hosting variables that are prefixed with
`NEXT_PUBLIC_`.

Run the development server:

```bash
npm run dev
```

Open the site locally:

```bash
http://127.0.0.1:3000
```

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.sql`.
5. Run `supabase/migrations/secure_question_solutions.sql`.
6. In Authentication settings, enable Email/Password sign-in.
7. Use only the public anon key in frontend variables. Keep the service role key
   server-only.

If the schema was already created before the grants were added, run
`supabase/fix-permissions.sql` once. This fixes errors like
`permission denied for table questions` for the public question bank.

If your Supabase project was created before the Question Bank review/source
filters were added, also run `supabase/question-bank-filters.sql` once. It adds
`questions.is_bluebook` and the `question_marks` table.

For the Past Papers library, run:

```sql
supabase/migrations/add_past_papers.sql
supabase/seed-past-papers.sql
```

The seed file creates only demo papers from existing original question-bank
questions. It does not add protected or official SAT questions.

Important: after `secure_question_solutions.sql`, public `questions` rows no
longer contain `correct_answer` or `explanation`. Solutions live in
`question_solutions` and are read only by trusted server routes.

## Database Tables

- `profiles`
- `questions`
- `question_solutions`
- `question_marks`
- `practice_sessions`
- `practice_answers`
- `test_sessions`
- `test_answers`
- `study_plans`
- `exam_papers`
- `exam_modules`
- `exam_module_questions`
- `exam_attempts`
- `exam_attempt_answers`
- `paper_bookmarks`

RLS is enabled on all tables. Public questions are readable by anonymous and
authenticated users, but solutions are not publicly selectable. Profiles,
sessions, attempts, marks, and answers are owner-only through `auth.uid()`.

## Adding Questions

Questions are stored in the Supabase `questions` table, with answers stored in
`question_solutions`. Each question needs:

- `section`: `math` or `reading-writing`
- `topic`: use a SAT skill/subskill, for example `Linear Equations in One Variable`, `Transitions`, or `Words in Context`
- `difficulty`: `easy`, `medium`, or `hard`
- `question`
- `choices`: an array of `{ "label": "A", "text": "..." }`
- `correct_answer`: stored in `question_solutions`
- `explanation`: stored in `question_solutions`
- `is_bluebook`: optional boolean, defaults to `false`

Supported Question Bank topics:

- Reading & Writing: `Words in Context`, `Text Structure and Purpose`, `Cross-Text Connections`, `Central Ideas and Details`, `Inferences`, `Command of Evidence`, `Rhetorical Synthesis`, `Transitions`, `Boundaries`, `Form, Structure, and Sense`
- Math: `Linear Equations in One Variable`, `Linear Functions`, `Linear Equations in Two Variables`, `Systems of Two Linear Equations in Two Variables`, `Linear Inequalities in One or Two Variables`, `Equivalent Expressions`, `Nonlinear Equations in One Variable`, `Systems of Equations in Two Variables`, `Nonlinear Functions`, `Ratios, Rates, Proportional Relationships, and Units`, `Percentages`, `One-Variable Data: Distributions and Measures of Center and Spread`, `Two-Variable Data: Models and Scatterplots`, `Probability and Conditional Probability`, `Inference from Sample Statistics and Margin of Error`, `Evaluating Statistical Claims: Observational Studies and Experiments`, `Area and Volume`, `Lines, Angles, and Triangles`, `Right Triangles and Trigonometry`, `Circles`

Use [data/questions-import.example.json](data/questions-import.example.json) as a template.
Create a local file named `data/questions-import.json`, paste your questions there,
then generate SQL:

```bash
npm run questions:sql
```

This creates `supabase/generated-questions.sql`. If you have already run
`secure_question_solutions.sql`, make sure new imports insert public question
fields into `questions` and solution fields into `question_solutions`.

## Current Features

- Responsive landing page for SAT preparation
- Unified dashboard at `/dashboard`
- Question Bank powered by Supabase questions
- Search across topics/questions
- Difficulty, answered-incorrectly, marked-for-review, and Bluebook filters
- Past Papers library and paper details backed by Supabase paper records
- Development-safe More menu for future product modules
- Practice flow from `/question-bank/practice`
- Server-verified feedback and explanations in practice mode
- Timed 15-minute mini test from `/tests/start`
- Server-verified test results review with selected answers, correct answers, and explanations after completion
- Supabase Auth page at `/auth`
- Progress dashboard from Supabase session history
- Weak-area analytics from missed practice/test answers
- Clear Progress action for authenticated users
- Guest mode with clear sign-in notes

## Working Routes

- `/`
- `/dashboard`
- `/auth`
- `/question-bank`
- `/question-bank/practice`
- `/past-papers`
- `/past-papers/[slug]`
- `/past-papers/[slug]/start`
- `/tests`
- `/tests/start`
- `/progress`
- `/converter` redirects to `/tools/ent-converter`
- `/tools/ent-converter`
- `/tools/sat-score-calculator`

## Security Model

- The browser receives only public question fields: `id`, `section`, `topic`,
  `difficulty`, `question`, `choices`, `is_bluebook`, and metadata.
- The browser must not receive `correct_answer`, `explanation`, or solution
  steps before an answer is submitted or a test is completed.
- Practice answer verification runs through `/api/practice/answers`.
- Practice session completion runs through
  `/api/practice/sessions/[sessionId]/complete`.
- Test completion runs through `/api/tests/complete`.
- AI Tutor requests send `questionId`, not trusted question/solution text.
- AI Tutor loads solution context server-side only after a submitted answer or
  review context.

## Testing

Run unit and security-boundary tests:

```bash
npm run test:unit
```

Run a dependency audit:

```bash
npm audit --omit=dev
```

## Checks

Run lint:

```bash
npm run lint
```

Build for production:

```bash
npm run build
```

## Future Ideas

- Add full-length SAT sections with separate timing
- Add review flags and skipped-question review
- Add adaptive recommendations by weak topic
- Add per-question attempt history
- Add server-side Supabase reads for faster initial dashboards
- Add account settings and profile preferences
