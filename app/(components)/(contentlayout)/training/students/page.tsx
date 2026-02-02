"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment } from 'react'

const Students = () => {
  return (
    <Fragment>
      <Seo title={"Students"} />
      <Pageheader currentpage="Students" activepage="Training Management" mainpage="Students" />
    </Fragment>
  )
}

export default Students
