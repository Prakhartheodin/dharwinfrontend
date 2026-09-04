import type { JobApplication } from "@/shared/lib/api/jobApplications";
import { listMeetings } from "@/shared/lib/api/meetings";
import type { ConfirmOptions } from "@/shared/components/ui/useConfirm";
import {
  applicationHasSelectedInterviewFromMeetings,
  jobApplicationRecordId,
  OFFER_INTERVIEW_BYPASS_CONFIRM,
} from "./offer-application-eligibility";

function applicationCandidateJobIds(ja: JobApplication) {
  const candidateId = String(
    (ja.candidate as { _id?: string; id?: string } | undefined)?._id ??
      (ja.candidate as { id?: string } | undefined)?.id ??
      ""
  );
  const jobId = String(
    (ja.job as { _id?: string; id?: string } | undefined)?._id ??
      (ja.job as { id?: string } | undefined)?.id ??
      ""
  );
  const jobTitle = ja.job?.title || "";
  return { candidateId, jobId, jobTitle };
}

/** null = no ack needed; true = HR confirmed bypass; false = cancelled */
export async function resolveOfferInterviewBypassAck(
  ja: JobApplication | undefined,
  confirm: (options: ConfirmOptions) => Promise<boolean>
): Promise<boolean | null> {
  if (!ja) return null;
  const { candidateId, jobId, jobTitle } = applicationCandidateJobIds(ja);
  if (!candidateId) return null;

  const res = await listMeetings({ candidate: candidateId, limit: 100 });
  if (applicationHasSelectedInterviewFromMeetings(res.results ?? [], candidateId, jobId, jobTitle)) {
    return null;
  }

  const ok = await confirm(OFFER_INTERVIEW_BYPASS_CONFIRM);
  return ok ? true : false;
}

export function findJobApplicationById(
  applications: JobApplication[],
  applicationId: string
): JobApplication | undefined {
  return applications.find((ja) => jobApplicationRecordId(ja) === applicationId);
}
