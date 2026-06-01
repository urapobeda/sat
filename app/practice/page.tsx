import { PracticePage } from "@/components/practice/PracticePage";
import { questions } from "@/data/questions";

export default function PracticeRoute() {
  return <PracticePage questions={questions} />;
}
