export function isCreateJobFormDirty(input: {
  jobTitle: string
  organisationName: string
  jobDescriptionHtml: string
}): boolean {
  return (
    Boolean(input.jobTitle.trim()) ||
    Boolean(input.organisationName.trim()) ||
    Boolean(input.jobDescriptionHtml.replace(/<[^>]+>/g, '').trim())
  )
}
