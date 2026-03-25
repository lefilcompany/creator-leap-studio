import { useState } from "react";
import { ChevronDown, Check, Monitor } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { platformSpecs } from "@/lib/platformSpecs";

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
    <defs><linearGradient id="ig-fmt" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FFDC80" /><stop offset="25%" stopColor="#F77737" /><stop offset="50%" stopColor="#F56040" /><stop offset="75%" stopColor="#C13584" /><stop offset="100%" stopColor="#833AB4" /></linearGradient></defs>
    <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-fmt)" strokeWidth="2" /><circle cx="12" cy="12" r="4.5" stroke="url(#ig-fmt)" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig-fmt)" />
  </svg>
);
const FacebookIcon = () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>);
const TikTokIcon = () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13.2a8.16 8.16 0 005.58 2.18V12a4.83 4.83 0 01-3.77-1.54V6.69h3.77z" /></svg>);
const TwitterXIcon = () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>);
const LinkedInIcon = () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>);
const ComunidadesIcon = () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);

const PLATFORM_ICON_MAP: Record<string, React.FC> = {
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
  TikTok: TikTokIcon,
  "Twitter/X": TwitterXIcon,
  LinkedIn: LinkedInIcon,
  Comunidades: ComunidadesIcon,
};

interface FormatOption {
  platform: string;
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
}

function buildFormatOptions(): FormatOption[] {
  const options: FormatOption[] = [
    { platform: "Personalizado", label: "Quadrado (1:1)", width: 1080, height: 1080, aspectRatio: "1:1" },
  ];
  for (const [key, spec] of Object.entries(platformSpecs)) {
    for (const dim of spec.organic.image.dimensions) {
      options.push({
        platform: key,
        label: `${spec.name} — ${dim.description}`,
        width: dim.width,
        height: dim.height,
        aspectRatio: dim.aspectRatio,
      });
    }
  }
  return options;
}

const FORMAT_OPTIONS = buildFormatOptions();

interface FormatPreviewProps {
  platform: string;
  aspectRatio: string;
  onPlatformChange: (platform: string, aspectRatio: string, width: number, height: number) => void;
  children?: React.ReactNode;
}

export function FormatPreview({ platform, aspectRatio, onPlatformChange, children }: FormatPreviewProps) {
  const [open, setOpen] = useState(false);

  const current = FORMAT_OPTIONS.find(o =>
    platform ? (o.platform === platform && o.aspectRatio === aspectRatio) : o.aspectRatio === aspectRatio
  ) || FORMAT_OPTIONS[0];

  const { width, height } = current;

  // Scale preview to fit container — larger sizes
  const maxW = 240;
  const maxH = 300;
  const ratio = width / height;
  let finalW: number, finalH: number;
  if (ratio >= 1) {
    finalW = maxW;
    finalH = maxW / ratio;
  } else {
    finalH = maxH;
    finalW = maxH * ratio;
    if (finalW > maxW) {
      finalW = maxW;
      finalH = maxW / ratio;
    }
  }

  const PlatformIcon = PLATFORM_ICON_MAP[current.platform];

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-sm font-bold text-foreground">Preview do Formato</p>

      {/* Preview rectangle with side labels */}
      <div className="relative flex items-center justify-center">
        {/* Height label */}
        <span className="absolute -left-8 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground font-medium -rotate-90 whitespace-nowrap">
          {height}px
        </span>

        <div
          className="rounded-2xl bg-primary/5 flex items-center justify-center transition-all duration-300 relative overflow-hidden"
          style={{ width: finalW, height: finalH }}
        >
          {children || (
            <div className="text-center">
              <span className="text-xl font-bold text-primary/50">{aspectRatio}</span>
            </div>
          )}
        </div>
      </div>

      {/* Width label */}
      <span className="text-[11px] text-muted-foreground font-medium -mt-2">{width}px</span>

      {/* Format selector popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-all text-sm"
          >
            {PlatformIcon ? <PlatformIcon /> : <Monitor className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            <span className="flex-1 text-left truncate text-foreground font-medium">
              {current.platform !== "Personalizado" ? `${current.platform} (${width}×${height})` : `Quadrado (${width}×${height})`}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8} className="w-72 p-0 rounded-xl overflow-hidden">
          <ScrollArea className="max-h-72 p-1.5">
            {FORMAT_OPTIONS.map((opt, idx) => {
              const isSelected = opt.platform === current.platform && opt.aspectRatio === current.aspectRatio;
              const Icon = PLATFORM_ICON_MAP[opt.platform];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onPlatformChange(opt.platform === "Personalizado" ? "" : opt.platform, opt.aspectRatio, opt.width, opt.height);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    isSelected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  {Icon && <Icon />}
                  {!Icon && <Monitor className="h-4 w-4 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.width}×{opt.height}px</p>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
