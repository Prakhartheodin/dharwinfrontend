function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const REQUIREMENTS_SECTION_HEADER = '<h3>Requirements & Qualifications</h3>'

export const REQUIREMENTS_SPLIT_REGEX =
  /<h3>\s*Requirements\s*(?:&amp;|&)\s*Qualifications\s*<\/h3>/i

export function splitRequirementsFromDescription(rawHtml: string): {
  description: string
  requirements: string
} {
  if (!rawHtml) return { description: '', requirements: '' }
  const match = rawHtml.match(REQUIREMENTS_SPLIT_REGEX)
  if (!match || match.index === undefined) {
    return { description: rawHtml, requirements: '' }
  }
  const before = rawHtml.slice(0, match.index).replace(/\s+$/, '')
  const after = rawHtml.slice(match.index + match[0].length).replace(/^\s+/, '')
  return { description: before, requirements: after }
}

export function stripStrayRequirementsBlock(html: string): string {
  const strayHeader = html.match(REQUIREMENTS_SPLIT_REGEX)
  if (!strayHeader || strayHeader.index === undefined) return html
  return html.slice(0, strayHeader.index).replace(/\s+$/, '')
}

/** Appends education line + requirements HTML block for API jobDescription. */
export function buildJobDescriptionWithRequirements(
  jobDescription: string,
  requirements: string,
  education: string
): string {
  let finalDescription = stripStrayRequirementsBlock(jobDescription.trim())
  const reqParts: string[] = []
  if (education.trim()) {
    reqParts.push(`<p><strong>Education:</strong> ${escapeHtmlText(education.trim())}</p>`)
  }
  if (requirements.trim()) {
    reqParts.push(requirements.trim())
  }
  if (reqParts.length > 0) {
    finalDescription += `\n\n${REQUIREMENTS_SECTION_HEADER}\n${reqParts.join('\n')}`
  }
  return finalDescription
}
