// uat.dharwin.frontend/app/(components)/(contentlayout)/ats/jobs/edit/[id]/page.tsx
//
// SSR dynamic route. EditJobClient reads `id` via useParams() at runtime;
// this server-side wrapper only renders the shell. We deliberately do NOT
// export generateStaticParams — see sibling student/[studentId]/page.tsx
// for the rationale.

import EditJobClient from "./EditJobClient";

export default function EditJobPage() {
  return <EditJobClient />;
}
