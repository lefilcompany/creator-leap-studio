

# Refatoracao Completa do Two-Stage Pipeline

## Contexto

Os dois arquivos (`generate-image/index.ts` e `generate-quick-content/index.ts`) ja possuem a estrutura basica do two-stage pipeline, mas ainda ha inconsistencias. O `expandBriefing.ts` precisa de ajustes no system prompt, e a logica de texto/imagens de referencia precisa ser padronizada conforme as instrucoes exatas do usuario.

## Mudancas

### 1. `supabase/functions/_shared/expandBriefing.ts`

**System prompt**: Reescrever o system prompt da funcao `buildSystemPrompt` para usar exatamente a diretriz solicitada:
- "Voce e um Diretor de Arte Senior. Leia todo este contexto logico, estrategico e de marketing fornecido e retorne APENAS um briefing cinematografico puramente visual. Descreva: CENA, ILUMINACAO, CORES, COMPOSICAO e DIRETRIZES ESTETICAS. Nao inclua jargoes de marketing, blocos logicos estruturados ou a palavra Compliance na sua resposta."
- Manter as regras absolutas existentes (output em ingles, paragrafo unico, sem tags, sem negative prompts)
- Ajustar a instrucao de texto: quando `hasTextOverlay=true`, instruir o LLM a deixar espaco negativo para texto mas NAO adicionar instrucoes de tipografia (isso sera feito downstream)
- Quando `hasTextOverlay=false`, instruir a nao mencionar texto/tipografia

### 2. `supabase/functions/generate-image/index.ts`

**Limpeza do prompt final (Stage 3)**:
- Remover qualquer logica residual de concatenacao tipo `reinforcedBriefing` ou `enhancedPrompt.replace` (verificar se ja foi removida)
- O prompt final deve ser montado EXCLUSIVAMENTE com: `imageRolePrefix + visualDescription + textOverlayBlock + styleSuffix`

**Texto na imagem**:
- Quando `includeText=true`: adicionar o bloco exato em portugues no prompt final:
  `"\n\n- Design e Tipografia: Renderize PERFEITAMENTE o texto: "${textContent}". O texto DEVE ser o foco principal, estar na posicao "${textPosition}" e ser 100% legivel. Utilize espaco negativo estrategico na imagem, sobreposicoes de gradiente sutil ou caixas de texto limpas para garantir contraste absoluto entre a fonte e o fundo. O texto nao deve flutuar sem proposito, deve fazer parte de uma composicao de design profissional em formato para ${platform}."`
- Quando `includeText=false`: adicionar ao negative prompt: `text, watermark, typography, letters, signature, words, labels`

**Imagens de referencia**:
- Manter limite de 2 brand + 1 style
- Adicionar instrucao no inicio do prompt: "A(s) primeira(s) imagem(ns) definem a Identidade Visual e Paleta de Cores obrigatoria. A(s) ultima(s) servem apenas como inspiracao de composicao."

### 3. `supabase/functions/generate-quick-content/index.ts`

Aplicar exatamente a mesma arquitetura do `generate-image`:
- O briefing document inline ja existe, manter
- O `expandBriefing` ja e chamado, manter
- Ajustar a montagem do prompt final para incluir o `imageRolePrefix` com a instrucao de papeis das imagens
- O quick content nao tem text overlay, entao o negative prompt ja deve incluir as restricoes de texto (ja inclui)
- Padronizar a logica de imagens de referencia com o mesmo limite (2 brand + 1 style)

### 4. Deploy

Redeployar as edge functions `generate-image` e `generate-quick-content` apos as alteracoes.

## Arquivos Modificados

1. `supabase/functions/_shared/expandBriefing.ts` - System prompt do Art Director
2. `supabase/functions/generate-image/index.ts` - Bloco de texto exato, imageRolePrefix
3. `supabase/functions/generate-quick-content/index.ts` - Padronizar com imageRolePrefix

