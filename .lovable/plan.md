

# Plano: Criar equipe "Lefil Testes" com dados completos

## Resumo
Criar a equipe "Lefil Testes", mover Samuel e Rodrigo para ela, e popular com 5 marcas, 5 personas, 5 temas estratégicos e **30 criações** (10 conteúdo rápido, 10 criar conteúdo, 5 calendário de conteúdo, 5 marketplace).

## Dados dos usuários
- **Samuel**: `cc592fe7-fb8f-4b53-93a1-aa25d848bf43` (atual equipe: `30ade942-ffa3-4800-9e1b-724238309989`)
- **Rodrigo**: `cf6ac154-9daa-4023-acaf-dd7b2fd7823b` (atual equipe: `a8e8f53f-0fd7-450e-8e9c-029ca943ab79`)

## Etapas

### 1. Criar equipe e mover usuários
- Remover Samuel e Rodrigo das equipes atuais (limpar `profiles.team_id` e `team_members`)
- Criar equipe "Lefil Testes" (code: `lefil-testes`, admin: Samuel, plan: `free`)
- Associar ambos à nova equipe (`profiles.team_id` + `team_members`)

### 2. Criar 5 marcas
Marcas fictícias variadas: Café Aroma (Alimentação), StudioFit (Fitness), VerdeTech (Sustentabilidade), PetAmor (Pet Shop), ArteBrasil (Artesanato). Cada uma com segmento, valores, palavras-chave e metas.

### 3. Criar 5 personas (1 por marca)
Dados demográficos, contexto profissional, desafios, tom de voz.

### 4. Criar 5 temas estratégicos (1 por marca)
Título, descrição, paleta, público-alvo, hashtags, objetivos, plataformas.

### 5. Criar 30 criações (actions)
Distribuídas entre as 5 marcas (6 por marca):
- **10× `CRIAR_CONTEUDO_RAPIDO`** — com `details` (prompt, platform, objective) e `result` (título, legenda, hashtags)
- **10× `CRIAR_CONTEUDO`** — com `details` (prompt, platform, persona, theme) e `result` (imageUrl, título, legenda)
- **5× `PLANEJAR_CONTEUDO`** — com `details` (objective, platform) e `result` (plan com calendário)
- **5× `CRIAR_CONTEUDO_RAPIDO` com `mode: 'marketplace'`** — com `details` (prompt, mode: marketplace, platform: marketplace)
- Datas variadas nos últimos 30 dias
- `user_id` de Samuel como criador

## Detalhes técnicos
- Todas as operações via ferramenta de inserção SQL (INSERT/UPDATE/DELETE)
- Nenhuma migração de schema necessária
- Execução sequencial: equipe → marcas → personas → temas → ações

