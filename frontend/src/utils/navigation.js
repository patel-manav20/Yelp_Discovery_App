export function buildReturnPath(loc) {
  if (!loc || typeof loc.pathname !== "string") return "/";
  const pathname = loc.pathname || "/";
  const search = loc.search || "";
  const hash = loc.hash || "";
  return `${pathname}${search}${hash}`;
}
