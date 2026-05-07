import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getAuthBaseUrl,
  getOAuthRedirectUri,
  getEmailRedirectUrl,
  validateReturnUrl,
} from "@/lib/auth-urls";

function setHostname(hostname: string, origin?: string) {
  Object.defineProperty(window, "location", {
    writable: true,
    value: {
      hostname,
      origin: origin ?? `https://${hostname}`,
    },
  });
}

describe("auth-urls", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("força domínio canônico em produção", () => {
    setHostname("pla.creator.lefil.com.br");
    expect(getAuthBaseUrl()).toBe("https://pla.creator.lefil.com.br");
    setHostname("www.pla.creator.lefil.com.br");
    expect(getAuthBaseUrl()).toBe("https://pla.creator.lefil.com.br");
  });

  it("usa origin atual em preview/dev", () => {
    setHostname("localhost", "http://localhost:5173");
    expect(getAuthBaseUrl()).toBe("http://localhost:5173");
  });

  it("monta callback OAuth e redirect de email", () => {
    setHostname("pla.creator.lefil.com.br");
    expect(getOAuthRedirectUri()).toBe("https://pla.creator.lefil.com.br/~oauth/callback");
    expect(getEmailRedirectUrl("dashboard")).toBe("https://pla.creator.lefil.com.br/dashboard");
    expect(getEmailRedirectUrl("/reset")).toBe("https://pla.creator.lefil.com.br/reset");
  });

  describe("validateReturnUrl", () => {
    it("retorna /dashboard para entradas inválidas", () => {
      expect(validateReturnUrl(null)).toBe("/dashboard");
      expect(validateReturnUrl(undefined)).toBe("/dashboard");
      expect(validateReturnUrl("")).toBe("/dashboard");
    });
    it("bloqueia protocolos e URLs absolutas", () => {
      expect(validateReturnUrl("//evil.com")).toBe("/dashboard");
      expect(validateReturnUrl("https://evil.com")).toBe("/dashboard");
      expect(validateReturnUrl("javascript://x")).toBe("/dashboard");
    });
    it("exige path começando com /", () => {
      expect(validateReturnUrl("dashboard")).toBe("/dashboard");
      expect(validateReturnUrl("/workspace")).toBe("/workspace");
    });
  });
});
