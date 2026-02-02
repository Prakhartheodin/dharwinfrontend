"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment } from 'react'

const ProjectManagementAnalytics = () => {
  return (
    <Fragment>
      <Seo title={"Project Management Analytics"} />
      <Pageheader currentpage="Analytics" activepage="Project Management" mainpage="Analytics" />
    </Fragment>
  )
}

export default ProjectManagementAnalytics
