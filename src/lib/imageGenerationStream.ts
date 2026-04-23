/**
 * Consumer SSE para a edge function `generate-image-openai`.
 *
 * Eventos esperados:
 * - `progress`        → { stage, message }
 * - `partial_image`   → { index, b64 (data URL completa) }
 * - `complete`        → payload final (mesmo do JSON síncrono)
 * - `error`           → { error }
 *
 * Uso:
 *   const result = await consumeImageGenerationSSE(url, body, token, {
 *     onProgress: (msg) => helpers.setProgress(msg),
 *     onPartial: (b64, idx) => helpers.pushPartial(b64, idx),
 *   });
 */
export interface ImageSSECallbacks {
  onProgress?: (message: string, stage?: string) => void;
  onPartial?: (b64DataUrl: string, index: number) => void;
}

export interface ImageGenerationResult {
  imageUrl: string;
  description?: string;
  headline?: string | null;
  subtexto?: string | null;
  legenda?: string | null;
  actionId?: string;
  finalWidth?: number;
  finalHeight?: number;
  finalAspectRatio?: string;
  requestedAspectRatio?: string;
  complianceCheck?: any;
  partialImagesCount?: number;
  provider?: string;
  model?: string;
  quality?: string;
  creditsUsed?: number;
  [k: string]: any;
}

export async function consumeImageGenerationSSE(
  url: string,
  body: unknown,
  token: string | undefined,
  callbacks: ImageSSECallbacks = {},
): Promise<ImageGenerationResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(`Erro ao gerar imagem (${response.status}): ${text || "sem resposta"}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: ImageGenerationResult | null = null;
  let errorMessage: string | null = null;

  // Estado de parsing de evento SSE: cada bloco vem como
  //   event: <name>\n
  //   data: <json>\n
  //   \n
  let currentEvent = "message";
  let currentDataLines: string[] = [];

  const dispatch = () => {
    if (currentDataLines.length === 0) {
      currentEvent = "message";
      return;
    }
    const raw = currentDataLines.join("\n");
    currentDataLines = [];
    const event = currentEvent;
    currentEvent = "message";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return; // payload inválido, ignora
    }
    if (event === "progress") {
      callbacks.onProgress?.(parsed.message ?? "", parsed.stage);
    } else if (event === "partial_image") {
      if (parsed.b64) callbacks.onPartial?.(parsed.b64, parsed.index ?? 0);
    } else if (event === "complete") {
      finalPayload = parsed;
    } else if (event === "error") {
      errorMessage = parsed.error || "Erro desconhecido no streaming";
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);

      if (line === "") {
        // Fim do evento — despachar
        dispatch();
        continue;
      }
      if (line.startsWith(":")) continue; // comentário SSE

      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      let val = colon === -1 ? "" : line.slice(colon + 1);
      if (val.startsWith(" ")) val = val.slice(1);

      if (field === "event") currentEvent = val;
      else if (field === "data") currentDataLines.push(val);
      // outros campos (id, retry) ignorados
    }
  }

  // Despacha último bloco se faltou linha em branco final
  if (currentDataLines.length > 0) dispatch();

  if (errorMessage) throw new Error(errorMessage);
  if (!finalPayload) throw new Error("Stream encerrado sem payload final");
  return finalPayload;
}
