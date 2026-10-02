'use client'

import React from 'react'
import { JOB_FORM_SECTION_HEADING_IDS } from './jobFormConstants'

const JUMP_SECTIONS = [
  { id: JOB_FORM_SECTION_HEADING_IDS.basics, label: 'Basics' },
  { id: JOB_FORM_SECTION_HEADING_IDS.organisation, label: 'Company' },
  { id: JOB_FORM_SECTION_HEADING_IDS.compensation, label: 'Pay' },
  { id: JOB_FORM_SECTION_HEADING_IDS.jobDescription, label: 'Description' },
  { id: JOB_FORM_SECTION_HEADING_IDS.skills, label: 'Skills' },
] as const

function scrollToSection(headingId: string): void {
  const el = document.getElementById(headingId)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function JobFormGeneralJumpNav(): React.JSX.Element {
  return (
    <nav className="jobs-form-jumplink" aria-label="Jump to section on this tab">
      <span className="jobs-form-jumplink__label">On this tab</span>
      <ul className="jobs-form-jumplink__list">
        {JUMP_SECTIONS.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              className="jobs-form-jumplink__btn"
              onClick={() => scrollToSection(section.id)}
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
