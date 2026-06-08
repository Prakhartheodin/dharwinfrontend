"use client";

import DepartmentsPanel from "../_components/DepartmentsPanel";
import { OrgPageLayout } from "../_components/org-ui";

export default function DepartmentsPage() {
  return (
    <OrgPageLayout
      seoTitle="Departments"
      currentpage="Departments"
      subtitle="Canonical department records used across HRMS, org structure, and onboarding."
    >
      <DepartmentsPanel />
    </OrgPageLayout>
  );
}
