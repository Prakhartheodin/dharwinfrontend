'use client'

import React, { useMemo, useCallback, useState, useLayoutEffect, useEffect, useRef } from 'react'
import { DM_Sans } from 'next/font/google'
import { enhanceOfferLetterRoles, type OfferLetterJobType } from '@/shared/lib/api/offers'
import styles from './offer-letter-generator.module.css'
import { OFFER_LETTER_PREVIEW_ID } from './print-offer-letter-iframe'
import {
  type EligibilityPresetKey,
  escHtml,
  fmtCurrencyParts,
  fmtDateLong,
  fmtStartDateOrdinal,
  apiJobTypeToUi,
  uiJobTypeToApi,
  autoFillRolesFromPosition,
  compensationPreviewFromAnnualGross,
  getJobHoursLabel,
  getJobTypeLabelUi,
  employmentLinesFromPreset,
  effectiveEligibilityLines,
  internEligibilityOptRegularPreviewHtml,
  INTERN_OFFER_DEFAULT_ELIGIBILITY,
} from './offer-letter-generator-data'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-offer-letter-dm',
  display: 'swap',
})

const OFFER_LETTER_LOGO_PATH = '/assets/images/dharwin-offer-letter-logo.png'
const OFFER_LETTER_CEO_SIG_PATH = '/assets/images/ceo-signature-harvinder.png'

function offerLetterLogoSrcAbsolute(): string {
  if (typeof window === 'undefined') return OFFER_LETTER_LOGO_PATH
  try {
    return new URL(OFFER_LETTER_LOGO_PATH, window.location.origin).href
  } catch {
    return OFFER_LETTER_LOGO_PATH
  }
}

function offerLetterCeoSignatureSrcAbsolute(): string {
  if (typeof window === 'undefined') return OFFER_LETTER_CEO_SIG_PATH
  try {
    return new URL(OFFER_LETTER_CEO_SIG_PATH, window.location.origin).href
  } catch {
    return OFFER_LETTER_CEO_SIG_PATH
  }
}

export type OfferLetterFormFields = {
  letterFullName: string
  letterAddress: string
  positionTitle: string
  joiningDate: string
  letterDate: string
  jobType: OfferLetterJobType
  weeklyHours: 25 | 40
  workLocation: string
  rolesText: string
  trainingText: string
  annualGrossCtc: string
  ctcCurrency: 'USD' | 'INR'
  academicNote: string
  eligibilityPreset: EligibilityPresetKey
  eligibilityText: string
  supFirst: string
  supLast: string
  supPhone: string
  supEmail: string
}

/** Default empty letter fields (e.g. list modal). */
export function createEmptyOfferLetterForm(): OfferLetterFormFields {
  return {
    letterFullName: '',
    letterAddress: '',
    positionTitle: '',
    joiningDate: '',
    letterDate: '',
    jobType: 'FT_40',
    weeklyHours: 40,
    workLocation: 'Remote (USA)',
    rolesText: '',
    trainingText: '',
    annualGrossCtc: '',
    ctcCurrency: 'USD',
    academicNote: '',
    eligibilityPreset: 'none',
    eligibilityText: '',
    supFirst: 'Jason',
    supLast: 'Mendonca',
    supPhone: '+1-307-206-9144',
    supEmail: 'jason@dharwinbusinesssolutions.com',
  }
}

type Props = {
  offerCode: string
  jobTitle: string
  candidateName: string
  letterForm: OfferLetterFormFields
  setLetterForm: React.Dispatch<React.SetStateAction<OfferLetterFormFields>>
  letterBusy: boolean
  lastGeneratedLabel: string | null
  hasPdf: boolean
  onClose: () => void
  onGeneratePdf: () => void
  onDownload: () => void
  /** Insert above Candidate Details (e.g. load error from ?offerId= on new-offer). */
  formPanelTop?: React.ReactNode
  /** Insert after the last form section, still inside the left column (e.g. Create offer actions). */
  formPanelFooter?: React.ReactNode
}

function TopbarLogoIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width={34} height={34} rx={4} fill="#1e4080" />
      <rect x={5} y={5} width={24} height={24} rx={2} fill="#fff" opacity={0.15} />
      <rect x={8} y={8} width={18} height={18} rx={1.5} fill="none" stroke="#4a9e4a" strokeWidth={2.5} />
      <rect x={12} y={12} width={10} height={10} rx={1} fill="#fff" />
    </svg>
  )
}

function bulletLinesHtml(text: string): string {
  if (!text?.trim()) return ''
  return text
    .trim()
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => `<li>${escHtml(l.trim())}</li>`)
    .join('')
}

function compensationHtml(compPara: string): string {
  if (!compPara) return ''
  const parts = compPara.split(/(\$[\d,]+ USD|₹[\d,]+ INR)/g).filter((p) => p !== '')
  return parts
    .map((p) => {
      const bold = /^\$[\d,]+ USD$/.test(p) || /^₹[\d,]+ INR$/.test(p)
      return bold ? `<strong>${escHtml(p)}</strong>` : escHtml(p)
    })
    .join('')
}

export function buildEligibilityLinesFromForm(form: OfferLetterFormFields): string[] | undefined {
  const isIntern = form.jobType === 'INTERN_UNPAID'
  const lines = employmentLinesFromPreset(form.eligibilityPreset, isIntern, form.eligibilityText)
  if (!lines.length) return undefined
  return lines
}

export function OfferLetterGeneratorWorkspace({
  offerCode,
  jobTitle,
  candidateName,
  letterForm,
  setLetterForm,
  letterBusy,
  lastGeneratedLabel,
  hasPdf,
  onClose,
  onGeneratePdf,
  onDownload,
  formPanelTop,
  formPanelFooter,
}: Props) {
  /** Toggles a document class so @media print can hide app chrome (sidebar/header) without relying on :has(), which is unreliable in some print engines. */
  useLayoutEffect(() => {
    const root = document.documentElement
    const body = document.body
    root.classList.add('print-offer-letter')
    body.classList.add('print-offer-letter')
    return () => {
      root.classList.remove('print-offer-letter')
      body.classList.remove('print-offer-letter')
    }
  }, [])

  /** Browsers add document.title to the print header; clearing it for the print job removes that line. Date/URL are controlled by the print dialog. */
  const printTitleBackupRef = useRef<string | null>(null)
  useEffect(() => {
    const onBeforePrint = () => {
      printTitleBackupRef.current = document.title
      document.title = ''
    }
    const onAfterPrint = () => {
      if (printTitleBackupRef.current != null) {
        document.title = printTitleBackupRef.current
        printTitleBackupRef.current = null
      }
    }
    window.addEventListener('beforeprint', onBeforePrint)
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint)
      window.removeEventListener('afterprint', onAfterPrint)
    }
  }, [])

  const jobUi = apiJobTypeToUi(letterForm.jobType)
  const isInternship = letterForm.jobType === 'INTERN_UNPAID'
  const isPaid = !isInternship
  const [rolesAiLoading, setRolesAiLoading] = useState(false)
  const [trainingAiLoading, setTrainingAiLoading] = useState(false)

  const handleEnhanceRoles = useCallback(async () => {
    const title = letterForm.positionTitle.trim()
    if (!title) {
      alert('Add a position / job title first so AI can target the right role.')
      return
    }
    setRolesAiLoading(true)
    try {
      const existing = letterForm.rolesText.trim()
      const { text } = await enhanceOfferLetterRoles({
        jobTitle: title,
        existingRoles: existing,
        existingTraining: letterForm.trainingText.trim(),
        isInternship: letterForm.jobType === 'INTERN_UNPAID',
        enhanceFocus: letterForm.jobType === 'INTERN_UNPAID' ? 'roles' : undefined,
      })
      if (text) {
        setLetterForm((f) => ({ ...f, rolesText: text }))
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(
        msg ||
          (e instanceof Error ? e.message : 'Could not enhance roles. Ensure OPENAI_API_KEY is set on the server.')
      )
    } finally {
      setRolesAiLoading(false)
    }
  }, [letterForm.positionTitle, letterForm.rolesText, letterForm.trainingText, letterForm.jobType, setLetterForm])

  const handleEnhanceTraining = useCallback(async () => {
    const title = letterForm.positionTitle.trim()
    if (!title) {
      alert('Add a position / job title first so AI can target training outcomes.')
      return
    }
    setTrainingAiLoading(true)
    try {
      const { trainingText } = await enhanceOfferLetterRoles({
        jobTitle: title,
        existingRoles: letterForm.rolesText.trim(),
        existingTraining: letterForm.trainingText.trim(),
        isInternship: true,
        enhanceFocus: 'training',
      })
      if (trainingText) {
        setLetterForm((f) => ({ ...f, trainingText }))
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(
        msg ||
          (e instanceof Error
            ? e.message
            : 'Could not enhance training outcomes. Ensure OPENAI_API_KEY is set on the server.')
      )
    } finally {
      setTrainingAiLoading(false)
    }
  }, [letterForm.positionTitle, letterForm.rolesText, letterForm.trainingText, setLetterForm])

  const handlePositionBlur = useCallback(() => {
    const data = autoFillRolesFromPosition(letterForm.positionTitle)
    if (!data) return
    setLetterForm((f) => ({
      ...f,
      rolesText: f.rolesText.trim() ? f.rolesText : data.roles.join('\n'),
      trainingText: f.trainingText.trim() ? f.trainingText : data.learning.join('\n'),
    }))
  }, [letterForm.positionTitle, setLetterForm])

  const setJobUi = (ui: 'fulltime' | 'parttime' | 'internship') => {
    const api = uiJobTypeToApi(ui)
    setLetterForm((f) => ({
      ...f,
      jobType: api,
      weeklyHours: ui === 'parttime' ? 25 : 40,
      ...(api === 'INTERN_UNPAID' && f.eligibilityPreset === 'none'
        ? { eligibilityPreset: 'opt_regular' as EligibilityPresetKey }
        : {}),
    }))
  }

  const letterPreviewHtml = useMemo(() => {
    const name = letterForm.letterFullName.trim() || '— Candidate Name —'
    const addr = letterForm.letterAddress.trim() || '— Address —'
    const pos = letterForm.positionTitle.trim() || '— Position —'
    const joiningFmt = letterForm.joiningDate ? fmtStartDateOrdinal(letterForm.joiningDate) : '— Date —'
    const today = new Date()
    const letterDateStr = letterForm.letterDate
      ? fmtDateLong(letterForm.letterDate)
      : today.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })

    const hoursLabel =
      letterForm.jobType === 'INTERN_UNPAID'
        ? `${letterForm.weeklyHours} hours per week`
        : getJobHoursLabel(jobUi)
    const jobTypeLabel = getJobTypeLabelUi(jobUi)

    /** Same branded PNG as server PDF (`src/assets/offer-letters/dharwin-offer-letter-logo.png`); absolute URL for print iframe. */
    const letterheadLogoHtml = `<img class="${styles.letterLogoImg}" src="${offerLetterLogoSrcAbsolute()}" alt="Dharwin Business Solutions" />`

    /** Shared letterhead (logo + contact + rule). Duplicated: on-screen in letterPage, print-only in letterPrintHeader. */
    const letterHeadAndRule = `
      <div class="${styles.letterHeader}">
        <div class="${styles.letterLogo}">${letterheadLogoHtml}</div>
        <div class="${styles.letterContact}">
          <div class="${styles.letterContactRow}"><span class="${styles.contactIcon}">✉</span><span>Support@dharwinbusinesssolutions.com</span></div>
          <div class="${styles.letterContactRow}"><span class="${styles.contactIcon}">📍</span><span>30N Gould St, STE R, Sheridan, WY, 82801</span></div>
          <div class="${styles.letterContactRow}"><span class="${styles.contactIcon}">🌐</span><span>www.dharwinbusinesssolutions.com</span></div>
        </div>
      </div>
      <hr class="${styles.letterDivider}" />
    `

    const letterFooter3Col = `
      <div class="${styles.footerItem}">✉ support@dharwinbusinesssolutions.com</div>
      <div class="${styles.footerItem}">📍 30 N Gould St, STE R Sheridan, WY82801, USA</div>
      <div class="${styles.footerItem}">🌐 Website: www.dharwinbusinesssolutions.com</div>
    `

    let compSection = ''
    if (isPaid && letterForm.annualGrossCtc) {
      const g = Number(String(letterForm.annualGrossCtc).replace(/,/g, ''))
      const para =
        Number.isFinite(g) && g > 0
          ? compensationPreviewFromAnnualGross(g, letterForm.ctcCurrency)
          : ''
      if (para) {
        compSection = `<div class="${styles.sectionTitleHl}">Compensation:</div><ul class="${styles.bulletList}"><li>${compensationHtml(para)}</li></ul>`
      }
    }

    const rolesBullets = bulletLinesHtml(letterForm.rolesText)
    const learningBullets = bulletLinesHtml(letterForm.trainingText)

    let openingPara = ''
    if (isInternship) {
      openingPara = `We are pleased to extend to you an offer for an unpaid training opportunity at Dharwin Business Solutions LLC, a registered E-Verify employer (<strong>E-Verify Company ID: 2702244 | EIN: 38-4356712</strong>). This position is intended to provide you with valuable practical experience in a professional work environment aligned with your academic training and career goals.`
    } else {
      openingPara = `Dharwin Business Solutions LLC, a registered E-Verify employer (<strong>Company Identification Number: 2702244, EIN: 38-4356712</strong>), appreciates your interest in employment opportunities with our organization. After reviewing your qualifications and experience, we are pleased to offer you a position with our company under the terms outlined below.`
    }

    const supBlock = `
    <div class="${styles.sectionTitleHl}">Supervisor details</div>
    <ul class="${styles.bulletList}">
      <li><strong>First name-</strong> ${escHtml(letterForm.supFirst)}</li>
      <li><strong>Last Name-</strong> ${escHtml(letterForm.supLast)}</li>
      <li><strong>Number-</strong> ${escHtml(letterForm.supPhone)}</li>
      <li><strong>Email-</strong> ${escHtml(letterForm.supEmail)}</li>
    </ul>`

    const rolesSectionTitle = isInternship ? 'Roles &amp; Responsibilities:' : 'Position Overview:'
    const rolesIntro = isInternship
      ? 'During the internship, you will receive guided exposure and training in areas including, but not limited to:'
      : `As a ${escHtml(pos)}, your responsibilities will include but are not limited to:`

    const learningSection = isInternship
      ? `<div class="${styles.sectionTitleHl}">Training &amp; Learning Outcomes:</div>
      <p class="${styles.letterBody}">This internship will focus on enhancing your knowledge in:</p>
      ${
        learningBullets
          ? `<ul class="${styles.bulletList}">${learningBullets}</ul>`
          : `<p class="${styles.letterBody}" style="color:var(--text-secondary);font-style:italic;">Add learning outcomes below or use Enhance with AI.</p>`
      }
      <p class="${styles.letterBody}">All tasks will be <strong>non-billable, supervised, and training-oriented</strong>.</p>`
      : ''

    const degreeNote = letterForm.academicNote.trim()
      ? `<p class="${styles.letterBody}">This role is directly related to your ${escHtml(letterForm.academicNote.trim())} and aligns with your academic training.</p>`
      : ''

    const eligLines = effectiveEligibilityLines(
      letterForm.eligibilityPreset,
      isInternship,
      letterForm.eligibilityText
    )
    let eligBody = ''
    if (eligLines.length) {
      if (isInternship && eligLines[0] === INTERN_OFFER_DEFAULT_ELIGIBILITY) {
        eligBody = internEligibilityOptRegularPreviewHtml()
      } else if (eligLines.length === 1) {
        eligBody = escHtml(eligLines[0])
      } else {
        eligBody = `<ul class="${styles.bulletList}">${eligLines
          .map((l) => `<li>${escHtml(l)}</li>`)
          .join('')}</ul>`
      }
    }
    const eligHtml = eligBody
      ? `<div class="${isInternship ? styles.sectionTitlePlain : styles.sectionTitleHl}">Employment Eligibility:</div>${
          eligBody.startsWith('<ul')
            ? eligBody
            : `<p class="${styles.letterBody}">${eligBody}</p>`
        }`
      : ''

    let statusSection = ''
    if (isInternship) {
      statusSection = `
      <div class="${styles.sectionTitlePlain}">Important Notes</div>
      <ul class="${styles.bulletList}">
        <li>This is a <strong>remote, voluntary unpaid internship</strong> for <strong>${escHtml(hoursLabel)}</strong>.</li>
        <li>The internship is intended purely for <strong>skill development and professional experience</strong>.</li>
        <li>There is <strong>no monetary compensation</strong> and no guarantee of future paid employment.</li>
        <li>You may discontinue participation at any time.</li>
        <li>This role does <strong>not constitute an employment relationship</strong> under the Fair Labor Standards Act (FLSA).</li>
      </ul>`
    } else {
      statusSection = `
      <div class="${styles.sectionTitleHl}">Employment Status:</div>
      <ul class="${styles.bulletList}">
        <li>This offer of employment does not constitute a contract. Your employment with Dharwin Business Solutions LLC will be at-will, meaning that either party may terminate the employment relationship at any time, with or without cause or notice.</li>
        <li>We are confident that your technical expertise and dedication will contribute significantly to our ongoing projects and SaaS development initiatives.</li>
        <li>Please confirm your acceptance of this offer by signing below and returning a scanned copy to <strong>support@dharwinbusinesssolutions.com</strong></li>
      </ul>`
    }

    const closing = isInternship
      ? `We are confident that this experience will provide valuable exposure to real-world applications and help you build a strong professional foundation. If you agree with the terms outlined above, please sign and return a copy of this letter to <strong>support@dharwinbusinesssolutions.com</strong> to confirm your acceptance. We look forward to working with you and supporting your professional journey.`
      : ''

    /* Same two-column signature block for paid and internship (line for ink / scan, no duplicate name). */
    const sigBlock = `
      <div class="${styles.sigRow}">
        <div>
          <div class="${styles.sigLabel}">For Dharwin Business Solutions LLC</div>
          <div class="${styles.sigCeoImageWrap}"><img class="${styles.sigCeoImage}" src="${offerLetterCeoSignatureSrcAbsolute()}" role="presentation" alt="" /></div>
          <div class="${styles.sigRule}"></div>
          <div class="${styles.sigNameCeo}">Dhariwal Harvinder Singh<br>CEO &amp; Founder<br>Date: ${escHtml(letterDateStr)}</div>
        </div>
        <div>
          <div class="${styles.sigLabel}">Accepted and Agreed:</div>
          <div class="${styles.sigLine}"></div>
          <div class="${styles.sigName}">${escHtml(name)}<br>${escHtml(pos)}<br>Date: ${escHtml(letterDateStr)}</div>
        </div>
      </div>`

    return `
    <div class="${styles.letterPrintHeader}" aria-hidden="true">${letterHeadAndRule}</div>
    <div class="${styles.letterPage}">
      ${letterHeadAndRule}
      <div class="${styles.letterSubject}">Sub: Offer Letter</div>
      <div class="${styles.letterDate}">Date: ${escHtml(letterDateStr)}</div>
      <div style="text-align:center;margin-bottom:12px;"><span class="${styles.offerBadge}">Offer of Employment</span></div>
      <div class="${styles.letterTo}">
        <strong>To:</strong> ${escHtml(name)}<br />
        <strong>Address:</strong> ${escHtml(addr)}
      </div>
      <p class="${styles.letterGreeting}">Hi ${escHtml(name)},</p>
      <p class="${styles.letterBody}">${openingPara}</p>
      <div class="${styles.sectionTitleHl}">Position Details:</div>
      <ul class="${styles.bulletList}">
        <li><strong>Job Title:</strong> ${escHtml(pos)}</li>
        <li><strong>Start Date:</strong> ${escHtml(joiningFmt)}</li>
        <li><strong>Job Type:</strong> ${escHtml(jobTypeLabel)}</li>
        <li><strong>Hours:</strong> ${escHtml(hoursLabel)}</li>
        <li><strong>Location:</strong> ${escHtml(letterForm.workLocation.trim() || 'Remote (USA)')}</li>
      </ul>
      ${isPaid ? supBlock : ''}
      ${compSection}
      <div class="${styles.sectionTitleHl}">${rolesSectionTitle}</div>
      <p class="${styles.letterBody}">${rolesIntro}</p>
      <ul class="${styles.bulletList}">${rolesBullets}</ul>
      ${learningSection}
      ${degreeNote}
      ${eligHtml}
      ${statusSection}
      ${closing ? `<p class="${styles.letterBody}">${closing}</p>` : ''}
      <div class="${styles.sigBlock}">${sigBlock}</div>
    </div>
    <div class="${styles.letterPrintFooter}" aria-hidden="true">
      <div class="${styles.letterFooter}">${letterFooter3Col}</div>
    </div>
    <div class="${styles.letterFooter}">${letterFooter3Col}</div>`
  }, [letterForm, isPaid, isInternship, jobUi])

  const compPreview = useMemo(() => {
    if (isInternship || !letterForm.annualGrossCtc) return null
    return fmtCurrencyParts(letterForm.annualGrossCtc, letterForm.ctcCurrency)
  }, [isInternship, letterForm.annualGrossCtc, letterForm.ctcCurrency])

  return (
    <div
      className={`offer-letter-workspace ${styles.olg} ${dmSans.variable}`}
      style={{ fontFamily: 'var(--font-offer-letter-dm), system-ui, sans-serif' }}
    >
      <header className={`${styles.topbar} ${styles.printHide}`}>
        <div className={styles.topbarLogo}>
          <TopbarLogoIcon />
          <span className={styles.topbarTitle}>Dharwin Business Solutions</span>
        </div>
        <div className={styles.topbarSep} />
        <span className={styles.topbarSub}>Offer Letter Generator</span>
        <span className={styles.topbarMeta}>
          · {offerCode}
          {jobTitle ? ` · ${jobTitle}` : ''}
          {candidateName ? ` · ${candidateName}` : ''}
        </span>
        {lastGeneratedLabel ? (
          <span className={styles.topbarMeta} style={{ color: '#86efac' }}>
            Last PDF: {lastGeneratedLabel}
          </span>
        ) : null}
        <div className={styles.topbarActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onGeneratePdf}
            disabled={letterBusy}
            title="Saves your letter fields, then builds a new PDF on the server (PDFKit). That file is what Download retrieves."
          >
            {letterBusy ? '…' : 'Generate PDF'}
          </button>
          <button
            type="button"
            className={
              hasPdf
                ? `${styles.btn} ${styles.btnSuccess}`
                : `${styles.btn} ${styles.btnGhost}`
            }
            onClick={onDownload}
            disabled={letterBusy || !hasPdf}
            title={
              hasPdf
                ? 'Fetches the PDF file stored on the server from your last successful Generate PDF. On-screen edits are not in this file until you click Generate PDF again.'
                : 'Run Generate PDF first. When the server finishes storing the file, Download fetches that same PDF (identical to using Download from the offers table).'
            }
          >
            Download
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose} disabled={letterBusy}>
            Close
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={`${styles.formPanel} ${styles.printHide}`}>
          {formPanelTop}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.dot} />
              Candidate Details
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.field}>
                <label htmlFor="olg-fullName">Full Name *</label>
                <input
                  id="olg-fullName"
                  className={styles.input}
                  value={letterForm.letterFullName}
                  onChange={(e) => setLetterForm((f) => ({ ...f, letterFullName: e.target.value }))}
                  placeholder="e.g. Prakhar Sharma"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="olg-address">Address (Full Line) *</label>
                <input
                  id="olg-address"
                  className={styles.input}
                  value={letterForm.letterAddress}
                  onChange={(e) => setLetterForm((f) => ({ ...f, letterAddress: e.target.value }))}
                />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="olg-letterDate">Letter Date</label>
                  <input
                    id="olg-letterDate"
                    type="date"
                    className={styles.input}
                    value={letterForm.letterDate}
                    onChange={(e) => setLetterForm((f) => ({ ...f, letterDate: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="olg-joining">Joining Date *</label>
                  <input
                    id="olg-joining"
                    type="date"
                    className={styles.input}
                    value={letterForm.joiningDate}
                    onChange={(e) => setLetterForm((f) => ({ ...f, joiningDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.dot} />
              Position Details
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.field}>
                <label htmlFor="olg-position">Position / Job Title *</label>
                <input
                  id="olg-position"
                  className={styles.input}
                  value={letterForm.positionTitle}
                  onChange={(e) => setLetterForm((f) => ({ ...f, positionTitle: e.target.value }))}
                  onBlur={handlePositionBlur}
                  list="olg-position-suggestions"
                />
                <datalist id="olg-position-suggestions">
                  {[
                    'Data Analyst',
                    'Business Analyst',
                    'Senior Software Engineer',
                    'Software Engineer',
                    'Junior Software Engineer',
                    'Full Stack Developer',
                    'Frontend Developer',
                    'Backend Developer',
                    'DevOps Engineer',
                    'Data Scientist',
                    'Machine Learning Engineer',
                    'Cloud Engineer',
                    'QA Engineer',
                    'Product Manager',
                    'Project Manager',
                    'UI/UX Designer',
                    'Cybersecurity Analyst',
                  ].map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </div>
              <div className={styles.field}>
                <label htmlFor="olg-jobType">Job Type *</label>
                <select
                  id="olg-jobType"
                  className={styles.select}
                  value={jobUi}
                  onChange={(e) => setJobUi(e.target.value as 'fulltime' | 'parttime' | 'internship')}
                >
                  <option value="fulltime">Full Time — 40 hours per week</option>
                  <option value="parttime">Part Time — 25 hours per week</option>
                  <option value="internship">Training / Unpaid Internship (Full Time)</option>
                </select>
              </div>
              {isInternship ? (
                <div className={styles.field}>
                  <label htmlFor="olg-weekly">Weekly hours (intern)</label>
                  <select
                    id="olg-weekly"
                    className={styles.select}
                    value={letterForm.weeklyHours}
                    onChange={(e) =>
                      setLetterForm((f) => ({ ...f, weeklyHours: Number(e.target.value) === 25 ? 25 : 40 }))
                    }
                  >
                    <option value={40}>40</option>
                    <option value={25}>25</option>
                  </select>
                </div>
              ) : null}
              <div className={styles.field}>
                <label htmlFor="olg-location">Location</label>
                <input
                  id="olg-location"
                  className={styles.input}
                  value={letterForm.workLocation}
                  onChange={(e) => setLetterForm((f) => ({ ...f, workLocation: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {!isInternship ? (
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.dot} />
                Compensation
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="olg-ctc">Annual Gross CTC</label>
                    <input
                      id="olg-ctc"
                      type="number"
                      className={styles.input}
                      placeholder="e.g. 30000"
                      value={letterForm.annualGrossCtc}
                      onChange={(e) => setLetterForm((f) => ({ ...f, annualGrossCtc: e.target.value }))}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="olg-cur">Currency</label>
                    <select
                      id="olg-cur"
                      className={styles.select}
                      value={letterForm.ctcCurrency}
                      onChange={(e) =>
                        setLetterForm((f) => ({ ...f, ctcCurrency: e.target.value === 'INR' ? 'INR' : 'USD' }))
                      }
                    >
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                </div>
                {compPreview ? (
                  <div className={styles.compPreview}>
                    Annual: {compPreview.annual} {compPreview.cur} → Monthly installment: {compPreview.monthly}{' '}
                    {compPreview.cur}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeaderSplit}>
              <div className={styles.sectionHeaderTitle}>
                <span className={styles.dot} />
                Roles &amp; Responsibilities
              </div>
              <button
                type="button"
                className={styles.btnAi}
                onClick={() => void handleEnhanceRoles()}
                disabled={
                  rolesAiLoading || trainingAiLoading || letterBusy || !letterForm.positionTitle.trim()
                }
                title={
                  !letterForm.positionTitle.trim()
                    ? 'Enter position / job title first'
                    : letterForm.rolesText.trim()
                      ? 'Improve responsibilities using job title + current text'
                      : 'Generate responsibilities from job title'
                }
              >
                {rolesAiLoading ? 'Working…' : '✨ Enhance with AI'}
              </button>
            </div>
            <div className={styles.sectionBody}>
              <p className={styles.helpText}>
                Auto-filled from position title when it matches a template. One item per line. AI uses the job title; if this
                box is empty it generates new lines, otherwise it refines what you already have.
              </p>
              <div className={styles.field}>
                <textarea
                  className={styles.textarea}
                  rows={6}
                  value={letterForm.rolesText}
                  onChange={(e) => setLetterForm((f) => ({ ...f, rolesText: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {isInternship ? (
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeaderSplit}>
                <div className={styles.sectionHeaderTitle}>
                  <span className={styles.dot} />
                  Training &amp; Learning Outcomes
                </div>
                <button
                  type="button"
                  className={styles.btnAi}
                  onClick={() => void handleEnhanceTraining()}
                  disabled={
                    rolesAiLoading || trainingAiLoading || letterBusy || !letterForm.positionTitle.trim()
                  }
                  title={
                    !letterForm.positionTitle.trim()
                      ? 'Enter position / job title first'
                      : letterForm.trainingText.trim()
                        ? 'Improve outcomes using job title, current roles, and existing outcomes'
                        : 'Generate training & learning outcomes from job title (uses roles as context if present)'
                  }
                >
                  {trainingAiLoading ? 'Working…' : '✨ Enhance with AI'}
                </button>
              </div>
              <div className={styles.sectionBody}>
                <p className={styles.helpText}>
                  One outcome per line. AI uses the job title and your roles text (if any) so outcomes match the position.
                </p>
                <div className={styles.field}>
                  <textarea
                    className={styles.textarea}
                    rows={5}
                    value={letterForm.trainingText}
                    onChange={(e) => setLetterForm((f) => ({ ...f, trainingText: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.dot} />
              Supervisor Details
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>First Name</label>
                  <input
                    className={styles.input}
                    value={letterForm.supFirst}
                    onChange={(e) => setLetterForm((f) => ({ ...f, supFirst: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label>Last Name</label>
                  <input
                    className={styles.input}
                    value={letterForm.supLast}
                    onChange={(e) => setLetterForm((f) => ({ ...f, supLast: e.target.value }))}
                  />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Phone</label>
                  <input
                    className={styles.input}
                    value={letterForm.supPhone}
                    onChange={(e) => setLetterForm((f) => ({ ...f, supPhone: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label>Email</label>
                  <input
                    className={styles.input}
                    value={letterForm.supEmail}
                    onChange={(e) => setLetterForm((f) => ({ ...f, supEmail: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.dot} />
              Employment Eligibility
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.field}>
                <label htmlFor="olg-elig">Preset</label>
                <select
                  id="olg-elig"
                  className={styles.select}
                  value={letterForm.eligibilityPreset}
                  onChange={(e) =>
                    setLetterForm((f) => ({
                      ...f,
                      eligibilityPreset: e.target.value as EligibilityPresetKey,
                    }))
                  }
                >
                  <option value="opt_regular">F-1 Post-Completion OPT (Regular OPT)</option>
                  <option value="opt_stem">F-1 STEM OPT Extension</option>
                  <option value="opt_training">F-1 Optional Practical Training (OPT)</option>
                  <option value="h1b">H-1B Visa</option>
                  <option value="gc">Green Card / Permanent Resident</option>
                  <option value="citizen">U.S. Citizen</option>
                  <option value="custom">Custom (use box below)</option>
                  <option value="none">None / server default</option>
                </select>
              </div>
              {letterForm.eligibilityPreset === 'custom' ? (
                <div className={styles.field}>
                  <label>Custom eligibility (one paragraph per line)</label>
                  <textarea
                    className={styles.textarea}
                    rows={4}
                    value={letterForm.eligibilityText}
                    onChange={(e) => setLetterForm((f) => ({ ...f, eligibilityText: e.target.value }))}
                  />
                </div>
              ) : null}
              <div className={styles.field}>
                <label>Academic / degree alignment (optional)</label>
                <input
                  className={styles.input}
                  value={letterForm.academicNote}
                  onChange={(e) => setLetterForm((f) => ({ ...f, academicNote: e.target.value }))}
                  placeholder="e.g. Master's degree in Business Analytics"
                />
              </div>
            </div>
          </div>
          {formPanelFooter}
        </aside>

        <div className={styles.previewPanel}>
          <div
            id={OFFER_LETTER_PREVIEW_ID}
            className={styles.letter}
            dangerouslySetInnerHTML={{ __html: letterPreviewHtml }}
          />
        </div>
      </div>
    </div>
  )
}
