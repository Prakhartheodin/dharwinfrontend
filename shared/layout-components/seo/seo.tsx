"use client"
import React, { useEffect } from 'react'

const Seo = ({ title }:any) => {
  useEffect(() => {
    document.title = `Dharwin Business Solutions - ${title}`
  }, [])
  
  return (
    <>
    </>
  )
}

export default Seo;