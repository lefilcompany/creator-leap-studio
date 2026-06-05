# Plano: Novo README.md completo

Substituir o README atual (genérico do Lovable) por uma documentação real do projeto **Creator / Planejar Conteúdo (Lefil)** — plataforma de criação de conteúdo de marketing com IA.

## Estrutura proposta do novo README

1. **Cabeçalho** — Nome do produto, tagline, badges (React, Vite, TS, Tailwind, Supabase).
2. **Proposta do projeto**
   - Plataforma SaaS para marcas e equipes criarem conteúdo (imagens, carrosséis, vídeos, legendas, planejamentos) com IA.
   - Fluxos: Criação rápida, Criação personalizada (imagem/vídeo/carrossel), Calendário de conteúdo, Revisão, Marketplace de personas.
   - Sistema de créditos individuais, equipes opcionais, categorias, histórico, lixeira, favoritos.
   - Domínio canônico: `https://pla.creator.lefil.com.br`.
3. **Principais funcionalidades** (lista resumida por área)
   - Marcas, Personas, Temas estratégicos
   - Geração de imagem (Gemini / Nano Banana) com Art Director, modo Marketplace, modo Anúncio Profissional
   - Geração de carrossel multi-slide com regeneração individual
   - Geração de vídeo e animação de imagem
   - Calendário de conteúdo (briefing → design → revisão)
   - Chatbot interno, Onboarding tour, Notificações
   - Autenticação (email/senha + Google), planos Stripe, cupons, créditos
   - Painel System (admin global)
4. **Stack técnica**
   - Frontend: React 18, Vite 5, TypeScript 5, Tailwind 3, shadcn/ui, Radix, React Router 6, TanStack Query, Framer Motion, Embla Carousel, React Hook Form + Zod.
   - Backend: Lovable Cloud (Supabase) — Postgres + RLS, Auth, Storage, Edge Functions (Deno).
   - IA: Lovable AI Gateway (Google Gemini 2.5/3.x, GPT-5.x) + integração direta Gemini.
   - Pagamentos: Stripe (checkout, webhooks, portal).
   - Email: domínio customizado via Lovable Email.
   - Testes: Vitest, Playwright (E2E), Mocha + Selenium (integração).
5. **Arquitetura do repositório**
   ```text
   src/
     pages/           # rotas (Dashboard, Create*, Result, System/*)
     components/      # UI + features (carousel, regenerate, marcas, ...)
     contexts/        # Auth, Language, BackgroundTask
     hooks/           # useAuth, useCarouselSlides, useCredits...
     integrations/    # supabase client/types (auto-gerados)
     lib/             # utils, creditCosts, platformSpecs
   supabase/
     functions/       # edge functions (generate-image, generate-carousel-images, stripe-webhook, ...)
     config.toml
   e2e/ selenium/     # testes end-to-end
   ```
6. **Como rodar localmente** (passo a passo)
   - Pré-requisitos: Node 18+ e npm (ou bun), conta no Lovable Cloud / Supabase para variáveis.
   - `git clone <repo>` e `cd <pasta>`
   - `npm install`
   - Variáveis de ambiente (`.env`, normalmente gerenciado pelo Lovable):
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
     - `VITE_SUPABASE_PROJECT_ID`
   - `npm run dev` → app em `http://localhost:8080`
   - Build: `npm run build` / Preview: `npm run preview`
   - Lint: `npm run lint`
7. **Como funciona (fluxo end-to-end resumido)**
   - Usuário se autentica (Supabase Auth) → entra no Dashboard.
   - Escolhe um fluxo de criação → frontend monta briefing e chama edge function (ex: `generate-carousel-images`).
   - Edge function valida créditos (`profiles.credits`), chama Gemini via AI Gateway, salva resultado em Storage + tabela `actions`/`carousel_slides`.
   - Frontend assina via Realtime e renderiza o resultado; usuário pode regerar slides, favoritar, mover para categorias ou lixeira.
   - Stripe webhook recompõe créditos quando pacotes são comprados; cupons adicionam saldo com expiração de 30 dias.
8. **Testes**
   - `npm test` (Vitest)
   - `npm run test:coverage`
   - `npm run test:e2e` (Playwright)
   - `npm run test:integration` (Mocha + Selenium)
9. **Deploy**
   - Via Lovable (Publish) — domínio padrão e custom domain configurados.
   - Edge functions são deployadas automaticamente pelo Lovable.
10. **Documentação adicional** — links para arquivos existentes: `EMAIL_CONFIGURATION.md`, `MIGRATION_GUIDE.md`, `OAUTH_SETUP.md`, `STRIPE_TESTING_GUIDE.md`, `STRIPE_WEBHOOK_SETUP.md`, `TESTING.md`, `TRANSLATION_GUIDE.md`.
11. **Licença / Propriedade** — Projeto proprietário Lefil (a confirmar com o usuário se quiser explicitar).

## Arquivos alterados
- `README.md` — sobrescrito com o novo conteúdo em PT-BR.

## Fora de escopo
- Não criar diagramas de imagens.
- Não alterar nenhum outro arquivo do projeto.
- Não alterar a licença real do repositório.
