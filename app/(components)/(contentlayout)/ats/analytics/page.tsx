"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment } from 'react'

const ATSAnalytics = () => {
  return (
    <Fragment>
      <Seo title={"ATS Analytics"} />
      <Pageheader currentpage="Analytics" activepage="ATS" mainpage="Analytics" />
    </Fragment>
  )
}

export default ATSAnalytics
