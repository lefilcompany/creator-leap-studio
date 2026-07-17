import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  code: string;
  language?: string;
  maxHeight?: string;
}

export function CodeBlock({ code, language = "json", maxHeight = "24rem" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          {language}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={copy}
          aria-label="Copiar"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <pre
        className="bg-muted/50 border border-border rounded-xl p-4 pt-10 text-xs font-mono overflow-auto whitespace-pre"
        style={{ maxHeight }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
