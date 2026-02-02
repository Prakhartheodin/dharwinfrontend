"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment } from 'react'

const AttendanceTracking = () => {
  return (
    <Fragment>
      <Seo title={"Attendance Tracking"} />
      <Pageheader currentpage="Attendance Tracking" activepage="Training Management" mainpage="Attendance Tracking" />
    </Fragment>
  )
}

export default AttendanceTracking
