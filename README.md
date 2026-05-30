# SAT Practice Hub

SAT Practice Hub is a Next.js MVP for SAT preparation. It includes practice mode, a timed mini test, local question data, and a progress dashboard saved in the browser with `localStorage`.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- lucide-react icons

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the site locally:

```bash
http://127.0.0.1:3000
```

Build for production:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

## Current Features

- Responsive landing page for SAT preparation
- Local SAT-style question bank in `data/questions.ts`
- Practice mode with section and difficulty filters
- One-question-at-a-time practice flow
- Immediate answer feedback and explanations in practice mode
- Timed 15-minute mini test using shared question data
- Test results review with selected answers, correct answers, and explanations
- Progress history saved to `localStorage`
- Progress dashboard with total sessions, average score, best result, and solved question count
- Clear Progress action for resetting saved history

## Future Ideas

- Add more question categories and larger question banks
- Randomize practice and mini test question order
- Add skipped questions and review flags
- Save per-question history and weak topic analytics
- Add user accounts and cloud sync
- Add full-length SAT test sections
- Add charts for score trends over time
