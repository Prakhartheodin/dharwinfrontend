import { describe, it, expect, vi } from "vitest";
import { deleteOffersInBulk } from "./delete-offers-in-bulk";

describe("deleteOffersInBulk", () => {
  it("reports nothing failed when every delete succeeds", async () => {
    const deleteOffer = vi.fn().mockResolvedValue(undefined);
    const failed = await deleteOffersInBulk(["a", "b", "c"], deleteOffer);
    expect(failed).toEqual([]);
    expect(deleteOffer).toHaveBeenCalledTimes(3);
  });

  it("returns the ids that failed instead of swallowing them", async () => {
    // The old loop caught and discarded, so a partial delete looked identical to a full one.
    const deleteOffer = vi.fn(async (id: string) => {
      if (id === "b") throw new Error("403");
    });
    expect(await deleteOffersInBulk(["a", "b", "c"], deleteOffer)).toEqual(["b"]);
  });

  it("keeps going after a failure so one bad row cannot block the rest", async () => {
    const deleteOffer = vi.fn(async (id: string) => {
      if (id !== "c") throw new Error("nope");
    });
    expect(await deleteOffersInBulk(["a", "b", "c"], deleteOffer)).toEqual(["a", "b"]);
    expect(deleteOffer).toHaveBeenCalledTimes(3);
  });

  it("reports every id when they all fail", async () => {
    const deleteOffer = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await deleteOffersInBulk(["a", "b"], deleteOffer)).toEqual(["a", "b"]);
  });

  it("handles an empty selection without calling the delete", async () => {
    const deleteOffer = vi.fn();
    expect(await deleteOffersInBulk([], deleteOffer)).toEqual([]);
    expect(deleteOffer).not.toHaveBeenCalled();
  });
});
