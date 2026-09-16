import { GOOGLE_REVIEW_URL } from "./constants";

/** Bound clipboard permission waits, including browsers that leave the promise pending. */
export async function continueToGoogle(comment: string): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const trimmed = comment.trim();
    if (trimmed && navigator.clipboard?.writeText) {
      await Promise.race([
        navigator.clipboard.writeText(trimmed),
        new Promise<void>((resolve) => { timeout = setTimeout(resolve, 1200); }),
      ]);
    }
  } catch {
    // A denied or unavailable clipboard still leads to Google.
  } finally {
    clearTimeout(timeout);
    window.location.assign(GOOGLE_REVIEW_URL);
  }
}
