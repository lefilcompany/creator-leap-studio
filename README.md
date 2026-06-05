# Creator · Planejar Conteúdo (Lefil)

Plataforma SaaS de criação de conteúdo de marketing com IA — para marcas, criadores e equipes produzirem imagens, carrosséis, vídeos, legendas e planejamentos editoriais em minutos, com fluxo guiado e governança de créditos.

> Domínio oficial: **https://pla.creator.lefil.com.br**

Stack principal: **React 18 · Vite 5 · TypeScript 5 · Tailwind 3 · shadcn/ui · Supabase (Lovable Cloud) · Gemini / GPT via Lovable AI Gateway · Stripe**.

---

## 🎯 Proposta

O Creator resolve a dor de quem precisa publicar conteúdo de marketing com frequência e consistência de marca, mas não tem tempo, agência ou repertório criativo para isso.

A plataforma combina:

- **Contexto da marca** (identidade visual, tom de voz, personas, temas estratégicos)
- **Modelos generativos de ponta** (Google Gemini 2.5/3.x e GPT-5.x via Lovable AI Gateway)
- **Direção de arte automatizada** (prompt enrichment, modos Marketplace e Anúncio Profissional, guardrails de fidelidade)
- **Governança** (créditos individuais, equipes opcionais, categorias, histórico, lixeira, favoritos, compliance brasileiro)

O resultado é um fluxo "briefing → IA → ajuste → publicação" coerente com a marca do usuário, em escala.

---

## ✨ Principais funcionalidades

**Configuração de marca**
- Marcas, identidade visual, paleta, tom de voz e feedback de estilo aprendido
- Personas (próprias + marketplace)
- Temas estratégicos

**Criação de conteúdo**
- **Criação Rápida** — prompt único, resultado em segundos
- **Criação Personalizada de Imagem** — Art Director, modo Marketplace (montagens com fidelidade total ao produto) e modo Anúncio Profissional (regras hierárquicas e headline hero 30–40%)
- **Carrossel multi-slide** com regeneração individual por slide
- **Vídeo** e **animação** de imagem
- **Legenda sugerida** padronizada (título, corpo, CTA, 5 hashtags)
- **Ajuste** de conteúdo já gerado

**Planejamento**
- **Calendário de Conteúdo** com fluxo de 4 etapas (calendar → briefing → design → review → done)

**Colaboração e organização**
- Equipes opcionais com transferência de propriedade
- Categorias com papéis (Dono, Editor, Leitor)
- Histórico, favoritos ("Para mim" / "Para a equipe"), lixeira com retenção de 30 dias
- Perfis públicos para colegas de equipe
- Chatbot interno (Gemini) e tour de onboarding

**Conta e billing**
- Autenticação por email/senha + Google OAuth (no login)
- Planos e checkout via Stripe + cupons (somam créditos, expiram em 30 dias)
- Créditos estritamente individuais (`profiles.credits`), R$ 2,90/crédito base
- Painel **System** para administração global

---

## 🧱 Stack técnica

| Camada | Tecnologias |
|---|---|
| Frontend | React 18, Vite 5, TypeScript 5, React Router 6, TanStack Query, Tailwind 3, shadcn/ui + Radix, Framer Motion, Embla Carousel, React Hook Form, Zod, Sonner |
| Backend | Lovable Cloud (Supabase) — Postgres + RLS, Auth, Storage, Realtime, Edge Functions (Deno) |
| IA | Lovable AI Gateway (Google Gemini 2.5/3.x, GPT-5.x) + integração direta Gemini para imagem |
| Pagamentos | Stripe (Checkout, Webhooks, Customer Portal) |
| Email | Domínio customizado via Lovable Email |
| Testes | Vitest, Playwright (E2E), Mocha + Selenium (integração) |
| Build/Deploy | Vite, Lovable Publish (deploy automático de edge functions) |

---

## 📁 Estrutura do repositório

```text
src/
  pages/             # Rotas (Dashboard, Create*, Result, System/*, Auth, ...)
  components/        # UI + features (carousel, regenerate, marcas, personas, ...)
  contexts/          # AuthContext, LanguageContext, BackgroundTaskContext
  hooks/             # useAuth, useCarouselSlides, useCreditsAction, ...
  integrations/
    supabase/        # client.ts e types.ts (AUTO-GERADOS — não editar)
  lib/               # utils, creditCosts, platformSpecs, translations
  assets/            # imagens estáticas

supabase/
  functions/         # Edge Functions (Deno): generate-image, generate-carousel-images,
                     # generate-video, generate-quick-content, generate-caption,
                     # stripe-webhook, create-checkout, redeem-coupon, ...
  config.toml        # Configuração do projeto Supabase

e2e/                 # Testes end-to-end Playwright
selenium/            # Testes de integração Mocha + Selenium
public/              # Assets públicos, sitemap, robots
```

Documentação complementar na raiz:
[`EMAIL_CONFIGURATION.md`](./EMAIL_CONFIGURATION.md) · [`OAUTH_SETUP.md`](./OAUTH_SETUP.md) · [`STRIPE_TESTING_GUIDE.md`](./STRIPE_TESTING_GUIDE.md) · [`STRIPE_WEBHOOK_SETUP.md`](./STRIPE_WEBHOOK_SETUP.md) · [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md) · [`TESTING.md`](./TESTING.md) · [`TRANSLATION_GUIDE.md`](./TRANSLATION_GUIDE.md)

---

## 🚀 Como rodar localmente

### Pré-requisitos
- **Node.js 18+** e **npm** (ou bun/pnpm)
- Acesso ao projeto no **Lovable Cloud** (ou um projeto Supabase próprio) para obter as variáveis públicas

> Dica: se ainda não tem Node, use o [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

### Passo a passo

```sh
# 1. Clonar o repositório
git clone <URL_DO_REPO>
cd <pasta-do-projeto>

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
#    Crie um arquivo .env na raiz com:
#      VITE_SUPABASE_URL=https://<project-ref>.supabase.co
#      VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
#      VITE_SUPABASE_PROJECT_ID=<project ref>
#
#    No Lovable, o .env é gerado automaticamente pela integração Cloud
#    — não edite manualmente quando estiver dentro do Lovable.

# 4. Subir o servidor de desenvolvimento (porta 8080)
npm run dev
```

Acesse `http://localhost:8080`.

### Outros scripts

```sh
npm run build        # build de produção
npm run build:dev    # build em modo development
npm run preview      # serve o build localmente
npm run lint         # ESLint
npm test             # Vitest (watch interativo)
npm run test:ci      # Vitest com coverage (não-interativo)
npm run test:e2e     # Playwright E2E
npm run test:e2e:ui  # Playwright em modo UI
npm run test:integration  # Mocha + Selenium
```

---

## 🔄 Como funciona (fluxo end-to-end)

1. **Autenticação** — o usuário entra via Supabase Auth (email/senha ou Google) e é direcionado ao Dashboard.
2. **Configuração** — cadastra marcas, personas e temas estratégicos que servirão como contexto para a IA.
3. **Criação** — escolhe um fluxo (Imagem, Carrossel, Vídeo, Calendário, Rápida, etc.) e monta um briefing.
4. **Geração** — o frontend chama uma Edge Function (ex: `generate-carousel-images`) que:
   - Valida créditos do usuário em `profiles.credits` (respeitando `credits_expire_at`)
   - Roda **moderação/compliance** (legislação brasileira)
   - Aplica o **Art Director** (enriquecimento de prompt) e guardrails de fidelidade
   - Chama o modelo (Gemini / Nano Banana) e salva imagem em **Storage** + metadados em `actions` / `carousel_slides`
   - Debita créditos e registra em `credit_history`
5. **Realtime** — o frontend assina mudanças via Supabase Realtime e renderiza slides/legenda assim que ficam prontos.
6. **Ajuste** — o usuário pode regerar slides individualmente, ajustar texto, favoritar, mover para categorias ou enviar à lixeira (soft delete, 30 dias).
7. **Billing** — compras de pacotes via Stripe disparam o `stripe-webhook`, que credita o usuário. Cupons (`redeem-coupon`) somam créditos com nova expiração de 30 dias.

---

## 🚢 Deploy

Deploy é gerenciado pelo **Lovable**: ao clicar em **Publish**, o frontend é publicado nos domínios configurados e as Edge Functions em `supabase/functions/` são deployadas automaticamente — não é necessário rodar `supabase functions deploy` manualmente.

Domínios em uso:
- Produção: `https://pla.creator.lefil.com.br`
- Preview: gerado por branch pelo Lovable

---

## 🔐 Convenções importantes

- **Não editar** `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts` nem `.env` — são gerenciados pela integração Lovable Cloud.
- **Créditos são individuais** (`profiles.credits`). Times são opcionais.
- **RLS sempre ativo** em tabelas `public` + grants explícitos para `authenticated` / `service_role`.
- **Banco Live é read-only via tooling** — alterações sempre via migrations/edge functions.
- **Design system**: usar tokens semânticos do `index.css` / `tailwind.config.ts`, nunca cores hardcoded.

---

## 📄 Licença

Projeto proprietário © Lefil. Todos os direitos reservados.
