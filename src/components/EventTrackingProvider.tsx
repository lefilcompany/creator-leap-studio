import { useEventTracking } from "@/hooks/useEventTracking";

export const EventTrackingProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize global event tracking
  useEventTracking();
  
  return <>{children}</>;
};
