# Guia de Migração de Usuários

## Visão Geral

Esta ferramenta permite migrar usuários de um sistema antigo para o sistema Creator atual, mantendo dados de perfil e equipes.

## Como Funcionar

### 1. Acesso à Ferramenta

Acesse a página de migração através da URL: `/migrate-users`

### 2. Formato do CSV

O arquivo CSV deve conter as seguintes colunas:

- `id`: ID do usuário antigo (será descartado, novos UUIDs serão gerados)
- `name`: Nome completo do usuário
- `email`: Email do usuário (obrigatório)
- `password`: Senha hasheada antiga (será substituída por senha temporária)
- `phone`: Telefone (opcional)
- `state`: Estado (opcional)
- `city`: Cidade (opcional)
- `role`: Papel do usuário (`ADMIN`, `MEMBER`, `WITHOUT_TEAM`)
- `status`: Status do usuário (`ACTIVE`, `NO_TEAM`, `PENDING`)
- `teamId`: ID da equipe antiga (será mapeado para novo UUID)
- `resetToken`: Token de reset (não utilizado)
- `resetTokenExpiry`: Expiração do token (não utilizado)
- `tutorialCompleted`: Se o tutorial foi completado (`true`/`false`)

### 3. Processo de Migração

A migração segue estas etapas:

#### Fase 1: Criação de Equipes
- Identifica todas as equipes únicas no CSV
- Cria cada equipe no sistema com código único: `MIGRATED-{últimos8dígitos}`
- Mapeia IDs antigos para novos UUIDs

#### Fase 2: Criação de Usuários
Para cada usuário no CSV:

1. **Cria conta no Supabase Auth**
   - Email do CSV
   - Senha temporária: `ChangeMe123!`
   - Email confirmado automaticamente

2. **Cria perfil na tabela `profiles`**
   - Dados pessoais (nome, telefone, cidade, estado)
   - Vincula à equipe se houver
   - Marca tutorial como completo se aplicável

3. **Atribui papel (role)**
   - `ADMIN` → role `admin`
   - `MEMBER` → role `user`
   - `WITHOUT_TEAM` → sem role

4. **Envia email de reset de senha**
   - Automaticamente via sistema nativo do Supabase
   - Usuário recebe link para criar nova senha

### 4. Mapeamento de Dados

#### Roles
```
Sistema Antigo → Sistema Novo
ADMIN          → admin
MEMBER         → user
WITHOUT_TEAM   → (sem role)
```

#### Status
```
ACTIVE com teamId  → usuário vinculado à equipe
NO_TEAM           → sem equipe (team_id = NULL)
WITHOUT_TEAM      → sem equipe (team_id = NULL)
PENDING           → sem equipe (team_id = NULL)
```

#### Teams
```
teamId antigo → novo UUID da equipe
- Código único: MIGRATED-{8 dígitos}
- Nome: Team {nome do admin}
- Plano: free (padrão)
```

### 5. Após a Migração

#### Para Usuários
1. Verifique sua caixa de entrada
2. Clique no link de redefinição de senha
3. Crie uma nova senha segura
4. Faça login no sistema

#### Para Administradores
O relatório de migração mostrará:

- **Estatísticas**
  - Total de usuários processados
  - Usuários criados com sucesso
  - Equipes criadas
  - Número de erros

- **Avisos** (warnings)
  - Usuários que já existiam
  - Pequenos problemas não críticos

- **Erros**
  - Emails inválidos
  - Falhas na criação de contas
  - Problemas específicos por usuário

### 6. Casos Especiais

#### Usuários Duplicados
- Se o email já existe no sistema, o usuário será ignorado
- Aparecerá nos "Avisos" do relatório

#### Emails Inválidos
- Emails sem `@` ou formato incorreto serão rejeitados
- Aparecerão nos "Erros" do relatório

#### Usuários sem Equipe
- `WITHOUT_TEAM`, `NO_TEAM`, ou `PENDING` → sem equipe no sistema novo
- Podem entrar em equipe posteriormente via código de acesso

#### Admins de Equipe
- Primeiro admin de cada equipe se torna o `admin_id` da equipe
- Recebe role `admin` automaticamente

### 7. Segurança

✅ **Implementado:**
- Senhas antigas não são migradas (hashs incompatíveis)
- Senhas temporárias seguras
- Reset de senha obrigatório
- Emails confirmados automaticamente
- RLS policies aplicadas em todas as tabelas

⚠️ **Importante:**
- A Edge Function requer autenticação (`verify_jwt = true`)
- Apenas usuários autenticados podem executar a migração
- Recomenda-se executar a migração apenas uma vez

### 8. Troubleshooting

#### "Invalid email format"
- Verifique se todos os emails têm formato válido (ex: usuario@dominio.com)

#### "User already exists"
- Email já cadastrado no sistema
- Usuário pode fazer login normalmente ou resetar senha

#### "Auth creation failed"
- Pode ser problema temporário do Supabase
- Tente novamente ou verifique logs da Edge Function

#### "Team creation failed"
- Código de equipe pode estar duplicado
- Verifique logs para detalhes específicos

### 9. Logs

Logs detalhados são registrados na Edge Function `migrate-users`:
- Progresso da migração
- Erros específicos por usuário
- Criação de teams e usuários
- Envio de emails

Acesse os logs através do painel do Supabase.

### 10. Rollback

Se necessário reverter a migração:

1. Deletar usuários criados (filtrar por data de criação)
2. Deletar equipes criadas (filtrar por código começando com "MIGRATED-")
3. Limpar tabela `user_roles` dos usuários deletados

**Atenção:** Não há script automático de rollback. Faça backup antes de migrar!

## Exemplo de CSV

```csv
id,name,email,password,phone,state,city,role,status,teamId,resetToken,resetTokenExpiry,tutorialCompleted
abc123,João Silva,joao@example.com,$2b$12$hash..,(11) 98765-4321,SP,São Paulo,ADMIN,ACTIVE,team001,,,true
def456,Maria Santos,maria@example.com,$2b$12$hash..,(11) 91234-5678,SP,São Paulo,MEMBER,ACTIVE,team001,,,true
ghi789,Pedro Costa,pedro@example.com,$2b$12$hash..,(21) 99999-8888,RJ,Rio de Janeiro,WITHOUT_TEAM,NO_TEAM,,,,false
```

## Conclusão

A ferramenta de migração facilita a importação de usuários preservando dados importantes e garantindo segurança através do reset obrigatório de senhas. Usuários receberão automaticamente instruções para acessar o novo sistema.
