import { ErrorToast } from "@/components/toast-provider";

/** Admin action errors use the global notification host. */
export function FeedbackBanner({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    // A new server response may repeat the same error after another attempt.
    return <ErrorToast key={crypto.randomUUID()} message={error} />;
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
