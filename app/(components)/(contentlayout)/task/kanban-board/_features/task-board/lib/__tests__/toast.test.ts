import { describe, expect, it, vi, beforeEach } from "vitest";

describe("toast", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("calls Swal.fire for success", async () => {
    const fire = vi.fn().mockResolvedValue({});
    vi.doMock("sweetalert2", () => ({ default: { fire } }));
    const { toast } = await import("../toast");
    await toast.success("Done");
    expect(fire).toHaveBeenCalled();
  });
});
