import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export const IncompleteProfileBanner = () => {
  const { user } = useAuth();

  const { data: isGoogleUserWithIncompleteProfile } = useQuery({
    queryKey: ['incomplete-profile-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      // Check if user signed up via Google (has avatar_url from Google)
      const { data: session } = await supabase.auth.getSession();
      const provider = session?.session?.user?.app_metadata?.provider;
      if (provider !== 'google') return false;

      // Check if profile is missing phone
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();

      return !profile?.phone;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
  });

  if (!isGoogleUserWithIncompleteProfile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        to="/profile"
        className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors group"
      >
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span className="flex-1">
          Seu perfil está incompleto. Adicione seu telefone para aproveitar todos os recursos.
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    </motion.div>
  );
};
