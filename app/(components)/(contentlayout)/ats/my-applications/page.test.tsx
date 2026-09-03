import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import type { JobApplication } from "@/shared/lib/api/jobApplications";
import type { Notification } from "@/shared/lib/api/notifications";
import * as jobApplicationsApi from "@/shared/lib/api/jobApplications";

const { mockUser, notificationState, refetchOnFocusHolder } = vi.hoisted(() => ({
  mockUser: { id: "user-1" },
  notificationState: { latest: null as Notification | null },
  refetchOnFocusHolder: { fn: null as (() => void) | null },
}));

vi.mock("@/shared/hooks/usePmRefetchOnFocus", () => ({
  usePmRefetchOnFocus: (refetch: () => void) => {
    refetchOnFocusHolder.fn = refetch;
  },
}));

vi.mock("@/shared/contexts/auth-context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("@/shared/contexts/NotificationContext", () => ({
  useNotificationContext: () => ({ latestNotification: notificationState.latest }),
}));

vi.mock("@/shared/components/ui/useConfirm", () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(false), confirmDialog: null }),
}));

vi.mock("./_components/DocumentsActionCard", () => ({
  default: () => null,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href?: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/shared/layout-components/seo/seo", () => ({
  default: () => null,
}));

import MyApplicationsPage from "./page";

function selectedApp(overrides: Partial<JobApplication> = {}): JobApplication {
  return {
    _id: "app-1",
    status: "Offered",
    candidateVisibleStatus: "Offer",
    interviewResult: "selected",
    job: { _id: "job-1", title: "Data Analyst", organisation: { name: "Dharwin" } },
    candidate: { fullName: "Candidate" },
    ...overrides,
  } as JobApplication;
}

beforeEach(() => {
  notificationState.latest = null;
  refetchOnFocusHolder.fn = null;
  vi.restoreAllMocks();
  vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({ results: [] });
  vi.spyOn(jobApplicationsApi, "withdrawMyApplication").mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("MyApplicationsPage congratulations banner", () => {
  it("shows banner when API returns interviewResult selected with offer stage", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({ results: [selectedApp()] });
    render(<MyApplicationsPage />);
    expect(await screen.findByTestId("congratulations-banner")).toBeInTheDocument();
    expect(screen.getAllByText("Data Analyst").length).toBeGreaterThanOrEqual(1);
  });

  it("hides banner when API returns rejected interviewResult", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [selectedApp({ interviewResult: "rejected", status: "Rejected" })],
    });
    render(<MyApplicationsPage />);
    await screen.findByText("Data Analyst");
    expect(screen.queryByTestId("congratulations-banner")).toBeNull();
  });

  it("hides banner when API returns pending interviewResult (selected→pending)", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [selectedApp({ interviewResult: "pending", status: "Interview", candidateVisibleStatus: "Interview" })],
    });
    render(<MyApplicationsPage />);
    await screen.findByText("Data Analyst");
    expect(screen.queryByTestId("congratulations-banner")).toBeNull();
  });

  it("refetches and hides banner when a job_application notification arrives", async () => {
    let phase: "initial" | "updated" = "initial";
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockImplementation(async () => {
      if (phase === "initial") return { results: [selectedApp()] };
      return { results: [selectedApp({ interviewResult: "rejected", status: "Rejected" })] };
    });

    const { rerender } = render(<MyApplicationsPage />);
    await screen.findByTestId("congratulations-banner");

    phase = "updated";
    notificationState.latest = {
      _id: "notif-1",
      type: "job_application",
      title: "Application Update",
      message: "Not selected",
      read: false,
      metadata: { interviewResult: "rejected" },
    } as Notification;
    rerender(<MyApplicationsPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("congratulations-banner")).toBeNull();
    });
    expect(jobApplicationsApi.getMyApplications).toHaveBeenCalledTimes(2);
  });

  it("refetches on tab focus when interviewResult changes without notification", async () => {
    let phase: "initial" | "updated" = "initial";
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockImplementation(async () => {
      if (phase === "initial") return { results: [selectedApp()] };
      return {
        results: [selectedApp({ interviewResult: "pending", status: "Interview", candidateVisibleStatus: "Interview" })],
      };
    });

    render(<MyApplicationsPage />);
    await screen.findByTestId("congratulations-banner");

    phase = "updated";
    refetchOnFocusHolder.fn?.();

    await waitFor(() => {
      expect(screen.queryByTestId("congratulations-banner")).toBeNull();
    });
    expect(jobApplicationsApi.getMyApplications).toHaveBeenCalledTimes(2);
  });

  it("shows banner after rejected→selected when API updates", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [selectedApp({ interviewResult: "selected", status: "Offered" })],
    });
    render(<MyApplicationsPage />);
    expect(await screen.findByTestId("congratulations-banner")).toBeInTheDocument();
  });
});

describe("MyApplicationsPage status badge", () => {
  it("shows Rejected badge when API returns rejected interviewResult", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [
        selectedApp({
          interviewResult: "rejected",
          status: "Rejected",
          candidateVisibleStatus: "Rejected",
        }),
      ],
    });
    render(<MyApplicationsPage />);
    const article = await screen.findByRole("article");
    expect(article).toHaveTextContent("Rejected");
    expect(article).not.toHaveTextContent("Interview");
  });

  it("shows Rejected badge when API still has Interview status but interviewResult rejected", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [
        selectedApp({
          interviewResult: "rejected",
          status: "Interview",
          candidateVisibleStatus: "Interview",
        }),
      ],
    });
    render(<MyApplicationsPage />);
    const article = await screen.findByRole("article");
    expect(article).toHaveTextContent("Rejected");
    expect(article).not.toHaveTextContent("Interview");
  });

  it("shows Interview badge when interview is pending and not rejected", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [
        selectedApp({
          interviewResult: "pending",
          status: "Interview",
          candidateVisibleStatus: "Interview",
        }),
      ],
    });
    render(<MyApplicationsPage />);
    const article = await screen.findByRole("article");
    expect(article).toHaveTextContent("Interview");
    expect(article).not.toHaveTextContent("Rejected");
    expect(article).not.toHaveTextContent("Pending");
  });

  it("shows Interview badge after selected→pending even when stale offer fields remain", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [
        selectedApp({
          interviewResult: "pending",
          status: "Offered",
          candidateVisibleStatus: "Offer",
        }),
      ],
    });
    render(<MyApplicationsPage />);
    const article = await screen.findByRole("article");
    expect(article).toHaveTextContent("Interview");
    expect(article).not.toHaveTextContent("Offer");
    expect(article).not.toHaveTextContent("Pending");
    expect(screen.queryByTestId("congratulations-banner")).toBeNull();
  });
});

describe("MyApplicationsPage stage-aware badges", () => {
  function lifecycleApp(overrides: Partial<JobApplication> & Record<string, unknown>): JobApplication {
    return {
      _id: "app-1",
      status: "Hired",
      job: { _id: "job-1", title: "Data Analyst", organisation: { name: "Dharwin" } },
      candidate: { fullName: "Candidate" },
      selectionPersisted: true,
      ...overrides,
    } as JobApplication;
  }

  it.each([
    ["Offer", "offer", true],
    ["Pre-boarding", "preboarding", true],
    ["Onboarding", "onboarding", true],
    ["Hired", "hired", true],
    ["Deferred", "deferred", true],
  ] as const)("renders the %s badge and keeps the banner", async (badge, stage, banner) => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [
        lifecycleApp({
          candidateLifecycleStage: stage,
          candidateVisibleStatus: badge,
          showCongratulations: banner,
        }),
      ],
    });
    render(<MyApplicationsPage />);
    expect(await screen.findByTestId("application-status-badge")).toHaveTextContent(badge);
    expect(screen.queryByTestId("congratulations-banner")).not.toBeNull();
  });

  it.each([
    ["Rejected \u00b7 Interview", "interview"],
    ["Rejected \u00b7 Offer", "offer"],
    ["Rejected \u00b7 Pre-boarding", "preboarding"],
    ["Rejected \u00b7 Onboarding", "onboarding"],
  ] as const)("renders %s and hides the banner", async (badge, rejectionStage) => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [
        lifecycleApp({
          status: "Rejected",
          candidateLifecycleStage: "rejected",
          rejectionStage,
          candidateVisibleStatus: badge,
          showCongratulations: false,
        }),
      ],
    });
    render(<MyApplicationsPage />);
    expect(await screen.findByTestId("application-status-badge")).toHaveTextContent(badge);
    expect(screen.queryByTestId("congratulations-banner")).toBeNull();
  });

  it("gives each application its own badge and shows the banner for the live one", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [
        lifecycleApp({
          _id: "a1",
          status: "Rejected",
          candidateLifecycleStage: "rejected",
          rejectionStage: "offer",
          candidateVisibleStatus: "Rejected \u00b7 Offer",
          showCongratulations: false,
          job: { _id: "j1", title: "Role A", organisation: { name: "Co A" } },
        }),
        lifecycleApp({
          _id: "a2",
          candidateLifecycleStage: "onboarding",
          candidateVisibleStatus: "Onboarding",
          showCongratulations: true,
          job: { _id: "j2", title: "Role B", organisation: { name: "Co B" } },
        }),
      ],
    });
    render(<MyApplicationsPage />);
    const badges = await screen.findAllByTestId("application-status-badge");
    expect(badges.map((b) => b.textContent)).toEqual(["Rejected \u00b7 Offer", "Onboarding"]);
    expect(screen.queryByTestId("congratulations-banner")).not.toBeNull();
    expect(screen.getAllByText("Role B").length).toBeGreaterThanOrEqual(2);
  });

  it("sizes the badge to its content and never fixes its width", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [
        lifecycleApp({
          status: "Rejected",
          candidateLifecycleStage: "rejected",
          rejectionStage: "preboarding",
          candidateVisibleStatus: "Rejected \u00b7 Pre-boarding",
          showCongratulations: false,
        }),
      ],
    });
    render(<MyApplicationsPage />);
    const badge = await screen.findByTestId("application-status-badge");
    expect(badge.className).toContain("w-fit");
    // globals.scss zeroes padding (!important) on every non-form element with `max-w-full`;
    // the pill must not carry it or it renders as a border hugging the text.
    expect(badge.className).not.toContain("max-w-full");
    expect(badge.className).not.toMatch(/\bw-\d/);
    // Full stage text stays readable — no truncation of the rejection stage.
    expect(badge).toHaveTextContent("Rejected \u00b7 Pre-boarding");
  });

  it("keeps the View action reachable alongside a long badge", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [
        lifecycleApp({
          status: "Rejected",
          candidateLifecycleStage: "rejected",
          rejectionStage: "onboarding",
          candidateVisibleStatus: "Rejected \u00b7 Onboarding",
          showCongratulations: false,
        }),
      ],
    });
    render(<MyApplicationsPage />);
    await screen.findByTestId("application-status-badge");
    expect(screen.getByRole("link", { name: /View/ })).toBeInTheDocument();
  });
});

describe("MyApplicationsPage status filter", () => {
  function row(overrides: Partial<JobApplication> & Record<string, unknown>): JobApplication {
    return {
      _id: "app-1",
      status: "Offered",
      job: { _id: "job-1", title: "Role", organisation: { name: "Co" } },
      candidate: { fullName: "Candidate" },
      ...overrides,
    } as JobApplication;
  }

  /**
   * Regression: the filter used to hit the server on `JobApplication.status`, while the badge is
   * derived from Offer/Placement after the query. An offer-stage rejection keeps status "Offered",
   * so filtering "Rejected" could not return the row whose badge reads "Rejected · Offer".
   */
  it("filters on the badge the candidate can actually see, not the raw application status", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [
        row({
          _id: "a1",
          status: "Offered",
          candidateLifecycleStage: "rejected",
          rejectionStage: "offer",
          candidateVisibleStatus: "Rejected · Offer",
          job: { _id: "j1", title: "Rejected Role", organisation: { name: "Co A" } },
        }),
        row({
          _id: "a2",
          status: "Offered",
          candidateLifecycleStage: "offer",
          candidateVisibleStatus: "Offer",
          job: { _id: "j2", title: "Live Role", organisation: { name: "Co B" } },
        }),
      ],
    } as never);
    render(<MyApplicationsPage />);
    await screen.findByText("Rejected Role");

    fireEvent.change(screen.getByLabelText(/Filter applications by status/i), {
      target: { value: "rejected" },
    });

    await waitFor(() => expect(screen.queryByText("Live Role")).toBeNull());
    expect(screen.getByText("Rejected Role")).toBeInTheDocument();
  });

  it("offers only states the badge can display", async () => {
    render(<MyApplicationsPage />);
    const select = await screen.findByLabelText(/Filter applications by status/i);
    const labels = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(labels).toEqual([
      "All statuses",
      "Applied",
      "Screening",
      "Shortlisted",
      "Interview",
      "Offer",
      "Pre-boarding",
      "Onboarding",
      "Hired",
      "Deferred",
      "Rejected",
    ]);
  });

  it("filtering does not re-query the server", async () => {
    const spy = vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [row({ candidateLifecycleStage: "offer", candidateVisibleStatus: "Offer" })],
    } as never);
    render(<MyApplicationsPage />);
    await screen.findByTestId("application-status-badge");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).not.toHaveProperty("status");

    fireEvent.change(screen.getByLabelText(/Filter applications by status/i), {
      target: { value: "hired" },
    });
    await waitFor(() => expect(screen.queryByTestId("application-status-badge")).toBeNull());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  /**
   * Regression: totalItems read `applications.length` (the fetched slice), so a candidate with
   * more applications than the page fetches saw a wrong count and silently lost rows.
   */
  it("warns when the server holds more applications than were fetched", async () => {
    vi.spyOn(jobApplicationsApi, "getMyApplications").mockResolvedValue({
      results: [row({ candidateLifecycleStage: "offer", candidateVisibleStatus: "Offer" })],
      totalResults: 137,
    } as never);
    render(<MyApplicationsPage />);
    expect(await screen.findByTestId("truncated-notice")).toHaveTextContent("137");
  });
});
