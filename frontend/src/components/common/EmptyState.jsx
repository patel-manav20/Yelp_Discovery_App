
export default function EmptyState({
  icon,
  title = "Nothing here yet",
  description,
  action,
  className = "",
}) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gray-50/80 px-6 py-12 text-center shadow-sm ${className}`}
    >
      {icon ? (
        <div className="mx-auto mb-4 text-gray-400 flex justify-center">{icon}</div>
      ) : (
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
      )}
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
