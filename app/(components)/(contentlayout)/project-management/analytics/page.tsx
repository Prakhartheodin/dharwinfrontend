"use client"

import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment } from 'react'

const AnalyticsPage = () => {
  return (
    <Fragment>
      <Seo title="Analytics" />
      <Pageheader currentpage="Analytics" activepage="Project Management" mainpage="Analytics" />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-body p-4">
              <p className="text-[#8c9097] dark:text-white/50">Analytics page content coming soon.</p>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default AnalyticsPage
