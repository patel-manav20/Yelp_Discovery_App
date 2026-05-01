
export default function LoadingSpinner({
  label = "Loading…",
  size = "md",
  fullPage = false,
  className = "",
}) {
  const sizeClass =
    size === "sm"
      ? "h-6 w-6 border-2"
      : size === "lg"
        ? "h-12 w-12 border-[3px]"
        : "h-9 w-9 border-2";

  const spinner = (
    <div
      className={`inline-block rounded-full border-gray-200 border-t-yelp-red animate-spin ${sizeClass}`}
      role="status"
      aria-label={label}
    />
  );

  if (fullPage) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 min-h-[200px] text-gray-500 ${className}`}
      >
        {spinner}
        {label ? <span className="text-sm">{label}</span> : null}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 text-gray-500 ${className}`}>
      {spinner}
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}
