

# Plano: Redesign da Tela de Login e Cadastro

## Resumo
Melhorar visualmente a tela de autenticacao (Login e Cadastro) na rota `/`, aprimorando o background, removendo mensagens de erro inline em favor de toasts, e garantindo centralizacao e funcionalidade completa.

## Mudancas Planejadas

### 1. Remover Mensagens de Erro Inline
- Remover o bloco vermelho de "sugestao de reset de senha" que aparece dentro do formulario de login (linhas 442-462 do Auth.tsx)
- Manter apenas os toasts (sonner) para feedback de erros - ja existentes no codigo
- Remover o estado `showPasswordResetSuggestion` e logica associada, simplificando o componente

### 2. Melhorar o Background
- Substituir o gradiente atual por um fundo mais sofisticado com tons suaves de rosa/lilas alinhados a identidade visual do Creator
- Ajustar as esferas animadas para cores mais harmonicas (rosa claro, lilas, azul claro) com opacidades reduzidas
- Reduzir a quantidade de elementos decorativos flutuantes de 3 para 2, com melhor posicionamento
- Melhorar contraste entre modo claro e escuro

### 3. Centralizar e Polir o Card
- Garantir centralizacao vertical e horizontal perfeita em todas as resolucoes
- Aumentar levemente o padding interno do card para dar mais respiro
- Melhorar as tabs Login/Cadastro com um estilo mais limpo (underline animada ja existe, sera mantida)
- Adicionar sombra mais suave e borda mais definida no card

### 4. Melhorar o Formulario de Login
- Remover a secao inline de "credenciais incorretas" - usar apenas toast
- Manter o link "Esqueceu a senha?" sem efeito de pulsacao (remover `animate-pulse`)
- Botao de submit com estilo mais consistente

### 5. Melhorar o Formulario de Cadastro
- Manter a estrutura de grupos (Informacoes Pessoais, Seguranca, Contato, Cupom)
- Melhorar espacamento entre grupos para formularios longos
- Garantir scroll suave quando o formulario de cadastro ultrapassa a viewport

### 6. Limpar Codigo Legado
- O arquivo `Login.tsx` e `Register.tsx` parecem ser paginas legadas que nao sao mais usadas nas rotas (a rota `/` usa `Auth.tsx`)
- Nenhuma alteracao necessaria neles, pois nao estao ativos

## Detalhes Tecnicos

**Arquivo editado:** `src/pages/Auth.tsx`

**Alteracoes especificas:**
1. Remover estado `showPasswordResetSuggestion`, `failedAttempts` e logica associada
2. No `handleLogin`, manter apenas `toast.error()` no caso de erro - com mensagem mais descritiva sugerindo reset apos falhas
3. Remover o bloco JSX do "reset suggestion" (div com `bg-destructive/10`)
4. Remover a classe `animate-pulse` do link "Esqueceu a senha?"
5. Ajustar cores do background: usar `from-rose-50/30 via-background to-violet-50/20` no modo claro
6. Reduzir blur e opacidade dos elementos decorativos para nao competir com o card
7. Garantir `overflow-y-auto` no container do formulario de cadastro para scroll adequado
8. Ajustar max-width do card para `sm:max-w-[440px]` para melhor proporcao

