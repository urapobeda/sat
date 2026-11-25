import { MistakeNotebookPage } from "@/components/dashboard/MistakeNotebookPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mistake Notebook" };

export default function MistakesRoute() {
  return <MistakeNotebookPage />;
}
