"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment } from 'react'

const Evaluation = () => {
  return (
    <Fragment>
      <Seo title={"Evaluation"} />
      <Pageheader currentpage="Evaluation" activepage="Training Management" mainpage="Evaluation" />
    </Fragment>
  )
}

export default Evaluation
