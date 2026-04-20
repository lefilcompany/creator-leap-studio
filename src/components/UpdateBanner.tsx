import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import logoCreator from "@/assets/logoCreatorPreta.png";
import logoCreatorBranca from "@/assets/logoCreatorBranca.png";
import { useTheme } from "next-themes";

const CHECK_INTERVAL = 60 * 1000; // 1 minute — near real-time
const STORAGE_KEY = "creator:update-dismissed-build";

export function UpdateBanner() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [reloading, setReloading] = useState(false);
  const { theme } = useTheme();
  const initialAssetsRef = useRef<Set<string> | null>(null);
  const detectedBuildRef = useRef<string | null>(null);

  const logo = theme === "dark" ? logoCreatorBranca : logoCreator;

  const captureInitialAssets = useCallback(() => {
    if (initialAssetsRef.current) return;
    const set = new Set<string>();
    document
      .querySelectorAll('script[src], link[rel="stylesheet"][href]')
      .forEach((el) => {
        const src = el.getAttribute("src") || el.getAttribute("href");
        if (src && src.includes("/assets/")) set.add(src);
      });
    initialAssetsRef.current = set;
  }, []);

  const checkForUpdate = useCallback(async () => {
    try {
      captureInitialAssets();
      const res = await fetch(`/?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "text/html" },
      });
      if (!res.ok) return;
      const html = await res.text();

      const srcMatches = html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g);
      const newAssets: string[] = [];
      for (const match of srcMatches) {
        if (!initialAssetsRef.current!.has(match[1])) {
          newAssets.push(match[1]);
        }
      }

      if (newAssets.length > 0) {
        // Use the first new asset path as a stable build identifier
        const buildId = newAssets[0];
        detectedBuildRef.current = buildId;

        // Respect dismissals tied to this exact build
        const dismissedBuild =
          typeof window !== "undefined"
            ? window.localStorage.getItem(STORAGE_KEY)
            : null;
        if (dismissedBuild === buildId) {
          setDismissed(true);
        }
        setHasUpdate(true);
      }
    } catch {
      // silent
    }
  }, [captureInitialAssets]);

  useEffect(() => {
    captureInitialAssets();
    const initialTimeout = setTimeout(checkForUpdate, 15_000);
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);

    const onFocus = () => checkForUpdate();
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [captureInitialAssets, checkForUpdate]);

  const handleUpdate = async () => {
    setReloading(true);
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  const handleDismiss = () => {
    if (detectedBuildRef.current) {
      try {
        window.localStorage.setItem(STORAGE_KEY, detectedBuildRef.current);
      } catch {
        // ignore
      }
    }
    setDismissed(true);
  };

  const open = hasUpdate && !dismissed;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleDismiss()}>
      <DialogContent
        className="max-w-lg p-0 border-0 overflow-hidden bg-transparent shadow-2xl [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="relative bg-card rounded-2xl overflow-hidden">
          {/* Decorative gradient header */}
          <div className="relative h-32 bg-gradient-to-br from-primary via-primary to-primary/70 overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary-foreground/30 blur-3xl" />
              <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-primary-foreground/20 blur-3xl" />
            </div>
            <button
              onClick={handleDismiss}
              className="absolute right-3 top-3 p-1.5 rounded-lg bg-background/20 hover:bg-background/40 text-primary-foreground transition-colors z-10"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-background rounded-2xl p-4 shadow-xl">
                <img
                  src={logo}
                  alt="Creator"
                  className="h-12 w-auto object-contain"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pt-8 pb-6 space-y-5 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Sparkles className="h-3 w-3" />
              Atualização disponível
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Uma nova versão chegou!
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Acabamos de lançar melhorias e novidades no Creator. Atualize
                agora para garantir a melhor experiência, com recursos mais
                rápidos e estáveis.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleUpdate}
                disabled={reloading}
                size="lg"
                className="w-full gap-2 font-semibold"
              >
                <RefreshCw
                  className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`}
                />
                {reloading ? "Atualizando..." : "Atualizar agora"}
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                Atualizar mais tarde
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground/70 pt-1">
              A atualização leva apenas alguns segundos e seu trabalho não será
              perdido.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
