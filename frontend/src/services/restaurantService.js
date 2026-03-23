import { api } from "./api";
import { getToken } from "../utils/storage";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function uploadErrorMessage(payload, statusText) {
  const d = payload?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length) {
    return d.map((x) => (typeof x === "string" ? x : x?.msg || JSON.stringify(x))).join("; ");
  }
  if (d != null) return String(d);
  return statusText || "Upload failed";
}

/**
 * Restaurant search and detail — matches GET /restaurants and GET /restaurants/{id}.
 */

function cleanParams(obj) {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    out[k] = v;
  });
  return out;
}

/** Backend allows up to 500 rows per page; use `page` to fetch the rest. */
export const RESTAURANT_LIST_MAX_LIMIT = 500;

/**
 * @param {object} opts
 * @param {string} [opts.query] — broad text (name, description, city, address)
 * @param {string} [opts.city] — omit to include all cities in the database
 * @param {string} [opts.zip]
 * @param {string} [opts.cuisine]
 * @param {string} [opts.keyword]
 * @param {number} [opts.price] — 1–4
 * @param {number} [opts.rating] — minimum average rating
 * @param {string} [opts.dietary]
 * @param {string} [opts.ambiance]
 * @param {string} [opts.sort_by] — rating_desc | rating_asc | name_asc | name_desc | newest
 * @param {number} [opts.page]
 * @param {number} [opts.limit] — 1…500
 * @param {boolean} [opts.full] — if true, each item matches GET /restaurants/:id (all fields)
 */
export async function searchRestaurants(opts = {}) {
  const lim = opts.limit ?? 20;
  const params = cleanParams({
    query: opts.query,
    city: opts.city,
    zip: opts.zip,
    cuisine: opts.cuisine,
    keyword: opts.keyword,
    price: opts.price,
    rating: opts.rating,
    dietary: opts.dietary,
    ambiance: opts.ambiance,
    sort_by: opts.sort_by || "rating_desc",
    page: opts.page ?? 1,
    limit: Math.min(Math.max(1, lim), RESTAURANT_LIST_MAX_LIMIT),
    full: opts.full === true ? true : undefined,
    open_now: opts.open_now === true ? true : undefined,
  });
  const { data } = await api.get("/restaurants", { params });
  return data;
}

/**
 * Fetches every matching restaurant by walking pages (same filters as `searchRestaurants`).
 * @param {object} opts — same as searchRestaurants, except `page` is ignored
 * @param {number} [opts.pageSize] — per request (default 100, max 500)
 */
export async function searchAllRestaurants(opts = {}) {
  const pageSize = Math.min(
    Math.max(1, opts.pageSize ?? 100),
    RESTAURANT_LIST_MAX_LIMIT
  );
  const { page: _p, ...rest } = opts;
  const all = [];
  let page = 1;
  let total = Infinity;
  while (all.length < total) {
    const data = await searchRestaurants({ ...rest, page, limit: pageSize });
    const batch = data.items || [];
    total = data.total ?? batch.length;
    all.push(...batch);
    if (batch.length < pageSize || all.length >= total) break;
    page += 1;
  }
  return all;
}

/** Map Explore sort chip to Yelp Fusion ``sort_by`` (see GET /restaurants/yelp). */
export function yelpExploreSortParam(sortBy) {
  const m = {
    rating_desc: "rating",
    rating_asc: "rating",
    name_asc: "best_match",
    name_desc: "best_match",
    newest: "review_count",
  };
  return m[sortBy] || "best_match";
}

/**
 * Live Yelp Fusion search for Explore (not limited to MySQL rows).
 * Returns the same ``items`` / ``total`` / ``page`` shape as ``searchRestaurants``.
 */
export async function searchYelpRestaurantsExplore(opts = {}) {
  const lim = Math.min(Math.max(1, opts.limit ?? 20), 50);
  const params = cleanParams({
    term: opts.term,
    city: opts.city,
    limit: lim,
    page: opts.page ?? 1,
    price: opts.price,
    sort_by: opts.sort_by,
    open_now: opts.open_now === true ? true : undefined,
  });
  const { data } = await api.get("/restaurants/yelp", { params });
  const restaurants = data.restaurants || [];
  const items = restaurants.map((r) => ({
    ...r,
    id: r.yelp_id || r.id,
    average_rating: Number(r.average_rating) || 0,
    review_count: Number(r.review_count) || 0,
    primary_photo_url: r.primary_photo_url || (r.photos && r.photos[0]) || null,
  }));
  return {
    items,
    total: typeof data.total === "number" ? data.total : items.length,
    page: data.page ?? opts.page ?? 1,
    limit: data.limit ?? lim,
    source: "yelp",
  };
}

export async function getRestaurant(id) {
  const { data } = await api.get(`/restaurants/${id}`);
  return data;
}

/** Live Yelp business detail (same data the backend proxies from Fusion). */
export async function getYelpRestaurantDetail(yelpBusinessId, opts = {}) {
  const yid = encodeURIComponent(String(yelpBusinessId).trim());
  const params =
    opts.persist === true ? { persist: true } : undefined;
  const { data } = await api.get(`/restaurants/yelp/${yid}`, { params });
  return data;
}

export async function createRestaurant(body) {
  const { data } = await api.post("/restaurants", body);
  return data;
}

export async function updateRestaurant(id, body) {
  const { data } = await api.put(`/restaurants/${id}`, body);
  return data;
}

export async function importFromYelp(yelpBusinessId) {
  const { data } = await api.post("/restaurants/import-from-yelp", {
    yelp_business_id: yelpBusinessId,
  });
  return data;
}

export async function claimRestaurant(restaurantId, message) {
  const { data } = await api.post(`/restaurants/${restaurantId}/claim`, {
    message: message?.trim() || null,
  });
  return data;
}

/** Upload one image; returns absolute URL (requires auth). */
export async function uploadRestaurantPhoto(file) {
  const formData = new FormData();
  formData.append("file", file);
  const token = getToken();
  const res = await fetch(`${API_BASE}/uploads/restaurant-photo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(uploadErrorMessage(data, res.statusText));
  }
  if (!data.url) throw new Error("Server did not return an image URL.");
  return data.url;
}
