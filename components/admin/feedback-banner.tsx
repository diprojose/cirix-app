/**
 * FeedbackBanner renders the outcome the admin actions passed back via query
 * params: a red banner for `error`, a green-ish one for success messages.
 * Server component — the params come from the page's `searchParams`.
 */
export function FeedbackBanner({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return (
      <p role="alert" className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p className="mb-4 rounded-xl bg-action-fill/10 px-4 py-3 text-sm font-medium text-action-strong">
        {success}
      </p>
    );
  }
  return null;
}
