import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "@/types/database";

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => api.get<Profile>("/profile"),
  });
}
