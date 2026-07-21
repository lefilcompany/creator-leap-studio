# Creator MCP — Documentação

Servidor MCP (Model Context Protocol) do Creator. Permite que agentes externos
(ex.: o "Marketing OS") consultem e criem contexto (marcas, personas, temas) e
disparem geração/revisão de conteúdo em nome do usuário autenticado.

- **Endpoint**: `https://<project-ref>.supabase.co/functions/v1/mcp`
- **Transporte**: MCP Streamable HTTP (JSON-RPC + SSE)
- **Autenticação**: OAuth 2.1 do Supabase (issuer direto `supabase.co`)
- **Consent**: `/.lovable/oauth/consent`
- **DCR**: dynamic client registration habilitado

Todos os handlers usam o token OAuth do usuário — RLS do banco aplica
normalmente. Nenhuma tool aceita `user_id` como input.

## Fluxo típico (roteiro do Anexo D)

```text
1. list_brands            → verifica se a marca existe
   └─ (se não) create_brand
2. get_brand              → carrega identidade visual/paleta
3. list_personas          → escolhe persona-alvo
4. list_themes            → identifica editoria/tema
5. create_image_content   → gera a peça com todo o contexto
6. generate_caption       → legenda para a peça
7. review_image/caption   → aplica ajustes se necessário
```

Para planejamento em lote: `create_content_plan` → `list_calendar_items`.

## Mapeamento roteiro → tool MCP

| Pergunta do roteiro                              | Tool MCP                              |
| ------------------------------------------------ | ------------------------------------- |
| "É para qual marca?"                             | `list_brands`, `get_brand`            |
| "Marca nova, quero cadastrar"                    | `create_brand`                        |
| "Para qual persona?"                             | `list_personas`, `get_persona`        |
| "Que narrativa contar?"                          | passa em `create_image_content.narrative` |
| "Qual tom de voz (até 4)?"                       | `create_image_content.tone[]`         |
| "Formato/plataforma/tamanho?"                    | `create_image_content.platform` + `aspect_ratio` |
| "Orgânico ou tráfego pago?"                      | `create_image_content.content_type`   |
| "Texto sobre a imagem?"                          | `create_image_content.include_text` + `text_content` |
| "Descreve a cena"                                | `create_image_content.description`    |
| "Faz parte de uma campanha?"                     | `create_image_content.campaign_context` |
| "Calendário de conteúdo da campanha"             | `create_content_plan`                 |
| "Revisar conteúdo já existente"                  | `review_image` / `review_caption`     |

## Ferramentas

### Verificação de conectividade
- **echo** — devolve o texto recebido; use para validar OAuth e conexão.

### Perfil e créditos
- **get_profile** — nome, e-mail, créditos, team_id do usuário logado.
- **get_credit_balance** — saldo atual (`credits`, `max_credits`, expiração).

### Marcas
- **list_brands** — `{ limit? }` → lista compacta (id, nome, cor, criado_em).
- **get_brand** — `{ id }` → registro completo (paleta, logo, valores, restrições…).
- **create_brand** — cadastro rápido do roteiro. Obrigatórios: `name`, `segment`, `values`, `success_metrics`, `restrictions`, `logo_url`.
- **update_brand** — atualização parcial (`id` + campos).
- **delete_brand** — remove definitivamente.

### Personas
- **list_personas** — `{ brand_id?, limit? }`.
- **get_persona** — `{ id }`.
- **create_persona** — `name` obrigatório; `brand_id`, `main_goal`, `challenges`, `preferred_tone_of_voice`, etc.
- **update_persona** / **delete_persona**.

### Temas estratégicos (editorias)
- **list_themes** / **get_theme**.
- **create_theme** — `title` + `brand_id` obrigatórios; `tone_of_voice`, `macro_themes`, `platforms`, etc.
- **update_theme** / **delete_theme**.

### Criação de conteúdo
- **create_image_content** — pipeline completo. Custo: 8 créditos (COMPLETE_IMAGE).
  - **Obrigatórios**: `brand_id` (uuid), `description` (≤2000), `reference_image_url` (https ou data URL).
  - **Contexto**: `persona_id`, `theme_id`, `narrative`, `campaign_context`, `objective`, `tone[]` (máx 4), `content_type` (`organic`/`paid`).
  - **Formato**: `platform`, `aspect_ratio` (`1:1`|`4:5`|`9:16`|`16:9`|`3:4`|`4:3`), `width`, `height`.
  - **Referências extras**: `brand_reference_images[]` (máx 3, preservadas), `style_reference_images[]` (máx 5, estilo/paleta), `preserve_image_indices[]` (índices de style_ref a preservar pixel-perfect).
  - **Texto na imagem**: `include_text`, `text_content` (≤200), `text_position`, `font_style`, `text_design_style`, `font_size` (12–120), `font_family`, `font_weight`, `font_italic`.
  - **Anúncio**: `cta_text` (≤80), `ad_mode` (`regular`/`professional` → Headline Hero 30–40%), `price_text`, `include_brand_logo`, `disclaimer_text`, `disclaimer_style`.
  - **Direção visual**: `visual_style` (`realistic` default), `color_palette`, `lighting`, `composition`, `camera_angle`, `detail_level` (0–10, default 7), `mood`, `negative_prompt` (≤500).
  - **Retorno**: `imageUrl`, `action_id`, `title`, `headline`, `subtexto`, `creditsConsumed` e demais campos que `generate-image` devolve.
- **create_quick_content** — versão simplificada (`prompt` livre).
- **generate_caption** — legenda a partir de imagem/contexto.
- **create_content_plan** — calendário: `brand_id`, `quantity`, `objective`, `platforms[]`.

### Revisão
- **review_image** — `{ image_url, prompt, brand_id? }`.
- **review_caption** — `{ caption, prompt, brand_id? }`.
- **review_text_for_image** — `{ text, prompt, brand_id? }` (headline/CTA/disclaimer).

### Histórico
- **list_actions** — filtros `brand_id`, `type`.
- **get_action** — detalhes completos por id.

### Calendários
- **list_calendars** — `{ brand_id?, limit? }`.
- **list_calendar_items** — `{ calendar_id, limit? }`.

## Limitações conhecidas

- **Vídeo** não é exposto via MCP (fluxo assíncrono/longo — permanece no app).
- **Upload de bytes** (logo/imagem) não é suportado; envie sempre uma URL pública.
- Geração de imagem pode levar 15–30s; fica dentro do timeout MCP típico, mas para calendários grandes prefira o padrão async: `create_content_plan` devolve o `calendar_id` e você lê os itens depois via `list_calendar_items`.
- Créditos são consumidos pelas edge functions (mesma regra do app).

## Como conectar

1. O cliente MCP descobre o endpoint e obtém o metadata em
   `/.well-known/oauth-protected-resource`.
2. Faz o fluxo OAuth 2.1 com issuer `https://<ref>.supabase.co/auth/v1`.
3. Usuário aprova em `/.lovable/oauth/consent`.
4. Cliente recebe access token e passa a listar tools via `tools/list`.
