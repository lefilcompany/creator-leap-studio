import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CreditHistoryItem {
  id: string;
  action_type: string;
  credits_used: number;
  credits_before: number;
  credits_after: number;
  description: string | null;
  metadata: any;
  created_at: string;
  user_id: string;
  profiles: {
    name: string;
  };
}

export const useCreditHistory = (teamId: string | null | undefined) => {
  return useQuery({
    queryKey: ["credit-history", teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from("credit_history")
        .select(`
          *,
          profiles:user_id (
            name
          )
        `)
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as CreditHistoryItem[];
    },
    enabled: !!teamId,
  });
};
