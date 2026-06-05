"use client"

import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/shared/contexts/auth-context'
import { hasPermission } from '@/shared/lib/permissions'
import CategoriesTab from './_components/CategoriesTab'
import PositionsTab from './_components/PositionsTab'

type SetupTab = 'categories' | 'positions'

const TAB_CONFIG: { id: SetupTab; label: string; canView: (auth: ReturnType<typeof useAuth>) => boolean }[] = [
  {
    id: 'categories',
    label: 'Categories',
    canView: (auth) => hasPermission(auth, 'view_training_categories'),
  },
  {
    id: 'positions',
    label: 'Positions',
    canView: (auth) => hasPermission(auth, 'view_training_positions'),
  },
]

export default function TrainingCurriculumSetupPage() {
  const auth = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const visibleTabs = useMemo(() => TAB_CONFIG.filter((t) => t.canView(auth)), [auth])

  const requestedTab = (searchParams.get('tab') as SetupTab | null) ?? 'categories'
  const activeTab: SetupTab = visibleTabs.some((t) => t.id === requestedTab)
    ? requestedTab
    : (visibleTabs[0]?.id ?? 'categories')

  const setTab = (tab: SetupTab) => {
    router.replace(`/training/curriculum/setup?tab=${tab}`)
  }

  return (
    <Fragment>
      <Seo title="Training Curriculum Setup" />
      <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-defaulttextcolor dark:text-white">Training Curriculum Setup</h1>
              <p className="mt-1 text-sm text-defaulttextcolor/65">Course assignment and position roster in one place.</p>
            </div>
            {visibleTabs.length > 1 && (
              <div className="inline-flex rounded-xl border border-defaultborder/80 bg-defaultbackground/60 p-1" role="tablist">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`ti-btn !rounded-lg !py-2 !px-4 !text-sm !border-0 ${
                      activeTab === tab.id
                        ? 'ti-btn-primary-full shadow-sm'
                        : 'ti-btn-light !bg-transparent text-defaulttextcolor/75 hover:text-defaulttextcolor'
                    }`}
                    onClick={() => setTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {activeTab === 'categories' && visibleTabs.some((t) => t.id === 'categories') && <CategoriesTab />}
          {activeTab === 'positions' && visibleTabs.some((t) => t.id === 'positions') && <PositionsTab />}
        </div>
      </div>
    </Fragment>
  )
}
