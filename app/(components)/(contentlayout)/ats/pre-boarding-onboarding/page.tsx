"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment } from 'react'

const PreBoardingOnboarding = () => {
  return (
    <Fragment>
      <Seo title={"Pre-boarding & Onboarding"} />
      <Pageheader currentpage="Pre-boarding & Onboarding" activepage="ATS" mainpage="Pre-boarding & Onboarding" />
    </Fragment>
  )
}

export default PreBoardingOnboarding
