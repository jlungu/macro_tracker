import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

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
  macros: Macros;
  image_url: string | null;
  raw_input: string;
  notes: string | null;
}

export interface LogMealPayload {
  message: string;
  image_base64?: string;
  image_mime_type?: string;
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

// Log a meal via text and/or image
export async function logMeal(payload: LogMealPayload): Promise<LogMealResponse> {
  const { data } = await api.post<LogMealResponse>("/meals/log", payload);
  return data;
}

// Fetch meals for a given date (ISO string, e.g. "2024-01-15")
export async function fetchDailySummary(date: string): Promise<DailySummary> {
  const { data } = await api.get<DailySummary>(`/meals/summary/${date}`);
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

export async function fetchTargets(): Promise<Targets> {
  const { data } = await api.get<Targets>("/targets");
  return data;
}

export async function updateTargets(targets: Targets): Promise<Targets> {
  const { data } = await api.put<Targets>("/targets", targets);
  return data;
}

export default api;
