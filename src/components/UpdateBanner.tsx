import { useState, useEffect, useCallback } from "react";
import { RefreshCw, X } from "lucide-react";

const BUILD_TIMESTAMP = Date.now().toString();
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function UpdateBanner() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      // Fetch index.html with cache-busting to detect new builds
      const res = await fetch(`/?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "text/html" },
      });
      if (!res.ok) return;
      const html = await res.text();

      // Compare script/css hashes — if they changed, there's a new version
      const currentScripts = document.querySelectorAll('script[src], link[rel="stylesheet"][href]');
      const currentHashes = new Set<string>();
      currentScripts.forEach((el) => {
        const src = el.getAttribute("src") || el.getAttribute("href");
        if (src) currentHashes.add(src);
      });

      // Extract src/href from fetched HTML
      const srcMatches = html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g);
      let foundNew = false;
      for (const match of srcMatches) {
        if (!currentHashes.has(match[1])) {
          foundNew = true;
          break;
        }
      }

      if (foundNew) {
        setHasUpdate(true);
      }
    } catch {
      // silently ignore network errors
    }
  }, []);

  useEffect(() => {
    // Initial check after 30 seconds
    const initialTimeout = setTimeout(checkForUpdate, 30_000);
    // Then check periodically
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkForUpdate]);

  if (!hasUpdate || dismissed) return null;

  const handleUpdate = () => {
    // Clear caches and reload
    if ("caches" in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
    window.location.reload();
  };

  return (
    <div className="w-full bg-primary text-primary-foreground flex items-center justify-center gap-3 px-4 py-1.5 text-sm font-medium z-[9999] relative animate-in slide-in-from-top-2 duration-300">
      <RefreshCw className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="text-xs sm:text-sm">Nova versão disponível!</span>
      <button
        onClick={handleUpdate}
        className="inline-flex items-center gap-1 rounded-md bg-primary-foreground/20 hover:bg-primary-foreground/30 px-2.5 py-0.5 text-xs font-semibold transition-colors"
      >
        Atualizar agora
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-primary-foreground/20 transition-colors"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
