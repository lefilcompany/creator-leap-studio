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

export const useEventTracking = () => {
  const { user, team } = useAuth();
  const location = useLocation();
  const lastPageRef = useRef<string>("");

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

  // Track page navigation
  useEffect(() => {
    if (!user?.id) return;

    const currentPage = location.pathname;
    if (currentPage !== lastPageRef.current) {
      trackEvent({
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
  }, [location, user?.id, trackEvent]);

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

  // Global click handler - captures ALL clicks
  useEffect(() => {
    if (!user?.id) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Get the closest interactive element or use the target itself
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
      
      // Build element path for better debugging
      const getElementPath = (el: HTMLElement): string => {
        const parts: string[] = [];
        let current: HTMLElement | null = el;
        let depth = 0;
        while (current && depth < 5) {
          const tag = current.tagName.toLowerCase();
          const id = current.id ? `#${current.id}` : "";
          const cls = current.className && typeof current.className === 'string' 
            ? `.${current.className.split(' ').slice(0, 2).join('.')}` 
            : "";
          parts.unshift(`${tag}${id}${cls}`.slice(0, 30));
          current = current.parentElement;
          depth++;
        }
        return parts.join(' > ');
      };

      // Get meaningful name
      const eventName = 
        clickedElement.getAttribute("data-track") ||
        clickedElement.getAttribute("aria-label") ||
        clickedElement.getAttribute("title") ||
        (clickedElement.textContent?.trim().slice(0, 50)) ||
        clickedElement.tagName.toLowerCase();

      // Get coordinates
      const rect = clickedElement.getBoundingClientRect();
      
      trackClick(eventName, {
        tagName: clickedElement.tagName,
        className: typeof clickedElement.className === 'string' ? clickedElement.className.slice(0, 200) : undefined,
        id: clickedElement.id || undefined,
        href: (clickedElement as HTMLAnchorElement).href || undefined,
        type: (clickedElement as HTMLButtonElement).type || undefined,
        value: (clickedElement as HTMLInputElement).value?.slice(0, 50) || undefined,
        name: clickedElement.getAttribute("name") || undefined,
        role: clickedElement.getAttribute("role") || undefined,
        elementPath: getElementPath(clickedElement),
        position: {
          x: Math.round(event.clientX),
          y: Math.round(event.clientY),
          elementTop: Math.round(rect.top),
          elementLeft: Math.round(rect.left),
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: new Date().toISOString(),
      });
    };

    // Use capture phase to catch all clicks before they're stopped
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [user?.id, trackClick]);

  return { trackEvent, trackClick, trackError, trackPageView };
};
