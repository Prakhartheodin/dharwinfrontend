import { beforeEach, describe, expect, it, vi } from "vitest"

const redirect = vi.fn()

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirect(...args),
}))

describe("legacy curriculum redirects", () => {
  beforeEach(() => {
    redirect.mockClear()
    vi.resetModules()
  })

  it("categories page redirects to setup with folders tab", async () => {
    const mod = await import("../categories/page")
    mod.default()
    expect(redirect).toHaveBeenCalledWith("/training/curriculum/setup?tab=categories")
  })

  it("positions page redirects to setup", async () => {
    const mod = await import("../positions/page")
    mod.default()
    expect(redirect).toHaveBeenCalledWith("/training/curriculum/setup")
  })
})
