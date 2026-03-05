/**
 * Utilitário compartilhado para chamadas à API do Google Gemini.
 * Encapsula fetch + parsing para reutilização em múltiplas edge functions.
 */

export interface GeminiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GeminiCallParams {
  model?: string;
  messages: GeminiMessage[];
  temperature?: number;
}

export interface GeminiCallResult {
  content: string;
  raw: any;
}

/**
 * Chama a API do Gemini diretamente (formato nativo).
 * Converte mensagens no formato OpenAI para o formato Gemini (contents/parts).
 */
export async function callGemini(
  apiKey: string,
  params: GeminiCallParams
): Promise<GeminiCallResult> {
  const model = params.model || 'gemini-2.5-flash';
  // Strip provider prefix if present (e.g. "google/gemini-2.5-flash" -> "gemini-2.5-flash")
  const modelName = model.includes('/') ? model.split('/').pop()! : model;

  // Build system instruction from system messages
  const systemMessages = params.messages.filter(m => m.role === 'system');
  const nonSystemMessages = params.messages.filter(m => m.role !== 'system');

  const contents = nonSystemMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: any = {
    contents,
    generationConfig: {
      temperature: params.temperature ?? 0.7,
    },
  };

  if (systemMessages.length > 0) {
    body.systemInstruction = {
      parts: [{ text: systemMessages.map(m => m.content).join('\n\n') }],
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  return { content, raw: data };
}

/**
 * Extrai e parseia JSON de uma string que pode conter texto ao redor.
 * Útil para respostas do LLM que incluem JSON dentro de markdown ou texto livre.
 */
export function extractJSON<T = any>(text: string): T | null {
  if (!text) return null;

  // Try direct parse first
  try {
    return JSON.parse(text) as T;
  } catch {}

  // Try to find JSON object in text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as T;
    } catch {}
  }

  // Try to find JSON array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T;
    } catch {}
  }

  return null;
}
