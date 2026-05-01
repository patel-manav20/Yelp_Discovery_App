import { api } from "./api";
import { getToken } from "../utils/storage";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";


export async function getProfile() {
  const { data } = await api.get("/users/me");
  return data;
}

export async function updateProfile(body) {
  const { data } = await api.put("/users/me", body);
  return data;
}

export async function setProfilePhoto(avatar_url) {
  const { data } = await api.post("/users/me/profile-photo", { avatar_url });
  return data;
}

export async function uploadProfilePhoto(file) {
  const formData = new FormData();
  formData.append("file", file);
  const token = getToken();

  const res = await fetch(`${API_BASE}/uploads/profile-photo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || "Profile photo upload failed");
  }
  if (!data?.url) throw new Error("Server did not return a profile photo URL.");
  return data.url;
}

export async function getPreferences() {
  const { data } = await api.get("/preferences/me");
  return data;
}

export async function updatePreferences(body) {
  const { data } = await api.put("/preferences/me", body);
  return data;
}

export async function getHistory({ limit = 100, offset = 0 } = {}) {
  const { data } = await api.get("/users/me/history", {
    params: { limit, offset },
  });
  return data;
}

export async function recordRestaurantView(restaurantId) {
  await api.post("/users/me/restaurant-views", { restaurant_id: restaurantId });
}
