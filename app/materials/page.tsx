import { MaterialsPage } from "@/components/dashboard/MaterialsPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Materials" };

export default function MaterialsRoute() {
  return <MaterialsPage />;
}
