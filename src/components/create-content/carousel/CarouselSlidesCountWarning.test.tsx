import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarouselSlidesCountWarning } from "./CarouselSlidesCountWarning";

describe("CarouselSlidesCountWarning", () => {
  it.each([3, 4, 5, 6, 7])("não renderiza para %i slides", (n) => {
    render(<CarouselSlidesCountWarning slidesCount={n} />);
    expect(screen.queryByTestId("carousel-slides-count-warning")).toBeNull();
  });

  it.each([8, 9, 10])("renderiza o aviso amber para %i slides", (n) => {
    render(<CarouselSlidesCountWarning slidesCount={n} />);
    const alert = screen.getByTestId("carousel-slides-count-warning");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert.className).toMatch(/bg-amber-50/);
    expect(alert.className).toMatch(/border-amber-200/);
    expect(screen.getByText(/carrossel extenso detectado/i)).toBeInTheDocument();
    expect(
      screen.getByText(/pode reduzir a qualidade final e aumentar o tempo de processamento/i)
    ).toBeInTheDocument();
  });

  it("permite customizar o threshold", () => {
    render(<CarouselSlidesCountWarning slidesCount={6} threshold={6} />);
    expect(screen.getByTestId("carousel-slides-count-warning")).toBeInTheDocument();
  });

  it("não renderiza com slidesCount=0 (edge case)", () => {
    render(<CarouselSlidesCountWarning slidesCount={0} />);
    expect(screen.queryByTestId("carousel-slides-count-warning")).toBeNull();
  });
});
