export function getApiErrorMessage(err, fallback = "Something went wrong") {
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d.map((e) => e.msg || JSON.stringify(e)).join(" ");
  }
  if (d && typeof d === "object" && d.msg) return d.msg;
  return fallback;
}
