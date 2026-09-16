import { describe, expect, it } from "vitest";
import { recordingApiError } from "@/shared/components/livekit/recording-api";

describe("recordingApiError", () => {
  it("maps consent_required 409", () => {
    const msg = recordingApiError(
      { response: { status: 409, data: { code: "consent_required", message: "x" } } },
      "fallback"
    );
    expect(msg).toContain("consent");
  });
});
