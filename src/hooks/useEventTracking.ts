import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

interface TrackEventParams {
  eventType: "click" | "error" | "page_view";
  eventName: string;
  eventData?: Record<string, unknown>;
  pageUrl?: string;
}

export const useEventTracking = () => {
  const { user, team } = useAuth();

  const trackEvent = useCallback(
    async ({ eventType, eventName, eventData, pageUrl }: TrackEventParams) => {
      if (!user?.id) return;

      try {
        await supabase.from("user_events").insert([{
          user_id: user.id,
          team_id: team?.id || null,
          event_type: eventType,
          event_name: eventName,
          event_data: (eventData as Json) || null,
          page_url: pageUrl || window.location.pathname,
        }]);
      } catch (error) {
        console.error("Failed to track event:", error);
      }
    },
    [user?.id, team?.id]
  );

  const trackClick = useCallback(
    (eventName: string, eventData?: Record<string, unknown>) => {
      trackEvent({
        eventType: "click",
        eventName,
        eventData,
      });
    },
    [trackEvent]
  );

  const trackError = useCallback(
    (errorMessage: string, errorData?: Record<string, unknown>) => {
      trackEvent({
        eventType: "error",
        eventName: errorMessage,
        eventData: {
          ...errorData,
          timestamp: new Date().toISOString(),
        },
      });
    },
    [trackEvent]
  );

  const trackPageView = useCallback(
    (pageName: string) => {
      trackEvent({
        eventType: "page_view",
        eventName: pageName,
      });
    },
    [trackEvent]
  );

  // Global error handler
  useEffect(() => {
    if (!user?.id) return;

    const handleError = (event: ErrorEvent) => {
      trackError(event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError("Unhandled Promise Rejection", {
        reason: String(event.reason),
        stack: event.reason?.stack,
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [user?.id, trackError]);

  // Global click handler
  useEffect(() => {
    if (!user?.id) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Only track clicks on interactive elements
      const interactiveElements = ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"];
      const isInteractive = interactiveElements.includes(target.tagName) ||
        target.closest("button") ||
        target.closest("a") ||
        target.getAttribute("role") === "button" ||
        target.getAttribute("data-track");

      if (!isInteractive) return;

      const clickedElement = target.closest("button") || target.closest("a") || target;
      
      const eventName = 
        clickedElement.getAttribute("data-track") ||
        clickedElement.getAttribute("aria-label") ||
        clickedElement.textContent?.trim().slice(0, 50) ||
        clickedElement.tagName.toLowerCase();

      trackClick(eventName, {
        tagName: clickedElement.tagName,
        className: clickedElement.className,
        id: clickedElement.id || undefined,
        href: (clickedElement as HTMLAnchorElement).href || undefined,
        type: (clickedElement as HTMLButtonElement).type || undefined,
      });
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [user?.id, trackClick]);

  return { trackEvent, trackClick, trackError, trackPageView };
};
