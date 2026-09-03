import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CongratulationsBanner from "./CongratulationsBanner";
import type { SelectedApplicationItem } from "@/shared/lib/ats/candidateSelection";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href?: string }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(cleanup);

const oneItem: SelectedApplicationItem[] = [
  {
    applicationId: "app-1",
    jobId: "job-1",
    jobTitle: "Data Analyst",
    company: "Dharwin Business Solutions",
    selectionStatus: "Offer",
    relevantDate: "2026-08-15T12:00:00.000Z",
  },
];

const twoItems: SelectedApplicationItem[] = [
  ...oneItem,
  {
    applicationId: "app-2",
    jobId: "job-2",
    jobTitle: "AI/ML Engineer",
    company: "Dharwin Business Solutions",
    selectionStatus: "Offered",
  },
];

describe("CongratulationsBanner", () => {
  it("renders nothing when items are empty", () => {
    const { container } = render(<CongratulationsBanner items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows congratulations copy for one selected job", () => {
    render(<CongratulationsBanner items={oneItem} />);
    expect(screen.getByText(/Congratulations!/)).toBeTruthy();
    expect(screen.getByText(/You've Been Selected!/)).toBeTruthy();
    expect(screen.getByText("Data Analyst")).toBeTruthy();
    expect(screen.getByText("Dharwin Business Solutions")).toBeTruthy();
  });

  it("lists multiple selected jobs in one banner", () => {
    render(<CongratulationsBanner items={twoItems} />);
    const rows = screen.getAllByTestId("congratulations-selected-item");
    expect(rows).toHaveLength(2);
    expect(screen.getByText("AI/ML Engineer")).toBeTruthy();
  });

  it("uses responsive stack layout classes without horizontal overflow traps", () => {
    render(<CongratulationsBanner items={twoItems} />);
    const banner = screen.getByTestId("congratulations-banner");
    const list = screen.getByTestId("congratulations-selected-list");
    expect(banner.className).toMatch(/overflow-hidden/);
    expect(list.className).toMatch(/flex-col/);
  });

  it("shows the decorative CTA and accessible heading hierarchy", () => {
    render(<CongratulationsBanner items={oneItem} />);
    expect(screen.getByRole("heading", { level: 2, name: /You've Been Selected!/ })).toBeTruthy();
    expect(screen.getByLabelText("Well Done! Keep Shining")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: /Selected position$/ })).toBeTruthy();
  });

  it("uses plural heading when multiple positions are selected", () => {
    render(<CongratulationsBanner items={twoItems} />);
    expect(screen.getByRole("heading", { level: 3, name: /Selected positions/ })).toBeTruthy();
    expect(screen.getByText(/positions listed here/)).toBeTruthy();
  });
});
