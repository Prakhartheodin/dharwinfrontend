import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/shared/lib/api/meetings', () => ({
  getMeetingLinkage: vi.fn(),
  patchMeetingLinkage: vi.fn(),
  createApplicationForMeeting: vi.fn(),
}))
vi.mock('@/shared/lib/api/jobApplications', () => ({
  listJobApplications: vi.fn(),
}))

import { createApplicationForMeeting, getMeetingLinkage, patchMeetingLinkage } from '@/shared/lib/api/meetings'
import { listJobApplications } from '@/shared/lib/api/jobApplications'
import InterviewLinkageModal, { type InterviewLinkageTarget } from '../InterviewLinkageModal'

const CAND = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const JOB_A = 'bbbbbbbbbbbbbbbbbbbbbbbb'
const JOB_B = 'cccccccccccccccccccccccc'
const APP_A = 'dddddddddddddddddddddddd'
const APP_B = 'eeeeeeeeeeeeeeeeeeeeeeee'
const MEETING = '111111111111111111111111'

const unlinked = (revision: number) => ({ interviewLanguage: 'en', linkageStatus: 'unlinked', linkageRevision: revision })
const apps = (list: Array<[string, string, string]>) => ({
  results: list.map(([id, jobId, title]) => ({ id, job: { id: jobId, title }, candidate: { id: CAND }, status: 'Interview' })),
  page: 1,
  limit: 100,
  totalPages: 1,
  totalResults: list.length,
})
const conflict = (data: object) => Object.assign(new Error('Request failed with status code 409'), { response: { status: 409, data } })

const target: InterviewLinkageTarget = {
  meetingId: MEETING,
  candidateId: CAND,
  candidateName: 'Asha Rao',
  position: 'Backend Engineer Interview',
  jobPosition: JOB_B,
  linkageStatus: 'unlinked',
}

beforeEach(() => {
  vi.mocked(getMeetingLinkage).mockReset()
  vi.mocked(patchMeetingLinkage).mockReset()
  vi.mocked(createApplicationForMeeting).mockReset()
  vi.mocked(listJobApplications).mockReset()
})
afterEach(cleanup)

function renderModal() {
  const onClose = vi.fn()
  const onLinked = vi.fn()
  render(<InterviewLinkageModal target={target} onClose={onClose} onLinked={onLinked} />)
  return { onClose, onLinked }
}

describe('InterviewLinkageModal', () => {
  it('links the chosen application with the fetched revision, then refreshes and closes', async () => {
    vi.mocked(getMeetingLinkage).mockResolvedValue(unlinked(3) as never)
    vi.mocked(listJobApplications).mockResolvedValue(apps([[APP_A, JOB_A, 'Frontend Engineer']]) as never)
    vi.mocked(patchMeetingLinkage).mockResolvedValue({ ...unlinked(4), linkageStatus: 'verified_manual' } as never)
    const user = userEvent.setup()
    const { onClose, onLinked } = renderModal()

    await waitFor(() => expect(screen.getByRole('option', { name: /Frontend Engineer/ })).toBeInTheDocument())
    expect(listJobApplications).toHaveBeenCalledWith({ candidateId: CAND, limit: 100 })
    await user.selectOptions(screen.getByLabelText('Application'), APP_A)
    await user.click(screen.getByRole('button', { name: 'Link application' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(patchMeetingLinkage).toHaveBeenCalledWith(MEETING, { applicationId: APP_A, expectedRevision: 3 })
    expect(onLinked).toHaveBeenCalledTimes(1)
  })

  it('on 409 linkage_revision_conflict refetches the linkage and does not close or retry', async () => {
    vi.mocked(getMeetingLinkage).mockResolvedValueOnce(unlinked(0) as never).mockResolvedValueOnce(unlinked(1) as never)
    vi.mocked(listJobApplications).mockResolvedValue(apps([[APP_B, JOB_B, 'Backend Engineer']]) as never)
    vi.mocked(patchMeetingLinkage).mockRejectedValueOnce(
      conflict({ message: 'Linkage revision conflict', errorCode: 'linkage_revision_conflict' })
    )
    const user = userEvent.setup()
    const { onClose, onLinked } = renderModal()

    // jobPosition holds JOB_B, so its application is preselected.
    await waitFor(() => expect(screen.getByLabelText('Application')).toHaveValue(APP_B))
    await user.click(screen.getByRole('button', { name: 'Link application' }))

    await waitFor(() => expect(getMeetingLinkage).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('status')).toHaveTextContent(/changed by someone else/i)
    expect(patchMeetingLinkage).toHaveBeenCalledTimes(1)
    expect(onLinked).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    // The retry uses the refetched revision.
    vi.mocked(patchMeetingLinkage).mockResolvedValueOnce(unlinked(2) as never)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Link application' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Link application' }))
    await waitFor(() => expect(patchMeetingLinkage).toHaveBeenLastCalledWith(MEETING, { applicationId: APP_B, expectedRevision: 1 }))
  })

  it('creates an application only after the explicit confirm', async () => {
    vi.mocked(getMeetingLinkage).mockResolvedValue(unlinked(0) as never)
    vi.mocked(listJobApplications).mockResolvedValue(apps([]) as never)
    vi.mocked(createApplicationForMeeting).mockResolvedValue({ ...unlinked(1), linkageStatus: 'verified' } as never)
    const user = userEvent.setup()
    const { onClose, onLinked } = renderModal()

    const createButton = await screen.findByRole('button', { name: 'Create application for this interview' })
    await user.click(createButton)
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(createApplicationForMeeting).not.toHaveBeenCalled()

    await user.click(createButton)
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Create application' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(createApplicationForMeeting).toHaveBeenCalledWith(MEETING)
    expect(onLinked).toHaveBeenCalledTimes(1)
  })

  it('on 409 application_exists refetches applications and selects the existing one', async () => {
    vi.mocked(getMeetingLinkage).mockResolvedValue(unlinked(0) as never)
    vi.mocked(listJobApplications)
      .mockResolvedValueOnce(apps([]) as never)
      .mockResolvedValueOnce(apps([[APP_B, JOB_B, 'Backend Engineer']]) as never)
    vi.mocked(createApplicationForMeeting).mockRejectedValueOnce(
      conflict({ errorCode: 'application_exists', details: { applicationId: APP_B } })
    )
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.click(await screen.findByRole('button', { name: 'Create application for this interview' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Create application' }))

    await waitFor(() => expect(screen.getByLabelText('Application')).toHaveValue(APP_B))
    expect(listJobApplications).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent(/already exists/i)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('hides create for a legacy title interview (no job id to create from)', async () => {
    vi.mocked(getMeetingLinkage).mockResolvedValue({ ...unlinked(0), linkageStatus: 'legacy_title_candidate' } as never)
    vi.mocked(listJobApplications).mockResolvedValue(apps([[APP_A, JOB_A, 'Frontend Engineer']]) as never)
    render(
      <InterviewLinkageModal
        target={{ ...target, jobPosition: 'frontend engineer', linkageStatus: 'legacy_title_candidate' }}
        onClose={vi.fn()}
        onLinked={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.getByLabelText('Application')).toHaveValue(APP_A))
    expect(screen.queryByRole('button', { name: 'Create application for this interview' })).not.toBeInTheDocument()
    expect(screen.getByText('Confirm link')).toBeInTheDocument()
  })
})
