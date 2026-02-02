"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment } from 'react'

const Mentors = () => {
  return (
    <Fragment>
      <Seo title={"Mentors"} />
      <Pageheader currentpage="Mentors" activepage="Training Management" mainpage="Mentors" />
    </Fragment>
  )
}

export default Mentors
