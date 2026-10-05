"use client"
import React, { useEffect } from "react"

type SeoProps = {
  title?: string
  description?: string
  /**
   * When set, `document.title` is this string only (no "Dharwin Business Solutions - …" prefix).
   * Use for pages where a short tab title should also read cleanly in browser print headers.
   */
  fullDocumentTitle?: string
}

const Seo = ({ title, description, fullDocumentTitle }: SeoProps) => {
  useEffect(() => {
    if (fullDocumentTitle !== undefined) {
      document.title = fullDocumentTitle
    } else if (title) {
      document.title = `Dharwin Business Solutions - ${title}`
    }
  }, [title, fullDocumentTitle])

  useEffect(() => {
    if (!description) return
    let el = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!el) {
      el = document.createElement("meta")
      el.setAttribute("name", "description")
      document.head.appendChild(el)
    }
    el.setAttribute("content", description)
  }, [description])

  return null
}

export default Seo