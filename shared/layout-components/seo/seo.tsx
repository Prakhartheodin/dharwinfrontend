"use client"
import React, { useEffect } from "react"

type SeoProps = {
  title?: string
  /**
   * When set, `document.title` is this string only (no "Dharwin Business Solutions - …" prefix).
   * Use for pages where a short tab title should also read cleanly in browser print headers.
   */
  fullDocumentTitle?: string
}

const Seo = ({ title, fullDocumentTitle }: SeoProps) => {
  useEffect(() => {
    if (fullDocumentTitle !== undefined) {
      document.title = fullDocumentTitle
    } else if (title) {
      document.title = `Dharwin Business Solutions - ${title}`
    }
  }, [title, fullDocumentTitle])

  return null
}

export default Seo