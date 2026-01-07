import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Subscribes authenticated users to the global presence channel.
 * This must run outside the admin pages too, otherwise admins will only ever see themselves online.
 */
export const PresenceTracker = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel("global-presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel.subscribe(async (status) => {
      console.log("[PresenceTracker] subscribe status:", status);

      if (status !== "SUBSCRIBED") return;

      const payload = {
        name: user.name || "Usuário",
        email: user.email || "",
        onlineAt: new Date().toISOString(),
      };

      const res = await channel.track(payload);
      console.log("[PresenceTracker] track result:", res);
    });

    return () => {
      console.log("[PresenceTracker] cleanup");
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return null;
};
