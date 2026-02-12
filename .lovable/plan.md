
# Redesign da Tela de Perfil

## Objetivo
Redesenhar a pagina de Perfil seguindo o mesmo padrao visual das telas de Marcas e Temas: banner ilustrativo no topo, card header sobreposto com icone e titulo, e layout limpo sem bordas com sombras. Remover a secao "Minha Equipe" e transformar "Configuracoes Avancadas" em um dropdown colapsavel (estilo accordion/collapsible).

## Mudancas Visuais

### 1. Layout com Banner (como Marcas/Temas)
- Usar margem negativa (`-m-4 sm:-m-6 lg:-m-8`) para o banner ocupar toda a largura
- Gerar uma nova imagem de banner para o perfil no estilo flat illustration estabelecido (personagens, cores pastel lavanda/rosa)
- Banner com gradiente overlay na parte inferior
- Card header sobreposto ao banner com `-mt-12`, `rounded-2xl`, `shadow-lg`, sem bordas

### 2. Remover secao "Minha Equipe"
- Remover completamente o bloco de `TeamInfoCard` e botao "Comprar Creditos" da pagina de perfil
- Remover imports relacionados (`TeamInfoCard`, `Coins`, `Button` se nao usado em outro lugar)

### 3. Reorganizar o conteudo
- **Foto de Perfil**: Card com `shadow-lg` sem bordas (`border-0`), centralizado
- **Dados Pessoais**: Card `PersonalInfoForm` em largura total (sem dividir com AccountManagement)
- **Configuracoes Avancadas**: Substituir o card grande por um componente `Collapsible` discreto

### 4. Configuracoes Avancadas como Dropdown/Collapsible
- Usar `Collapsible` do Radix UI (ja instalado no projeto)
- Botao trigger com icone de cadeado/escudo + "Configuracoes Avancadas" + chevron
- Ao expandir, revela os dois botoes: "Inativar Conta" e "Deletar Conta"
- Visual compacto, similar ao padrao de "solicitacoes pendentes"
- Fechado por padrao para proteger acoes destrutivas

## Detalhes Tecnicos

### Arquivos Modificados
1. **`src/pages/Profile.tsx`** - Reescrita completa do layout:
   - Adicionar import do banner e novo layout com margem negativa
   - Remover imports de `TeamInfoCard`, `Coins`
   - Estrutura: Banner -> Header Card -> Avatar Card -> PersonalInfoForm (full width) -> Collapsible de configuracoes
   
2. **`src/components/perfil/AccountManagement.tsx`** - Simplificar para componente colapsavel:
   - Substituir o Card grande por um `Collapsible` com trigger compacto
   - Dentro do collapsible: dois botoes lado a lado (Inativar e Deletar)
   - Manter os dialogs `DeactivateAccountDialog` e `DeleteAccountDialog` intactos

3. **`src/assets/profile-banner.jpg`** - Nova imagem gerada no estilo flat illustration

### Estrutura do novo layout
```text
+------------------------------------------+
|           BANNER (imagem perfil)          |
|  gradient overlay                        |
+------------------------------------------+
|  +------------------------------------+  |
|  | [icon] Meu Perfil                  |  |  <- card sobreposto -mt-12
|  |  Gerencie suas informacoes...      |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |        [Avatar grande]             |  |  <- card sem borda, shadow-lg
|  |    [Alterar foto] [Remover]        |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  | Dados Pessoais (full width)        |  |  <- card sem borda, shadow-lg
|  | Nome, Email, Telefone, etc.        |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  | > Configuracoes Avancadas  [v]     |  |  <- collapsible trigger
|  |   [Inativar Conta] [Deletar Conta] |  |  <- conteudo expandido
|  +------------------------------------+  |
+------------------------------------------+
```

### Componente Collapsible (Configuracoes Avancadas)
- Trigger: card discreto com `bg-card shadow-md rounded-xl`
- Icone `ShieldAlert` + texto + `ChevronDown` com rotacao animada
- Conteudo: alerta de aviso + grid com dois botoes de acao
- Tudo compacto e elegante, sem o card pesado atual
