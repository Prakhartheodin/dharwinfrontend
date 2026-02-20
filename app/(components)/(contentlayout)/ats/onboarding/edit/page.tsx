"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EditOnboardingRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/ats/onboarding')
  }, [router])
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      <p className="text-sm text-gray-500">Redirecting to Onboarding...</p>
    </div>
  )
}
