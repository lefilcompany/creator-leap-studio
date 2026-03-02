import { toast } from "sonner";
import { getPlatformImageSpec } from "@/lib/platformSpecs";

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
    <defs>
      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFDC80" />
        <stop offset="25%" stopColor="#F77737" />
        <stop offset="50%" stopColor="#F56040" />
        <stop offset="75%" stopColor="#C13584" />
        <stop offset="100%" stopColor="#833AB4" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-grad)" strokeWidth="2" />
    <circle cx="12" cy="12" r="4.5" stroke="url(#ig-grad)" strokeWidth="2" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig-grad)" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13.2a8.16 8.16 0 005.58 2.18V12a4.83 4.83 0 01-3.77-1.54V6.69h3.77z" />
  </svg>
);

const TwitterXIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const ComunidadesIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const PLATFORMS = [
  { value: "Instagram", label: "Instagram", icon: InstagramIcon },
  { value: "Facebook", label: "Facebook", icon: FacebookIcon },
  { value: "TikTok", label: "TikTok", icon: TikTokIcon },
  { value: "Twitter/X", label: "X", icon: TwitterXIcon },
  { value: "LinkedIn", label: "LinkedIn", icon: LinkedInIcon },
  { value: "Comunidades", label: "Comunidades", icon: ComunidadesIcon },
] as const;

interface PlatformSelectorProps {
  value: string;
  onChange: (value: string, aspectRatio?: string) => void;
}

export function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  const handleSelect = (platformValue: string) => {
    const newValue = value === platformValue ? "" : platformValue;
    if (newValue) {
      const imageSpec = getPlatformImageSpec(newValue, "feed", "organic");
      if (imageSpec) {
        onChange(newValue, imageSpec.aspectRatio);
        toast.info(`Proporção ajustada para ${newValue}`, {
          description: `${imageSpec.aspectRatio} (${imageSpec.width}x${imageSpec.height}px)`,
          duration: 3000,
        });
        return;
      }
    }
    onChange(newValue);
  };

  return (
    <div className="space-y-2.5">
      <p className="text-sm font-bold text-foreground">
        Plataforma <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map(platform => {
          const isSelected = value === platform.value;
          const Icon = platform.icon;
          return (
            <button
              key={platform.value}
              type="button"
              onClick={() => handleSelect(platform.value)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.97] border ${
                isSelected
                  ? "bg-primary/10 border-primary/40 text-foreground shadow-sm ring-1 ring-primary/20"
                  : "bg-card border-border/50 text-muted-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <Icon />
              <span>{platform.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
