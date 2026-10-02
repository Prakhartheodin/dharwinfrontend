'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import type { JobFormSelectLayer, JobFormSelectOption } from './shared'

const CreatableSelect = dynamic(() => import('react-select/creatable'), { ssr: false })

const skillsSelectComponents = { DropdownIndicator: null }

export function JobSkillsSection({
  skills,
  skillsInputValue,
  onSkillsChange,
  onSkillsInputChange,
  onSkillsKeyDown,
  selectLayer,
  labelledBy,
}: {
  skills: JobFormSelectOption[]
  skillsInputValue: string
  onSkillsChange: (value: JobFormSelectOption[]) => void
  onSkillsInputChange: (value: string) => void
  onSkillsKeyDown: (event: React.KeyboardEvent) => void
  selectLayer: JobFormSelectLayer
  labelledBy?: string
}): React.JSX.Element {
  const { menuPortalTarget, styles: selectMenuLayerStyles } = selectLayer
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="xl:col-span-12 col-span-12">
        <CreatableSelect
          inputId="job-skills-select"
          aria-labelledby={labelledBy}
          components={skillsSelectComponents}
          classNamePrefix="react-select"
          inputValue={skillsInputValue}
          isClearable
          isMulti
          menuIsOpen={false}
          onChange={(newValue) => {
            onSkillsChange(Array.isArray(newValue) ? (newValue as JobFormSelectOption[]) : [])
          }}
          onInputChange={onSkillsInputChange}
          onKeyDown={onSkillsKeyDown}
          placeholder="Type a skill and press Enter to add..."
          value={skills}
          className="ti-form-select"
          menuPortalTarget={menuPortalTarget}
          styles={selectMenuLayerStyles}
        />
        <p className="text-muted text-xs mt-2 mb-0">
          Add relevant skills required for this position. Press Enter after typing each skill.
        </p>
      </div>
    </div>
  )
}
