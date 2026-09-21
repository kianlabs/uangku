import { apiFetch } from "./api";
import type { User } from "./types";

export async function getMe(): Promise<User> {
  return apiFetch<User>("/api/v1/auth/me");
}

export async function login(email: string, password: string): Promise<User> {
  const data = await apiFetch<{ user: User }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function register(email: string, password: string): Promise<User> {
  const data = await apiFetch<{ user: User }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/api/v1/auth/logout", { method: "POST" });
}
