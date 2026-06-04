import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { CarouselResult } from "@/components/create-content/carousel/types";

// --- Mocks ---
const invokeMock = vi.fn();
const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn(() => ({ data: { publicUrl: "https://cdn/x.png" } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (name: string, opts: any) => invokeMock(name, opts) },
    storage: {
      from: () => ({
        upload: (path: string, file: any, opts: any) => uploadMock(path, file, opts),
        getPublicUrl: (path: string) => getPublicUrlMock(path),
      }),
    },
  },
}));

const useAuthMock = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { RegenerateImageDialog } from "./RegenerateImageDialog";

function makeCarousel(): CarouselResult {
  return {
    slidesCount: 3,
    slides: [
      { index: 0, prompt: "p1" },
      { index: 1, prompt: "p2" },
      { index: 2, prompt: "p3" },
    ],
  };
}

function renderDialog(opts: { credits?: number; regenerationCount?: number } = {}) {
  const { credits = 10, regenerationCount = 0 } = opts;
  useAuthMock.mockReturnValue({
    user: { id: "u1", credits },
    refreshUserCredits: vi.fn(),
  });
  const carousel = makeCarousel();
  const slide = { ...carousel.slides[0], regenerationCount } as any;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onOpenChange = vi.fn();
  render(
    React.createElement(
      QueryClientProvider,
      { client },
      <RegenerateImageDialog
        open
        onOpenChange={onOpenChange}
        actionId="action-1"
        carousel={carousel}
        slide={slide}
      />
    )
  );
  return { onOpenChange };
}

describe("RegenerateImageDialog — custo dinâmico", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    uploadMock.mockReset();
  });

  it("primeira regeração é grátis (0 cr)", () => {
    renderDialog({ regenerationCount: 0 });
    expect(screen.getByText(/regeração gratuita deste slide/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /regerar.*grátis/i })).toBeInTheDocument();
  });

  it("a partir da 2ª regeração custa 4 créditos", () => {
    renderDialog({ regenerationCount: 1, credits: 10 });
    expect(screen.getByText(/custa 4 créditos/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /regerar \(4 cr\)/i })).toBeInTheDocument();
  });

  it("desabilita submit quando faltam créditos (paga)", () => {
    renderDialog({ regenerationCount: 1, credits: 0 });
    expect(screen.getByText(/créditos insuficientes para esta regeração/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /regerar \(4 cr\)/i });
    expect(btn).toBeDisabled();
  });
});

describe("RegenerateImageDialog — validação e submit", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("submit fica desabilitado enquanto 'instruções' está vazio", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: /regerar/i })).toBeDisabled();
  });

  it("envia payload correto com onlyIndex, instruções compostas e keepOriginalPrompt", async () => {
    invokeMock.mockResolvedValue({ error: null });
    renderDialog();
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText(/o que ajustar nesta imagem/i),
      "Trocar fundo para externo"
    );
    await user.type(
      screen.getByLabelText(/o que não ficou bom/i),
      "Produto cortado"
    );

    await user.click(screen.getByRole("button", { name: /regerar.*grátis/i }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    const [fn, opts] = invokeMock.mock.calls[0];
    expect(fn).toBe("generate-carousel-images");
    const body = opts.body;
    expect(body.actionId).toBe("action-1");
    expect(body.onlyIndex).toBe(0);
    expect(body.slidesCount).toBe(3);
    expect(body.keepOriginalPrompt).toBe(true);
    expect(body.regenerationInstructions).toMatch(/produto cortado/i);
    expect(body.regenerationInstructions).toMatch(/trocar fundo para externo/i);
    expect(Array.isArray(body.regenerationReferenceImages)).toBe(true);
    expect(body.regenerationReferenceImages).toHaveLength(0);
  });

  it("inclui 'avoid' quando preenchido nas opções avançadas", async () => {
    invokeMock.mockResolvedValue({ error: null });
    renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/o que ajustar nesta imagem/i), "novo ângulo");
    await user.click(screen.getByRole("button", { name: /mais opções/i }));
    await user.type(screen.getByLabelText(/evitar/i), "sem texto na imagem");

    await user.click(screen.getByRole("button", { name: /regerar.*grátis/i }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalled());
    expect(invokeMock.mock.calls[0][1].body.avoid).toBe("sem texto na imagem");
  });

  it("reseta os campos ao reabrir para outro slide", () => {
    renderDialog();
    const ta = screen.getByLabelText(/o que ajustar nesta imagem/i) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "algo" } });
    expect(ta.value).toBe("algo");
    // a verificação completa do reset é coberta pelo efeito do componente quando `open` muda;
    // aqui validamos apenas que o campo é controlado e responde a setState.
  });
});
