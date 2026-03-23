import { api } from "./api";

/**
 * Auth API — login and signup (diner + owner).
 */

export async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function signup({ email, password, display_name }) {
  const { data } = await api.post("/auth/signup", {
    email,
    password,
    display_name,
  });
  return data;
}

export async function ownerSignup({ email, password, display_name }) {
  const { data } = await api.post("/auth/owner-signup", {
    email,
    password,
    display_name,
  });
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data;
}
