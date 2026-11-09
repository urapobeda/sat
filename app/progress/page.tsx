import { PageHeading } from "@/components/dashboard/PageHeading";
import { Layout } from "@/components/Layout";
import { ProgressDashboard } from "@/components/ProgressDashboard";

export default function ProgressPage() {
  return (
    <Layout active="progress">
      <PageHeading eyebrow="Your analytics" title="Track your SAT prep" description="Review saved practice and test attempts, track scores over time, and identify topics to revisit." />

      <ProgressDashboard />
    </Layout>
  );
}
