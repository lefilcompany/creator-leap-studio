import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PRESENCE_DELAY_MS = 3000;

export const PresenceTracker = () => {
  const { user, team } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const delayTimer = setTimeout(async () => {
      if (cancelled) return;

      // Start session
      startTimeRef.current = new Date();
      const { data, error } = await supabase
        .from("user_presence_history")
        .insert({
          user_id: user.id,
          team_id: team?.id || null,
          started_at: startTimeRef.current.toISOString(),
        })
        .select("id")
        .single();

      if (!error && data) {
        sessionIdRef.current = data.id;
      }

      // Subscribe to presence channel
      channel = supabase.channel("global-presence", {
        config: { presence: { key: user.id } },
      });

      channel.subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel!.track({
          name: user.name || "Usuário",
          email: user.email || "",
          onlineAt: new Date().toISOString(),
        });
      });
    }, PRESENCE_DELAY_MS);

    const endSession = async () => {
      if (!sessionIdRef.current || !startTimeRef.current) return;
      const endedAt = new Date();
      const durationSeconds = Math.floor(
        (endedAt.getTime() - startTimeRef.current.getTime()) / 1000
      );
      await supabase
        .from("user_presence_history")
        .update({ ended_at: endedAt.toISOString(), duration_seconds: durationSeconds })
        .eq("id", sessionIdRef.current);
    };

    const handleBeforeUnload = () => endSession();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;
      clearTimeout(delayTimer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      endSession();
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id, team?.id]);

  return null;
};
