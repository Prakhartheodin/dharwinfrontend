export type InterviewDetailTab = "overview" | "recording" | "transcript" | "summary" | "result";

const TABS: InterviewDetailTab[] = ["overview", "recording", "transcript", "summary", "result"];

export const INTERVIEW_DETAIL_TAB_LABELS: Record<InterviewDetailTab, string> = {
  overview: "Overview",
  recording: "Recording",
  transcript: "Transcript",
  summary: "Summary",
  result: "Result",
};

export function parseInterviewDetailTab(value: string | null | undefined): InterviewDetailTab {
  if (value && (TABS as string[]).includes(value)) return value as InterviewDetailTab;
  return "overview";
}

export interface TabAccessInput {
  canReadTranscript: boolean;
  canReadSummary: boolean;
  hasRecording: boolean;
  canManageResult: boolean;
}

/** Which tabs appear in the nav (content may still show empty/no-access states). */
export function visibleInterviewDetailTabs(input: TabAccessInput): InterviewDetailTab[] {
  const tabs: InterviewDetailTab[] = ["overview", "recording"];
  if (input.canReadTranscript) tabs.push("transcript");
  if (input.canReadSummary) tabs.push("summary");
  if (input.canManageResult) tabs.push("result");
  return tabs;
}
