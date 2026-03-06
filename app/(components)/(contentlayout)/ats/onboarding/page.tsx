"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment } from 'react'

const Onboarding = () => {
  return (
    <Fragment>
      <Seo title={"Onboarding"} />
      <Pageheader currentpage="Onboarding" activepage="ATS" mainpage="Onboarding" />
    </Fragment>
  )
}

export default Onboarding
