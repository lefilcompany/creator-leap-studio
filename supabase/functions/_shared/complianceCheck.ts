/**
 * Agente de Compliance/Moderação Pós-Geração
 * 
 * Analisa imagens e vídeos gerados para detectar violações de:
 * - Leis brasileiras de marketing (Lei 9.294/96, CONAR, ANVISA, CDC, LGPD, ECA)
 * - Conteúdo ofensivo, discriminatório ou violento
 * - Marcas registradas e direitos autorais
 * - Regulamentações setoriais (bebidas alcoólicas, medicamentos, alimentos, tabaco)
 * 
 * Estratégia: fail-open (se o check falhar, o conteúdo é entregue sem badge)
 */

export interface ComplianceResult {
  approved: boolean;
  score: number; // 0-100 (100 = totalmente seguro)
  flags: string[];
  details: string;
  correctionInstructions?: string; // Instruções para corrigir a imagem
  wasAutoCorrected?: boolean;
  originalIssues?: string[];
  category?: string; // Categoria principal do problema (ex: "alcohol", "health", "discrimination")
}

const COMPLIANCE_PROMPT = `Você é um agente de compliance especializado em legislação brasileira de marketing e publicidade.

Analise a imagem fornecida e o texto associado com RIGOR MÁXIMO para detectar QUALQUER violação.

## LEGISLAÇÃO OBRIGATÓRIA A VERIFICAR:

### 1. BEBIDAS ALCOÓLICAS (Lei 9.294/96 + CONAR)
- ❌ PROIBIDO: Cenas de pessoas bebendo/consumindo bebida alcoólica
- ❌ PROIBIDO: Associar bebida alcoólica a sucesso, esporte, saúde, desempenho sexual
- ❌ PROIBIDO: Público infantil/adolescente em contexto de bebida alcoólica
- ❌ PROIBIDO: Sugerir que álcool é inofensivo ou benéfico
- ⚠️ OBRIGATÓRIO: Se for propaganda de bebida alcoólica, DEVE conter a tarja/aviso: "BEBA COM MODERAÇÃO" ou "Não recomendado para menores de 18 anos" ou "Apenas para maiores de 18 anos"
- ⚠️ OBRIGATÓRIO: Se a imagem for de marca de bebida alcoólica, verificar se há a tarja de advertência

### 2. TABACO (Lei 9.294/96)
- ❌ PROIBIDO: Qualquer propaganda de cigarros/tabaco em mídias digitais
- ❌ PROIBIDO: Imagens de pessoas fumando em contexto publicitário

### 3. MEDICAMENTOS E SAÚDE (ANVISA RDC 96/2008)
- ❌ PROIBIDO: Alegar cura, prevenção ou tratamento sem embasamento
- ❌ PROIBIDO: "Antes e depois" para produtos de saúde
- ⚠️ OBRIGATÓRIO: "SE PERSISTIREM OS SINTOMAS, O MÉDICO DEVERÁ SER CONSULTADO" para medicamentos

### 4. ALIMENTOS (ANVISA RDC 24/2010 + CONANDA)
- ❌ PROIBIDO: Alegar propriedades que o alimento não possui
- ❌ PROIBIDO: Dirigir publicidade de alimentos não saudáveis a crianças
- ⚠️ Cuidado com claims nutricionais sem comprovação

### 5. PUBLICIDADE INFANTIL (ECA + CONANDA Res. 163/2014)
- ❌ PROIBIDO: Publicidade dirigida a crianças menores de 12 anos
- ❌ PROIBIDO: Merchandising abusivo voltado ao público infantil
- ❌ PROIBIDO: Explorar ingenuidade infantil para vender

### 6. CÓDIGO DE DEFESA DO CONSUMIDOR (CDC)
- ❌ PROIBIDO: Publicidade enganosa (induzir ao erro)
- ❌ PROIBIDO: Publicidade abusiva (discriminação, medo, superstição)
- ❌ PROIBIDO: Omitir informações essenciais ao consumidor

### 7. LGPD
- ❌ PROIBIDO: Expor dados pessoais identificáveis sem consentimento
- ⚠️ Cuidado com rostos identificáveis em contextos sensíveis

### 8. CONTEÚDO GERAL
- ❌ PROIBIDO: Discriminação (raça, gênero, orientação sexual, religião, deficiência)
- ❌ PROIBIDO: Conteúdo sexual explícito ou sugestivo inapropriado
- ❌ PROIBIDO: Violência explícita ou glamourizada
- ❌ PROIBIDO: Discurso de ódio
- ❌ PROIBIDO: Uso indevido de símbolos protegidos, marcas registradas
- ⚠️ Textos na imagem devem ser legíveis e corretos

## FORMATO DE RESPOSTA:
Responda EXATAMENTE neste formato JSON (TODOS os textos devem estar em PORTUGUÊS BRASILEIRO):
{
  "approved": true/false,
  "score": 0-100,
  "flags": ["lista", "de", "códigos", "dos", "problemas"],
  "details": "Descrição detalhada EM PORTUGUÊS dos problemas encontrados e por que violam a legislação. Escreva de forma clara e acessível para o usuário final.",
  "category": "categoria principal (alcohol, tobacco, health, food, children, consumer, lgpd, discrimination, violence, trademark, text_quality, none)",
  "correctionInstructions": "Se reprovado, instruções ESPECÍFICAS em português para corrigir o prompt e gerar uma nova imagem que esteja em conformidade. Descreva exatamente o que deve ser diferente na nova geração."
}

IMPORTANTE:
- Se a imagem for de uma marca de bebida alcoólica e NÃO tiver a tarja obrigatória de advertência, REPROVAÇÃO IMEDIATA.
- Se a imagem mostrar consumo de bebida alcoólica, REPROVAÇÃO IMEDIATA.
- Se for propaganda de tabaco, REPROVAÇÃO IMEDIATA.
- Seja rigoroso mas justo. Não reprove por problemas inexistentes.
- O campo correctionInstructions deve conter instruções CLARAS de como gerar uma versão corrigida.`;

/**
 * Verifica compliance de uma imagem gerada
 */
export async function checkCompliance(
  imageUrl: string,
  associatedText: string = '',
  apiKey: string,
  brandContext?: string
): Promise<ComplianceResult> {
  try {
    console.log('[Compliance] Iniciando verificação de compliance...');
    
    // Preparar partes da mensagem
    const parts: any[] = [];
    
    // Adicionar contexto da marca se disponível
    let promptText = COMPLIANCE_PROMPT;
    if (brandContext) {
      promptText += `\n\nCONTEXTO DA MARCA: ${brandContext}`;
    }
    if (associatedText) {
      promptText += `\n\nTEXTO ASSOCIADO À IMAGEM/VÍDEO: ${associatedText}`;
    }
    
    parts.push({ text: promptText });
    
    // Adicionar a imagem
    if (imageUrl.startsWith('data:')) {
      // Base64 image
      const [header, data] = imageUrl.split(',');
      const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/png';
      parts.push({ inlineData: { mimeType, data } });
    } else {
      // URL - download and convert to base64 (chunked to avoid stack overflow)
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        console.error('[Compliance] Failed to download image:', imgResponse.status);
        return getDefaultApproved();
      }
      const imgBuffer = await imgResponse.arrayBuffer();
      const bytes = new Uint8Array(imgBuffer);
      const chunkSize = 8192;
      let binaryStr = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binaryStr += String.fromCharCode(...chunk);
      }
      const base64 = btoa(binaryStr);
      const contentType = imgResponse.headers.get('content-type') || 'image/png';
      parts.push({ inlineData: { mimeType: contentType, data: base64 } });
    }
    
    // Chamar Gemini Vision
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      }
    );
    
    if (!response.ok) {
      console.error('[Compliance] Gemini API error:', response.status);
      return getDefaultApproved();
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse JSON - handle markdown fences and extract JSON object
    const stripped = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Compliance] No JSON found:', stripped.substring(0, 300));
      return getDefaultApproved();
    }
    
    const result = JSON.parse(jsonMatch[0]) as ComplianceResult;
    console.log('[Compliance] Result:', { approved: result.approved, score: result.score, flags: result.flags });
    
    return result;
  } catch (error) {
    console.error('[Compliance] Error:', error);
    // Fail-open: se o check falhar, aprovar
    return getDefaultApproved();
  }
}

/**
 * Verifica compliance de um vídeo (usando frame/thumbnail)
 * Para vídeos, não regeneramos - apenas flaggamos
 */
export async function checkVideoCompliance(
  videoUrl: string,
  prompt: string,
  apiKey: string,
  brandContext?: string
): Promise<ComplianceResult> {
  try {
    console.log('[Compliance] Verificando compliance do vídeo via prompt...');
    
    // Para vídeos, analisamos o prompt usado para gerar
    // já que não podemos facilmente analisar frames do vídeo no Deno
    const parts: any[] = [];
    
    let promptText = COMPLIANCE_PROMPT.replace(
      'Analise a imagem fornecida e o texto associado',
      'Analise o PROMPT de geração de vídeo fornecido e avalie se o conteúdo resultante pode violar regulamentações'
    );
    
    if (brandContext) {
      promptText += `\n\nCONTEXTO DA MARCA: ${brandContext}`;
    }
    
    promptText += `\n\nPROMPT DE GERAÇÃO DO VÍDEO: ${prompt}`;
    
    parts.push({ text: promptText });
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      }
    );
    
    if (!response.ok) {
      console.error('[Compliance] Video check API error:', response.status);
      return getDefaultApproved();
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const cleanedText = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultApproved();
    }
    
    const result = JSON.parse(jsonMatch[0]) as ComplianceResult;
    console.log('[Compliance Video] Result:', { approved: result.approved, score: result.score, flags: result.flags });
    
    return result;
  } catch (error) {
    console.error('[Compliance Video] Error:', error);
    return getDefaultApproved();
  }
}

function getDefaultApproved(): ComplianceResult {
  return {
    approved: true,
    score: 100,
    flags: [],
    details: 'Verificação automática não disponível',
    category: 'none'
  };
}
