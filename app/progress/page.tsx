import { PageHeading } from "@/components/dashboard/PageHeading";
import { Layout } from "@/components/Layout";
import { ProgressDashboard } from "@/components/ProgressDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    <Layout active="progress">
      <PageHeading eyebrow="Your analytics" title="Track your SAT prep" description="Review saved practice and test attempts, track scores over time, and identify topics to revisit." />

      <ProgressDashboard />
    </Layout>
  );
}
