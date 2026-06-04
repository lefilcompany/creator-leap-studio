import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CarouselGallery } from "./CarouselGallery";
import type { CarouselResult } from "./types";

// O dialog de regeração depende de supabase/useAuth/react-query — não nos importa aqui.
vi.mock("@/components/create-content/regenerate/RegenerateImageDialog", () => ({
  RegenerateImageDialog: ({ open, slide }: any) =>
    open ? <div data-testid="regen-dialog">Regen slide {slide ? slide.index + 1 : ""}</div> : null,
}));

// CreationFeedback faz queries de supabase — stub para isolar o teste
vi.mock("@/components/CreationFeedback", () => ({
  CreationFeedback: () => <div data-testid="creation-feedback" />,
}));

function makeCarousel(overrides?: Partial<CarouselResult>): CarouselResult {
  return {
    slidesCount: 3,
    slides: [
      { index: 0, prompt: "p1", status: "done", imageUrl: "https://x/1.png" },
      { index: 1, prompt: "p2", status: "generating" },
      { index: 2, prompt: "p3", status: "error", error: "falhou" },
    ],
    ...overrides,
  };
}

describe("CarouselGallery", () => {
  it("mostra header 'Slide 1 de N'", () => {
    render(<CarouselGallery actionId="a1" carousel={makeCarousel()} />);
    expect(screen.getByRole("heading", { name: /slide 1 de 3/i })).toBeInTheDocument();
  });

  it("renderiza um botão de dot para cada slide", () => {
    render(<CarouselGallery actionId="a1" carousel={makeCarousel()} />);
    expect(screen.getByLabelText("Ir para slide 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Ir para slide 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Ir para slide 3")).toBeInTheDocument();
  });

  it("desabilita 'Slide anterior' inicialmente", () => {
    render(<CarouselGallery actionId="a1" carousel={makeCarousel()} />);
    expect(screen.getByLabelText("Slide anterior")).toBeDisabled();
    expect(screen.getByLabelText("Próximo slide")).not.toBeDisabled();
  });

  it("mostra overlay 'Gerando...' em slide em geração", () => {
    render(<CarouselGallery actionId="a1" carousel={makeCarousel()} />);
    expect(screen.getByText(/gerando\.\.\./i)).toBeInTheDocument();
  });

  it("mostra estado de erro com botão 'Regerar slide'", () => {
    render(<CarouselGallery actionId="a1" carousel={makeCarousel()} />);
    expect(screen.getByText(/falha ao gerar este slide/i)).toBeInTheDocument();
    expect(screen.getByText("falhou")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /regerar slide/i }).length).toBeGreaterThan(0);
  });

  it("desabilita 'Regerar este slide' quando o atual está pending/generating", () => {
    const carousel = makeCarousel({
      slides: [{ index: 0, prompt: "p", status: "pending" }],
      slidesCount: 1,
    });
    render(<CarouselGallery actionId="a1" carousel={carousel} />);
    const btn = screen.getByRole("button", { name: /regerar este slide/i });
    expect(btn).toBeDisabled();
  });

  it("delega ao callback onRegenerate em vez de abrir o dialog interno", () => {
    const onRegenerate = vi.fn();
    const carousel = makeCarousel({
      slides: [{ index: 0, prompt: "p", status: "done", imageUrl: "x" }],
      slidesCount: 1,
    });
    render(<CarouselGallery actionId="a1" carousel={carousel} onRegenerate={onRegenerate} />);
    fireEvent.click(screen.getByRole("button", { name: /regerar este slide/i }));
    expect(onRegenerate).toHaveBeenCalledWith(0);
    expect(screen.queryByTestId("regen-dialog")).toBeNull();
  });

  it("abre o RegenerateImageDialog interno quando não há callback", () => {
    const carousel = makeCarousel({
      slides: [{ index: 0, prompt: "p", status: "done", imageUrl: "x" }],
      slidesCount: 1,
    });
    render(<CarouselGallery actionId="a1" carousel={carousel} />);
    fireEvent.click(screen.getByRole("button", { name: /regerar este slide/i }));
    expect(screen.getByTestId("regen-dialog")).toBeInTheDocument();
  });
});
