
function hashSeed(id, listIndex) {
  const s = `${id}#${listIndex}`;
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export const FALLBACK_KEYWORDS = [
  "Desserts",
  "Latin American",
  "Salad",
  "Italian",
  "Cocktail Bars",
  "Breakfast",
  "Seafood",
  "Vegan",
  "Mexican",
  "Japanese",
  "Wine Bars",
  "Pizza",
];

const SNIPPETS = [
  (city) =>
    `We went here for lunch to this hidden gem in ${city}. We made a reservation in case they were busy but being a Friday afternoon, it was not busy....`,
  (city) =>
    `The food was excellent and portions were generous. Service was attentive without being overbearing. We'll definitely be back next time we're in ${city}.`,
  (city) =>
    `Cozy atmosphere and great for a date night. Noise level was comfortable. Parking was easier than expected near ${city}.`,
  (city) =>
    `Ordered takeout and everything arrived hot. Flavors were balanced and the packaging was solid. Recommended if you're around ${city}.`,
  (city) =>
    `Friendly staff, fair prices, and consistent quality. Good option for groups—our party of six had no issues getting seated.`,
];

export function resolveReviewSnippet(description, id, listIndex, cityShort) {
  const t = (description || "").trim();
  if (t.length > 40) return t;
  const city = cityShort || "town";
  const i = hashSeed(id, listIndex) % SNIPPETS.length;
  return SNIPPETS[i](city);
}

export function resolveKeywords(cuisineTags, id, listIndex) {
  const fromApi = Array.isArray(cuisineTags) ? cuisineTags.filter(Boolean) : [];
  const h = hashSeed(id, listIndex);
  const out = [...fromApi];
  let k = 0;
  while (out.length < 3 && k < 24) {
    const tag = FALLBACK_KEYWORDS[(h + k * 7) % FALLBACK_KEYWORDS.length];
    if (!out.includes(tag)) out.push(tag);
    k += 1;
  }
  return out.slice(0, 6);
}

export function resolveHoursStatus(restaurant, listIndex) {
  const id = String(restaurant.id ?? "");
  const h = hashSeed(id, listIndex);

  if (restaurant.is_closed === true) {
    return { type: "closed" };
  }

  const mode = h % 4;
  if (mode === 1) {
    return { type: "open_now" };
  }
  if (mode === 2) {
    return { type: "opens_in", minutes: 15 };
  }

  const hour24 = 19 + (h % 3);
  const minute = h % 2 === 0 ? "00" : "30";
  const displayHour = hour24 > 12 ? hour24 - 12 : hour24;
  return { type: "open_until", until: `${displayHour}:${minute} PM` };
}
