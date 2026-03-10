import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMeal,
  fetchDailySummary,
  fetchMealHistory,
  logMeal,
  updateMeal,
  type LogMealPayload,
  type Macros,
} from "@/lib/api";

export function useDailySummary(date: string) {
  return useQuery({
    queryKey: ["summary", date],
    queryFn: () => fetchDailySummary(date),
  });
}

export function useMealHistory(page = 0) {
  return useQuery({
    queryKey: ["meals", page],
    queryFn: () => fetchMealHistory(page),
  });
}

export function useLogMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LogMealPayload) => logMeal(payload),
    onSuccess: (data) => {
      const today = new Date().toLocaleDateString("en-CA");
      queryClient.invalidateQueries({ queryKey: ["summary", today] });
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      if (data.new_targets) {
        queryClient.invalidateQueries({ queryKey: ["targets"] });
      }
    },
  });
}

export function useUpdateMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { description?: string; macros?: Macros; meal_type?: string } }) =>
      updateMeal(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["meals"] });
    },
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["meals"] });
    },
  });
}
