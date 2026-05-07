// SSR dynamic route. No `generateStaticParams` — see
// training/attendance/student/[studentId]/page.tsx for rationale (placeholder
// `{ id: "_" }` strands SSR runtime chunks on Vercel after `output: "export"`
// was removed from next.config.js).

import EditOnboardingClient from './EditOnboardingClient'

export default function EditOnboardingPage() {
  return <EditOnboardingClient />
}
