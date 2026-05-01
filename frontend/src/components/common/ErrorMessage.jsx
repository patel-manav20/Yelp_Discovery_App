
export default function ErrorMessage({
  title = "Something went wrong",
  message,
  className = "",
  onDismiss,
}) {
  if (!message && !title) return null;

  return (
    <div
      role="alert"
      className={`rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800 shadow-sm ${className}`}
    >
      <div className="flex gap-3">
        <span className="text-yelp-red shrink-0 mt-0.5" aria-hidden>
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          {title ? <p className="font-semibold text-sm">{title}</p> : null}
          {message ? (
            <p className={`text-sm ${title ? "mt-1" : ""}`}>{message}</p>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-red-700 hover:text-red-900 text-sm font-medium"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
