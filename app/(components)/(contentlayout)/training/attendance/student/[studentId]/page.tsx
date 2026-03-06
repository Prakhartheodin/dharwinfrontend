import { StudentAttendanceClient } from "./StudentAttendanceClient";

// Required for static export with dynamic routes
// At least one param needed; real IDs are loaded at runtime
export async function generateStaticParams() {
  return [{ studentId: "_" }];
}

export default function StudentAttendancePage() {
  return <StudentAttendanceClient />;
}
