import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import logoSymbol from "@/assets/creator-logo-symbol.png";

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function UpdateBanner() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch(`/?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "text/html" },
      });
      if (!res.ok) return;
      const html = await res.text();

      const currentScripts = document.querySelectorAll('script[src], link[rel="stylesheet"][href]');
      const currentHashes = new Set<string>();
      currentScripts.forEach((el) => {
        const src = el.getAttribute("src") || el.getAttribute("href");
        if (src) currentHashes.add(src);
      });

      const srcMatches = html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g);
      let foundNew = false;
      for (const match of srcMatches) {
        if (!currentHashes.has(match[1])) {
          foundNew = true;
          break;
        }
      }

      if (foundNew) setHasUpdate(true);
    } catch {
      // silently ignore network errors
    }
  }, []);

  useEffect(() => {
    const initialTimeout = setTimeout(checkForUpdate, 30_000);
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkForUpdate]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!hasUpdate || dismissed) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [hasUpdate, dismissed]);

  if (!hasUpdate || dismissed) return null;

  const handleUpdate = () => {
    setUpdating(true);
    if ("caches" in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
    setTimeout(() => window.location.reload(), 300);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
    >
      {/* Backdrop with glass blur */}
      <div
        className="absolute inset-0 bg-background/40 backdrop-blur-2xl"
        onClick={() => setDismissed(true)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Glow halo */}
        <div className="absolute -inset-1 bg-gradient-to-br from-primary/40 via-secondary/30 to-primary/20 rounded-3xl blur-2xl opacity-70" />

        <div className="relative bg-card/70 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute right-3 top-3 z-10 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative p-7 sm:p-8 flex flex-col items-center text-center">
            {/* Logo */}
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-2xl blur-xl opacity-50 animate-pulse" />
              <div className="relative h-20 w-20 rounded-2xl bg-card/80 backdrop-blur border border-white/30 dark:border-white/10 shadow-xl flex items-center justify-center">
                <img
                  src={logoSymbol}
                  alt="Creator"
                  className="h-12 w-12 object-contain"
                />
              </div>
              <span className="absolute -top-1 -right-1 inline-flex items-center gap-1 bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg">
                <Sparkles className="h-2.5 w-2.5" />
                Novo
              </span>
            </div>

            {/* Title */}
            <h2
              id="update-modal-title"
              className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2"
            >
              Nova versão disponível
            </h2>

            {/* Description */}
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
              Acabamos de publicar melhorias e correções no Creator. Atualize
              agora para garantir a melhor experiência e ter acesso às novidades
              mais recentes.
            </p>

            {/* CTA */}
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="group relative w-full inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-wait overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite] group-hover:bg-[position:100%_0]" />
              <span className="relative flex items-center gap-2">
                <RefreshCw
                  className={`h-4 w-4 ${updating ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
                />
                {updating ? "Atualizando..." : "Atualizar agora"}
              </span>
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Atualizar depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
