"use client"

import React, { Suspense } from 'react'
import EditOnboardingClient from './[id]/EditOnboardingClient'
import { useSearchParams } from 'next/navigation'

function EditOnboardingContent() {
  const searchParams = useSearchParams()
  const placementId = searchParams?.get('id') || searchParams?.get('placementId') || ''
  return <EditOnboardingClient placementIdFromQuery={placementId} />
}

/** Edit HRMS page - uses query param ?id= for static export compatibility (dynamic [id] routes 404 in production). */
export default function EditOnboardingPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>}>
      <EditOnboardingContent />
    </Suspense>
  )
}
