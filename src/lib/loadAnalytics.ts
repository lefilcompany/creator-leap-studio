/**
 * Defers loading of third-party analytics/pixels (GTM, GA4, Meta Pixel)
 * until the browser is idle and the user has interacted, keeping them
 * off the critical path and out of the initial main-thread budget.
 *
 * Trade-off: PageView events fire a few seconds late instead of at
 * navigation start. Acceptable for marketing analytics and required to
 * keep LCP/TBT healthy on mobile.
 */

const GTM_ID = "GTM-M327G9XV";
const GA4_ID = "G-BYKEFSGTTC";
const META_PIXEL_ID = "713068141397352";

let started = false;

type DataLayerEntry = Record<string, unknown> | unknown[] | IArguments;

declare global {
  interface Window {
    dataLayer?: DataLayerEntry[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      push?: unknown;
      loaded?: boolean;
      version?: string;
    };
    _fbq?: Window["fbq"];
  }
}

const injectScript = (src: string) => {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
  return s;
};

const loadGtm = () => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  injectScript(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
};

const loadGa4 = () => {
  window.dataLayer = window.dataLayer || [];
  const gtag = (...args: unknown[]) => {
    window.dataLayer!.push(args as unknown as DataLayerEntry);
  };
  window.gtag = window.gtag || gtag;
  window.gtag("js", new Date());
  window.gtag("config", GA4_ID);
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`);
};

const loadMetaPixel = () => {
  if (window.fbq) return;
  const n: Window["fbq"] = function (...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (n as any).callMethod
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (n as any).callMethod.apply(n, args)
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (n as any).queue.push(args);
  } as Window["fbq"];
  window.fbq = n;
  window._fbq = window._fbq || n;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (n as any).push = n;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (n as any).loaded = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (n as any).version = "2.0";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (n as any).queue = [];
  injectScript("https://connect.facebook.net/en_US/fbevents.js");
  window.fbq!("init", META_PIXEL_ID);
  window.fbq!("track", "PageView");
};

const start = () => {
  if (started) return;
  started = true;
  try {
    loadGtm();
    loadGa4();
    loadMetaPixel();
  } catch (err) {
    console.warn("[analytics] failed to bootstrap third-party scripts", err);
  }
};

export const scheduleAnalytics = () => {
  if (typeof window === "undefined" || started) return;

  const trigger = () => start();

  // Kick off as soon as the browser is idle...
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(trigger, { timeout: 4000 });
  } else {
    window.setTimeout(trigger, 2500);
  }

  // ...or on the first user interaction, whichever comes first.
  const onInteract = () => {
    trigger();
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach((ev) =>
      window.removeEventListener(ev, onInteract),
    );
  };
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, onInteract, { once: true, passive: true }),
  );
};
