import { Suspense } from "react";
import { PastPapersPage } from "@/components/past-papers/PastPapersPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Past Papers" };

export default function PastPapersRoute() {
  return (
    <Suspense fallback={null}>
      <PastPapersPage />
    </Suspense>
  );
}
