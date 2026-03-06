"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment } from 'react'

const PreBoarding = () => {
  return (
    <Fragment>
      <Seo title={"Pre-boarding"} />
      <Pageheader currentpage="Pre-boarding" activepage="ATS" mainpage="Pre-boarding" />
    </Fragment>
  )
}

export default PreBoarding
