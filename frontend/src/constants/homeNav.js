import { ROUTES } from "./routes";

export const HOME_TOP_CATEGORIES = [
  { label: "Restaurants", q: "restaurants" },
  { label: "Shopping", q: "shopping" },
  { label: "Nightlife", q: "nightlife" },
  { label: "Active Life", q: "active life" },
  { label: "Beauty & Spas", q: "beauty" },
  { label: "Automotive", q: "automotive" },
  { label: "Home Services", q: "home services" },
  { label: "More", q: "services" },
];

export function exploreWithQuery(q) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const s = params.toString();
  return s ? `${ROUTES.EXPLORE}?${s}` : ROUTES.EXPLORE;
}

export const EXPLORE_CATEGORY_ROW = [
  { label: "Restaurants", q: "restaurants" },
  { label: "Home & Garden", q: "home services" },
  { label: "Auto Services", q: "automotive" },
  { label: "Health & Beauty", q: "beauty" },
  { label: "Travel & Activities", q: "things to do" },
  { label: "More", q: "services" },
];
