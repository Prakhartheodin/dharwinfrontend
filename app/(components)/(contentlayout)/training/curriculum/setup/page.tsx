"use client"

import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import CurriculumSetupTable from "./_components/CurriculumSetupTable"

function TrainingCurriculumSetupPageInner() {
  const searchParams = useSearchParams()
  // Read once on mount for legacy ?tab= deep links; do not keep rewriting the URL.
  const [initialDrawerOpen] = useState(
    () => (searchParams.get("tab") ?? "") === "categories"
  )

  return (
    <Fragment>
      <Seo title="Training Curriculum Setup" />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <CurriculumSetupTable initialDrawerOpen={initialDrawerOpen} />
        </div>
      </div>
    </Fragment>
  )
}

export default function TrainingCurriculumSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="box custom-box text-center py-12 mt-5">
          <p className="text-defaulttextcolor/65 mb-0">Loading curriculum setup…</p>
        </div>
      }
    >
      <TrainingCurriculumSetupPageInner />
    </Suspense>
  )
}
