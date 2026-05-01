import { api } from "./api";


export async function listReviewsForRestaurant(restaurantId, { page = 1, limit = 20 } = {}) {
  const { data } = await api.get(`/restaurants/${restaurantId}/reviews`, {
    params: { page, limit },
  });
  return data;
}

export async function createReview(body) {
  const { data } = await api.post("/reviews", body);
  return data;
}
