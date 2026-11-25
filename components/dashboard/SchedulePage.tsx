import { StudentShell } from "@/components/dashboard/StudentShell";
import { LessonSchedule } from "@/components/lessons/LessonViews";
export function SchedulePage() {
  return <StudentShell active="schedule"><LessonSchedule /></StudentShell>;
}
