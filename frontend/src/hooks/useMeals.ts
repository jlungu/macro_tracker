import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMeal,
  fetchDailySummary,
  fetchMealHistory,
  logMeal,
  type LogMealPayload,
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
      if (data.new_targets) {
        queryClient.invalidateQueries({ queryKey: ["targets"] });
      }
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
