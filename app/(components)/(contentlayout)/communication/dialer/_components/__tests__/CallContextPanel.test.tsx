import { it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import CallContextPanel from "../CallContextPanel";
import { getBolnaCallRecord, type CallRecord } from "@/shared/lib/api/bolna";

vi.mock("@/shared/lib/api/bolna", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/shared/lib/api/bolna")>();
  return {
    ...mod,
    getBolnaCallRecord: vi.fn(),
    // CallRecordings mounts whenever executionId is set — keep it off the network.
    getCallRecordings: vi.fn().mockResolvedValue({
      success: true,
      executionId: "x",
      recordings: { bolna: { available: false }, plivo: { available: false } },
    }),
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("shows empty state when no record", () => {
  render(<CallContextPanel record={null} onCall={() => {}} />);
  expect(screen.getByText(/start a conversation/i)).toBeInTheDocument();
});

it("renders details, gates recording, saves as contact", () => {
  const onCall = vi.fn();
  const rec: CallRecord = {
    _id: "1", displayName: "Jane", toPhoneNumber: "+911", status: "completed",
    telephonyData: { direction: "outbound" }, duration: 61, createdAt: "2026-07-01T08:00:00Z",
  };
  const onSaveAsContact = vi.fn();
  render(<CallContextPanel record={rec} onCall={onCall} onSaveAsContact={onSaveAsContact} />);
  expect(screen.getByText("Jane")).toBeInTheDocument();
  expect(screen.queryByText("Recording")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^call$/i }));
  expect(onCall).toHaveBeenCalledWith("+911");
  fireEvent.click(screen.getByRole("button", { name: /save as contact/i }));
  expect(onSaveAsContact).toHaveBeenCalledWith(rec);
});

const baseRec: CallRecord = { _id: "2", toPhoneNumber: "+911", status: "completed" };

it("hides AI summary card when intelligence is absent (no permission / legacy call)", () => {
  render(<CallContextPanel record={baseRec} onCall={() => {}} />);
  expect(screen.queryByText(/ai summary/i)).not.toBeInTheDocument();
});

it("shows completed AI summary text", () => {
  const rec = { ...baseRec, intelligence: { transcriptSid: "GT1", status: "completed", summary: "Agent confirmed the offer." } };
  render(<CallContextPanel record={rec} onCall={() => {}} />);
  expect(screen.getByText(/ai summary/i)).toBeInTheDocument();
  expect(screen.getByText("Agent confirmed the offer.")).toBeInTheDocument();
});

it("hides transcript card when transcript is absent", () => {
  render(<CallContextPanel record={baseRec} onCall={() => {}} />);
  expect(screen.queryByText(/^transcript$/i)).not.toBeInTheDocument();
});

it("shows collapsed transcript, expands with speaker labels on click", () => {
  const rec = { ...baseRec, transcript: "A: Hello there\nB: Hi, who is this?" };
  render(<CallContextPanel record={rec} onCall={() => {}} />);
  const toggle = screen.getByRole("button", { name: /transcript/i });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByText("Hello there")).not.toBeInTheDocument();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("Hello there")).toBeInTheDocument();
  expect(screen.getByText("Agent")).toBeInTheDocument();
  expect(screen.getByText("Caller")).toBeInTheDocument();
});

it("shows generating state while transcript is pending, failure note on failed", () => {
  const rec = { ...baseRec, intelligence: { transcriptSid: "GT1", status: "queued", summary: null } };
  const { unmount } = render(<CallContextPanel record={rec} onCall={() => {}} />);
  expect(screen.getByText(/generating summary/i)).toBeInTheDocument();
  unmount();
  const failedRec = { ...baseRec, intelligence: { transcriptSid: "GT1", status: "failed", summary: null } };
  render(<CallContextPanel record={failedRec} onCall={() => {}} />);
  expect(screen.getByText(/summary unavailable/i)).toBeInTheDocument();
});

it("polls the record and swaps in the summary once intelligence completes", async () => {
  vi.useFakeTimers();
  vi.mocked(getBolnaCallRecord).mockResolvedValue({
    success: true,
    record: { intelligence: { transcriptSid: "GT1", status: "completed", summary: "Done deal." } },
  });
  const rec: CallRecord = {
    ...baseRec,
    executionId: `CA${"a".repeat(32)}`,
    intelligence: { transcriptSid: "GT1", status: "queued", summary: null, requestedAt: new Date().toISOString() },
  };
  render(<CallContextPanel record={rec} onCall={() => {}} />);
  expect(screen.getByText(/generating summary/i)).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
  expect(getBolnaCallRecord).toHaveBeenCalledWith(rec.executionId);
  expect(screen.getByText("Done deal.")).toBeInTheDocument();
});

it("shows the stalled note (no skeleton) when processing exceeds 10 minutes", () => {
  const rec: CallRecord = {
    ...baseRec,
    intelligence: {
      transcriptSid: "GT1", status: "queued", summary: null,
      requestedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    },
  };
  render(<CallContextPanel record={rec} onCall={() => {}} />);
  expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument();
  expect(screen.queryByText(/generating summary/i)).not.toBeInTheDocument();
});
