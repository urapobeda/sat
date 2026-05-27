export type Question = {
  id: string;
  section: "math" | "reading-writing";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
};

export const questions: Question[] = [
  {
    id: "math-001",
    section: "math",
    difficulty: "easy",
    question:
      "A notebook costs $4 and a pen costs $2. If Maya buys 3 notebooks and 5 pens, what is the total cost?",
    choices: ["$16", "$18", "$20", "$22"],
    correctAnswer: "$22",
    explanation:
      "The notebooks cost 3 x 4 = 12 dollars, and the pens cost 5 x 2 = 10 dollars. The total is 22 dollars."
  },
  {
    id: "math-002",
    section: "math",
    difficulty: "easy",
    question: "If 5x - 7 = 18, what is the value of x?",
    choices: ["3", "4", "5", "6"],
    correctAnswer: "5",
    explanation:
      "Add 7 to both sides to get 5x = 25, then divide by 5 to get x = 5."
  },
  {
    id: "math-003",
    section: "math",
    difficulty: "medium",
    question:
      "A line has slope 3 and passes through the point (2, 7). Which equation represents the line?",
    choices: ["y = 3x + 1", "y = 3x - 1", "y = 2x + 3", "y = 7x - 3"],
    correctAnswer: "y = 3x + 1",
    explanation:
      "Use y = 3x + b. Substituting (2, 7) gives 7 = 6 + b, so b = 1."
  },
  {
    id: "math-004",
    section: "math",
    difficulty: "medium",
    question:
      "The expression x^2 + 8x + 15 is equivalent to which of the following?",
    choices: ["(x + 3)(x + 5)", "(x + 1)(x + 15)", "(x - 3)(x - 5)", "(x + 2)(x + 6)"],
    correctAnswer: "(x + 3)(x + 5)",
    explanation:
      "The factors of 15 that add to 8 are 3 and 5, so the expression factors as (x + 3)(x + 5)."
  },
  {
    id: "math-005",
    section: "math",
    difficulty: "hard",
    question:
      "A function is defined by f(x) = 2x^2 - 4x + 1. What is the value of f(3) - f(1)?",
    choices: ["4", "8", "12", "16"],
    correctAnswer: "8",
    explanation:
      "f(3) = 18 - 12 + 1 = 7, and f(1) = 2 - 4 + 1 = -1. The difference is 8."
  },
  {
    id: "rw-001",
    section: "reading-writing",
    difficulty: "easy",
    question:
      "Which choice completes the sentence with the most precise word? The scientist repeated the trial to ____ the unexpected result.",
    choices: ["verify", "decorate", "interrupt", "borrow"],
    correctAnswer: "verify",
    explanation:
      "To verify a result means to confirm that it is accurate, which fits the sentence."
  },
  {
    id: "rw-002",
    section: "reading-writing",
    difficulty: "easy",
    question:
      "Which choice best combines the sentences? The library opened a new study room. The room has quiet desks and charging stations.",
    choices: [
      "The library opened a new study room with quiet desks and charging stations.",
      "The library opened a new study room, but quiet desks and charging stations.",
      "Quiet desks and charging stations, the library opened a new study room.",
      "The room has quiet desks, and the library opened charging stations."
    ],
    correctAnswer:
      "The library opened a new study room with quiet desks and charging stations.",
    explanation:
      "This choice combines the ideas clearly and concisely without changing the meaning."
  },
  {
    id: "rw-003",
    section: "reading-writing",
    difficulty: "medium",
    question:
      "Which transition best completes the sentence? The first design was affordable; ____, it was not durable enough for daily use.",
    choices: ["however", "therefore", "for example", "similarly"],
    correctAnswer: "however",
    explanation:
      "The second clause contrasts with the first, so however is the best transition."
  },
  {
    id: "rw-004",
    section: "reading-writing",
    difficulty: "medium",
    question:
      "Which choice is grammatically correct? Each of the musicians ____ a different part before the concert.",
    choices: ["practice", "practices", "were practicing", "have practiced"],
    correctAnswer: "practices",
    explanation:
      "The subject Each is singular, so it takes the singular verb practices."
  },
  {
    id: "rw-005",
    section: "reading-writing",
    difficulty: "hard",
    question:
      "Which choice gives the sentence the clearest logical order? After collecting survey responses, the team analyzed the data, identified common concerns, and ____.",
    choices: [
      "recommended changes to the schedule",
      "the schedule was printed in the hallway",
      "common concerns were identified by the team",
      "collecting survey responses from students"
    ],
    correctAnswer: "recommended changes to the schedule",
    explanation:
      "The sentence lists actions performed by the team, so the final phrase should be parallel with analyzed and identified."
  }
];
