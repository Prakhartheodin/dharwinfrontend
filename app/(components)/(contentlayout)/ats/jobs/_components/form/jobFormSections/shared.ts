import type React from 'react'
import type { StylesConfig } from 'react-select'

export const JOB_FORM_GRID = 'grid grid-cols-12 gap-3'

export type JobFormSelectOption = { value: string; label: string }

export type JobFormBasicsSlice = {
  jobTitle: string
  organisationName: string
  location: string
  jobType: JobFormSelectOption | null
  experienceLevel: JobFormSelectOption | null
  vacancies: string
  applicationDeadline: string
}

export type JobFormSelectLayer = {
  menuPortalTarget: HTMLElement | null
  styles: StylesConfig
}

export function createSkillOption(label: string): JobFormSelectOption {
  return { label, value: label }
}

/** Add skill on Enter only (Tab moves focus normally). */
export function handleJobSkillsComboboxKeyDown(
  event: React.KeyboardEvent,
  skillsInputValue: string,
  onAddSkill: (label: string) => void,
  onClearInput: () => void
): void {
  if (!skillsInputValue || event.key !== 'Enter') return
  onAddSkill(skillsInputValue)
  onClearInput()
  event.preventDefault()
}
