import { api } from "./api";


export async function listMyFavorites() {
  const { data } = await api.get("/favorites/me");
  return data;
}

export async function addFavorite(restaurantId) {
  const { data } = await api.post(`/favorites/${restaurantId}`);
  return data;
}

export async function removeFavorite(restaurantId) {
  await api.delete(`/favorites/${restaurantId}`);
}
