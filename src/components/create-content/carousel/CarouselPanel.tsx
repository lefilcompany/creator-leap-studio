import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlideImageSettingsForm, SlidePromptField } from "./SlideImageSettingsForm";
import type { SlideBriefing } from "./types";

interface Props {
  slides: SlideBriefing[];
  onChange: (next: SlideBriefing[]) => void;
  maxSlides?: number;
  minSlides?: number;
}

export function CarouselPanel({ slides, onChange, maxSlides = 10, minSlides = 1 }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const updateSlide = (idx: number, next: SlideBriefing) => {
    const copy = [...slides];
    copy[idx] = { ...next, index: idx };
    onChange(copy);
  };

  const addSlide = () => {
    if (slides.length >= maxSlides) return;
    const newSlide: SlideBriefing = { index: slides.length, prompt: "" };
    onChange([...slides, newSlide]);
  };

  const removeSlide = (idx: number) => {
    if (slides.length <= minSlides) return;
    const copy = slides
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, index: i }));
    onChange(copy);
    setExpandedIdx(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Slides do carrossel</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cada slide é gerado em paralelo com o contexto de marca, editoria e persona escolhidos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {slides.length}/{maxSlides}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSlide}
            disabled={slides.length >= maxSlides}
            className="h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar slide
          </Button>
        </div>
      </div>

      <div className="space-y-2.5">
        {slides.map((slide, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-card shadow-sm border border-border/40 p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <SlidePromptField slide={slide} onChange={(s) => updateSlide(idx, s)} />
              </div>
              {slides.length > minSlides && (
                <button
                  type="button"
                  onClick={() => removeSlide(idx)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Remover slide"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <SlideImageSettingsForm
              slide={slide}
              onChange={(s) => updateSlide(idx, s)}
              expanded={expandedIdx === idx}
              onToggleExpanded={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
