export type Question = {
  id: string;
  section: "math" | "reading-writing";
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
};

export const questions: Question[] = [
  {
    id: "math-algebra-001",
    section: "math",
    topic: "Algebra",
    difficulty: "easy",
    question: "If 3x + 5 = 20, what is the value of x?",
    choices: ["4", "5", "6", "7"],
    correctAnswer: "5",
    explanation: "Subtract 5 from both sides to get 3x = 15. Divide by 3 to get x = 5."
  },
  {
    id: "math-algebra-002",
    section: "math",
    topic: "Algebra",
    difficulty: "easy",
    question: "A number n is doubled and then increased by 9. The result is 31. What is n?",
    choices: ["10", "11", "12", "13"],
    correctAnswer: "11",
    explanation: "The equation is 2n + 9 = 31. Subtract 9 to get 2n = 22, so n = 11."
  },
  {
    id: "math-algebra-003",
    section: "math",
    topic: "Algebra",
    difficulty: "medium",
    question: "If 4(x - 2) = 2x + 10, what is the value of x?",
    choices: ["6", "7", "8", "9"],
    correctAnswer: "9",
    explanation: "Expand to get 4x - 8 = 2x + 10. Then 2x = 18, so x = 9? Wait: 4x - 8 = 2x + 10 gives 2x = 18, so x = 9."
  },
  {
    id: "math-algebra-004",
    section: "math",
    topic: "Algebra",
    difficulty: "medium",
    question: "The line y = 2x + b passes through (3, 11). What is b?",
    choices: ["3", "4", "5", "6"],
    correctAnswer: "5",
    explanation: "Substitute x = 3 and y = 11: 11 = 2(3) + b, so b = 5."
  },
  {
    id: "math-algebra-005",
    section: "math",
    topic: "Algebra",
    difficulty: "hard",
    question: "If the system x + y = 14 and 2x - y = 7 is solved, what is the value of x?",
    choices: ["5", "6", "7", "8"],
    correctAnswer: "7",
    explanation: "Add the equations to get 3x = 21. Therefore x = 7."
  },
  {
    id: "math-advanced-001",
    section: "math",
    topic: "Advanced Math",
    difficulty: "easy",
    question: "Which expression is equivalent to x^2 + 7x + 12?",
    choices: ["(x + 3)(x + 4)", "(x + 2)(x + 6)", "(x - 3)(x - 4)", "(x + 1)(x + 12)"],
    correctAnswer: "(x + 3)(x + 4)",
    explanation: "The factors of 12 that add to 7 are 3 and 4."
  },
  {
    id: "math-advanced-002",
    section: "math",
    topic: "Advanced Math",
    difficulty: "medium",
    question: "For f(x) = x^2 - 2x, what is f(5)?",
    choices: ["10", "15", "20", "25"],
    correctAnswer: "15",
    explanation: "f(5) = 5^2 - 2(5) = 25 - 10 = 15."
  },
  {
    id: "math-advanced-003",
    section: "math",
    topic: "Advanced Math",
    difficulty: "medium",
    question: "If (x + 2)^2 = 49 and x is positive, what is x?",
    choices: ["5", "7", "9", "11"],
    correctAnswer: "5",
    explanation: "Since x + 2 = 7 for the positive solution, x = 5."
  },
  {
    id: "math-advanced-004",
    section: "math",
    topic: "Advanced Math",
    difficulty: "hard",
    question: "The function g is defined by g(x) = 3x^2 + k. If g(2) = 17, what is k?",
    choices: ["3", "5", "7", "9"],
    correctAnswer: "5",
    explanation: "g(2) = 3(4) + k = 12 + k. Since 12 + k = 17, k = 5."
  },
  {
    id: "math-advanced-005",
    section: "math",
    topic: "Advanced Math",
    difficulty: "hard",
    question: "Which value of x satisfies x^2 - 6x + 8 = 0?",
    choices: ["1", "2", "6", "8"],
    correctAnswer: "2",
    explanation: "The quadratic factors as (x - 2)(x - 4) = 0, so x = 2 or x = 4. Among the choices, 2 works."
  },
  {
    id: "math-psda-001",
    section: "math",
    topic: "Problem Solving & Data Analysis",
    difficulty: "easy",
    question: "A class has 12 juniors and 18 seniors. What percent of the class are juniors?",
    choices: ["30%", "40%", "50%", "60%"],
    correctAnswer: "40%",
    explanation: "There are 30 students total. The junior fraction is 12/30 = 0.40, or 40%."
  },
  {
    id: "math-psda-002",
    section: "math",
    topic: "Problem Solving & Data Analysis",
    difficulty: "easy",
    question: "If 5 notebooks cost $15, what is the cost of 8 notebooks at the same rate?",
    choices: ["$18", "$21", "$24", "$30"],
    correctAnswer: "$24",
    explanation: "Each notebook costs $3. Eight notebooks cost 8 x 3 = $24."
  },
  {
    id: "math-psda-003",
    section: "math",
    topic: "Problem Solving & Data Analysis",
    difficulty: "medium",
    question: "The mean of 6, 8, 10, and x is 9. What is x?",
    choices: ["12", "14", "16", "18"],
    correctAnswer: "12",
    explanation: "A mean of 9 for 4 numbers means the sum is 36. Since 6 + 8 + 10 = 24, x = 12."
  },
  {
    id: "math-psda-004",
    section: "math",
    topic: "Problem Solving & Data Analysis",
    difficulty: "medium",
    question: "A store discounts a jacket from $80 to $68. What is the percent decrease?",
    choices: ["10%", "12%", "15%", "18%"],
    correctAnswer: "15%",
    explanation: "The decrease is $12. Since 12/80 = 0.15, the percent decrease is 15%."
  },
  {
    id: "math-psda-005",
    section: "math",
    topic: "Problem Solving & Data Analysis",
    difficulty: "hard",
    question: "A survey found that 45 of 150 students ride a bus to school. Based on this rate, how many of 500 students would be expected to ride a bus?",
    choices: ["120", "135", "150", "165"],
    correctAnswer: "150",
    explanation: "The rate is 45/150 = 0.30. For 500 students, 0.30 x 500 = 150."
  },
  {
    id: "math-geometry-001",
    section: "math",
    topic: "Geometry & Trigonometry",
    difficulty: "easy",
    question: "A rectangle has length 9 and width 4. What is its area?",
    choices: ["13", "26", "32", "36"],
    correctAnswer: "36",
    explanation: "Area of a rectangle is length times width: 9 x 4 = 36."
  },
  {
    id: "math-geometry-002",
    section: "math",
    topic: "Geometry & Trigonometry",
    difficulty: "easy",
    question: "A triangle has angles measuring 40 degrees and 65 degrees. What is the third angle?",
    choices: ["65 degrees", "70 degrees", "75 degrees", "80 degrees"],
    correctAnswer: "75 degrees",
    explanation: "Triangle angles sum to 180 degrees. The third angle is 180 - 40 - 65 = 75 degrees."
  },
  {
    id: "math-geometry-003",
    section: "math",
    topic: "Geometry & Trigonometry",
    difficulty: "medium",
    question: "A circle has radius 6. In terms of pi, what is its area?",
    choices: ["6pi", "12pi", "36pi", "72pi"],
    correctAnswer: "36pi",
    explanation: "The area of a circle is pi r^2. With r = 6, the area is 36pi."
  },
  {
    id: "math-geometry-004",
    section: "math",
    topic: "Geometry & Trigonometry",
    difficulty: "medium",
    question: "In a right triangle, the legs are 5 and 12. What is the hypotenuse?",
    choices: ["11", "12", "13", "15"],
    correctAnswer: "13",
    explanation: "Using the Pythagorean theorem, c^2 = 5^2 + 12^2 = 169, so c = 13."
  },
  {
    id: "math-geometry-005",
    section: "math",
    topic: "Geometry & Trigonometry",
    difficulty: "hard",
    question: "A right triangle has an angle theta with opposite side 8 and hypotenuse 17. What is sin theta?",
    choices: ["8/17", "15/17", "8/15", "15/8"],
    correctAnswer: "8/17",
    explanation: "Sine is opposite over hypotenuse, so sin theta = 8/17."
  },
  {
    id: "rw-grammar-001",
    section: "reading-writing",
    topic: "Grammar & Conventions",
    difficulty: "easy",
    question: "Which choice completes the sentence correctly? The group of students ____ meeting after school.",
    choices: ["are", "is", "were", "have"],
    correctAnswer: "is",
    explanation: "The subject group is singular, so the singular verb is is needed."
  },
  {
    id: "rw-grammar-002",
    section: "reading-writing",
    topic: "Grammar & Conventions",
    difficulty: "easy",
    question: "Which choice is punctuated correctly?",
    choices: [
      "Mia brought three items: pencils, paper, and a calculator.",
      "Mia brought three items pencils, paper, and a calculator.",
      "Mia brought three items; pencils, paper, and a calculator.",
      "Mia brought three items, pencils paper and a calculator."
    ],
    correctAnswer: "Mia brought three items: pencils, paper, and a calculator.",
    explanation: "A colon can introduce a list after a complete sentence."
  },
  {
    id: "rw-grammar-003",
    section: "reading-writing",
    topic: "Grammar & Conventions",
    difficulty: "medium",
    question: "Which choice completes the sentence? Neither the coach nor the players ____ available for interviews.",
    choices: ["is", "are", "was", "has been"],
    correctAnswer: "are",
    explanation: "With neither/nor, the verb agrees with the nearer subject, players, which is plural."
  },
  {
    id: "rw-grammar-004",
    section: "reading-writing",
    topic: "Grammar & Conventions",
    difficulty: "hard",
    question: "Which sentence is clearest and most concise?",
    choices: [
      "The committee approved the plan after reviewing the budget.",
      "After having reviewed the budget, the plan was approved by the committee.",
      "The plan, after review of the budget, it was approved.",
      "The committee, which reviewed the budget, they approved the plan."
    ],
    correctAnswer: "The committee approved the plan after reviewing the budget.",
    explanation: "This choice is direct, concise, and grammatically clear."
  },
  {
    id: "rw-transitions-001",
    section: "reading-writing",
    topic: "Transitions",
    difficulty: "easy",
    question: "Which transition best completes the sentence? The trail was steep; ____, the hikers reached the top before noon.",
    choices: ["however", "therefore", "for example", "similarly"],
    correctAnswer: "however",
    explanation: "The second idea contrasts with the difficulty of the trail, so however fits."
  },
  {
    id: "rw-transitions-002",
    section: "reading-writing",
    topic: "Transitions",
    difficulty: "medium",
    question: "Which transition best completes the sentence? The data were incomplete; ____, the researchers collected a second sample.",
    choices: ["as a result", "instead", "nevertheless", "for instance"],
    correctAnswer: "as a result",
    explanation: "The second action is a consequence of incomplete data."
  },
  {
    id: "rw-transitions-003",
    section: "reading-writing",
    topic: "Transitions",
    difficulty: "medium",
    question: "Which transition best completes the sentence? Several cities expanded bike lanes. ____, public interest in cycling increased.",
    choices: ["Likewise", "In contrast", "Earlier", "Although"],
    correctAnswer: "Likewise",
    explanation: "Likewise shows a similar trend across cities."
  },
  {
    id: "rw-transitions-004",
    section: "reading-writing",
    topic: "Transitions",
    difficulty: "hard",
    question: "Which transition best completes the sentence? The first prototype was inexpensive; ____, it failed during repeated testing.",
    choices: ["moreover", "however", "therefore", "for example"],
    correctAnswer: "however",
    explanation: "The sentence contrasts low cost with poor performance, so however is best."
  },
  {
    id: "rw-vocab-001",
    section: "reading-writing",
    topic: "Vocabulary in Context",
    difficulty: "easy",
    question: "Which word best completes the sentence? The teacher gave a ____ explanation that helped the class understand the concept.",
    choices: ["clear", "distant", "fragile", "silent"],
    correctAnswer: "clear",
    explanation: "A clear explanation is easy to understand, which matches the sentence."
  },
  {
    id: "rw-vocab-002",
    section: "reading-writing",
    topic: "Vocabulary in Context",
    difficulty: "medium",
    question: "Which word best completes the sentence? The artist's style is easy to recognize because it is highly ____.",
    choices: ["distinctive", "temporary", "ordinary", "uncertain"],
    correctAnswer: "distinctive",
    explanation: "Distinctive means noticeably different or recognizable."
  },
  {
    id: "rw-vocab-003",
    section: "reading-writing",
    topic: "Vocabulary in Context",
    difficulty: "medium",
    question: "Which word best completes the sentence? The mayor tried to ____ concerns by answering questions directly.",
    choices: ["address", "ignore", "borrow", "decorate"],
    correctAnswer: "address",
    explanation: "To address concerns means to respond to or deal with them."
  },
  {
    id: "rw-vocab-004",
    section: "reading-writing",
    topic: "Vocabulary in Context",
    difficulty: "hard",
    question: "Which word best completes the sentence? The report was praised for its ____ analysis of the city's changing population.",
    choices: ["superficial", "thorough", "accidental", "hesitant"],
    correctAnswer: "thorough",
    explanation: "A thorough analysis is complete and detailed."
  },
  {
    id: "rw-reading-001",
    section: "reading-writing",
    topic: "Reading Comprehension",
    difficulty: "easy",
    question: "A passage explains that community gardens provide fresh food and create places for neighbors to meet. What is the main idea?",
    choices: [
      "Community gardens can benefit neighborhoods in multiple ways.",
      "Fresh food is always expensive in cities.",
      "Neighbors rarely work together on shared projects.",
      "Gardens should only be built in rural areas."
    ],
    correctAnswer: "Community gardens can benefit neighborhoods in multiple ways.",
    explanation: "The passage describes both food access and community connection as benefits."
  },
  {
    id: "rw-reading-002",
    section: "reading-writing",
    topic: "Reading Comprehension",
    difficulty: "medium",
    question: "A passage says a scientist repeated an experiment because the first result was surprising. What can be inferred?",
    choices: [
      "The scientist wanted to check whether the result was reliable.",
      "The scientist disliked the experiment.",
      "The first result was impossible.",
      "The experiment had no value."
    ],
    correctAnswer: "The scientist wanted to check whether the result was reliable.",
    explanation: "Repeating a surprising experiment helps confirm whether the result can be trusted."
  },
  {
    id: "rw-reading-003",
    section: "reading-writing",
    topic: "Reading Comprehension",
    difficulty: "medium",
    question: "A paragraph states that a new bus route reduced commute times for students. Which evidence best supports this claim?",
    choices: [
      "Students reported arriving at school 15 minutes earlier on average.",
      "The buses were painted blue and white.",
      "The route map was posted online.",
      "Several students enjoy listening to music on buses."
    ],
    correctAnswer: "Students reported arriving at school 15 minutes earlier on average.",
    explanation: "This evidence directly supports the claim about reduced commute times."
  },
  {
    id: "rw-reading-004",
    section: "reading-writing",
    topic: "Reading Comprehension",
    difficulty: "hard",
    question: "A passage argues that small museums preserve local history that might otherwise be overlooked. Which choice best states the author's purpose?",
    choices: [
      "To explain the value of small museums in protecting community stories",
      "To compare ticket prices at different museums",
      "To argue that large museums should close",
      "To describe how to build a museum exhibit"
    ],
    correctAnswer: "To explain the value of small museums in protecting community stories",
    explanation: "The passage focuses on how small museums preserve overlooked local history."
  },
  {
    id: "rw-structure-001",
    section: "reading-writing",
    topic: "Text Structure",
    difficulty: "easy",
    question: "A paragraph first describes a problem and then explains how a school solved it. What is the paragraph's structure?",
    choices: ["Problem and solution", "Chronological order", "Cause only", "Definition"],
    correctAnswer: "Problem and solution",
    explanation: "The paragraph presents an issue and then a solution."
  },
  {
    id: "rw-structure-002",
    section: "reading-writing",
    topic: "Text Structure",
    difficulty: "medium",
    question: "A passage compares two note-taking methods and explains strengths of each. What structure does it use?",
    choices: ["Compare and contrast", "Sequence", "Narrative", "Question and answer"],
    correctAnswer: "Compare and contrast",
    explanation: "The passage discusses similarities or differences between two methods."
  },
  {
    id: "rw-structure-003",
    section: "reading-writing",
    topic: "Text Structure",
    difficulty: "medium",
    question: "A sentence would best introduce a paragraph about why sleep improves memory. Which choice fits best?",
    choices: [
      "Researchers have found several ways sleep supports learning.",
      "Many students own alarm clocks.",
      "Some beds are larger than others.",
      "The history of schools is long and complex."
    ],
    correctAnswer: "Researchers have found several ways sleep supports learning.",
    explanation: "This sentence introduces the topic of sleep and learning clearly."
  },
  {
    id: "rw-structure-004",
    section: "reading-writing",
    topic: "Text Structure",
    difficulty: "hard",
    question: "Which sentence best concludes a paragraph about libraries adding digital resources?",
    choices: [
      "Together, these changes show how libraries are adapting to modern learners.",
      "Some libraries were built more than a century ago.",
      "Printed books can have colorful covers.",
      "Many people walk past libraries every day."
    ],
    correctAnswer: "Together, these changes show how libraries are adapting to modern learners.",
    explanation: "This conclusion sums up the paragraph's main idea about adaptation."
  }
];
