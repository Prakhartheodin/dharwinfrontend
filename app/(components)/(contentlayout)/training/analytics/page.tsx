"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment } from 'react'

const TrainingAnalytics = () => {
  return (
    <Fragment>
      <Seo title={"Training Analytics"} />
      <Pageheader currentpage="Analytics" activepage="Training Management" mainpage="Analytics" />
    </Fragment>
  )
}

export default TrainingAnalytics
