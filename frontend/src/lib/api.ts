import axios from "axios";
import { supabase } from "@/lib/supabase";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Targets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Meal {
  id: string;
  created_at: string;
  description: string;
  emoji: string;
  macros: Macros;
  image_url: string | null;
  raw_input: string;
  notes: string | null;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LogMealPayload {
  message: string;
  image_base64?: string;
  image_mime_type?: string;
  history?: HistoryMessage[];
  log_date?: string; // YYYY-MM-DD, set when backdating a meal
}

export interface LogMealResponse {
  meal: Meal | null;
  claude_message: string;
  new_targets: Targets | null;
}

export interface DailySummary {
  date: string;
  meals: Meal[];
  totals: Macros;
}

export interface FoodItem {
  id: string;
  name: string;
  serving_size: string;
  macros: Macros;
  use_count: number;
}

// Log a meal via text and/or image
export async function logMeal(payload: LogMealPayload): Promise<LogMealResponse> {
  const { data } = await api.post<LogMealResponse>("/meals/log", {
    ...payload,
    tz_offset: new Date().getTimezoneOffset(),
  });
  return data;
}

// Fetch meals for a given date (ISO string, e.g. "2024-01-15")
export async function fetchDailySummary(date: string): Promise<DailySummary> {
  const { data } = await api.get<DailySummary>(`/meals/summary/${date}`, {
    params: { tz_offset: new Date().getTimezoneOffset() },
  });
  return data;
}

// Fetch paginated meal history
export async function fetchMealHistory(
  page = 0,
  pageSize = 20
): Promise<Meal[]> {
  const { data } = await api.get<Meal[]>("/meals", {
    params: { offset: page * pageSize, limit: pageSize },
  });
  return data;
}

// Delete a meal
export async function deleteMeal(id: string): Promise<void> {
  await api.delete(`/meals/${id}`);
}

// Patch a meal's description and/or macros
export async function updateMeal(
  id: string,
  patch: { description?: string; macros?: Macros }
): Promise<Meal> {
  const { data } = await api.patch<Meal>(`/meals/${id}`, patch);
  return data;
}

export async function fetchFoods(limit = 200): Promise<FoodItem[]> {
  const { data } = await api.get<FoodItem[]>("/foods", { params: { limit } });
  return data;
}

export async function deleteFood(id: string): Promise<void> {
  await api.delete(`/foods/${id}`);
}

export async function fetchTargets(): Promise<Targets> {
  const { data } = await api.get<Targets>("/targets");
  return data;
}

export async function updateTargets(targets: Targets): Promise<Targets> {
  const { data } = await api.put<Targets>("/targets", targets);
  return data;
}

export default api;
