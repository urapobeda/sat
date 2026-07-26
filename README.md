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
```

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
5. In Authentication settings, enable Email/Password sign-in.
6. Use only the public anon key in `.env.local`. Do not put a service role key in the frontend.

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

## Database Tables

- `profiles`
- `questions`
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

RLS is enabled on all tables. Questions are readable by anonymous and authenticated users, while profiles, sessions, and answers are owner-only through `auth.uid()`.

## Adding Questions

Questions are stored in the Supabase `questions` table. Each question needs:

- `section`: `math` or `reading-writing`
- `topic`: use a SAT skill/subskill, for example `Linear Equations in One Variable`, `Transitions`, or `Words in Context`
- `difficulty`: `easy`, `medium`, or `hard`
- `question`
- `choices`: an array of `{ "label": "A", "text": "..." }`
- `correct_answer`
- `explanation`
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

This creates `supabase/generated-questions.sql`. Run that SQL in the Supabase SQL
Editor to save the questions in the database. The import updates existing rows
when the same `question` text already exists.

## Current Features

- Responsive landing page for SAT preparation
- Unified dashboard at `/dashboard`
- Question Bank powered by Supabase questions
- Search across topics/questions
- Difficulty, answered-incorrectly, marked-for-review, and Bluebook filters
- Past Papers library and paper details backed by Supabase paper records
- Development-safe More menu for future product modules
- Practice flow from `/question-bank/practice`
- Immediate feedback and explanations in practice mode
- Timed 15-minute mini test from `/tests/start`
- Test results review with selected answers, correct answers, and explanations
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
- `/converter`
- `/tools/ent-converter`
- `/tools/sat-score-calculator`

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
