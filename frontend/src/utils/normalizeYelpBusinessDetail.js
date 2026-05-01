export function normalizeYelpDetailForPage(api) {
  if (!api || typeof api !== "object") return null;
  const pr = String(api.price_range || "$$").trim();
  const price_level = pr.startsWith("$") ? Math.min(4, pr.length) : 2;
  const photos = (api.photos || []).map((url, i) => ({
    id: i,
    photo_url: url,
    sort_order: i,
  }));
  const cuisine_tags =
    Array.isArray(api.cuisine_tags) && api.cuisine_tags.length
      ? api.cuisine_tags
      : api.cuisine_type
        ? [api.cuisine_type]
        : [];

  const localId = api.local_restaurant_id;
  const local_restaurant_id =
    localId != null && localId !== "" && Number.isFinite(Number(localId)) ? Number(localId) : null;

  return {
    id: null,
    local_restaurant_id,
    yelp_business_id: api.yelp_id || api.id,
    name: api.name,
    average_rating: Number(api.average_rating) || 0,
    review_count: Number(api.review_count) || 0,
    price_level,
    cuisine_tags,
    description: typeof api.description === "string" ? api.description : "",
    address_line: api.address_line || api.address || null,
    city: api.city || "",
    state: api.state || null,
    postal_code: api.postal_code || api.zip_code || null,
    country: api.country || "US",
    phone: api.phone || null,
    website_url: api.website_url || null,
    yelp_url: api.yelp_url || null,
    hours: Array.isArray(api.hours) ? api.hours : [],
    transactions: Array.isArray(api.transactions) ? api.transactions : [],
    photos,
    is_claimed: false,
    owner_user_id: null,
    is_closed: api.is_closed,
  };
}
