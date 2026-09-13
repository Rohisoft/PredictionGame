import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

interface AdminAddPointsParams {
  userEmail: string;
  amount: number;
  description?: string;
}

export function useAdminAddPoints() {
  return useMutation({
    mutationFn: async ({ userEmail, amount, description }: AdminAddPointsParams) => {
      const { data, error } = await supabase.rpc("admin_add_points", {
        p_user_email: userEmail,
        p_amount: amount,
        p_description: description ?? null,
      });
      if (error) throw error;
      return data;
    },
  });
}
