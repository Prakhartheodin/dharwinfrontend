"use client"

import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, useState } from "react"
import { useSearchParams } from "next/navigation"
import CurriculumSetupTable from "./_components/CurriculumSetupTable"

export default function TrainingCurriculumSetupPage() {
  const searchParams = useSearchParams()
  // Read once on mount for legacy ?tab= deep links; do not keep rewriting the URL.
  const [initialDrawerOpen] = useState(
    () => (searchParams.get("tab") ?? "") === "categories"
  )

  return (
    <Fragment>
      <Seo title="Training Curriculum Setup" />
      <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-defaulttextcolor dark:text-white">
              Training Curriculum Setup
            </h1>
            <p className="mt-1 text-sm text-defaulttextcolor/65">
              Course assignment and position roster in one place.
            </p>
          </div>
          <CurriculumSetupTable initialDrawerOpen={initialDrawerOpen} />
        </div>
      </div>
    </Fragment>
  )
}
