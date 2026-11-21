import { StudentShell } from "@/components/dashboard/StudentShell";
import { StudentProfile } from "@/components/profile/StudentProfile";
export const metadata = { title: "My profile" };
export default function Page() {
  return (
    <StudentShell active="progress">
      <div className="mx-auto max-w-6xl">
        <StudentProfile />
      </div>
    </StudentShell>
  );
}
