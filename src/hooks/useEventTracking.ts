import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";
import { useLocation } from "react-router-dom";

interface TrackEventParams {
  eventType: "click" | "error" | "page_view" | "navigation";
  eventName: string;
  eventData?: Record<string, unknown>;
  pageUrl?: string;
}

interface QueuedEvent {
  user_id: string;
  team_id: string | null;
  event_type: string;
  event_name: string;
  event_data: Json | null;
  page_url: string;
}

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH_SIZE = 50;

// Module-level buffer shared across hook instances
let eventBuffer: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let activeInstances = 0;

const flushEvents = async () => {
  if (eventBuffer.length === 0) return;
  const batch = eventBuffer.splice(0, MAX_BATCH_SIZE);
  try {
    await supabase.from("user_events").insert(batch);
  } catch (error) {
    // Re-add failed events to front of buffer (best-effort)
    eventBuffer.unshift(...batch);
  }
};

export const useEventTracking = () => {
  const { user, team } = useAuth();
  const location = useLocation();
  const lastPageRef = useRef<string>("");

  // Manage flush interval lifecycle
  useEffect(() => {
    activeInstances++;
    if (!flushTimer) {
      flushTimer = setInterval(flushEvents, FLUSH_INTERVAL_MS);
    }

    const handleBeforeUnload = () => {
      if (eventBuffer.length > 0) {
        const blob = new Blob([JSON.stringify(eventBuffer)], { type: "application/json" });
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_events`;
        navigator.sendBeacon(url, blob);
        eventBuffer = [];
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      activeInstances--;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (activeInstances === 0 && flushTimer) {
        flushEvents(); // Final flush
        clearInterval(flushTimer);
        flushTimer = null;
      }
    };
  }, []);

  const enqueueEvent = useCallback(
    (params: TrackEventParams) => {
      if (!user?.id) return;
      eventBuffer.push({
        user_id: user.id,
        team_id: team?.id || null,
        event_type: params.eventType,
        event_name: params.eventName.slice(0, 200),
        event_data: (params.eventData as Json) || null,
        page_url: params.pageUrl || window.location.pathname,
      });
      // Auto-flush if buffer is large
      if (eventBuffer.length >= MAX_BATCH_SIZE) {
        flushEvents();
      }
    },
    [user?.id, team?.id]
  );

  const trackClick = useCallback(
    (eventName: string, eventData?: Record<string, unknown>) => {
      enqueueEvent({ eventType: "click", eventName, eventData });
    },
    [enqueueEvent]
  );

  const trackError = useCallback(
    (errorMessage: string, errorData?: Record<string, unknown>) => {
      enqueueEvent({
        eventType: "error",
        eventName: errorMessage,
        eventData: { ...errorData, timestamp: new Date().toISOString() },
      });
    },
    [enqueueEvent]
  );

  const trackPageView = useCallback(
    (pageName: string) => {
      enqueueEvent({ eventType: "page_view", eventName: pageName });
    },
    [enqueueEvent]
  );

  // Track page navigation
  useEffect(() => {
    if (!user?.id) return;
    const currentPage = location.pathname;
    if (currentPage !== lastPageRef.current) {
      enqueueEvent({
        eventType: "navigation",
        eventName: `Navegou para ${currentPage}`,
        eventData: {
          from: lastPageRef.current || "initial",
          to: currentPage,
          search: location.search,
          hash: location.hash,
        },
        pageUrl: currentPage,
      });
      lastPageRef.current = currentPage;
    }
  }, [location, user?.id, enqueueEvent]);

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

  // Global click handler - batched
  useEffect(() => {
    if (!user?.id) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickedElement =
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[role='button']") ||
        target.closest("[data-track]") ||
        target.closest("input") ||
        target.closest("select") ||
        target.closest("textarea") ||
        target.closest("[data-radix-collection-item]") ||
        target;

      const eventName =
        clickedElement.getAttribute("data-track") ||
        clickedElement.getAttribute("aria-label") ||
        clickedElement.getAttribute("title") ||
        clickedElement.textContent?.trim().slice(0, 50) ||
        clickedElement.tagName.toLowerCase();

      trackClick(eventName, {
        tagName: clickedElement.tagName,
        id: clickedElement.id || undefined,
        href: (clickedElement as HTMLAnchorElement).href || undefined,
        timestamp: new Date().toISOString(),
      });
    };
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [user?.id, trackClick]);

  return { trackEvent: enqueueEvent, trackClick, trackError, trackPageView };
};
