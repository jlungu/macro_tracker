import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTargets, updateTargets, type Targets } from "@/lib/api";

export function useTargets() {
  return useQuery({
    queryKey: ["targets"],
    queryFn: fetchTargets,
  });
}

export function useUpdateTargets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targets: Targets) => updateTargets(targets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
    },
  });
}
