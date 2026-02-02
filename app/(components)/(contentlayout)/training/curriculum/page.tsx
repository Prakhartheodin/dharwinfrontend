"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import React, { Fragment } from 'react'

const TrainingCurriculum = () => {
  return (
    <Fragment>
      <Seo title={"Training Curriculum"} />
      <Pageheader currentpage="Training Curriculum" activepage="Training Management" mainpage="Training Curriculum" />
    </Fragment>
  )
}

export default TrainingCurriculum
