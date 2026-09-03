/**
 * Delete each offer in turn, reporting which ones failed.
 *
 * The caller used to run this loop inline and discard every error, so a partial delete was
 * indistinguishable from a complete one: the selection cleared, the list refreshed, and the rows
 * that survived looked like rows the user had never selected. Returning the failures lets the
 * caller say so and keep them selected for a retry.
 *
 * Sequential on purpose — these are destructive writes against a shared list, and firing the whole
 * selection at once buys nothing at the sizes this screen deals in.
 *
 * @returns ids that could not be deleted, in the order they were attempted
 */
export async function deleteOffersInBulk(
  ids: Iterable<string>,
  deleteOffer: (id: string) => Promise<unknown>
): Promise<string[]> {
  const failed: string[] = [];
  for (const id of ids) {
    try {
      await deleteOffer(id);
    } catch {
      failed.push(id);
    }
  }
  return failed;
}
