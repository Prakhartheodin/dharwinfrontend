import type { KeyboardEvent } from 'react'

export function createSkillOption(label: string) {
  return { label, value: label }
}

/** Add skill on Enter only (Tab moves focus normally). */
export function handleJobSkillsComboboxKeyDown(
  event: KeyboardEvent,
  skillsInputValue: string,
  onAddSkill: (label: string) => void,
  onClearInput: () => void
): void {
  if (!skillsInputValue) return
  if (event.key !== 'Enter') return
  onAddSkill(skillsInputValue)
  onClearInput()
  event.preventDefault()
}
