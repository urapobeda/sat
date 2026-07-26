import { Suspense } from "react";
import { PastPapersPage } from "@/components/past-papers/PastPapersPage";

export default function PastPapersRoute() {
  return (
    <Suspense fallback={null}>
      <PastPapersPage />
    </Suspense>
  );
}
