/**
 * Compliance Check Module
 * Analyzes generated images for content violations using Gemini Vision.
 * Fail-open: if the check fails, the image is delivered without the check.
 * Auto-correction: returns correctionInstructions when violations are found.
 */

export interface ComplianceResult {
  approved: boolean;
  score: number; // 0-100, higher = safer
  flags: string[];
  details: string;
  correctionInstructions?: string; // Instructions to fix the image if not approved
  wasAutoCorreted?: boolean; // Whether this image was auto-corrected
}

const COMPLIANCE_PROMPT = `Você é um agente de compliance e moderação de conteúdo visual especializado em legislação brasileira de marketing e publicidade. Analise a imagem fornecida e o texto associado (se houver) para verificar se há violações.

VERIFIQUE CADA UM DOS SEGUINTES CRITÉRIOS:

1. **Conteúdo Ofensivo**: Nudez, violência explícita, gore, conteúdo sexual
2. **Discriminação**: Racismo, sexismo, homofobia, xenofobia, capacitismo ou qualquer forma de preconceito
3. **Marcas e Propriedade Intelectual**: Uso indevido de logos, marcas registradas, personagens protegidos por copyright
4. **Alegações Falsas/Enganosas**: Promessas de cura, ganhos financeiros garantidos, informações médicas sem embasamento

5. **LEGISLAÇÃO BRASILEIRA DE MARKETING E PUBLICIDADE**:

   **5.1 BEBIDAS ALCOÓLICAS (Lei 9.294/96 + CONAR)**:
   - É PROIBIDO mostrar pessoas consumindo/bebendo bebidas alcoólicas na imagem
   - É PROIBIDO associar consumo de álcool a esportes, condução de veículos ou atividades que exijam atenção
   - É PROIBIDO sugerir que o consumo traz sucesso social, sexual ou profissional
   - É PROIBIDO usar menores de idade em qualquer contexto com bebidas alcoólicas
   - É OBRIGATÓRIO incluir a tarja/aviso: "BEBA COM MODERAÇÃO" ou equivalente ("Não recomendado para menores de 18 anos" / "Apenas para maiores de 18 anos" / "Aprecie com moderação")
   - Se a imagem mostra bebida alcoólica SEM a tarja obrigatória, isso é uma VIOLAÇÃO GRAVE
   - Se a imagem mostra alguém bebendo/consumindo bebida alcoólica, isso é uma VIOLAÇÃO GRAVE

   **5.2 TABACO (Lei 9.294/96)**:
   - É PROIBIDA qualquer publicidade de produtos fumígenos (cigarros, charutos, etc.)
   - Exceção: apenas em pontos de venda internos

   **5.3 MEDICAMENTOS E SAÚDE (ANVISA RDC 96/2008)**:
   - É PROIBIDO fazer propaganda de medicamentos de venda sob prescrição
   - Medicamentos de venda livre DEVEM incluir: "SE PERSISTIREM OS SINTOMAS, O MÉDICO DEVERÁ SER CONSULTADO"
   - É PROIBIDO prometer cura definitiva
   - É PROIBIDO usar profissionais de saúde recomendando produtos (exceto se permitido)

   **5.4 ALIMENTOS (ANVISA RDC 24/2010)**:
   - É PROIBIDO atribuir propriedades terapêuticas ou medicinais a alimentos
   - Alimentos com alto teor de açúcar/sódio/gordura: cuidado com apelo a crianças

   **5.5 PUBLICIDADE INFANTIL (ECA + Resolução 163 CONANDA)**:
   - É PROIBIDO direcionar publicidade a crianças menores de 12 anos
   - É PROIBIDO usar personagens infantis para vender produtos não destinados a crianças
   - É PROIBIDO usar linguagem imperativa dirigida a crianças ("peça para sua mãe")

   **5.6 CDC - Código de Defesa do Consumidor**:
   - Propaganda enganosa (informações falsas sobre produto)
   - Propaganda abusiva (discriminação, medo, violência, exploração de crianças)
   - Omissão de informações essenciais

   **5.7 LGPD**: Exposição de dados pessoais visíveis (CPF, telefone, endereço, etc.)
   
   **5.8 Marco Civil da Internet**: Conteúdo que incite violência ou ódio

6. **Qualidade Textual**: Textos ilegíveis, truncados, com erros ortográficos graves ou sobrepostos
7. **Rostos Identificáveis**: Pessoas reais identificáveis sem contexto apropriado
8. **Símbolos Sensíveis**: Símbolos religiosos, políticos ou militares usados de forma inadequada

Responda APENAS com um JSON válido (sem markdown, sem backticks):
{
  "approved": true/false,
  "score": <número de 0 a 100, onde 100 = totalmente seguro>,
  "flags": ["lista de problemas encontrados, vazia se aprovado"],
  "details": "Resumo breve da análise em português",
  "correctionInstructions": "Se approved=false, descreva EXATAMENTE o que precisa ser corrigido na imagem para torná-la conforme. Exemplo: 'Adicionar tarja BEBA COM MODERAÇÃO na parte inferior da imagem' ou 'Remover a cena de pessoa bebendo e substituir por garrafa em destaque sem consumo'. Se approved=true, deixe como string vazia."
}

Se a imagem for segura e sem problemas, retorne approved: true, score entre 85-100, flags vazio, e details com confirmação positiva.
Se houver problemas LEVES (ex: texto levemente ilegível), retorne approved: true, score 60-84, com flags descrevendo o problema.
Se houver problemas GRAVES (violações legais, conteúdo proibido, falta de avisos obrigatórios), retorne approved: false, score 0-59, com flags detalhadas e correctionInstructions com instruções claras de como corrigir.`;

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
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
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
      correctionInstructions: typeof parsed.correctionInstructions === 'string' && parsed.correctionInstructions.length > 0
        ? parsed.correctionInstructions
        : undefined,
    };

    console.log('[Compliance] Result:', { approved: result.approved, score: result.score, flagCount: result.flags.length, hasCorrections: !!result.correctionInstructions });
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

/**
 * Attempts to auto-correct an image that failed compliance.
 * Uses Gemini image editing to fix the violations.
 * Returns the new base64 image data or null if correction failed.
 */
export async function autoCorrectImage(
  imageUrl: string,
  correctionInstructions: string,
  originalPrompt?: string,
): Promise<string | null> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) return null;

  try {
    console.log('[Compliance AutoCorrect] Starting auto-correction...');
    console.log('[Compliance AutoCorrect] Instructions:', correctionInstructions);

    const parts: any[] = [];

    // Build correction prompt
    const correctionPrompt = `VOCÊ É UM EDITOR DE IMAGENS DE COMPLIANCE. Corrija a imagem a seguir de acordo com estas instruções OBRIGATÓRIAS:

${correctionInstructions}

REGRAS:
1. Mantenha a composição, estilo e qualidade visual IGUAIS à imagem original
2. Aplique APENAS as correções solicitadas acima
3. Se for necessário adicionar uma tarja/aviso legal (ex: "BEBA COM MODERAÇÃO", "Não recomendado para menores de 18 anos"), adicione-a na parte INFERIOR da imagem com fundo escuro semi-transparente e texto branco legível
4. Se for necessário remover uma pessoa consumindo algo, substitua por uma cena equivalente SEM o consumo direto
5. NÃO altere cores, estilo ou elementos que NÃO foram mencionados nas instruções
6. Mantenha a mesma proporção/dimensões da imagem original

${originalPrompt ? `CONTEXTO ORIGINAL DA IMAGEM:\n"${originalPrompt}"` : ''}`;

    parts.push({ text: correctionPrompt });

    // Add original image
    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    } else {
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        console.error('[Compliance AutoCorrect] Failed to fetch image:', imgResponse.status);
        return null;
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
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for image generation

    // Use flash image model for editing
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            temperature: 0.2,
          },
        }),
      },
    ).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      console.error('[Compliance AutoCorrect] Gemini error:', response.status);
      return null;
    }

    const data = await response.json();
    const candidates = data?.candidates || [];
    
    for (const candidate of candidates) {
      const candidateParts = candidate?.content?.parts || [];
      for (const part of candidateParts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          const correctedImage = `data:${mimeType};base64,${part.inlineData.data}`;
          console.log('[Compliance AutoCorrect] Image corrected successfully');
          return correctedImage;
        }
      }
    }

    console.error('[Compliance AutoCorrect] No image in correction response');
    return null;

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Compliance AutoCorrect] Timeout');
    } else {
      console.error('[Compliance AutoCorrect] Error:', error);
    }
    return null;
  }
}
