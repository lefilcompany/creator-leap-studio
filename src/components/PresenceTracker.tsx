import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Subscribes authenticated users to the global presence channel.
 * This must run outside the admin pages too, otherwise admins will only ever see themselves online.
 * Also tracks presence history for audit purposes.
 */
export const PresenceTracker = () => {
  const { user, team } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Start a presence session
    const startSession = async () => {
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
        console.log("[PresenceTracker] Session started:", data.id);
      } else {
        console.error("[PresenceTracker] Failed to start session:", error);
      }
    };

    // End the presence session
    const endSession = async () => {
      if (!sessionIdRef.current || !startTimeRef.current) return;

      const endedAt = new Date();
      const durationSeconds = Math.floor(
        (endedAt.getTime() - startTimeRef.current.getTime()) / 1000
      );

      await supabase
        .from("user_presence_history")
        .update({
          ended_at: endedAt.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", sessionIdRef.current);

      console.log("[PresenceTracker] Session ended, duration:", durationSeconds);
    };

    startSession();

    // Subscribe to presence channel
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

    // Handle page unload
    const handleBeforeUnload = () => {
      endSession();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      console.log("[PresenceTracker] cleanup");
      window.removeEventListener("beforeunload", handleBeforeUnload);
      endSession();
      supabase.removeChannel(channel);
    };
  }, [user?.id, team?.id]);

  return null;
};
