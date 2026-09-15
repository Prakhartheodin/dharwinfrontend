export type InterviewDetailTab = "overview" | "recording" | "transcript" | "summary";

const TABS: InterviewDetailTab[] = ["overview", "recording", "transcript", "summary"];

export function parseInterviewDetailTab(value: string | null | undefined): InterviewDetailTab {
  if (value && (TABS as string[]).includes(value)) return value as InterviewDetailTab;
  return "overview";
}

export interface TabAccessInput {
  canReadTranscript: boolean;
  canReadSummary: boolean;
  hasRecording: boolean;
}

/** Which tabs appear in the nav (content may still show empty/no-access states). */
export function visibleInterviewDetailTabs(input: TabAccessInput): InterviewDetailTab[] {
  const tabs: InterviewDetailTab[] = ["overview", "recording"];
  if (input.canReadTranscript) tabs.push("transcript");
  if (input.canReadSummary) tabs.push("summary");
  return tabs;
}
