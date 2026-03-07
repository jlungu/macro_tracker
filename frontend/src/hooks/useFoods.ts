import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteFood, fetchFoods } from "@/lib/api";

export function useFoods() {
  return useQuery({
    queryKey: ["foods"],
    queryFn: () => fetchFoods(),
  });
}

export function useDeleteFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
    },
  });
}
