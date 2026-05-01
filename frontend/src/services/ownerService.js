import { api } from "./api";


export async function getOwnerDashboard() {
  const { data } = await api.get("/owner/dashboard");
  return data;
}

export async function listOwnedRestaurants() {
  const { data } = await api.get("/owner/restaurants");
  return data;
}

export async function listOwnerReviews(opts = {}) {
  const params = {
    sort_by: opts.sort_by || "newest",
    page: opts.page ?? 1,
    limit: opts.limit ?? 20,
  };
  if (opts.restaurant_id != null && opts.restaurant_id !== "") {
    params.restaurant_id = opts.restaurant_id;
  }
  if (opts.min_rating != null && opts.min_rating !== "") {
    params.min_rating = opts.min_rating;
  }
  const { data } = await api.get("/owner/reviews", { params });
  return data;
}
