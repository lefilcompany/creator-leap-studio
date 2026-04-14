/**
 * Compliance Check Module
 * Analyzes generated images for content violations using Gemini Vision.
 * Fail-open: if the check fails, the image is delivered without the check.
 */

export interface ComplianceResult {
  approved: boolean;
  score: number; // 0-100, higher = safer
  flags: string[];
  details: string;
}

const COMPLIANCE_PROMPT = `Você é um agente de compliance e moderação de conteúdo visual. Analise a imagem fornecida e o texto associado (se houver) para verificar se há violações.

VERIFIQUE CADA UM DOS SEGUINTES CRITÉRIOS:

1. **Conteúdo Ofensivo**: Nudez, violência explícita, gore, conteúdo sexual
2. **Discriminação**: Racismo, sexismo, homofobia, xenofobia, capacitismo ou qualquer forma de preconceito
3. **Marcas e Propriedade Intelectual**: Uso indevido de logos, marcas registradas, personagens protegidos por copyright
4. **Alegações Falsas/Enganosas**: Promessas de cura, ganhos financeiros garantidos, informações médicas sem embasamento
5. **Conteúdo Regulado (Leis Brasileiras)**:
   - CDC: Propaganda enganosa ou abusiva
   - LGPD: Exposição de dados pessoais
   - ECA: Conteúdo inapropriado envolvendo menores
   - Marco Civil: Conteúdo que incite violência ou ódio
6. **Qualidade Textual**: Textos ilegíveis, truncados, com erros ortográficos graves ou sobrepostos
7. **Rostos Identificáveis**: Pessoas reais identificáveis sem contexto apropriado (pode indicar uso não autorizado de imagem)
8. **Símbolos Sensíveis**: Símbolos religiosos, políticos ou militares usados de forma inadequada

Responda APENAS com um JSON válido (sem markdown, sem backticks):
{
  "approved": true/false,
  "score": <número de 0 a 100, onde 100 = totalmente seguro>,
  "flags": ["lista de problemas encontrados, vazia se aprovado"],
  "details": "Resumo breve da análise em português"
}

Se a imagem for segura e sem problemas, retorne approved: true, score entre 85-100, flags vazio, e details com confirmação positiva.
Se houver problemas LEVES (ex: texto levemente ilegível), retorne approved: true, score 60-84, com flags descrevendo o problema.
Se houver problemas GRAVES, retorne approved: false, score 0-59, com flags detalhadas.`;

export async function checkCompliance(
  imageUrl: string,
  associatedText?: string,
): Promise<ComplianceResult> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    console.warn('[Compliance] GEMINI_API_KEY not set, skipping check');
    return { approved: true, score: 100, flags: [], details: 'Verificação não disponível (chave não configurada)' };
  }

  try {
    console.log('[Compliance] Starting compliance check...');

    // Build message parts
    const parts: any[] = [];

    let prompt = COMPLIANCE_PROMPT;
    if (associatedText) {
      prompt += `\n\nTEXTO ASSOCIADO À IMAGEM:\n"${associatedText}"`;
    }
    parts.push({ text: prompt });

    // Add image
    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    } else {
      // Download image and convert to base64
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        console.error('[Compliance] Failed to fetch image:', imgResponse.status);
        return { approved: true, score: 100, flags: [], details: 'Verificação ignorada (erro ao acessar imagem)' };
      }
      const imgBuffer = await imgResponse.arrayBuffer();
      const bytes = new Uint8Array(imgBuffer);
      const chunkSize = 8192;
      let binary = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      const contentType = imgResponse.headers.get('content-type') || 'image/png';
      parts.push({ inlineData: { mimeType: contentType, data: btoa(binary) } });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      },
    ).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      console.error('[Compliance] Gemini error:', response.status);
      return { approved: true, score: 100, flags: [], details: 'Verificação ignorada (erro na API)' };
    }

    const data = await response.json();
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Compliance] No JSON in response:', textResponse.substring(0, 200));
      return { approved: true, score: 100, flags: [], details: 'Verificação inconclusiva' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const result: ComplianceResult = {
      approved: parsed.approved !== false,
      score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 100,
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      details: typeof parsed.details === 'string' ? parsed.details : 'Análise concluída',
    };

    console.log('[Compliance] Result:', { approved: result.approved, score: result.score, flagCount: result.flags.length });
    return result;

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Compliance] Timeout - skipping check');
    } else {
      console.error('[Compliance] Error:', error);
    }
    return { approved: true, score: 100, flags: [], details: 'Verificação ignorada (timeout/erro)' };
  }
}
