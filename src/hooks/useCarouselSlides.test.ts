import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock supabase client antes de importar o hook
const singleMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: singleMock,
        }),
      }),
    }),
  },
}));

import { useCarouselSlides } from "./useCarouselSlides";

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("useCarouselSlides", () => {
  beforeEach(() => {
    singleMock.mockReset();
  });

  it("não dispara fetch sem actionId", () => {
    const client = makeClient();
    const { result } = renderHook(() => useCarouselSlides(undefined), {
      wrapper: wrapper(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(singleMock).not.toHaveBeenCalled();
  });

  it("retorna o carrossel extraído de actions.result.carousel", async () => {
    singleMock.mockResolvedValue({
      data: {
        result: {
          carousel: {
            slidesCount: 2,
            slides: [
              { index: 0, status: "done", imageUrl: "a.png" },
              { index: 1, status: "done", imageUrl: "b.png" },
            ],
          },
        },
      },
      error: null,
    });
    const client = makeClient();
    const { result } = renderHook(() => useCarouselSlides("act-1"), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slidesCount).toBe(2);
    expect(result.current.data?.slides).toHaveLength(2);
  });

  it("propaga erro do supabase", async () => {
    singleMock.mockResolvedValue({ data: null, error: new Error("boom") });
    const client = makeClient();
    const { result } = renderHook(() => useCarouselSlides("act-x"), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("structuralSharing mantém referência quando assinatura não muda", async () => {
    const payload = {
      data: {
        result: {
          carousel: {
            slidesCount: 1,
            slides: [{ index: 0, status: "done", imageUrl: "x.png" }],
            caption: { title: "t", body: "b", hashtags: ["#a"] },
          },
        },
      },
      error: null,
    };
    singleMock.mockResolvedValue(payload);
    const client = makeClient();
    const { result } = renderHook(() => useCarouselSlides("act-2"), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data;
    // Força refetch — assinatura idêntica deve preservar a mesma referência
    await result.current.refetch();
    expect(result.current.data).toBe(first);
  });

  it("structuralSharing reflete mudança de status no refetch", async () => {
    singleMock
      .mockResolvedValueOnce({
        data: {
          result: {
            carousel: {
              slidesCount: 1,
              slides: [{ index: 0, status: "generating" }],
            },
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          result: {
            carousel: {
              slidesCount: 1,
              slides: [{ index: 0, status: "done", imageUrl: "y.png" }],
            },
          },
        },
        error: null,
      });
    const client = makeClient();
    const { result } = renderHook(() => useCarouselSlides("act-3"), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.data?.slides[0].status).toBe("generating"));
    await result.current.refetch();
    await waitFor(() => expect(result.current.data?.slides[0].status).toBe("done"));
    expect(result.current.data?.slides[0].imageUrl).toBe("y.png");
  });
});
