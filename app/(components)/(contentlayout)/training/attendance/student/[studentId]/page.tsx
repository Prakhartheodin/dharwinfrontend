// uat.dharwin.frontend/app/(components)/(contentlayout)/training/attendance/student/[studentId]/page.tsx
//
// SSR dynamic route. The client component reads `studentId` via
// `useParams()` at runtime; this server-side wrapper only renders the
// shell. We deliberately do NOT export `generateStaticParams` because:
//   - next.config.js does NOT set `output: "export"` — the route is SSR.
//   - Build-time fetching of student ids was returning placeholder
//     `{ studentId: "_" }` on auth failure, which produced an unused
//     static page that confused Vercel's chunk packer.
//   - Removing the placeholder shrinks the SSR runtime chunk graph and
//     avoids the `[root-of-the-server]__<hash>.js` MODULE_NOT_FOUND
//     issue documented in the chunk-corruption audit.

import StudentAttendancePage from "./student-attendance-client";

export default function Page() {
  return <StudentAttendancePage />;
}
