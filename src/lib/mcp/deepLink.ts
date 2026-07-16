// Constrói deep links canônicos para o Creator, usados nas respostas MCP
// para o Shell (Marketing OS) renderizar como link em vez de embutir UI.
// Nunca depende de `window.location` — o handler roda em Deno Edge.

const BASE = "https://pla.creator.lefil.com.br";

export type DeepLinkKind =
  | "action"
  | "brand"
  | "persona"
  | "theme"
  | "calendar"
  | "calendar_item"
  | "category"
  | "profile";

export function buildDeepLink(kind: DeepLinkKind, id: string): string {
  switch (kind) {
    case "action":
      return `${BASE}/action/${id}`;
    case "brand":
      return `${BASE}/brands/${id}`;
    case "persona":
      return `${BASE}/personas/${id}`;
    case "theme":
      return `${BASE}/themes/${id}`;
    case "calendar":
      return `${BASE}/calendario/${id}`;
    case "calendar_item":
      return `${BASE}/calendario/item/${id}`;
    case "category":
      return `${BASE}/categories/${id}`;
    case "profile":
      return `${BASE}/profile/${id}`;
  }
}

export function withDeepLinks<T extends { id: string }>(
  rows: T[] | null | undefined,
  kind: DeepLinkKind,
): (T & { deep_link: string })[] {
  return (rows ?? []).map((r) => ({ ...r, deep_link: buildDeepLink(kind, r.id) }));
}
