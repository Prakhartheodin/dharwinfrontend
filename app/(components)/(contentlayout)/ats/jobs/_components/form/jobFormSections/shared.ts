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
